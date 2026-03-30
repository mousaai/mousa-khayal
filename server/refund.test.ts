/**
 * mousa.ai — Refund System Tests
 * Tests for refund request validation, status transitions, and business logic
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── REFUND REQUEST VALIDATION ───────────────────────────────────────────────

describe("Refund request validation", () => {
  function validateRefundRequest(input: {
    amountCents?: number;
    creditsToDeduct?: number;
    reason?: string;
    stripePaymentIntentId?: string;
  }) {
    const errors: string[] = [];
    if (!input.amountCents || input.amountCents < 1) errors.push("amountCents must be >= 1");
    if (input.creditsToDeduct === undefined || input.creditsToDeduct < 0) errors.push("creditsToDeduct must be >= 0");
    if (!input.reason || input.reason.trim().length < 10) errors.push("reason must be at least 10 chars");
    if (input.reason && input.reason.length > 1000) errors.push("reason must be <= 1000 chars");
    return errors;
  }

  it("should accept a valid refund request", () => {
    const errors = validateRefundRequest({
      amountCents: 999,
      creditsToDeduct: 500,
      reason: "المنتج لم يعمل كما هو موضح في الوصف",
      stripePaymentIntentId: "pi_test_123",
    });
    expect(errors).toHaveLength(0);
  });

  it("should reject zero amountCents", () => {
    const errors = validateRefundRequest({
      amountCents: 0,
      creditsToDeduct: 0,
      reason: "سبب الاسترداد الكافي",
    });
    expect(errors).toContain("amountCents must be >= 1");
  });

  it("should reject negative amountCents", () => {
    const errors = validateRefundRequest({
      amountCents: -100,
      creditsToDeduct: 0,
      reason: "سبب الاسترداد الكافي",
    });
    expect(errors).toContain("amountCents must be >= 1");
  });

  it("should reject short reason", () => {
    const errors = validateRefundRequest({
      amountCents: 999,
      creditsToDeduct: 0,
      reason: "قصير",
    });
    expect(errors).toContain("reason must be at least 10 chars");
  });

  it("should reject reason over 1000 chars", () => {
    const errors = validateRefundRequest({
      amountCents: 999,
      creditsToDeduct: 0,
      reason: "أ".repeat(1001),
    });
    expect(errors).toContain("reason must be <= 1000 chars");
  });

  it("should accept zero creditsToDeduct (subscription refund)", () => {
    const errors = validateRefundRequest({
      amountCents: 1399,
      creditsToDeduct: 0,
      reason: "لم أستخدم الاشتراك بعد التجديد",
    });
    // creditsToDeduct=0 is valid
    expect(errors.filter(e => e.includes("creditsToDeduct"))).toHaveLength(0);
  });
});

// ─── REFUND STATUS TRANSITIONS ────────────────────────────────────────────────

describe("Refund status transitions", () => {
  type RefundStatus = "pending" | "approved" | "rejected" | "refunded";

  function canTransition(from: RefundStatus, to: RefundStatus): boolean {
    const allowed: Record<RefundStatus, RefundStatus[]> = {
      pending: ["approved", "rejected"],
      approved: ["refunded"],
      rejected: [],
      refunded: [],
    };
    return allowed[from].includes(to);
  }

  it("pending → approved should be allowed", () => {
    expect(canTransition("pending", "approved")).toBe(true);
  });

  it("pending → rejected should be allowed", () => {
    expect(canTransition("pending", "rejected")).toBe(true);
  });

  it("approved → refunded should be allowed", () => {
    expect(canTransition("approved", "refunded")).toBe(true);
  });

  it("rejected → approved should NOT be allowed", () => {
    expect(canTransition("rejected", "approved")).toBe(false);
  });

  it("refunded → pending should NOT be allowed", () => {
    expect(canTransition("refunded", "pending")).toBe(false);
  });

  it("pending → refunded should NOT be allowed (must go through approved)", () => {
    expect(canTransition("pending", "refunded")).toBe(false);
  });
});

// ─── REFUND AMOUNT CALCULATION ────────────────────────────────────────────────

describe("Refund amount calculation", () => {
  /**
   * Calculate refundable amount based on unused credits.
   * Formula: (unusedCredits / totalCredits) * totalAmountCents
   */
  function calculateRefundAmount(
    totalAmountCents: number,
    totalCredits: number,
    usedCredits: number
  ): number {
    if (totalCredits === 0) return 0;
    const unusedCredits = Math.max(0, totalCredits - usedCredits);
    const ratio = unusedCredits / totalCredits;
    return Math.floor(totalAmountCents * ratio);
  }

  it("should refund 100% when no credits used", () => {
    const refund = calculateRefundAmount(999, 500, 0);
    expect(refund).toBe(999);
  });

  it("should refund 50% when half credits used", () => {
    const refund = calculateRefundAmount(1000, 500, 250);
    expect(refund).toBe(500);
  });

  it("should refund 0 when all credits used", () => {
    const refund = calculateRefundAmount(999, 500, 500);
    expect(refund).toBe(0);
  });

  it("should refund 0 when more credits used than purchased (edge case)", () => {
    const refund = calculateRefundAmount(999, 500, 600);
    expect(refund).toBe(0);
  });

  it("should handle Starter package ($9.99, 500 credits)", () => {
    // User used 100 credits, 400 remaining
    const refund = calculateRefundAmount(999, 500, 100);
    // 400/500 = 0.8 → $7.99
    expect(refund).toBe(799);
  });

  it("should handle Pro package ($34.99, 2000 credits)", () => {
    // User used 0 credits
    const refund = calculateRefundAmount(3499, 2000, 0);
    expect(refund).toBe(3499);
  });

  it("should floor the result (no partial cents)", () => {
    // 1/3 of 100 cents = 33.33... → floor to 33
    const refund = calculateRefundAmount(100, 3, 2);
    expect(refund).toBe(33);
  });
});

