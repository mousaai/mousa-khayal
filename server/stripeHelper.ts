/**
 * mousa.ai — Stripe Server Helper
 * Handles checkout session creation and customer management.
 */
import Stripe from "stripe";
import { ENV } from "./_core/env";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = ENV.stripeSecretKey;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
    _stripe = new Stripe(key, { apiVersion: "2026-02-25.clover" });
  }
  return _stripe;
}

/**
 * Get or create a Stripe customer for a user.
 */
export async function getOrCreateStripeCustomer(
  userId: number,
  email: string | null | undefined,
  name: string | null | undefined,
  existingCustomerId: string | null | undefined
): Promise<string> {
  const stripe = getStripe();

  if (existingCustomerId) {
    try {
      const customer = await stripe.customers.retrieve(existingCustomerId);
      if (!customer.deleted) return existingCustomerId;
    } catch {
      // Customer not found in Stripe, create a new one
    }
  }

  const customer = await stripe.customers.create({
    email: email ?? undefined,
    name: name ?? undefined,
    metadata: { userId: userId.toString() },
  });

  return customer.id;
}

/**
 * Create a Stripe Checkout Session for a one-time credit purchase.
 */
export async function createCreditCheckoutSession(opts: {
  stripeCustomerId: string;
  packageId: string;
  packageNameAr: string;
  credits: number;
  amountCents: number;
  currency: string;
  userId: number;
  userEmail: string | null | undefined;
  userName: string | null | undefined;
  origin: string;
}): Promise<string> {
  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    customer: opts.stripeCustomerId,
    payment_method_types: ["card"],
    mode: "payment",
    allow_promotion_codes: true,
    line_items: [
      {
        price_data: {
          currency: opts.currency,
          unit_amount: opts.amountCents,
          product_data: {
            name: `mousa.ai — ${opts.packageNameAr} (${opts.credits.toLocaleString()} كريدت)`,
            description: `${opts.credits.toLocaleString()} كريدت لاستخدام منصات mousa.ai الذكية`,
            images: ["https://d2xsxph8kpxj0f.cloudfront.net/310519663315855165/6PpfERRQXfuwb7GGi2gFrK/card-fada-v5-oBLwHF6AVy4AnByv8vacTD.webp"],
          },
        },
        quantity: 1,
      },
    ],
    client_reference_id: opts.userId.toString(),
    metadata: {
      user_id: opts.userId.toString(),
      package_id: opts.packageId,
      credits: opts.credits.toString(),
      customer_email: opts.userEmail ?? "",
      customer_name: opts.userName ?? "",
    },
    success_url: `${opts.origin}/dashboard?payment=success&credits=${opts.credits}`,
    cancel_url: `${opts.origin}/pricing?payment=cancelled`,
  });

  if (!session.url) throw new Error("Stripe did not return a checkout URL");
  return session.url;
}

/**
 * Execute a Stripe refund for a payment intent.
 * Returns the Stripe Refund object.
 */
export async function executeStripeRefund(opts: {
  stripePaymentIntentId: string;
  amountCents?: number; // if omitted, full refund
  reason?: "duplicate" | "fraudulent" | "requested_by_customer";
}): Promise<Stripe.Refund> {
  const stripe = getStripe();
  const refund = await stripe.refunds.create({
    payment_intent: opts.stripePaymentIntentId,
    amount: opts.amountCents,
    reason: opts.reason ?? "requested_by_customer",
  });
  return refund;
}
