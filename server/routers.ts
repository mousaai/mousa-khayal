import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import {
  getOrCreateWallet,
  getCreditHistory,
  deductCredits,
  grantCredits,
  createSession,
  getUserSessions,
  getSessionMessages,
  addMessage,
  completeSession,
  getAdminStats,
  getUsersWithWallets,
  saveStripeCustomerId,
  createPaymentRecord,
  getUserPayments,
  getAllPayments,
  getProjectProfile,
  upsertProjectProfile,
  saveSessionSummary,
  getRecentSessionSummaries,
  createRefundRequest,
  getUserRefundRequests,
  getAllRefundRequests,
  updateRefundRequest,
  getRefundRequestById,
  getDailyRegistrations,
  getPlatformUsageStats,
  getDailyRevenue,
  getRevenueSummary,
  getEnhancedAdminStats,
  createPartner,
  getPartnerByUserId,
  getPartnerById,
  getAllPartners,
  getVerifiedPartners,
  updatePartner,
  updatePartnerVerification,
  createPartnerProject,
  getPartnerProjects,
  getPartnerProjectById,
  getApprovedPartnerProjects,
  updatePartnerProject,
  approvePartnerProject,
  createPartnerService,
  getPartnerServices,
  createPartnerReview,
  getPartnerReviews,
  createArchiveContract,
  createArchiveDrawing,
  getArchiveContractsByUser,
  getArchiveDrawingsByUser,
  getPendingArchiveItems,
  createExpertCorrection,
  getUserExpertCorrections,
  getExpertCorrectionsByStatus,
  updateExpertCorrectionStatus,
  createGigTask,
  getOpenGigTasks,
  getUserGigTasks,
  createProject,
  getUserProjects,
  getProjectById,
  updateProject,
  getProjectDocuments,
  addProjectDocument,
  upsertUser,
  addCostLog,
  getCostLogs,
  getCostSummaryByPlatform,
  deleteCostLog,
  upsertCostBudget,
  getCostBudgets,
  getPlatformConsumptionStats,
  getMonthlyRevenue,
  getGuestTrial,
  createGuestTrial,
  markGuestTrialUsed,
  getGuestTrialStats,
  getSubscriberConsumption,
  getFullCostDashboard,
} from "./db";
import { CREDIT_PACKAGES, getPackageById, SUBSCRIPTION_PLANS, getSubscriptionPlanById, PLAN_TO_SUB_MAP } from "./stripeProducts";
import {
  validateDiscountCode,
  recordDiscountCodeUse,
  getAllDiscountCodes,
  createDiscountCode,
  toggleDiscountCode,
  getOrCreateReferralCode,
  getReferralCodeByCode,
  createReferral,
  getUserReferrals,
} from "./marketing";
import { SignJWT } from "jose";
import * as bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { getUserByEmail, updateUserFields } from "./db";
import { getOrCreateStripeCustomer, createCreditCheckoutSession, executeStripeRefund } from "./stripeHelper";
import { createSubscriptionCheckoutSession, createBillingPortalSession } from "./stripeSubscriptions";
import {
  upsertSubscription,
  getUserSubscription,
  updateSubscriptionStatus,
  getSubscriptionByStripeId,
} from "./db";

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "غير مصرح" });
  return next({ ctx });
});

const PLATFORM_CONFIGS = {
  fada: {
    name: "فضاء",
    creditCost: 20,
    systemPrompt: `أنت مستشار ذكاء اصطناعي متخصص في التصميم الداخلي والديكور. اسمك "فضاء". تساعد المهندسين والمصممين وأصحاب المشاريع في تقديم توصيات تصميمية احترافية للمساحات الداخلية، تحليل الإضاءة والألوان والأثاث والمواد، اقتراح حلول تصميمية مبتكرة تناسب الميزانية والذوق، وتقديم مخططات وصف تفصيلية للتنفيذ. أجب دائماً باللغة العربية، بأسلوب احترافي ومفصّل. قدّم توصياتك في نقاط منظمة مع شرح المبررات الهندسية.`,
  },
  raqaba: {
    name: "رقابة",
    creditCost: 30,
    systemPrompt: `أنت مشرف ميداني ذكي متخصص في الرقابة على البناء والإنشاء. اسمك "رقابة". تساعد في تحليل وتقييم مواقع البناء والإنشاء، رصد المخالفات الإنشائية والانحرافات عن المخططات، تقييم جودة التنفيذ والمواد المستخدمة، إعداد تقارير تفتيش احترافية، والتحقق من الامتثال لكودات البناء والسلامة. أجب باللغة العربية بأسلوب تقني دقيق. قدّم تقاريرك بصيغة منظمة تشمل: الملاحظات، المخالفات، التوصيات، والأولويات.`,
  },
  harara: {
    name: "حرارة",
    creditCost: 35,
    systemPrompt: `أنت محلل متخصص في الكفاءة الطاقوية والأحمال الحرارية للمباني. اسمك "حرارة". تساعد في حساب الأحمال الحرارية للتبريد والتدفئة، تحليل كفاءة العزل الحراري للمباني، تقييم استهلاك الطاقة وتقديم توصيات التحسين، حساب معامل الأداء الحراري للمواد، واقتراح أنظمة HVAC المناسبة. أجب باللغة العربية بأسلوب هندسي دقيق. قدّم الحسابات خطوة بخطوة مع الصيغ الهندسية المستخدمة.`,
  },
  maskan: {
    name: "مسكن",
    creditCost: 15,
    systemPrompt: `أنت مستشار متخصص في تحليل الاحتياجات السكنية والتمويل العقاري. اسمك "مسكن". تساعد في تحليل الاحتياجات السكنية للأسر بناءً على تركيبتها وميزانيتها، مقارنة خيارات الشراء والإيجار والبناء، تقييم الخيارات التمويلية والقروض العقارية، تحليل الأحياء والمواقع السكنية، وحساب تكاليف التملك الإجمالية. أجب باللغة العربية بأسلوب واضح ومبسط. قدّم توصياتك مع مقارنة الخيارات المتاحة بجداول واضحة.`,
  },
  code: {
    name: "كود",
    creditCost: 10,
    systemPrompt: `أنت مرجع متخصص في كودات البناء والمواصفات الهندسية. اسمك "كود". تساعد في البحث في كودات البناء والسلامة والاشتراطات الفنية، تفسير المواصفات والمعايير الهندسية، الإجابة على الاستفسارات المتعلقة بالكودات الإنشائية، مقارنة الكودات المحلية والدولية، وتوضيح متطلبات التراخيص والاشتراطات الرسمية. أجب باللغة العربية بأسلوب مرجعي دقيق. اذكر دائماً رقم البند أو المادة المرجعية عند الإمكان.`,
  },
  khayal: {
    name: "خيال",
    creditCost: 25,
    systemPrompt: `أنت مولّد مرئيات إبداعي متخصص في جميع المجالات. اسمك "خيال". تساعد في توليد أوصاف إبداعية ومرئية للمشاريع الفنية والمعمارية والعلمية والخيالية، تقديم توجيهات احترافية لتوليد الصور والمرئيات بالذكاء الاصطناعي، تحليل الأفكار الإبداعية وتطويرها بصرياً، واقتراح مفاهيم تصميمية مبتكرة. أجب باللغة العربية بأسلوب إبداعي ملهم. قدّم أوصافاً تفصيلية غنية بالتفاصيل البصرية.`,
  },
};

