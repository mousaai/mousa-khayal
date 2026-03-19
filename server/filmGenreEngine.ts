/**
 * filmGenreEngine.ts — محرك الأنواع السينمائية
 * ─────────────────────────────────────────────────────────────
 * يكشف نوع الفيلم تلقائياً ويوفر DNA مخصص لكل نوع:
 * 1. سينمائي (Cinematic)
 * 2. وثائقي (Documentary)
 * 3. تعليمي (Educational)
 * 4. تاريخي (Historical)
 * 5. خيال علمي (Sci-Fi)
 * 6. أكشن (Action)
 * 7. دراما (Drama)
 * 8. تسويقي (Marketing)
 * 9. صحي/طبي (Medical)
 * 10. رعب (Horror)
 * 11. كوميدي (Comedy)
 * 12. ديني/روحاني (Spiritual)
 */

export type FilmGenre =
  | "cinematic"
  | "documentary"
  | "educational"
  | "historical"
  | "scifi"
  | "action"
  | "drama"
  | "marketing"
  | "medical"
  | "horror"
  | "comedy"
  | "spiritual"
  | "architectural"
  | "personal_transformation"
  | "general";

export interface FilmGenreDNA {
  genre: FilmGenre;
  labelAr: string;
  labelEn: string;
  emoji: string;
  color: string; // Tailwind color class
  cameraStyle: string;
  lightingStyle: string;
  colorGrading: string;
  narratorTone: string;
  promptPrefix: string;
  promptSuffix: string;
  paceDescription: string;
  musicStyle: string;
}

