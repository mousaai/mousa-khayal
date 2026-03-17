import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ===== منصة خيال =====

// جدول المشاريع
export const khayalProjects = mysqlTable("khayal_projects", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  title: varchar("title", { length: 255 }),
  description: text("description"),
  inputType: mysqlEnum("inputType", ["text", "file", "url", "mixed"]).default("text").notNull(),
  scenarioType: mysqlEnum("scenarioType", [
    "design",
    "develop",
    "deteriorate",
    "compare",
    "imagine",
  ]).default("imagine").notNull(),
  inputData: json("inputData"),
  status: mysqlEnum("status", ["pending", "processing", "done", "error"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type KhayalProject = typeof khayalProjects.$inferSelect;
export type InsertKhayalProject = typeof khayalProjects.$inferInsert;

// جدول المشاهد المولّدة
export const khayalScenes = mysqlTable("khayal_scenes", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  sceneType: varchar("sceneType", { length: 64 }),
  sceneLabel: varchar("sceneLabel", { length: 255 }),
  imageUrl: text("imageUrl"),
  prompt: text("prompt"),
  order: int("order").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type KhayalScene = typeof khayalScenes.$inferSelect;
export type InsertKhayalScene = typeof khayalScenes.$inferInsert;