import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json, bigint } from "drizzle-orm/mysql-core";

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
  // حقول الاستئناف: حفظ حالة كل مشهد لاستئناف من نقطة التوقف
  sceneStates: json("sceneStates"), // Array<{imageUrl?, audioUrl?, videoUrl?, done: boolean}>
  scriptData: json("scriptData"),   // VideoScript كاملة لإعادة الاستخدام عند الاستئناف
  optionsData: json("optionsData"), // VideoProductionOptions
  retryCount: int("retryCount").default(0).notNull(),
  lastHeartbeat: timestamp("lastHeartbeat").defaultNow(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type VideoJobRecord = typeof videoJobs.$inferSelect;
export type InsertVideoJob = typeof videoJobs.$inferInsert;
// جدول سجل المحتوى المرفوض — للمراجعة القانونية والأمنية
export const contentViolations = mysqlTable("content_violations", {
  id: int("id").autoincrement().primaryKey(),
  textSnippet: varchar("textSnippet", { length: 200 }).notNull(),
  category: varchar("category", { length: 50 }).notNull(),
  checkType: mysqlEnum("checkType", ["pattern", "ai"]).notNull(),
  createdAt: bigint("createdAt", { mode: "number" }).notNull(),
});

export type ContentViolation = typeof contentViolations.$inferSelect;
export type InsertContentViolation = typeof contentViolations.$inferInsert;

// جدول روابط المشاركة — لكل فيديو رابط فريد قابل للمشاركة
export const shareLinks = mysqlTable("share_links", {
  id: varchar("id", { length: 32 }).primaryKey(), // رمز عشوائي 8 أحرف
  jobId: varchar("jobId", { length: 64 }).notNull(), // ربط بـ video_jobs
  videoUrl: text("videoUrl").notNull(),
  title: varchar("title", { length: 255 }),
  description: text("description"),
  genre: varchar("genre", { length: 64 }),
  genreLabel: varchar("genreLabel", { length: 64 }),
  genreEmoji: varchar("genreEmoji", { length: 8 }),
  thumbnailUrl: text("thumbnailUrl"),
  viewCount: int("viewCount").default(0).notNull(),
  userId: int("userId"),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ShareLink = typeof shareLinks.$inferSelect;
export type InsertShareLink = typeof shareLinks.$inferInsert;

// جدول تعديلات المشاهد — تتتبع كل نسخة من مشهد معدّل
export const sceneRevisions = mysqlTable("scene_revisions", {
  id: int("id").autoincrement().primaryKey(),
  jobId: varchar("jobId", { length: 64 }).notNull(),
  sceneIndex: int("sceneIndex").notNull(), // رقم المشهد (0-based)
  imageUrl: text("imageUrl").notNull(),
  prompt: text("prompt"),
  revisionNote: text("revisionNote"), // سبب التعديل
  version: int("version").default(1).notNull(),
  isActive: int("isActive").default(1).notNull(), // 1=نشط, 0=مؤرشف
  userId: int("userId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SceneRevision = typeof sceneRevisions.$inferSelect;
export type InsertSceneRevision = typeof sceneRevisions.$inferInsert;

// تحديث video_jobs لتخزين بيانات إضافية
// ملاحظة: هذه الحقول ستُضاف عبر ترحيل قاعدة البيانات
// للآن نخزّنها في metrics JSON الموجود بالفعل

// ══════════════════════════════════════════════════════════════
// جدول ذاكرة خيال — تتعلم من تفضيلات كل مستخدم
// ══════════════════════════════════════════════════════════════
export const userPreferences = mysqlTable("user_preferences", {
  id: int("id").autoincrement().primaryKey(),
  userId: varchar("userId", { length: 128 }).notNull().unique(), // openId أو IP للزوار
  // التفضيلات المُستخلصة من الاستخدام
  preferredGenre: varchar("preferredGenre", { length: 64 }), // أكثر نوع فيلم استخدمه
  preferredVoice: varchar("preferredVoice", { length: 64 }), // آخر صوت اختاره
  preferredAspectRatio: varchar("preferredAspectRatio", { length: 16 }), // "16:9" | "9:16" | "1:1"
  preferredSceneCount: int("preferredSceneCount").default(5), // متوسط عدد المشاهد
  preferredStyle: varchar("preferredStyle", { length: 64 }), // الأسلوب البصري المفضل
  preferredDuration: varchar("preferredDuration", { length: 16 }), // "short" | "medium" | "long"
  // إحصاءات الاستخدام
  totalProductions: int("totalProductions").default(0).notNull(),
  genreHistory: json("genreHistory"), // { [genre]: count }
  voiceHistory: json("voiceHistory"), // { [voiceId]: count }
  domainHistory: json("domainHistory"), // { [domain]: count }
  // آخر تحديث
  lastProductionAt: timestamp("lastProductionAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserPreferences = typeof userPreferences.$inferSelect;
export type InsertUserPreferences = typeof userPreferences.$inferInsert;

// ══════════════════════════════════════════════════════════════
// مكتبة السيناريوهات الضخمة — 10,000+ سيناريو ذاتي التعلم
// ══════════════════════════════════════════════════════════════
export const scriptLibrary = mysqlTable("script_library", {
  id: int("id").autoincrement().primaryKey(),
  // التصنيف
  domain: varchar("domain", { length: 64 }).notNull(),       // nature, architecture, science...
  genre: varchar("genre", { length: 64 }).notNull(),         // documentary, cinematic, educational...
  style: varchar("style", { length: 64 }),                   // dramatic, calm, energetic...
  level: varchar("level", { length: 32 }),                   // simple, medium, advanced
  language: varchar("language", { length: 8 }).default("ar").notNull(),
  // المحتوى
  title: varchar("title", { length: 255 }).notNull(),
  titleEn: varchar("titleEn", { length: 255 }),
  keywords: text("keywords").notNull(),                      // كلمات مفتاحية مفصولة بفاصلة
  scenes: json("scenes").notNull(),                          // VideoScene[]
  narration: text("narration"),                              // التعليق الصوتي الكامل
  musicMood: varchar("musicMood", { length: 64 }),
  // الجودة والاستخدام
  qualityScore: int("qualityScore").default(70).notNull(),   // 0-100
  useCount: int("useCount").default(0).notNull(),            // عدد مرات الاستخدام
  successRate: int("successRate").default(100).notNull(),    // نسبة نجاح الإنتاج
  // المصدر
  source: mysqlEnum("source", ["generated", "llm", "user", "seed"]).default("seed").notNull(),
  sourceJobId: varchar("sourceJobId", { length: 64 }),       // من أي إنتاج جاء
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ScriptLibraryEntry = typeof scriptLibrary.$inferSelect;
export type InsertScriptLibraryEntry = typeof scriptLibrary.$inferInsert;

// ══════════════════════════════════════════════════════════════
// ذاكرة الإنتاج — تخزين كل طلب ونتيجته للتعلم
// ══════════════════════════════════════════════════════════════
export const productionMemory = mysqlTable("production_memory", {
  id: int("id").autoincrement().primaryKey(),
  jobId: varchar("jobId", { length: 64 }).notNull(),
  userInput: text("userInput").notNull(),                    // الوصف الأصلي
  normalizedInput: text("normalizedInput"),                  // بعد التنظيف
  detectedDomain: varchar("detectedDomain", { length: 64 }),
  detectedGenre: varchar("detectedGenre", { length: 64 }),
  scriptUsed: json("scriptUsed"),                           // السيناريو المستخدم
  scriptSource: mysqlEnum("scriptSource", ["db", "llm", "prebuilt"]).default("prebuilt").notNull(),
  scriptLibraryId: int("scriptLibraryId"),                  // إذا جاء من المكتبة
  imagePrompts: json("imagePrompts"),                       // prompts الصور المستخدمة
  imageUrls: json("imageUrls"),                             // روابط الصور المولدة
  audioUrls: json("audioUrls"),                             // روابط الصوت
  videoUrl: text("videoUrl"),                               // رابط الفيديو النهائي
  success: int("success").default(0).notNull(),             // 1=نجح, 0=فشل
  durationMs: int("durationMs"),                            // وقت الإنتاج بالملليثاني
  userId: int("userId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ProductionMemory = typeof productionMemory.$inferSelect;
export type InsertProductionMemory = typeof productionMemory.$inferInsert;

// ══════════════════════════════════════════════════════════════
// Prompt Cache — تخزين الصور المولّدة لتجنّب التكرار
// ══════════════════════════════════════════════════════════════
export const imageCache = mysqlTable("image_cache", {
  id: int("id").autoincrement().primaryKey(),
  promptHash: varchar("promptHash", { length: 64 }).notNull().unique(), // SHA256 للـ prompt
  prompt: text("prompt").notNull(),                                     // النص الكامل
  imageUrl: text("imageUrl").notNull(),                                 // رابط S3/CDN
  width: int("width").default(1280).notNull(),
  height: int("height").default(720).notNull(),
  hitCount: int("hitCount").default(0).notNull(),                       // عدد مرات الاستخدام
  lastUsedAt: timestamp("lastUsedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ImageCache = typeof imageCache.$inferSelect;
export type InsertImageCache = typeof imageCache.$inferInsert;