// ═══════════════════════════════════════════════════════════════
// GENRE DNA DATABASE
// ═══════════════════════════════════════════════════════════════
const GENRE_DNA: Record<FilmGenre, FilmGenreDNA> = {
  cinematic: {
    genre: "cinematic",
    labelAr: "سينمائي",
    labelEn: "Cinematic",
    emoji: "🎬",
    color: "bg-purple-600",
    cameraStyle: "dramatic camera movements, dolly shots, crane shots, slow motion",
    lightingStyle: "cinematic lighting, dramatic shadows, lens flares, anamorphic bokeh",
    colorGrading: "cinematic color grade, teal and orange, high contrast, film grain",
    narratorTone: "dramatic, powerful, emotional",
    promptPrefix: "Epic cinematic photograph, award-winning cinematography, Hollywood production quality,",
    promptSuffix: "dramatic lighting, cinematic composition, shallow depth of field, film grain, anamorphic lens",
    paceDescription: "dramatic pacing with emotional beats",
    musicStyle: "orchestral score, Hans Zimmer style",
  },

  documentary: {
    genre: "documentary",
    labelAr: "وثائقي",
    labelEn: "Documentary",
    emoji: "📽️",
    color: "bg-amber-600",
    cameraStyle: "steady handheld, slow pans, observational shots, natural movement",
    lightingStyle: "natural available light, soft diffused, realistic exposure",
    colorGrading: "natural color grade, slightly desaturated, documentary look",
    narratorTone: "informative, calm, authoritative, BBC style",
    promptPrefix: "Documentary photography, National Geographic style, photojournalism quality,",
    promptSuffix: "natural lighting, authentic atmosphere, real-world documentary aesthetic, sharp focus",
    paceDescription: "measured informative pacing",
    musicStyle: "ambient documentary score, subtle background music",
  },

  educational: {
    genre: "educational",
    labelAr: "تعليمي",
    labelEn: "Educational",
    emoji: "📚",
    color: "bg-blue-600",
    cameraStyle: "clear static shots, close-ups for details, explanatory angles",
    lightingStyle: "bright even lighting, no harsh shadows, clear visibility",
    colorGrading: "bright vivid colors, clean look, high clarity",
    narratorTone: "clear, friendly, educational, step-by-step",
    promptPrefix: "Educational illustration, clear and informative visual,",
    promptSuffix: "bright lighting, clean composition, educational infographic style, clear details",
    paceDescription: "clear step-by-step pacing",
    musicStyle: "upbeat educational background music",
  },

  historical: {
    genre: "historical",
    labelAr: "تاريخي",
    labelEn: "Historical",
    emoji: "🏛️",
    color: "bg-yellow-700",
    cameraStyle: "epic wide shots, period-accurate framing, painterly composition",
    lightingStyle: "warm golden tones, candlelight, torchlight, period-accurate lighting",
    colorGrading: "warm sepia tones, aged look, golden hour color grade, vintage film",
    narratorTone: "authoritative, epic, historical narrative",
    promptPrefix: "Historical epic photograph, period-accurate reconstruction, museum quality,",
    promptSuffix: "warm golden lighting, historical atmosphere, period-accurate details, painterly quality",
    paceDescription: "epic historical pacing",
    musicStyle: "classical orchestral, period instruments",
  },

  scifi: {
    genre: "scifi",
    labelAr: "خيال علمي",
    labelEn: "Sci-Fi",
    emoji: "🚀",
    color: "bg-cyan-600",
    cameraStyle: "futuristic angles, holographic elements, space photography",
    lightingStyle: "neon lights, bioluminescence, holographic glow, deep space lighting",
    colorGrading: "cool blue and cyan tones, neon accents, high tech look",
    narratorTone: "futuristic, visionary, scientific",
    promptPrefix: "Science fiction concept art, futuristic visualization, ultra-detailed sci-fi,",
    promptSuffix: "neon lighting, holographic elements, futuristic technology, deep space atmosphere",
    paceDescription: "dynamic futuristic pacing",
    musicStyle: "electronic ambient, Hans Zimmer Interstellar style",
  },

  action: {
    genre: "action",
    labelAr: "أكشن",
    labelEn: "Action",
    emoji: "⚡",
    color: "bg-red-600",
    cameraStyle: "dynamic angles, fast movement, dutch tilt, low angle hero shots",
    lightingStyle: "high contrast, dramatic shadows, explosive lighting, fire and sparks",
    colorGrading: "high contrast, desaturated with red/orange accents, gritty look",
    narratorTone: "intense, fast-paced, adrenaline",
    promptPrefix: "Action photography, dynamic motion, high energy scene,",
    promptSuffix: "dramatic lighting, motion blur, high contrast, intense atmosphere, cinematic action",
    paceDescription: "fast intense pacing",
    musicStyle: "intense percussion, action soundtrack",
  },

  drama: {
    genre: "drama",
    labelAr: "دراما",
    labelEn: "Drama",
    emoji: "🎭",
    color: "bg-rose-700",
    cameraStyle: "intimate close-ups, emotional framing, soft focus backgrounds",
    lightingStyle: "soft emotional lighting, window light, candle glow, intimate warmth",
    colorGrading: "warm emotional tones, soft contrast, romantic color grade",
    narratorTone: "emotional, intimate, empathetic",
    promptPrefix: "Dramatic portrait photography, emotional storytelling, intimate scene,",
    promptSuffix: "soft emotional lighting, shallow depth of field, intimate atmosphere, expressive",
    paceDescription: "slow emotional pacing",
    musicStyle: "emotional piano, strings, romantic score",
  },

  marketing: {
    genre: "marketing",
    labelAr: "تسويقي",
    labelEn: "Marketing",
    emoji: "📣",
    color: "bg-orange-500",
    cameraStyle: "product photography angles, clean backgrounds, lifestyle shots",
    lightingStyle: "studio lighting, bright clean, product-focused",
    colorGrading: "vibrant brand colors, clean crisp look, high saturation",
    narratorTone: "persuasive, enthusiastic, benefit-focused",
    promptPrefix: "Professional marketing photography, brand campaign quality, commercial production,",
    promptSuffix: "studio lighting, clean background, product-focused, commercial quality, vibrant colors",
    paceDescription: "energetic marketing pacing",
    musicStyle: "upbeat commercial music, brand jingle style",
  },

  medical: {
    genre: "medical",
    labelAr: "صحي/طبي",
    labelEn: "Medical",
    emoji: "🏥",
    color: "bg-teal-600",
    cameraStyle: "clinical precision, macro details, sterile environment",
    lightingStyle: "clinical white lighting, sterile bright, medical grade clarity",
    colorGrading: "clean clinical look, slight blue-white tone, high clarity",
    narratorTone: "professional, clear, medical authority",
    promptPrefix: "Medical illustration, clinical photography, health education visual,",
    promptSuffix: "clinical lighting, sterile environment, medical precision, educational clarity",
    paceDescription: "clear methodical pacing",
    musicStyle: "calm clinical background, minimal ambient",
  },

  horror: {
    genre: "horror",
    labelAr: "رعب",
    labelEn: "Horror",
    emoji: "👻",
    color: "bg-gray-900",
    cameraStyle: "unsettling angles, dutch tilt, extreme close-ups, dark corners",
    lightingStyle: "deep shadows, single harsh light source, fog, darkness",
    colorGrading: "desaturated, dark green/blue tones, high contrast shadows",
    narratorTone: "tense, unsettling, atmospheric",
    promptPrefix: "Horror atmospheric photography, dark cinematic, unsettling scene,",
    promptSuffix: "deep shadows, fog atmosphere, unsettling composition, dark horror aesthetic",
    paceDescription: "slow tense building pacing",
    musicStyle: "atmospheric horror score, tension building",
  },

  comedy: {
    genre: "comedy",
    labelAr: "كوميدي",
    labelEn: "Comedy",
    emoji: "😄",
    color: "bg-yellow-400",
    cameraStyle: "bright wide shots, expressive framing, playful angles",
    lightingStyle: "bright cheerful lighting, colorful, no harsh shadows",
    colorGrading: "bright saturated colors, warm cheerful tones, high key",
    narratorTone: "playful, humorous, light-hearted",
    promptPrefix: "Bright cheerful photography, playful scene, vibrant colors,",
    promptSuffix: "bright lighting, colorful background, playful atmosphere, cheerful composition",
    paceDescription: "light playful pacing",
    musicStyle: "upbeat fun music, comedic timing",
  },

  spiritual: {
    genre: "spiritual",
    labelAr: "ديني/روحاني",
    labelEn: "Spiritual",
    emoji: "🕌",
    color: "bg-emerald-700",
    cameraStyle: "peaceful wide shots, contemplative angles, sacred geometry",
    lightingStyle: "soft divine light, golden rays, peaceful glow, dawn/dusk",
    colorGrading: "warm golden tones, soft ethereal look, peaceful atmosphere",
    narratorTone: "peaceful, reverent, contemplative",
    promptPrefix: "Spiritual photography, sacred atmosphere, divine light,",
    promptSuffix: "soft golden light, peaceful atmosphere, spiritual composition, ethereal quality",
    paceDescription: "slow meditative pacing",
    musicStyle: "peaceful ambient, spiritual music, oud or flute",
  },

  architectural: {
    genre: "architectural",
    labelAr: "معماري",
    labelEn: "Architectural",
    emoji: "🏗️",
    color: "bg-slate-600",
    cameraStyle: "architectural photography angles, perspective lines, symmetry",
    lightingStyle: "golden hour, blue hour, dramatic shadows revealing geometry",
    colorGrading: "architectural photography grade, clean crisp, material-accurate",
    narratorTone: "professional, precise, design-focused",
    promptPrefix: "Ultra photorealistic architectural visualization, award-winning architectural photography,",
    promptSuffix: "architectural lighting, precise geometry, material textures, professional composition",
    paceDescription: "measured architectural pacing",
    musicStyle: "ambient architectural, minimal electronic",
  },

  personal_transformation: {
    genre: "personal_transformation",
    labelAr: "تحويل شخصي",
    labelEn: "Personal Transformation",
    emoji: "🪄",
    color: "bg-violet-600",
    cameraStyle: "portrait photography, intimate close-ups, identity-focused",
    lightingStyle: "flattering portrait lighting, soft box, Rembrandt lighting",
    colorGrading: "natural skin tones, flattering grade, portrait quality",
    narratorTone: "personal, transformative, identity-focused",
    promptPrefix: "Ultra photorealistic portrait photography, professional studio quality,",
    promptSuffix: "flattering portrait lighting, sharp facial features, professional photography",
    paceDescription: "intimate personal pacing",
    musicStyle: "personal emotional score",
  },

  general: {
    genre: "general",
    labelAr: "عام",
    labelEn: "General",
    emoji: "✨",
    color: "bg-indigo-600",
    cameraStyle: "versatile cinematic angles, dynamic composition",
    lightingStyle: "dramatic cinematic lighting, atmospheric",
    colorGrading: "cinematic color grade, vibrant and rich",
    narratorTone: "engaging, versatile",
    promptPrefix: "Ultra photorealistic cinematic photograph, stunning visual,",
    promptSuffix: "dramatic lighting, cinematic composition, high detail, professional quality",
    paceDescription: "dynamic engaging pacing",
    musicStyle: "cinematic score",
  },
};

