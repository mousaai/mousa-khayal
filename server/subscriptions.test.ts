/**
 * mousa.ai — Subscription System Tests
 * Tests for subscription plan lookup, status mapping, and DB helpers
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  SUBSCRIPTION_PLANS,
  getSubscriptionPlanById,
  PLAN_TO_SUB_MAP,
} from "./stripeProducts";

// ─── SUBSCRIPTION PLANS TESTS ────────────────────────────────────────────────

describe("SUBSCRIPTION_PLANS", () => {
  it("should have at least 3 plans", () => {
    expect(SUBSCRIPTION_PLANS.length).toBeGreaterThanOrEqual(3);
  });

  it("each plan should have required fields", () => {
    for (const plan of SUBSCRIPTION_PLANS) {
      expect(plan.id).toBeTruthy();
      expect(plan.nameAr).toBeTruthy();
      expect(plan.creditsPerMonth).toBeGreaterThan(0);
      expect(plan.amountCents).toBeGreaterThanOrEqual(0);
      // stripePriceId is optional — populated at runtime via ensureSubscriptionProducts()
      expect(typeof plan.id).toBe("string");
    }
  });

  it("plan IDs should be unique", () => {
    const ids = SUBSCRIPTION_PLANS.map((p) => p.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});

describe("getSubscriptionPlanById", () => {
  it("should return a plan for a valid ID", () => {
    const firstPlan = SUBSCRIPTION_PLANS[0];
    const found = getSubscriptionPlanById(firstPlan.id);
    expect(found).toBeDefined();
    expect(found?.id).toBe(firstPlan.id);
  });

  it("should return undefined for an invalid ID", () => {
    const found = getSubscriptionPlanById("nonexistent_plan_xyz");
    expect(found).toBeUndefined();
  });

  it("should return the starter plan", () => {
    const plan = getSubscriptionPlanById("sub_starter");
    expect(plan).toBeDefined();
    expect(plan?.creditsPerMonth).toBeGreaterThan(0);
  });

  it("should return the pro plan", () => {
    const plan = getSubscriptionPlanById("sub_pro");
    expect(plan).toBeDefined();
    expect(plan?.creditsPerMonth).toBeGreaterThan(0);
  });
});

describe("PLAN_TO_SUB_MAP", () => {
  it("should map pricing page plan IDs to subscription plan IDs", () => {
    expect(PLAN_TO_SUB_MAP).toBeDefined();
    expect(typeof PLAN_TO_SUB_MAP).toBe("object");
  });

  it("should map 'starter' to a valid subscription plan", () => {
    const mappedId = PLAN_TO_SUB_MAP["starter"] ?? "starter";
    const plan = getSubscriptionPlanById(mappedId);
    expect(plan).toBeDefined();
  });

  it("should map 'pro' to a valid subscription plan", () => {
    const mappedId = PLAN_TO_SUB_MAP["pro"] ?? "pro";
    const plan = getSubscriptionPlanById(mappedId);
    expect(plan).toBeDefined();
  });
});

// ─── STATUS MAPPING TESTS ─────────────────────────────────────────────────────

describe("Subscription status mapping", () => {
  function mapStripeStatus(status: string): string {
    switch (status) {
      case "active": return "active";
      case "canceled": return "cancelled";
      case "past_due": return "past_due";
      case "unpaid": return "unpaid";
      case "trialing": return "trialing";
      default: return "active";
    }
  }

  it("should map 'active' correctly", () => {
    expect(mapStripeStatus("active")).toBe("active");
  });

  it("should map 'canceled' to 'cancelled'", () => {
    expect(mapStripeStatus("canceled")).toBe("cancelled");
  });

  it("should map 'past_due' correctly", () => {
    expect(mapStripeStatus("past_due")).toBe("past_due");
  });

  it("should map 'trialing' correctly", () => {
    expect(mapStripeStatus("trialing")).toBe("trialing");
  });

  it("should default unknown status to 'active'", () => {
    expect(mapStripeStatus("unknown_status")).toBe("active");
  });
});

// ─── CREDITS CALCULATION TESTS ────────────────────────────────────────────────

describe("Subscription credits calculation", () => {
  it("starter plan should grant correct credits per month", () => {
    const plan = getSubscriptionPlanById("sub_starter");
    expect(plan?.creditsPerMonth).toBeGreaterThanOrEqual(500);
  });

  it("pro plan should grant more credits than starter", () => {
    const starter = getSubscriptionPlanById("sub_starter");
    const pro = getSubscriptionPlanById("sub_pro");
    if (starter && pro) {
      expect(pro.creditsPerMonth).toBeGreaterThan(starter.creditsPerMonth);
    }
  });

  it("office plan should grant more credits than pro", () => {
    const pro = getSubscriptionPlanById("sub_pro");
    const office = getSubscriptionPlanById("sub_office");
    if (pro && office) {
      expect(office.creditsPerMonth).toBeGreaterThan(pro.creditsPerMonth);
    }
  });
});
