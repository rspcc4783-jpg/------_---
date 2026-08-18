#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
把 dimensions 表中现有的维度编号 code 规范化为「标准集前缀-维度序号」格式，
规则与 pages/api/admin/dimensions.ts 的 genDimensionCode 完全一致：
  - 标准集前缀(两位)：按该标准集首次出现(最早 created_at 的维度)的顺序编号 01, 02, 03 ...
  - 维度序号(两位)：该标准集内按 sort 升序(并列则按 created_at)编号 01, 02, 03 ...
  - 最终 code 形如 01-01、01-02、02-01，全局唯一（不同标准集前缀不同）。

仅更新 code 字段，不动 name/standard/id，因此不影响评分数据(评分关联 dimension_id)。

用法: python3 normalize_dimension_codes.py
"""
import json
import os
import urllib.request
import urllib.error

# 从项目 .env 读取 Supabase 连接（不硬编码密钥）
ENV_PATH = os.path.join(os.path.dirname(__file__),
    "..", "coze_project_export", "projects", "周边评议系统_在线版", ".env")
SUPABASE_URL = None
SUPABASE_KEY = None
if os.path.exists(ENV_PATH):
    with open(ENV_PATH, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line.startswith("SUPABASE_URL="):
                SUPABASE_URL = line.split("=", 1)[1].strip().strip('"').rstrip("/")
            elif line.startswith("SUPABASE_SERVICE_ROLE_KEY="):
                SUPABASE_KEY = line.split("=", 1)[1].strip().strip('"')

if not SUPABASE_URL or not SUPABASE_KEY:
    raise SystemExit("未在 .env 中找到 SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY")

REST = f"{SUPABASE_URL}/rest/v1"


def db_get(path):
    url = f"{REST}/{path}"
    req = urllib.request.Request(url, headers={
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
    })
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode("utf-8"))


def db_patch(row_id, new_code):
    url = f"{REST}/dimensions?id=eq.{row_id}"
    data = json.dumps({"code": new_code}).encode("utf-8")
    req = urllib.request.Request(url, data=data, method="PATCH", headers={
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    })
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode("utf-8"))


def main():
    rows = db_get("dimensions?select=id,code,category,sort,created_at,name&order=created_at.asc")
    print(f"读取到 {len(rows)} 条维度")

    # 按标准集分组
    groups = {}
    for r in rows:
        groups.setdefault(r["category"], []).append(r)

    # 标准集前缀：按该标准集最早 created_at 排序
    cat_order = sorted(
        groups.keys(),
        key=lambda c: min(x["created_at"] for x in groups[c]),
    )
    prefix_of = {c: f"{i+1:02d}" for i, c in enumerate(cat_order)}

    changes = []
    for c in cat_order:
        prefix = prefix_of[c]
        # 标准集内按 sort 升序，并列按 created_at
        items = sorted(groups[c], key=lambda x: (x["sort"] or 0, x["created_at"]))
        for seq, item in enumerate(items, start=1):
            new_code = f"{prefix}-{seq:02d}"
            old_code = item["code"]
            if old_code != new_code:
                changes.append((item["id"], old_code, new_code, item["name"], c))

    if not changes:
        print("无需修改，所有 code 已规范。")
        return

    print(f"需要更新 {len(changes)} 条：")
    for cid, old, new, name, cat in changes:
        print(f"  [{cat}] {name}: {old} -> {new}")

    confirm = input("\n确认写入 Supabase？(y/N): ").strip().lower()
    if confirm != "y":
        print("已取消，未做任何修改。")
        return

    ok = 0
    for cid, old, new, name, cat in changes:
        try:
            db_patch(cid, new)
            ok += 1
        except urllib.error.HTTPError as e:
            print(f"  更新失败 {name} ({old}->{new}): {e.code} {e.read().decode('utf-8', 'ignore')[:200]}")
    print(f"\n完成：成功更新 {ok}/{len(changes)} 条。")


if __name__ == "__main__":
    main()
