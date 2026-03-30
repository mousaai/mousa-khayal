/**
 * mousa.ai — Stripe Webhook Handler
 * Registered BEFORE express.json() so raw body is available for signature verification.
 *
 * Handles both:
 * - One-time credit purchases (checkout.session.completed with mode=payment)
 * - Monthly subscriptions (checkout.session.completed with mode=subscription,
 *   customer.subscription.*, invoice.paid)
 */
import express, { type Express, type Request, type Response } from "express";
import Stripe from "stripe";
import { ENV } from "./_core/env";
import { getStripe } from "./stripeHelper";
import {
  completePayment,
  grantCredits,
  upsertSubscription,
  updateSubscriptionStatus,
  getSubscriptionByStripeId,
} from "./db";
import { getSubscriptionPlanById } from "./stripeProducts";
import {
  sendSubscriptionWelcomeEmail,
  sendRenewalEmail,
  sendCancellationEmail,
} from "./emailService";
import { getUserById } from "./db";

export function registerStripeWebhook(app: Express) {
  // Raw body parser for this route only — must come before express.json()
  app.post(
    "/api/stripe/webhook",
    express.raw({ type: "application/json" }),
    async (req: Request, res: Response) => {
      const sig = req.headers["stripe-signature"];

      let event: Stripe.Event;

      try {
        if (!sig) {
          console.error("[Stripe Webhook] Missing stripe-signature header");
          res.status(400).json({ error: "Missing stripe-signature header" });
          return;
        }

        const stripe = getStripe();

        // Try both Live and Test webhook secrets — whichever verifies successfully is used.
        // This handles cases where the server NODE_ENV doesn't match the Stripe environment.
        const secrets = [
          ENV.stripeWebhookSecretLive,
          ENV.stripeWebhookSecret,
        ].filter(Boolean);

        if (secrets.length === 0) {
          console.error("[Stripe Webhook] No webhook secrets configured");
          res.status(400).json({ error: "No webhook secrets configured" });
          return;
        }

        let lastError: Error | null = null;
        let verified = false;
        for (const secret of secrets) {
          try {
            event = stripe.webhooks.constructEvent(req.body, sig, secret);
            verified = true;
            break;
          } catch (e) {
            lastError = e instanceof Error ? e : new Error(String(e));
          }
        }

        if (!verified || !event!) {
          const message = lastError?.message ?? "Signature verification failed";
          console.error("[Stripe Webhook] Signature verification failed with all secrets:", message);
          res.status(400).json({ error: `Webhook Error: ${message}` });
          return;
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("[Stripe Webhook] Unexpected error during verification:", message);
        res.status(400).json({ error: `Webhook Error: ${message}` });
        return;
      }

      // ⚠️ REQUIRED: Handle test events for webhook verification
      if (event.id.startsWith("evt_test_")) {
        console.log("[Stripe Webhook] Test event detected, returning verification response");
        res.json({ verified: true });
        return;
      }

      console.log(`[Stripe Webhook] Received event: ${event.type} (${event.id})`);

      try {
        switch (event.type) {

          // ─── ONE-TIME PAYMENT ────────────────────────────────────────────────
          case "checkout.session.completed": {
            const session = event.data.object as Stripe.Checkout.Session;

            if (session.mode === "payment") {
              // One-time credit purchase
              const stripeSessionId = session.id;
              const stripePaymentIntentId =
                typeof session.payment_intent === "string"
                  ? session.payment_intent
                  : session.payment_intent?.id ?? "";

              const result = await completePayment(stripeSessionId, stripePaymentIntentId);
              if (result) {
                const description = `شراء كريدت عبر Stripe — ${result.creditsGranted.toLocaleString()} كريدت`;
                await grantCredits(result.userId, result.creditsGranted, "purchase", description);
                console.log(`[Stripe Webhook] Granted ${result.creditsGranted} credits to user ${result.userId}`);
              } else {
                console.warn(`[Stripe Webhook] Payment already processed or not found: ${stripeSessionId}`);
              }
            } else if (session.mode === "subscription") {
              // Subscription checkout completed — the subscription.created event will handle the rest
              console.log(`[Stripe Webhook] Subscription checkout completed: ${session.id}`);
            }
            break;
          }

          // ─── SUBSCRIPTION CREATED / UPDATED ─────────────────────────────────
          case "customer.subscription.created":
          case "customer.subscription.updated": {
            const sub = event.data.object as Stripe.Subscription;
            await handleSubscriptionUpsert(sub);
            break;
          }

          // ─── SUBSCRIPTION DELETED (cancelled) ────────────────────────────────
          case "customer.subscription.deleted": {
            const sub = event.data.object as Stripe.Subscription;
            await updateSubscriptionStatus(sub.id, "cancelled", { cancelAtPeriodEnd: false });
            console.log(`[Stripe Webhook] Subscription cancelled: ${sub.id}`);

            // Send cancellation email
            const subMeta = sub.metadata ?? {};
            const cancelUserId = subMeta.mousa_user_id ? parseInt(subMeta.mousa_user_id, 10) : null;
            const cancelPlanId = subMeta.mousa_plan_id;
            if (cancelUserId && cancelPlanId) {
              const cancelUser = await getUserById(cancelUserId);
              const cancelPlan = getSubscriptionPlanById(cancelPlanId);
              const cancelPeriodEnd = new Date((sub as unknown as { current_period_end: number }).current_period_end * 1000);
              if (cancelUser?.email && cancelPlan) {
                await sendCancellationEmail({
                  toEmail: cancelUser.email,
                  userName: cancelUser.name ?? "عزيزي المشترك",
                  planNameAr: cancelPlan.nameAr,
                  periodEnd: cancelPeriodEnd,
                });
              }
            }
            break;
          }

          // ─── INVOICE PAID (monthly renewal) ─────────────────────────────────
          case "invoice.paid": {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const invoice = event.data.object as any;
            const stripeSubId: string | undefined =
              typeof invoice.subscription === "string"
                ? invoice.subscription
                : invoice.subscription?.id;

            if (!stripeSubId) break;

            // Only grant credits on renewal (not on the first payment — that's handled by subscription.created)
            if (invoice.billing_reason === "subscription_cycle") {
              const existingSub = await getSubscriptionByStripeId(stripeSubId);
              if (existingSub) {
                const description = `تجديد اشتراك ${existingSub.planNameAr} — ${existingSub.creditsPerMonth.toLocaleString()} كريدت`;
                await grantCredits(existingSub.userId, existingSub.creditsPerMonth, "purchase", description);
                console.log(`[Stripe Webhook] Renewal credits granted: ${existingSub.creditsPerMonth} to user ${existingSub.userId}`);

                // Send renewal email
                const renewalUser = await getUserById(existingSub.userId);
                if (renewalUser?.email) {
                  const renewalPeriodEnd = existingSub.currentPeriodEnd ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                  await sendRenewalEmail({
                    toEmail: renewalUser.email,
                    userName: renewalUser.name ?? "عزيزي المشترك",
                    planNameAr: existingSub.planNameAr,
                    creditsGranted: existingSub.creditsPerMonth,
                    periodEnd: renewalPeriodEnd,
                  });
                }
              }
            }
            break;
          }

          // ─── INVOICE PAYMENT FAILED ──────────────────────────────────────────
          case "invoice.payment_failed": {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const invoice = event.data.object as any;
            const stripeSubId: string | undefined =
              typeof invoice.subscription === "string"
                ? invoice.subscription
                : invoice.subscription?.id;

            if (stripeSubId) {
              await updateSubscriptionStatus(stripeSubId, "past_due");
              console.warn(`[Stripe Webhook] Invoice payment failed for subscription: ${stripeSubId}`);
            }
            break;
          }

          case "payment_intent.payment_failed": {
            const pi = event.data.object as Stripe.PaymentIntent;
            console.warn(`[Stripe Webhook] Payment failed: ${pi.id}`);
            break;
          }

          default:
            console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("[Stripe Webhook] Handler error:", message);
        res.status(500).json({ error: "Webhook handler failed" });
        return;
      }

      res.json({ received: true });
    }
  );
}

/**
 * Upsert a subscription record from a Stripe Subscription object.
 * Also grants initial credits when a new subscription is created.
 */
async function handleSubscriptionUpsert(sub: Stripe.Subscription): Promise<void> {
  const stripe = getStripe();

  // Extract plan metadata from subscription metadata or price metadata
  const subMeta = sub.metadata ?? {};
  const planId = subMeta.mousa_plan_id;
  const userId = subMeta.mousa_user_id ? parseInt(subMeta.mousa_user_id, 10) : null;

  if (!planId || !userId) {
    console.warn(`[Stripe Webhook] Subscription missing mousa metadata: ${sub.id}`);
    return;
  }

  const plan = getSubscriptionPlanById(planId);
  if (!plan) {
    console.warn(`[Stripe Webhook] Unknown plan ID: ${planId}`);
    return;
  }

  const priceItem = sub.items.data[0];
  const stripePriceId = priceItem?.price?.id ?? "";
  const stripeCustomerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;

  const status = mapStripeStatus(sub.status);
  const currentPeriodStart = new Date((sub as unknown as { current_period_start: number }).current_period_start * 1000);
  const currentPeriodEnd = new Date((sub as unknown as { current_period_end: number }).current_period_end * 1000);
  const cancelAtPeriodEnd = (sub as unknown as { cancel_at_period_end: boolean }).cancel_at_period_end ?? false;

  await upsertSubscription({
    userId,
    stripeSubscriptionId: sub.id,
    stripeCustomerId,
    stripePriceId,
    planId,
    planNameAr: plan.nameAr,
    creditsPerMonth: plan.creditsPerMonth,
    amountCents: plan.amountCents,
    currency: plan.currency,
    status,
    currentPeriodStart,
    currentPeriodEnd,
    cancelAtPeriodEnd,
  });

  // Grant initial credits on new subscription creation
  if (sub.status === "active") {
    // Check if this is a new subscription (created event) by looking at created timestamp
    const isNew = (sub as unknown as { created: number }).created === (sub as unknown as { current_period_start: number }).current_period_start;
    if (isNew) {
      const description = `اشتراك جديد — ${plan.nameAr} — ${plan.creditsPerMonth.toLocaleString()} كريدت`;
      await grantCredits(userId, plan.creditsPerMonth, "purchase", description);
      console.log(`[Stripe Webhook] Initial subscription credits granted: ${plan.creditsPerMonth} to user ${userId}`);

      // Send welcome email
      const user = await getUserById(userId);
      if (user?.email) {
        await sendSubscriptionWelcomeEmail({
          toEmail: user.email,
          userName: user.name ?? "عزيزي المشترك",
          planNameAr: plan.nameAr,
          creditsGranted: plan.creditsPerMonth,
          periodEnd: currentPeriodEnd,
        });
      }
    }
  }

  console.log(`[Stripe Webhook] Subscription upserted: ${sub.id} (${planId}, status: ${status}, user: ${userId})`);
}

function mapStripeStatus(status: string): "active" | "cancelled" | "past_due" | "unpaid" | "trialing" {
  switch (status) {
    case "active": return "active";
    case "canceled": return "cancelled";
    case "past_due": return "past_due";
    case "unpaid": return "unpaid";
    case "trialing": return "trialing";
    default: return "active";
  }
}
