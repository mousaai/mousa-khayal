import { eq, desc, sql, and, gte, lte, avg, count } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  creditWallets,
  creditTransactions,
  aiSessions,
  aiMessages,
  subscriptions,
  oauthTransferTokens,
  type CreditWallet,
  type CreditTransaction,
  type AiSession,
  type AiMessage,
  type Subscription,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try { _db = drizzle(process.env.DATABASE_URL); }
    catch (error) { console.warn("[Database] Failed to connect:", error); _db = null; }
  }
  return _db;
}

// ─── USER ────────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field]; if (value === undefined) return;
      const normalized = value ?? null; values[field] = normalized; updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) { console.error("[Database] Failed to upsert user:", error); throw error; }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateUserFields(userId: number, fields: Partial<{
  passwordHash: string | null;
  emailVerified: number;
  verifyToken: string | null;
  verifyTokenExpiresAt: Date | null;
  name: string | null;
  lastSignedIn: Date;
  stripeCustomerId: string | null;
}>) {
  const db = await getDb(); if (!db) return;
  await db.update(users).set(fields as any).where(eq(users.id, userId));
}

export async function getAllUsers() {
  const db = await getDb(); if (!db) return [];
  return db.select().from(users).orderBy(desc(users.createdAt));
}

// ─── CREDIT WALLET ───────────────────────────────────────────────────────────

const WELCOME_BONUS = 200;

export async function getOrCreateWallet(userId: number): Promise<CreditWallet> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select().from(creditWallets).where(eq(creditWallets.userId, userId)).limit(1);
  if (existing.length > 0) return existing[0];
  await db.insert(creditWallets).values({ userId, balance: WELCOME_BONUS, totalEarned: WELCOME_BONUS, totalSpent: 0 });
  await db.insert(creditTransactions).values({ userId, amount: WELCOME_BONUS, type: "welcome_bonus", description: "مكافأة الترحيب — 200 كريدت مجاني عند التسجيل", balanceAfter: WELCOME_BONUS });
  const created = await db.select().from(creditWallets).where(eq(creditWallets.userId, userId)).limit(1);
  return created[0];
}

export async function getWalletBalance(userId: number): Promise<number> {
  const db = await getDb(); if (!db) return 0;
  const wallet = await getOrCreateWallet(userId);
  return wallet.balance;
}

export async function deductCredits(userId: number, amount: number, platform: string, description: string): Promise<{ success: boolean; newBalance: number; error?: string }> {
  const db = await getDb();
  if (!db) return { success: false, newBalance: 0, error: "Database not available" };
  try {
    let result: { success: boolean; newBalance: number; error?: string } = { success: false, newBalance: 0 };
    await db.transaction(async (tx) => {
      // Lock the row with a SELECT FOR UPDATE equivalent using atomic update
      const rows = await tx.select().from(creditWallets).where(eq(creditWallets.userId, userId));
      if (!rows.length) throw new Error("المحفظة غير موجودة");
      const wallet = rows[0];
      if (wallet.balance < amount) {
        result = { success: false, newBalance: wallet.balance, error: "رصيد الكريدت غير كافٍ" };
        return;
      }
      const newBalance = wallet.balance - amount;
      await tx.update(creditWallets)
        .set({ balance: newBalance, totalSpent: wallet.totalSpent + amount })
        .where(eq(creditWallets.userId, userId));
      await tx.insert(creditTransactions).values({
        userId, amount: -amount, type: "usage", platform, description, balanceAfter: newBalance
      });
      result = { success: true, newBalance };
    });
    return result;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "خطأ غير متوقع";
    return { success: false, newBalance: 0, error: msg };
  }
}

export async function grantCredits(userId: number, amount: number, type: "admin_grant" | "purchase" | "refund", description: string): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  let newBalance = 0;
  await db.transaction(async (tx) => {
    const rows = await tx.select().from(creditWallets).where(eq(creditWallets.userId, userId));
    if (!rows.length) throw new Error("المحفظة غير موجودة");
    const wallet = rows[0];
    newBalance = wallet.balance + amount;
    await tx.update(creditWallets)
      .set({ balance: newBalance, totalEarned: wallet.totalEarned + amount })
      .where(eq(creditWallets.userId, userId));
    await tx.insert(creditTransactions).values({ userId, amount, type, description, balanceAfter: newBalance });
  });
  return newBalance;
}

export async function getCreditHistory(userId: number, limit = 20): Promise<CreditTransaction[]> {
  const db = await getDb(); if (!db) return [];
  return db.select().from(creditTransactions).where(eq(creditTransactions.userId, userId)).orderBy(desc(creditTransactions.createdAt)).limit(limit);
}

// ─── AI SESSIONS ─────────────────────────────────────────────────────────────

export async function createSession(userId: number, platform: AiSession["platform"], title: string): Promise<AiSession> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(aiSessions).values({ userId, platform, title, status: "active", creditsUsed: 0 });
  const result = await db.select().from(aiSessions).where(eq(aiSessions.userId, userId)).orderBy(desc(aiSessions.createdAt)).limit(1);
  return result[0];
}

export async function getUserSessions(userId: number, limit = 20): Promise<AiSession[]> {
  const db = await getDb(); if (!db) return [];
  return db.select().from(aiSessions).where(eq(aiSessions.userId, userId)).orderBy(desc(aiSessions.createdAt)).limit(limit);
}

export async function getSessionMessages(sessionId: number): Promise<AiMessage[]> {
  const db = await getDb(); if (!db) return [];
  return db.select().from(aiMessages).where(eq(aiMessages.sessionId, sessionId)).orderBy(aiMessages.createdAt);
}

export async function addMessage(sessionId: number, userId: number, role: AiMessage["role"], content: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(aiMessages).values({ sessionId, userId, role, content });
}

export async function completeSession(sessionId: number, creditsUsed: number): Promise<void> {
  const db = await getDb(); if (!db) return;
  await db.update(aiSessions).set({ status: "completed", creditsUsed }).where(eq(aiSessions.id, sessionId));
}

// ─── ADMIN ───────────────────────────────────────────────────────────────────

export async function getAdminStats() {
  const db = await getDb(); if (!db) return null;
  const [totalUsers] = await db.select({ count: sql<number>`count(*)` }).from(users);
  const [totalSessions] = await db.select({ count: sql<number>`count(*)` }).from(aiSessions);
  const [totalCreditsSpent] = await db.select({ sum: sql<number>`sum(totalSpent)` }).from(creditWallets);
  return {
    totalUsers: Number(totalUsers?.count ?? 0),
    totalSessions: Number(totalSessions?.count ?? 0),
    totalCreditsSpent: Number(totalCreditsSpent?.sum ?? 0),
  };
}

export async function getUsersWithWallets() {
  const db = await getDb(); if (!db) return [];
  const allUsers = await db.select().from(users).orderBy(desc(users.createdAt));
  const wallets = await db.select().from(creditWallets);
  const walletMap = new Map(wallets.map((w) => [w.userId, w]));
  return allUsers.map((u) => ({ ...u, wallet: walletMap.get(u.id) ?? null }));
}

// ─── STRIPE / PAYMENTS ───────────────────────────────────────────────────────

import { payments, type Payment } from "../drizzle/schema";

export async function saveStripeCustomerId(userId: number, stripeCustomerId: string): Promise<void> {
  const db = await getDb(); if (!db) return;
  await db.update(users).set({ stripeCustomerId }).where(eq(users.id, userId));
}

export async function createPaymentRecord(data: {
  userId: number;
  packageId: string;
  creditsGranted: number;
  amountCents: number;
  currency: string;
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
}): Promise<void> {
  const db = await getDb(); if (!db) return;
  await db.insert(payments).values({
    userId: data.userId,
    packageId: data.packageId,
    creditsGranted: data.creditsGranted,
    amountCents: data.amountCents,
    currency: data.currency,
    stripeSessionId: data.stripeSessionId ?? null,
    stripePaymentIntentId: data.stripePaymentIntentId ?? null,
    status: "pending",
  });
}

export async function completePayment(stripeSessionId: string, stripePaymentIntentId: string): Promise<{ userId: number; creditsGranted: number } | null> {
  const db = await getDb(); if (!db) return null;
  const existing = await db.select().from(payments).where(eq(payments.stripeSessionId, stripeSessionId)).limit(1);
  if (!existing.length) return null;
  const payment = existing[0];
  if (payment.status === "completed") return null; // already processed
  await db.update(payments)
    .set({ status: "completed", stripePaymentIntentId })
    .where(eq(payments.stripeSessionId, stripeSessionId));
  return { userId: payment.userId, creditsGranted: payment.creditsGranted };
}

export async function getUserPayments(userId: number, limit = 20): Promise<Payment[]> {
  const db = await getDb(); if (!db) return [];
  return db.select().from(payments).where(eq(payments.userId, userId)).orderBy(desc(payments.createdAt)).limit(limit);
}

export async function getAllPayments(limit = 50): Promise<Payment[]> {
  const db = await getDb(); if (!db) return [];
  return db.select().from(payments).orderBy(desc(payments.createdAt)).limit(limit);
}

// ─── PROJECT PROFILES (cross-session memory) ─────────────────────────────────

import { userProjectProfiles, type UserProjectProfile } from "../drizzle/schema";

