-- ============================================================
-- 周边民主评议系统 - 建表 SQL（已脱离 Coze，使用自有 Supabase）
-- 用法：
--   A. 在 Supabase 后台 SQL Editor 粘贴全文执行；或
--   B. 用 psql 直连：psql "<连接串>" -f 01_create_tables.sql
-- ============================================================

-- 1. health_check
CREATE TABLE IF NOT EXISTS health_check (
  id integer PRIMARY KEY,
  updated_at timestamptz DEFAULT now()
);

-- 2. evaluators 评价人
CREATE TABLE IF NOT EXISTS evaluators (
  id varchar(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(20) NOT NULL UNIQUE,
  name varchar(128) NOT NULL,
  password varchar(255) NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz
);
CREATE INDEX IF NOT EXISTS evaluators_code_idx ON evaluators(code);

-- 3. evaluatees 被评人
CREATE TABLE IF NOT EXISTS evaluatees (
  id varchar(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(20) NOT NULL UNIQUE,
  name varchar(128) NOT NULL,
  level varchar(50) NOT NULL,
  category varchar(50) NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz
);
CREATE INDEX IF NOT EXISTS evaluatees_code_idx ON evaluatees(code);
CREATE INDEX IF NOT EXISTS evaluatees_category_idx ON evaluatees(category);

-- 4. dimensions 评价维度
--    注意：实际备份数据含 category 字段，原 schema.ts 未定义，这里补一列以保住真实数据
CREATE TABLE IF NOT EXISTS dimensions (
  id varchar(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(20) NOT NULL UNIQUE,
  name varchar(128) NOT NULL,
  sort integer DEFAULT 0 NOT NULL,
  standard5 text NOT NULL,
  standard4 text NOT NULL,
  standard3 text NOT NULL,
  standard2 text NOT NULL,
  standard1 text NOT NULL,
  category varchar(50),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz
);
CREATE INDEX IF NOT EXISTS dimensions_code_idx ON dimensions(code);
CREATE INDEX IF NOT EXISTS dimensions_sort_idx ON dimensions(sort);

-- 5. assignments 评价关系
CREATE TABLE IF NOT EXISTS assignments (
  id varchar(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluator_id varchar(36) NOT NULL REFERENCES evaluators(id) ON DELETE CASCADE,
  evaluatee_id varchar(36) NOT NULL REFERENCES evaluatees(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS assignments_evaluator_id_idx ON assignments(evaluator_id);
CREATE INDEX IF NOT EXISTS assignments_evaluatee_id_idx ON assignments(evaluatee_id);

-- 6. scores 评分主表
CREATE TABLE IF NOT EXISTS scores (
  id varchar(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  status varchar(20) DEFAULT 'draft' NOT NULL,
  comment text,
  submit_time timestamptz,
  evaluator_id varchar(36) NOT NULL REFERENCES evaluators(id) ON DELETE CASCADE,
  evaluatee_id varchar(36) NOT NULL REFERENCES evaluatees(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz
);
CREATE INDEX IF NOT EXISTS scores_evaluator_id_idx ON scores(evaluator_id);
CREATE INDEX IF NOT EXISTS scores_evaluatee_id_idx ON scores(evaluatee_id);
CREATE INDEX IF NOT EXISTS scores_status_idx ON scores(status);

-- 7. dimension_scores 维度分
CREATE TABLE IF NOT EXISTS dimension_scores (
  id varchar(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  score integer NOT NULL,
  score_id varchar(36) NOT NULL REFERENCES scores(id) ON DELETE CASCADE,
  dimension_id varchar(36) NOT NULL REFERENCES dimensions(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS dimension_scores_score_id_idx ON dimension_scores(score_id);
CREATE INDEX IF NOT EXISTS dimension_scores_dimension_id_idx ON dimension_scores(dimension_id);

-- 8. configs 系统配置
CREATE TABLE IF NOT EXISTS configs (
  id varchar(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  key varchar(128) NOT NULL UNIQUE,
  value text NOT NULL,
  updated_at timestamptz
);
CREATE INDEX IF NOT EXISTS configs_key_idx ON configs(key);
