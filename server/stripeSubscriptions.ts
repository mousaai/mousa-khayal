/**
 * mousa.ai — Stripe Subscription Helper
 *
 * Handles:
 * - Auto-creating/retrieving Stripe Products & Prices for subscription plans
 * - Creating Stripe Checkout Sessions for subscriptions
 * - Creating Stripe Billing Portal sessions (manage/cancel)
 */
import Stripe from "stripe";
import { getStripe } from "./stripeHelper";
import { SUBSCRIPTION_PLANS, getSubscriptionPlanById, type SubscriptionPlan } from "./stripeProducts";

// In-memory cache of Price IDs (populated at startup)
const priceIdCache: Record<string, string> = {};

/**
 * Ensure all subscription products & prices exist in Stripe.
 * Called once at server startup. Idempotent — safe to call multiple times.
 */
export async function ensureSubscriptionProducts(): Promise<void> {
  const stripe = getStripe();

  for (const plan of SUBSCRIPTION_PLANS) {
    try {
      // Search for existing product by metadata
      const products = await stripe.products.search({
        query: `metadata['mousa_plan_id']:'${plan.id}'`,
      });

      let productId: string;

      if (products.data.length > 0) {
        productId = products.data[0].id;
      } else {
        // Create new product
        const product = await stripe.products.create({
          name: `mousa.ai — ${plan.nameAr}`,
          description: plan.descriptionAr,
          metadata: {
            mousa_plan_id: plan.id,
            credits_per_month: plan.creditsPerMonth.toString(),
          },
        });
        productId = product.id;
        console.log(`[Stripe] Created product: ${product.name} (${productId})`);
      }

      // Search for existing price
      const prices = await stripe.prices.list({
        product: productId,
        active: true,
        type: "recurring",
      });

      let priceId: string;

      const matchingPrice = prices.data.find(
        (p) =>
          p.unit_amount === plan.amountCents &&
          p.currency === plan.currency &&
          p.recurring?.interval === "month"
      );

      if (matchingPrice) {
        priceId = matchingPrice.id;
      } else {
        // Create new price
        const price = await stripe.prices.create({
          product: productId,
          unit_amount: plan.amountCents,
          currency: plan.currency,
          recurring: { interval: "month" },
          metadata: {
            mousa_plan_id: plan.id,
            credits_per_month: plan.creditsPerMonth.toString(),
          },
        });
        priceId = price.id;
        console.log(`[Stripe] Created price: ${plan.id} → ${priceId} ($${plan.amountCents / 100}/mo)`);
      }

      priceIdCache[plan.id] = priceId;
      plan.stripePriceId = priceId;
    } catch (err) {
      console.error(`[Stripe] Failed to ensure product for plan ${plan.id}:`, err);
    }
  }

  console.log("[Stripe] Subscription products ready:", priceIdCache);
}

/**
 * Get the Stripe Price ID for a subscription plan.
 * Falls back to creating it if not cached.
 */
export function getPriceId(planId: string): string | undefined {
  return priceIdCache[planId] ?? getSubscriptionPlanById(planId)?.stripePriceId;
}

/**
 * Create a Stripe Checkout Session for a subscription.
 */
export async function createSubscriptionCheckoutSession(opts: {
  stripeCustomerId: string;
  planId: string;
  userId: number;
  origin: string;
}): Promise<string> {
  const stripe = getStripe();
  const plan = getSubscriptionPlanById(opts.planId);
  if (!plan) throw new Error(`Unknown subscription plan: ${opts.planId}`);

  const priceId = getPriceId(opts.planId);
  if (!priceId) throw new Error(`No Stripe Price ID for plan: ${opts.planId}. Run ensureSubscriptionProducts() first.`);

  const session = await stripe.checkout.sessions.create({
    customer: opts.stripeCustomerId,
    payment_method_types: ["card"],
    mode: "subscription",
    allow_promotion_codes: true,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    subscription_data: {
      metadata: {
        mousa_user_id: opts.userId.toString(),
        mousa_plan_id: opts.planId,
        credits_per_month: plan.creditsPerMonth.toString(),
      },
    },
    client_reference_id: opts.userId.toString(),
    metadata: {
      user_id: opts.userId.toString(),
      plan_id: opts.planId,
      credits_per_month: plan.creditsPerMonth.toString(),
    },
    success_url: `${opts.origin}/dashboard?subscription=success&plan=${opts.planId}`,
    cancel_url: `${opts.origin}/pricing?subscription=cancelled`,
  });

  if (!session.url) throw new Error("Stripe did not return a checkout URL");
  return session.url;
}

/**
 * Create a Stripe Billing Portal session for subscription management.
 * Users can cancel, upgrade, or update payment method here.
 */
export async function createBillingPortalSession(opts: {
  stripeCustomerId: string;
  origin: string;
}): Promise<string> {
  const stripe = getStripe();

  const session = await stripe.billingPortal.sessions.create({
    customer: opts.stripeCustomerId,
    return_url: `${opts.origin}/dashboard`,
  });

  return session.url;
}
