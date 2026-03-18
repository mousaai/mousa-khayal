/**
 * exportRouter.ts — نظام التصدير الاحترافي لمنصة خيال
 * يدعم: PDF سينمائي + PPT جاهز للعرض + DOCX للتحرير
 */
import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import PDFDocument from "pdfkit";
import PptxGenJS from "pptxgenjs";
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, ImageRun, BorderStyle,
  WidthType,
} from "docx";
import { storagePut } from "./storage";
import path from "path";
import fs from "fs";

// ─────────────────────────────────────────────────────────
// خطوط عربية — Amiri
// ─────────────────────────────────────────────────────────
const AMIRI_REGULAR_PATH = path.join(import.meta.dirname ?? __dirname, "fonts", "Amiri-Regular.ttf");
const AMIRI_BOLD_PATH = path.join(import.meta.dirname ?? __dirname, "fonts", "Amiri-Bold.ttf");

// روابط CDN للخطوط (fallback في بيئة الإنتاج)
const AMIRI_REGULAR_CDN = "https://d2xsxph8kpxj0f.cloudfront.net/310519663315855165/BXEkPAJgGiqWs3v7muUPfr/Amiri-Regular_3270d6be.ttf";
const AMIRI_BOLD_CDN = "https://d2xsxph8kpxj0f.cloudfront.net/310519663315855165/BXEkPAJgGiqWs3v7muUPfr/Amiri-Bold_c5c49fd0.ttf";

// تحميل الخط مرة واحدة عند بدء التشغيل
let amiriRegularBuf: Buffer | null = null;
let amiriBoldBuf: Buffer | null = null;

// تحميل الخطوط (محلي أولاً، ثم CDN)
async function loadArabicFonts() {
  try {
    if (fs.existsSync(AMIRI_REGULAR_PATH)) amiriRegularBuf = fs.readFileSync(AMIRI_REGULAR_PATH);
    if (fs.existsSync(AMIRI_BOLD_PATH)) amiriBoldBuf = fs.readFileSync(AMIRI_BOLD_PATH);
  } catch { /* ignore */ }
  if (!amiriRegularBuf) {
    try {
      const res = await fetch(AMIRI_REGULAR_CDN);
      if (res.ok) amiriRegularBuf = Buffer.from(await res.arrayBuffer());
    } catch { /* ignore */ }
  }
  if (!amiriBoldBuf) {
    try {
      const res = await fetch(AMIRI_BOLD_CDN);
      if (res.ok) amiriBoldBuf = Buffer.from(await res.arrayBuffer());
    } catch { /* ignore */ }
  }
  if (amiriRegularBuf && amiriBoldBuf) {
    console.log("[exportRouter] Arabic fonts (Amiri) loaded successfully");
  } else {
    console.warn("[exportRouter] Arabic fonts not available — PDF will use fallback font");
  }
}
// تحميل الخطوط في الخلفية عند بدء التشغيل
loadArabicFonts().catch(() => {});
// تحميل متزامن كـ fallback فوري
try {
  if (fs.existsSync(AMIRI_REGULAR_PATH)) amiriRegularBuf = fs.readFileSync(AMIRI_REGULAR_PATH);
  if (fs.existsSync(AMIRI_BOLD_PATH)) amiriBoldBuf = fs.readFileSync(AMIRI_BOLD_PATH);
} catch { /* ignore */ }

// دالة مساعدة: تسجيل الخطوط في مستند PDF
function registerArabicFonts(doc: PDFKit.PDFDocument) {
  if (amiriRegularBuf) doc.registerFont("Amiri", amiriRegularBuf);
  if (amiriBoldBuf) doc.registerFont("Amiri-Bold", amiriBoldBuf);
}

// دالة مساعدة: اختيار الخط المناسب للنص
function arabicFont(bold = false): string {
  if (bold && amiriBoldBuf) return "Amiri-Bold";
  if (!bold && amiriRegularBuf) return "Amiri";
  return bold ? "Helvetica-Bold" : "Helvetica";
}

// دالة مساعدة: عكس النص العربي لـ pdfkit (RTL support)
function rtl(text: string): string {
  // pdfkit يدعم Unicode لكن يحتاج النص بالاتجاه الصحيح
  return text;
}

// ─────────────────────────────────────────────────────────
// Zod schema للمدخلات
// ─────────────────────────────────────────────────────────