export async function getProjectProfile(userId: number, platform: UserProjectProfile["platform"]): Promise<UserProjectProfile | null> {
  const db = await getDb(); if (!db) return null;
  const result = await db.select().from(userProjectProfiles)
    .where(eq(userProjectProfiles.userId, userId))
    .limit(50);
  const found = result.find(r => r.platform === platform);
  return found ?? null;
}

export async function upsertProjectProfile(
  userId: number,
  platform: UserProjectProfile["platform"],
  data: { projectName?: string; location?: string; projectType?: string; notes?: string }
): Promise<UserProjectProfile> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await getProjectProfile(userId, platform);
  if (existing) {
    await db.update(userProjectProfiles)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(userProjectProfiles.id, existing.id));
    const updated = await db.select().from(userProjectProfiles).where(eq(userProjectProfiles.id, existing.id)).limit(1);
    return updated[0];
  } else {
    await db.insert(userProjectProfiles).values({ userId, platform, ...data });
    const created = await db.select().from(userProjectProfiles)
      .where(eq(userProjectProfiles.userId, userId))
      .orderBy(desc(userProjectProfiles.createdAt))
      .limit(1);
    return created[0];
  }
}

// ─── SUBSCRIPTIONS ───────────────────────────────────────────────────────────

export async function upsertSubscription(data: {
  userId: number;
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  stripePriceId: string;
  planId: string;
  planNameAr: string;
  creditsPerMonth: number;
  amountCents: number;
  currency: string;
  status: Subscription["status"];
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd?: boolean;
}): Promise<void> {
  const db = await getDb(); if (!db) return;
  const existing = await db.select().from(subscriptions).where(eq(subscriptions.userId, data.userId)).limit(1);
  const values = {
    stripeSubscriptionId: data.stripeSubscriptionId,
    stripeCustomerId: data.stripeCustomerId,
    stripePriceId: data.stripePriceId,
    planId: data.planId,
    planNameAr: data.planNameAr,
    creditsPerMonth: data.creditsPerMonth,
    amountCents: data.amountCents,
    currency: data.currency,
    status: data.status,
    currentPeriodStart: data.currentPeriodStart,
    currentPeriodEnd: data.currentPeriodEnd,
    cancelAtPeriodEnd: data.cancelAtPeriodEnd ? 1 : 0,
  };
  if (existing.length > 0) {
    await db.update(subscriptions).set(values).where(eq(subscriptions.userId, data.userId));
  } else {
    await db.insert(subscriptions).values({ userId: data.userId, ...values });
  }
}

export async function getUserSubscription(userId: number): Promise<Subscription | null> {
  const db = await getDb(); if (!db) return null;
  const result = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function updateSubscriptionStatus(
  stripeSubscriptionId: string,
  status: Subscription["status"],
  extra?: { cancelAtPeriodEnd?: boolean; currentPeriodEnd?: Date }
): Promise<void> {
  const db = await getDb(); if (!db) return;
  const updateData: Record<string, unknown> = { status };
  if (extra?.cancelAtPeriodEnd !== undefined) updateData.cancelAtPeriodEnd = extra.cancelAtPeriodEnd ? 1 : 0;
  if (extra?.currentPeriodEnd) updateData.currentPeriodEnd = extra.currentPeriodEnd;
  await db.update(subscriptions).set(updateData).where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId));
}

export async function getSubscriptionByStripeId(stripeSubscriptionId: string): Promise<Subscription | null> {
  const db = await getDb(); if (!db) return null;
  const result = await db.select().from(subscriptions).where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId)).limit(1);
  return result.length > 0 ? result[0] : null;
}

// ─── SESSION SUMMARY ─────────────────────────────────────────────────────────

export async function saveSessionSummary(sessionId: number, summary: string): Promise<void> {
  const db = await getDb(); if (!db) return;
  await db.update(aiSessions).set({ summary }).where(eq(aiSessions.id, sessionId));
}

export async function getRecentSessionSummaries(userId: number, platform: AiSession["platform"], limit = 3): Promise<string[]> {
  const db = await getDb(); if (!db) return [];
  const sessions = await db.select({ summary: aiSessions.summary })
    .from(aiSessions)
    .where(eq(aiSessions.userId, userId))
    .orderBy(desc(aiSessions.createdAt))
    .limit(20);
  return sessions
    .filter(s => s.summary && s.summary.trim().length > 0)
    .map(s => s.summary as string)
    .slice(0, limit);
}

// ─── REFUND REQUESTS ─────────────────────────────────────────────────────────

import { refundRequests, type RefundRequest, type InsertRefundRequest } from "../drizzle/schema";

export async function createRefundRequest(data: {
  userId: number;
  paymentId?: number;
  stripePaymentIntentId?: string;
  amountCents: number;
  creditsToDeduct: number;
  reason: string;
}): Promise<RefundRequest> {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  const [result] = await db.insert(refundRequests).values({
    userId: data.userId,
    paymentId: data.paymentId ?? null,
    stripePaymentIntentId: data.stripePaymentIntentId ?? null,
    amountCents: data.amountCents,
    creditsToDeduct: data.creditsToDeduct,
    reason: data.reason,
    status: "pending",
  });
  const inserted = await db.select().from(refundRequests).where(eq(refundRequests.id, (result as any).insertId)).limit(1);
  return inserted[0];
}

export async function getUserRefundRequests(userId: number): Promise<RefundRequest[]> {
  const db = await getDb(); if (!db) return [];
  return db.select().from(refundRequests)
    .where(eq(refundRequests.userId, userId))
    .orderBy(desc(refundRequests.createdAt));
}

export async function getAllRefundRequests(): Promise<(RefundRequest & { userName: string | null; userEmail: string | null })[]> {
  const db = await getDb(); if (!db) return [];
  const rows = await db.select({
    id: refundRequests.id,
    userId: refundRequests.userId,
    paymentId: refundRequests.paymentId,
    stripePaymentIntentId: refundRequests.stripePaymentIntentId,
    stripeRefundId: refundRequests.stripeRefundId,
    amountCents: refundRequests.amountCents,
    currency: refundRequests.currency,
    creditsToDeduct: refundRequests.creditsToDeduct,
    reason: refundRequests.reason,
    status: refundRequests.status,
    adminNote: refundRequests.adminNote,
    reviewedBy: refundRequests.reviewedBy,
    reviewedAt: refundRequests.reviewedAt,
    createdAt: refundRequests.createdAt,
    updatedAt: refundRequests.updatedAt,
    userName: users.name,
    userEmail: users.email,
  })
    .from(refundRequests)
    .leftJoin(users, eq(refundRequests.userId, users.id))
    .orderBy(desc(refundRequests.createdAt));
  return rows as any;
}

export async function updateRefundRequest(id: number, data: {
  status: RefundRequest["status"];
  adminNote?: string;
  reviewedBy?: number;
  stripeRefundId?: string;
}): Promise<void> {
  const db = await getDb(); if (!db) return;
  await db.update(refundRequests).set({
    status: data.status,
    adminNote: data.adminNote ?? null,
    reviewedBy: data.reviewedBy ?? null,
    reviewedAt: new Date(),
    stripeRefundId: data.stripeRefundId ?? null,
  }).where(eq(refundRequests.id, id));
}