// ─── MARKETING ROUTER (defined before appRouter to avoid initialization order issues) ───
const marketingRouter = router({
  /** Validate a discount code before purchase */
  validateCode: protectedProcedure
    .input(z.object({
      code: z.string().min(1).max(64),
      amountCents: z.number().int().positive(),
      packageId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const result = await validateDiscountCode(
        input.code,
        ctx.user.id,
        input.amountCents,
        input.packageId
      );
      if (!result.valid) throw new TRPCError({ code: "BAD_REQUEST", message: result.error });
      const dc = result.discountCode!;
      return {
        valid: true,
        discountType: dc.discountType,
        discountValue: dc.discountValue,
        description: dc.description,
      };
    }),

  /** Get or create the current user's referral code */
  getMyReferralCode: protectedProcedure.query(async ({ ctx }) => {
    const rc = await getOrCreateReferralCode(ctx.user.id);
    const referrals = await getUserReferrals(ctx.user.id);
    const rewarded = referrals.filter(r => r.status === "rewarded").length;
    const pending = referrals.filter(r => r.status === "pending").length;
    return {
      code: rc.code,
      totalReferrals: rc.totalReferrals,
      totalCreditsEarned: rc.totalCreditsEarned,
      rewardedCount: rewarded,
      pendingCount: pending,
      referralUrl: `https://www.mousa.ai/r/${rc.code}`,
    };
  }),

  getAllCodes: adminProcedure.query(async () => getAllDiscountCodes()),

  createCode: adminProcedure
    .input(z.object({
      code: z.string().min(2).max(64).regex(/^[A-Z0-9_-]+$/i),
      description: z.string().optional(),
      discountType: z.enum(["percent", "credits"]),
      discountValue: z.number().int().positive(),
      maxUses: z.number().int().positive().optional(),
      maxUsesPerUser: z.number().int().positive().default(1),
      minAmountCents: z.number().int().nonnegative().optional(),
      expiresAt: z.date().optional(),
    }))
    .mutation(async ({ input }) => {
      await createDiscountCode(input);
      return { success: true };
    }),

  toggleCode: adminProcedure
    .input(z.object({ id: z.number().int(), isActive: z.boolean() }))
    .mutation(async ({ input }) => {
      await toggleDiscountCode(input.id, input.isActive);
      return { success: true };
    }),
});

export const appRouter = router({
  system: systemRouter,
  marketing: marketingRouter,
  analytics: router({
    getPlatformStats: adminProcedure
      .input(z.object({ month: z.string().regex(/^\d{4}-\d{2}$/) }))
      .query(async ({ input }) => {
        const [consumption, revenue] = await Promise.all([
          getPlatformConsumptionStats(input.month),
          getMonthlyRevenue(input.month),
        ]);
        return { consumption, revenue };
      }),
    getCostSummary: adminProcedure
      .input(z.object({ month: z.string().regex(/^\d{4}-\d{2}$/) }))
      .query(async ({ input }) => {
        const [costs, budgets] = await Promise.all([
          getCostSummaryByPlatform(input.month),
          getCostBudgets(input.month),
        ]);
        return { costs, budgets };
      }),
    getCostLogs: adminProcedure
      .input(z.object({
        platform: z.string().optional(),
        category: z.string().optional(),
        periodStart: z.string().optional(),
        periodEnd: z.string().optional(),
        limit: z.number().min(1).max(500).default(100),
      }))
      .query(async ({ input }) => getCostLogs(input)),
    addCostLog: adminProcedure
      .input(z.object({
        platform: z.enum(["fada", "raqaba", "harara", "maskan", "code", "khayal", "mousa_main", "shared"]),
        category: z.enum(["manus_hosting", "sub_platform_hosting", "llm_api", "tts_api", "stt_api", "storage", "database", "stripe_fees", "domain", "email_service", "other"]),
        amountCents: z.number().min(1),
        description: z.string().optional(),
        periodStart: z.string(),
        periodEnd: z.string(),
        invoiceRef: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await addCostLog({ ...input, loggedBy: ctx.user.id });
        return { success: true };
      }),
    deleteCostLog: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteCostLog(input.id);
        return { success: true };
      }),
    setBudget: adminProcedure
      .input(z.object({
        platform: z.enum(["fada", "raqaba", "harara", "maskan", "code", "khayal", "mousa_main", "shared"]),
        category: z.enum(["manus_hosting", "sub_platform_hosting", "llm_api", "tts_api", "stt_api", "storage", "database", "stripe_fees", "domain", "email_service", "other"]),
        monthlyBudgetCents: z.number().min(0),
        month: z.string().regex(/^\d{4}-\d{2}$/),
      }))
      .mutation(async ({ input }) => {
        await upsertCostBudget(input);
        return { success: true };
      }),
    // ── داشبورد التكاليف الشامل ─────────────────────────────────────────────
    getFullDashboard: adminProcedure
      .input(z.object({ month: z.string().regex(/^\d{4}-\d{2}$/) }))
      .query(async ({ input }) => getFullCostDashboard(input.month)),
    getSubscriberConsumption: adminProcedure
      .input(z.object({ month: z.string().regex(/^\d{4}-\d{2}$/).optional() }))
      .query(async ({ input }) => getSubscriberConsumption(input.month)),
  }),

  // ── Feedback & Error Reports ────────────────────────────────────────────
  feedback: router({
    submit: publicProcedure
      .input(z.object({
        platform: z.string().default("general"),
        rating: z.number().min(1).max(5),
        feedbackType: z.enum(["session", "general", "feature", "bug"]).default("general"),
        comment: z.string().max(1000).optional(),
        sessionId: z.number().optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { createFeedback } = await import("./db");
        await createFeedback({
          userId: ctx.user?.id ?? null,
          platform: input.platform,
          rating: input.rating,
          feedbackType: input.feedbackType,
          comment: input.comment ?? null,
          sessionId: input.sessionId ?? null,
          metadata: input.metadata ?? null,
        });
        // إشعار فوري للمالك عند التقييمات السلبية (1-2 نجوم)
        if (input.rating <= 2) {
          const { notifyOwner } = await import("./_core/notification");
          const platformLabel = input.platform === "general" ? "عام" : input.platform.toUpperCase();
          const userName = ctx.user?.name ?? "مستخدم غير مسجل";
          await notifyOwner({
            title: `⚠️ تقييم سلبي — ${input.rating}/5 ⭐ (منصة ${platformLabel})`,
            content: [
              `المستخدم: ${userName}`,
              `التقييم: ${input.rating}/5 ⭐`,
              `نوع الملاحظة: ${input.feedbackType}`,
              input.comment ? `التعليق: ${input.comment}` : "لا يوجد تعليق",
            ].join("\n"),
          }).catch(() => {}); // لا توقف الطلب إذا فشل الإشعار
        }
        return { success: true };
      }),
    getList: adminProcedure
      .input(z.object({
        platform: z.string().optional(),
        limit: z.number().min(1).max(200).default(50),
        offset: z.number().min(0).default(0),
      }))
      .query(async ({ input }) => {
        const { getFeedbackList } = await import("./db");
        return getFeedbackList(input);
      }),
    getStats: adminProcedure.query(async () => {
      const { getFeedbackStats } = await import("./db");
      return getFeedbackStats();
    }),
    weeklyTrend: adminProcedure.query(async () => {
      const { getFeedbackWeeklyTrend } = await import("./db");
      return getFeedbackWeeklyTrend(8);
    }),
    exportCsv: adminProcedure
      .input(z.object({ platform: z.string().optional() }))
      .query(async ({ input }) => {
        const { getFeedbackList } = await import("./db");
        const rows = await getFeedbackList({ platform: input.platform, limit: 5000, offset: 0 });
        const headers = ["ID", "المستخدم", "المنصة", "التقييم", "نوع الملاحظة", "التعليق", "رد الإدارة", "التاريخ"];
        const escape = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
        const lines = [
          headers.join(","),
          ...rows.map(r => [
            r.id, escape(r.userId ?? ""), escape(r.platform), r.rating,
            escape(r.feedbackType), escape(r.comment ?? ""),
            escape(r.adminReply ?? ""),
            new Date(r.createdAt).toISOString(),
          ].join(",")),
        ];
        return { csv: lines.join("\n"), count: rows.length };
      }),
    reply: adminProcedure
      .input(z.object({ id: z.number(), adminReply: z.string().max(500) }))
      .mutation(async ({ input }) => {
        const { updateFeedbackReview, getFeedbackById, getUserById } = await import("./db");
        // Get feedback before updating to get userId and original data
        const feedback = await getFeedbackById(input.id);
        await updateFeedbackReview(input.id, input.adminReply);
        // Send email notification to user if they have an account
        if (feedback?.userId) {
          try {
            const user = await getUserById(feedback.userId);
            if (user?.email) {
              const { sendFeedbackReplyEmail } = await import("./emailService");
              await sendFeedbackReplyEmail({
                toEmail: user.email,
                userName: user.name ?? user.email,
                platform: feedback.platform,
                originalComment: feedback.comment ?? "",
                adminReply: input.adminReply,
                rating: feedback.rating,
              });
            }
          } catch (emailErr) {
            console.warn("[Feedback] Email notification failed:", emailErr);
          }
        }
        return { success: true };
      }),
  }),

  errors: router({
    report: publicProcedure
      .input(z.object({
        platform: z.string().default("general"),
        errorType: z.enum(["ui", "api", "voice", "payment", "performance", "other"]).default("other"),
        errorMessage: z.string().max(2000).optional(),
        userDescription: z.string().max(1000).optional(),
        pageUrl: z.string().max(512).optional(),
        stackTrace: z.string().max(5000).optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { createErrorReport } = await import("./db");
        await createErrorReport({
          userId: ctx.user?.id ?? null,
          platform: input.platform,
          errorType: input.errorType,
          errorMessage: input.errorMessage ?? null,
          userDescription: input.userDescription ?? null,
          pageUrl: input.pageUrl ?? null,
          stackTrace: input.stackTrace ?? null,
          metadata: input.metadata ?? null,
        });
        // إشعار فوري للمالك عند كل تقرير خطأ جديد
        const { notifyOwner } = await import("./_core/notification");
        const platformLabel = input.platform === "general" ? "عام" : input.platform.toUpperCase();
        const userName = ctx.user?.name ?? "مستخدم غير مسجل";
        await notifyOwner({
          title: `🔴 خطأ جديد — ${input.errorType} (منصة ${platformLabel})`,
          content: [
            `المستخدم: ${userName}`,
            `نوع الخطأ: ${input.errorType}`,
            input.errorMessage ? `رسالة الخطأ: ${input.errorMessage.substring(0, 200)}` : "",
            input.userDescription ? `وصف المستخدم: ${input.userDescription}` : "",
            input.pageUrl ? `الصفحة: ${input.pageUrl}` : "",
          ].filter(Boolean).join("\n"),
        }).catch(() => {}); // لا توقف الطلب إذا فشل الإشعار
        return { success: true };
      }),
    getList: adminProcedure
      .input(z.object({
        status: z.enum(["open", "investigating", "resolved", "closed"]).optional(),
        limit: z.number().min(1).max(200).default(50),
        offset: z.number().min(0).default(0),
      }))
      .query(async ({ input }) => {
        const { getErrorReports } = await import("./db");
        return getErrorReports(input);
      }),
    getStats: adminProcedure.query(async () => {
      const { getErrorReportStats } = await import("./db");
      return getErrorReportStats();
    }),
    exportCsv: adminProcedure
      .input(z.object({ status: z.enum(["open", "investigating", "resolved", "closed"]).optional() }))
      .query(async ({ input }) => {
        const { getErrorReports } = await import("./db");
        const rows = await getErrorReports({ status: input.status, limit: 5000, offset: 0 });
        const headers = ["ID", "المستخدم", "المنصة", "نوع الخطأ", "رسالة الخطأ", "وصف المستخدم", "الحالة", "الصفحة", "التاريخ"];
        const escape = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
        const lines = [
          headers.join(","),
          ...rows.map(r => [
            r.id, escape(r.userId ?? ""), escape(r.platform),
            escape(r.errorType), escape(r.errorMessage ?? ""),
            escape(r.userDescription ?? ""), escape(r.status),
            escape(r.pageUrl ?? ""),
            new Date(r.createdAt).toISOString(),
          ].join(",")),
        ];
        return { csv: lines.join("\n"), count: rows.length };
      }),
    updateStatus: adminProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["open", "investigating", "resolved", "closed"]),
        adminNote: z.string().max(500).optional(),
      }))
      .mutation(async ({ input }) => {
        const { updateErrorReportStatus } = await import("./db");
        await updateErrorReportStatus(input.id, input.status, input.adminNote);
        return { success: true };
      }),
  }),

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),

    // ── Independent email/password registration ──────────────────────────────
    register: publicProcedure
      .input(z.object({
        name: z.string().min(2).max(100),
        email: z.string().email(),
        password: z.string().min(8).max(128),
      }))
      .mutation(async ({ ctx, input }) => {
        const existing = await getUserByEmail(input.email);
        if (existing) throw new TRPCError({ code: "CONFLICT", message: "البريد الإلكتروني مسجل مسبقاً" });
        const passwordHash = await bcrypt.hash(input.password, 12);
        const openId = `local:${input.email}`;
        await upsertUser({ openId, name: input.name, email: input.email, loginMethod: "email", passwordHash, emailVerified: 1, lastSignedIn: new Date() });
        const user = await getUserByEmail(input.email);
        if (!user) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "فشل إنشاء الحساب" });
        await getOrCreateWallet(user.id);
        const { ENV } = await import("./_core/env");
        const secretKey = new TextEncoder().encode(ENV.cookieSecret);
        const token = await new SignJWT({ openId, appId: "mousa-ai", name: input.name })
          .setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime("1y").sign(secretKey);
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: 365 * 24 * 60 * 60 * 1000 });
        return { success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } };
      }),

    // ── Independent email/password login ─────────────────────────────────────
    loginWithPassword: publicProcedure
      .input(z.object({ email: z.string().email(), password: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        const user = await getUserByEmail(input.email);
        if (!user || !user.passwordHash) throw new TRPCError({ code: "UNAUTHORIZED", message: "البريد الإلكتروني أو كلمة المرور غير صحيحة" });
        const valid = await bcrypt.compare(input.password, user.passwordHash);
        if (!valid) throw new TRPCError({ code: "UNAUTHORIZED", message: "البريد الإلكتروني أو كلمة المرور غير صحيحة" });
        await updateUserFields(user.id, { lastSignedIn: new Date() });
        const { ENV } = await import("./_core/env");
        const secretKey = new TextEncoder().encode(ENV.cookieSecret);
        const token = await new SignJWT({ openId: user.openId, appId: "mousa-ai", name: user.name ?? "" })
          .setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime("1y").sign(secretKey);
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: 365 * 24 * 60 * 60 * 1000 });
        return { success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } };
      }),

    // ── Change password (logged-in users) ────────────────────────────────────
    changePassword: protectedProcedure
      .input(z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(8).max(128) }))
      .mutation(async ({ ctx, input }) => {
        const user = ctx.user;
        if (!user.passwordHash) throw new TRPCError({ code: "BAD_REQUEST", message: "هذا الحساب لا يستخدم كلمة مرور" });
        const valid = await bcrypt.compare(input.currentPassword, user.passwordHash);
        if (!valid) throw new TRPCError({ code: "UNAUTHORIZED", message: "كلمة المرور الحالية غير صحيحة" });
        const newHash = await bcrypt.hash(input.newPassword, 12);
        await updateUserFields(user.id, { passwordHash: newHash });
        return { success: true };
      }),

    // ── Forgot password ───────────────────────────────────────────────────────
    forgotPassword: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ input }) => {
        const user = await getUserByEmail(input.email);
        if (!user || !user.passwordHash) return { success: true }; // prevent enumeration
        const token = randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
        await updateUserFields(user.id, { verifyToken: token, verifyTokenExpiresAt: expiresAt });
        console.log(`[Auth] Password reset token for ${input.email}: ${token}`);
        return { success: true };
      }),

    // ── Reset password with token ─────────────────────────────────────────────
    resetPassword: publicProcedure
      .input(z.object({ email: z.string().email(), token: z.string().min(1), newPassword: z.string().min(8).max(128) }))
      .mutation(async ({ input }) => {
        const user = await getUserByEmail(input.email);
        if (!user || !user.verifyToken || user.verifyToken !== input.token)
          throw new TRPCError({ code: "BAD_REQUEST", message: "رمز إعادة التعيين غير صحيح أو منتهي الصلاحية" });
        if (user.verifyTokenExpiresAt && user.verifyTokenExpiresAt < new Date())
          throw new TRPCError({ code: "BAD_REQUEST", message: "انتهت صلاحية رمز إعادة التعيين" });
        const newHash = await bcrypt.hash(input.newPassword, 12);
        await updateUserFields(user.id, { passwordHash: newHash, verifyToken: null, verifyTokenExpiresAt: null });
        return { success: true };
      }),
  }),

  credits: router({
    getBalance: protectedProcedure.query(async ({ ctx }) => {
      return getOrCreateWallet(ctx.user.id);
    }),
    getHistory: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(100).default(20) }))
      .query(async ({ ctx, input }) => {
        return getCreditHistory(ctx.user.id, input.limit);
      }),
    adminGrant: adminProcedure
      .input(z.object({ userId: z.number(), amount: z.number().min(1).max(10000), description: z.string() }))
      .mutation(async ({ input }) => {
        const newBalance = await grantCredits(input.userId, input.amount, "admin_grant", input.description);
        return { success: true, newBalance };
      }),
  }),

  sessions: router({
    list: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(50).default(20) }))
      .query(async ({ ctx, input }) => {
        return getUserSessions(ctx.user.id, input.limit);
      }),
    /** Load all messages for a session (for resume) */
    getMessages: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .query(async ({ ctx, input }) => {
        // Security: only allow user to load their own sessions
        const sessions = await getUserSessions(ctx.user.id, 200);
        const owned = sessions.find(s => s.id === input.sessionId);
        if (!owned) throw new TRPCError({ code: "FORBIDDEN", message: "غير مصرح" });
        return getSessionMessages(input.sessionId);
      }),
    /** طلب استرداد كريدت جلسة لم يستفد منها المستخدم */
    requestRefund: protectedProcedure
      .input(z.object({
        sessionId: z.number(),
        reason: z.string().min(10).max(500),
      }))
      .mutation(async ({ ctx, input }) => {
        const { createSessionRefund, hasExistingRefundRequest } = await import("./db");
        const sessions = await getUserSessions(ctx.user.id, 200);
        const session = sessions.find(s => s.id === input.sessionId);
        if (!session) throw new TRPCError({ code: "FORBIDDEN", message: "الجلسة غير موجودة أو لا تملكها" });
        if (!session.creditsUsed || session.creditsUsed === 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "هذه الجلسة لم تُستخدم فيها كريدت" });
        }
        const alreadyRequested = await hasExistingRefundRequest(ctx.user.id, input.sessionId);
        if (alreadyRequested) {
          throw new TRPCError({ code: "CONFLICT", message: "تم تقديم طلب استرداد لهذه الجلسة مسبقاً" });
        }
        const sessionAge = Date.now() - new Date(session.createdAt).getTime();
        const maxAge = 72 * 60 * 60 * 1000;
        if (sessionAge > maxAge) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "انتهت مدة طلب الاسترداد (72 ساعة من إنشاء الجلسة)" });
        }
        const refund = await createSessionRefund({
          userId: ctx.user.id,
          sessionId: input.sessionId,
          platform: session.platform,
          creditsToRefund: session.creditsUsed,
          reason: input.reason,
        });
        return refund;
      }),
    /** عرض طلبات الاسترداد للمستخدم الحالي */
    myRefunds: protectedProcedure.query(async ({ ctx }) => {
      const { getUserSessionRefunds } = await import("./db");
      return getUserSessionRefunds(ctx.user.id);
    }),
    /** عرض جميع طلبات الاسترداد (للمشرف) */
    allRefunds: adminProcedure.query(async () => {
      const { getAllSessionRefunds } = await import("./db");
      return getAllSessionRefunds();
    }),
    /** الموافقة أو رفض طلب الاسترداد (للمشرف) */
    reviewRefund: adminProcedure
      .input(z.object({
        refundId: z.number(),
        action: z.enum(["approve", "reject"]),
        adminNote: z.string().max(500).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { getSessionRefundById, updateSessionRefund } = await import("./db");
        const refund = await getSessionRefundById(input.refundId);
        if (!refund) throw new TRPCError({ code: "NOT_FOUND", message: "طلب الاسترداد غير موجود" });
        if (refund.status !== "pending") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "تم مراجعة هذا الطلب مسبقاً" });
        }
        await updateSessionRefund(input.refundId, {
          status: input.action === "approve" ? "approved" : "rejected",
          adminNote: input.adminNote,
          reviewedBy: ctx.user.id,
        });
        if (input.action === "approve") {
          await grantCredits(
            refund.userId,
            refund.creditsToRefund,
            "refund",
            `استرداد كريدت جلسة #${refund.sessionId} — ${refund.platform}`
          );
        }
        return { success: true, action: input.action, creditsRefunded: input.action === "approve" ? refund.creditsToRefund : 0 };
      }),
  }),

  /** Project memory profile — persistent context per user per platform */
  profile: router({
    get: protectedProcedure
      .input(z.object({ platform: z.enum(["fada", "raqaba", "harara", "maskan", "code", "khayal"]) }))
      .query(async ({ ctx, input }) => {
        return getProjectProfile(ctx.user.id, input.platform);
      }),
    save: protectedProcedure
      .input(z.object({
        platform: z.enum(["fada", "raqaba", "harara", "maskan", "code", "khayal"]),
        projectName: z.string().max(255).optional(),
        location: z.string().max(255).optional(),
        projectType: z.string().max(255).optional(),
        notes: z.string().max(2000).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { platform, ...data } = input;
        return upsertProjectProfile(ctx.user.id, platform, data);
      }),
  }),

  ai: router({
    chat: protectedProcedure
      .input(z.object({
        platform: z.enum(["fada", "raqaba", "harara", "maskan", "code", "khayal"]),
        message: z.string().min(1).max(4000),
        sessionId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const config = PLATFORM_CONFIGS[input.platform];
        const wallet = await getOrCreateWallet(ctx.user.id);
        if (wallet.balance < config.creditCost) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: `رصيد الكريدت غير كافٍ. تحتاج ${config.creditCost} كريدت وبرصيدك ${wallet.balance} كريدت.`,
          });
        }

        let sessionId = input.sessionId;
        if (!sessionId) {
          const session = await createSession(ctx.user.id, input.platform, input.message.substring(0, 80));
          sessionId = session.id;
        }

        await addMessage(sessionId, ctx.user.id, "user", input.message);
        const messages = await getSessionMessages(sessionId);
        const history = messages.map((m) => ({ role: m.role as "user" | "assistant" | "system", content: m.content }));

        // Build enriched system prompt with project profile + recent summaries
        let enrichedSystemPrompt = config.systemPrompt;

        // Inject project profile context
        const profile = await getProjectProfile(ctx.user.id, input.platform);
        if (profile && (profile.projectName || profile.location || profile.projectType || profile.notes)) {
          const profileContext = [
            profile.projectName ? `اسم المشروع: ${profile.projectName}` : null,
            profile.location ? `الموقع: ${profile.location}` : null,
            profile.projectType ? `نوع المشروع: ${profile.projectType}` : null,
            profile.notes ? `ملاحظات المستخدم: ${profile.notes}` : null,
          ].filter(Boolean).join("\n");
          enrichedSystemPrompt += `\n\n--- معلومات مشروع المستخدم (تذكّرها دائماً) ---\n${profileContext}`;
        }

        // Inject recent session summaries (cross-session memory)
        const recentSummaries = await getRecentSessionSummaries(ctx.user.id, input.platform, 3);
        if (recentSummaries.length > 0) {
          const summaryContext = recentSummaries.map((s, i) => `جلسة سابقة ${i + 1}: ${s}`).join("\n");
          enrichedSystemPrompt += `\n\n--- ملخص الجلسات السابقة مع هذا المستخدم ---\n${summaryContext}`;
        }

        const llmMessages = [{ role: "system" as const, content: enrichedSystemPrompt }, ...history];
        const response = await invokeLLM({ messages: llmMessages });
        const rawContent = response.choices[0]?.message?.content;
        const assistantContent = typeof rawContent === "string" ? rawContent : (rawContent ? JSON.stringify(rawContent) : "عذراً، حدث خطأ في المعالجة.");

        await addMessage(sessionId, ctx.user.id, "assistant", assistantContent);
        const deductResult = await deductCredits(ctx.user.id, config.creditCost, input.platform, `استخدام منصة ${config.name}`);
        if (!deductResult.success) {
          // Credit deduction failed after LLM responded — log and continue (user gets response)
          // This is a rare edge case; admin can reconcile via credit history
          console.error(`[Credits] Deduction failed for user ${ctx.user.id}: ${deductResult.error}`);
        }
        await completeSession(sessionId, config.creditCost);

        // Auto-generate session summary asynchronously (fire and forget)
        generateAndSaveSummary(sessionId, messages, assistantContent, config.name).catch(() => {});

        return { sessionId, response: assistantContent, creditsUsed: config.creditCost, newBalance: deductResult.newBalance };
      }),
  }),

  payments: router({
    getPackages: publicProcedure.query(() => CREDIT_PACKAGES),
    createCheckout: protectedProcedure
      .input(z.object({
        packageId: z.string(),
        origin: z.string().url(),
      }))
      .mutation(async ({ ctx, input }) => {
        const pkg = getPackageById(input.packageId);
        if (!pkg) throw new TRPCError({ code: "BAD_REQUEST", message: "الباقة غير موجودة" });
        const stripeCustomerId = await getOrCreateStripeCustomer(
          ctx.user.id, ctx.user.email, ctx.user.name, ctx.user.stripeCustomerId
        );
        if (stripeCustomerId !== ctx.user.stripeCustomerId) {
          await saveStripeCustomerId(ctx.user.id, stripeCustomerId);
        }
        await createPaymentRecord({
          userId: ctx.user.id,
          packageId: pkg.id,
          creditsGranted: pkg.credits,
          amountCents: pkg.amountCents,
          currency: pkg.currency,
        });
        const checkoutUrl = await createCreditCheckoutSession({
          stripeCustomerId,
          packageId: pkg.id,
          packageNameAr: pkg.nameAr,
          credits: pkg.credits,
          amountCents: pkg.amountCents,
          currency: pkg.currency,
          userId: ctx.user.id,
          userEmail: ctx.user.email,
          userName: ctx.user.name,
          origin: input.origin,
        });
        return { checkoutUrl };
      }),
    getHistory: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(50).default(20) }))
      .query(async ({ ctx, input }) => {
        return getUserPayments(ctx.user.id, input.limit);
      }),
  }),

  /** Platform Handoff — generate short-lived JWT for sub-platform authentication */
  platform: router({
    generateToken: protectedProcedure
      .input(z.object({
        platform: z.enum(["fada", "raqaba", "harara", "maskan", "code", "khayal"]),
      }))
      .mutation(async ({ ctx, input }) => {
        const wallet = await getOrCreateWallet(ctx.user.id);
        // لا نفرض قيداً على الرصيد هنا — المنصة الفرعية تحدد تكلفتها بنفسها
        // mousa.ai تدير الرصيد والتحصيل فقط
        const jwtSecret = new TextEncoder().encode(process.env.JWT_SECRET || "mousa-platform-secret-2024");
        const payload = {
          sub: String(ctx.user.id),
          openId: ctx.user.openId,
          name: ctx.user.name ?? "",
          email: ctx.user.email ?? "",
          creditBalance: wallet.balance,
          platform: input.platform,
          iss: "mousa.ai",
          type: "platform-handoff",
        };
        const token = await new SignJWT(payload)
          .setProtectedHeader({ alg: "HS256" })
          .setIssuedAt()
          .setExpirationTime("24h")
          .sign(jwtSecret);
        const PLATFORM_URLS: Record<string, string> = {
          fada:   "https://fada.mousa.ai/",
          raqaba: "https://raqaba.mousa.ai/",
          harara: "https://harara.mousa.ai/",
          maskan: "https://maskan.mousa.ai/",
          code:   "https://code.mousa.ai/",
          khayal: "https://khayal.mousa.ai/",
        };
        const platformUrl = `${PLATFORM_URLS[input.platform]}?token=${encodeURIComponent(token)}`;
        return { token, platformUrl, creditBalance: wallet.balance, expiresAt: Date.now() + 24 * 60 * 60 * 1000 };
      }),
  }),

  subscriptions: router({
    /** Get all available subscription plans */
    getPlans: publicProcedure.query(() => SUBSCRIPTION_PLANS),

    /** Get the current user's active subscription */
    getMy: protectedProcedure.query(async ({ ctx }) => {
      return getUserSubscription(ctx.user.id);
    }),

    /** Create a Stripe Checkout Session for a subscription plan */
    createCheckout: protectedProcedure
      .input(z.object({
        planId: z.string(), // e.g. "starter" | "pro" | "office"
        origin: z.string().url(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Map pricing page plan ID to subscription plan ID
        const subPlanId = PLAN_TO_SUB_MAP[input.planId] ?? input.planId;
        const plan = getSubscriptionPlanById(subPlanId);
        if (!plan) throw new TRPCError({ code: "BAD_REQUEST", message: "خطة الاشتراك غير موجودة" });

        const stripeCustomerId = await getOrCreateStripeCustomer(
          ctx.user.id, ctx.user.email, ctx.user.name, ctx.user.stripeCustomerId
        );
        if (stripeCustomerId !== ctx.user.stripeCustomerId) {
          await saveStripeCustomerId(ctx.user.id, stripeCustomerId);
        }

        const checkoutUrl = await createSubscriptionCheckoutSession({
          stripeCustomerId,
          planId: subPlanId,
          userId: ctx.user.id,
          origin: input.origin,
        });
        return { checkoutUrl };
      }),

    /** Open Stripe Billing Portal to manage/cancel subscription */
    managePortal: protectedProcedure
      .input(z.object({ origin: z.string().url() }))
      .mutation(async ({ ctx, input }) => {
        const stripeCustomerId = await getOrCreateStripeCustomer(
          ctx.user.id, ctx.user.email, ctx.user.name, ctx.user.stripeCustomerId
        );
        if (stripeCustomerId !== ctx.user.stripeCustomerId) {
          await saveStripeCustomerId(ctx.user.id, stripeCustomerId);
        }
        const portalUrl = await createBillingPortalSession({
          stripeCustomerId,
          origin: input.origin,
        });
        return { portalUrl };
      }),
  }),

  admin: router({
    getStats: adminProcedure.query(async () => getAdminStats()),
    getUsers: adminProcedure.query(async () => getUsersWithWallets()),
    grantCredits: adminProcedure
      .input(z.object({
        userId: z.number(),
        amount: z.number().min(1).max(100000),
        description: z.string().min(1).max(200),
      }))
      .mutation(async ({ input }) => {
        const newBalance = await grantCredits(input.userId, input.amount, "admin_grant", input.description);
        return { success: true, newBalance };
      }),
    deductCredits: adminProcedure
      .input(z.object({
        userId: z.number(),
        amount: z.number().min(1).max(100000),
        description: z.string().min(1).max(200),
      }))
      .mutation(async ({ input }) => {
        const result = await deductCredits(input.userId, input.amount, "admin_deduct", input.description);
        return result;
      }),
    getAllPayments: adminProcedure
      .input(z.object({ limit: z.number().min(1).max(200).default(50) }))
      .query(async ({ input }) => {
        return getAllPayments(input.limit);
      }),
    getAllRefundRequests: adminProcedure
      .query(async () => getAllRefundRequests()),
    reviewRefund: adminProcedure
      .input(z.object({
        refundRequestId: z.number(),
        action: z.enum(["approve", "reject"]),
        adminNote: z.string().max(500).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const request = await getRefundRequestById(input.refundRequestId);
        if (!request) throw new TRPCError({ code: "NOT_FOUND", message: "طلب الاسترداد غير موجود" });
        if (request.status !== "pending") throw new TRPCError({ code: "BAD_REQUEST", message: "تم معالجة هذا الطلب مسبقاً" });

        if (input.action === "reject") {
          await updateRefundRequest(request.id, {
            status: "rejected",
            adminNote: input.adminNote,
            reviewedBy: ctx.user.id,
          });
          return { success: true, message: "تم رفض طلب الاسترداد" };
        }

        // Approve: execute Stripe refund then deduct credits
        if (!request.stripePaymentIntentId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "لا يوجد payment intent ID لتنفيذ الاسترداد" });
        }

        const stripeRefund = await executeStripeRefund({
          stripePaymentIntentId: request.stripePaymentIntentId,
          amountCents: request.amountCents,
        });

        // Deduct credits from wallet
        await deductCredits(
          request.userId,
          request.creditsToDeduct,
          "refund",
          `استرداد طلب #${request.id}`
        );

        await updateRefundRequest(request.id, {
          status: "refunded",
          adminNote: input.adminNote,
          reviewedBy: ctx.user.id,
          stripeRefundId: stripeRefund.id,
        });

        return { success: true, message: `تم استرداد $${(request.amountCents / 100).toFixed(2)} بنجاح` };
      }),
    // ─── Analytics ───────────────────────────────────────────────────
    getEnhancedStats: adminProcedure.query(async () => getEnhancedAdminStats()),
    getDailyRegistrations: adminProcedure
      .input(z.object({ days: z.number().min(7).max(90).default(30) }))
      .query(async ({ input }) => getDailyRegistrations(input.days)),
    getPlatformUsage: adminProcedure.query(async () => getPlatformUsageStats()),
    getDailyRevenue: adminProcedure
      .input(z.object({ days: z.number().min(7).max(90).default(30) }))
      .query(async ({ input }) => getDailyRevenue(input.days)),
    getRevenueSummary: adminProcedure.query(async () => getRevenueSummary()),
    /** Get all pending partner registrations */
    getPendingPartners: adminProcedure.query(async () => {
      const all = await getAllPartners();
      return all.filter((p: Record<string, unknown>) => p.verificationStatus === "pending");
    }),
    /** Verify or reject a partner */
    verifyPartner: adminProcedure
      .input(z.object({
        partnerId: z.number(),
        status: z.enum(["verified", "rejected", "suspended"]),
        rejectionReason: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await updatePartnerVerification(input.partnerId, input.status, ctx.user.id);
        return { success: true };
      }),
  }),
  refunds: router({
    /** User submits a refund request */
    submitRequest: protectedProcedure
      .input(z.object({
        paymentId: z.number().optional(),
        stripePaymentIntentId: z.string().optional(),
        amountCents: z.number().min(1),
        creditsToDeduct: z.number().min(0),
        reason: z.string().min(10).max(1000),
      }))
      .mutation(async ({ ctx, input }) => {
        // Check if user already has a pending refund for this payment
        const existing = await getUserRefundRequests(ctx.user.id);
        const duplicate = existing.find(
          r => r.stripePaymentIntentId === input.stripePaymentIntentId && r.status === "pending"
        );
        if (duplicate) throw new TRPCError({ code: "BAD_REQUEST", message: "يوجد طلب استرداد معلق لهذه العملية" });

        const request = await createRefundRequest({
          userId: ctx.user.id,
          paymentId: input.paymentId,
          stripePaymentIntentId: input.stripePaymentIntentId,
          amountCents: input.amountCents,
          creditsToDeduct: input.creditsToDeduct,
          reason: input.reason,
        });
        return { success: true, requestId: request.id };
      }),
    /** User views their refund requests */
    getMyRequests: protectedProcedure
      .query(async ({ ctx }) => getUserRefundRequests(ctx.user.id)),
  }),

  // ─────────────────────────────────────────────────────────────────
  // PARTNER SYSTEM
  // ─────────────────────────────────────────────────────────────────
  partners: router({
    /** Register as a partner (supplier / contractor / developer / consultant) */
    register: protectedProcedure
      .input(z.object({
        nameAr: z.string().min(2),
        nameEn: z.string().optional(),
        partnerType: z.enum(["supplier", "contractor", "developer", "consultant", "subcontractor", "manufacturer"]),
        primarySpecialization: z.string().min(2),
        additionalSpecializations: z.array(z.string()).optional(),
        phone: z.string().optional(),
        email: z.string().email().optional(),
        website: z.string().optional(),
        address: z.string().optional(),
        operatingEmirates: z.array(z.string()).optional(),
        operatingCountries: z.array(z.string()).optional(),
        tradeLicenseNo: z.string().optional(),
        engineeringGrade: z.string().optional(),
        professionalMemberships: z.string().optional(),
        certifications: z.string().optional(),
        foundedYear: z.number().optional(),
        numEmployees: z.enum(["1-10", "11-50", "51-200", "201-500", "500+"]).optional(),
        annualRevenueRange: z.enum(["under_1m", "1m_5m", "5m_20m", "20m_100m", "100m_plus"]).optional(),
        profileAr: z.string().optional(),
        profileEn: z.string().optional(),
        logoUrl: z.string().optional(),
        portfolioUrl: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const existing = await getPartnerByUserId(ctx.user.id);
        if (existing) throw new TRPCError({ code: "CONFLICT", message: "لديك حساب شريك مسجل بالفعل" });
        return createPartner({
          ...input,
          userId: ctx.user.id,
          additionalSpecializations: input.additionalSpecializations ?? null,
          operatingEmirates: input.operatingEmirates ?? null,
          operatingCountries: input.operatingCountries ?? null,
        });
      }),

    /** Get my partner profile */
    getMyProfile: protectedProcedure.query(async ({ ctx }) => {
      return getPartnerByUserId(ctx.user.id);
    }),

    /** Update my partner profile */
    updateProfile: protectedProcedure
      .input(z.object({
        nameAr: z.string().optional(),
        nameEn: z.string().optional(),
        primarySpecialization: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().email().optional(),
        website: z.string().optional(),
        address: z.string().optional(),
        operatingEmirates: z.array(z.string()).optional(),
        profileAr: z.string().optional(),
        profileEn: z.string().optional(),
        logoUrl: z.string().optional(),
        portfolioUrl: z.string().optional(),
        certifications: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const partner = await getPartnerByUserId(ctx.user.id);
        if (!partner) throw new TRPCError({ code: "NOT_FOUND", message: "لم يتم العثور على حساب الشريك" });
        await updatePartner(partner.id, {
          ...input,
          operatingEmirates: input.operatingEmirates ?? undefined,
        });
        return { success: true };
      }),

    /** Public: get all verified partners (directory) */
    getDirectory: publicProcedure
      .input(z.object({
        type: z.enum(["supplier", "contractor", "developer", "consultant", "subcontractor", "manufacturer"]).optional(),
      }))
      .query(async ({ input }) => {
        return getVerifiedPartners(input.type);
      }),

    /** Admin: get all partners with any status */
    adminGetAll: adminProcedure
      .input(z.object({ limit: z.number().default(100) }))
      .query(async () => getAllPartners()),

    /** Admin: verify or reject a partner */
    adminVerify: adminProcedure
      .input(z.object({
        partnerId: z.number(),
        status: z.enum(["under_review", "verified", "rejected", "suspended"]),
        rejectionReason: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await updatePartnerVerification(
          input.partnerId,
          input.status,
          ctx.user.id,
          input.rejectionReason
        );
        return { success: true };
      }),

    // ── Partner Projects ────────────────────────────────────────

    /** Submit a project to the portfolio */
    submitProject: protectedProcedure
      .input(z.object({
        nameAr: z.string().min(2),
        nameEn: z.string().optional(),
        projectType: z.enum(["villa", "apartment_building", "commercial", "mixed_use", "industrial", "hospitality", "healthcare", "educational", "infrastructure", "renovation", "interior_only", "masterplan", "feasibility", "other"]),
        partnerRole: z.enum(["main_contractor", "subcontractor", "developer", "consultant", "designer", "supplier", "project_manager", "owner"]),
        emirate: z.enum(["dubai", "abu_dhabi", "sharjah", "ajman", "ras_al_khaimah", "fujairah", "umm_al_quwain"]).optional(),
        country: z.string().optional(),
        area: z.string().optional(),
        totalAreaSqm: z.number().optional(),
        numFloors: z.number().optional(),
        numUnits: z.number().optional(),
        contractValueAed: z.number().optional(),
        showContractValue: z.number().default(0),
        startDate: z.string().optional(), // ISO date string
        completionDate: z.string().optional(),
        durationMonths: z.number().optional(),
        status: z.enum(["completed", "ongoing", "on_hold", "cancelled"]).default("completed"),
        descriptionAr: z.string().optional(),
        descriptionEn: z.string().optional(),
        highlightsAr: z.string().optional(),
        challengesAr: z.string().optional(),
        imageUrls: z.array(z.string()).optional(),
        documentUrls: z.array(z.string()).optional(),
        coverImageUrl: z.string().optional(),
        specLevel: z.enum(["economy", "standard", "premium", "luxury"]).optional(),
        clientNameAr: z.string().optional(),
        showClientName: z.number().default(0),
        contributesToBenchmarks: z.number().default(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const partner = await getPartnerByUserId(ctx.user.id);
        if (!partner) throw new TRPCError({ code: "FORBIDDEN", message: "يجب التسجيل كشريك أولاً" });
        // Compute cost per sqm if both values provided
        let actualCostPerSqmAed: number | undefined;
        if (input.contractValueAed && input.totalAreaSqm && input.totalAreaSqm > 0) {
          actualCostPerSqmAed = input.contractValueAed / input.totalAreaSqm;
        }
        const { startDate, completionDate, ...restInput } = input;
        return createPartnerProject({
          ...restInput,
          partnerId: partner.id,
          imageUrls: input.imageUrls ?? null,
          documentUrls: input.documentUrls ?? null,
          actualCostPerSqmAed,
          startDate: startDate ? new Date(startDate) : undefined,
          completionDate: completionDate ? new Date(completionDate) : undefined,
        });
      }),

    /** Get my partner's projects */
    getMyProjects: protectedProcedure.query(async ({ ctx }) => {
      const partner = await getPartnerByUserId(ctx.user.id);
      if (!partner) return [];
      return getPartnerProjects(partner.id);
    }),

    /** Update a project I own */
    updateProject: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        nameAr: z.string().optional(),
        descriptionAr: z.string().optional(),
        highlightsAr: z.string().optional(),
        imageUrls: z.array(z.string()).optional(),
        coverImageUrl: z.string().optional(),
        status: z.enum(["completed", "ongoing", "on_hold", "cancelled"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const partner = await getPartnerByUserId(ctx.user.id);
        if (!partner) throw new TRPCError({ code: "FORBIDDEN" });
        const project = await getPartnerProjectById(input.projectId);
        if (!project || project.partnerId !== partner.id) throw new TRPCError({ code: "FORBIDDEN" });
        const { projectId, ...data } = input;
        await updatePartnerProject(projectId, {
          ...data,
          imageUrls: data.imageUrls ?? undefined,
        });
        return { success: true };
      }),

    /** Public: get approved projects portfolio */
    getPortfolio: publicProcedure
      .input(z.object({ limit: z.number().default(50) }))
      .query(async () => getApprovedPartnerProjects()),

    /** Admin: approve or reject a project */
    adminReviewProject: adminProcedure
      .input(z.object({
        projectId: z.number(),
        status: z.enum(["approved", "rejected", "needs_revision"]),
        rejectionReason: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await approvePartnerProject(
          input.projectId,
          ctx.user.id,
          input.status,
          input.rejectionReason
        );
        return { success: true };
      }),

    // ── Partner Services ────────────────────────────────────────

    /** Add a service/product to my catalog */
    addService: protectedProcedure
      .input(z.object({
        nameAr: z.string().min(2),
        nameEn: z.string().optional(),
        serviceType: z.enum(["product", "service", "design", "consultation", "inspection", "study", "training"]),
        platform: z.enum(["fada", "raqaba", "harara", "maskan", "code", "khayal", "all"]),
        descriptionAr: z.string().optional(),
        specs: z.record(z.string(), z.unknown()).optional(),
        priceAed: z.number().optional(),
        priceUnit: z.string().optional(),
        priceIsNegotiable: z.number().default(1),
        minOrderQty: z.number().optional(),
        leadTimeDays: z.number().optional(),
        imageUrls: z.array(z.string()).optional(),
        certifications: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const partner = await getPartnerByUserId(ctx.user.id);
        if (!partner) throw new TRPCError({ code: "FORBIDDEN", message: "يجب التسجيل كشريك أولاً" });
        return createPartnerService({
          ...input,
          partnerId: partner.id,
          imageUrls: input.imageUrls ?? null,
          specs: input.specs ?? null,
        });
      }),

    /** Get my services */
    getMyServices: protectedProcedure.query(async ({ ctx }) => {
      const partner = await getPartnerByUserId(ctx.user.id);
      if (!partner) return [];
      return getPartnerServices(partner.id);
    }),

    // ── Reviews ─────────────────────────────────────────────────

    /** Submit a review for a partner */
    submitReview: protectedProcedure
      .input(z.object({
        partnerId: z.number(),
        projectId: z.number().optional(),
        rating: z.number().min(1).max(5),
        qualityRating: z.number().min(1).max(5).optional(),
        timelinessRating: z.number().min(1).max(5).optional(),
        communicationRating: z.number().min(1).max(5).optional(),
        valueRating: z.number().min(1).max(5).optional(),
        reviewAr: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return createPartnerReview({ ...input, reviewerId: ctx.user.id });
      }),

    /** Get reviews for a partner */
    getReviews: publicProcedure
      .input(z.object({ partnerId: z.number() }))
      .query(async ({ input }) => getPartnerReviews(input.partnerId)),
  }),

  // ─────────────────────────────────────────────────────────────────
  // ARCHIVE — Institutional Memory (Layer 10)
  // ─────────────────────────────────────────────────────────────────
  archive: router({
    /** Upload a contract document for AI extraction */
    uploadContract: protectedProcedure
      .input(z.object({
        fileUrl: z.string().url(),
        fileKey: z.string(),
        originalFilename: z.string().optional(),
        notes: z.string().optional(),
        projectType: z.enum(["villa", "apartment_building", "commercial", "mixed_use", "industrial", "hospitality", "healthcare", "educational", "infrastructure", "renovation", "interior_only", "other"]).optional(),
        emirate: z.enum(["dubai", "abu_dhabi", "sharjah", "ajman", "ras_al_khaimah", "fujairah", "umm_al_quwain"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const contract = await createArchiveContract({
          organizationId: ctx.user.id,
          originalFileUrl: input.fileUrl,
          originalFileKey: input.fileKey,
          projectType: input.projectType ?? null,
          emirate: input.emirate ?? null,
          extractionStatus: "pending",
        });
        // Trigger async AI extraction (fire-and-forget)
        triggerContractExtraction(contract.id, input.fileUrl).catch(() => {});
        return contract;
      }),

    /** Upload a drawing/plan for AI extraction */
    uploadDrawing: protectedProcedure
      .input(z.object({
        fileUrl: z.string().url(),
        fileKey: z.string(),
        originalFilename: z.string().optional(),
        drawingType: z.enum(["floor_plan", "elevation", "section", "site_plan", "roof_plan", "detail", "3d_view", "landscape"]).optional(),
        notes: z.string().optional(),
        emirate: z.enum(["dubai", "abu_dhabi", "sharjah", "ajman", "ras_al_khaimah", "fujairah", "umm_al_quwain"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const drawing = await createArchiveDrawing({
          organizationId: ctx.user.id,
          originalFileUrl: input.fileUrl,
          originalFileKey: input.fileKey,
          drawingType: input.drawingType ?? "floor_plan",
          emirate: input.emirate ?? null,
          extractionStatus: "pending",
        });
        // Trigger async AI extraction (fire-and-forget)
        triggerDrawingExtraction(drawing.id, input.fileUrl).catch(() => {});
        return drawing;
      }),

    /** List all archive items for the current user */
    list: protectedProcedure.query(async ({ ctx }) => {
      const [contracts, drawings] = await Promise.all([
        getArchiveContractsByUser(ctx.user.id),
        getArchiveDrawingsByUser(ctx.user.id),
      ]);
      return { contracts, drawings };
    }),

    /** Admin: list all pending items */
    adminListPending: adminProcedure.query(async () => {
      return getPendingArchiveItems();
    }),
  }),

  /** ─── EXPERT CORRECTIONS ─── */
  corrections: router({
    /** Submit a new expert correction */
    submit: protectedProcedure
      .input(z.object({
        platform: z.enum(["fada", "raqaba", "harara", "maskan", "code", "khayal", "all"]),
        correctionType: z.enum(["building_code", "calculation_rule", "design_standard", "material_spec", "climate_data", "general_knowledge"]),
        currentValueAr: z.string().min(5),
        proposedValueAr: z.string().min(10),
        justificationAr: z.string().min(20),
        evidenceUrls: z.array(z.string()).optional(),
        officialReference: z.string().optional(),
        priority: z.enum(["low", "normal", "high", "critical"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const result = await createExpertCorrection({
          submittedBy: ctx.user.id,
          platform: input.platform,
          correctionType: input.correctionType,
          currentValueAr: input.currentValueAr,
          proposedValueAr: input.proposedValueAr,
          justificationAr: input.justificationAr,
          evidenceUrls: JSON.stringify(input.evidenceUrls ?? []),
          officialReference: input.officialReference,
          priority: input.priority ?? "normal",
        });
        return result;
      }),

    /** Get current user's corrections */
    myCorrections: protectedProcedure.query(async ({ ctx }) => {
      return getUserExpertCorrections(ctx.user.id);
    }),

    /** Get all approved corrections (public) */
    approved: publicProcedure.query(async () => {
      return getExpertCorrectionsByStatus("approved");
    }),

    /** Admin: get pending corrections */
    adminPending: adminProcedure.query(async () => {
      return getExpertCorrectionsByStatus("pending_review");
    }),

    /** Admin: update correction status */
    adminUpdateStatus: adminProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["pending_review", "under_review", "approved", "rejected", "needs_more_info", "applied"]),
        creditsAwarded: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        await updateExpertCorrectionStatus(input.id, input.status, input.creditsAwarded);
        return { success: true };
      }),
  }),

  /** ─── GIG MARKETPLACE ─── */
  gigs: router({
    /** List open gig tasks */
    listOpen: publicProcedure
      .input(z.object({ limit: z.number().min(1).max(50).default(20) }))
      .query(async ({ input }) => {
        return getOpenGigTasks(input.limit);
      }),

    /** Get current user's posted gigs */
    myGigs: protectedProcedure.query(async ({ ctx }) => {
      return getUserGigTasks(ctx.user.id);
    }),

    /** Post a new gig task */
    post: protectedProcedure
      .input(z.object({
        platform: z.enum(["fada", "raqaba", "harara", "maskan", "code", "khayal", "all"]),
        taskType: z.enum(["boq_preparation", "energy_study", "drawing_review", "code_checking", "cost_estimation", "inspection_report", "design_review", "quantity_survey", "knowledge_entry", "translation", "other"]),
        titleAr: z.string().min(5).max(255),
        titleEn: z.string().max(255).optional(),
        descriptionAr: z.string().min(20),
        requiredSpecialization: z.string().max(128).optional(),
        minExperience: z.number().min(0).max(50).optional(),
        budgetAed: z.number().min(50).max(100000).optional(),
        deadline: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const result = await createGigTask({
          postedBy: ctx.user.id,
          platform: input.platform,
          taskType: input.taskType,
          titleAr: input.titleAr,
          titleEn: input.titleEn,
          descriptionAr: input.descriptionAr,
          requiredSpecialization: input.requiredSpecialization,
          minExperience: input.minExperience ?? 0,
          budgetAed: input.budgetAed,
          deadline: input.deadline ? new Date(input.deadline) : undefined,
        });
        return result;
      }),
  }),

  /** ─── DIGITAL PROPERTY IDENTITY (LAYER 9) ─── */
  projects: router({
    /** Create a new project identity */
    create: protectedProcedure
      .input(z.object({
        nameAr: z.string().min(3).max(255),
        nameEn: z.string().max(255).optional(),
        projectType: z.enum(["villa", "apartment_building", "commercial", "mixed_use", "industrial", "hospitality", "healthcare", "educational", "infrastructure", "renovation", "interior_only", "feasibility", "other"]),
        emirate: z.enum(["dubai", "abu_dhabi", "sharjah", "ajman", "ras_al_khaimah", "fujairah", "umm_al_quwain"]).optional(),
        area: z.string().max(255).optional(),
        plotNumber: z.string().max(64).optional(),
        coordinates: z.string().max(64).optional(),
        totalAreaSqm: z.number().optional(),
        numFloors: z.number().optional(),
        numUnits: z.number().optional(),
        budgetAed: z.number().optional(),
        phase: z.enum(["feasibility", "concept_design", "schematic_design", "design_development", "construction_documents", "permitting", "construction", "handover", "completed"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return createProject({ ...input, userId: ctx.user.id });
      }),

    /** List user's projects */
    list: protectedProcedure.query(async ({ ctx }) => {
      return getUserProjects(ctx.user.id);
    }),

    /** Get a single project */
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const project = await getProjectById(input.id);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
        const documents = await getProjectDocuments(input.id);
        return { ...project, documents };
      }),

    /** Update project */
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        nameAr: z.string().min(3).max(255).optional(),
        phase: z.enum(["feasibility", "concept_design", "schematic_design", "design_development", "construction_documents", "permitting", "construction", "handover", "completed"]).optional(),
        status: z.enum(["active", "on_hold", "completed", "cancelled"]).optional(),
        totalAreaSqm: z.number().optional(),
        budgetAed: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await getProjectById(input.id);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
        const { id, ...data } = input;
        await updateProject(id, data);
        return { success: true };
      }),

    /** Add a document to a project */
    addDocument: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        fileUrl: z.string().url(),
        fileKey: z.string(),
        filename: z.string().optional(),
        documentType: z.enum(["drawing", "contract", "report", "photo", "permit", "specification", "other"]).optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await getProjectById(input.projectId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
        return addProjectDocument({
          projectId: input.projectId,
          uploadedBy: ctx.user.id,
          fileUrl: input.fileUrl,
          fileKey: input.fileKey,
          nameAr: input.filename ?? "مستند",
          docType: (input.documentType as "architectural_drawing" | "structural_drawing" | "mep_drawing" | "contract" | "permit" | "inspection_report" | "cost_estimate" | "energy_study" | "soil_report" | "survey" | "photo" | "other") ?? "other",
        });
      }),
  }),

  // ─── GUEST TRIAL ────────────────────────────────────────────────────────────────────────────────────
  guestTrial: router({
    /** Check if a fingerprint has already used their trial for a platform */
    checkTrial: publicProcedure
      .input(z.object({
        fingerprint: z.string().min(8).max(128),
        platform: z.enum(["fada", "raqaba", "harara", "maskan", "code", "khayal"]),
      }))
      .query(async ({ input }) => {
        const trial = await getGuestTrial(input.fingerprint, input.platform);
        return {
          hasTrialAvailable: !trial,
          trialUsed: trial?.used ?? false,
          previewContent: trial?.previewContent ?? null,
        };
      }),

    /** Start a guest trial — generates AI preview report */
    startTrial: publicProcedure
      .input(z.object({
        fingerprint: z.string().min(8).max(128),
        platform: z.enum(["fada", "raqaba", "harara", "maskan", "code", "khayal"]),
        userInput: z.string().min(10).max(2000),
        ipAddress: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        // Check if trial already used
        const existing = await getGuestTrial(input.fingerprint, input.platform);
        if (existing) {
          return {
            success: false,
            error: "لقد استخدمت تجربتك المجانية في هذه المنصة",
            previewContent: existing.previewContent,
            fullContent: null,
          };
        }

        const PLATFORM_NAMES: Record<string, string> = {
          fada: "فضاء — التصميم الداخلي",
          raqaba: "رقابة — الإشراف الميداني",
          harara: "حرارة — الكفاءة الطاقوية",
          maskan: "مسكن — التحليل السكني",
          code: "كود — كودات البناء",
          khayal: "خيال — مولد المرئيات",
        };

        // Generate a partial preview using AI
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `أنت مستشار ذكاء اصطناعي متخصص في ${PLATFORM_NAMES[input.platform]}.
أنتج تقريرًا أوليًا مختصرًا (3-4 فقرات) للزائر كعينة مجانية. اكتب بالعربية.
التقرير يجب أن يكون مفيدًا حقًا لكن يشير بوضوح أن التحليل الكامل متاح بعد التسجيل.`,
            },
            { role: "user", content: input.userInput },
          ],
        });

        const fullText = typeof response.choices[0]?.message?.content === "string"
          ? response.choices[0].message.content
          : "";

        // Preview = first 30% of the content
        const words = fullText.split(" ");
        const previewWords = Math.ceil(words.length * 0.3);
        const previewContent = words.slice(0, previewWords).join(" ") + "...";

        await createGuestTrial({
          fingerprint: input.fingerprint,
          platform: input.platform,
          ipAddress: input.ipAddress,
          previewContent,
          fullContent: fullText,
          used: false,
        } as any);

        return {
          success: true,
          previewContent,
          fullContent: null, // Full content only after login
          error: null,
        };
      }),

    /** After login: retrieve full trial content */
    getFullTrialContent: protectedProcedure
      .input(z.object({
        fingerprint: z.string().min(8).max(128),
        platform: z.enum(["fada", "raqaba", "harara", "maskan", "code", "khayal"]),
      }))
      .query(async ({ input }) => {
        const trial = await getGuestTrial(input.fingerprint, input.platform);
        if (!trial) return { fullContent: null };
        if (!trial.used) await markGuestTrialUsed(input.fingerprint, input.platform);
        return { fullContent: trial.fullContent };
      }),

     /** Admin: get guest trial stats */
    getStats: adminProcedure.query(async () => getGuestTrialStats()),
  }),

  /** ─── Platform Pricing Rules ─────────────────────────────────────────────────────────────────── */
  pricing: router({
    /** جلب جميع قواعد التسعير (للمشرف فقط) */
    getRules: adminProcedure.query(async () => {
      const { getAllPricingRules } = await import("./db");
      return getAllPricingRules();
    }),

    /** إنشاء أو تحديث قاعدة تسعير منصة (للمشرف فقط) */
    upsertRule: adminProcedure
      .input(z.object({
        platform: z.enum(["fada", "raqaba", "harara", "maskan", "code", "khayal"]),
        baseCost: z.number().int().min(1).max(200),
        minCost: z.number().int().min(1).max(200),
        maxCost: z.number().int().min(1).max(500),
        factorWeights: z.record(z.string(), z.number().min(0).max(100)),
        description: z.string().optional(),
        isActive: z.boolean().default(true),
      }))
      .mutation(async ({ input, ctx }) => {
        const { upsertPricingRule } = await import("./db");
        await upsertPricingRule({
          platform: input.platform,
          baseCost: input.baseCost,
          minCost: input.minCost,
          maxCost: input.maxCost,
          factorWeights: input.factorWeights,
          description: input.description,
          isActive: input.isActive,
          updatedBy: ctx.user.id,
        });
        return { success: true };
      }),

    /** زرع القواعد الافتراضية في DB (للمشرف فقط) */
    seedDefaults: adminProcedure.mutation(async ({ ctx }) => {
      const { seedDefaultPricingRules } = await import("./db");
      await seedDefaultPricingRules(ctx.user.id);
      return { success: true };
    }),

    /** معاينة احتساب التكلفة بدون خصم (للمشرف فقط) */
    previewCost: adminProcedure
      .input(z.object({
        platform: z.enum(["fada", "raqaba", "harara", "maskan", "code", "khayal"]),
        usageFactors: z.record(z.string(), z.number()),
      }))
      .query(async ({ input }) => {
        const { calculatePlatformCost } = await import("./db");
        return calculatePlatformCost(input.platform, input.usageFactors);
      }),

    /**
     * جلب التكاليف الدنيا والقصوى لكل منصة من DB (public — لا يحتاج تسجيل دخول)
     * يُستخدم في الواجهة لعرض نطاق التكلفة والتحقق من الرصيد قبل فتح المنصة
     */
    getPublicCosts: publicProcedure.query(async () => {
      const { getAllPricingRules } = await import("./db");
      const rules = await getAllPricingRules();
      // القيم الافتراضية إذا لم تكن هناك قواعد في DB
      const DEFAULTS: Record<string, { minCost: number; maxCost: number; baseCost: number; description: string }> = {
        fada:   { minCost: 5,  maxCost: 60, baseCost: 5,  description: "فضاء: 5 كريدت أساسي + حسب الاستخدام" },
        raqaba: { minCost: 5,  maxCost: 80, baseCost: 5,  description: "رقابة: 5 كريدت أساسي + حسب الاستخدام" },
        harara: { minCost: 5,  maxCost: 80, baseCost: 5,  description: "حرارة: 5 كريدت أساسي + حسب الاستخدام" },
        maskan: { minCost: 5,  maxCost: 50, baseCost: 5,  description: "مسكن: 5 كريدت أساسي + حسب الاستخدام" },
        code:   { minCost: 3,  maxCost: 30, baseCost: 3,  description: "كود: 3 كريدت أساسي + حسب الاستخدام" },
        khayal: { minCost: 5,  maxCost: 70, baseCost: 5,  description: "خيال: 5 كريدت أساسي + حسب الاستخدام" },
      };
      const result: Record<string, { minCost: number; maxCost: number; baseCost: number; description: string }> = { ...DEFAULTS };
      for (const rule of rules) {
        if (rule.isActive) {
          result[rule.platform] = {
            minCost: rule.minCost,
            maxCost: rule.maxCost,
            baseCost: rule.baseCost,
            description: rule.description ?? "",
          };
        }
      }
      return result;
    }),

    // تسعير مخصص للمنصات الفرعية — يشمل أسماء المنصات بالعربية والإنجليزية
    getSubPlatformCosts: publicProcedure.query(async () => {
      const { getAllPricingRules } = await import("./db");
      const rules = await getAllPricingRules();
      const DEFAULTS: Record<string, {
        minCost: number; maxCost: number; baseCost: number;
        description: string; nameAr: string; nameEn: string;
      }> = {
        fada:   { minCost: 5,  maxCost: 60, baseCost: 5,  description: "5 كريدت أساسي + حسب الاستخدام", nameAr: "فضاء",  nameEn: "FADA"   },
        raqaba: { minCost: 5,  maxCost: 80, baseCost: 5,  description: "5 كريدت أساسي + حسب الاستخدام", nameAr: "رقابة", nameEn: "RAQABA" },
        harara: { minCost: 5,  maxCost: 80, baseCost: 5,  description: "5 كريدت أساسي + حسب الاستخدام", nameAr: "حرارة", nameEn: "HARARA" },
        maskan: { minCost: 5,  maxCost: 50, baseCost: 5,  description: "5 كريدت أساسي + حسب الاستخدام", nameAr: "مسكن", nameEn: "MASKAN" },
        code:   { minCost: 3,  maxCost: 30, baseCost: 3,  description: "3 كريدت أساسي + حسب الاستخدام", nameAr: "كود",  nameEn: "CODE"   },
        khayal: { minCost: 5,  maxCost: 70, baseCost: 5,  description: "5 كريدت أساسي + حسب الاستخدام", nameAr: "خيال", nameEn: "KHAYAL" },
      };
      const result: Record<string, typeof DEFAULTS[string]> = { ...DEFAULTS };
      for (const rule of rules) {
        if (rule.isActive && result[rule.platform]) {
          result[rule.platform] = {
            ...result[rule.platform],
            minCost: rule.minCost,
            maxCost: rule.maxCost,
            baseCost: rule.baseCost,
            description: rule.description ?? result[rule.platform].description,
          };
        }
      }
      return result;
    }),
  }),

  // ── Platform Health Monitoring ─────────────────────────────────────────────
  monitoring: router({
    /** جلب ملخص صحة المنصات (آخر فحص لكل منصة) */
    getHealthSummary: adminProcedure.query(async () => {
      const { getHealthSummary } = await import("./monitorDb");
      return getHealthSummary();
    }),

    /** جلب إحصائيات صحة المنصات في آخر 24 ساعة */
    getHealthStats: adminProcedure.query(async () => {
      const { getHealthStats } = await import("./monitorDb");
      return getHealthStats();
    }),

    /** جلب الحوادث المفتوحة */
    getOpenIncidents: adminProcedure.query(async () => {
      const { getOpenIncidents } = await import("./monitorDb");
      return getOpenIncidents();
    }),

    /** جلب جميع الحوادث */
    getAllIncidents: adminProcedure
      .input(z.object({ limit: z.number().min(1).max(200).default(50), offset: z.number().min(0).default(0) }))
      .query(async ({ input }) => {
        const { getAllIncidents } = await import("./monitorDb");
        return getAllIncidents(input.limit, input.offset);
      }),

    /** جلب جميع الإصلاحات التلقائية */
    getAllAutoFixes: adminProcedure
      .input(z.object({ limit: z.number().min(1).max(200).default(50) }))
      .query(async ({ input }) => {
        const { getAllAutoFixes } = await import("./monitorDb");
        return getAllAutoFixes(input.limit);
      }),

    /** جلب تنبيهات المالك */
    getOwnerAlerts: adminProcedure
      .input(z.object({ limit: z.number().min(1).max(200).default(50) }))
      .query(async ({ input }) => {
        const { getOwnerAlerts } = await import("./monitorDb");
        return getOwnerAlerts(input.limit);
      }),

    /** حل حادثة */
    resolveIncident: adminProcedure
      .input(z.object({ incidentId: z.number(), notes: z.string().optional() }))
      .mutation(async ({ input }) => {
        const { resolveIncident } = await import("./monitorDb");
        await resolveIncident(input.incidentId, input.notes);
        return { success: true };
      }),

    /** تجاهل حادثة */
    ignoreIncident: adminProcedure
      .input(z.object({ incidentId: z.number(), notes: z.string().optional() }))
      .mutation(async ({ input }) => {
        const { ignoreIncident } = await import("./monitorDb");
        await ignoreIncident(input.incidentId, input.notes);
        return { success: true };
      }),

    /** جلب الفحوصات الأخيرة لمنصة محددة */
    getRecentChecks: adminProcedure
      .input(z.object({ target: z.string(), limit: z.number().min(1).max(100).default(20) }))
      .query(async ({ input }) => {
        const { getRecentHealthChecks } = await import("./monitorDb");
        return getRecentHealthChecks(input.target, input.limit);
      }),

    /** تشغيل GitHub Action يدوياً على منصة محددة */
    dispatchGitHubAction: adminProcedure
      .input(z.object({
        platform: z.enum(["fada", "raqaba", "harara", "maskan", "code", "khayal"]),
        action: z.enum(["restart", "deploy", "rollback"]),
        reason: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const GITHUB_REPOS: Record<string, string> = {
          fada: "mousa-fada", raqaba: "mousa-raqaba", harara: "mousa-harara",
          maskan: "mousa-maskan", code: "mousa-code", khayal: "mousa-khayal",
        };
        const token = process.env.GITHUB_TOKEN_MOUSA ?? "";
        const owner = process.env.GITHUB_OWNER ?? "";
        const repo = GITHUB_REPOS[input.platform];
        if (!token || !owner || !repo) {
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: "GitHub غير مُهيَّأ — تحقق من GITHUB_TOKEN_MOUSA و GITHUB_OWNER" });
        }
        const response = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/actions/workflows/health-check.yml/dispatches`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/vnd.github+json",
              "X-GitHub-Api-Version": "2022-11-28",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              ref: "main",
              inputs: { action: input.action, reason: (input.reason ?? "Manual dispatch from admin").slice(0, 200) },
            }),
          }
        );
        if (response.status === 204) {
          return { success: true, message: `✅ GitHub Actions ${input.action} dispatched for ${input.platform}` };
        }
        const body = await response.text();
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `GitHub API ${response.status}: ${body.slice(0, 200)}` });
      }),

    /** جلب قائمة الـ repos من GitHub */
    getGitHubRepos: adminProcedure.query(async () => {
      const token = process.env.GITHUB_TOKEN_MOUSA ?? "";
      const owner = process.env.GITHUB_OWNER ?? "";
      if (!token || !owner) {
        return { configured: false, repos: [] };
      }
      const PLATFORM_REPOS = ["mousa-fada", "mousa-raqaba", "mousa-harara", "mousa-maskan", "mousa-code", "mousa-khayal"];
      const results = await Promise.all(
        PLATFORM_REPOS.map(async (repo) => {
          try {
            const r = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
              headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
            });
            if (!r.ok) return { repo, exists: false, url: null, lastPush: null, defaultBranch: null };
            const data = await r.json() as { html_url: string; pushed_at: string; default_branch: string };
            return { repo, exists: true, url: data.html_url, lastPush: data.pushed_at, defaultBranch: data.default_branch };
          } catch {
            return { repo, exists: false, url: null, lastPush: null, defaultBranch: null };
          }
        })
      );
      return { configured: true, owner, repos: results };
    }),

    /** جلب آخر GitHub Actions runs لمنصة محددة */
    getGitHubRuns: adminProcedure
      .input(z.object({ platform: z.enum(["fada", "raqaba", "harara", "maskan", "code", "khayal"]) }))
      .query(async ({ input }) => {
        const GITHUB_REPOS: Record<string, string> = {
          fada: "mousa-fada", raqaba: "mousa-raqaba", harara: "mousa-harara",
          maskan: "mousa-maskan", code: "mousa-code", khayal: "mousa-khayal",
        };
        const token = process.env.GITHUB_TOKEN_MOUSA ?? "";
        const owner = process.env.GITHUB_OWNER ?? "";
        const repo = GITHUB_REPOS[input.platform];
        if (!token || !owner || !repo) return { runs: [] };
        try {
          const r = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/actions/runs?per_page=10`,
            { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" } }
          );
          if (!r.ok) return { runs: [] };
          const data = await r.json() as { workflow_runs: Array<{ id: number; name: string; status: string; conclusion: string | null; created_at: string; html_url: string }> };
          return { runs: data.workflow_runs.map(run => ({
            id: run.id, name: run.name, status: run.status,
            conclusion: run.conclusion, createdAt: run.created_at, url: run.html_url,
          })) };
        } catch {
          return { runs: [] };
        }
      }),
  }),
});
/** Fire-and-forget: extract contract data using AI */
async function triggerContractExtraction(contractId: number, fileUrl: string): Promise<void> {
  try {
    const { updateArchiveContractExtraction } = await import("./db");
    await updateArchiveContractExtraction(contractId, { extractionStatus: "processing" });
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "أنت محلل عقود هندسية. استخرج البيانات الرئيسية من العقد بصيغة JSON." },
        { role: "user", content: [{ type: "file_url", file_url: { url: fileUrl, mime_type: "application/pdf" } }, { type: "text", text: "استخرج: نوع المشروع، المساحة بالمتر المربع، قيمة العقد بالدرهم، المدة بالأشهر، الإمارة، نوع المقاول. أجب بـ JSON فقط." }] },
      ],
      response_format: { type: "json_schema", json_schema: { name: "contract_data", strict: true, schema: { type: "object", properties: { projectType: { type: "string" }, totalAreaSqm: { type: "number" }, contractValueAed: { type: "number" }, durationMonths: { type: "number" }, emirate: { type: "string" }, contractorType: { type: "string" } }, required: ["projectType", "totalAreaSqm", "contractValueAed", "durationMonths", "emirate", "contractorType"], additionalProperties: false } } },
    });
    const content = response.choices[0]?.message?.content;
    const data = typeof content === "string" ? JSON.parse(content) : {};
    const costPerSqm = data.totalAreaSqm > 0 ? Math.round(data.contractValueAed / data.totalAreaSqm) : null;
    await updateArchiveContractExtraction(contractId, {
      extractionStatus: "completed",
      extractionConfidence: 80,
      totalAreaSqm: data.totalAreaSqm || null,
      contractValueAed: data.contractValueAed || null,
      costPerSqmAed: costPerSqm,
      durationMonths: data.durationMonths || null,
      yearBucket: new Date().getFullYear(),
    });
  } catch {
    const { updateArchiveContractExtraction } = await import("./db");
    await updateArchiveContractExtraction(contractId, { extractionStatus: "failed" }).catch(() => {});
  }
}

/** Fire-and-forget: extract drawing data using AI */
async function triggerDrawingExtraction(drawingId: number, fileUrl: string): Promise<void> {
  try {
    const { updateArchiveDrawingExtraction } = await import("./db");
    await updateArchiveDrawingExtraction(drawingId, { extractionStatus: "processing" });
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "أنت محلل مخططات معمارية. استخرج البيانات المكانية من المخطط بصيغة JSON." },
        { role: "user", content: [{ type: "image_url", image_url: { url: fileUrl } }, { type: "text", text: "استخرج: المساحة الإجمالية بالمتر المربع، المساحة الصافية، نسبة الكفاءة، اتجاه الواجهة، نسبة النوافذ للجدران. أجب بـ JSON فقط." }] },
      ],
      response_format: { type: "json_schema", json_schema: { name: "drawing_data", strict: true, schema: { type: "object", properties: { totalAreaSqm: { type: "number" }, netAreaSqm: { type: "number" }, efficiencyRatio: { type: "number" }, facadeOrientation: { type: "string" }, windowWallRatio: { type: "number" } }, required: ["totalAreaSqm", "netAreaSqm", "efficiencyRatio", "facadeOrientation", "windowWallRatio"], additionalProperties: false } } },
    });
    const content = response.choices[0]?.message?.content;
    const data = typeof content === "string" ? JSON.parse(content) : {};
    await updateArchiveDrawingExtraction(drawingId, {
      extractionStatus: "completed",
      extractionConfidence: 75,
      totalAreaSqm: data.totalAreaSqm || null,
      netAreaSqm: data.netAreaSqm || null,
      efficiencyRatio: data.efficiencyRatio || null,
      facadeOrientation: data.facadeOrientation || null,
      windowWallRatio: data.windowWallRatio || null,
    });
  } catch {
    const { updateArchiveDrawingExtraction } = await import("./db");
    await updateArchiveDrawingExtraction(drawingId, { extractionStatus: "failed" }).catch(() => {});
  }
}

