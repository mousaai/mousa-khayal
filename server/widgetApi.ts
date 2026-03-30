import { Express, Request, Response } from "express";
import { invokeLLM } from "./_core/llm";
import { sdk } from "./_core/sdk";
import { getOrCreateWallet, deductCredits } from "./db";

const WIDGET_CREDIT_COST = 5; // كريدت لكل رسالة في ثاني الذكي

// ── Knowledge Base ────────────────────────────────────────────────────────────
const MOUSA_SYSTEM_PROMPT = `أنت "ثاني الذكي" — المساعد الذكي الرسمي لمنصة mousa.ai، المنظومة الرقمية الذكية للبناء والعمران.

## هويتك
- اسمك: ثاني الذكي
- دورك: مرشد ذكي ومستشار هندسي رقمي وعميل تسويقي ذكي
- شخصيتك: محترف، ودود، دقيق، يتحدث بالعربية بشكل طبيعي وسلس
- لغتك الافتراضية: العربية (تتحدث الإنجليزية إذا خاطبك المستخدم بها)
- هدفك: مساعدة المستخدمين على الاستفادة القصوى من المنصة وتحقيق أهدافهم الهندسية

## المنصات الست التي تعرفها جيداً

### 1. فضاء (FADA) — المستشار الذكي للديكور الداخلي
- **ما تفعله**: تحليل المساحات الداخلية وتقديم توصيات تصميمية احترافية
- **كيف تعمل**: صف مساحتك بلغتك الطبيعية → تحليل الإضاءة والألوان والأثاث → توصيات مخصصة
- **تكلفة**: 15–40 كريدت لكل جلسة
- **مناسبة لـ**: المصممين الداخليين، أصحاب المنازل، المقاولين
- **الرابط**: /fada
- **حقول النموذج المتاحة**: chat_input (حقل المحادثة الرئيسي)
- **أمثلة على الاستخدام**: "أريد تصميم غرفة معيشة 30م² بطراز عصري"، "ما أفضل ألوان لغرفة النوم؟"

### 2. رقابة (RAQABA) — المشرف الميداني الذكي
- **ما تفعله**: تفتيش مواقع البناء عبر الصور وإصدار تقارير فورية
- **كيف تعمل**: ارفع صور موقع البناء → رصد المخالفات → تقييم التقدم الإنشائي → تقرير فوري
- **تكلفة**: 20–50 كريدت لكل تقرير
- **مناسبة لـ**: المهندسين الميدانيين، المشرفين، أصحاب المشاريع
- **الرابط**: /raqaba
- **أمثلة على الاستخدام**: "أريد تقرير تفتيش لموقع بناء فيلا"، "هل هناك مخالفات في هذه الصورة؟"

### 3. حرارة (HARARA) — محلل الكفاءة الطاقوية
- **ما تفعله**: تحليل الأحمال الحرارية وتوصيات تحسين الكفاءة الطاقوية
- **كيف تعمل**: أدخل بيانات المبنى والموقع → حساب الأحمال الحرارية → توصيات الكفاءة
- **تكلفة**: 25–60 كريدت لكل تحليل
- **مناسبة لـ**: مهندسي الميكانيكا، مصممي أنظمة التكييف، المطورين العقاريين
- **الرابط**: /harara
- **أمثلة على الاستخدام**: "أريد حساب الأحمال الحرارية لمبنى 500م² في الرياض"

### 4. مسكن (MASKAN) — محلل الاحتياجات السكنية
- **ما تفعله**: تحليل الوضع المالي والاحتياجات الأسرية للتوصية بأنسب خيار سكني
- **كيف تعمل**: أدخل بيانات الأسرة والوضع المالي → تحليل الخيارات → توصية مدروسة
- **تكلفة**: 10–30 كريدت لكل تحليل
- **مناسبة لـ**: الأسر الباحثة عن سكن، المستثمرين العقاريين، المستشارين الماليين
- **الرابط**: /maskan
- **أمثلة على الاستخدام**: "أريد تحليل خيارات السكن لأسرة من 4 أفراد بدخل 15,000 ريال"

### 5. كود (CODE) — مرجع الكودات الهندسية
- **ما تفعله**: البحث في أكثر من 700 بند من كودات البناء والسلامة والاشتراطات الفنية
- **كيف تعمل**: اكتب سؤالك أو الموضوع → بحث دقيق في الكودات → إجابة مباشرة مع المرجع
- **تكلفة**: 5–15 كريدت لكل بحث
- **مناسبة لـ**: المهندسين، المقاولين، المفتشين، طلاب الهندسة
- **الرابط**: https://archicodesa-wzq39rwg.manus.space/
- **أمثلة على الاستخدام**: "ما اشتراطات السلامة من الحريق للمباني السكنية؟"

### 6. خيال (KHAYAL) — مولد المرئيات السينمائية
- **ما تفعله**: تحويل أي وصف نصي إلى صورة أو فيديو سينمائي بالذكاء الاصطناعي
- **كيف تعمل**: اكتب وصفاً للمشهد أو المشروع → توليد صورة أو فيديو احترافي بجودة سينمائية
- **تكلفة**: 20–60 كريدت لكل مرئية
- **مناسبة لـ**: المعماريين، المصممين الداخليين، المطورين العقاريين، صانعي المحتوى
- **الرابط**: https://tashkila3d-bxekpajg.manus.space/
- **أمثلة على الاستخدام**: "أريد صورة لفيلا عصرية بالطراز السعودي"، "ابنِ مرئية لمشروع برج تجاري في الرياض"

## نظام الكريدت
- **الكريدت الافتراضي**: 200 كريدت مجاناً عند التسجيل
- **خطط الاشتراك**:
  - المبتدئ: 500 كريدت / شهر بـ 29 دولار
  - الاحترافي: 2000 كريدت / شهر بـ 79 دولار
  - المؤسسي: كريدت غير محدود بـ 199 دولار
- **شراء كريدت إضافي**: متاح في لوحة التحكم على /pricing

## قدراتك كعميل ذكي
يمكنك تنفيذ إجراءات على الصفحة نيابةً عن المستخدم:

### أوامر التنقل
- **NAVIGATE**: الانتقال لصفحة معينة
- **OPEN_PLATFORM**: فتح منصة محددة مع رسالة مسبقة اختيارية

### أوامر التفاعل
- **CLICK_SMART**: الضغط على زر بالنص أو المعرّف
- **FILL_FIELD**: ملء حقل واحد بقيمة محددة
- **FILL_FORM**: ملء عدة حقول دفعة واحدة
- **FILL_CHAT_INPUT**: ملء حقل المحادثة في منصة ما (مع submit=true للإرسال الفوري)
- **HIGHLIGHT_ELEMENT**: تحديد وإبراز عنصر للمستخدم
- **SCROLL**: التمرير لعنصر معين

### أوامر الجولة
- **START_TOUR**: بدء جولة تعريفية بالمنصات الست

### أوامر الحركة الذكية
- **MOVE_ORB**: تحريك الأوربة لعنصر محدد (target: اسم العنصر أو CSS selector) أو موضع (position: top-right/top-left/bottom-right/bottom-left)
- **PLAY_VIDEO**: تشغيل فيديو تثقيفي في الصفحة
- **SKIP_VIDEO**: تخطي الفيديو التثقيفي
- **SET_VOICE**: تغيير صوت ثاني (target: "thani" للصوت الذكوري أو "noura" للصوت الأنثوي)

## متى تستخدم الأوامر
1. إذا قال المستخدم "خذني لـ..." أو "افتح..." → استخدم NAVIGATE أو OPEN_PLATFORM
2. إذا قال "ساعدني في تحليل مساحة 150م²" → استخدم OPEN_PLATFORM مع فضاء و FILL_CHAT_INPUT
3. إذا قال "ابدأ جولة" أو "عرّفني بالمنصات" → استخدم START_TOUR
4. إذا قال "اضغط على زر ..." → استخدم CLICK_SMART
5. إذا قال "أريد حساب الأحمال الحرارية" وهو في صفحة حرارة → استخدم FILL_CHAT_INPUT مع رسالة مناسبة
6. عند شرح منصة معينة → استخدم MOVE_ORB للتحرك نحو بطاقة المنصة لإبرازها
7. إذا كان هناك فيديو تثقيفي وطلب المستخدم مشاهدته → استخدم PLAY_VIDEO
8. إذا طلب تخطي الفيديو → استخدم SKIP_VIDEO
9. إذا طلب تغيير الصوت → استخدم SET_VOICE

## قواعد مهمة
- كن موجزاً في ردودك (3-5 جمل)
- إذا كان المستخدم في صفحة منصة، اقترح استخدامها مباشرة
- إذا كان المستخدم يصف مشكلة هندسية، اقترح المنصة المناسبة وانقله إليها
- لا تخترع معلومات غير موجودة في هذا الدليل
- استخدم الأرقام والحقائق الدقيقة دائماً`;