const sceneSchema = z.object({
  label: z.string(),
  imageUrl: z.string().url(),
  arabicCaption: z.string().optional(),
  prompt: z.string().optional(),
});

const exportInputSchema = z.object({
  title: z.string().default("خيال — مشروع سينمائي"),
  titleEn: z.string().optional(),
  synopsis: z.string().optional(),
  synopsisEn: z.string().optional(),
  description: z.string().optional(),
  domain: z.string().optional(),
  filmTone: z.string().optional(),
  cinematicStyle: z.string().optional(),
  atmosphere: z.string().optional(),
  mainElements: z.array(z.string()).optional(),
  scenes: z.array(sceneSchema),
  format: z.enum(["pdf", "pptx", "docx"]),
});

// ─────────────────────────────────────────────────────────
// Helper: تحميل صورة من URL إلى Buffer
// ─────────────────────────────────────────────────────────
async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;
    const ab = await res.arrayBuffer();
    return Buffer.from(ab);
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────
// PDF سينمائي احترافي
// ─────────────────────────────────────────────────────────
async function buildPDF(input: z.infer<typeof exportInputSchema>): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: 0,
      info: {
        Title: input.title,
        Author: "خيال — KHAYAL AI",
        Subject: input.synopsis ?? input.description ?? "",
      },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // تسجيل الخطوط العربية
    registerArabicFonts(doc);

    const W = doc.page.width;   // 595
    const H = doc.page.height;  // 842

    // ── صفحة الغلاف ──────────────────────────────
    // خلفية داكنة
    doc.rect(0, 0, W, H).fill("#08090f");

    // صورة الغلاف (أول مشهد)
    if (input.scenes.length > 0) {
      const imgBuf = await fetchImageBuffer(input.scenes[0].imageUrl);
      if (imgBuf) {
        doc.save();
        doc.opacity(0.35);
        doc.image(imgBuf, 0, 0, { width: W, height: H, cover: [W, H] });
        doc.restore();
      }
    }

    // gradient overlay
    const grad = doc.linearGradient(0, H * 0.3, 0, H);
    grad.stop(0, "#08090f", 0).stop(1, "#08090f", 1);
    doc.rect(0, H * 0.3, W, H * 0.7).fill(grad);

    // شعار خيال
    doc.fontSize(11).fillColor("#a78bfa")
      .font(arabicFont(true))
      .text("✦ KHAYAL AI", 40, 40, { align: "left" });

    // العنوان
    doc.fontSize(36).fillColor("#ffffff")
      .font(arabicFont(true))
      .text(input.title, 40, H * 0.55, { width: W - 80, align: "center" });

    if (input.titleEn) {
      doc.fontSize(14).fillColor("rgba(167,139,250,0.7)")
        .font(arabicFont())
        .text(input.titleEn, 40, H * 0.55 + 50, { width: W - 80, align: "center" });
    }

    // الملخص
    if (input.synopsis) {
      doc.fontSize(11).fillColor("rgba(255,255,255,0.55)")
        .font(arabicFont())
        .text(input.synopsis, 60, H * 0.72, { width: W - 120, align: "center" });
    }

    // معلومات المشروع
    const meta = [
      input.domain && `النوع: ${input.domain}`,
      input.filmTone && `الأسلوب: ${input.filmTone}`,
      input.cinematicStyle && `الأسلوب السينمائي: ${input.cinematicStyle}`,
      `المشاهد: ${input.scenes.length}`,
    ].filter(Boolean);

    doc.fontSize(9).fillColor("rgba(167,139,250,0.5)").font(arabicFont())
      .text(meta.join("  ·  "), 40, H - 60, { width: W - 80, align: "center" });

    // ── صفحات المشاهد ────────────────────────────────────
    for (let i = 0; i < input.scenes.length; i++) {
      const scene = input.scenes[i];
      doc.addPage();

      // خلفية داكنة
      doc.rect(0, 0, W, H).fill("#0a0b12");

      // رقم المشهد
      doc.fontSize(9).fillColor("rgba(167,139,250,0.4)").font(arabicFont(true))
        .text(`المشهد ${i + 1} / ${input.scenes.length}`, 40, 30, { align: "left" });
      doc.fontSize(9).fillColor("rgba(167,139,250,0.4)").font(arabicFont())
        .text("✦ KHAYAL AI", 40, 30, { align: "right", width: W - 80 });

      // الصورة
      const imgBuf = await fetchImageBuffer(scene.imageUrl);
      const imgH = Math.round(W * 9 / 16); // نسبة 16:9
      if (imgBuf) {
        doc.image(imgBuf, 0, 55, { width: W, height: imgH, cover: [W, imgH] });
      } else {
        doc.rect(0, 55, W, imgH).fill("#1a1b2e");
        doc.fontSize(12).fillColor("#444").text("صورة غير متاحة", 0, 55 + imgH / 2, { align: "center", width: W });
      }

      // gradient على الصورة
      const imgGrad = doc.linearGradient(0, 55 + imgH - 80, 0, 55 + imgH);
      imgGrad.stop(0, "#0a0b12", 0).stop(1, "#0a0b12", 0.9);
      doc.rect(0, 55 + imgH - 80, W, 80).fill(imgGrad);

      // عنوان المشهد
      const textY = 55 + imgH + 20;
      doc.fontSize(18).fillColor("#ffffff").font(arabicFont(true))
        .text(scene.label, 40, textY, { width: W - 80, align: "right" });

      // التعليق العربي
      if (scene.arabicCaption) {
        doc.fontSize(11).fillColor("rgba(255,255,255,0.6)").font(arabicFont())
          .text(scene.arabicCaption, 40, textY + 35, { width: W - 80, align: "right" });
      }

      // الـ prompt (مصغر)
      if (scene.prompt) {
        const shortPrompt = scene.prompt.length > 120 ? scene.prompt.slice(0, 120) + "..." : scene.prompt;
        doc.fontSize(8).fillColor("rgba(167,139,250,0.4)").font(arabicFont())
          .text(shortPrompt, 40, textY + 70, { width: W - 80, align: "left" });
      }

      // خط فاصل
      doc.moveTo(40, H - 40).lineTo(W - 40, H - 40)
        .strokeColor("rgba(167,139,250,0.1)").lineWidth(0.5).stroke();

      // footer
      doc.fontSize(8).fillColor("rgba(167,139,250,0.3)").font(arabicFont())
        .text(`${input.title}  ·  خيال AI`, 40, H - 28, { align: "center", width: W - 80 });
    }

    // ── صفحة الملخص النهائي ───────────────────────────────
    doc.addPage();
    doc.rect(0, 0, W, H).fill("#08090f");

    doc.fontSize(9).fillColor("rgba(167,139,250,0.4)").font(arabicFont(true))
      .text("✦ KHAYAL AI", 40, 40, { align: "center", width: W - 80 });

    doc.fontSize(22).fillColor("#ffffff").font(arabicFont(true))
      .text("ملخص المشروع", 40, 80, { align: "center", width: W - 80 });

    let y = 130;

    if (input.synopsis) {
      doc.fontSize(12).fillColor("rgba(255,255,255,0.75)").font(arabicFont())
        .text(input.synopsis, 60, y, { width: W - 120, align: "right" });
      y += 80;
    }

    if (input.mainElements && input.mainElements.length > 0) {
      doc.fontSize(10).fillColor("rgba(167,139,250,0.7)").font(arabicFont(true))
        .text("العناصر الرئيسية:", 60, y, { align: "right", width: W - 120 });
      y += 20;
      input.mainElements.forEach((el) => {
        doc.fontSize(10).fillColor("rgba(255,255,255,0.55)").font(arabicFont())
          .text(`▸  ${el}`, 80, y, { align: "right", width: W - 140 });
        y += 18;
      });
    }

    doc.end();
  });
}