export async function getRefundRequestById(id: number): Promise<RefundRequest | null> {
  const db = await getDb(); if (!db) return null;
  const result = await db.select().from(refundRequests).where(eq(refundRequests.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

// ─── ADMIN ANALYTICS ─────────────────────────────────────────────────────────

/**
 * Get daily user registrations for the last N days.
 */
export async function getDailyRegistrations(days = 30): Promise<{ date: string; count: number }[]> {
  const db = await getDb(); if (!db) return [];
  const rows = await db.execute(sql`
    SELECT DATE(createdAt) as date, COUNT(*) as count
    FROM users
    WHERE createdAt >= DATE_SUB(NOW(), INTERVAL ${days} DAY)
    GROUP BY DATE(createdAt)
    ORDER BY date ASC
  `);
  const result = (rows as any)[0] as { date: string; count: string | number }[];
  return result.map((r) => ({ date: String(r.date).substring(0, 10), count: Number(r.count) }));
}

/**
 * Get platform usage breakdown (sessions per platform).
 */
export async function getPlatformUsageStats(): Promise<{ platform: string; sessions: number; creditsUsed: number }[]> {
  const db = await getDb(); if (!db) return [];
  const rows = await db.execute(sql`
    SELECT platform, COUNT(*) as sessions, SUM(creditsUsed) as creditsUsed
    FROM ai_sessions
    GROUP BY platform
    ORDER BY sessions DESC
  `);
  const result = (rows as any)[0] as { platform: string; sessions: string | number; creditsUsed: string | number }[];
  return result.map((r) => ({
    platform: String(r.platform),
    sessions: Number(r.sessions),
    creditsUsed: Number(r.creditsUsed ?? 0),
  }));
}

/**
 * Get daily revenue (completed payments) for the last N days.
 */
export async function getDailyRevenue(days = 30): Promise<{ date: string; amountUsd: number; count: number }[]> {
  const db = await getDb(); if (!db) return [];
  const rows = await db.execute(sql`
    SELECT DATE(createdAt) as date, SUM(amountCents) as totalCents, COUNT(*) as count
    FROM payments
    WHERE status = 'completed' AND createdAt >= DATE_SUB(NOW(), INTERVAL ${days} DAY)
    GROUP BY DATE(createdAt)
    ORDER BY date ASC
  `);
  const result = (rows as any)[0] as { date: string; totalCents: string | number; count: string | number }[];
  return result.map((r) => ({
    date: String(r.date).substring(0, 10),
    amountUsd: Number(r.totalCents ?? 0) / 100,
    count: Number(r.count),
  }));
}

/**
 * Get total revenue summary.
 */
export async function getRevenueSummary(): Promise<{
  totalRevenue: number;
  totalPayments: number;
  avgOrderValue: number;
  activeSubscriptions: number;
  monthlyRevenue: number;
}> {
  const db = await getDb();
  if (!db) return { totalRevenue: 0, totalPayments: 0, avgOrderValue: 0, activeSubscriptions: 0, monthlyRevenue: 0 };
  const totalResult = await db.execute(sql`SELECT SUM(amountCents) as total, COUNT(*) as count FROM payments WHERE status = 'completed'`);
  const monthlyResult = await db.execute(sql`SELECT SUM(amountCents) as total FROM payments WHERE status = 'completed' AND createdAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)`);
  const subsResult = await db.execute(sql`SELECT COUNT(*) as count FROM subscriptions WHERE status = 'active'`);
  const totalRow = ((totalResult as any)[0] as { total: string | number; count: string | number }[])[0];
  const monthlyRow = ((monthlyResult as any)[0] as { total: string | number }[])[0];
  const subsRow = ((subsResult as any)[0] as { count: string | number }[])[0];
  const totalCents = Number(totalRow?.total ?? 0);
  const totalCount = Number(totalRow?.count ?? 0);
  return {
    totalRevenue: totalCents / 100,
    totalPayments: totalCount,
    avgOrderValue: totalCount > 0 ? totalCents / totalCount / 100 : 0,
    activeSubscriptions: Number(subsRow?.count ?? 0),
    monthlyRevenue: Number(monthlyRow?.total ?? 0) / 100,
  };
}

/**
 * Get enhanced admin stats including new metrics.
 */
export async function getEnhancedAdminStats(): Promise<{
  totalUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  totalSessions: number;
  sessionsToday: number;
  totalCreditsSpent: number;
  totalCreditsGranted: number;
  pendingRefunds: number;
}> {
  const db = await getDb();
  if (!db) return { totalUsers: 0, newUsersToday: 0, newUsersThisWeek: 0, totalSessions: 0, sessionsToday: 0, totalCreditsSpent: 0, totalCreditsGranted: 0, pendingRefunds: 0 };
  const [totalUsers] = await db.select({ count: sql<number>`count(*)` }).from(users);
  const [totalSessions] = await db.select({ count: sql<number>`count(*)` }).from(aiSessions);
  const [creditsSpent] = await db.select({ sum: sql<number>`sum(totalSpent)` }).from(creditWallets);
  const [creditsGranted] = await db.select({ sum: sql<number>`sum(totalEarned)` }).from(creditWallets);
  const newUsersTodayResult = await db.execute(sql`SELECT COUNT(*) as count FROM users WHERE DATE(createdAt) = CURDATE()`);
  const newUsersWeekResult = await db.execute(sql`SELECT COUNT(*) as count FROM users WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 7 DAY)`);
  const sessionsTodayResult = await db.execute(sql`SELECT COUNT(*) as count FROM ai_sessions WHERE DATE(createdAt) = CURDATE()`);
  const pendingRefundsResult = await db.execute(sql`SELECT COUNT(*) as count FROM refund_requests WHERE status = 'pending'`);
  const todayRow = ((newUsersTodayResult as any)[0] as { count: string | number }[])[0];
  const weekRow = ((newUsersWeekResult as any)[0] as { count: string | number }[])[0];
  const sessionsTodayRow = ((sessionsTodayResult as any)[0] as { count: string | number }[])[0];
  const pendingRow = ((pendingRefundsResult as any)[0] as { count: string | number }[])[0];
  return {
    totalUsers: Number(totalUsers?.count ?? 0),
    newUsersToday: Number(todayRow?.count ?? 0),
    newUsersThisWeek: Number(weekRow?.count ?? 0),
    totalSessions: Number(totalSessions?.count ?? 0),
    sessionsToday: Number(sessionsTodayRow?.count ?? 0),
    totalCreditsSpent: Number(creditsSpent?.sum ?? 0),
    totalCreditsGranted: Number(creditsGranted?.sum ?? 0),
    pendingRefunds: Number(pendingRow?.count ?? 0),
  };
}

// ═══════════════════════════════════════════════════════════════════
// LAYER 3: SUPPLIER CATALOG helpers
// ═══════════════════════════════════════════════════════════════════

import {
  suppliers,
  supplierCatalog,
  expertProfiles,
  expertCorrections,
  gigProfessionals,
  gigTasks,
  projects,
  projectDocuments,
  dataVersions,
  dataExpiryAlerts,
  trustScores,
  auditLog,
  archiveContracts,
  archiveDrawings,
  costBenchmarks,
  spacePlanningBenchmarks,
  type Supplier,
  type InsertSupplier,
  type SupplierCatalogItem,
  type ExpertProfile,
  type ExpertCorrection,
  type InsertExpertCorrection,
  type GigProfessional,
  type GigTask,
  type InsertGigTask,
  type Project,
  type InsertProject,
  type ProjectDocument,
  type InsertProjectDocument,
  type ArchiveContract,
  type InsertArchiveContract,
  type ArchiveDrawing,
  type InsertArchiveDrawing,
  type CostBenchmark,
} from "../drizzle/schema";

// ── Suppliers ────────────────────────────────────────────────────

export async function createSupplier(data: InsertSupplier): Promise<Supplier> {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  const [result] = await db.insert(suppliers).values(data);
  const id = (result as { insertId: number }).insertId;
  const [row] = await db.select().from(suppliers).where(eq(suppliers.id, id));
  return row;
}

export async function getSupplierByUserId(userId: number): Promise<Supplier | null> {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  const [row] = await db.select().from(suppliers).where(eq(suppliers.userId, userId));
  return row ?? null;
}

export async function getVerifiedSuppliers(specialization?: string): Promise<Supplier[]> {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  const query = db.select().from(suppliers).where(eq(suppliers.verificationStatus, "verified"));
  return query;
}

export async function updateSupplierVerification(
  supplierId: number,
  status: "verified" | "rejected" | "suspended",
  verifiedBy: number
): Promise<void> {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  await db.update(suppliers).set({
    verificationStatus: status,
    verifiedBy,
    verifiedAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(suppliers.id, supplierId));
}

export async function getSupplierCatalog(supplierId: number): Promise<SupplierCatalogItem[]> {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  return db.select().from(supplierCatalog)
    .where(eq(supplierCatalog.supplierId, supplierId));
}

export async function getApprovedCatalogItems(platform?: string): Promise<SupplierCatalogItem[]> {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  return db.select().from(supplierCatalog)
    .where(eq(supplierCatalog.approvalStatus, "approved"));
}

// ── Expert Profiles ───────────────────────────────────────────────

export async function createExpertProfile(data: Omit<typeof expertProfiles.$inferInsert, "id">): Promise<ExpertProfile> {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  const [result] = await db.insert(expertProfiles).values(data);
  const id = (result as { insertId: number }).insertId;
  const [row] = await db.select().from(expertProfiles).where(eq(expertProfiles.id, id));
  return row;
}

export async function getExpertProfileByUserId(userId: number): Promise<ExpertProfile | null> {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  const [row] = await db.select().from(expertProfiles).where(eq(expertProfiles.userId, userId));
  return row ?? null;
}

export async function getVerifiedExperts(specialization?: string): Promise<ExpertProfile[]> {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  return db.select().from(expertProfiles)
    .where(eq(expertProfiles.verificationStatus, "verified"));
}

// ── Expert Corrections ────────────────────────────────────────────

export async function createExpertCorrection(data: InsertExpertCorrection): Promise<ExpertCorrection> {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  const [result] = await db.insert(expertCorrections).values(data);
  const id = (result as { insertId: number }).insertId;
  const [row] = await db.select().from(expertCorrections).where(eq(expertCorrections.id, id));
  return row;
}

export async function getExpertCorrectionsByStatus(
  status: ExpertCorrection["status"],
  limit = 50
): Promise<ExpertCorrection[]> {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  return db.select().from(expertCorrections)
    .where(eq(expertCorrections.status, status))
    .orderBy(desc(expertCorrections.createdAt))
    .limit(limit);
}

export async function getUserExpertCorrections(userId: number): Promise<ExpertCorrection[]> {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  return db.select().from(expertCorrections)
    .where(eq(expertCorrections.submittedBy, userId))
    .orderBy(desc(expertCorrections.createdAt));
}

export async function updateExpertCorrectionStatus(
  id: number,
  status: ExpertCorrection["status"],
  appliedBy?: number
): Promise<void> {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  await db.update(expertCorrections).set({
    status,
    ...(appliedBy ? { appliedBy, appliedAt: new Date() } : {}),
    updatedAt: new Date(),
  }).where(eq(expertCorrections.id, id));
}

// ── Gig Professionals ─────────────────────────────────────────────

export async function getGigProfessionalByUserId(userId: number): Promise<GigProfessional | null> {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  const [row] = await db.select().from(gigProfessionals).where(eq(gigProfessionals.userId, userId));
  return row ?? null;
}

export async function getAvailableGigProfessionals(specialization?: string): Promise<GigProfessional[]> {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  return db.select().from(gigProfessionals)
    .where(eq(gigProfessionals.isAvailable, 1));
}

// ── Gig Tasks ─────────────────────────────────────────────────────

export async function createGigTask(data: InsertGigTask): Promise<GigTask> {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  const [result] = await db.insert(gigTasks).values(data);
  const id = (result as { insertId: number }).insertId;
  const [row] = await db.select().from(gigTasks).where(eq(gigTasks.id, id));
  return row;
}

export async function getOpenGigTasks(limit = 20): Promise<GigTask[]> {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  return db.select().from(gigTasks)
    .where(eq(gigTasks.status, "open"))
    .orderBy(desc(gigTasks.createdAt))
    .limit(limit);
}

export async function getUserGigTasks(userId: number): Promise<GigTask[]> {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  return db.select().from(gigTasks)
    .where(eq(gigTasks.postedBy, userId))
    .orderBy(desc(gigTasks.createdAt));
}

// ── Projects ──────────────────────────────────────────────────────

export async function createProject(data: InsertProject): Promise<Project> {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  const [result] = await db.insert(projects).values(data);
  const id = (result as { insertId: number }).insertId;
  const [row] = await db.select().from(projects).where(eq(projects.id, id));
  return row;
}

export async function getUserProjects(userId: number): Promise<Project[]> {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  return db.select().from(projects)
    .where(eq(projects.userId, userId))
    .orderBy(desc(projects.updatedAt));
}

export async function getProjectById(id: number): Promise<Project | null> {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  const [row] = await db.select().from(projects).where(eq(projects.id, id));
  return row ?? null;
}

export async function updateProject(id: number, data: Partial<InsertProject>): Promise<void> {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  await db.update(projects).set({ ...data, updatedAt: new Date() }).where(eq(projects.id, id));
}

export async function getProjectDocuments(projectId: number): Promise<ProjectDocument[]> {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  return db.select().from(projectDocuments)
    .where(eq(projectDocuments.projectId, projectId))
    .orderBy(desc(projectDocuments.createdAt));
}

export async function addProjectDocument(data: InsertProjectDocument): Promise<ProjectDocument> {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  const [result] = await db.insert(projectDocuments).values(data);
  const id = (result as { insertId: number }).insertId;
  const [row] = await db.select().from(projectDocuments).where(eq(projectDocuments.id, id));
  return row;
}

// ── Archive ───────────────────────────────────────────────────────

export async function createArchiveContract(data: InsertArchiveContract): Promise<ArchiveContract> {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  const [result] = await db.insert(archiveContracts).values(data);
  const id = (result as { insertId: number }).insertId;
  const [row] = await db.select().from(archiveContracts).where(eq(archiveContracts.id, id));
  return row;
}

export async function createArchiveDrawing(data: InsertArchiveDrawing): Promise<ArchiveDrawing> {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  const [result] = await db.insert(archiveDrawings).values(data);
  const id = (result as { insertId: number }).insertId;
  const [row] = await db.select().from(archiveDrawings).where(eq(archiveDrawings.id, id));
  return row;
}

export async function getPendingArchiveItems(): Promise<{ contracts: ArchiveContract[]; drawings: ArchiveDrawing[] }> {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  const [contracts, drawings] = await Promise.all([
    db.select().from(archiveContracts).where(eq(archiveContracts.extractionStatus, "pending")).limit(20),
    db.select().from(archiveDrawings).where(eq(archiveDrawings.extractionStatus, "pending")).limit(20),
  ]);
  return { contracts, drawings };
}

export async function getCostBenchmarks(
  projectType: string,
  emirate: string,
  year?: number
): Promise<CostBenchmark[]> {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  return db.select().from(costBenchmarks)
    .where(eq(costBenchmarks.emirate, emirate as CostBenchmark["emirate"]))
    .orderBy(desc(costBenchmarks.year))
    .limit(10);
}

// ── Audit Log ─────────────────────────────────────────────────────

export async function writeAuditLog(data: {
  actorType: "user" | "admin" | "system" | "api";
  actorId?: number;
  action: string;
  targetTable?: string;
  targetId?: number;
  beforeState?: unknown;
  afterState?: unknown;
  ipAddress?: string;
  metadata?: unknown;
}): Promise<void> {
  try {
    const db = await getDb(); if (!db) throw new Error("Database not available");
    await db.insert(auditLog).values({
      ...data,
      beforeState: data.beforeState ?? null,
      afterState: data.afterState ?? null,
      metadata: data.metadata ?? null,
    });
  } catch {
    // Non-critical — never let audit log failure break the main flow
  }
}

// ═══════════════════════════════════════════════════════════════════
// PARTNER SYSTEM helpers
// ═══════════════════════════════════════════════════════════════════
import {
  partners,
  partnerProjects,
  partnerServices,
  partnerReviews,
  type Partner,
  type InsertPartner,
  type PartnerProject,
  type InsertPartnerProject,
  type PartnerService,
  type InsertPartnerService,
  type PartnerReview,
  type InsertPartnerReview,
} from "../drizzle/schema";

// ── Partners ──────────────────────────────────────────────────────

export async function createPartner(data: InsertPartner): Promise<Partner> {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  const [result] = await db.insert(partners).values(data);
  const id = (result as { insertId: number }).insertId;
  const [row] = await db.select().from(partners).where(eq(partners.id, id));
  return row;
}

export async function getPartnerByUserId(userId: number): Promise<Partner | null> {
  const db = await getDb(); if (!db) return null;
  const [row] = await db.select().from(partners).where(eq(partners.userId, userId));
  return row ?? null;
}

export async function getPartnerById(id: number): Promise<Partner | null> {
  const db = await getDb(); if (!db) return null;
  const [row] = await db.select().from(partners).where(eq(partners.id, id));
  return row ?? null;
}

export async function getAllPartners(
  type?: Partner["partnerType"],
  status?: Partner["verificationStatus"],
  limit = 50
): Promise<Partner[]> {
  const db = await getDb(); if (!db) return [];
  return db.select().from(partners)
    .orderBy(desc(partners.createdAt))
    .limit(limit);
}

export async function getVerifiedPartners(type?: Partner["partnerType"]): Promise<Partner[]> {
  const db = await getDb(); if (!db) return [];
  return db.select().from(partners)
    .where(eq(partners.verificationStatus, "verified"))
    .orderBy(desc(partners.trustScore));
}

export async function updatePartner(id: number, data: Partial<InsertPartner>): Promise<void> {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  await db.update(partners).set({ ...data, updatedAt: new Date() }).where(eq(partners.id, id));
}

export async function updatePartnerVerification(
  id: number,
  status: Partner["verificationStatus"],
  verifiedBy: number,
  rejectionReason?: string
): Promise<void> {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  await db.update(partners).set({
    verificationStatus: status,
    verifiedBy,
    verifiedAt: status === "verified" ? new Date() : undefined,
    rejectionReason: rejectionReason ?? null,
    isPublicListed: status === "verified" ? 1 : 0,
    updatedAt: new Date(),
  }).where(eq(partners.id, id));
}

// ── Partner Projects ──────────────────────────────────────────────

export async function createPartnerProject(data: InsertPartnerProject): Promise<PartnerProject> {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  const [result] = await db.insert(partnerProjects).values(data);
  const id = (result as { insertId: number }).insertId;
  const [row] = await db.select().from(partnerProjects).where(eq(partnerProjects.id, id));
  return row;
}

export async function getPartnerProjects(partnerId: number): Promise<PartnerProject[]> {
  const db = await getDb(); if (!db) return [];
  return db.select().from(partnerProjects)
    .where(eq(partnerProjects.partnerId, partnerId))
    .orderBy(desc(partnerProjects.createdAt));
}

export async function getPartnerProjectById(id: number): Promise<PartnerProject | null> {
  const db = await getDb(); if (!db) return null;
  const [row] = await db.select().from(partnerProjects).where(eq(partnerProjects.id, id));
  return row ?? null;
}

export async function getApprovedPartnerProjects(limit = 50): Promise<PartnerProject[]> {
  const db = await getDb(); if (!db) return [];
  return db.select().from(partnerProjects)
    .where(eq(partnerProjects.approvalStatus, "approved"))
    .orderBy(desc(partnerProjects.createdAt))
    .limit(limit);
}

export async function updatePartnerProject(id: number, data: Partial<InsertPartnerProject>): Promise<void> {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  await db.update(partnerProjects).set({ ...data, updatedAt: new Date() }).where(eq(partnerProjects.id, id));
}

export async function approvePartnerProject(
  id: number,
  approvedBy: number,
  status: PartnerProject["approvalStatus"],
  rejectionReason?: string
): Promise<void> {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  await db.update(partnerProjects).set({
    approvalStatus: status,
    approvedBy,
    approvedAt: status === "approved" ? new Date() : undefined,
    rejectionReason: rejectionReason ?? null,
    updatedAt: new Date(),
  }).where(eq(partnerProjects.id, id));
}

// ── Partner Services ──────────────────────────────────────────────

export async function createPartnerService(data: InsertPartnerService): Promise<PartnerService> {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  const [result] = await db.insert(partnerServices).values(data);
  const id = (result as { insertId: number }).insertId;
  const [row] = await db.select().from(partnerServices).where(eq(partnerServices.id, id));
  return row;
}

export async function getPartnerServices(partnerId: number): Promise<PartnerService[]> {
  const db = await getDb(); if (!db) return [];
  return db.select().from(partnerServices)
    .where(eq(partnerServices.partnerId, partnerId));
}

// ── Partner Reviews ───────────────────────────────────────────────

export async function createPartnerReview(data: InsertPartnerReview): Promise<PartnerReview> {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  const [result] = await db.insert(partnerReviews).values(data);
  const id = (result as { insertId: number }).insertId;
  const [row] = await db.select().from(partnerReviews).where(eq(partnerReviews.id, id));
  // Update partner rating average
  await recalcPartnerRating(data.partnerId);
  return row;
}

export async function getPartnerReviews(partnerId: number): Promise<PartnerReview[]> {
  const db = await getDb(); if (!db) return [];
  return db.select().from(partnerReviews)
    .where(eq(partnerReviews.partnerId, partnerId))
    .orderBy(desc(partnerReviews.createdAt));
}

async function recalcPartnerRating(partnerId: number): Promise<void> {
  const db = await getDb(); if (!db) return;
  const reviews = await db.select().from(partnerReviews)
    .where(eq(partnerReviews.partnerId, partnerId));
  if (reviews.length === 0) return;
  const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  await db.update(partners).set({
    ratingAvg: Math.round(avg * 10) / 10,
    ratingCount: reviews.length,
    updatedAt: new Date(),
  }).where(eq(partners.id, partnerId));
}

// ── Archive by User ────────────────────────────────────────────────────────
export async function getArchiveContractsByUser(userId: number): Promise<ArchiveContract[]> {
  const db = await getDb(); if (!db) return [];
  return db.select().from(archiveContracts)
    .where(eq(archiveContracts.organizationId, userId))
    .orderBy(desc(archiveContracts.createdAt));
}
export async function getArchiveDrawingsByUser(userId: number): Promise<ArchiveDrawing[]> {
  const db = await getDb(); if (!db) return [];
  return db.select().from(archiveDrawings)
    .where(eq(archiveDrawings.organizationId, userId))
    .orderBy(desc(archiveDrawings.createdAt));
}

export async function updateArchiveContractExtraction(
  id: number,
  data: Partial<ArchiveContract>
): Promise<void> {
  const db = await getDb(); if (!db) return;
  await db.update(archiveContracts).set({ ...data, updatedAt: new Date() }).where(eq(archiveContracts.id, id));
}

export async function updateArchiveDrawingExtraction(
  id: number,
  data: Partial<ArchiveDrawing>
): Promise<void> {
  const db = await getDb(); if (!db) return;
  await db.update(archiveDrawings).set({ ...data, updatedAt: new Date() }).where(eq(archiveDrawings.id, id));
}

export async function getAllArchiveContracts(limit = 50): Promise<ArchiveContract[]> {
  const db = await getDb(); if (!db) return [];
  return db.select().from(archiveContracts).orderBy(desc(archiveContracts.createdAt)).limit(limit);
}

export async function getAllArchiveDrawings(limit = 50): Promise<ArchiveDrawing[]> {
  const db = await getDb(); if (!db) return [];
  return db.select().from(archiveDrawings).orderBy(desc(archiveDrawings.createdAt)).limit(limit);
}

// ═══════════════════════════════════════════════════════════════════════════
// COST TRACKING HELPERS
// ═══════════════════════════════════════════════════════════════════════════
import {
  platformCostLogs,
  platformCostBudgets,
  type PlatformCostLog,
  type InsertPlatformCostLog,
  type PlatformCostBudget,
  type InsertPlatformCostBudget,
} from "../drizzle/schema";
import { sum } from "drizzle-orm";

export async function addCostLog(data: InsertPlatformCostLog): Promise<void> {
  const db = await getDb(); if (!db) return;
  await db.insert(platformCostLogs).values(data);
}

export async function getCostLogs(filters?: {
  platform?: string;
  category?: string;
  periodStart?: string;
  periodEnd?: string;
  limit?: number;
}): Promise<PlatformCostLog[]> {
  const db = await getDb(); if (!db) return [];
  const conditions: any[] = [];
  if (filters?.platform) conditions.push(eq(platformCostLogs.platform, filters.platform as any));
  if (filters?.category) conditions.push(eq(platformCostLogs.category, filters.category as any));
  if (filters?.periodStart) conditions.push(gte(platformCostLogs.periodStart, filters.periodStart));
  if (filters?.periodEnd) conditions.push(lte(platformCostLogs.periodEnd, filters.periodEnd));
  const q = db.select().from(platformCostLogs);
  const result = conditions.length > 0
    ? await q.where(and(...conditions)).orderBy(desc(platformCostLogs.createdAt)).limit(filters?.limit ?? 200)
    : await q.orderBy(desc(platformCostLogs.createdAt)).limit(filters?.limit ?? 200);
  return result;
}

export async function getCostSummaryByPlatform(month: string): Promise<Array<{
  platform: string;
  category: string;
  totalCents: number;
}>> {
  const db = await getDb(); if (!db) return [];
  const rows = await db
    .select({
      platform: platformCostLogs.platform,
      category: platformCostLogs.category,
      totalCents: sum(platformCostLogs.amountCents),
    })
    .from(platformCostLogs)
    .where(sql`LEFT(${platformCostLogs.periodStart}, 7) = ${month}`)
    .groupBy(platformCostLogs.platform, platformCostLogs.category);
  return rows.map(r => ({
    platform: r.platform,
    category: r.category,
    totalCents: Number(r.totalCents ?? 0),
  }));
}

export async function deleteCostLog(id: number): Promise<void> {
  const db = await getDb(); if (!db) return;
  await db.delete(platformCostLogs).where(eq(platformCostLogs.id, id));
}

export async function upsertCostBudget(data: InsertPlatformCostBudget): Promise<void> {
  const db = await getDb(); if (!db) return;
  await db.insert(platformCostBudgets).values(data).onDuplicateKeyUpdate({
    set: { monthlyBudgetCents: data.monthlyBudgetCents, updatedAt: new Date() },
  });
}

export async function getCostBudgets(month: string): Promise<PlatformCostBudget[]> {
  const db = await getDb(); if (!db) return [];
  return db.select().from(platformCostBudgets).where(eq(platformCostBudgets.month, month));
}

/** Per-platform session + credit consumption stats for a given month */
export async function getPlatformConsumptionStats(month: string): Promise<Array<{
  platform: string;
  totalSessions: number;
  totalCreditsUsed: number;
}>> {
  const db = await getDb(); if (!db) return [];
  const rows = await db
    .select({
      platform: aiSessions.platform,
      totalSessions: sql<number>`COUNT(DISTINCT ${aiSessions.id})`,
      totalCreditsUsed: sum(aiSessions.creditsUsed),
    })
    .from(aiSessions)
    .where(sql`LEFT(${aiSessions.createdAt}, 7) = ${month}`)
    .groupBy(aiSessions.platform);
  return rows.map(r => ({
    platform: r.platform,
    totalSessions: Number(r.totalSessions ?? 0),
    totalCreditsUsed: Number(r.totalCreditsUsed ?? 0),
  }));
}

/** Monthly revenue from completed payments */
export async function getMonthlyRevenue(month: string): Promise<{
  totalRevenueCents: number;
  totalTransactions: number;
}> {
  const db = await getDb(); if (!db) return { totalRevenueCents: 0, totalTransactions: 0 };
  const rows = await db
    .select({
      totalRevenueCents: sum(payments.amountCents),
      totalTransactions: sql<number>`COUNT(*)`,
    })
    .from(payments)
    .where(
      and(
        sql`LEFT(${payments.createdAt}, 7) = ${month}`,
        eq(payments.status, "completed")
      )
    );
  return {
    totalRevenueCents: Number(rows[0]?.totalRevenueCents ?? 0),
    totalTransactions: Number(rows[0]?.totalTransactions ?? 0),
  };
}

// ─── GUEST TRIALS ────────────────────────────────────────────────────────────────────────────────────
import { guestTrials, type GuestTrial } from "../drizzle/schema";

export async function getGuestTrial(fingerprint: string, platform: string): Promise<GuestTrial | null> {
  const db = await getDb(); if (!db) return null;
  const rows = await db.select().from(guestTrials).where(
    and(eq(guestTrials.fingerprint, fingerprint), eq(guestTrials.platform, platform as GuestTrial["platform"]))
  ).limit(1);
  return rows[0] ?? null;
}

export async function createGuestTrial(data: {
  fingerprint: string; platform: string; ipAddress?: string;
  previewContent?: string; fullContent?: string;
}): Promise<void> {
  const db = await getDb(); if (!db) return;
  await db.insert(guestTrials).values({
    fingerprint: data.fingerprint,
    platform: data.platform as GuestTrial["platform"],
    ipAddress: data.ipAddress,
    previewContent: data.previewContent,
    fullContent: data.fullContent,
    used: false,
  });
}

export async function markGuestTrialUsed(fingerprint: string, platform: string): Promise<void> {
  const db = await getDb(); if (!db) return;
  await db.update(guestTrials).set({ used: true, usedAt: new Date() }).where(
    and(eq(guestTrials.fingerprint, fingerprint), eq(guestTrials.platform, platform as GuestTrial["platform"]))
  );
}

export async function getGuestTrialStats() {
  const db = await getDb(); if (!db) return [];
  const rows = await db.select({
    platform: guestTrials.platform,
    total: sql<number>`COUNT(*)`,
    used: sql<number>`SUM(CASE WHEN ${guestTrials.used} = 1 THEN 1 ELSE 0 END)`,
  }).from(guestTrials).groupBy(guestTrials.platform);
  return rows.map(r => ({ platform: r.platform, total: Number(r.total), used: Number(r.used) }));
}

// ─── COST DASHBOARD — Subscriber & Platform Analytics ────────────────────────

/**
 * استهلاك كل مشترك حسب المنصة — لداشبورد التكاليف
 */
export async function getSubscriberConsumption(month?: string): Promise<Array<{
  userId: number;
  userName: string | null;
  userEmail: string | null;
  totalCreditsUsed: number;
  totalSessions: number;
  byPlatform: Record<string, { sessions: number; credits: number }>;
  walletBalance: number;
  walletTotalSpent: number;
}>> {
  const db = await getDb(); if (!db) return [];

  const sessionRows = await db
    .select({
      userId: aiSessions.userId,
      platform: aiSessions.platform,
      sessions: sql<number>`COUNT(*)`,
      credits: sum(aiSessions.creditsUsed),
    })
    .from(aiSessions)
    .where(month ? sql`LEFT(${aiSessions.createdAt}, 7) = ${month}` : undefined)
    .groupBy(aiSessions.userId, aiSessions.platform);

  const allUsers = await db.select().from(users);
  const wallets = await db.select().from(creditWallets);
  const walletMap = new Map(wallets.map(w => [w.userId, w]));

  const userMap = new Map<number, {
    userId: number; userName: string | null; userEmail: string | null;
    totalCreditsUsed: number; totalSessions: number;
    byPlatform: Record<string, { sessions: number; credits: number }>;
    walletBalance: number; walletTotalSpent: number;
  }>();

  for (const user of allUsers) {
    const wallet = walletMap.get(user.id);
    userMap.set(user.id, {
      userId: user.id, userName: user.name, userEmail: user.email,
      totalCreditsUsed: 0, totalSessions: 0, byPlatform: {},
      walletBalance: wallet?.balance ?? 0, walletTotalSpent: wallet?.totalSpent ?? 0,
    });
  }

  for (const row of sessionRows) {
    const entry = userMap.get(row.userId);
    if (!entry) continue;
    const credits = Number(row.credits ?? 0);
    const sessions = Number(row.sessions ?? 0);
    entry.totalCreditsUsed += credits;
    entry.totalSessions += sessions;
    entry.byPlatform[row.platform] = { sessions, credits };
  }

  return Array.from(userMap.values())
    .filter(u => u.totalSessions > 0 || u.walletTotalSpent > 0)
    .sort((a, b) => b.totalCreditsUsed - a.totalCreditsUsed);
}

/**
 * داشبورد التكاليف الكامل: إيرادات + تكاليف + كريدت + مشتركين
 */
export async function getFullCostDashboard(month: string): Promise<{
  month: string;
  revenue: { totalCents: number; transactions: number };
  costs: { total: number; byCategory: Record<string, number>; byPlatform: Record<string, number>; items: Array<{ id: number; platform: string; category: string; amountCents: number; description: string | null; periodStart: string; periodEnd: string }> };
  credits: { totalIssued: number; totalConsumed: number; byPlatform: Record<string, number> };
  subscribers: { total: number; active: number; newThisMonth: number };
  profitMarginCents: number;
}> {
  const db = await getDb();
  const empty = { month, revenue: { totalCents: 0, transactions: 0 }, costs: { total: 0, byCategory: {}, byPlatform: {}, items: [] }, credits: { totalIssued: 0, totalConsumed: 0, byPlatform: {} }, subscribers: { total: 0, active: 0, newThisMonth: 0 }, profitMarginCents: 0 };
  if (!db) return empty;

  const revenueRows = await db.select({ total: sum(payments.amountCents), count: sql<number>`COUNT(*)` })
    .from(payments).where(and(sql`LEFT(${payments.createdAt}, 7) = ${month}`, eq(payments.status, "completed")));
  const totalRevenueCents = Number(revenueRows[0]?.total ?? 0);
  const totalTransactions = Number(revenueRows[0]?.count ?? 0);

  const costRows = await db.select().from(platformCostLogs).where(sql`LEFT(${platformCostLogs.periodStart}, 7) = ${month}`);
  const costByCategory: Record<string, number> = {};
  const costByPlatform: Record<string, number> = {};
  let totalCostCents = 0;
  for (const row of costRows) {
    totalCostCents += row.amountCents;
    costByCategory[row.category] = (costByCategory[row.category] ?? 0) + row.amountCents;
    costByPlatform[row.platform] = (costByPlatform[row.platform] ?? 0) + row.amountCents;
  }

  const creditRows = await db.select({ platform: aiSessions.platform, totalCredits: sum(aiSessions.creditsUsed) })
    .from(aiSessions).where(sql`LEFT(${aiSessions.createdAt}, 7) = ${month}`).groupBy(aiSessions.platform);
  const creditByPlatform: Record<string, number> = {};
  let totalConsumed = 0;
  for (const row of creditRows) { const c = Number(row.totalCredits ?? 0); creditByPlatform[row.platform] = c; totalConsumed += c; }

  const issuedRows = await db.select({ total: sum(creditTransactions.amount) }).from(creditTransactions)
    .where(and(sql`LEFT(${creditTransactions.createdAt}, 7) = ${month}`, sql`${creditTransactions.amount} > 0`));
  const totalIssued = Number(issuedRows[0]?.total ?? 0);

  const [totalUsersRow] = await db.select({ count: sql<number>`COUNT(*)` }).from(users);
  const [activeUsersRow] = await db.select({ count: sql<number>`COUNT(DISTINCT ${aiSessions.userId})` })
    .from(aiSessions).where(sql`LEFT(${aiSessions.createdAt}, 7) = ${month}`);
  const [newUsersRow] = await db.select({ count: sql<number>`COUNT(*)` }).from(users).where(sql`LEFT(${users.createdAt}, 7) = ${month}`);

  return {
    month,
    revenue: { totalCents: totalRevenueCents, transactions: totalTransactions },
    costs: { total: totalCostCents, byCategory: costByCategory, byPlatform: costByPlatform, items: costRows.map(r => ({ id: r.id, platform: r.platform, category: r.category, amountCents: r.amountCents, description: r.description ?? null, periodStart: r.periodStart, periodEnd: r.periodEnd })) },
    credits: { totalIssued, totalConsumed, byPlatform: creditByPlatform },
    subscribers: { total: Number(totalUsersRow?.count ?? 0), active: Number(activeUsersRow?.count ?? 0), newThisMonth: Number(newUsersRow?.count ?? 0) },
    profitMarginCents: totalRevenueCents - totalCostCents,
  };
}

// ─── USER FEEDBACK ──────────────────────────────────────────────────────────
import { userFeedback, errorReports, type InsertUserFeedback, type InsertErrorReport } from "../drizzle/schema";


export async function createFeedback(data: InsertUserFeedback) {
  const db = await getDb(); if (!db) return null;
  const [result] = await db.insert(userFeedback).values(data);
  return result;
}

export async function getFeedbackList(opts?: { platform?: string; limit?: number; offset?: number }) {
  const db = await getDb(); if (!db) return [];
  const limit = opts?.limit ?? 50;
  const offset = opts?.offset ?? 0;
  const conditions = opts?.platform ? [eq(userFeedback.platform, opts.platform)] : [];
  return db.select().from(userFeedback)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(userFeedback.createdAt))
    .limit(limit).offset(offset);
}

export async function getFeedbackStats() {
  const db = await getDb(); if (!db) return { total: 0, avgRating: 0, byPlatform: {} };
  const [totals] = await db.select({
    total: count(),
    avgRating: avg(userFeedback.rating),
  }).from(userFeedback);
  const byPlatformRows = await db.select({
    platform: userFeedback.platform,
    total: count(),
    avgRating: avg(userFeedback.rating),
  }).from(userFeedback).groupBy(userFeedback.platform);
  const byPlatform: Record<string, { total: number; avgRating: number }> = {};
  for (const row of byPlatformRows) {
    byPlatform[row.platform] = { total: Number(row.total), avgRating: Number(row.avgRating ?? 0) };
  }
  return {
    total: Number(totals?.total ?? 0),
    avgRating: Number(totals?.avgRating ?? 0),
    byPlatform,
  };
}

export async function getFeedbackById(id: number) {
  const db = await getDb(); if (!db) return null;
  const [row] = await db.select().from(userFeedback).where(eq(userFeedback.id, id)).limit(1);
  return row ?? null;
}

export async function updateFeedbackReview(id: number, adminReply: string) {
  const db = await getDb(); if (!db) return;
  await db.update(userFeedback).set({ isReviewed: true, adminReply, reviewedAt: new Date() }).where(eq(userFeedback.id, id));
}

// ─── ERROR REPORTS ──────────────────────────────────────────────────────────
export async function createErrorReport(data: InsertErrorReport) {
  const db = await getDb(); if (!db) return null;
  const [result] = await db.insert(errorReports).values(data);
  return result;
}

export async function getErrorReports(opts?: { status?: string; limit?: number; offset?: number }) {
  const db = await getDb(); if (!db) return [];
  const limit = opts?.limit ?? 50;
  const offset = opts?.offset ?? 0;
  const conditions = opts?.status ? [eq(errorReports.status, opts.status as "open" | "investigating" | "resolved" | "closed")] : [];
  return db.select().from(errorReports)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(errorReports.createdAt))
    .limit(limit).offset(offset);
}

export async function getErrorReportStats() {
  const db = await getDb(); if (!db) return { total: 0, open: 0, resolved: 0, byType: {} };
  const [totals] = await db.select({ total: count() }).from(errorReports);
  const [openCount] = await db.select({ count: count() }).from(errorReports).where(eq(errorReports.status, "open"));
  const [resolvedCount] = await db.select({ count: count() }).from(errorReports).where(eq(errorReports.status, "resolved"));
  const byTypeRows = await db.select({
    errorType: errorReports.errorType,
    total: count(),
  }).from(errorReports).groupBy(errorReports.errorType);
  const byType: Record<string, number> = {};
  for (const row of byTypeRows) { byType[row.errorType] = Number(row.total); }
  return {
    total: Number(totals?.total ?? 0),
    open: Number(openCount?.count ?? 0),
    resolved: Number(resolvedCount?.count ?? 0),
    byType,
  };
}

export async function getFeedbackWeeklyTrend(weeks: number = 8) {
  const db = await getDb(); if (!db) return [];
  const result: { week: string; avgRating: number; count: number }[] = [];
  const now = new Date();
  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - (i + 1) * 7);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(now);
    weekEnd.setDate(now.getDate() - i * 7);
    weekEnd.setHours(23, 59, 59, 999);
    const [row] = await db.select({
      avgRating: avg(userFeedback.rating),
      total: count(),
    }).from(userFeedback)
      .where(and(
        gte(userFeedback.createdAt, weekStart),
        lte(userFeedback.createdAt, weekEnd)
      ));
    const label = weekStart.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
    result.push({
      week: label,
      avgRating: Number((row?.avgRating ?? 0).toString().slice(0, 4)),
      count: Number(row?.total ?? 0),
    });
  }
  return result;
}

