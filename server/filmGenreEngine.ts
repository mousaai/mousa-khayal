/**
 * filmGenreEngine.ts — محرك الأنواع السينمائية
 * ─────────────────────────────────────────────────────────────
 * يكشف نوع الفيلم تلقائياً ويوفر DNA مخصص لكل نوع:
 * 1.  سينمائي (Cinematic)
 * 2.  وثائقي (Documentary)
 * 3.  تعليمي (Educational)
 * 4.  تاريخي (Historical)
 * 5.  خيال علمي (Sci-Fi)
 * 6.  أكشن (Action)
 * 7.  دراما (Drama)
 * 8.  تسويقي (Marketing)
 * 9.  صحي/طبي (Medical)
 * 10. رعب (Horror)
 * 11. كوميدي (Comedy)
 * 12. ديني/روحاني (Spiritual)
 * 13. معماري (Architectural)
 * 14. تحويل شخصي (Personal Transformation)
 * 15. ثقافي/تراثي (Cultural) — جديد
 * 16. فني/إبداعي (Artistic) — جديد
 * 17. طبيعي/بيئي (Nature) — جديد
 * 18. هندسي/تقني (Engineering) — جديد
 * 19. مجهري/علمي (Microscopic) — جديد
 * 20. عام (General)
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
  | "cultural"
  | "artistic"
  | "nature"
  | "engineering"
  | "microscopic"
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
    promptPrefix: "Educational scientific illustration, clear and informative visual, textbook quality,",
    promptSuffix: "bright clean lighting, educational clarity, detailed labels, scientific accuracy, infographic style",
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
    promptPrefix: "Medical illustration, clinical photography, health education visual, anatomical precision,",
    promptSuffix: "clinical lighting, sterile environment, medical precision, educational clarity, anatomical detail",
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
    promptPrefix: "Spiritual photography, sacred atmosphere, divine light, reverent composition,",
    promptSuffix: "soft golden light, peaceful atmosphere, spiritual composition, ethereal quality, sacred beauty",
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

  // ─── المجالات الجديدة ───────────────────────────────────────

  cultural: {
    genre: "cultural",
    labelAr: "ثقافي/تراثي",
    labelEn: "Cultural",
    emoji: "🏺",
    color: "bg-amber-800",
    cameraStyle: "immersive wide shots, detail close-ups, anthropological framing",
    lightingStyle: "warm natural light, market lanterns, golden afternoon sun, authentic atmosphere",
    colorGrading: "rich warm tones, earthy colors, vibrant cultural palette, authentic look",
    narratorTone: "respectful, curious, culturally sensitive, storytelling",
    promptPrefix: "Cultural heritage photography, National Geographic quality, authentic cultural scene,",
    promptSuffix: "warm natural lighting, rich cultural details, traditional atmosphere, vibrant colors, authentic environment",
    paceDescription: "immersive cultural pacing",
    musicStyle: "traditional folk music, regional instruments, cultural soundscape",
  },

  artistic: {
    genre: "artistic",
    labelAr: "فني/إبداعي",
    labelEn: "Artistic",
    emoji: "🎨",
    color: "bg-pink-600",
    cameraStyle: "artistic composition, rule of thirds, abstract framing, creative angles",
    lightingStyle: "dramatic artistic lighting, chiaroscuro, colorful studio lights, creative shadows",
    colorGrading: "vibrant artistic colors, painterly look, expressive color palette, high saturation",
    narratorTone: "creative, expressive, artistic, poetic",
    promptPrefix: "Fine art photography, museum quality artwork, artistic masterpiece,",
    promptSuffix: "dramatic artistic lighting, expressive composition, painterly quality, gallery-worthy, creative vision",
    paceDescription: "expressive artistic pacing",
    musicStyle: "classical music, jazz, contemporary art score",
  },

  nature: {
    genre: "nature",
    labelAr: "طبيعي/بيئي",
    labelEn: "Nature",
    emoji: "🌿",
    color: "bg-green-700",
    cameraStyle: "wide landscape shots, wildlife photography, macro nature details, aerial views",
    lightingStyle: "golden hour sunlight, dappled forest light, blue hour, natural atmospheric light",
    colorGrading: "lush natural greens, vivid blues, earthy tones, National Geographic color grade",
    narratorTone: "awe-inspiring, peaceful, environmental, David Attenborough style",
    promptPrefix: "Nature photography masterpiece, National Geographic quality, breathtaking natural scene,",
    promptSuffix: "golden natural light, lush environment, atmospheric depth, wildlife photography quality, pristine nature",
    paceDescription: "peaceful natural pacing",
    musicStyle: "nature ambient sounds, peaceful orchestral, environmental score",
  },

  engineering: {
    genre: "engineering",
    labelAr: "هندسي/تقني",
    labelEn: "Engineering",
    emoji: "⚙️",
    color: "bg-gray-600",
    cameraStyle: "technical precision shots, structural angles, scale-revealing composition",
    lightingStyle: "industrial lighting, dramatic structural shadows, technical clarity",
    colorGrading: "industrial color grade, steel blues and grays, technical precision look",
    narratorTone: "technical, precise, informative, engineering authority",
    promptPrefix: "Engineering photography, technical precision, industrial masterpiece,",
    promptSuffix: "dramatic industrial lighting, structural details, engineering precision, scale and power, technical excellence",
    paceDescription: "methodical technical pacing",
    musicStyle: "industrial ambient, technical score, mechanical rhythm",
  },

  microscopic: {
    genre: "microscopic",
    labelAr: "مجهري/علمي",
    labelEn: "Microscopic",
    emoji: "🔬",
    color: "bg-indigo-700",
    cameraStyle: "extreme macro, electron microscopy style, molecular visualization",
    lightingStyle: "bioluminescent glow, fluorescent microscopy colors, inner light sources",
    colorGrading: "fluorescent colors, scientific visualization palette, glowing cellular tones",
    narratorTone: "scientific, precise, awe-inspiring, discovery-focused",
    promptPrefix: "Electron microscopy visualization, scientific macro photography, molecular world,",
    promptSuffix: "fluorescent microscopy colors, bioluminescent glow, extreme detail, scientific precision, molecular scale",
    paceDescription: "slow discovery pacing",
    musicStyle: "ambient electronic, scientific discovery score",
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

  // معماري — يجب أن يكون قبل الروحاني لأن "مسجد" قد يتعارض
  if (
    hasDocument ||
    /مبن|بيت|فيلا|برج|مدرسة|مستشفى|مكتب|واجهة|تصميم معماري|مخطط|طابق|building|villa|tower|school|hospital|facade|architectural|floor plan|شقة|عمارة|منزل|دار/.test(text)
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

  // ديني/روحاني — قبل الوثائقي لأن "رحلة" قد تكون رحلة حج
  if (
    /صلاة|قرآن|دعاء|روحاني|إيمان|حج|عمرة|كعبة|مكة|مدينة منورة|نبي|رسول|prayer|quran|spiritual|faith|divine|holy|pilgrimage|mecca|medina/.test(text)
  ) {
    return "spiritual";
  }

  // طبي/صحي — قبل التعليمي لأن "كيف يعمل الجسم" قد يكون طبياً
  if (
    /طبي|صحة|علاج|تشريح|جراح|دم|قلب|مخ|عظم|عضلة|خلية حيوانية|medical|health|treatment|anatomy|surgery|hospital|blood|heart|brain|bone|muscle|organ|disease|virus|bacteria/.test(text)
  ) {
    return "medical";
  }

  // مجهري/علمي — قبل التعليمي
  if (
    /مجهر|خلية|جين|dna|rna|جزيء|ذرة|بروتين|فيروس|بكتيريا|microscope|cell|gene|molecule|atom|protein|virus|bacteria|microscopic|nano|quantum particle/.test(text)
  ) {
    return "microscopic";
  }

  // وثائقي
  if (
    /وثائقي|يحكي|يروي|دورة|رحلة.*من.*إلى|كيف يعمل|كيف يُصنع|كيف تُبنى|تاريخ.*حقيقي|documentary|how it.*made|how.*works|journey of|lifecycle|story of/.test(text)
  ) {
    return "documentary";
  }

  // تاريخي
  if (
    /تاريخ|قديم|حرب|معركة|فرسان|حضارة|عصر|قرن|خليفة|سلطان|ملك|فرعون|روماني|إغريقي|history|ancient|war|battle|knight|civilization|century|medieval|empire|pharaoh|roman|greek/.test(text)
  ) {
    return "historical";
  }

  // ثقافي/تراثي — قبل الخيال العلمي
  if (
    /ثقافة|تراث|عادات|تقاليد|أزياء تقليدية|سوق|قبيلة|شعب|فولكلور|موروث|culture|heritage|tradition|customs|folk|tribal|ethnic|traditional market|souk|bazaar|cultural/.test(text)
  ) {
    return "cultural";
  }

  // خيال علمي — بعد الهندسي لأن "تقنية" قد تكون هندسية
  if (
    /فضاء|مستقبل|روبوت|ذكاء اصطناعي|كوكب|مجرة|ثقب أسود|نجم|هولوغرام|space|future|robot|ai|planet|galaxy|black hole|star|hologram|cyberpunk|sci-fi|cosmos|nebula/.test(text)
  ) {
    return "scifi";
  }

  // هندسي/تقني
  if (
    /هندسة|جسر|سد|نفق|طريق|بنية تحتية|آلة|محرك|مصنع|توربين|engineering|bridge|dam|tunnel|road|infrastructure|machine|engine|factory|turbine|mechanical|industrial|construction/.test(text)
  ) {
    return "engineering";
  }

  // طبيعي/بيئي
  if (
    /غابة|بحر|نهر|جبل|صحراء|سماء|حيوان|نبات|بيئة|مناخ|محيط|forest|ocean|mountain|desert|sky|animal|plant|environment|climate|wildlife|landscape|nature|ecosystem/.test(text)
  ) {
    return "nature";
  }

  // فني/إبداعي
  if (
    /فن|لوحة|نحت|رسم|موسيقى|رقص|مسرح|أداء|تصوير فوتوغرافي|art|painting|sculpture|drawing|music|dance|theater|performance|photography|creative|abstract|artistic/.test(text)
  ) {
    return "artistic";
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

  // تعليمي
  if (
    /تعليم|درس|شرح|كيف|لماذا|تعلم|educational|lesson|explain|how to|why|learn|science|biology/.test(text)
  ) {
    return "educational";
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
