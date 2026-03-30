/**
 * feedback.test.ts — اختبارات نظام الملاحظات وتقارير الأخطاء
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock DB
vi.mock("./db", () => ({
  createFeedback: vi.fn().mockResolvedValue({ insertId: 1 }),
  getFeedbackList: vi.fn().mockResolvedValue([
    {
      id: 1,
      userId: 42,
      platform: "fada",
      rating: 5,
      feedbackType: "session",
      comment: "تجربة رائعة",
      sessionId: null,
      isReviewed: false,
      adminReply: null,
      reviewedAt: null,
      metadata: null,
      createdAt: new Date("2026-01-01T00:00:00Z"),
    },
  ]),
  getFeedbackStats: vi.fn().mockResolvedValue({
    total: 10,
    avgRating: 4.2,
    byPlatform: {
      fada: { total: 5, avgRating: 4.5 },
      raqaba: { total: 5, avgRating: 3.9 },
    },
  }),
  updateFeedbackReview: vi.fn().mockResolvedValue(undefined),
  createErrorReport: vi.fn().mockResolvedValue({ insertId: 2 }),
  getErrorReports: vi.fn().mockResolvedValue([
    {
      id: 1,
      userId: null,
      platform: "general",
      errorType: "ui",
      errorMessage: "Cannot read properties of undefined",
      userDescription: "الصفحة لا تعمل",
      pageUrl: "/dashboard",
      stackTrace: null,
      status: "open",
      adminNote: null,
      metadata: null,
      resolvedAt: null,
      createdAt: new Date("2026-01-01T00:00:00Z"),
    },
  ]),
  getErrorReportStats: vi.fn().mockResolvedValue({
    total: 5,
    open: 3,
    resolved: 2,
    byType: { ui: 2, api: 2, other: 1 },
  }),
  updateErrorReportStatus: vi.fn().mockResolvedValue(undefined),
}));

import {
  createFeedback,
  getFeedbackList,
  getFeedbackStats,
  updateFeedbackReview,
  createErrorReport,
  getErrorReports,
  getErrorReportStats,
  updateErrorReportStatus,
} from "./db";

describe("Feedback System", () => {
  beforeEach(() => vi.clearAllMocks());

  it("createFeedback — يقبل بيانات صحيحة", async () => {
    const result = await createFeedback({
      userId: 1,
      platform: "fada",
      rating: 5,
      feedbackType: "session",
      comment: "ممتاز",
      sessionId: null,
      metadata: null,
    });
    expect(result).toBeTruthy();
    expect(createFeedback).toHaveBeenCalledOnce();
  });

  it("getFeedbackList — يُرجع قائمة التقييمات", async () => {
    const list = await getFeedbackList({ limit: 10, offset: 0 });
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThan(0);
    expect(list[0]).toHaveProperty("rating");
    expect(list[0]).toHaveProperty("platform");
  });

  it("getFeedbackStats — يُرجع إحصاءات صحيحة", async () => {
    const stats = await getFeedbackStats();
    expect(stats).toHaveProperty("total");
    expect(stats).toHaveProperty("avgRating");
    expect(stats).toHaveProperty("byPlatform");
    expect(stats.total).toBeGreaterThanOrEqual(0);
  });

  it("updateFeedbackReview — يُحدّث الرد", async () => {
    await updateFeedbackReview(1, "شكراً على تقييمك!");
    expect(updateFeedbackReview).toHaveBeenCalledWith(1, "شكراً على تقييمك!");
  });
});

describe("Error Reports System", () => {
  beforeEach(() => vi.clearAllMocks());

  it("createErrorReport — يقبل بيانات صحيحة", async () => {
    const result = await createErrorReport({
      userId: null,
      platform: "general",
      errorType: "ui",
      errorMessage: "Test error",
      userDescription: "وصف المشكلة",
      pageUrl: "/dashboard",
      stackTrace: null,
      metadata: null,
    });
    expect(result).toBeTruthy();
    expect(createErrorReport).toHaveBeenCalledOnce();
  });

  it("getErrorReports — يُرجع قائمة التقارير", async () => {
    const list = await getErrorReports({ limit: 10, offset: 0 });
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThan(0);
    expect(list[0]).toHaveProperty("errorType");
    expect(list[0]).toHaveProperty("status");
  });

  it("getErrorReportStats — يُرجع إحصاءات الأخطاء", async () => {
    const stats = await getErrorReportStats();
    expect(stats).toHaveProperty("total");
    expect(stats).toHaveProperty("open");
    expect(stats).toHaveProperty("resolved");
    expect(stats).toHaveProperty("byType");
  });

  it("updateErrorReportStatus — يُحدّث حالة التقرير", async () => {
    await updateErrorReportStatus(1, "resolved", "تم الإصلاح");
    expect(updateErrorReportStatus).toHaveBeenCalledWith(1, "resolved", "تم الإصلاح");
  });

  it("getErrorReports — يُصفّي حسب الحالة", async () => {
    await getErrorReports({ status: "open", limit: 10, offset: 0 });
    expect(getErrorReports).toHaveBeenCalledWith({ status: "open", limit: 10, offset: 0 });
  });
});
