import { boolean, date, double, int, json, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * OAuth transfer tokens — short-lived tokens stored in DB to transfer sessions
 * from manus.space (OAuth callback) to mousa.ai (cookie domain).
 * Using DB instead of JWT avoids JWT_SECRET mismatch between servers.
 */
export const oauthTransferTokens = mysqlTable("oauth_transfer_tokens", {
  id: int("id").autoincrement().primaryKey(),
  token: varchar("token", { length: 128 }).notNull().unique(),
  sessionToken: text("sessionToken").notNull(),
  returnPath: text("returnPath").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  usedAt: timestamp("usedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type OauthTransferToken = typeof oauthTransferTokens.$inferSelect;

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
  /** Identifier — for Manus OAuth users this is the openId; for email/password users this is 'local:{email}' */
  openId: varchar("openId", { length: 320 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  /** Bcrypt hash of password — null for OAuth users */
  passwordHash: varchar("passwordHash", { length: 255 }),
  /** Whether email has been verified (1=yes, 0=no) */
  emailVerified: int("emailVerified").default(0).notNull(),
  /** Token used for email verification or password reset */
  verifyToken: varchar("verifyToken", { length: 128 }),
  /** When the verifyToken expires */
  verifyTokenExpiresAt: timestamp("verifyTokenExpiresAt"),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  /** Stripe customer ID — stored for creating checkout sessions */
  stripeCustomerId: varchar("stripeCustomerId", { length: 64 }),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Credit wallets — one row per user, tracks current balance.
 */
export const creditWallets = mysqlTable("credit_wallets", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  balance: int("balance").default(0).notNull(),
  totalEarned: int("totalEarned").default(0).notNull(),
  totalSpent: int("totalSpent").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CreditWallet = typeof creditWallets.$inferSelect;

/**
 * Credit transactions — every credit movement is recorded here.
 */
export const creditTransactions = mysqlTable("credit_transactions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  amount: int("amount").notNull(),
  type: mysqlEnum("type", ["welcome_bonus", "purchase", "usage", "admin_grant", "admin_deduct", "refund"]).notNull(),
  platform: varchar("platform", { length: 32 }),
  description: text("description"),
  balanceAfter: int("balanceAfter").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CreditTransaction = typeof creditTransactions.$inferSelect;

/**
 * Payments — records of Stripe checkout completions.
 * Only stores Stripe IDs + business metadata; no sensitive card data.
 */
export const payments = mysqlTable("payments", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 128 }).unique(),
  stripeSessionId: varchar("stripeSessionId", { length: 128 }).unique(),
  packageId: varchar("packageId", { length: 64 }).notNull(),
  creditsGranted: int("creditsGranted").notNull(),
  amountCents: int("amountCents").notNull(),
  currency: varchar("currency", { length: 8 }).default("usd").notNull(),
  status: mysqlEnum("status", ["pending", "completed", "failed", "refunded"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Payment = typeof payments.$inferSelect;

/**
 * AI sessions — each conversation/report request.
 */
export const aiSessions = mysqlTable("ai_sessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  platform: mysqlEnum("platform", ["fada", "raqaba", "harara", "maskan", "code", "khayal"]).notNull(),
  title: varchar("title", { length: 255 }),
  status: mysqlEnum("status", ["active", "completed", "failed"]).default("active").notNull(),
  creditsUsed: int("creditsUsed").default(0).notNull(),
  /** Auto-generated summary of the session for cross-session memory */
  summary: text("summary"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AiSession = typeof aiSessions.$inferSelect;

/**
 * AI messages — individual messages within a session.
 */
export const aiMessages = mysqlTable("ai_messages", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["user", "assistant", "system"]).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AiMessage = typeof aiMessages.$inferSelect;

/**
 * User project profiles — persistent context per user per platform.
 * This is the cross-session "memory" that the AI always receives.
 */
export const userProjectProfiles = mysqlTable("user_project_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  platform: mysqlEnum("platform", ["fada", "raqaba", "harara", "maskan", "code", "khayal"]).notNull(),
  /** Project name e.g. "فيلا الرياض" */
  projectName: varchar("projectName", { length: 255 }),
  /** City/location */
  location: varchar("location", { length: 255 }),
  /** Project type e.g. "سكني - فيلا" */
  projectType: varchar("projectType", { length: 255 }),
  /** Free-form notes the user wants the AI to always remember */
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserProjectProfile = typeof userProjectProfiles.$inferSelect;

/**
 * Subscriptions — monthly recurring plans via Stripe.
 * Tracks the active subscription per user.
 */
export const subscriptions = mysqlTable("subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 128 }).notNull().unique(),
  stripeCustomerId: varchar("stripeCustomerId", { length: 64 }).notNull(),
  stripePriceId: varchar("stripePriceId", { length: 128 }).notNull(),
  planId: varchar("planId", { length: 32 }).notNull(), // starter | pro | office
  planNameAr: varchar("planNameAr", { length: 64 }).notNull(),
  creditsPerMonth: int("creditsPerMonth").notNull(),
  amountCents: int("amountCents").notNull(),
  currency: varchar("currency", { length: 8 }).default("usd").notNull(),
  status: mysqlEnum("status", ["active", "cancelled", "past_due", "unpaid", "trialing"]).default("active").notNull(),
  currentPeriodStart: timestamp("currentPeriodStart").notNull(),
  currentPeriodEnd: timestamp("currentPeriodEnd").notNull(),
  cancelAtPeriodEnd: int("cancelAtPeriodEnd").default(0).notNull(), // 0=false, 1=true
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Subscription = typeof subscriptions.$inferSelect;

/**
 * Refund Requests — tracks all refund requests submitted by users.
 * Admin reviews and processes them; Stripe refund is executed automatically.
 */
export const refundRequests = mysqlTable("refund_requests", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  paymentId: int("paymentId"),              // linked payment record
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 128 }),
  stripeRefundId: varchar("stripeRefundId", { length: 128 }),  // filled after Stripe refund
  amountCents: int("amountCents").notNull(), // amount to refund in cents
  currency: varchar("currency", { length: 8 }).default("usd").notNull(),
  creditsToDeduct: int("creditsToDeduct").notNull(), // credits to remove on approval
  reason: text("reason").notNull(),          // user-provided reason
  status: mysqlEnum("status", ["pending", "approved", "rejected", "refunded"]).default("pending").notNull(),
  adminNote: text("adminNote"),              // admin's internal note
  reviewedBy: int("reviewedBy"),             // admin userId who reviewed
  reviewedAt: timestamp("reviewedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type RefundRequest = typeof refundRequests.$inferSelect;
export type InsertRefundRequest = typeof refundRequests.$inferInsert;


// ═══════════════════════════════════════════════════════════════════
// LAYER 1: RAW DATA — External data ingested once, queried locally
// ═══════════════════════════════════════════════════════════════════

/**
 * Climate Data — UAE weather & solar radiation per emirate.
 * Sourced from: Open-Meteo, NASA POWER, UAE National Meteorology Centre.
 * Updated: monthly via scheduled job.
 */
export const climateData = mysqlTable("climate_data", {
  id: int("id").autoincrement().primaryKey(),
  emirate: mysqlEnum("emirate", ["dubai", "abu_dhabi", "sharjah", "ajman", "ras_al_khaimah", "fujairah", "umm_al_quwain"]).notNull(),
  month: int("month").notNull(), // 1-12
  /** Average daily max temperature °C */
  tempMaxAvg: double("tempMaxAvg"),
  /** Average daily min temperature °C */
  tempMinAvg: double("tempMinAvg"),
  /** Design dry bulb temperature for HVAC (99.6% cooling) °C */
  designTempCooling: double("designTempCooling"),
  /** Design dry bulb temperature for heating °C */
  designTempHeating: double("designTempHeating"),
  /** Average relative humidity % */
  humidityAvg: double("humidityAvg"),
  /** Peak solar irradiance W/m² (horizontal) */
  solarIrradiancePeak: double("solarIrradiancePeak"),
  /** Daily average solar radiation kWh/m²/day */
  solarRadiationDaily: double("solarRadiationDaily"),
  /** Average wind speed m/s */
  windSpeedAvg: double("windSpeedAvg"),
  /** Prevailing wind direction degrees */
  windDirection: int("windDirection"),
  /** Cooling Degree Days (base 18°C) */
  coolingDegreeDays: double("coolingDegreeDays"),
  /** Heating Degree Days (base 18°C) */
  heatingDegreeDays: double("heatingDegreeDays"),
  source: varchar("source", { length: 128 }),
  lastUpdated: timestamp("lastUpdated").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ClimateData = typeof climateData.$inferSelect;

/**
 * Building Codes — UAE construction regulations (DBC + ADIBC + Federal).
 * Sourced from: Dubai Municipality DBC 2021, Abu Dhabi ADIBC 2013, UAE Fire Code.
 * Updated: when new editions are published.
 */
export const buildingCodes = mysqlTable("building_codes", {
  id: int("id").autoincrement().primaryKey(),
  /** Code system: DBC = Dubai Building Code, ADIBC = Abu Dhabi, UAE_FIRE = Fire Code */
  codeSystem: mysqlEnum("codeSystem", ["DBC", "ADIBC", "UAE_FIRE", "ESMA_ENERGY", "TRAKHEES", "FEDERAL"]).notNull(),
  /** Chapter/Part reference e.g. "Part 3 - Structural" */
  chapter: varchar("chapter", { length: 255 }),
  /** Section number e.g. "3.4.2" */
  sectionNumber: varchar("sectionNumber", { length: 64 }),
  /** Section title in Arabic */
  titleAr: text("titleAr"),
  /** Section title in English */
  titleEn: text("titleEn"),
  /** Full text content in Arabic */
  contentAr: text("contentAr"),
  /** Full text content in English */
  contentEn: text("contentEn"),
  /** Category for filtering */
  category: mysqlEnum("category", ["structural", "fire_safety", "energy", "plumbing", "electrical", "accessibility", "environmental", "zoning", "general"]).notNull(),
  /** Tags for semantic search */
  tags: text("tags"), // comma-separated
  /** Minimum numeric value if applicable (e.g. min ceiling height = 2.4) */
  minValue: double("minValue"),
  /** Maximum numeric value if applicable */
  maxValue: double("maxValue"),
  /** Unit of measurement */
  unit: varchar("unit", { length: 32 }),
  /** Year of the edition */
  edition: varchar("edition", { length: 16 }),
  /** Applies to emirate or "all" */
  emirate: varchar("emirate", { length: 64 }).default("all"),
  /** Embedding vector stored as JSON array for semantic search */
  embedding: json("embedding"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BuildingCode = typeof buildingCodes.$inferSelect;

/**
 * Construction Materials — UAE market materials with specs and pricing.
 * Sourced from: UAE suppliers, CBUAE price index, Zawya.
 * Updated: quarterly.
 */
export const constructionMaterials = mysqlTable("construction_materials", {
  id: int("id").autoincrement().primaryKey(),
  nameAr: varchar("nameAr", { length: 255 }).notNull(),
  nameEn: varchar("nameEn", { length: 255 }).notNull(),
  category: mysqlEnum("category", ["concrete", "steel", "insulation", "glass", "masonry", "finishing", "mep", "waterproofing", "roofing", "other"]).notNull(),
  /** Thermal conductivity W/(m·K) — used in heat load calculations */
  thermalConductivity: double("thermalConductivity"),
  /** Thermal resistance R-value m²·K/W */
  thermalResistance: double("thermalResistance"),
  /** Density kg/m³ */
  density: double("density"),
  /** Specific heat capacity J/(kg·K) */
  specificHeat: double("specificHeat"),
  /** U-value W/(m²·K) for composite elements */
  uValue: double("uValue"),
  /** Solar Heat Gain Coefficient (for glazing) */
  shgc: double("shgc"),
  /** Visible Light Transmittance (for glazing) */
  vlt: double("vlt"),
  /** Approximate price per unit in AED */
  priceAed: double("priceAed"),
  /** Unit of pricing (m², m³, kg, piece) */
  priceUnit: varchar("priceUnit", { length: 32 }),
  /** Typical UAE suppliers */
  suppliers: text("suppliers"),
  lastUpdated: timestamp("lastUpdated").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ConstructionMaterial = typeof constructionMaterials.$inferSelect;

/**
 * Design Standards — Interior design principles, space standards, ergonomics.
 * Used by: فضاء (Fada) platform.
 */
export const designStandards = mysqlTable("design_standards", {
  id: int("id").autoincrement().primaryKey(),
  category: mysqlEnum("category", ["space_planning", "lighting", "color_theory", "furniture", "accessibility", "acoustics", "biophilic", "cultural_uae"]).notNull(),
  titleAr: text("titleAr").notNull(),
  titleEn: text("titleEn"),
  contentAr: text("contentAr").notNull(),
  contentEn: text("contentEn"),
  /** Minimum recommended value */
  minValue: double("minValue"),
  /** Maximum recommended value */
  maxValue: double("maxValue"),
  unit: varchar("unit", { length: 32 }),
  source: varchar("source", { length: 255 }),
  tags: text("tags"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DesignStandard = typeof designStandards.$inferSelect;

/**
 * Property Market Data — UAE real estate market data per area.
 * Used by: مسكن (Maskan) platform.
 */
export const propertyMarketData = mysqlTable("property_market_data", {
  id: int("id").autoincrement().primaryKey(),
  emirate: mysqlEnum("emirate", ["dubai", "abu_dhabi", "sharjah", "ajman", "ras_al_khaimah", "fujairah", "umm_al_quwain"]).notNull(),
  area: varchar("area", { length: 255 }).notNull(),
  propertyType: mysqlEnum("propertyType", ["apartment", "villa", "townhouse", "studio", "penthouse", "land"]).notNull(),
  /** Average sale price per sqft in AED */
  avgSalePricePerSqft: double("avgSalePricePerSqft"),
  /** Average rent per year in AED */
  avgRentYearly: double("avgRentYearly"),
  /** Average service charge per sqft per year */
  avgServiceCharge: double("avgServiceCharge"),
  /** Average ROI % */
  avgRoi: double("avgRoi"),
  /** Typical mortgage rate % */
  mortgageRate: double("mortgageRate"),
  /** Number of transactions in last quarter */
  transactionsLastQuarter: int("transactionsLastQuarter"),
  quarter: varchar("quarter", { length: 8 }), // e.g. "Q1-2025"
  source: varchar("source", { length: 128 }),
  lastUpdated: timestamp("lastUpdated").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PropertyMarketData = typeof propertyMarketData.$inferSelect;

// ═══════════════════════════════════════════════════════════════════
// LAYER 2: KNOWLEDGE — Rules, formulas, templates, decision logic
// ═══════════════════════════════════════════════════════════════════

/**
 * Calculation Rules — Engineering formulas and calculation methods.
 * This is the "brain" layer — stores HOW to calculate, not just raw data.
 * Used by: حرارة (Harara), رقابة (Raqaba), كود (Code) platforms.
 */
export const calculationRules = mysqlTable("calculation_rules", {
  id: int("id").autoincrement().primaryKey(),
  platform: mysqlEnum("platform", ["fada", "raqaba", "harara", "maskan", "code", "khayal", "all"]).notNull(),
  /** Rule name in Arabic */
  nameAr: varchar("nameAr", { length: 255 }).notNull(),
  /** Rule name in English */
  nameEn: varchar("nameEn", { length: 255 }),
  /** Category of calculation */
  category: varchar("category", { length: 128 }).notNull(),
  /** The formula or rule description in Arabic */
  formulaAr: text("formulaAr").notNull(),
  /** The formula or rule description in English */
  formulaEn: text("formulaEn"),
  /** JSON: input parameters required { name, type, unit, description } */
  inputParams: json("inputParams"),
  /** JSON: output parameters produced { name, type, unit, description } */
  outputParams: json("outputParams"),
  /** JSON: the actual formula logic as a structured object */
  formulaLogic: json("formulaLogic"),
  /** Example calculation in JSON */
  exampleInput: json("exampleInput"),
  exampleOutput: json("exampleOutput"),
  /** Reference standard (e.g. ASHRAE 90.1, DBC Part 6) */
  referenceStandard: varchar("referenceStandard", { length: 255 }),
  /** Applies to specific emirate or "all" */
  emirate: varchar("emirate", { length: 64 }).default("all"),
  /** Priority: higher = preferred when multiple rules match */
  priority: int("priority").default(1),
  isActive: int("isActive").default(1).notNull(), // 0=false, 1=true
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CalculationRule = typeof calculationRules.$inferSelect;

/**
 * Output Templates — How to format and present results to users.
 * Stores the structure of reports, recommendations, and responses.
 */
export const outputTemplates = mysqlTable("output_templates", {
  id: int("id").autoincrement().primaryKey(),
  platform: mysqlEnum("platform", ["fada", "raqaba", "harara", "maskan", "code", "khayal", "all"]).notNull(),
  /** Template name */
  nameAr: varchar("nameAr", { length: 255 }).notNull(),
  nameEn: varchar("nameEn", { length: 255 }),
  /** Type of output */
  outputType: mysqlEnum("outputType", ["report", "recommendation", "checklist", "summary", "analysis", "comparison"]).notNull(),
  /** The template structure in Arabic (with {{placeholders}}) */
  templateAr: text("templateAr").notNull(),
  /** The template structure in English */
  templateEn: text("templateEn"),
  /** JSON: list of required placeholder keys */
  requiredFields: json("requiredFields"),
  /** JSON: optional placeholder keys */
  optionalFields: json("optionalFields"),
  /** Tone: formal for reports, conversational for chat */
  tone: mysqlEnum("tone", ["formal", "conversational", "technical", "simplified"]).default("formal"),
  isActive: int("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type OutputTemplate = typeof outputTemplates.$inferSelect;

/**
 * Decision Trees — Structured decision logic for platform recommendations.
 * Encodes expert knowledge as if-then-else trees stored as JSON.
 * Example: "If building > 10 floors AND in Dubai → apply DBC Part 3 + NFPA 101"
 */
export const decisionTrees = mysqlTable("decision_trees", {
  id: int("id").autoincrement().primaryKey(),
  platform: mysqlEnum("platform", ["fada", "raqaba", "harara", "maskan", "code", "khayal", "all"]).notNull(),
  nameAr: varchar("nameAr", { length: 255 }).notNull(),
  nameEn: varchar("nameEn", { length: 255 }),
  /** The trigger condition in natural language */
  triggerCondition: text("triggerCondition").notNull(),
  /** JSON: the decision tree nodes { condition, yes, no, result } */
  treeLogic: json("treeLogic").notNull(),
  /** JSON: list of knowledge_base or building_code IDs this tree references */
  referencedIds: json("referencedIds"),
  /** Confidence score 0-100 of this decision path */
  confidenceScore: int("confidenceScore").default(90),
  isActive: int("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DecisionTree = typeof decisionTrees.$inferSelect;

/**
 * FAQ Cache — Frequently asked questions with pre-computed answers.
 * Grows automatically: when LLM answers a question, it's cached here.
 * Next time the same question is asked → served from cache (0 LLM cost).
 */
export const faqCache = mysqlTable("faq_cache", {
  id: int("id").autoincrement().primaryKey(),
  platform: mysqlEnum("platform", ["fada", "raqaba", "harara", "maskan", "code", "khayal", "all"]).notNull(),
  /** The question as asked by user */
  questionAr: text("questionAr").notNull(),
  questionEn: text("questionEn"),
  /** Pre-computed answer in Arabic */
  answerAr: text("answerAr").notNull(),
  answerEn: text("answerEn"),
  /** Embedding of the question for semantic similarity matching */
  questionEmbedding: json("questionEmbedding"),
  /** How many times this cache entry was served */
  hitCount: int("hitCount").default(0).notNull(),
  /** Credits saved by serving from cache */
  creditsSaved: int("creditsSaved").default(0).notNull(),
  /** Source: manual (admin-added) or auto (LLM-generated and cached) */
  source: mysqlEnum("source", ["manual", "auto"]).default("auto"),
  /** Quality score 0-100 (admin can rate) */
  qualityScore: int("qualityScore").default(80),
  isActive: int("isActive").default(1).notNull(),
  lastHitAt: timestamp("lastHitAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FaqCache = typeof faqCache.$inferSelect;

/**
 * Knowledge Base Sync Log — Tracks when external data was last fetched.
 * Used by scheduled jobs to know what needs refreshing.
 */
export const knowledgeSyncLog = mysqlTable("knowledge_sync_log", {
  id: int("id").autoincrement().primaryKey(),
  /** Which data source was synced */
  dataSource: varchar("dataSource", { length: 128 }).notNull(),
  /** Which table was populated */
  targetTable: varchar("targetTable", { length: 64 }).notNull(),
  /** Number of records inserted/updated */
  recordsAffected: int("recordsAffected").default(0),
  status: mysqlEnum("status", ["success", "partial", "failed"]).notNull(),
  errorMessage: text("errorMessage"),
  /** Duration in milliseconds */
  durationMs: int("durationMs"),
  syncedAt: timestamp("syncedAt").defaultNow().notNull(),
});

export type KnowledgeSyncLog = typeof knowledgeSyncLog.$inferSelect;


// ═══════════════════════════════════════════════════════════════════
// LAYER 3: SUPPLIER CATALOG — Vendors contribute their own data
// ═══════════════════════════════════════════════════════════════════

/**
 * Suppliers — Companies and vendors registered on the platform.
 * They self-register and manage their own product/service catalog.
 * Verification by admin before catalog goes live.
 */
export const suppliers = mysqlTable("suppliers", {
  id: int("id").autoincrement().primaryKey(),
  /** Linked user account (supplier must register) */
  userId: int("userId"),
  nameAr: varchar("nameAr", { length: 255 }).notNull(),
  nameEn: varchar("nameEn", { length: 255 }),
  /** Business type */
  type: mysqlEnum("type", ["manufacturer", "distributor", "contractor", "consultant", "retailer"]).notNull(),
  /** Primary specialization */
  specialization: mysqlEnum("specialization", [
    "concrete", "steel", "insulation", "glass", "hvac", "electrical",
    "plumbing", "finishing", "furniture", "landscaping", "general"
  ]).notNull(),
  /** Emirates where they operate */
  operatingEmirates: text("operatingEmirates"), // comma-separated
  phone: varchar("phone", { length: 32 }),
  email: varchar("email", { length: 320 }),
  website: varchar("website", { length: 512 }),
  address: text("address"),
  /** Trade license number — verified by admin */
  tradeLicenseNo: varchar("tradeLicenseNo", { length: 64 }),
  /** Verification status */
  verificationStatus: mysqlEnum("verificationStatus", ["pending", "verified", "rejected", "suspended"]).default("pending").notNull(),
  verifiedBy: int("verifiedBy"), // admin userId
  verifiedAt: timestamp("verifiedAt"),
  /** Overall rating from platform users (0-5) */
  ratingAvg: double("ratingAvg").default(0),
  ratingCount: int("ratingCount").default(0),
  /** Trust score 0-100 computed by system */
  trustScore: int("trustScore").default(50),
  isActive: int("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = typeof suppliers.$inferInsert;

/**
 * Supplier Products/Services Catalog
 * Suppliers enter their own products with specs and pricing.
 * Visible to all platform users after supplier verification.
 */
export const supplierCatalog = mysqlTable("supplier_catalog", {
  id: int("id").autoincrement().primaryKey(),
  supplierId: int("supplierId").notNull(),
  /** Which platform(s) this product is relevant to */
  platform: mysqlEnum("platform", ["fada", "raqaba", "harara", "maskan", "code", "khayal", "all"]).notNull(),
  nameAr: varchar("nameAr", { length: 255 }).notNull(),
  nameEn: varchar("nameEn", { length: 255 }),
  category: varchar("category", { length: 128 }).notNull(),
  descriptionAr: text("descriptionAr"),
  descriptionEn: text("descriptionEn"),
  /** Technical specifications as JSON */
  specs: json("specs"),
  /** Price in AED */
  priceAed: double("priceAed"),
  priceUnit: varchar("priceUnit", { length: 32 }),
  /** Minimum order quantity */
  minOrderQty: double("minOrderQty"),
  /** Lead time in days */
  leadTimeDays: int("leadTimeDays"),
  /** Product images (S3 URLs) */
  imageUrls: text("imageUrls"), // JSON array of URLs
  /** Certifications (e.g. "ISO 9001, ESMA, CE") */
  certifications: text("certifications"),
  /** Thermal/structural specs for materials */
  thermalConductivity: double("thermalConductivity"),
  uValue: double("uValue"),
  shgc: double("shgc"),
  /** Admin approval before going live */
  approvalStatus: mysqlEnum("approvalStatus", ["pending", "approved", "rejected"]).default("pending").notNull(),
  approvedBy: int("approvedBy"),
  approvedAt: timestamp("approvedAt"),
  isActive: int("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SupplierCatalogItem = typeof supplierCatalog.$inferSelect;

// ═══════════════════════════════════════════════════════════════════
// LAYER 5: EXPERT CORRECTIONS — Validated knowledge updates from specialists
// ═══════════════════════════════════════════════════════════════════

/**
 * Expert Profiles — Verified professionals who can submit corrections.
 * Must provide engineering license number + specialization proof.
 */
export const expertProfiles = mysqlTable("expert_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  /** Professional title */
  titleAr: varchar("titleAr", { length: 128 }),
  titleEn: varchar("titleEn", { length: 128 }),
  /** Engineering specialization */
  specialization: mysqlEnum("specialization", [
    "structural", "mechanical", "electrical", "civil", "architectural",
    "fire_safety", "energy", "interior_design", "quantity_surveying", "other"
  ]).notNull(),
  /** License number from UAE Society of Engineers or equivalent */
  licenseNumber: varchar("licenseNumber", { length: 64 }),
  /** Issuing body (UAE Society of Engineers, CIBSE, etc.) */
  licensingBody: varchar("licensingBody", { length: 128 }),
  /** Years of experience */
  yearsExperience: int("yearsExperience"),
  /** Employer / organization */
  organization: varchar("organization", { length: 255 }),
  /** Verification documents (S3 URLs) */
  verificationDocUrls: text("verificationDocUrls"), // JSON array
  verificationStatus: mysqlEnum("verificationStatus", ["pending", "verified", "rejected"]).default("pending").notNull(),
  verifiedBy: int("verifiedBy"),
  verifiedAt: timestamp("verifiedAt"),
  /** Reputation score — increases with accepted corrections */
  reputationScore: int("reputationScore").default(0),
  /** Total corrections submitted / accepted */
  correctionsSubmitted: int("correctionsSubmitted").default(0),
  correctionsAccepted: int("correctionsAccepted").default(0),
  /** Credits earned from accepted corrections */
  creditsEarned: int("creditsEarned").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ExpertProfile = typeof expertProfiles.$inferSelect;

/**
 * Expert Corrections — Proposed corrections to platform knowledge base.
 * Goes through strict multi-reviewer validation before being applied.
 *
 * Validation pipeline:
 * 1. Expert submits correction + mandatory evidence
 * 2. System verifies submitter's credentials match correction domain
 * 3. 3 independent reviewers from same specialization vote
 * 4. If 2/3 approve → correction applied to knowledge base
 * 5. Submitter earns credits; audit trail preserved forever
 */
export const expertCorrections = mysqlTable("expert_corrections", {
  id: int("id").autoincrement().primaryKey(),
  /** Expert who submitted the correction */
  submittedBy: int("submittedBy").notNull(),
  /** Which platform/knowledge area this correction targets */
  platform: mysqlEnum("platform", ["fada", "raqaba", "harara", "maskan", "code", "khayal", "all"]).notNull(),
  /** Type of correction */
  correctionType: mysqlEnum("correctionType", [
    "building_code", "calculation_rule", "design_standard",
    "material_spec", "climate_data", "general_knowledge"
  ]).notNull(),
  /** ID of the record being corrected (in its respective table) */
  targetRecordId: int("targetRecordId"),
  targetTable: varchar("targetTable", { length: 64 }),
  /** What is currently wrong (Arabic) */
  currentValueAr: text("currentValueAr").notNull(),
  /** What it should be corrected to (Arabic) */
  proposedValueAr: text("proposedValueAr").notNull(),
  /** Justification in Arabic */
  justificationAr: text("justificationAr").notNull(),
  /** Evidence documents: official emails, updated code PDFs, test reports (S3 URLs) */
  evidenceUrls: text("evidenceUrls").notNull(), // JSON array — MANDATORY
  /** Official reference: code section, standard number, publication */
  officialReference: varchar("officialReference", { length: 512 }),
  /** Validation status */
  status: mysqlEnum("status", [
    "pending_review",   // waiting for reviewers
    "under_review",     // reviewers assigned
    "approved",         // 2/3 reviewers approved → applied
    "rejected",         // majority rejected
    "needs_more_info",  // reviewers requested more evidence
    "applied"           // correction applied to knowledge base
  ]).default("pending_review").notNull(),
  /** Reviewer votes: JSON array of { reviewerId, vote, comment, votedAt } */
  reviewerVotes: json("reviewerVotes"),
  /** Admin who applied the correction to the knowledge base */
  appliedBy: int("appliedBy"),
  appliedAt: timestamp("appliedAt"),
  /** Credits awarded to submitter on approval */
  creditsAwarded: int("creditsAwarded").default(0),
  /** Priority: high for safety-critical corrections */
  priority: mysqlEnum("priority", ["low", "normal", "high", "critical"]).default("normal"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ExpertCorrection = typeof expertCorrections.$inferSelect;
export type InsertExpertCorrection = typeof expertCorrections.$inferInsert;

// ═══════════════════════════════════════════════════════════════════
// LAYER 6: GIG WORKFORCE — Professionals contribute specialized work
// ═══════════════════════════════════════════════════════════════════

/**
 * Gig Professionals — Engineers and specialists available for micro-tasks.
 * Examples: BOQ preparation, energy studies, drawing review, code checking.
 */
export const gigProfessionals = mysqlTable("gig_professionals", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  /** Professional specialization */
  specialization: mysqlEnum("specialization", [
    "structural", "mechanical", "electrical", "civil", "architectural",
    "fire_safety", "energy", "interior_design", "quantity_surveying",
    "bim_modeling", "cost_estimation", "other"
  ]).notNull(),
  /** Skills as comma-separated tags */
  skills: text("skills"),
  /** Years of experience */
  yearsExperience: int("yearsExperience"),
  /** Preferred task types */
  preferredTaskTypes: text("preferredTaskTypes"), // JSON array
  /** Hourly rate in AED */
  hourlyRateAed: double("hourlyRateAed"),
  /** Per-task rate for common tasks */
  taskRates: json("taskRates"), // { boq_villa: 500, energy_study: 800, ... }
  /** Portfolio links (S3 URLs or external) */
  portfolioUrls: text("portfolioUrls"),
  /** License verification */
  licenseNumber: varchar("licenseNumber", { length: 64 }),
  verificationStatus: mysqlEnum("verificationStatus", ["pending", "verified", "rejected"]).default("pending").notNull(),
  /** Rating from completed tasks */
  ratingAvg: double("ratingAvg").default(0),
  ratingCount: int("ratingCount").default(0),
  /** Total tasks completed */
  tasksCompleted: int("tasksCompleted").default(0),
  /** Total earnings in AED */
  totalEarningsAed: double("totalEarningsAed").default(0),
  isAvailable: int("isAvailable").default(1).notNull(),
  isActive: int("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type GigProfessional = typeof gigProfessionals.$inferSelect;

/**
 * Gig Tasks — Micro-tasks posted by the platform or users.
 * Professionals bid or are auto-matched based on specialization.
 */
export const gigTasks = mysqlTable("gig_tasks", {
  id: int("id").autoincrement().primaryKey(),
  /** Posted by: platform system (auto) or user */
  postedBy: int("postedBy"), // null = system-generated
  /** Which platform this task serves */
  platform: mysqlEnum("platform", ["fada", "raqaba", "harara", "maskan", "code", "khayal", "all"]).notNull(),
  /** Task type */
  taskType: mysqlEnum("taskType", [
    "boq_preparation",      // جدول كميات
    "energy_study",         // دراسة طاقة
    "drawing_review",       // مراجعة مخططات
    "code_checking",        // فحص الكودات
    "cost_estimation",      // تقدير تكاليف
    "inspection_report",    // تقرير تفتيش
    "design_review",        // مراجعة تصميم
    "quantity_survey",      // مسح كميات
    "knowledge_entry",      // إدخال بيانات معرفية
    "translation",          // ترجمة تقنية
    "other"
  ]).notNull(),
  titleAr: varchar("titleAr", { length: 255 }).notNull(),
  titleEn: varchar("titleEn", { length: 255 }),
  descriptionAr: text("descriptionAr").notNull(),
  /** Required specialization */
  requiredSpecialization: varchar("requiredSpecialization", { length: 128 }),
  /** Minimum years of experience required */
  minExperience: int("minExperience").default(0),
  /** Budget in AED */
  budgetAed: double("budgetAed"),
  /** Deadline */
  deadline: timestamp("deadline"),
  /** Attached files (project drawings, specs) — S3 URLs */
  attachmentUrls: text("attachmentUrls"), // JSON array
  /** Assigned professional */
  assignedTo: int("assignedTo"),
  assignedAt: timestamp("assignedAt"),
  /** Task status */
  status: mysqlEnum("status", [
    "open",         // accepting applications
    "assigned",     // professional assigned
    "in_progress",  // work started
    "submitted",    // work submitted for review
    "approved",     // work accepted
    "rejected",     // work rejected (with reason)
    "cancelled"
  ]).default("open").notNull(),
  /** Deliverable files — S3 URLs */
  deliverableUrls: text("deliverableUrls"), // JSON array
  /** Quality review by admin/system */
  qualityScore: int("qualityScore"), // 0-100
  reviewNote: text("reviewNote"),
  /** Payment to professional in AED */
  paymentAed: double("paymentAed"),
  paymentStatus: mysqlEnum("paymentStatus", ["pending", "released", "held", "refunded"]).default("pending"),
  /** If task output improves knowledge base, record which record was updated */
  knowledgeBaseImpact: json("knowledgeBaseImpact"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type GigTask = typeof gigTasks.$inferSelect;
export type InsertGigTask = typeof gigTasks.$inferInsert;

// ═══════════════════════════════════════════════════════════════════
// LAYER 7: DATA LIFECYCLE — Expiry tracking and version control
// ═══════════════════════════════════════════════════════════════════

/**
 * Data Versions — Tracks every change to knowledge base records.
 * Immutable audit trail: nothing is ever truly deleted, only versioned.
 * Enables: "What did the code say on Jan 2024?" queries.
 */
export const dataVersions = mysqlTable("data_versions", {
  id: int("id").autoincrement().primaryKey(),
  /** Source table name */
  tableName: varchar("tableName", { length: 64 }).notNull(),
  /** Record ID in source table */
  recordId: int("recordId").notNull(),
  /** Version number (increments per record) */
  version: int("version").notNull(),
  /** Full snapshot of the record at this version (JSON) */
  snapshot: json("snapshot").notNull(),
  /** What changed */
  changeType: mysqlEnum("changeType", ["created", "updated", "corrected", "deprecated", "restored"]).notNull(),
  /** Who made the change */
  changedBy: int("changedBy"),
  /** Why it was changed */
  changeReason: text("changeReason"),
  /** Reference to expert_correction if triggered by one */
  correctionId: int("correctionId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DataVersion = typeof dataVersions.$inferSelect;

/**
 * Data Expiry Alerts — Tracks when data needs refresh.
 * System sends alerts when data is stale or approaching expiry.
 */
export const dataExpiryAlerts = mysqlTable("data_expiry_alerts", {
  id: int("id").autoincrement().primaryKey(),
  tableName: varchar("tableName", { length: 64 }).notNull(),
  recordId: int("recordId"),
  /** Human-readable description of what's expiring */
  descriptionAr: text("descriptionAr").notNull(),
  /** When this data expires or needs refresh */
  expiresAt: timestamp("expiresAt").notNull(),
  /** How often to refresh (in days) */
  refreshIntervalDays: int("refreshIntervalDays"),
  /** Alert status */
  status: mysqlEnum("status", ["active", "acknowledged", "resolved"]).default("active").notNull(),
  /** Who acknowledged */
  acknowledgedBy: int("acknowledgedBy"),
  acknowledgedAt: timestamp("acknowledgedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DataExpiryAlert = typeof dataExpiryAlerts.$inferSelect;

// ═══════════════════════════════════════════════════════════════════
// LAYER 8: PROJECT IDENTITY — Unified project entity across all platforms
// ═══════════════════════════════════════════════════════════════════

/**
 * Projects — A unified project entity that persists across all 6 platforms.
 * One project = one file that accumulates all AI interactions, reports, decisions.
 * Think of it as a "digital twin" of the physical project.
 */
export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  /** Project name */
  nameAr: varchar("nameAr", { length: 255 }).notNull(),
  nameEn: varchar("nameEn", { length: 255 }),
  /** Project type */
  projectType: mysqlEnum("projectType", [
    "villa", "apartment_building", "commercial", "mixed_use",
    "industrial", "hospitality", "healthcare", "educational",
    "infrastructure", "renovation", "interior_only", "feasibility", "other"
  ]).notNull(),
  /** Location details */
  emirate: mysqlEnum("emirate", ["dubai", "abu_dhabi", "sharjah", "ajman", "ras_al_khaimah", "fujairah", "umm_al_quwain"]),
  area: varchar("area", { length: 255 }),
  plotNumber: varchar("plotNumber", { length: 64 }),
  coordinates: varchar("coordinates", { length: 64 }), // "lat,lng"
  /** Project scale */
  totalAreaSqm: double("totalAreaSqm"),
  numFloors: int("numFloors"),
  numUnits: int("numUnits"),
  /** Budget */
  budgetAed: double("budgetAed"),
  /** Project phase */
  phase: mysqlEnum("phase", [
    "feasibility", "concept_design", "schematic_design",
    "design_development", "construction_documents",
    "permitting", "construction", "handover", "completed"
  ]).default("feasibility"),
  /** Project status */
  status: mysqlEnum("status", ["active", "on_hold", "completed", "cancelled"]).default("active").notNull(),
  /** Cover image (S3 URL) */
  coverImageUrl: varchar("coverImageUrl", { length: 512 }),
  /** Tags for search */
  tags: text("tags"),
  /** Linked AI sessions across all platforms */
  linkedSessionIds: json("linkedSessionIds"), // { fada: [1,2], harara: [3], ... }
  /** Key decisions made (auto-populated from AI sessions) */
  keyDecisions: json("keyDecisions"),
  /** Issues flagged by raqaba */
  openIssues: int("openIssues").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

/**
 * Project Documents — All files associated with a project.
 * Drawings, contracts, reports, photos — all linked to project.
 */
export const projectDocuments = mysqlTable("project_documents", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  uploadedBy: int("uploadedBy").notNull(),
  /** Document type */
  docType: mysqlEnum("docType", [
    "architectural_drawing", "structural_drawing", "mep_drawing",
    "contract", "permit", "inspection_report", "cost_estimate",
    "energy_study", "soil_report", "survey", "photo", "other"
  ]).notNull(),
  nameAr: varchar("nameAr", { length: 255 }).notNull(),
  nameEn: varchar("nameEn", { length: 255 }),
  /** S3 URL */
  fileUrl: varchar("fileUrl", { length: 512 }).notNull(),
  fileKey: varchar("fileKey", { length: 512 }).notNull(),
  fileSizeBytes: int("fileSizeBytes"),
  mimeType: varchar("mimeType", { length: 128 }),
  /** AI-extracted metadata (area, cost, date, etc.) */
  extractedData: json("extractedData"),
  /** Processing status for AI extraction */
  processingStatus: mysqlEnum("processingStatus", ["pending", "processing", "completed", "failed"]).default("pending"),
  /** Version number for this document type in this project */
  version: int("version").default(1),
  isActive: int("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ProjectDocument = typeof projectDocuments.$inferSelect;
export type InsertProjectDocument = typeof projectDocuments.$inferInsert;

// ═══════════════════════════════════════════════════════════════════
// LAYER 9: TRUST & AUDIT — Data credibility scores and compliance trail
// ═══════════════════════════════════════════════════════════════════

/**
 * Trust Scores — Credibility rating for every piece of data in the system.
 * Users see trust indicators next to all data points.
 */
export const trustScores = mysqlTable("trust_scores", {
  id: int("id").autoincrement().primaryKey(),
  /** Source table */
  tableName: varchar("tableName", { length: 64 }).notNull(),
  recordId: int("recordId").notNull(),
  /** Trust score 0-100 */
  score: int("score").notNull(),
  /** Trust level label */
  level: mysqlEnum("level", ["unverified", "community", "verified", "official", "certified"]).notNull(),
  /** Source type */
  sourceType: mysqlEnum("sourceType", [
    "government_official",   // كود حكومي رسمي
    "expert_verified",       // مُتحقق من خبير معتمد
    "peer_reviewed",         // مُراجَع من الأقران
    "supplier_submitted",    // مُقدَّم من مورد
    "ai_generated",          // مُولَّد بالذكاء الاصطناعي
    "user_contributed",      // مُقدَّم من مستخدم عادي
    "market_data"            // بيانات سوق
  ]).notNull(),
  /** Justification for the score */
  justification: text("justification"),
  /** Last time score was recalculated */
  lastCalculatedAt: timestamp("lastCalculatedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TrustScore = typeof trustScores.$inferSelect;

/**
 * Audit Log — Immutable record of all significant system actions.
 * Required for legal compliance and regulatory transparency.
 */
export const auditLog = mysqlTable("audit_log", {
  id: int("id").autoincrement().primaryKey(),
  /** Actor: user, system, or external API */
  actorType: mysqlEnum("actorType", ["user", "admin", "system", "api"]).notNull(),
  actorId: int("actorId"), // userId or null for system
  /** Action performed */
  action: varchar("action", { length: 128 }).notNull(),
  /** Target resource */
  targetTable: varchar("targetTable", { length: 64 }),
  targetId: int("targetId"),
  /** Before/after state for data changes */
  beforeState: json("beforeState"),
  afterState: json("afterState"),
  /** IP address */
  ipAddress: varchar("ipAddress", { length: 64 }),
  /** Additional context */
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditLog = typeof auditLog.$inferSelect;

// ═══════════════════════════════════════════════════════════════════
// LAYER 10: INSTITUTIONAL MEMORY — 20-year archive digitization
// ═══════════════════════════════════════════════════════════════════

/**
 * Archive Contracts — Historical project contracts digitized from 20-year archive.
 * AI extracts structured data from PDF/image contracts.
 * Powers: cost estimation models, market trend analysis, BOQ benchmarks.
 */
export const archiveContracts = mysqlTable("archive_contracts", {
  id: int("id").autoincrement().primaryKey(),
  /** Owner organization (your consultancy) */
  organizationId: int("organizationId"),
  /** Original file (S3 URL) — kept for reference */
  originalFileUrl: varchar("originalFileUrl", { length: 512 }),
  originalFileKey: varchar("originalFileKey", { length: 512 }),
  /** AI extraction status */
  extractionStatus: mysqlEnum("extractionStatus", ["pending", "processing", "completed", "failed", "needs_review"]).default("pending").notNull(),
  /** Confidence of AI extraction 0-100 */
  extractionConfidence: int("extractionConfidence"),
  /** Human-verified flag */
  humanVerified: int("humanVerified").default(0), // 0=no, 1=yes
  verifiedBy: int("verifiedBy"),
  verifiedAt: timestamp("verifiedAt"),

  // ── Extracted Fields ──────────────────────────────────────────
  /** Contract date */
  contractDate: timestamp("contractDate"),
  /** Project type */
  projectType: mysqlEnum("projectType", [
    "villa", "apartment_building", "commercial", "mixed_use",
    "industrial", "hospitality", "healthcare", "educational",
    "infrastructure", "renovation", "interior_only", "other"
  ]),
  /** Emirate */
  emirate: mysqlEnum("emirate", ["dubai", "abu_dhabi", "sharjah", "ajman", "ras_al_khaimah", "fujairah", "umm_al_quwain"]),
  /** Area/district */
  area: varchar("area", { length: 255 }),
  /** Total built area m² */
  totalAreaSqm: double("totalAreaSqm"),
  /** Number of floors */
  numFloors: int("numFloors"),
  /** Number of units (for residential) */
  numUnits: int("numUnits"),
  /** Total contract value in AED */
  contractValueAed: double("contractValueAed"),
  /** Cost per sqm in AED */
  costPerSqmAed: double("costPerSqmAed"),
  /** Construction duration in months */
  durationMonths: int("durationMonths"),
  /** Scope of work tags */
  scopeTags: text("scopeTags"), // comma-separated
  /** Contractor type */
  contractorType: mysqlEnum("contractorType", ["main_contractor", "specialist", "consultant", "design_build"]),
  /** Privacy: client name is anonymized before storage */
  clientAnonymized: int("clientAnonymized").default(1), // always 1
  /** Any special conditions or notes */
  specialConditions: text("specialConditions"),
  /** Year bucket for trend analysis */
  yearBucket: int("yearBucket"), // e.g. 2005, 2010, 2015, 2020
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ArchiveContract = typeof archiveContracts.$inferSelect;
export type InsertArchiveContract = typeof archiveContracts.$inferInsert;

/**
 * Archive Drawings — Historical architectural drawings digitized from archive.
 * AI extracts: room types, areas, ratios, orientation, design patterns.
 * Powers: space planning benchmarks, design pattern library, فضاء platform.
 */
export const archiveDrawings = mysqlTable("archive_drawings", {
  id: int("id").autoincrement().primaryKey(),
  /** Linked contract if available */
  contractId: int("contractId"),
  organizationId: int("organizationId"),
  /** Original file (S3 URL) */
  originalFileUrl: varchar("originalFileUrl", { length: 512 }),
  originalFileKey: varchar("originalFileKey", { length: 512 }),
  /** Drawing type */
  drawingType: mysqlEnum("drawingType", [
    "floor_plan", "elevation", "section", "site_plan",
    "roof_plan", "detail", "3d_view", "landscape"
  ]).notNull(),
  /** Floor number (for multi-floor buildings) */
  floorNumber: int("floorNumber"),
  /** Scale */
  scale: varchar("scale", { length: 32 }),
  /** AI extraction status */
  extractionStatus: mysqlEnum("extractionStatus", ["pending", "processing", "completed", "failed"]).default("pending").notNull(),
  extractionConfidence: int("extractionConfidence"),

  // ── Extracted Spatial Data ────────────────────────────────────
  /** Total floor area m² */
  totalAreaSqm: double("totalAreaSqm"),
  /** Net usable area m² */
  netAreaSqm: double("netAreaSqm"),
  /** Efficiency ratio (net/gross) */
  efficiencyRatio: double("efficiencyRatio"),
  /** Room breakdown as JSON: { living: 45, master_bed: 32, ... } */
  roomBreakdown: json("roomBreakdown"),
  /** Facade orientation (N/S/E/W) */
  facadeOrientation: varchar("facadeOrientation", { length: 32 }),
  /** Window-to-wall ratio */
  windowWallRatio: double("windowWallRatio"),
  /** Design style tags */
  styleTags: text("styleTags"), // e.g. "contemporary,islamic,minimalist"
  /** Notable design features */
  designFeatures: text("designFeatures"),
  /** Project type context */
  projectType: varchar("projectType", { length: 64 }),
  emirate: mysqlEnum("emirate", ["dubai", "abu_dhabi", "sharjah", "ajman", "ras_al_khaimah", "fujairah", "umm_al_quwain"]),
  /** Year of design */
  designYear: int("designYear"),
  humanVerified: int("humanVerified").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ArchiveDrawing = typeof archiveDrawings.$inferSelect;
export type InsertArchiveDrawing = typeof archiveDrawings.$inferInsert;

/**
 * Cost Benchmarks — Derived from archive contracts.
 * Statistical models for cost estimation per project type/location/year.
 * Automatically updated as more contracts are digitized.
 */
export const costBenchmarks = mysqlTable("cost_benchmarks", {
  id: int("id").autoincrement().primaryKey(),
  projectType: mysqlEnum("projectType", [
    "villa", "apartment_building", "commercial", "mixed_use",
    "industrial", "hospitality", "healthcare", "educational",
    "infrastructure", "renovation", "interior_only", "other"
  ]).notNull(),
  emirate: mysqlEnum("emirate", ["dubai", "abu_dhabi", "sharjah", "ajman", "ras_al_khaimah", "fujairah", "umm_al_quwain"]).notNull(),
  /** Year of benchmark data */
  year: int("year").notNull(),
  /** Cost per sqm — minimum observed */
  costPerSqmMin: double("costPerSqmMin"),
  /** Cost per sqm — average */
  costPerSqmAvg: double("costPerSqmAvg"),
  /** Cost per sqm — maximum observed */
  costPerSqmMax: double("costPerSqmMax"),
  /** Standard deviation */
  costPerSqmStdDev: double("costPerSqmStdDev"),
  /** Number of contracts this benchmark is based on */
  sampleSize: int("sampleSize").notNull(),
  /** Confidence level 0-100 */
  confidenceLevel: int("confidenceLevel"),
  /** Inflation adjustment factor vs base year 2020 */
  inflationFactor: double("inflationFactor"),
  /** Notes on market conditions that year */
  marketNotesAr: text("marketNotesAr"),
  /** Data source */
  source: mysqlEnum("source", ["archive_contracts", "market_data", "combined"]).default("archive_contracts"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CostBenchmark = typeof costBenchmarks.$inferSelect;

/**
 * Space Planning Benchmarks — Derived from archive drawings.
 * Statistical norms for room sizes, ratios, efficiency per project type.
 */
export const spacePlanningBenchmarks = mysqlTable("space_planning_benchmarks", {
  id: int("id").autoincrement().primaryKey(),
  projectType: mysqlEnum("projectType", [
    "villa", "apartment_building", "commercial", "mixed_use",
    "hospitality", "healthcare", "educational", "other"
  ]).notNull(),
  /** Room/space type */
  spaceType: varchar("spaceType", { length: 128 }).notNull(), // e.g. "master_bedroom", "majlis", "kitchen"
  emirate: mysqlEnum("emirate", ["dubai", "abu_dhabi", "sharjah", "ajman", "ras_al_khaimah", "fujairah", "umm_al_quwain"]),
  /** Area range in m² */
  areaMinSqm: double("areaMinSqm"),
  areaAvgSqm: double("areaAvgSqm"),
  areaMaxSqm: double("areaMaxSqm"),
  /** As percentage of total floor area */
  areaRatioMin: double("areaRatioMin"),
  areaRatioAvg: double("areaRatioAvg"),
  areaRatioMax: double("areaRatioMax"),
  /** Typical dimension range */
  typicalDimensions: varchar("typicalDimensions", { length: 128 }), // e.g. "4.5x5.0 to 5.5x6.0"
  /** Cultural notes specific to UAE/Gulf */
  culturalNotesAr: text("culturalNotesAr"),
  /** Number of drawings this benchmark is based on */
  sampleSize: int("sampleSize").notNull(),
  source: mysqlEnum("source", ["archive_drawings", "standards", "combined"]).default("archive_drawings"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SpacePlanningBenchmark = typeof spacePlanningBenchmarks.$inferSelect;

// ═══════════════════════════════════════════════════════════════════
// PARTNER SYSTEM — Contractors, Developers, Consultants + Projects
// ═══════════════════════════════════════════════════════════════════

/**
 * Unified Partner Registry
 * Covers all 4 partner types: Supplier, Contractor, Developer, Consultant.
 * Each partner registers once and can submit multiple projects.
 */
export const partners = mysqlTable("partners", {
  id: int("id").autoincrement().primaryKey(),
  /** Linked Manus user account */
  userId: int("userId").notNull(),

  // ── Identity ──────────────────────────────────────────────────
  nameAr: varchar("nameAr", { length: 255 }).notNull(),
  nameEn: varchar("nameEn", { length: 255 }),
  /** Partner category */
  partnerType: mysqlEnum("partnerType", [
    "supplier",       // موردو مواد البناء
    "contractor",     // مقاولون تنفيذ
    "developer",      // مطورون عقاريون
    "consultant",     // مكاتب استشارية هندسية
    "subcontractor",  // مقاولو باطن
    "manufacturer",   // مصنّعون
  ]).notNull(),

  // ── Specializations (multi-select stored as JSON) ─────────────
  /** Primary specialization */
  primarySpecialization: varchar("primarySpecialization", { length: 128 }).notNull(),
  /** Additional specializations (JSON array) */
  additionalSpecializations: json("additionalSpecializations"),

  // ── Contact & Location ────────────────────────────────────────
  phone: varchar("phone", { length: 32 }),
  email: varchar("email", { length: 320 }),
  website: varchar("website", { length: 512 }),
  address: text("address"),
  /** Emirates where they operate (JSON array) */
  operatingEmirates: json("operatingEmirates"),
  /** Gulf countries they operate in (JSON array) */
  operatingCountries: json("operatingCountries"),

  // ── Legal & Licensing ─────────────────────────────────────────
  tradeLicenseNo: varchar("tradeLicenseNo", { length: 64 }),
  tradeLicenseExpiry: date("tradeLicenseExpiry"),
  /** Engineering classification (e.g. "Grade A", "Grade 1") */
  engineeringGrade: varchar("engineeringGrade", { length: 32 }),
  /** Professional body membership (e.g. "UAE Society of Engineers") */
  professionalMemberships: text("professionalMemberships"),
  /** ISO/quality certifications */
  certifications: text("certifications"),

  // ── Business Profile ─────────────────────────────────────────
  foundedYear: int("foundedYear"),
  numEmployees: mysqlEnum("numEmployees", [
    "1-10", "11-50", "51-200", "201-500", "500+"
  ]),
  /** Annual revenue range in AED */
  annualRevenueRange: mysqlEnum("annualRevenueRange", [
    "under_1m", "1m_5m", "5m_20m", "20m_100m", "100m_plus"
  ]),
  /** Company profile description */
  profileAr: text("profileAr"),
  profileEn: text("profileEn"),
  /** Logo URL (S3) */
  logoUrl: varchar("logoUrl", { length: 512 }),
  /** Portfolio/brochure URL (S3) */
  portfolioUrl: varchar("portfolioUrl", { length: 512 }),

  // ── Verification ─────────────────────────────────────────────
  verificationStatus: mysqlEnum("verificationStatus", [
    "pending", "under_review", "verified", "rejected", "suspended"
  ]).default("pending").notNull(),
  verifiedBy: int("verifiedBy"),
  verifiedAt: timestamp("verifiedAt"),
  rejectionReason: text("rejectionReason"),

  // ── Ratings & Trust ───────────────────────────────────────────
  ratingAvg: double("ratingAvg").default(0),
  ratingCount: int("ratingCount").default(0),
  trustScore: int("trustScore").default(50),

  // ── Visibility ────────────────────────────────────────────────
  /** Whether partner is listed in public directory */
  isPublicListed: int("isPublicListed").default(0).notNull(),
  isActive: int("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Partner = typeof partners.$inferSelect;
export type InsertPartner = typeof partners.$inferInsert;

/**
 * Partner Projects Portfolio
 * Partners submit their completed/ongoing projects to build credibility
 * and contribute to the platform's cost benchmark database.
 */
export const partnerProjects = mysqlTable("partner_projects", {
  id: int("id").autoincrement().primaryKey(),
  partnerId: int("partnerId").notNull(),

  // ── Project Identity ─────────────────────────────────────────
  nameAr: varchar("nameAr", { length: 255 }).notNull(),
  nameEn: varchar("nameEn", { length: 255 }),
  /** Project category */
  projectType: mysqlEnum("projectType", [
    "villa", "apartment_building", "commercial", "mixed_use",
    "industrial", "hospitality", "healthcare", "educational",
    "infrastructure", "renovation", "interior_only", "masterplan",
    "feasibility", "other"
  ]).notNull(),
  /** Partner's role in this project */
  partnerRole: mysqlEnum("partnerRole", [
    "main_contractor", "subcontractor", "developer", "consultant",
    "designer", "supplier", "project_manager", "owner"
  ]).notNull(),

  // ── Location ─────────────────────────────────────────────────
  emirate: mysqlEnum("emirate", [
    "dubai", "abu_dhabi", "sharjah", "ajman",
    "ras_al_khaimah", "fujairah", "umm_al_quwain"
  ]),
  country: varchar("country", { length: 64 }).default("UAE"),
  area: varchar("area", { length: 128 }),

  // ── Scale & Scope ─────────────────────────────────────────────
  totalAreaSqm: double("totalAreaSqm"),
  numFloors: int("numFloors"),
  numUnits: int("numUnits"),
  /** Contract value in AED */
  contractValueAed: double("contractValueAed"),
  /** Whether to show contract value publicly */
  showContractValue: int("showContractValue").default(0),

  // ── Timeline ─────────────────────────────────────────────────
  startDate: date("startDate"),
  completionDate: date("completionDate"),
  durationMonths: int("durationMonths"),
  status: mysqlEnum("status", [
    "completed", "ongoing", "on_hold", "cancelled"
  ]).default("completed").notNull(),

  // ── Description ───────────────────────────────────────────────
  descriptionAr: text("descriptionAr"),
  descriptionEn: text("descriptionEn"),
  /** Key achievements or highlights */
  highlightsAr: text("highlightsAr"),
  /** Challenges faced and solutions applied */
  challengesAr: text("challengesAr"),

  // ── Media ─────────────────────────────────────────────────────
  /** Project images (JSON array of S3 URLs) */
  imageUrls: json("imageUrls"),
  /** Documents: drawings, reports (JSON array of S3 URLs) */
  documentUrls: json("documentUrls"),
  /** Cover/hero image */
  coverImageUrl: varchar("coverImageUrl", { length: 512 }),

  // ── Knowledge Contribution ────────────────────────────────────
  /** Whether this project's data is used in cost benchmarks */
  contributesToBenchmarks: int("contributesToBenchmarks").default(1),
  /** Actual cost per sqm in AED (extracted for benchmarks) */
  actualCostPerSqmAed: double("actualCostPerSqmAed"),
  /** Construction spec level */
  specLevel: mysqlEnum("specLevel", ["economy", "standard", "premium", "luxury"]),

  // ── Client Reference ─────────────────────────────────────────
  /** Client name (optional — partner may keep confidential) */
  clientNameAr: varchar("clientNameAr", { length: 255 }),
  /** Whether client name is shown publicly */
  showClientName: int("showClientName").default(0),

  // ── Approval ─────────────────────────────────────────────────
  approvalStatus: mysqlEnum("approvalStatus", [
    "pending", "approved", "rejected", "needs_revision"
  ]).default("pending").notNull(),
  approvedBy: int("approvedBy"),
  approvedAt: timestamp("approvedAt"),
  rejectionReason: text("rejectionReason"),

  isActive: int("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type PartnerProject = typeof partnerProjects.$inferSelect;
export type InsertPartnerProject = typeof partnerProjects.$inferInsert;

/**
 * Partner Services Catalog
 * What services/products each partner offers with pricing.
 * Separate from the general supplier catalog — covers all partner types.
 */
export const partnerServices = mysqlTable("partner_services", {
  id: int("id").autoincrement().primaryKey(),
  partnerId: int("partnerId").notNull(),

  nameAr: varchar("nameAr", { length: 255 }).notNull(),
  nameEn: varchar("nameEn", { length: 255 }),
  serviceType: mysqlEnum("serviceType", [
    "product",        // منتج مادي
    "service",        // خدمة
    "design",         // تصميم
    "consultation",   // استشارة
    "inspection",     // تفتيش
    "study",          // دراسة
    "training",       // تدريب
  ]).notNull(),
  /** Which platform(s) this service is relevant to */
  platform: mysqlEnum("platform", [
    "fada", "raqaba", "harara", "maskan", "code", "khayal", "all"
  ]).notNull(),

  descriptionAr: text("descriptionAr"),
  descriptionEn: text("descriptionEn"),
  /** Technical specs as JSON */
  specs: json("specs"),

  // ── Pricing ───────────────────────────────────────────────────
  priceAed: double("priceAed"),
  priceUnit: varchar("priceUnit", { length: 32 }), // e.g. "per m²", "per project", "per hour"
  priceIsNegotiable: int("priceIsNegotiable").default(1),
  minOrderQty: double("minOrderQty"),
  leadTimeDays: int("leadTimeDays"),

  /** Service images (JSON array of S3 URLs) */
  imageUrls: json("imageUrls"),
  certifications: text("certifications"),

  approvalStatus: mysqlEnum("approvalStatus", [
    "pending", "approved", "rejected"
  ]).default("pending").notNull(),
  isActive: int("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type PartnerService = typeof partnerServices.$inferSelect;
export type InsertPartnerService = typeof partnerServices.$inferInsert;

/**
 * Partner Reviews
 * Platform users can rate and review partners after engagement.
 */
export const partnerReviews = mysqlTable("partner_reviews", {
  id: int("id").autoincrement().primaryKey(),
  partnerId: int("partnerId").notNull(),
  reviewerId: int("reviewerId").notNull(), // userId of reviewer
  /** Project this review is for (optional) */
  projectId: int("projectId"),

  rating: int("rating").notNull(), // 1-5
  /** Review dimensions */
  qualityRating: int("qualityRating"),      // جودة العمل
  timelinessRating: int("timelinessRating"), // الالتزام بالمواعيد
  communicationRating: int("communicationRating"), // التواصل
  valueRating: int("valueRating"),          // القيمة مقابل السعر

  reviewAr: text("reviewAr"),
  reviewEn: text("reviewEn"),
  isVerified: int("isVerified").default(0), // admin verified this review
  isPublic: int("isPublic").default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type PartnerReview = typeof partnerReviews.$inferSelect;
export type InsertPartnerReview = typeof partnerReviews.$inferInsert;


// ═══════════════════════════════════════════════════════════════════════════
// COST TRACKING SYSTEM
// Tracks ALL operational costs: hosting, AI APIs, TTS, storage, Stripe fees
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Cost Categories:
 * - manus_hosting          : Manus platform subscription (main app)
 * - sub_platform_hosting   : External sub-platform hosting (fada, raqaba, etc.)
 * - llm_api                : LLM API calls (OpenAI / Manus Forge / Gemini)
 * - tts_api                : ElevenLabs TTS API
 * - stt_api                : Speech-to-text (Whisper)
 * - storage                : S3 / Manus storage
 * - database               : Database hosting (PlanetScale / TiDB)
 * - stripe_fees            : Stripe transaction fees (2.9% + $0.30)
 * - domain                 : Domain registration / renewal
 * - email_service          : Resend / email provider
 * - other                  : Miscellaneous
 */
export const platformCostLogs = mysqlTable("platform_cost_logs", {
  id: int("id").autoincrement().primaryKey(),
  /** Which platform this cost is attributed to (null = shared/global) */
  platform: mysqlEnum("platform", ["fada", "raqaba", "harara", "maskan", "code", "khayal", "mousa_main", "shared"]).default("shared").notNull(),
  /** Cost category */
  category: mysqlEnum("category", [
    "manus_hosting",
    "sub_platform_hosting",
    "llm_api",
    "tts_api",
    "stt_api",
    "storage",
    "database",
    "stripe_fees",
    "domain",
    "email_service",
    "other"
  ]).notNull(),
  /** Cost in USD cents (e.g. $9.99 = 999) */
  amountCents: int("amountCents").notNull(),
  /** Human-readable description e.g. "Manus Pro March 2026" */
  description: text("description"),
  /** Billing period start (YYYY-MM-DD) */
  periodStart: varchar("periodStart", { length: 10 }).notNull(),
  /** Billing period end (YYYY-MM-DD) */
  periodEnd: varchar("periodEnd", { length: 10 }).notNull(),
  /** Invoice/receipt reference */
  invoiceRef: varchar("invoiceRef", { length: 255 }),
  /** Who logged this entry (admin userId) */
  loggedBy: int("loggedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type PlatformCostLog = typeof platformCostLogs.$inferSelect;
export type InsertPlatformCostLog = typeof platformCostLogs.$inferInsert;

/**
 * Monthly cost budgets per platform/category
 * Admin sets expected monthly budget; system shows actual vs budget
 */
export const platformCostBudgets = mysqlTable("platform_cost_budgets", {
  id: int("id").autoincrement().primaryKey(),
  platform: mysqlEnum("platform", ["fada", "raqaba", "harara", "maskan", "code", "khayal", "mousa_main", "shared"]).notNull(),
  category: mysqlEnum("category", [
    "manus_hosting",
    "sub_platform_hosting",
    "llm_api",
    "tts_api",
    "stt_api",
    "storage",
    "database",
    "stripe_fees",
    "domain",
    "email_service",
    "other"
  ]).notNull(),
  /** Budget in USD cents per month */
  monthlyBudgetCents: int("monthlyBudgetCents").notNull(),
  /** YYYY-MM format e.g. "2026-03" */
  month: varchar("month", { length: 7 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type PlatformCostBudget = typeof platformCostBudgets.$inferSelect;
export type InsertPlatformCostBudget = typeof platformCostBudgets.$inferInsert;

/**
 * Guest trial sessions — tracks free trials for non-registered visitors
 * One trial per fingerprint/IP per platform
 */
export const guestTrials = mysqlTable("guest_trials", {
  id: int("id").autoincrement().primaryKey(),
  /** Browser fingerprint or IP hash to identify unique visitors */
  fingerprint: varchar("fingerprint", { length: 128 }).notNull(),
  platform: mysqlEnum("platform", ["fada", "raqaba", "harara", "maskan", "code", "khayal"]).notNull(),
  /** Whether the trial has been used */
  used: boolean("used").default(false).notNull(),
  /** Partial report content shown in preview (first 30%) */
  previewContent: text("previewContent"),
  /** Full report content (locked behind auth) */
  fullContent: text("fullContent"),
  ipAddress: varchar("ipAddress", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  usedAt: timestamp("usedAt"),
});
export type GuestTrial = typeof guestTrials.$inferSelect;
export type InsertGuestTrial = typeof guestTrials.$inferInsert;

/**
 * User Feedback — تقييمات المستخدمين وآراؤهم حول الخدمة
 * يُجمع بعد كل جلسة أو عند طلب المستخدم
 */
export const userFeedback = mysqlTable("user_feedback", {
  id: int("id").autoincrement().primaryKey(),
  /** المستخدم صاحب التقييم (null للزوار) */
  userId: int("userId"),
  /** المنصة التي قُيِّمت */
  platform: varchar("platform", { length: 64 }).notNull().default("general"),
  /** الجلسة المرتبطة بالتقييم */
  sessionId: int("sessionId"),
  /** التقييم من 1 إلى 5 نجوم */
  rating: int("rating").notNull(),
  /** نوع التقييم: session=بعد جلسة, general=عام, feature=ميزة */
  feedbackType: mysqlEnum("feedbackType", ["session", "general", "feature", "bug"]).default("general").notNull(),
  /** تعليق نصي من المستخدم */
  comment: text("comment"),
  /** هل تم الرد على التقييم من الأدمن */
  isReviewed: boolean("isReviewed").default(false).notNull(),
  /** رد الأدمن */
  adminReply: text("adminReply"),
  /** بيانات إضافية (الصفحة، المتصفح، إلخ) */
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  reviewedAt: timestamp("reviewedAt"),
});
export type UserFeedback = typeof userFeedback.$inferSelect;
export type InsertUserFeedback = typeof userFeedback.$inferInsert;

/**
 * Error Reports — تقارير الأخطاء التقنية من المستخدمين
 * يُسجَّل تلقائياً عند حدوث خطأ أو عند إرسال المستخدم تقريراً يدوياً
 */
export const errorReports = mysqlTable("error_reports", {
  id: int("id").autoincrement().primaryKey(),
  /** المستخدم صاحب التقرير (null للزوار) */
  userId: int("userId"),
  /** المنصة التي حدث فيها الخطأ */
  platform: varchar("platform", { length: 64 }).notNull().default("general"),
  /** نوع الخطأ: ui=واجهة, api=API, voice=صوت, payment=دفع, other=أخرى */
  errorType: mysqlEnum("errorType", ["ui", "api", "voice", "payment", "performance", "other"]).default("other").notNull(),
  /** رسالة الخطأ التقنية */
  errorMessage: text("errorMessage"),
  /** وصف المستخدم للمشكلة */
  userDescription: text("userDescription"),
  /** الصفحة أو المسار الذي حدث فيه الخطأ */
  pageUrl: varchar("pageUrl", { length: 512 }),
  /** Stack trace إن وجد */
  stackTrace: text("stackTrace"),
  /** حالة المعالجة: open=مفتوح, investigating=قيد التحقيق, resolved=محلول, closed=مغلق */
  status: mysqlEnum("status", ["open", "investigating", "resolved", "closed"]).default("open").notNull(),
  /** ملاحظة الأدمن */
  adminNote: text("adminNote"),
  /** بيانات إضافية (المتصفح، الجهاز، إلخ) */
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  resolvedAt: timestamp("resolvedAt"),
});
export type ErrorReport = typeof errorReports.$inferSelect;
export type InsertErrorReport = typeof errorReports.$inferInsert;


// ═══════════════════════════════════════════════════════════════════
// MARKETING: Discount Codes & Referral Program
// ═══════════════════════════════════════════════════════════════════

/**
 * Discount Codes — promo/coupon codes that grant bonus credits on purchase.
 * Admin creates codes; users apply them at checkout.
 */
export const discountCodes = mysqlTable("discount_codes", {
  id: int("id").autoincrement().primaryKey(),
  /** The code string users enter, e.g. "WELCOME50" */
  code: varchar("code", { length: 64 }).notNull().unique(),
  /** Human-readable description */
  description: text("description"),
  /** Discount type: percent = % off price, credits = bonus credits added */
  discountType: mysqlEnum("discountType", ["percent", "credits"]).default("credits").notNull(),
  /** Value: if percent → 10 means 10% off; if credits → 100 means +100 bonus credits */
  discountValue: int("discountValue").notNull(),
  /** Max total uses (null = unlimited) */
  maxUses: int("maxUses"),
  /** How many times it has been used */
  usedCount: int("usedCount").default(0).notNull(),
  /** Max uses per single user (null = unlimited) */
  maxUsesPerUser: int("maxUsesPerUser").default(1),
  /** Minimum purchase amount in cents to apply this code (null = no minimum) */
  minAmountCents: int("minAmountCents"),
  /** Only valid for specific package IDs (null = all packages) */
  applicablePackages: json("applicablePackages"),
  isActive: int("isActive").default(1).notNull(),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DiscountCode = typeof discountCodes.$inferSelect;
export type InsertDiscountCode = typeof discountCodes.$inferInsert;

/**
 * Discount Code Uses — tracks which user used which code on which payment.
 */
export const discountCodeUses = mysqlTable("discount_code_uses", {
  id: int("id").autoincrement().primaryKey(),
  codeId: int("codeId").notNull(),
  userId: int("userId").notNull(),
  paymentId: int("paymentId"),
  /** Actual discount applied in cents (for percent type) or credits added */
  discountApplied: int("discountApplied").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DiscountCodeUse = typeof discountCodeUses.$inferSelect;

/**
 * Referrals — tracks referral relationships between users.
 * When user A refers user B:
 *   - User B signs up via A's referral link (/r/{referralCode})
 *   - User B makes their first purchase → A gets 50 credits, B gets 100 bonus credits
 */
export const referrals = mysqlTable("referrals", {
  id: int("id").autoincrement().primaryKey(),
  /** The user who referred (referrer) */
  referrerId: int("referrerId").notNull(),
  /** The user who was referred (referee) */
  refereeId: int("refereeId").notNull().unique(),
  /** Status: pending = signed up but no purchase yet; rewarded = first purchase made */
  status: mysqlEnum("status", ["pending", "rewarded"]).default("pending").notNull(),
  /** Credits granted to referrer (50) */
  referrerCredits: int("referrerCredits").default(0).notNull(),
  /** Credits granted to referee (100) */
  refereeCredits: int("refereeCredits").default(0).notNull(),
  /** When the reward was triggered */
  rewardedAt: timestamp("rewardedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Referral = typeof referrals.$inferSelect;

/**
 * Referral Codes — each user gets a unique referral code.
 * Stored separately so we can look up by code efficiently.
 */
export const referralCodes = mysqlTable("referral_codes", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  /** Short alphanumeric code, e.g. "MOUSA-A3X9" */
  code: varchar("code", { length: 32 }).notNull().unique(),
  /** Total users referred */
  totalReferrals: int("totalReferrals").default(0).notNull(),
  /** Total credits earned via referrals */
  totalCreditsEarned: int("totalCreditsEarned").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ReferralCode = typeof referralCodes.$inferSelect;

/**
 * Session Credit Refunds — tracks credit refund requests for failed/unusable AI sessions.
 * Users can request a refund within 24 hours if they didn't get a useful report.
 * Admin reviews and approves/rejects; approved refunds restore credits automatically.
 */
export const sessionCreditRefunds = mysqlTable("session_credit_refunds", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  sessionId: int("sessionId").notNull(),
  platform: varchar("platform", { length: 32 }).notNull(),
  creditsToRefund: int("creditsToRefund").notNull(),
  reason: text("reason"),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  adminNote: text("adminNote"),
  reviewedBy: int("reviewedBy"),
  reviewedAt: timestamp("reviewedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type SessionCreditRefund = typeof sessionCreditRefunds.$inferSelect;
export type InsertSessionCreditRefund = typeof sessionCreditRefunds.$inferInsert;


/**
 * Platform Pricing Rules — stores dynamic credit calculation formulas per platform.
 * Each platform sends usage_factors (e.g. message_count, image_count, report_type)
 * and mousa.ai calculates the exact cost using: base_cost + sum(factor * weight)
 * clamped to [min_cost, max_cost].
 */
export const platformPricingRules = mysqlTable("platform_pricing_rules", {
  id: int("id").autoincrement().primaryKey(),
  platform: varchar("platform", { length: 32 }).notNull().unique(),
  baseCost: int("baseCost").default(5).notNull(),
  minCost: int("minCost").default(5).notNull(),
  maxCost: int("maxCost").default(100).notNull(),
  factorWeights: json("factorWeights").notNull().$type<Record<string, number>>(),
  description: text("description"),
  isActive: boolean("isActive").default(true).notNull(),
  updatedBy: int("updatedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type PlatformPricingRule = typeof platformPricingRules.$inferSelect;
export type InsertPlatformPricingRule = typeof platformPricingRules.$inferInsert;


// ═══════════════════════════════════════════════════════════════════
// LONG-TERM MEMORY SYSTEM — نظام الذاكرة الطويلة الأمد
// ═══════════════════════════════════════════════════════════════════

/**
 * User Memory — ذاكرة دائمة لكل مستخدم
 * يحتفظ بكل ما يعرفه النظام عن المستخدم: مشاريعه، تفضيلاته، خبراته، أهدافه
 * تُحدَّث تلقائياً بعد كل جلسة
 */
export const userMemory = mysqlTable("user_memory", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  /** ملخص شامل عن المستخدم يُولَّد بالذكاء الاصطناعي */
  summary: text("summary"),
  /** المهنة والتخصص */
  profession: varchar("profession", { length: 255 }),
  /** الموقع الجغرافي */
  location: varchar("location", { length: 255 }),
  /** مستوى الخبرة: beginner/intermediate/expert */
  expertiseLevel: mysqlEnum("expertiseLevel", ["beginner", "intermediate", "expert"]).default("beginner"),
  /** المنصات الأكثر استخداماً */
  preferredPlatforms: json("preferredPlatforms").$type<string[]>(),
  /** أنواع المشاريع المعتادة */
  projectTypes: json("projectTypes").$type<string[]>(),
  /** الأهداف والاهتمامات */
  interests: json("interests").$type<string[]>(),
  /** بيانات مخصصة إضافية (مرنة) */
  customData: json("customData").$type<Record<string, unknown>>(),
  /** عدد الجلسات الكلي */
  totalSessions: int("totalSessions").default(0).notNull(),
  /** عدد التقارير المُنتَجة */
  totalReports: int("totalReports").default(0).notNull(),
  /** آخر نشاط */
  lastActiveAt: timestamp("lastActiveAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type UserMemory = typeof userMemory.$inferSelect;
export type InsertUserMemory = typeof userMemory.$inferInsert;

/**
 * User Reports — كل تقرير أُنتج للمستخدم محفوظ للأبد
 * يشمل: محتوى التقرير الكامل، المنصة، التكلفة، التقييم
 */
export const userReports = mysqlTable("user_reports", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  sessionId: int("sessionId"),
  platform: varchar("platform", { length: 32 }).notNull(),
  /** عنوان التقرير */
  title: varchar("title", { length: 512 }).notNull(),
  /** محتوى التقرير الكامل (Markdown) */
  content: text("content").notNull(),
  /** ملخص قصير للتقرير */
  summary: text("summary"),
  /** نوع التقرير: analysis/recommendation/inspection/calculation/search */
  reportType: mysqlEnum("reportType", ["analysis", "recommendation", "inspection", "calculation", "search", "design", "other"]).default("other").notNull(),
  /** الكريدت المستهلكة */
  creditsUsed: int("creditsUsed").default(0).notNull(),
  /** تقييم المستخدم للتقرير (1-5) */
  userRating: int("userRating"),
  /** هل تم تصديره كـ PDF */
  exportedPdf: boolean("exportedPdf").default(false).notNull(),
  /** بيانات المدخلات التي أنتجت التقرير */
  inputData: json("inputData").$type<Record<string, unknown>>(),
  /** وسوم للبحث والتصنيف */
  tags: json("tags").$type<string[]>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type UserReport = typeof userReports.$inferSelect;
export type InsertUserReport = typeof userReports.$inferInsert;

/**
 * Conversation Threads — خيوط المحادثات مع ملخصات ذكية
 * كل محادثة مستمرة (multi-turn) تُحفظ كـ thread مع ملخص يُولَّد تلقائياً
 */
export const conversationThreads = mysqlTable("conversation_threads", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  platform: varchar("platform", { length: 32 }).notNull(),
  /** عنوان الخيط (يُولَّد تلقائياً من أول رسالة) */
  title: varchar("title", { length: 512 }),
  /** ملخص ذكي للمحادثة كاملة */
  summary: text("summary"),
  /** حالة الخيط */
  status: mysqlEnum("status", ["active", "archived", "completed"]).default("active").notNull(),
  /** عدد الرسائل */
  messageCount: int("messageCount").default(0).notNull(),
  /** الكريدت الكلي المستهلك في هذا الخيط */
  totalCreditsUsed: int("totalCreditsUsed").default(0).notNull(),
  /** آخر رسالة */
  lastMessageAt: timestamp("lastMessageAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ConversationThread = typeof conversationThreads.$inferSelect;
export type InsertConversationThread = typeof conversationThreads.$inferInsert;

/**
 * Thread Messages — رسائل كل خيط محادثة
 * يحتفظ بكل رسالة بشكل دائم مع metadata
 */
export const threadMessages = mysqlTable("thread_messages", {
  id: int("id").autoincrement().primaryKey(),
  threadId: int("threadId").notNull(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["user", "assistant", "system"]).notNull(),
  content: text("content").notNull(),
  /** الكريدت المستهلكة لهذه الرسالة */
  creditsUsed: int("creditsUsed").default(0).notNull(),
  /** هل تم تقييم هذه الرسالة */
  isHelpful: boolean("isHelpful"),
  /** بيانات إضافية (model used, tokens, etc.) */
  metadata: json("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ThreadMessage = typeof threadMessages.$inferSelect;
export type InsertThreadMessage = typeof threadMessages.$inferInsert;

/**
 * Platform Knowledge Base — قاعدة معرفة لكل منصة فرعية
 * تُبنى تلقائياً من الأسئلة الشائعة والإجابات الناجحة
 * يستخدمها الذكاء الاصطناعي كمرجع أول قبل استدعاء LLM
 */
export const platformKnowledge = mysqlTable("platform_knowledge", {
  id: int("id").autoincrement().primaryKey(),
  platform: varchar("platform", { length: 32 }).notNull(),
  /** نوع المعرفة */
  knowledgeType: mysqlEnum("knowledgeType", ["faq", "case_study", "template", "rule", "definition", "procedure"]).default("faq").notNull(),
  /** السؤال أو العنوان */
  question: text("question").notNull(),
  /** الإجابة أو المحتوى */
  answer: text("answer").notNull(),
  /** الكلمات المفتاحية للبحث */
  keywords: json("keywords").$type<string[]>(),
  /** مصدر المعرفة: ai_generated/expert_verified/official_doc */
  source: mysqlEnum("source", ["ai_generated", "expert_verified", "official_doc", "user_feedback"]).default("ai_generated").notNull(),
  /** عدد مرات الاستخدام */
  useCount: int("useCount").default(0).notNull(),
  /** تقييم الجودة (0-100) */
  qualityScore: int("qualityScore").default(50).notNull(),
  /** هل موثَّق من خبير */
  isVerified: boolean("isVerified").default(false).notNull(),
  /** هل نشط للاستخدام */
  isActive: boolean("isActive").default(true).notNull(),
  /** اللغة */
  language: varchar("language", { length: 8 }).default("ar").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type PlatformKnowledge = typeof platformKnowledge.$inferSelect;
export type InsertPlatformKnowledge = typeof platformKnowledge.$inferInsert;

/**
 * User Preferences — تفضيلات كل مستخدم
 * تُحفظ تلقائياً وتُستخدم لتخصيص تجربة الذكاء الاصطناعي
 */
export const userPreferences = mysqlTable("user_preferences", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  /** اللغة المفضلة */
  language: varchar("language", { length: 8 }).default("ar").notNull(),
  /** أسلوب الرد: detailed/concise/technical/simple */
  responseStyle: mysqlEnum("responseStyle", ["detailed", "concise", "technical", "simple"]).default("detailed"),
  /** تفضيل الوحدات: metric/imperial */
  units: mysqlEnum("units", ["metric", "imperial"]).default("metric"),
  /** المنطقة الزمنية */
  timezone: varchar("timezone", { length: 64 }).default("Asia/Dubai"),
  /** هل يريد تلقي إشعارات البريد */
  emailNotifications: boolean("emailNotifications").default(true).notNull(),
  /** هل يريد تلقي ملخص أسبوعي */
  weeklyDigest: boolean("weeklyDigest").default(false).notNull(),
  /** تفضيلات مخصصة إضافية */
  customSettings: json("customSettings").$type<Record<string, unknown>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type UserPreferences = typeof userPreferences.$inferSelect;
export type InsertUserPreferences = typeof userPreferences.$inferInsert;

/**
 * AI Learning Data — بيانات التعلم من التفاعلات
 * يُسجَّل ما نجح وما لم ينجح لتحسين الردود مستقبلاً
 */
export const aiLearningData = mysqlTable("ai_learning_data", {
  id: int("id").autoincrement().primaryKey(),
  platform: varchar("platform", { length: 32 }).notNull(),
  /** نوع التفاعل */
  interactionType: mysqlEnum("interactionType", ["query", "report", "calculation", "search", "recommendation"]).default("query").notNull(),
  /** المدخل الأصلي (مجهول الهوية) */
  inputSummary: text("inputSummary"),
  /** جودة الرد: good/bad/neutral */
  quality: mysqlEnum("quality", ["good", "bad", "neutral"]).default("neutral").notNull(),
  /** سبب التقييم */
  qualityReason: text("qualityReason"),
  /** الوقت المستغرق بالميلي ثانية */
  responseTimeMs: int("responseTimeMs"),
  /** عدد الرموز المستخدمة */
  tokensUsed: int("tokensUsed"),
  /** هل استُخدمت قاعدة المعرفة المحلية */
  usedLocalKnowledge: boolean("usedLocalKnowledge").default(false).notNull(),
  /** هل استُخدم LLM */
  usedLLM: boolean("usedLLM").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type AiLearningData = typeof aiLearningData.$inferSelect;
export type InsertAiLearningData = typeof aiLearningData.$inferInsert;

/**
 * Sub-Platform Sync Log — سجل مزامنة المنصات الفرعية
 * يتتبع كل عملية تواصل بين المنصات الفرعية وموسى
 */
export const subPlatformSyncLog = mysqlTable("sub_platform_sync_log", {
  id: int("id").autoincrement().primaryKey(),
  platform: varchar("platform", { length: 32 }).notNull(),
  /** نوع العملية */
  operation: mysqlEnum("operation", ["verify_token", "check_balance", "deduct_credits", "pricing_update", "report_session"]).notNull(),
  userId: int("userId"),
  /** هل نجحت العملية */
  success: boolean("success").notNull(),
  /** الكريدت المخصومة (إن وجدت) */
  creditsDeducted: int("creditsDeducted"),
  /** رسالة الخطأ (إن وجدت) */
  errorMessage: text("errorMessage"),
  /** زمن الاستجابة بالميلي ثانية */
  responseTimeMs: int("responseTimeMs"),
  /** بيانات إضافية */
  metadata: json("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type SubPlatformSyncLog = typeof subPlatformSyncLog.$inferSelect;
export type InsertSubPlatformSyncLog = typeof subPlatformSyncLog.$inferInsert;

// ─── PROACTIVE MONITORING SYSTEM ────────────────────────────────────────────

/** فحوصات صحة المنصات — سجل كل فحص دوري */
export const systemHealthChecks = mysqlTable("system_health_checks", {
  id: int("id").autoincrement().primaryKey(),
  target: varchar("target", { length: 64 }).notNull(),
  checkType: mysqlEnum("checkType", [
    "platform_reachability",
    "token_generation",
    "token_verification",
    "credit_deduction",
    "database_connectivity",
    "llm_availability",
    "payment_gateway",
    "email_service",
  ]).notNull(),
  status: mysqlEnum("status", ["healthy", "degraded", "failed", "unknown"]).notNull(),
  responseTimeMs: int("responseTimeMs"),
  httpStatus: int("httpStatus"),
  errorMessage: text("errorMessage"),
  details: json("details").$type<Record<string, unknown>>(),
  autoFixed: boolean("autoFixed").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type SystemHealthCheck = typeof systemHealthChecks.$inferSelect;
export type InsertSystemHealthCheck = typeof systemHealthChecks.$inferInsert;

/** الحوادث — كل خلل مكتشف يُسجَّل هنا */
export const systemIncidents = mysqlTable("system_incidents", {
  id: int("id").autoincrement().primaryKey(),
  target: varchar("target", { length: 64 }).notNull(),
  incidentType: mysqlEnum("incidentType", [
    "platform_down",
    "token_auth_failure",
    "credit_sync_failure",
    "high_error_rate",
    "slow_response",
    "payment_failure",
    "llm_unavailable",
    "database_error",
    "config_drift",
    "security_anomaly",
  ]).notNull(),
  severity: mysqlEnum("severity", ["low", "medium", "high", "critical"]).notNull(),
  status: mysqlEnum("status", [
    "detected",
    "auto_fixing",
    "auto_fixed",
    "escalated",
    "owner_notified",
    "resolved",
    "ignored",
  ]).notNull().default("detected"),
  description: text("description").notNull(),
  canAutoFix: boolean("canAutoFix").default(false),
  autoFixAttempts: int("autoFixAttempts").default(0),
  detectedAt: timestamp("detectedAt").defaultNow().notNull(),
  resolvedAt: timestamp("resolvedAt"),
  metadata: json("metadata").$type<Record<string, unknown>>(),
  ownerDecision: text("ownerDecision"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type SystemIncident = typeof systemIncidents.$inferSelect;
export type InsertSystemIncident = typeof systemIncidents.$inferInsert;

/** سجل الإصلاحات التلقائية */
export const systemAutoFixes = mysqlTable("system_auto_fixes", {
  id: int("id").autoincrement().primaryKey(),
  incidentId: int("incidentId").notNull(),
  fixType: mysqlEnum("fixType", [
    "retry_request",
    "refresh_token",
    "fallback_direct_url",
    "clear_cache",
    "restart_service",
    "update_config",
    "notify_platform",
    "requeue_failed_jobs",
  ]).notNull(),
  success: boolean("success").notNull(),
  actionTaken: text("actionTaken").notNull(),
  durationMs: int("durationMs"),
  metadata: json("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type SystemAutoFix = typeof systemAutoFixes.$inferSelect;
export type InsertSystemAutoFix = typeof systemAutoFixes.$inferInsert;

/** ذاكرة الجلسات — آخر جلسة لكل مستخدم في كل منصة */
export const sessionMemory = mysqlTable("session_memory", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  platform: varchar("platform", { length: 32 }).notNull(),
  lastSessionSummary: text("lastSessionSummary"),
  lastQuery: text("lastQuery"),
  lastResponse: text("lastResponse"),
  lastProjectContext: json("lastProjectContext").$type<Record<string, unknown>>(),
  totalSessions: int("totalSessions").default(0),
  totalCreditsUsed: int("totalCreditsUsed").default(0),
  extractedPreferences: json("extractedPreferences").$type<Record<string, unknown>>(),
  lastSessionAt: timestamp("lastSessionAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type SessionMemory = typeof sessionMemory.$inferSelect;
export type InsertSessionMemory = typeof sessionMemory.$inferInsert;

/** سجل التنبيهات المُرسَلة للمالك */
export const ownerAlerts = mysqlTable("owner_alerts", {
  id: int("id").autoincrement().primaryKey(),
  incidentId: int("incidentId"),
  alertType: mysqlEnum("alertType", [
    "immediate",
    "summary",
    "decision",
    "info",
  ]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  sent: boolean("sent").default(false),
  sentAt: timestamp("sentAt"),
  ownerResponse: text("ownerResponse"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type OwnerAlert = typeof ownerAlerts.$inferSelect;
export type InsertOwnerAlert = typeof ownerAlerts.$inferInsert;