// ─────────────────────────────────────────────────────────
// PPT احترافي
// ─────────────────────────────────────────────────────────
async function buildPPTX(input: z.infer<typeof exportInputSchema>): Promise<Buffer> {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_16x9";
  pptx.author = "خيال AI";
  pptx.company = "KHAYAL AI";
  pptx.subject = input.synopsis ?? input.title;
  pptx.title = input.title;

  const DARK_BG = "08090f";
  const ACCENT = "a78bfa";
  const WHITE = "ffffff";

  // ── شريحة الغلاف ─────────────────────────────────────
  const coverSlide = pptx.addSlide();
  coverSlide.background = { color: DARK_BG };

  // صورة الغلاف
  if (input.scenes.length > 0) {
    const imgBuf = await fetchImageBuffer(input.scenes[0].imageUrl);
    if (imgBuf) {
      coverSlide.addImage({ data: `data:image/jpeg;base64,${imgBuf.toString("base64")}`, x: 0, y: 0, w: "100%", h: "100%", transparency: 65 });
    }
  }

  // gradient overlay
  coverSlide.addShape(pptx.ShapeType.rect, { x: 0, y: 2.5, w: "100%", h: 4.5, fill: { type: "solid", color: DARK_BG, transparency: 0 } });

  // شعار
  coverSlide.addText("✦ KHAYAL AI", { x: 0.3, y: 0.2, w: 3, h: 0.4, fontSize: 11, color: ACCENT, bold: true, fontFace: "Arial Unicode MS" });

  // العنوان
  coverSlide.addText(input.title, {
    x: 0.5, y: 2.8, w: 9, h: 1.2,
    fontSize: 40, color: WHITE, bold: true, fontFace: "Arial Unicode MS",
    align: "center",
  });

  if (input.titleEn) {
    coverSlide.addText(input.titleEn, {
      x: 0.5, y: 4.1, w: 9, h: 0.5,
      fontSize: 16, color: ACCENT, fontFace: "Arial Unicode MS", align: "center",
    });
  }

  if (input.synopsis) {
    const shortSynopsis = input.synopsis.length > 150 ? input.synopsis.slice(0, 150) + "..." : input.synopsis;
    coverSlide.addText(shortSynopsis, {
      x: 1, y: 4.8, w: 8, h: 0.8,
      fontSize: 12, color: "888888", fontFace: "Arial Unicode MS", align: "center",
    });
  }

  // معلومات
  const metaText = [
    input.domain && `النوع: ${input.domain}`,
    `المشاهد: ${input.scenes.length}`,
  ].filter(Boolean).join("  ·  ");
  coverSlide.addText(metaText, {
    x: 0, y: 6.8, w: "100%", h: 0.3,
    fontSize: 9, color: "555577", fontFace: "Arial Unicode MS", align: "center",
  });

  // ── شرائح المشاهد ─────────────────────────────────────
  for (let i = 0; i < input.scenes.length; i++) {
    const scene = input.scenes[i];
    const slide = pptx.addSlide();
    slide.background = { color: "0a0b12" };

    // الصورة (النصف العلوي)
    const imgBuf = await fetchImageBuffer(scene.imageUrl);
    if (imgBuf) {
      slide.addImage({
        data: `data:image/jpeg;base64,${imgBuf.toString("base64")}`,
        x: 0, y: 0, w: "100%", h: 4.2,
      });
    } else {
      slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: "100%", h: 4.2, fill: { color: "1a1b2e" } });
    }

    // gradient overlay على الصورة
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 3.2, w: "100%", h: 1,
      fill: { type: "solid", color: "0a0b12", transparency: 0 },
    });

    // رقم المشهد
    slide.addText(`${i + 1} / ${input.scenes.length}`, {
      x: 0.2, y: 0.1, w: 1.5, h: 0.3,
      fontSize: 9, color: ACCENT, bold: true, fontFace: "Arial Unicode MS",
    });

    // شعار
    slide.addText("✦ KHAYAL AI", {
      x: 8.3, y: 0.1, w: 1.5, h: 0.3,
      fontSize: 9, color: ACCENT, fontFace: "Arial Unicode MS", align: "right",
    });

    // عنوان المشهد
    slide.addText(scene.label, {
      x: 0.4, y: 4.3, w: 9.2, h: 0.7,
      fontSize: 22, color: WHITE, bold: true, fontFace: "Arial Unicode MS", align: "right",
    });

    // التعليق
    if (scene.arabicCaption) {
      slide.addText(scene.arabicCaption, {
        x: 0.4, y: 5.1, w: 9.2, h: 0.6,
        fontSize: 13, color: "aaaaaa", fontFace: "Arial Unicode MS", align: "right",
      });
    }

    // خط فاصل
    slide.addShape(pptx.ShapeType.line, {
      x: 0.4, y: 5.9, w: 9.2, h: 0,
      line: { color: "333355", width: 0.5 },
    });

    // footer
    slide.addText(input.title, {
      x: 0, y: 6.5, w: "100%", h: 0.3,
      fontSize: 8, color: "444466", fontFace: "Arial Unicode MS", align: "center",
    });
  }

  // ── شريحة الملخص ──────────────────────────────────────
  const summarySlide = pptx.addSlide();
  summarySlide.background = { color: DARK_BG };

  summarySlide.addText("✦ KHAYAL AI", {
    x: 0, y: 0.3, w: "100%", h: 0.4,
    fontSize: 11, color: ACCENT, bold: true, fontFace: "Arial Unicode MS", align: "center",
  });

  summarySlide.addText("ملخص المشروع", {
    x: 0.5, y: 1, w: 9, h: 0.8,
    fontSize: 28, color: WHITE, bold: true, fontFace: "Arial Unicode MS", align: "center",
  });

  if (input.synopsis) {
    summarySlide.addText(input.synopsis, {
      x: 1, y: 2, w: 8, h: 2,
      fontSize: 14, color: "cccccc", fontFace: "Arial Unicode MS", align: "right",
    });
  }

  if (input.mainElements && input.mainElements.length > 0) {
    const elemText = input.mainElements.map(e => `▸  ${e}`).join("\n");
    summarySlide.addText(elemText, {
      x: 1, y: 4.2, w: 8, h: 2,
      fontSize: 11, color: "888888", fontFace: "Arial Unicode MS", align: "right",
    });
  }

  const buf = await pptx.write({ outputType: "nodebuffer" }) as Buffer;
  return buf;
}

