/**
 * server/marketing.ts
 * DB helpers for discount codes and referral program.
 */
import { eq, and, sql, desc } from "drizzle-orm";
import { getDb } from "./db";
import {
  discountCodes,
  discountCodeUses,
  referrals,
  referralCodes,
  type DiscountCode,
  type Referral,
  type ReferralCode,
} from "../drizzle/schema";

// ─── DISCOUNT CODES ──────────────────────────────────────────────────────────

export async function getDiscountCodeByCode(code: string): Promise<DiscountCode | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(discountCodes)
    .where(eq(discountCodes.code, code.toUpperCase().trim()))
    .limit(1);
  return result[0];
}

export async function validateDiscountCode(
  code: string,
  userId: number,
  amountCents: number,
  packageId?: string
): Promise<{ valid: boolean; error?: string; discountCode?: DiscountCode }> {
  const db = await getDb();
  if (!db) return { valid: false, error: "Database unavailable" };

  const dc = await getDiscountCodeByCode(code);
  if (!dc) return { valid: false, error: "الكود غير صحيح" };
  if (!dc.isActive) return { valid: false, error: "هذا الكود غير نشط" };

  // Check expiry
  if (dc.expiresAt && new Date(dc.expiresAt) < new Date()) {
    return { valid: false, error: "انتهت صلاحية هذا الكود" };
  }

  // Check max uses
  if (dc.maxUses !== null && dc.usedCount >= dc.maxUses) {
    return { valid: false, error: "تم استنفاد هذا الكود" };
  }

  // Check per-user uses
  if (dc.maxUsesPerUser !== null) {
    const userUses = await db
      .select({ count: sql<number>`count(*)` })
      .from(discountCodeUses)
      .where(and(eq(discountCodeUses.codeId, dc.id), eq(discountCodeUses.userId, userId)));
    if ((userUses[0]?.count ?? 0) >= dc.maxUsesPerUser) {
      return { valid: false, error: "لقد استخدمت هذا الكود من قبل" };
    }
  }

  // Check minimum amount
  if (dc.minAmountCents !== null && amountCents < dc.minAmountCents) {
    const minUsd = (dc.minAmountCents / 100).toFixed(2);
    return { valid: false, error: `الحد الأدنى للشراء $${minUsd}` };
  }

  // Check applicable packages
  if (dc.applicablePackages && packageId) {
    const allowed = dc.applicablePackages as string[];
    if (!allowed.includes(packageId)) {
      return { valid: false, error: "هذا الكود لا ينطبق على هذه الباقة" };
    }
  }

  return { valid: true, discountCode: dc };
}

export async function recordDiscountCodeUse(
  codeId: number,
  userId: number,
  paymentId: number | null,
  discountApplied: number
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(discountCodeUses).values({ codeId, userId, paymentId: paymentId ?? undefined, discountApplied });
  await db
    .update(discountCodes)
    .set({ usedCount: sql`${discountCodes.usedCount} + 1` })
    .where(eq(discountCodes.id, codeId));
}

export async function getAllDiscountCodes() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(discountCodes).orderBy(desc(discountCodes.createdAt));
}

export async function createDiscountCode(data: {
  code: string;
  description?: string;
  discountType: "percent" | "credits";
  discountValue: number;
  maxUses?: number;
  maxUsesPerUser?: number;
  minAmountCents?: number;
  expiresAt?: Date;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(discountCodes).values({
    code: data.code.toUpperCase().trim(),
    description: data.description,
    discountType: data.discountType,
    discountValue: data.discountValue,
    maxUses: data.maxUses ?? null,
    maxUsesPerUser: data.maxUsesPerUser ?? 1,
    minAmountCents: data.minAmountCents ?? null,
    expiresAt: data.expiresAt ?? null,
    isActive: 1,
  });
}

export async function toggleDiscountCode(id: number, isActive: boolean): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(discountCodes).set({ isActive: isActive ? 1 : 0 }).where(eq(discountCodes.id, id));
}

// ─── REFERRAL CODES ──────────────────────────────────────────────────────────

function generateReferralCode(userId: number): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 6; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `MOUSA-${suffix}`;
}

export async function getOrCreateReferralCode(userId: number): Promise<ReferralCode> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const existing = await db
    .select()
    .from(referralCodes)
    .where(eq(referralCodes.userId, userId))
    .limit(1);

  if (existing[0]) return existing[0];

  // Generate unique code
  let code = generateReferralCode(userId);
  let attempts = 0;
  while (attempts < 10) {
    const conflict = await db
      .select()
      .from(referralCodes)
      .where(eq(referralCodes.code, code))
      .limit(1);
    if (!conflict[0]) break;
    code = generateReferralCode(userId);
    attempts++;
  }

  await db.insert(referralCodes).values({ userId, code, totalReferrals: 0, totalCreditsEarned: 0 });
  const created = await db
    .select()
    .from(referralCodes)
    .where(eq(referralCodes.userId, userId))
    .limit(1);
  return created[0];
}

export async function getReferralCodeByCode(code: string): Promise<ReferralCode | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(referralCodes)
    .where(eq(referralCodes.code, code.toUpperCase().trim()))
    .limit(1);
  return result[0];
}

export async function createReferral(referrerId: number, refereeId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  // Check if referee already has a referral record
  const existing = await db
    .select()
    .from(referrals)
    .where(eq(referrals.refereeId, refereeId))
    .limit(1);
  if (existing[0]) return; // already referred

  await db.insert(referrals).values({
    referrerId,
    refereeId,
    status: "pending",
    referrerCredits: 0,
    refereeCredits: 0,
  });
}

export async function getReferralByRefereeId(refereeId: number): Promise<Referral | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(referrals)
    .where(eq(referrals.refereeId, refereeId))
    .limit(1);
  return result[0];
}

export async function rewardReferral(refereeId: number): Promise<{ referrerId: number } | null> {
  const db = await getDb();
  if (!db) return null;

  const referral = await getReferralByRefereeId(refereeId);
  if (!referral || referral.status === "rewarded") return null;

  // Mark as rewarded
  await db
    .update(referrals)
    .set({
      status: "rewarded",
      referrerCredits: 50,
      refereeCredits: 100,
      rewardedAt: new Date(),
    })
    .where(eq(referrals.id, referral.id));

  // Update referrer's stats
  await db
    .update(referralCodes)
    .set({
      totalReferrals: sql`${referralCodes.totalReferrals} + 1`,
      totalCreditsEarned: sql`${referralCodes.totalCreditsEarned} + 50`,
    })
    .where(eq(referralCodes.userId, referral.referrerId));

  return { referrerId: referral.referrerId };
}

export async function getUserReferrals(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(referrals)
    .where(eq(referrals.referrerId, userId))
    .orderBy(desc(referrals.createdAt));
}
