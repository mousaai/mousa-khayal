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
  arabicCaption: text("arabicCaption"),
  order: int("order").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type KhayalScene = typeof khayalScenes.$inferSelect;
export type InsertKhayalScene = typeof khayalScenes.$inferInsert;

// جدول الذاكرة الجغرافية والثقافية — محرك المعرفة الجغرافية لمنصة خيال
export const geoKnowledge = mysqlTable("geo_knowledge", {
  id: int("id").autoincrement().primaryKey(),
  // المعرفات الجغرافية
  locationName: varchar("locationName", { length: 255 }).notNull(),
  locationNameAr: varchar("locationNameAr", { length: 255 }),
  country: varchar("country", { length: 100 }),
  countryCode: varchar("countryCode", { length: 10 }),
  region: varchar("region", { length: 100 }),
  city: varchar("city", { length: 100 }),
  latitude: varchar("latitude", { length: 30 }),
  longitude: varchar("longitude", { length: 30 }),
  // السياق الثقافي
  culturalContext: text("culturalContext"),
  architecturalStyle: text("architecturalStyle"),
  climate: varchar("climate", { length: 100 }),
  vegetation: text("vegetation"),
  historicalPeriod: varchar("historicalPeriod", { length: 100 }),
  // البيانات البصرية
  colorPalette: json("colorPalette"),   // ألوان سائدة في المنطقة
  lightingCharacter: varchar("lightingCharacter", { length: 100 }), // طبيعة الضوء
  atmosphericMood: varchar("atmosphericMood", { length: 100 }),
  // معرفة موسعة
  knowledgeData: json("knowledgeData"),  // بيانات إضافية من AI
  streetViewAvailable: int("streetViewAvailable").default(0),
  mapsPlaceId: varchar("mapsPlaceId", { length: 255 }),
  // معلومات النظام
  searchCount: int("searchCount").default(0),
  lastSearched: timestamp("lastSearched"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type GeoKnowledge = typeof geoKnowledge.$inferSelect;
export type InsertGeoKnowledge = typeof geoKnowledge.$inferInsert;

// جدول مهام إنتاج الفيديو — يُحفظ في DB حتى لا يضيع عند إغلاق المتصفح
export const videoJobs = mysqlTable("video_jobs", {
  id: varchar("id", { length: 64 }).primaryKey(), // job_timestamp_random
  userId: int("userId"),
  status: mysqlEnum("status", ["pending", "processing", "done", "failed"]).default("pending").notNull(),
  progress: int("progress").default(0).notNull(),
  currentStep: varchar("currentStep", { length: 512 }),
  description: text("description"),
  videoUrl: text("videoUrl"),
  error: text("error"),
  metrics: json("metrics"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type VideoJobRecord = typeof videoJobs.$inferSelect;
export type InsertVideoJob = typeof videoJobs.$inferInsert;