/**
 * scriptEngine.ts — المقوم 2: محرك الكتابة التلقائية
 * ═══════════════════════════════════════════════════════════════
 * يكتب السيناريو الكامل للفيلم بالعربي والإنجليزي تلقائياً.
 * يعمل مع أي نوع محتوى: تعليمي، قصصي، وثائقي، معماري...
 *
 * المخرجات:
 * - سيناريو كامل بالعربي والإنجليزي
 * - نص تعليمي/قصصي لكل مشهد
 * - نص التعليق الصوتي (narration)
 * - ملخص وخاتمة
 */

import { invokeLLM } from "./_core/llm";
import type { DomainAnalysis, SceneOutline } from "./domainEngine";

// ══════════════════════════════════════════════════════════════
// أنواع السيناريو
// ══════════════════════════════════════════════════════════════

export interface FilmScript {
  // معلومات الفيلم
  title: { ar: string; en: string };
  synopsis: { ar: string; en: string };
  duration: number; // بالثواني

  // المقدمة
  intro: {
    text: { ar: string; en: string };
    narration: { ar: string; en: string };
    duration: number;
  };

  // المشاهد
  scenes: ScriptScene[];

  // الخاتمة
  outro: {
    text: { ar: string; en: string };
    narration: { ar: string; en: string };
    duration: number;
  };

  // ملخص تعليمي (للمحتوى التعليمي)
  educationalSummary?: {
    keyFacts: Array<{ ar: string; en: string }>;
    conclusion: { ar: string; en: string };
  };

  // معلومات إضافية
  targetAudience: string;
  language: string;
  generatedAt: string;
}

export interface ScriptScene {
  index: number;
  title: { ar: string; en: string };

  // النص الرئيسي
  mainText: { ar: string; en: string };

  // نص التعليق الصوتي
  narration: { ar: string; en: string };

  // معلومة تعليمية/علمية (للمحتوى التعليمي)
  educationalFact?: { ar: string; en: string };

  // نص قصصي (للمحتوى القصصي)
  storyText?: { ar: string; en: string };

  // بيانات بصرية
  visualDescription: string;
  cameraDirection: string;
  lightingNote: string;

  // مدة المشهد
  duration: number;

  // للعرض في الفيديو
  displayText: { ar: string; en: string }; // نص قصير للعرض على الشاشة
  caption: { ar: string; en: string };     // تعليق شعري قصير
}

// ══════════════════════════════════════════════════════════════
// المحرك الرئيسي
// ══════════════════════════════════════════════════════════════