// ═══════════════════════════════════════════════════════════════
// GENRE DETECTION — كشف نوع الفيلم من الوصف
// ═══════════════════════════════════════════════════════════════
export function detectFilmGenre(
  description: string,
  hasReferenceImage: boolean = false,
  hasDocument: boolean = false
): FilmGenre {
  const text = description.toLowerCase();

  // معماري
  if (
    hasDocument ||
    /مبن|بيت|فيلا|برج|مسجد|مدرسة|مستشفى|مكتب|واجهة|تصميم معماري|مخطط|طابق|building|villa|tower|mosque|facade|architectural|floor plan|شقة|عمارة|منزل|دار/.test(text)
  ) {
    return "architectural";
  }

  // تحويل شخصي
  if (
    hasReferenceImage &&
    /تخيلني|تخيل نفسي|حولني|اجعلني|كيف أكون|كيف سأكون|لو كنت|imagine me|transform me|make me|how would i look/.test(text)
  ) {
    return "personal_transformation";
  }

  // وثائقي
  if (
    /وثائقي|يحكي|يروي|دورة|رحلة.*من.*إلى|كيف يعمل|كيف يُصنع|كيف تُبنى|تاريخ.*حقيقي|documentary|how it.*made|how.*works|journey of|lifecycle|story of/.test(text)
  ) {
    return "documentary";
  }

  // تاريخي
  if (
    /تاريخ|قديم|حرب|معركة|فرسان|حضارة|عصر|قرن|خليفة|سلطان|ملك|history|ancient|war|battle|knight|civilization|century|medieval|empire/.test(text)
  ) {
    return "historical";
  }

  // خيال علمي
  if (
    /فضاء|مستقبل|روبوت|ذكاء اصطناعي|كوكب|مجرة|تقنية|هولوغرام|space|future|robot|ai|planet|galaxy|technology|hologram|cyberpunk|sci-fi/.test(text)
  ) {
    return "scifi";
  }

  // رعب
  if (
    /رعب|مخيف|مظلم|شبح|وحش|horror|scary|dark|ghost|monster|terrifying|haunted/.test(text)
  ) {
    return "horror";
  }

  // كوميدي
  if (
    /مضحك|كوميدي|فكاهة|نكتة|comedy|funny|humor|hilarious|laugh/.test(text)
  ) {
    return "comedy";
  }

  // أكشن
  if (
    /انفجار|مطاردة|قتال|أكشن|explosion|chase|fight|action|battle|combat|warrior/.test(text)
  ) {
    return "action";
  }

  // دراما
  if (
    /حب|عاطفة|حزن|فراق|دموع|drama|love|emotion|sad|separation|tears|romance/.test(text)
  ) {
    return "drama";
  }

  // تسويقي
  if (
    /إعلان|تسويق|منتج|علامة تجارية|عرض|advertisement|marketing|product|brand|commercial|promotion/.test(text)
  ) {
    return "marketing";
  }

  // صحي/طبي
  if (
    /طبي|صحة|علاج|جسم|تشريح|medical|health|treatment|body|anatomy|surgery|hospital/.test(text)
  ) {
    return "medical";
  }

  // تعليمي
  if (
    /تعليم|درس|شرح|كيف|لماذا|تعلم|educational|lesson|explain|how to|why|learn|science|biology/.test(text)
  ) {
    return "educational";
  }

  // ديني/روحاني
  if (
    /صلاة|مسجد|قرآن|دعاء|روحاني|إيمان|prayer|mosque|quran|spiritual|faith|divine|holy/.test(text)
  ) {
    return "spiritual";
  }

  // سينمائي (افتراضي للطلبات الخيالية والإبداعية)
  if (
    /تخيل|خيال|سينما|فيلم|مشهد|imagine|fantasy|cinematic|movie|scene/.test(text)
  ) {
    return "cinematic";
  }

  return "general";
}