// ── TTS Configuration ─────────────────────────────────────────────────────────
const ELEVENLABS_MODEL = "eleven_flash_v2_5"; // Fastest model, great Arabic support
const TTS_TIMEOUT_MS = 20000; // 20 seconds timeout (increased from 12s)
const TTS_MAX_RETRIES = 3;    // Retry up to 3 times on failure
const TTS_MAX_CHARS = 500;    // Max characters per TTS request

// Voice profiles: male (Thani) and female (Alyazia) Arabic voices
const VOICE_PROFILES: Record<string, { id: string; name: string; nameAr: string }> = {
  thani:  { id: "6LC8fQJu1Jg3bglhviXA", name: "Thani",   nameAr: "ثاني"    },  // Arabic male
  noura:  { id: "nPczCjzI2devNBz1zQrb", name: "Alyazia", nameAr: "اليازية" },  // Arabic female
  // Legacy aliases for backwards compatibility
  mousa:  { id: "6LC8fQJu1Jg3bglhviXA", name: "Thani",   nameAr: "ثاني"    },
  asmaa:  { id: "nPczCjzI2devNBz1zQrb", name: "Alyazia", nameAr: "اليازية" },
};

// ── TTS Helper with retry logic ───────────────────────────────────────────────
async function textToSpeech(
  text: string,
  voiceKey = "thani",
  options: { speed?: number; stability?: number } = {}
): Promise<{ audio: string; mimeType: string }> {
  const profile = VOICE_PROFILES[voiceKey] ?? VOICE_PROFILES.thani;
  const ELEVENLABS_VOICE_ID = profile.id;
  const elKey = process.env.ELEVENLABS_API_KEY;

  if (!elKey) {
    throw new Error("ElevenLabs API key not configured");
  }

  // Clamp speed between 0.7 and 1.2 for natural Arabic speech
  const speed = Math.min(1.2, Math.max(0.7, options.speed ?? 1.0));
  // Stability: higher = more consistent, lower = more expressive
  const stability = Math.min(0.9, Math.max(0.3, options.stability ?? 0.65));

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= TTS_MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`,
        {
          method: "POST",
          headers: {
            "xi-api-key": elKey,
            "Content-Type": "application/json",
            "Accept": "audio/mpeg",
          },
          body: JSON.stringify({
            text,
            model_id: ELEVENLABS_MODEL,
            voice_settings: {
              stability,
              similarity_boost: 0.85,
              style: 0.25,
              use_speaker_boost: true,
              speed,
            },
          }),
          signal: AbortSignal.timeout(TTS_TIMEOUT_MS),
        }
      );

      if (response.ok) {
        const buffer = await response.arrayBuffer();
        const base64 = Buffer.from(buffer).toString("base64");
        console.log(`[Widget TTS] Success on attempt ${attempt} — voice: ${profile.nameAr}, chars: ${text.length}`);
        return { audio: base64, mimeType: "audio/mpeg" };
      }

      // Handle rate limiting — wait before retry
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get("retry-after") || "2", 10);
        console.warn(`[Widget TTS] Rate limited, waiting ${retryAfter}s before retry ${attempt}/${TTS_MAX_RETRIES}`);
        await new Promise(r => setTimeout(r, retryAfter * 1000));
        lastError = new Error(`ElevenLabs rate limited (429)`);
        continue;
      }

      // Handle server errors — retry
      if (response.status >= 500) {
        const errText = await response.text();
        console.warn(`[Widget TTS] Server error ${response.status} on attempt ${attempt}:`, errText.slice(0, 100));
        lastError = new Error(`ElevenLabs server error: ${response.status}`);
        if (attempt < TTS_MAX_RETRIES) {
          await new Promise(r => setTimeout(r, 1000 * attempt)); // exponential backoff
        }
        continue;
      }

      // Client error — don't retry
      const errText = await response.text();
      console.error("[Widget TTS] Client error:", response.status, errText.slice(0, 200));
      throw new Error(`ElevenLabs client error: ${response.status}`);

    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      if (attempt < TTS_MAX_RETRIES) {
        console.warn(`[Widget TTS] Attempt ${attempt} failed, retrying:`, lastError.message);
        await new Promise(r => setTimeout(r, 800 * attempt));
      }
    }
  }

  throw lastError ?? new Error("TTS service unavailable after retries");
}

// ── Split long text into speakable chunks ─────────────────────────────────────
function splitTextForTTS(text: string, maxChars = TTS_MAX_CHARS): string[] {
  if (text.length <= maxChars) return [text];

  const chunks: string[] = [];
  // Split on sentence boundaries (Arabic and Latin)
  const sentences = text.split(/(?<=[.!?؟،\n])\s+/);
  let current = "";

  for (const sentence of sentences) {
    if ((current + sentence).length > maxChars && current) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current += (current ? " " : "") + sentence;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

// ── Register Widget API Routes ────────────────────────────────────────────────
export function registerWidgetApiRoutes(app: Express) {
  // Widget Chat endpoint
  app.post("/api/widget/chat", async (req: Request, res: Response) => {
    try {
      const { message, context, history, voice, speed } = req.body;

      if (!message?.trim()) {
        return res.status(400).json({ error: "Message is required" });
      }

      // ── Credit Check ─────────────────────────────────────────────────────────
      let userId: number | null = null;
      try {
        const user = await sdk.authenticateRequest(req);
        userId = user.id;
        const wallet = await getOrCreateWallet(userId);
        if (wallet.balance < WIDGET_CREDIT_COST) {
          return res.status(402).json({
            reply: `رصيد الكريدت غير كافٍ. تحتاج ${WIDGET_CREDIT_COST} كريدت للمحادثة مع ثاني الذكي. رصيدك الحالي: ${wallet.balance} كريدت. يمكنك شراء كريدت من صفحة الأسعار.`,
            uiCommand: { ui_command: "NAVIGATE", target: "/pricing" },
            creditError: true,
          });
        }
      } catch {
        // المستخدم غير مسجل دخول — السماح بـ 3 رسائل مجانية (guest mode)
        userId = null;
      }

      // Build conversation history
      const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
        { role: "system", content: MOUSA_SYSTEM_PROMPT },
      ];

      // Add page context
      if (context) {
        messages.push({
          role: "system",
          content: `معلومات الجلسة الحالية: ${context}`,
        });
      }

      // Add conversation history (last 8 messages)
      if (Array.isArray(history)) {
        const recent = history.slice(-8);
        for (const msg of recent) {
          if (msg.role === "user" || msg.role === "assistant") {
            messages.push({ role: msg.role, content: msg.content });
          }
        }
      }

      // Add current user message
      messages.push({ role: "user", content: message });

      // Call LLM with structured output for UI commands
      const result = await invokeLLM({
        messages,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "widget_response",
            strict: true,
            schema: {
              type: "object",
              properties: {
                reply: {
                  type: "string",
                  description: "الرد النصي للمستخدم — موجز وواضح (3-5 جمل)"
                },
                uiCommand: {
                  type: "object",
                  description: "أمر اختياري للتحكم في واجهة المستخدم — استخدمه عندما يطلب المستخدم تنفيذ إجراء",
                  properties: {
                    ui_command: {
                      type: "string",
                      enum: [
                        "START_TOUR",
                        "NAVIGATE",
                        "SCROLL",
                        "CLICK_SMART",
                        "SHOW_CHAT",
                        "HIDE_CHAT",
                        "FILL_FIELD",
                        "FILL_FORM",
                        "FILL_CHAT_INPUT",
                        "HIGHLIGHT_ELEMENT",
                        "OPEN_PLATFORM",
                        "MOVE_ORB",
                        "PLAY_VIDEO",
                        "SKIP_VIDEO",
                        "SET_VOICE"
                      ]
                    },
                    target: {
                      type: "string",
                      description: "الهدف — مسار URL أو CSS selector أو اسم المنصة أو اسم الصوت"
                    },
                    value: {
                      type: "string",
                      description: "القيمة المراد إدخالها في الحقل أو الرسالة المراد إرسالها"
                    },
                    submit: {
                      type: "boolean",
                      description: "هل يتم إرسال النموذج/الرسالة تلقائياً بعد الملء؟"
                    },
                    fields: {
                      type: "array",
                      description: "قائمة الحقول لملء نموذج كامل",
                      items: {
                        type: "object",
                        properties: {
                          field: { type: "string", description: "اسم الحقل (data-mousa-field value)" },
                          selector: { type: "string", description: "CSS selector للحقل" },
                          value: { type: "string", description: "القيمة المراد إدخالها" }
                        },
                        required: ["value"],
                        additionalProperties: false
                      }
                    }
                  },
                  required: ["ui_command"],
                  additionalProperties: false
                }
              },
              required: ["reply"],
              additionalProperties: false
            }
          }
        }
      });

      const content = result.choices[0]?.message?.content;
      let parsed: { reply: string; uiCommand?: object } = { reply: "" };

      try {
        parsed = JSON.parse(typeof content === "string" ? content : JSON.stringify(content));
      } catch {
        parsed = { reply: typeof content === "string" ? content : "عذراً، حدث خطأ. يرجى المحاولة مجدداً." };
      }

      const replyText = parsed.reply || "عذراً، لم أفهم سؤالك. هل يمكنك إعادة الصياغة؟";

      // ── Attempt TTS inline — include audio in chat response ─────────────────
      const voiceKey = (typeof voice === "string" && VOICE_PROFILES[voice])
        ? voice
        : "thani";
      const ttsSpeed = typeof speed === "number" ? speed : 1.0;

      let audioBase64: string | null = null;
      let audioMime = "audio/mpeg";
      let ttsAvailable = false;

      try {
        // Use first chunk for inline audio (most important part)
        const ttsText = replyText.slice(0, TTS_MAX_CHARS);
        const ttsResult = await textToSpeech(ttsText, voiceKey, { speed: ttsSpeed });
        audioBase64 = ttsResult.audio;
        audioMime = ttsResult.mimeType;
        ttsAvailable = true;
      } catch (ttsErr) {
        console.warn("[Widget Chat] TTS failed, falling back to browser TTS:", ttsErr);
      }

      // ── Deduct Credits ────────────────────────────────────────────────────────
      if (userId !== null) {
        const costToCharge = ttsAvailable ? WIDGET_CREDIT_COST : Math.ceil(WIDGET_CREDIT_COST / 2);
        try {
          const deduction = await deductCredits(
            userId,
            costToCharge,
            "ثاني_الذكي",
            ttsAvailable ? "محادثة مع ثاني الذكي" : "محادثة مع ثاني الذكي (نص فقط — الصوت غير متاح)"
          );
          if (!deduction.success) {
            console.error(`[Widget Chat] Credit deduction failed for user ${userId}:`, deduction.error);
          }
        } catch (deductErr) {
          console.error(`[Widget Chat] Credit deduction error for user ${userId}:`, deductErr);
        }
      }

      return res.json({
        reply: replyText,
        uiCommand: (parsed as any).uiCommand || null,
        audio: audioBase64,
        audioMime,
        ttsAvailable,
        voiceUsed: voiceKey,
      });
    } catch (err) {
      console.error("[Widget Chat] Error:", err);
      return res.status(500).json({
        reply: "عذراً، حدث خطأ مؤقت. يرجى المحاولة مجدداً.",
        uiCommand: null,
      });
    }
  });

  // Widget TTS endpoint — supports multi-voice with speed control
  app.post("/api/widget/tts", async (req: Request, res: Response) => {
    try {
      const { text, voice, speed } = req.body;

      if (!text?.trim()) {
        return res.status(400).json({ error: "Text is required" });
      }

      const truncated = text.slice(0, TTS_MAX_CHARS);
      const voiceKey = typeof voice === "string" && VOICE_PROFILES[voice] ? voice : "thani";
      const ttsSpeed = typeof speed === "number" ? Math.min(1.2, Math.max(0.7, speed)) : 1.0;

      const result = await textToSpeech(truncated, voiceKey, { speed: ttsSpeed });
      return res.json({
        ...result,
        voiceUsed: voiceKey,
        charCount: truncated.length,
      });
    } catch (err) {
      console.error("[Widget TTS] Error:", err);
      return res.status(503).json({ error: "TTS service unavailable, use browser TTS" });
    }
  });

  // Widget voices list endpoint
  app.get("/api/widget/voices", (_req: Request, res: Response) => {
    const voices = Object.entries(VOICE_PROFILES)
      .filter(([key]) => !["mousa", "asmaa"].includes(key)) // exclude legacy aliases
      .map(([key, v]) => ({ key, name: v.nameAr, nameEn: v.name }));
    return res.json({ voices });
  });

  // Widget health check
  app.get("/api/widget/health", (_req: Request, res: Response) => {
    return res.json({
      status: "ok",
      ttsConfigured: !!process.env.ELEVENLABS_API_KEY,
      model: ELEVENLABS_MODEL,
      voices: Object.keys(VOICE_PROFILES).filter(k => !["mousa", "asmaa"].includes(k)),
    });
  });

  console.log("[Widget API] Routes registered: /api/widget/chat, /api/widget/tts, /api/widget/voices, /api/widget/health");
}