export async function updateErrorReportStatus(id: number, status: "open" | "investigating" | "resolved" | "closed", adminNote?: string) {
  const db = await getDb(); if (!db) return;
  const updateData: Record<string, unknown> = { status };
  if (adminNote !== undefined) updateData.adminNote = adminNote;
  if (status === "resolved" || status === "closed") updateData.resolvedAt = new Date();
  await db.update(errorReports).set(updateData).where(eq(errorReports.id, id));
}

// ─── PLATFORM PRICING RULES ──────────────────────────────────────────────────
import { platformPricingRules, type PlatformPricingRule, type InsertPlatformPricingRule } from "../drizzle/schema";

/** Default pricing rules per platform (used when DB has no rule) */
const DEFAULT_PRICING_RULES: Record<string, { baseCost: number; minCost: number; maxCost: number; factorWeights: Record<string, number>; description: string }> = {
  fada: {
    baseCost: 5, minCost: 5, maxCost: 60,
    factorWeights: { message_count: 1, image_count: 5, report_type_full: 10, room_count: 2 },
    description: "فضاء: 5 كريدت أساسي + 1 لكل رسالة + 5 لكل صورة + 10 للتقرير الكامل + 2 لكل غرفة",
  },
  raqaba: {
    baseCost: 5, minCost: 5, maxCost: 80,
    factorWeights: { message_count: 1, image_count: 8, report_type_full: 15, violation_count: 2 },
    description: "رقابة: 5 كريدت أساسي + 1 لكل رسالة + 8 لكل صورة + 15 للتقرير الكامل + 2 لكل مخالفة",
  },
  harara: {
    baseCost: 5, minCost: 5, maxCost: 80,
    factorWeights: { message_count: 1, floor_count: 3, report_type_full: 15, hvac_zones: 5 },
    description: "حرارة: 5 كريدت أساسي + 1 لكل رسالة + 3 لكل طابق + 15 للتقرير الكامل + 5 لكل منطقة HVAC",
  },
  maskan: {
    baseCost: 5, minCost: 5, maxCost: 50,
    factorWeights: { message_count: 1, property_options: 3, report_type_full: 10 },
    description: "مسكن: 5 كريدت أساسي + 1 لكل رسالة + 3 لكل خيار عقاري + 10 للتقرير الكامل",
  },
  code: {
    baseCost: 3, minCost: 3, maxCost: 30,
    factorWeights: { message_count: 1, code_sections: 2, report_type_full: 8 },
    description: "كود: 3 كريدت أساسي + 1 لكل رسالة + 2 لكل بند كودي + 8 للتقرير الكامل",
  },
  khayal: {
    baseCost: 5, minCost: 5, maxCost: 70,
    factorWeights: { message_count: 1, image_count: 6, image_generation: 15, report_type_full: 12 },
    description: "خيال: 5 كريدت أساسي + 1 لكل رسالة + 6 لكل صورة مُحللة + 15 لكل صورة مُولَّدة + 12 للتقرير الكامل",
  },
};