// ═══════════════════════════════════════════════════════════════
// GET GENRE DNA
// ═══════════════════════════════════════════════════════════════
export function getGenreDNA(genre: FilmGenre): FilmGenreDNA {
  return GENRE_DNA[genre] ?? GENRE_DNA.general;
}

// ═══════════════════════════════════════════════════════════════
// BUILD GENRE-AWARE PROMPT
// ═══════════════════════════════════════════════════════════════
export function buildGenrePrompt(
  basePrompt: string,
  genre: FilmGenre,
  sceneIndex: number,
  totalScenes: number,
  characterDescription?: string
): string {
  const dna = getGenreDNA(genre);

  // وصف البطل إذا وُجد
  const characterPart = characterDescription
    ? `MAIN CHARACTER: ${characterDescription}. Preserve these exact facial features and appearance throughout. `
    : "";

  // تقدم القصة حسب موضع المشهد
  const progressPart =
    totalScenes > 1
      ? `Scene ${sceneIndex + 1} of ${totalScenes}. `
      : "";

  return `${dna.promptPrefix} ${progressPart}${characterPart}${basePrompt}, ${dna.lightingStyle}, ${dna.colorGrading}, ${dna.promptSuffix}`;
}

// ═══════════════════════════════════════════════════════════════
// GET ALL GENRES (for UI)
// ═══════════════════════════════════════════════════════════════
export function getAllGenres(): FilmGenreDNA[] {
  return Object.values(GENRE_DNA);
}
