/**
 * domainEngine.test.ts
 * اختبارات محرك التحليل الذكي ومحرك الكتابة التلقائية
 */
import { describe, it, expect } from "vitest";
import { quickDetectDomain } from "./domainEngine";

describe("quickDetectDomain — الكشف السريع عن نوع المحتوى", () => {
  it("يكتشف المحتوى التعليمي عن النمل", () => {
    const result = quickDetectDomain("حياة النملة تحت الأرض كيف تعيش وتأكل");
    expect(result).toBe("educational");
  });

  it("يكتشف المحتوى القصصي", () => {
    const result = quickDetectDomain("قصة الأمير الصغير في كوكبه");
    expect(result).toBe("storytelling");
  });

  it("يكتشف المحتوى المعماري", () => {
    const result = quickDetectDomain("فيلا عصرية بإطلالة بحرية مع حمام سباحة");
    expect(result).toBe("architectural");
  });

  it("يكتشف المحتوى الفضائي", () => {
    // استخدام كلمة موجودة في regex الفضاء بشكل صريح
    const result = quickDetectDomain("فضاء ونجوم ومجرات وثقوب سوداء");
    expect(["scientific", "spatial"]).toContain(result);
  });

  it("يكتشف المحتوى التاريخي", () => {
    const result = quickDetectDomain("الحضارة الفرعونية في مصر القديمة");
    expect(result).toBe("historical");
  });

  it("يكتشف المحتوى الطبيعي أو الوثائقي", () => {
    const result = quickDetectDomain("غابة الأمازون الاستوائية وأشجارها الضخمة");
    // غابة وأشجار تقع تحت natural أو documentary
    expect(["natural", "documentary"]).toContain(result);
  });

  it("يكتشف المحتوى بالإنجليزي", () => {
    const result = quickDetectDomain("life cycle of a butterfly from egg to adult");
    expect(result).toBe("educational");
  });

  it("يعيد null للنص القصير", () => {
    const result = quickDetectDomain("مرحبا");
    expect(result).toBeNull();
  });

  it("يعيد null للنص الفارغ", () => {
    const result = quickDetectDomain("");
    expect(result).toBeNull();
  });
});