/**
 * Calculate credit cost for a platform based on usage_factors.
 * Uses DB rules if available, falls back to DEFAULT_PRICING_RULES.
 * Formula: clamp(baseCost + sum(factor_value * weight), minCost, maxCost)
 */
export async function calculatePlatformCost(
  platform: string,
  usageFactors: Record<string, number> = {}
): Promise<{ cost: number; breakdown: Record<string, number>; rule: string }> {
  const db = await getDb();
  let rule = DEFAULT_PRICING_RULES[platform] ?? { baseCost: 10, minCost: 5, maxCost: 50, factorWeights: { message_count: 1 }, description: "افتراضي" };

  // Try to load rule from DB
  if (db) {
    try {
      const rows = await db.select().from(platformPricingRules)
        .where(and(eq(platformPricingRules.platform, platform), eq(platformPricingRules.isActive, true)))
        .limit(1);
      if (rows.length > 0) {
        const dbRule = rows[0];
        rule = {
          baseCost: dbRule.baseCost,
          minCost: dbRule.minCost,
          maxCost: dbRule.maxCost,
          factorWeights: (dbRule.factorWeights as Record<string, number>) ?? {},
          description: dbRule.description ?? "",
        };
      }
    } catch { /* use default */ }
  }

  const breakdown: Record<string, number> = { base: rule.baseCost };
  let total = rule.baseCost;

  for (const [factor, value] of Object.entries(usageFactors)) {
    const weight = rule.factorWeights[factor] ?? 0;
    if (weight > 0 && value > 0) {
      const factorCost = Math.round(value * weight);
      breakdown[factor] = factorCost;
      total += factorCost;
    }
  }

  const finalCost = Math.max(rule.minCost, Math.min(rule.maxCost, Math.round(total)));
  return { cost: finalCost, breakdown, rule: rule.description };
}