/** Fire-and-forget: generate a concise summary of the session and save it */
async function generateAndSaveSummary(
  sessionId: number,
  previousMessages: { role: string; content: string }[],
  lastAssistantMessage: string,
  platformName: string
): Promise<void> {
  try {
    const conversationText = previousMessages
      .slice(-10) // last 10 messages for summary context
      .map(m => `${m.role === "user" ? "المستخدم" : "المساعد"}: ${m.content}`)
      .join("\n");
    const summaryResponse = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `أنت مساعد يلخّص المحادثات بإيجاز. اكتب ملخصاً موجزاً (3-5 جمل بالعربية) لهذه المحادثة مع منصة ${platformName}، مع التركيز على: موضوع المشروع، البيانات المُقدَّمة، والتوصيات الرئيسية. الملخص سيُستخدم كذاكرة في جلسات مستقبلية.`,
        },
        {
          role: "user",
          content: `المحادثة:\n${conversationText}\n\nآخر رد من المساعد:\n${lastAssistantMessage.substring(0, 500)}`,
        },
      ],
    });
    const summary = rawContent(summaryResponse);
    if (summary && summary.trim().length > 20) {
      await saveSessionSummary(sessionId, summary.trim());
    }
  } catch {
    // Non-critical — silently ignore
  }
}

function rawContent(response: { choices: { message: { content: unknown } }[] }): string {
  const c = response.choices[0]?.message?.content;
  return typeof c === "string" ? c : c ? JSON.stringify(c) : "";
}

export type AppRouter = typeof appRouter;
