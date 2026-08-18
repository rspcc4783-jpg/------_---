# 周边民主评议管理系统（在线版）

基于 Next.js 14 的全栈 Web 应用，支持多评价人在线协作、7 维度评分、数据汇总与匿名机制。
数据层使用 **Supabase（PostgreSQL）**，通过 `@supabase/supabase-js` 直连，**不涉及 Prisma / SQLite**。

---

## 一、环境要求

- **Node.js**：18.18+ 或 20 / 22 LTS（推荐 20 LTS）
- **包管理器**：npm（项目自带 `package-lock.json`）
- **数据库**：一个 Supabase 项目（免费版即可），获取 URL / anon key / service_role key

---

## 二、部署步骤

### 1. 安装依赖
```bash
npm install
```

### 2. 配置环境变量
```bash
cp .env.example .env
# 用编辑器打开 .env，填入你自己的 Supabase 信息与 JWT_SECRET
```
`.env` 必须包含：
| 变量 | 说明 |
|------|------|
| `SUPABASE_URL` | Supabase 项目地址 |
| `SUPABASE_ANON_KEY` | anon 公开密钥 |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role 密钥（最高权限，仅服务端） |
| `JWT_SECRET` | 登录 JWT 签名密钥，**必须改为随机长字符串** |
| `NEXT_PUBLIC_APP_NAME` | 应用显示名（可选） |

> ⚠️ `SUPABASE_SERVICE_ROLE_KEY` 拥有数据库完全控制权，只能放在服务端 `.env`，**绝不能**出现在前端代码或公开仓库。

### 3. 创建数据库表
在 Supabase 后台 **SQL Editor** 中，全选并执行 `migration/01_create_tables.sql`（共 8 张表）。
或本地用 psql：
```bash
psql "<你的 Supabase 连接串>" -f migration/01_create_tables.sql
```

### 4. 灌入预置数据（评价人 / 被评人 / 维度 / 配置）
```bash
npm run db:seed
```
该脚本幂等：若库内已有评价人数据则自动跳过。

### 5. 构建并启动（生产）
```bash
npm run build
npm start
```
默认监听 **3000** 端口。可用 `PORT=8080 npm start` 修改端口；
公网部署建议放在 Nginx / Caddy 等反向代理之后并启用 HTTPS。

### 开发预览
```bash
npm run dev
```
访问 http://localhost:3000

---

## 三、默认账号

| 角色 | 账号 | 密码 |
|------|------|------|
| 管理员 | `admin` | `admin123` |
| 评价人（示例） | `张经理` 等 7 位 | `123456` |

> 首次上线请务必在管理员后台修改管理员密码，并将 `JWT_SECRET` 设为强随机值。

---

## 四、项目结构

```
周边评议系统_在线版/
├── components/        # React 组件（admin / 登录 / 工作台）
├── lib/               # supabase-client.ts、auth.ts（JWT）、utils.ts
├── pages/             # Next.js 页面与 API 路由（pages/api/*）
├── src/storage/...    # 数据访问层（Supabase 实现）
├── scripts/           # seed-supabase.ts 预置数据脚本
├── migration/         # 01_create_tables.sql 建表；可选的数据导入/规范化工具
├── styles/            # 全局样式
├── .env.example       # 环境变量模板（复制为 .env 使用）
├── next.config.js
├── package.json
└── tsconfig.json
```

---

## 五、技术栈

- 前端：React 18 + TypeScript + Tailwind CSS
- 后端：Next.js 14 API Routes
- 数据库：Supabase（PostgreSQL）
- 认证：JWT（`jsonwebtoken`）+ `bcryptjs`

## 六、核心功能

- 管理员：仪表盘、被评人 / 评价人管理、评价关系配置、评分标准编辑、数据汇总、JSON/CSV 备份
- 评价人：待评任务、7 维度评分、草稿自动保存、提交确认、评语
- 百分制计算：`ROUND((SUM(7项得分)-7)/28*100, 1)`
- 匿名机制：评价人身份对管理员隐藏

---

## 七、运维提示

1. 数据库表由 `migration/01_create_tables.sql` 定义，后续变更请在该文件维护并重新执行。
2. `migration/import_backup.py` 可将系统导出的 JSON 备份导入自有 Supabase（需配置环境变量后运行）。
3. 生产环境务必使用 HTTPS，并妥善保管 `SUPABASE_SERVICE_ROLE_KEY` 与 `JWT_SECRET`。