/** Get all platform pricing rules (for admin UI) */
export async function getAllPricingRules(): Promise<PlatformPricingRule[]> {
  const db = await getDb(); if (!db) return [];
  return db.select().from(platformPricingRules).orderBy(platformPricingRules.platform);
}

/** Upsert a pricing rule (admin only) */
export async function upsertPricingRule(data: InsertPlatformPricingRule): Promise<void> {
  const db = await getDb(); if (!db) return;
  await db.insert(platformPricingRules).values(data).onDuplicateKeyUpdate({
    set: {
      baseCost: data.baseCost,
      minCost: data.minCost,
      maxCost: data.maxCost,
      factorWeights: data.factorWeights,
      description: data.description,
      isActive: data.isActive,
      updatedBy: data.updatedBy,
    }
  });
}

/** Seed default pricing rules into DB if not already present */
export async function seedDefaultPricingRules(adminUserId: number): Promise<void> {
  const db = await getDb(); if (!db) return;
  for (const [platform, rule] of Object.entries(DEFAULT_PRICING_RULES)) {
    const existing = await db.select().from(platformPricingRules)
      .where(eq(platformPricingRules.platform, platform)).limit(1);
    if (existing.length === 0) {
      await db.insert(platformPricingRules).values({
        platform,
        baseCost: rule.baseCost,
        minCost: rule.minCost,
        maxCost: rule.maxCost,
        factorWeights: rule.factorWeights,
        description: rule.description,
        isActive: true,
        updatedBy: adminUserId,
      });
    }
  }
}

