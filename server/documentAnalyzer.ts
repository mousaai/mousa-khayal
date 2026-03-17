/**
 * documentAnalyzer.ts — محرك تحليل المستندات لمنصة خيال
 * يدعم: PDF / Word (DOCX) / صور المخططات
 * يستخرج: النصوص + الأبعاد + العناصر المعمارية + الوصف البصري
 */
import { invokeLLM } from "./_core/llm";

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════
export interface DocumentAnalysisResult {
  extractedText: string;
  projectTitle: string;
  projectType: string;
  dimensions: Array<{ element: string; value: string; unit: string }>;
  architecturalElements: string[];
  geometricMass: {
    shape: string;          // مستطيل / L-shape / U-shape / C-shape / دائري...
    estimatedWidth: string;
    estimatedLength: string;
    estimatedHeight: string;
    floorCount: number;
    setbacks: { front: string; back: string; left: string; right: string };
  };
  mainDescription: string;  // وصف موحّد للاستخدام في توليد الصور
  culturalContext: string;
  language: string;
  confidence: number;       // 0-1
}

// ═══════════════════════════════════════════════════════════════
// PDF EXTRACTION
// ═══════════════════════════════════════════════════════════════
export async function extractFromPDF(buffer: Buffer): Promise<string> {
  try {
    const pdfParse = await import("pdf-parse");
    const parseFn = (pdfParse as any).default ?? pdfParse;
    const data = await parseFn(buffer);
    return data.text || "";
  } catch (err) {
    console.error("[DocumentAnalyzer] PDF parse error:", err);
    return "";
  }
}

// ═══════════════════════════════════════════════════════════════
// WORD (DOCX) EXTRACTION
// ═══════════════════════════════════════════════════════════════
export async function extractFromWord(buffer: Buffer): Promise<string> {
  try {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value || "";
  } catch (err) {
    console.error("[DocumentAnalyzer] Word parse error:", err);
    return "";
  }
}