export async function generateScript(
  description: string,
  analysis: DomainAnalysis
): Promise<FilmScript> {

  const isAr = analysis.detectedLanguage === "ar";
  const domainInstructions = getDomainInstructions(analysis.primaryDomain);

  const systemPrompt = `You are the world's greatest screenwriter and educational content creator.
You write compelling scripts for any type of film: educational, documentary, storytelling, architectural, scientific, historical, etc.

Content Domain: ${analysis.primaryDomain}
Film Tone: ${analysis.filmTone}
Audience: ${analysis.audienceLevel}
Language: ${analysis.detectedLanguage}

${domainInstructions}

WRITING RULES:
1. Write in BOTH Arabic and English for every text field
2. Arabic text should be natural, flowing, and appropriate for the audience
3. English text should be clear and professional
4. Educational facts must be scientifically accurate
5. Story text must be engaging and age-appropriate
6. Narration text should be suitable for voice-over reading
7. Display text (shown on screen) must be SHORT: max 8 words in Arabic, 10 in English
8. Captions should be poetic and evocative

Respond with valid JSON:
{
  "title": { "ar": "...", "en": "..." },
  "synopsis": { "ar": "...", "en": "..." },
  "intro": {
    "text": { "ar": "...", "en": "..." },
    "narration": { "ar": "...", "en": "..." },
    "duration": 8
  },
  "scenes": [
    {
      "index": 0,
      "title": { "ar": "...", "en": "..." },
      "mainText": { "ar": "...", "en": "..." },
      "narration": { "ar": "...", "en": "..." },
      "educationalFact": { "ar": "...", "en": "..." },
      "storyText": { "ar": "...", "en": "..." },
      "visualDescription": "...",
      "cameraDirection": "...",
      "lightingNote": "...",
      "duration": 8,
      "displayText": { "ar": "نص قصير للشاشة", "en": "Short screen text" },
      "caption": { "ar": "تعليق شعري", "en": "Poetic caption" }
    }
  ],
  "outro": {
    "text": { "ar": "...", "en": "..." },
    "narration": { "ar": "...", "en": "..." },
    "duration": 8
  },
  "educationalSummary": {
    "keyFacts": [
      { "ar": "حقيقة 1", "en": "Fact 1" }
    ],
    "conclusion": { "ar": "...", "en": "..." }
  }
}`;

  const sceneDescriptions = analysis.sceneOutline
    .map((s, i) => `Scene ${i + 1}: ${s.title.en} — ${s.description.en}`)
    .join("\n");

  try {
    const result = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Write a complete film script for: "${description}"\n\nPlanned scenes:\n${sceneDescriptions}`
        },
      ],
      responseFormat: { type: "json_object" },
      maxTokens: 6000,
    });

    const content = typeof result.choices[0].message.content === "string"
      ? result.choices[0].message.content
      : JSON.stringify(result.choices[0].message.content);

    const parsed = JSON.parse(content);

    return {
      ...parsed,
      duration: analysis.recommendedDurationSeconds,
      targetAudience: analysis.audienceLevel,
      language: analysis.detectedLanguage,
      generatedAt: new Date().toISOString(),
    } as FilmScript;

  } catch (err) {
    console.error("[ScriptEngine] AI script generation failed, using fallback:", err);
    return buildFallbackScript(description, analysis);
  }
}

// ══════════════════════════════════════════════════════════════
// تعليمات خاصة بكل مجال
// ══════════════════════════════════════════════════════════════

function getDomainInstructions(domain: string): string {
  const instructions: Record<string, string> = {
    educational: `
EDUCATIONAL FILM RULES:
- Each scene must teach ONE clear concept
- Include a surprising/fascinating fact per scene
- Use simple language for children, technical for professionals
- Build knowledge progressively (simple → complex)
- End with a memorable summary of key learnings
- Example topics: ant colony life, photosynthesis, solar system, human body`,

    storytelling: `
STORYTELLING FILM RULES:
- Follow classic story arc: setup → conflict → climax → resolution
- Create emotional connection with characters
- Use vivid, descriptive language that paints pictures
- Each scene should advance the story meaningfully
- Build tension and release appropriately for audience age
- End with a satisfying conclusion and moral`,

    documentary: `
DOCUMENTARY FILM RULES:
- Maintain journalistic objectivity and accuracy
- Use present tense for immediacy
- Include surprising statistics or facts
- Show cause-and-effect relationships
- Use expert-style narration (BBC/National Geographic tone)
- Balance information with emotional engagement`,

    architectural: `
ARCHITECTURAL FILM RULES:
- Describe spatial qualities and proportions
- Highlight design philosophy and cultural context
- Note materials, textures, and craftsmanship
- Explain functional and aesthetic decisions
- Show relationship between building and environment
- Capture the experience of moving through the space`,

    scientific: `
SCIENTIFIC FILM RULES:
- Maintain scientific accuracy at all times
- Use scale references to convey cosmic/microscopic sizes
- Explain complex concepts through visual metaphors
- Include recent discoveries and current understanding
- Build from observable to theoretical
- Inspire wonder and curiosity`,

    historical: `
HISTORICAL FILM RULES:
- Maintain historical accuracy for the period
- Bring history to life through human stories
- Show daily life, not just major events
- Include authentic cultural and social details
- Connect past to present relevance
- Use period-appropriate language and context`,

    natural: `
NATURAL WORLD FILM RULES:
- Show authentic animal behavior and ecology
- Highlight interconnections in ecosystems
- Use seasonal and environmental context
- Include survival strategies and adaptations
- Show beauty and drama of natural world
- Conservation message where appropriate`,

    spatial: `
COSMIC FILM RULES:
- Convey the incomprehensible scale of the universe
- Use Earth as reference point for scale
- Include current scientific understanding
- Show the beauty and violence of cosmic events
- Connect cosmic phenomena to human experience
- Inspire awe and wonder`,

    microscopic: `
MICROSCOPIC WORLD RULES:
- Show the hidden world invisible to naked eye
- Use familiar objects as scale references
- Explain biological/chemical processes visually
- Highlight the complexity of simple-seeming things
- Connect microscopic to macroscopic effects
- Make the invisible world accessible`,

    fantasy: `
FANTASY WORLD RULES:
- Build consistent internal logic for the world
- Create vivid, imaginative descriptions
- Balance wonder with emotional grounding
- Develop unique visual language for the world
- Create sense of discovery and exploration
- Leave room for imagination`,
  };

  return instructions[domain] || instructions.educational;
}

// ══════════════════════════════════════════════════════════════
// Fallback Script
// ══════════════════════════════════════════════════════════════

function buildFallbackScript(description: string, analysis: DomainAnalysis): FilmScript {
  const scenes: ScriptScene[] = analysis.sceneOutline.map((outline, i) => ({
    index: i,
    title: outline.title,
    mainText: outline.description,
    narration: {
      ar: `في هذا المشهد، نستكشف ${outline.title.ar}. ${outline.educationalFact?.ar || ""}`,
      en: `In this scene, we explore ${outline.title.en}. ${outline.educationalFact?.en || ""}`,
    },
    educationalFact: outline.educationalFact,
    storyText: outline.narrativeText,
    visualDescription: outline.visualFocus,
    cameraDirection: outline.cameraStyle,
    lightingNote: outline.lightingMood,
    duration: outline.duration,
    displayText: {
      ar: outline.title.ar.slice(0, 30),
      en: outline.title.en.slice(0, 40),
    },
    caption: {
      ar: outline.educationalFact?.ar?.slice(0, 50) || outline.title.ar,
      en: outline.educationalFact?.en?.slice(0, 60) || outline.title.en,
    },
  }));

  return {
    title: analysis.filmTitle,
    synopsis: analysis.filmSynopsis,
    duration: analysis.recommendedDurationSeconds,
    intro: {
      text: {
        ar: `مرحباً بكم في رحلة استكشافية لـ ${description}`,
        en: `Welcome to an exploratory journey of ${description}`,
      },
      narration: {
        ar: `في هذا الفيلم، سنكتشف معاً عالم ${description} من زوايا لم تشاهدها من قبل.`,
        en: `In this film, we will discover together the world of ${description} from angles you've never seen before.`,
      },
      duration: 8,
    },
    scenes,
    outro: {
      text: {
        ar: "شكراً لمشاهدتكم — خيال",
        en: "Thank you for watching — Khayal",
      },
      narration: {
        ar: "هذه كانت رحلتنا الاستكشافية. نأمل أن تكون قد استمتعتم وتعلمتم شيئاً جديداً.",
        en: "This was our exploratory journey. We hope you enjoyed and learned something new.",
      },
      duration: 6,
    },
    educationalSummary: {
      keyFacts: analysis.sceneOutline
        .filter(s => s.educationalFact)
        .map(s => s.educationalFact!)
        .slice(0, 5),
      conclusion: {
        ar: `${description} — عالم مذهل يستحق الاستكشاف`,
        en: `${description} — an amazing world worth exploring`,
      },
    },
    targetAudience: analysis.audienceLevel,
    language: analysis.detectedLanguage,
    generatedAt: new Date().toISOString(),
  };
}

// ══════════════════════════════════════════════════════════════
// مساعد: استخراج النص للعرض على الشاشة
// ══════════════════════════════════════════════════════════════

export function getSceneDisplayText(
  scene: ScriptScene,
  language: string
): { title: string; body: string; caption: string } {
  const isAr = language === "ar";
  return {
    title: isAr ? scene.title.ar : scene.title.en,
    body: isAr ? scene.displayText.ar : scene.displayText.en,
    caption: isAr ? scene.caption.ar : scene.caption.en,
  };
}