// ─── SESSION CREDIT REFUNDS ──────────────────────────────────────────────────
import { sessionCreditRefunds, type SessionCreditRefund, type InsertSessionCreditRefund } from "../drizzle/schema";

export async function createSessionRefund(data: {
  userId: number;
  sessionId: number;
  platform: string;
  creditsToRefund: number;
  reason?: string;
}): Promise<SessionCreditRefund> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(sessionCreditRefunds).values({
    userId: data.userId,
    sessionId: data.sessionId,
    platform: data.platform,
    creditsToRefund: data.creditsToRefund,
    reason: data.reason ?? null,
    status: "pending",
  });
  const result = await db.select().from(sessionCreditRefunds)
    .where(eq(sessionCreditRefunds.userId, data.userId))
    .orderBy(desc(sessionCreditRefunds.createdAt)).limit(1);
  return result[0];
}

export async function getUserSessionRefunds(userId: number): Promise<SessionCreditRefund[]> {
  const db = await getDb(); if (!db) return [];
  return db.select().from(sessionCreditRefunds)
    .where(eq(sessionCreditRefunds.userId, userId))
    .orderBy(desc(sessionCreditRefunds.createdAt));
}

export async function getAllSessionRefunds(): Promise<(SessionCreditRefund & { userName: string | null; userEmail: string | null })[]> {
  const db = await getDb(); if (!db) return [];
  const rows = await db.select({
    id: sessionCreditRefunds.id,
    userId: sessionCreditRefunds.userId,
    sessionId: sessionCreditRefunds.sessionId,
    platform: sessionCreditRefunds.platform,
    creditsToRefund: sessionCreditRefunds.creditsToRefund,
    reason: sessionCreditRefunds.reason,
    status: sessionCreditRefunds.status,
    adminNote: sessionCreditRefunds.adminNote,
    reviewedBy: sessionCreditRefunds.reviewedBy,
    reviewedAt: sessionCreditRefunds.reviewedAt,
    createdAt: sessionCreditRefunds.createdAt,
    updatedAt: sessionCreditRefunds.updatedAt,
    userName: users.name,
    userEmail: users.email,
  }).from(sessionCreditRefunds)
    .leftJoin(users, eq(sessionCreditRefunds.userId, users.id))
    .orderBy(desc(sessionCreditRefunds.createdAt));
  return rows as any;
}