// ═══════════════════════════════════════════════════════════════
// IMAGE ANALYSIS (مخططات / صور معمارية)
// ═══════════════════════════════════════════════════════════════
export async function analyzeImageDocument(imageUrl: string): Promise<string> {
  try {
    const result = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are an expert architectural plan reader and civil engineer.
Analyze the provided architectural drawing/plan image and extract:
1. All visible dimensions and measurements (with units)
2. Room names and spaces
3. Building shape/mass (rectangular, L-shape, U-shape, C-shape, etc.)
4. Number of floors if visible
5. Setback distances if visible
6. Any text labels or annotations
7. Scale if indicated
8. North direction if shown
9. Total area if mentioned
10. Any special architectural features

Respond in the same language as the text in the image. Be precise and comprehensive.`,
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Analyze this architectural drawing and extract all information:" },
            { type: "image_url", image_url: { url: imageUrl, detail: "high" } },
          ],
        },
      ],
      maxTokens: 2000,
    });

    const content = result.choices[0]?.message?.content;
    return typeof content === "string" ? content : JSON.stringify(content);
  } catch (err) {
    console.error("[DocumentAnalyzer] Image analysis error:", err);
    return "";
  }
}

// ═══════════════════════════════════════════════════════════════
// DEEP AI ANALYSIS — تحليل عميق للنص المستخرج
// ═══════════════════════════════════════════════════════════════
export async function deepAnalyzeDocumentText(
  rawText: string,
  documentType: string,
  imageUrl?: string
): Promise<DocumentAnalysisResult> {

  const systemPrompt = `You are a world-class architectural analyst and visualization expert.
Analyze the provided document text (from a ${documentType}) and extract structured architectural information.

Your goal is to create a UNIFIED, COHERENT description of ONE architectural concept that can be visualized from multiple camera angles.

CRITICAL RULES for the description:
1. The description must represent ONE single architectural mass/building/space
2. Extract EXACT dimensions mentioned in the document (do not invent dimensions)
3. If dimensions are not mentioned, estimate based on context (e.g., "villa" = ~300-500m², "tower" = 20+ floors)
4. Identify the geometric mass shape accurately
5. The mainDescription must be detailed enough to generate photorealistic images that RESPECT the original proportions

Respond ONLY with valid JSON:
{
  "extractedText": "key extracted content (max 500 chars)",
  "projectTitle": "project title in original language",
  "projectType": "villa|apartment|tower|mosque|school|hospital|commercial|industrial|landscape|other",
  "language": "ISO 639-1 code",
  "dimensions": [
    {"element": "element name", "value": "numeric value", "unit": "m|cm|ft|sqm"}
  ],
  "architecturalElements": ["element1", "element2"],
  "geometricMass": {
    "shape": "rectangular|L-shape|U-shape|C-shape|T-shape|circular|irregular",
    "estimatedWidth": "X meters",
    "estimatedLength": "Y meters", 
    "estimatedHeight": "Z meters",
    "floorCount": N,
    "setbacks": {"front": "Xm", "back": "Xm", "left": "Xm", "right": "Xm"}
  },
  "mainDescription": "Comprehensive single-concept description for image generation. Must include: building type, architectural style, exact proportions, materials, key features. This will be used to generate multiple camera angles of THE SAME building.",
  "culturalContext": "detected cultural/regional context",
  "confidence": 0.0-1.0
}`;

  const userContent: any[] = [
    { type: "text", text: `Document type: ${documentType}\n\nExtracted content:\n${rawText.slice(0, 4000)}` },
  ];

  if (imageUrl) {
    userContent.push({
      type: "image_url",
      image_url: { url: imageUrl, detail: "high" },
    });
  }

  try {
    const result = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: imageUrl ? userContent : userContent[0].text },
      ],
      responseFormat: { type: "json_object" },
      maxTokens: 2500,
    });

    const content = typeof result.choices[0].message.content === "string"
      ? result.choices[0].message.content
      : JSON.stringify(result.choices[0].message.content);

    const parsed = JSON.parse(content);
    return {
      extractedText: parsed.extractedText || rawText.slice(0, 500),
      projectTitle: parsed.projectTitle || "مشروع معماري",
      projectType: parsed.projectType || "other",
      dimensions: parsed.dimensions || [],
      architecturalElements: parsed.architecturalElements || [],
      geometricMass: parsed.geometricMass || {
        shape: "rectangular",
        estimatedWidth: "unknown",
        estimatedLength: "unknown",
        estimatedHeight: "unknown",
        floorCount: 1,
        setbacks: { front: "5m", back: "3m", left: "2m", right: "2m" },
      },
      mainDescription: parsed.mainDescription || rawText.slice(0, 300),
      culturalContext: parsed.culturalContext || "Universal",
      language: parsed.language || "ar",
      confidence: parsed.confidence || 0.7,
    };
  } catch (err) {
    console.error("[DocumentAnalyzer] Deep analysis failed:", err);
    return {
      extractedText: rawText.slice(0, 500),
      projectTitle: "مشروع معماري",
      projectType: "other",
      dimensions: [],
      architecturalElements: [],
      geometricMass: {
        shape: "rectangular",
        estimatedWidth: "unknown",
        estimatedLength: "unknown",
        estimatedHeight: "unknown",
        floorCount: 1,
        setbacks: { front: "5m", back: "3m", left: "2m", right: "2m" },
      },
      mainDescription: rawText.slice(0, 300),
      culturalContext: "Universal",
      language: "ar",
      confidence: 0.3,
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// MAIN ENTRY POINT
// ═══════════════════════════════════════════════════════════════
export async function analyzeDocument(
  buffer: Buffer,
  mimeType: string,
  imageUrl?: string
): Promise<DocumentAnalysisResult> {
  let rawText = "";
  let documentType = "unknown";

  if (mimeType === "application/pdf") {
    rawText = await extractFromPDF(buffer);
    documentType = "PDF document";
  } else if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "application/msword"
  ) {
    rawText = await extractFromWord(buffer);
    documentType = "Word document";
  } else if (mimeType.startsWith("image/")) {
    // For images, use vision analysis
    if (imageUrl) {
      rawText = await analyzeImageDocument(imageUrl);
      documentType = "architectural drawing/image";
    }
  } else if (mimeType === "text/plain") {
    rawText = buffer.toString("utf-8");
    documentType = "text document";
  }

  // If we have an image URL alongside text, include it in deep analysis
  return deepAnalyzeDocumentText(rawText, documentType, imageUrl);
}
