# -*- coding: utf-8 -*-
"""
周边民主评议系统 - 备份 JSON 导入脚本（已脱离 Coze）
用法：python import_backup.py
前置：01_create_tables.sql 已在 Supabase 执行建好表。
说明：
  - 用 service_role 通过 PostgREST 做 upsert（合并主键冲突）。
  - assignments 的 evaluatorId/evaluateeId 驼峰字段映射为 evaluator_id/evaluatee_id，并剥离嵌套子对象。
  - scores 剥离嵌套的 dimension_scores / evaluators 子对象。
  - dimensions 含 category 字段（建表时已补列）。
  - 备份未含 configs 表，脚本不导入 configs（管理员可用 admin123 登录，auth.ts 有 fallback）。
"""
import json
import os
import urllib.request
import urllib.error

PROJECT_ENV = r"C:\Users\EVEN.Zhang\WorkBuddy\2026-08-03-19-28-26\coze_project_export\projects\周边评议系统_在线版\.env"
JSON_PATH = r"C:\Users\EVEN.Zhang\Downloads\周边评议系统备份_2026-08-03.json"


def load_env(path):
    env = {}
    if os.path.exists(path):
        for line in open(path, encoding="utf-8"):
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            v = v.strip().strip('"').strip("'")
            env[k.strip()] = v
    return env


env = load_env(PROJECT_ENV)
SUPABASE_URL = env.get("SUPABASE_URL")
SERVICE_ROLE = env.get("SUPABASE_SERVICE_ROLE_KEY")
if not SUPABASE_URL or not SERVICE_ROLE:
    raise SystemExit("缺少 SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY，请检查 .env")


def upsert(table, rows):
    if not rows:
        print(f"  {table}: 无数据，跳过")
        return
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    data = json.dumps(rows).encode("utf-8")
    req = urllib.request.Request(url, data=data, method="POST")
    req.add_header("apikey", SERVICE_ROLE)
    req.add_header("Authorization", f"Bearer {SERVICE_ROLE}")
    req.add_header("Content-Type", "application/json")
    req.add_header("Prefer", "resolution=merge-duplicates")
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            print(f"  {table}: OK {resp.status} ({len(rows)} 行)")
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", "ignore")
        print(f"  {table}: 失败 {e.code} {body}")
        raise


def main():
    d = json.load(open(JSON_PATH, encoding="utf-8"))
    print("开始导入（service_role 直连，按依赖顺序 upsert）...")

    upsert("evaluators", d.get("evaluators", []))
    upsert("evaluatees", d.get("evaluatees", []))

    # dimensions 含 category（建表已补列）
    upsert("dimensions", d.get("dimensions", []))

    # assignments: 驼峰映射 + 剥离嵌套子对象
    assignments = [
        {
            "id": a["id"],
            "evaluator_id": a["evaluatorId"],
            "evaluatee_id": a["evaluateeId"],
            "created_at": a.get("created_at"),
        }
        for a in d.get("assignments", [])
    ]
    upsert("assignments", assignments)

    # scores: 剥离嵌套子对象
    scores = [
        {
            "id": s["id"],
            "status": s.get("status"),
            "comment": s.get("comment"),
            "submit_time": s.get("submit_time"),
            "evaluator_id": s["evaluator_id"],
            "evaluatee_id": s["evaluatee_id"],
            "created_at": s.get("created_at"),
            "updated_at": s.get("updated_at"),
        }
        for s in d.get("scores", [])
    ]
    upsert("scores", scores)

    # dimension_scores: 扁平，直接导入
    upsert("dimension_scores", d.get("dimension_scores", []))

    if d.get("configs"):
        upsert("configs", d["configs"])
    else:
        print("  注意：备份未含 configs 表，未导入（管理员可用 admin123 登录，auth.ts 有 fallback）")

    print("导入完成。")


if __name__ == "__main__":
    main()