export async function updateSessionRefund(id: number, data: {
  status: "approved" | "rejected";
  adminNote?: string;
  reviewedBy: number;
}): Promise<void> {
  const db = await getDb(); if (!db) return;
  await db.update(sessionCreditRefunds).set({
    status: data.status,
    adminNote: data.adminNote ?? null,
    reviewedBy: data.reviewedBy,
    reviewedAt: new Date(),
  }).where(eq(sessionCreditRefunds.id, id));
}

export async function getSessionRefundById(id: number): Promise<SessionCreditRefund | null> {
  const db = await getDb(); if (!db) return null;
  const result = await db.select().from(sessionCreditRefunds).where(eq(sessionCreditRefunds.id, id)).limit(1);
  return result[0] ?? null;
}

export async function hasExistingRefundRequest(userId: number, sessionId: number): Promise<boolean> {
  const db = await getDb(); if (!db) return false;
  const result = await db.select({ id: sessionCreditRefunds.id }).from(sessionCreditRefunds)
    .where(and(eq(sessionCreditRefunds.userId, userId), eq(sessionCreditRefunds.sessionId, sessionId)))
    .limit(1);
  return result.length > 0;
}

// ─── Health Monitor DB Helpers ────────────────────────────────────────────────
import {
  systemHealthChecks, systemIncidents, systemAutoFixes, ownerAlerts,
  userMemory, userReports, conversationThreads,
} from "../drizzle/schema";

/** Get health summary - latest check per target */
export async function getHealthSummary() {
  const db = await getDb(); if (!db) return [];
  const targets = ["fada", "raqaba", "harara", "maskan", "code", "khayal", "core_database"];
  const results = [];
  for (const target of targets) {
    const latest = await db.select().from(systemHealthChecks)
      .where(eq(systemHealthChecks.target, target))
      .orderBy(desc(systemHealthChecks.createdAt))
      .limit(1);
    if (latest[0]) results.push(latest[0]);
  }
  return results;
}

/** Get open incidents */
export async function getOpenIncidents() {
  const db = await getDb(); if (!db) return [];
  return db.select().from(systemIncidents)
    .where(sql`${systemIncidents.status} NOT IN ('resolved', 'ignored', 'auto_fixed')`)
    .orderBy(desc(systemIncidents.createdAt))
    .limit(100);
}

/** Get all incidents with pagination */
export async function getAllIncidents(limit = 50, offset = 0) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(systemIncidents)
    .orderBy(desc(systemIncidents.createdAt))
    .limit(limit)
    .offset(offset);
}

/** Get auto fixes */
export async function getAllAutoFixes(limit = 50) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(systemAutoFixes)
    .orderBy(desc(systemAutoFixes.createdAt))
    .limit(limit);
}

/** Get owner alerts */
export async function getOwnerAlerts(limit = 50) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(ownerAlerts)
    .orderBy(desc(ownerAlerts.createdAt))
    .limit(limit);
}

/** Resolve an incident */
export async function resolveIncident(incidentId: number, notes?: string) {
  const db = await getDb(); if (!db) return;
  await db.update(systemIncidents)
    .set({ status: "resolved", resolvedAt: new Date(), ownerDecision: notes, updatedAt: new Date() })
    .where(eq(systemIncidents.id, incidentId));
}

/** Ignore an incident */
export async function ignoreIncident(incidentId: number, notes?: string) {
  const db = await getDb(); if (!db) return;
  await db.update(systemIncidents)
    .set({ status: "ignored", ownerDecision: notes, updatedAt: new Date() })
    .where(eq(systemIncidents.id, incidentId));
}

/** Get health stats */
export async function getHealthStats() {
  const db = await getDb(); if (!db) return null;
  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [totalChecks, failedChecks, openInc, autoFixed, alerts] = await Promise.all([
    db.select({ c: sql<number>`COUNT(*)` }).from(systemHealthChecks).where(gte(systemHealthChecks.createdAt, last24h)),
    db.select({ c: sql<number>`COUNT(*)` }).from(systemHealthChecks).where(and(eq(systemHealthChecks.status, "failed"), gte(systemHealthChecks.createdAt, last24h))),
    db.select({ c: sql<number>`COUNT(*)` }).from(systemIncidents).where(sql`${systemIncidents.status} NOT IN ('resolved', 'ignored', 'auto_fixed')`),
    db.select({ c: sql<number>`COUNT(*)` }).from(systemAutoFixes).where(and(eq(systemAutoFixes.success, true), gte(systemAutoFixes.createdAt, last24h))),
    db.select({ c: sql<number>`COUNT(*)` }).from(ownerAlerts).where(gte(ownerAlerts.createdAt, last24h)),
  ]);
  return {
    totalChecks24h: Number(totalChecks[0]?.c ?? 0),
    failedChecks24h: Number(failedChecks[0]?.c ?? 0),
    openIncidents: Number(openInc[0]?.c ?? 0),
    autoFixedToday: Number(autoFixed[0]?.c ?? 0),
    alertsToday: Number(alerts[0]?.c ?? 0),
  };
}

// ─── User Memory DB Helpers ───────────────────────────────────────────────────

/** Get user memory */
export async function getUserMemory(userId: number) {
  const db = await getDb(); if (!db) return null;
  const rows = await db.select().from(userMemory).where(eq(userMemory.userId, userId)).limit(1);
  return rows[0] ?? null;
}

/** Upsert user memory */
export async function upsertUserMemory(userId: number, data: Partial<typeof userMemory.$inferInsert>) {
  const db = await getDb(); if (!db) return null;
  const existing = await getUserMemory(userId);
  if (existing) {
    await db.update(userMemory).set({ ...data, updatedAt: new Date() }).where(eq(userMemory.userId, userId));
  } else {
    await db.insert(userMemory).values({ userId, ...data });
  }
  return getUserMemory(userId);
}

/** Get user reports */
export async function getUserReportsList(userId: number, platform?: string, limit = 20) {
  const db = await getDb(); if (!db) return [];
  const conditions: any[] = [eq(userReports.userId, userId)];
  if (platform) conditions.push(eq(userReports.platform, platform));
  return db.select().from(userReports).where(and(...conditions)).orderBy(desc(userReports.createdAt)).limit(limit);
}

/** Get user conversation threads */
export async function getUserConversationThreads(userId: number, platform?: string, limit = 20) {
  const db = await getDb(); if (!db) return [];
  const conditions: any[] = [eq(conversationThreads.userId, userId)];
  if (platform) conditions.push(eq(conversationThreads.platform, platform));
  return db.select().from(conversationThreads).where(and(...conditions)).orderBy(desc(conversationThreads.createdAt)).limit(limit);
}

/** Get full user memory profile */
export async function getUserMemoryProfile(userId: number) {
  const [memory, reports, threads] = await Promise.all([
    getUserMemory(userId),
    getUserReportsList(userId, undefined, 10),
    getUserConversationThreads(userId, undefined, 10),
  ]);
  return { memory, reports, threads };
}

// ─── OAUTH TRANSFER TOKENS ───────────────────────────────────────────────────
// DB-based token store so manus.space and mousa.ai (Hetzner) share the same tokens
// without needing the same JWT_SECRET.

import { randomBytes } from "crypto";

/**
 * Create a one-time transfer token in the DB.
 * Expires in 60 seconds. Returns the token string.
 */
export async function createOAuthTransferToken(sessionToken: string, returnPath: string): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available for OAuth transfer");
  const token = randomBytes(32).toString("hex"); // 64-char hex string
  const expiresAt = new Date(Date.now() + 60 * 1000); // 60 seconds TTL
  await db.insert(oauthTransferTokens).values({ token, sessionToken, returnPath, expiresAt });
  return token;
}

/**
 * Consume a transfer token (one-time use).
 * Returns { sessionToken, returnPath } if valid, null if expired/used/not found.
 */
export async function consumeOAuthTransferToken(token: string): Promise<{ sessionToken: string; returnPath: string } | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(oauthTransferTokens).where(eq(oauthTransferTokens.token, token)).limit(1);
  const row = rows[0];
  if (!row) return null;
  // Check if already used
  if (row.usedAt) return null;
  // Check if expired
  if (row.expiresAt < new Date()) return null;
  // Mark as used
  await db.update(oauthTransferTokens).set({ usedAt: new Date() }).where(eq(oauthTransferTokens.token, token));
  return { sessionToken: row.sessionToken, returnPath: row.returnPath };
}

/**
 * Cleanup expired transfer tokens (call periodically).
 */
export async function cleanupExpiredTransferTokens(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(oauthTransferTokens).where(lte(oauthTransferTokens.expiresAt, new Date()));
}