// ─── 7-DAY REFUND WINDOW ──────────────────────────────────────────────────────

describe("Refund eligibility window", () => {
  function isWithinRefundWindow(purchaseDate: Date, requestDate: Date, windowDays = 7): boolean {
    const diffMs = requestDate.getTime() - purchaseDate.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    return diffDays <= windowDays;
  }

  it("should be eligible on day 0 (same day)", () => {
    const now = new Date();
    expect(isWithinRefundWindow(now, now)).toBe(true);
  });

  it("should be eligible on day 6", () => {
    const purchase = new Date("2026-01-01T00:00:00Z");
    const request = new Date("2026-01-07T00:00:00Z"); // 6 days later
    expect(isWithinRefundWindow(purchase, request)).toBe(true);
  });

  it("should be eligible exactly on day 7", () => {
    const purchase = new Date("2026-01-01T00:00:00Z");
    const request = new Date("2026-01-08T00:00:00Z"); // exactly 7 days
    expect(isWithinRefundWindow(purchase, request)).toBe(true);
  });

  it("should NOT be eligible on day 8", () => {
    const purchase = new Date("2026-01-01T00:00:00Z");
    const request = new Date("2026-01-09T00:00:00Z"); // 8 days later
    expect(isWithinRefundWindow(purchase, request)).toBe(false);
  });

  it("should NOT be eligible on day 30", () => {
    const purchase = new Date("2026-01-01T00:00:00Z");
    const request = new Date("2026-01-31T00:00:00Z");
    expect(isWithinRefundWindow(purchase, request)).toBe(false);
  });
});

// ─── DUPLICATE REFUND PREVENTION ─────────────────────────────────────────────

describe("Duplicate refund prevention", () => {
  interface RefundRecord {
    stripePaymentIntentId: string | null;
    status: "pending" | "approved" | "rejected" | "refunded";
  }

  function hasPendingRefund(
    existing: RefundRecord[],
    paymentIntentId: string
  ): boolean {
    return existing.some(
      (r) => r.stripePaymentIntentId === paymentIntentId && r.status === "pending"
    );
  }

  it("should detect existing pending refund for same payment", () => {
    const existing: RefundRecord[] = [
      { stripePaymentIntentId: "pi_test_123", status: "pending" },
    ];
    expect(hasPendingRefund(existing, "pi_test_123")).toBe(true);
  });

  it("should allow new refund for different payment", () => {
    const existing: RefundRecord[] = [
      { stripePaymentIntentId: "pi_test_123", status: "pending" },
    ];
    expect(hasPendingRefund(existing, "pi_test_456")).toBe(false);
  });

  it("should allow new refund if previous was rejected", () => {
    const existing: RefundRecord[] = [
      { stripePaymentIntentId: "pi_test_123", status: "rejected" },
    ];
    expect(hasPendingRefund(existing, "pi_test_123")).toBe(false);
  });

  it("should allow new refund if previous was refunded", () => {
    const existing: RefundRecord[] = [
      { stripePaymentIntentId: "pi_test_123", status: "refunded" },
    ];
    expect(hasPendingRefund(existing, "pi_test_123")).toBe(false);
  });

  it("should handle empty existing refunds", () => {
    expect(hasPendingRefund([], "pi_test_123")).toBe(false);
  });
});

// ─── REFUND DISPLAY FORMATTING ────────────────────────────────────────────────

describe("Refund display formatting", () => {
  function formatRefundAmount(amountCents: number, currency = "usd"): string {
    const amount = amountCents / 100;
    if (currency === "usd") return `$${amount.toFixed(2)}`;
    return `${amount.toFixed(2)} ${currency.toUpperCase()}`;
  }

  function formatRefundStatus(status: string): { label: string; color: string } {
    switch (status) {
      case "pending": return { label: "قيد المراجعة", color: "#D4A017" };
      case "approved": return { label: "موافق عليه", color: "#4A9B7F" };
      case "rejected": return { label: "مرفوض", color: "#E2724A" };
      case "refunded": return { label: "تم الاسترداد", color: "#5B8DD9" };
      default: return { label: "غير معروف", color: "#8A9BB0" };
    }
  }

  it("should format $9.99 correctly", () => {
    expect(formatRefundAmount(999)).toBe("$9.99");
  });

  it("should format $34.99 correctly", () => {
    expect(formatRefundAmount(3499)).toBe("$34.99");
  });

  it("should format $0.00 correctly", () => {
    expect(formatRefundAmount(0)).toBe("$0.00");
  });

  it("should show Arabic label for pending status", () => {
    const { label } = formatRefundStatus("pending");
    expect(label).toBe("قيد المراجعة");
  });

  it("should show Arabic label for refunded status", () => {
    const { label } = formatRefundStatus("refunded");
    expect(label).toBe("تم الاسترداد");
  });

  it("should show Arabic label for rejected status", () => {
    const { label } = formatRefundStatus("rejected");
    expect(label).toBe("مرفوض");
  });

  it("should handle unknown status gracefully", () => {
    const { label } = formatRefundStatus("unknown");
    expect(label).toBe("غير معروف");
  });
});
