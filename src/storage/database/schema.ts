import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer, index } from "drizzle-orm/pg-core";

export const healthCheck = pgTable("health_check", {
  id: integer().primaryKey(),
  updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const evaluators = pgTable(
  "evaluators",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    code: varchar("code", { length: 20 }).notNull().unique(),
    name: varchar("name", { length: 128 }).notNull(),
    password: varchar("password", { length: 255 }).notNull(),
    is_active: boolean("is_active").default(true).notNull(),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("evaluators_code_idx").on(table.code),
  ]
);

export const evaluatees = pgTable(
  "evaluatees",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    code: varchar("code", { length: 20 }).notNull().unique(),
    name: varchar("name", { length: 128 }).notNull(),
    level: varchar("level", { length: 50 }).notNull(),
    category: varchar("category", { length: 50 }).notNull(),
    is_active: boolean("is_active").default(true).notNull(),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("evaluatees_code_idx").on(table.code),
    index("evaluatees_category_idx").on(table.category),
  ]
);

export const dimensions = pgTable(
  "dimensions",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    code: varchar("code", { length: 20 }).notNull().unique(),
    name: varchar("name", { length: 128 }).notNull(),
    sort: integer("sort").default(0).notNull(),
    standard5: text("standard5").notNull(),
    standard4: text("standard4").notNull(),
    standard3: text("standard3").notNull(),
    standard2: text("standard2").notNull(),
    standard1: text("standard1").notNull(),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("dimensions_code_idx").on(table.code),
    index("dimensions_sort_idx").on(table.sort),
  ]
);

export const assignments = pgTable(
  "assignments",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    evaluator_id: varchar("evaluator_id", { length: 36 }).notNull().references(() => evaluators.id, { onDelete: "cascade" }),
    evaluatee_id: varchar("evaluatee_id", { length: 36 }).notNull().references(() => evaluatees.id, { onDelete: "cascade" }),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("assignments_evaluator_id_idx").on(table.evaluator_id),
    index("assignments_evaluatee_id_idx").on(table.evaluatee_id),
  ]
);

export const scores = pgTable(
  "scores",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    status: varchar("status", { length: 20 }).default("draft").notNull(),
    comment: text("comment"),
    submit_time: timestamp("submit_time", { withTimezone: true }),
    evaluator_id: varchar("evaluator_id", { length: 36 }).notNull().references(() => evaluators.id, { onDelete: "cascade" }),
    evaluatee_id: varchar("evaluatee_id", { length: 36 }).notNull().references(() => evaluatees.id, { onDelete: "cascade" }),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("scores_evaluator_id_idx").on(table.evaluator_id),
    index("scores_evaluatee_id_idx").on(table.evaluatee_id),
    index("scores_status_idx").on(table.status),
  ]
);

export const dimensionScores = pgTable(
  "dimension_scores",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    score: integer("score").notNull(),
    score_id: varchar("score_id", { length: 36 }).notNull().references(() => scores.id, { onDelete: "cascade" }),
    dimension_id: varchar("dimension_id", { length: 36 }).notNull().references(() => dimensions.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("dimension_scores_score_id_idx").on(table.score_id),
    index("dimension_scores_dimension_id_idx").on(table.dimension_id),
  ]
);

export const configs = pgTable(
  "configs",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    key: varchar("key", { length: 128 }).notNull().unique(),
    value: text("value").notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("configs_key_idx").on(table.key),
  ]
);