// ─────────────────────────────────────────────────────────
// DOCX احترافي
// ─────────────────────────────────────────────────────────
async function buildDOCX(input: z.infer<typeof exportInputSchema>): Promise<Buffer> {
  const children: any[] = [];

  // العنوان الرئيسي
  children.push(
    new Paragraph({
      children: [new TextRun({ text: input.title, bold: true, size: 52, color: "7c3aed", font: "Arial Unicode MS" })],
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.RIGHT,
      spacing: { after: 200 },
    })
  );

  if (input.titleEn) {
    children.push(new Paragraph({
      children: [new TextRun({ text: input.titleEn, size: 28, color: "888888", font: "Arial Unicode MS" })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }));
  }

  // خط فاصل
  children.push(new Paragraph({ children: [new TextRun({ text: "─".repeat(60), color: "dddddd", size: 16 })], spacing: { after: 300 } }));

  // الملخص
  if (input.synopsis) {
    children.push(new Paragraph({
      children: [new TextRun({ text: "الملخص", bold: true, size: 28, color: "7c3aed", font: "Arial Unicode MS" })],
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.RIGHT,
      spacing: { before: 200, after: 100 },
    }));
    children.push(new Paragraph({
      children: [new TextRun({ text: input.synopsis, size: 22, font: "Arial Unicode MS" })],
      alignment: AlignmentType.RIGHT,
      spacing: { after: 300 },
    }));
  }

  // معلومات المشروع
  const metaItems = [
    input.domain && { label: "النوع", value: input.domain },
    input.filmTone && { label: "الأسلوب", value: input.filmTone },
    input.cinematicStyle && { label: "الأسلوب السينمائي", value: input.cinematicStyle },
    input.atmosphere && { label: "الأجواء", value: input.atmosphere },
  ].filter(Boolean) as { label: string; value: string }[];

  if (metaItems.length > 0) {
    children.push(new Paragraph({
      children: [new TextRun({ text: "معلومات المشروع", bold: true, size: 28, color: "7c3aed", font: "Arial Unicode MS" })],
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.RIGHT,
      spacing: { before: 200, after: 100 },
    }));
    metaItems.forEach(({ label, value }) => {
      children.push(new Paragraph({
        children: [
          new TextRun({ text: `${label}: `, bold: true, size: 22, font: "Arial Unicode MS" }),
          new TextRun({ text: value, size: 22, font: "Arial Unicode MS" }),
        ],
        alignment: AlignmentType.RIGHT,
        spacing: { after: 80 },
      }));
    });
  }

  // العناصر الرئيسية
  if (input.mainElements && input.mainElements.length > 0) {
    children.push(new Paragraph({
      children: [new TextRun({ text: "العناصر الرئيسية", bold: true, size: 28, color: "7c3aed", font: "Arial Unicode MS" })],
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.RIGHT,
      spacing: { before: 200, after: 100 },
    }));
    input.mainElements.forEach((el) => {
      children.push(new Paragraph({
        children: [new TextRun({ text: `▸  ${el}`, size: 22, font: "Arial Unicode MS" })],
        alignment: AlignmentType.RIGHT,
        spacing: { after: 60 },
      }));
    });
  }

  // المشاهد
  children.push(new Paragraph({
    children: [new TextRun({ text: "المشاهد السينمائية", bold: true, size: 32, color: "7c3aed", font: "Arial Unicode MS" })],
    heading: HeadingLevel.HEADING_1,
    alignment: AlignmentType.RIGHT,
    spacing: { before: 400, after: 200 },
  }));

  for (let i = 0; i < input.scenes.length; i++) {
    const scene = input.scenes[i];

    // عنوان المشهد
    children.push(new Paragraph({
      children: [
        new TextRun({ text: `المشهد ${i + 1}: `, bold: true, size: 26, color: "a78bfa", font: "Arial Unicode MS" }),
        new TextRun({ text: scene.label, bold: true, size: 26, font: "Arial Unicode MS" }),
      ],
      heading: HeadingLevel.HEADING_2,
      alignment: AlignmentType.RIGHT,
      spacing: { before: 300, after: 100 },
    }));

    // الصورة
    const imgBuf = await fetchImageBuffer(scene.imageUrl);
    if (imgBuf) {
      children.push(new Paragraph({
        children: [new ImageRun({ data: imgBuf, transformation: { width: 500, height: 281 }, type: "jpg" })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 150 },
      }));
    }

    // التعليق
    if (scene.arabicCaption) {
      children.push(new Paragraph({
        children: [new TextRun({ text: scene.arabicCaption, size: 22, color: "666666", font: "Arial Unicode MS", italics: true })],
        alignment: AlignmentType.RIGHT,
        spacing: { after: 100 },
      }));
    }

    // الوصف التقني
    if (scene.prompt) {
      children.push(new Paragraph({
        children: [
          new TextRun({ text: "الوصف التقني: ", bold: true, size: 18, color: "999999", font: "Arial Unicode MS" }),
          new TextRun({ text: scene.prompt, size: 18, color: "999999", font: "Arial Unicode MS" }),
        ],
        alignment: AlignmentType.LEFT,
        spacing: { after: 200 },
      }));
    }

    // خط فاصل بين المشاهد
    if (i < input.scenes.length - 1) {
      children.push(new Paragraph({ children: [new TextRun({ text: "─".repeat(60), color: "eeeeee", size: 14 })], spacing: { after: 200 } }));
    }
  }

  // Footer
  children.push(new Paragraph({
    children: [new TextRun({ text: `تم إنشاؤه بواسطة خيال AI  ·  ${new Date().toLocaleDateString("ar-SA")}`, size: 16, color: "aaaaaa", font: "Arial Unicode MS" })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 400 },
  }));

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: { top: 720, bottom: 720, left: 900, right: 900 },
        },
      },
      children,
    }],
    styles: {
      default: {
        document: {
          run: { font: "Arial Unicode MS", size: 22 },
          paragraph: { alignment: AlignmentType.RIGHT },
        },
      },
    },
  });

  return Packer.toBuffer(doc);
}

// ─────────────────────────────────────────────────────────
// الـ Router
// ─────────────────────────────────────────────────────────
export const exportRouter = router({
  export: publicProcedure
    .input(exportInputSchema)
    .mutation(async ({ input }) => {
      let buffer: Buffer;
      let mimeType: string;
      let ext: string;

      if (input.format === "pdf") {
        buffer = await buildPDF(input);
        mimeType = "application/pdf";
        ext = "pdf";
      } else if (input.format === "pptx") {
        buffer = await buildPPTX(input);
        mimeType = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
        ext = "pptx";
      } else {
        buffer = await buildDOCX(input);
        mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        ext = "docx";
      }

      const safeTitle = (input.title || "khayal").replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, "_").slice(0, 40);
      const timestamp = Date.now();
      const key = `exports/${safeTitle}-${timestamp}.${ext}`;
      const { url } = await storagePut(key, buffer, mimeType);

      return { url, format: input.format, filename: `${safeTitle}.${ext}` };
    }),
});
