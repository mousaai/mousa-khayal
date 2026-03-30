/**
 * mousa.ai — Stripe Products Configuration
 *
 * TWO payment modes:
 * 1. CREDIT PACKAGES — one-time purchases (price_data inline, no Price ID needed)
 * 2. SUBSCRIPTION PLANS — monthly recurring (requires Stripe Price IDs)
 *
 * All prices are in USD for global consistency.
 *
 * Credit Packages:
 *   • Starter:    500 credits  → $9.99
 *   • Pro:      2,000 credits  → $34.99
 *   • Studio:   5,000 credits  → $74.99
 *   • Team:    15,000 credits  → $179.99
 *
 * Subscription Plans:
 *   • Starter:    600 credits/mo  → $13.99/mo
 *   • Pro:      2,000 credits/mo  → $39.99/mo
 *   • Office:   6,000 credits/mo  → $94.99/mo
 */

// ─── ONE-TIME CREDIT PACKAGES ────────────────────────────────────────

export interface CreditPackage {
  id: string;
  name: string;
  nameAr: string;
  credits: number;
  amountCents: number;
  currency: string;
  description: string;
  descriptionAr: string;
  popular?: boolean;
  badge?: string;
  badgeAr?: string;
  sessionsHint?: string;
  sessionsHintAr?: string;
}

export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: "starter_500",
    name: "Starter",
    nameAr: "مبتدئ",
    credits: 500,
    amountCents: 999,
    currency: "usd",
    description: "500 credits — ideal for trying all 6 platforms",
    descriptionAr: "500 كريدت — مثالي لتجربة المنصات الست",
    sessionsHint: "~25 design sessions",
    sessionsHintAr: "~25 جلسة تصميم",
  },
  {
    id: "pro_2000",
    name: "Professional",
    nameAr: "احترافي",
    credits: 2000,
    amountCents: 3499,
    currency: "usd",
    description: "2,000 credits — for regular professional use",
    descriptionAr: "2,000 كريدت — للاستخدام المهني المنتظم",
    popular: true,
    badge: "Most Popular",
    badgeAr: "الأكثر شيوعاً",
    sessionsHint: "~100 sessions across all platforms",
    sessionsHintAr: "~100 جلسة عبر جميع المنصات",
  },
  {
    id: "studio_5000",
    name: "Studio",
    nameAr: "ستوديو",
    credits: 5000,
    amountCents: 7499,
    currency: "usd",
    description: "5,000 credits — best value for heavy users",
    descriptionAr: "5,000 كريدت — أفضل قيمة للاستخدام المكثف",
    badge: "Best Value",
    badgeAr: "أفضل قيمة",
    sessionsHint: "~250 sessions — save 25% vs Starter",
    sessionsHintAr: "~250 جلسة — وفّر 25% مقارنة بالمبتدئ",
  },
  {
    id: "team_15000",
    name: "Team",
    nameAr: "فريق",
    credits: 15000,
    amountCents: 17999,
    currency: "usd",
    description: "15,000 credits — for engineering teams of 3–5",
    descriptionAr: "15,000 كريدت — لفرق هندسية من 3 إلى 5 أشخاص",
    badge: "Team",
    badgeAr: "للفرق",
    sessionsHint: "~750 sessions — share across your team",
    sessionsHintAr: "~750 جلسة — شاركها مع فريقك",
  },
];

export function getPackageById(id: string): CreditPackage | undefined {
  return CREDIT_PACKAGES.find((p) => p.id === id);
}

// ─── SUBSCRIPTION PLANS ───────────────────────────────────────────────

export interface SubscriptionPlan {
  id: string;           // internal plan ID
  name: string;
  nameAr: string;
  creditsPerMonth: number;
  amountCents: number;  // monthly amount in cents (USD)
  currency: string;
  priceUsd: number;     // display price in USD
  description: string;
  descriptionAr: string;
  /** Stripe Price ID — populated at runtime via ensureSubscriptionProducts() */
  stripePriceId?: string;
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "sub_starter",
    name: "Starter Monthly",
    nameAr: "مبتدئ شهري",
    creditsPerMonth: 600,
    amountCents: 1399,
    currency: "usd",
    priceUsd: 13.99,
    description: "600 credits/month — for individual professionals",
    descriptionAr: "600 كريدت شهرياً — للأفراد المحترفين",
  },
  {
    id: "sub_pro",
    name: "Pro Monthly",
    nameAr: "احترافي شهري",
    creditsPerMonth: 2000,
    amountCents: 3999,
    currency: "usd",
    priceUsd: 39.99,
    description: "2,000 credits/month — for independent engineers",
    descriptionAr: "2,000 كريدت شهرياً — للمهندسين المستقلين",
  },
  {
    id: "sub_office",
    name: "Office Monthly",
    nameAr: "مكتب شهري",
    creditsPerMonth: 6000,
    amountCents: 9499,
    currency: "usd",
    priceUsd: 94.99,
    description: "6,000 credits/month — for engineering offices",
    descriptionAr: "6,000 كريدت شهرياً — للمكاتب الهندسية",
  },
];

export function getSubscriptionPlanById(id: string): SubscriptionPlan | undefined {
  return SUBSCRIPTION_PLANS.find((p) => p.id === id);
}

/** Map from pricing page plan IDs to subscription plan IDs */
export const PLAN_TO_SUB_MAP: Record<string, string> = {
  starter: "sub_starter",
  pro:     "sub_pro",
  office:  "sub_office",
};
