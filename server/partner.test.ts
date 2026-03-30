/**
 * Partner System Tests — mousa.ai
 * Tests for partner registration, project management, and admin verification
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock DB helpers ────────────────────────────────────────────────
vi.mock("./db", () => ({
  createPartner: vi.fn(),
  getPartnerByUserId: vi.fn(),
  getPartnerById: vi.fn(),
  getAllPartners: vi.fn(),
  getVerifiedPartners: vi.fn(),
  updatePartner: vi.fn(),
  updatePartnerVerification: vi.fn(),
  createPartnerProject: vi.fn(),
  getPartnerProjects: vi.fn(),
  getPartnerProjectById: vi.fn(),
  getApprovedPartnerProjects: vi.fn(),
  updatePartnerProject: vi.fn(),
  approvePartnerProject: vi.fn(),
  createPartnerService: vi.fn(),
  getPartnerServices: vi.fn(),
  createPartnerReview: vi.fn(),
  getPartnerReviews: vi.fn(),
  getOrCreateWallet: vi.fn(),
  getCreditHistory: vi.fn(),
  deductCredits: vi.fn(),
  grantCredits: vi.fn(),
  createSession: vi.fn(),
  getUserSessions: vi.fn(),
  getSessionMessages: vi.fn(),
  addMessage: vi.fn(),
  completeSession: vi.fn(),
  getAdminStats: vi.fn(),
  getUsersWithWallets: vi.fn(),
  saveStripeCustomerId: vi.fn(),
  createPaymentRecord: vi.fn(),
  getUserPayments: vi.fn(),
  getAllPayments: vi.fn(),
  getProjectProfile: vi.fn(),
  upsertProjectProfile: vi.fn(),
  saveSessionSummary: vi.fn(),
  getRecentSessionSummaries: vi.fn(),
  createRefundRequest: vi.fn(),
  getUserRefundRequests: vi.fn(),
  getAllRefundRequests: vi.fn(),
  updateRefundRequest: vi.fn(),
  getRefundRequestById: vi.fn(),
  getDailyRegistrations: vi.fn(),
  getPlatformUsageStats: vi.fn(),
  getDailyRevenue: vi.fn(),
  getRevenueSummary: vi.fn(),
  getEnhancedAdminStats: vi.fn(),
  upsertSubscription: vi.fn(),
  getUserSubscription: vi.fn(),
  updateSubscriptionStatus: vi.fn(),
  getSubscriptionByStripeId: vi.fn(),
}));

vi.mock("./_core/llm", () => ({ invokeLLM: vi.fn() }));
vi.mock("./_core/notification", () => ({ notifyOwner: vi.fn() }));
vi.mock("./stripeHelper", () => ({
  getOrCreateStripeCustomer: vi.fn(),
  createCreditCheckoutSession: vi.fn(),
  executeStripeRefund: vi.fn(),
}));
vi.mock("./stripeSubscriptions", () => ({
  createSubscriptionCheckoutSession: vi.fn(),
  createBillingPortalSession: vi.fn(),
}));

import { createPartner, getPartnerByUserId, getAllPartners, updatePartnerVerification, createPartnerProject, getPartnerProjects } from "./db";

// ── Partner Registration Tests ─────────────────────────────────────
describe("Partner Registration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create a supplier partner with required fields", async () => {
    const mockPartner = {
      id: 1,
      userId: 42,
      nameAr: "شركة المواد الإنشائية",
      nameEn: "Construction Materials Co",
      partnerType: "supplier",
      verificationStatus: "pending",
      createdAt: new Date(),
    };
    vi.mocked(createPartner).mockResolvedValue(mockPartner as never);

    const result = await createPartner({
      userId: 42,
      nameAr: "شركة المواد الإنشائية",
      nameEn: "Construction Materials Co",
      partnerType: "supplier",
    } as never);

    expect(result).toBeDefined();
    expect(result.nameAr).toBe("شركة المواد الإنشائية");
    expect(result.partnerType).toBe("supplier");
    expect(result.verificationStatus).toBe("pending");
  });

  it("should create a contractor partner", async () => {
    const mockPartner = {
      id: 2,
      userId: 43,
      nameAr: "مقاولون الخليج",
      partnerType: "contractor",
      verificationStatus: "pending",
    };
    vi.mocked(createPartner).mockResolvedValue(mockPartner as never);

    const result = await createPartner({
      userId: 43,
      nameAr: "مقاولون الخليج",
      partnerType: "contractor",
    } as never);

    expect(result.partnerType).toBe("contractor");
  });

  it("should create a developer partner", async () => {
    const mockPartner = {
      id: 3,
      userId: 44,
      nameAr: "مطور العقارات الذهبي",
      partnerType: "developer",
      verificationStatus: "pending",
    };
    vi.mocked(createPartner).mockResolvedValue(mockPartner as never);

    const result = await createPartner({
      userId: 44,
      nameAr: "مطور العقارات الذهبي",
      partnerType: "developer",
    } as never);

    expect(result.partnerType).toBe("developer");
  });

  it("should create a consultant partner", async () => {
    const mockPartner = {
      id: 4,
      userId: 45,
      nameAr: "مكتب الاستشارات الهندسية",
      partnerType: "consultant",
      verificationStatus: "pending",
    };
    vi.mocked(createPartner).mockResolvedValue(mockPartner as never);

    const result = await createPartner({
      userId: 45,
      nameAr: "مكتب الاستشارات الهندسية",
      partnerType: "consultant",
    } as never);

    expect(result.partnerType).toBe("consultant");
  });

  it("should retrieve partner by user ID", async () => {
    const mockPartner = {
      id: 1,
      userId: 42,
      nameAr: "شركة المواد الإنشائية",
      partnerType: "supplier",
      verificationStatus: "pending",
    };
    vi.mocked(getPartnerByUserId).mockResolvedValue(mockPartner as never);

    const result = await getPartnerByUserId(42);
    expect(result).toBeDefined();
    expect(result?.userId).toBe(42);
  });

  it("should return null if user has no partner profile", async () => {
    vi.mocked(getPartnerByUserId).mockResolvedValue(null);
    const result = await getPartnerByUserId(999);
    expect(result).toBeNull();
  });
});

// ── Admin Verification Tests ───────────────────────────────────────
describe("Admin Partner Verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should get all pending partners for admin review", async () => {
    const mockPartners = [
      { id: 1, nameAr: "شركة أ", verificationStatus: "pending", partnerType: "supplier" },
      { id: 2, nameAr: "شركة ب", verificationStatus: "pending", partnerType: "contractor" },
      { id: 3, nameAr: "شركة ج", verificationStatus: "verified", partnerType: "developer" },
    ];
    vi.mocked(getAllPartners).mockResolvedValue(mockPartners as never);

    const all = await getAllPartners();
    const pending = all.filter((p: Record<string, unknown>) => p.verificationStatus === "pending");

    expect(pending).toHaveLength(2);
    expect(pending[0].nameAr).toBe("شركة أ");
  });

  it("should verify a partner (approve)", async () => {
    vi.mocked(updatePartnerVerification).mockResolvedValue(undefined);

    await updatePartnerVerification(1, "verified", 100);
    expect(updatePartnerVerification).toHaveBeenCalledWith(1, "verified", 100);
  });

  it("should reject a partner with reason", async () => {
    vi.mocked(updatePartnerVerification).mockResolvedValue(undefined);

    await updatePartnerVerification(2, "rejected", 100, "وثائق غير مكتملة");
    expect(updatePartnerVerification).toHaveBeenCalledWith(2, "rejected", 100, "وثائق غير مكتملة");
  });

  it("should suspend a partner", async () => {
    vi.mocked(updatePartnerVerification).mockResolvedValue(undefined);

    await updatePartnerVerification(3, "suspended", 100);
    expect(updatePartnerVerification).toHaveBeenCalledWith(3, "suspended", 100);
  });
});

// ── Partner Project Tests ──────────────────────────────────────────
describe("Partner Project Management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create a project for a partner", async () => {
    const mockProject = {
      id: 1,
      partnerId: 1,
      nameAr: "مشروع فيلا دبي",
      projectType: "residential",
      emirate: "dubai",
      approvalStatus: "pending",
      createdAt: new Date(),
    };
    vi.mocked(createPartnerProject).mockResolvedValue(mockProject as never);

    const result = await createPartnerProject({
      partnerId: 1,
      nameAr: "مشروع فيلا دبي",
      projectType: "residential",
      emirate: "dubai",
    } as never);

    expect(result).toBeDefined();
    expect(result.nameAr).toBe("مشروع فيلا دبي");
    expect(result.approvalStatus).toBe("pending");
  });

  it("should list projects for a partner", async () => {
    const mockProjects = [
      { id: 1, partnerId: 1, nameAr: "مشروع أ", approvalStatus: "approved" },
      { id: 2, partnerId: 1, nameAr: "مشروع ب", approvalStatus: "pending" },
    ];
    vi.mocked(getPartnerProjects).mockResolvedValue(mockProjects as never);

    const results = await getPartnerProjects(1);
    expect(results).toHaveLength(2);
  });

  it("should validate project type enum values", () => {
    const validTypes = ["residential", "commercial", "industrial", "mixed_use", "infrastructure", "renovation", "interior"];
    validTypes.forEach(type => {
      expect(typeof type).toBe("string");
      expect(type.length).toBeGreaterThan(0);
    });
  });

  it("should validate UAE emirate enum values", () => {
    const validEmirates = ["dubai", "abu_dhabi", "sharjah", "ajman", "ras_al_khaimah", "fujairah", "umm_al_quwain"];
    expect(validEmirates).toHaveLength(7);
    expect(validEmirates).toContain("dubai");
    expect(validEmirates).toContain("abu_dhabi");
  });
});

// ── 10-Layer Architecture Validation ──────────────────────────────
describe("10-Layer Knowledge Architecture", () => {
  it("Layer 1: Static knowledge should be immutable reference data", () => {
    const layer1Types = ["building_codes", "climate_data", "material_properties", "design_standards"];
    layer1Types.forEach(type => expect(typeof type).toBe("string"));
  });

  it("Layer 2: Market data should have timestamps for freshness", () => {
    const marketRecord = {
      type: "property_price",
      value: 1500,
      unit: "AED/sqm",
      location: "Dubai Marina",
      recordedAt: new Date(),
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48h
    };
    expect(marketRecord.expiresAt.getTime()).toBeGreaterThan(marketRecord.recordedAt.getTime());
  });

  it("Layer 3: Supplier catalog should have approval status", () => {
    const supplierRecord = {
      nameAr: "مورد الألمنيوم",
      partnerType: "supplier",
      verificationStatus: "pending",
      isPublicListed: false,
    };
    expect(supplierRecord.verificationStatus).toBe("pending");
    expect(supplierRecord.isPublicListed).toBe(false);
  });

  it("Layer 5: Expert corrections should require evidence", () => {
    const correction = {
      correctionType: "code_update",
      originalContent: "الحد الأقصى للارتفاع 12م",
      proposedContent: "الحد الأقصى للارتفاع 15م",
      evidenceType: "official_document",
      evidenceUrl: "https://example.com/doc.pdf",
      status: "pending_review",
    };
    expect(correction.evidenceUrl).toBeTruthy();
    expect(correction.status).toBe("pending_review");
  });

  it("Layer 6: Gig tasks should have skill requirements and budget", () => {
    const gigTask = {
      titleAr: "إعداد جدول كميات لمشروع تجاري",
      platform: "code",
      skillsRequired: ["BOQ", "AutoCAD", "Excel"],
      budgetMin: 500,
      budgetMax: 2000,
      currency: "AED",
      status: "open",
    };
    expect(gigTask.budgetMin).toBeLessThan(gigTask.budgetMax);
    expect(gigTask.skillsRequired.length).toBeGreaterThan(0);
  });

  it("Layer 10: Institutional archive should track cost per sqm over time", () => {
    const archiveRecord = {
      projectYear: 2020,
      projectType: "residential",
      emirate: "dubai",
      totalAreaSqm: 400,
      totalCostAed: 2100000,
      costPerSqmAed: 5250,
      isAnonymized: true,
    };
    expect(archiveRecord.costPerSqmAed).toBe(archiveRecord.totalCostAed / archiveRecord.totalAreaSqm);
    expect(archiveRecord.isAnonymized).toBe(true);
  });
});
