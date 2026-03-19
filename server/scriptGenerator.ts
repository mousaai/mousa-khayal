/**
 * ScriptGenerator — مولّد سيناريوهات ضخم
 * يولّد 10,000+ سيناريو محلياً من مصفوفة متغيرات
 * بدون أي اعتماد على LLM خارجي
 */

export interface GeneratedScene {
  label: string;
  prompt: string;
  caption: string;
  duration: number;
}

export interface GeneratedScript {
  title: string;
  titleEn: string;
  domain: string;
  genre: string;
  style: string;
  level: string;
  keywords: string;
  scenes: GeneratedScene[];
  narration: string;
  musicMood: string;
}

// ═══════════════════════════════════════════════════════════
// مصفوفة المتغيرات — 20 مجال × 15 نوع × 10 أسلوب × 3 مستوى
// ═══════════════════════════════════════════════════════════

const DOMAINS = [
  { id: "nature", ar: "الطبيعة", en: "Nature", keywords: "طبيعة,غابة,جبل,نهر,بحر,صحراء,شلال" },
  { id: "architecture", ar: "العمارة", en: "Architecture", keywords: "عمارة,مبنى,قصر,برج,جسر,معبد,قلعة" },
  { id: "science", ar: "العلوم", en: "Science", keywords: "علوم,فضاء,كيمياء,فيزياء,أحياء,تقنية,اختراع" },
  { id: "history", ar: "التاريخ", en: "History", keywords: "تاريخ,حضارة,قديم,أثر,تراث,ملك,معركة" },
  { id: "travel", ar: "السفر", en: "Travel", keywords: "سفر,مدينة,رحلة,مطار,فندق,شارع,ميناء" },
  { id: "culture", ar: "الثقافة", en: "Culture", keywords: "ثقافة,فن,موسيقى,رقص,مهرجان,تقاليد,شعب" },
  { id: "food", ar: "الطعام", en: "Food", keywords: "طعام,مطبخ,وصفة,مطعم,أكل,نكهة,توابل" },
  { id: "sport", ar: "الرياضة", en: "Sport", keywords: "رياضة,كرة,سباق,بطولة,رياضي,ملعب,فريق" },
  { id: "technology", ar: "التقنية", en: "Technology", keywords: "تقنية,ذكاء,روبوت,برمجة,إنترنت,جهاز,مستقبل" },
  { id: "ocean", ar: "المحيط", en: "Ocean", keywords: "محيط,بحر,سمك,مرجان,غوص,موجة,عمق" },
  { id: "space", ar: "الفضاء", en: "Space", keywords: "فضاء,نجوم,كوكب,مجرة,قمر,شمس,كون" },
  { id: "animals", ar: "الحيوانات", en: "Animals", keywords: "حيوانات,أسد,نسر,دلفين,فيل,ذئب,فراشة" },
  { id: "urban", ar: "المدينة", en: "Urban", keywords: "مدينة,شارع,ناطحة,حركة,ضوء,ليل,حضري" },
  { id: "desert", ar: "الصحراء", en: "Desert", keywords: "صحراء,رمال,واحة,إبل,كثبان,حرارة,سراب" },
  { id: "forest", ar: "الغابة", en: "Forest", keywords: "غابة,أشجار,أوراق,طيور,ضباب,ظل,خضراء" },
  { id: "mountains", ar: "الجبال", en: "Mountains", keywords: "جبال,قمة,ثلج,صخور,وادي,ارتفاع,هواء" },
  { id: "rivers", ar: "الأنهار", en: "Rivers", keywords: "نهر,شلال,ماء,ضفة,قارب,صيد,هدوء" },
  { id: "ancient", ar: "الحضارات القديمة", en: "Ancient Civilizations", keywords: "فراعنة,رومان,يونان,مايا,صين,هند,عرب" },
  { id: "future", ar: "المستقبل", en: "Future", keywords: "مستقبل,خيال,تقنية,مدينة,طائرة,روبوت,طاقة" },
  { id: "art", ar: "الفن", en: "Art", keywords: "فن,لوحة,نحت,رسم,ألوان,إبداع,متحف" },
];

const GENRES = [
  { id: "documentary", ar: "وثائقي", en: "Documentary", tone: "informative" },
  { id: "cinematic", ar: "سينمائي", en: "Cinematic", tone: "dramatic" },
  { id: "educational", ar: "تعليمي", en: "Educational", tone: "clear" },
  { id: "travel", ar: "سياحي", en: "Travel", tone: "inspiring" },
  { id: "nature_film", ar: "فيلم طبيعة", en: "Nature Film", tone: "peaceful" },
  { id: "historical", ar: "تاريخي", en: "Historical", tone: "epic" },
  { id: "scientific", ar: "علمي", en: "Scientific", tone: "analytical" },
  { id: "cultural", ar: "ثقافي", en: "Cultural", tone: "warm" },
  { id: "adventure", ar: "مغامرات", en: "Adventure", tone: "exciting" },
  { id: "meditation", ar: "تأملي", en: "Meditation", tone: "calm" },
  { id: "promotional", ar: "ترويجي", en: "Promotional", tone: "energetic" },
  { id: "artistic", ar: "فني", en: "Artistic", tone: "creative" },
  { id: "news", ar: "إخباري", en: "News", tone: "neutral" },
  { id: "social", ar: "اجتماعي", en: "Social", tone: "human" },
  { id: "inspirational", ar: "إلهامي", en: "Inspirational", tone: "motivating" },
];

const STYLES = [
  { id: "dramatic", ar: "درامي", musicMood: "epic" },
  { id: "calm", ar: "هادئ", musicMood: "ambient" },
  { id: "energetic", ar: "نشيط", musicMood: "upbeat" },
  { id: "mysterious", ar: "غامض", musicMood: "mysterious" },
  { id: "romantic", ar: "رومانسي", musicMood: "romantic" },
  { id: "epic", ar: "ملحمي", musicMood: "orchestral" },
  { id: "minimalist", ar: "بسيط", musicMood: "minimal" },
  { id: "nostalgic", ar: "حنيني", musicMood: "nostalgic" },
  { id: "futuristic", ar: "مستقبلي", musicMood: "electronic" },
  { id: "traditional", ar: "تقليدي", musicMood: "traditional" },
];

const LEVELS = [
  { id: "simple", ar: "بسيط", sceneCount: 3 },
  { id: "medium", ar: "متوسط", sceneCount: 5 },
  { id: "advanced", ar: "متقدم", sceneCount: 7 },
];

// قوالب المشاهد لكل مجال
const SCENE_TEMPLATES: Record<string, Array<{ label: string; promptTemplate: string; captionTemplate: string }>> = {
  nature: [
    { label: "المشهد الافتتاحي", promptTemplate: "Wide aerial shot of {domain_ar} landscape, golden hour lighting, cinematic, 8K", captionTemplate: "تنبسط أمامنا {domain_ar} في أبهى صورها" },
    { label: "التفاصيل", promptTemplate: "Close-up macro shot of {domain_ar} details, water droplets, natural light", captionTemplate: "في كل تفصيل من تفاصيل {domain_ar} آية من آيات الجمال" },
    { label: "الحركة", promptTemplate: "Dynamic motion shot of {domain_ar}, wind movement, slow motion", captionTemplate: "تتحرك {domain_ar} في إيقاع أزلي" },
    { label: "الضوء والظل", promptTemplate: "Dramatic light and shadow in {domain_ar}, rays of light, atmospheric", captionTemplate: "يرسم الضوء لوحته على {domain_ar}" },
    { label: "الخاتمة", promptTemplate: "Sunset panorama of {domain_ar}, silhouette, golden sky, peaceful", captionTemplate: "تودّع {domain_ar} يومها بهدوء وجلال" },
  ],
  architecture: [
    { label: "الواجهة الكبرى", promptTemplate: "Grand facade of {domain_ar} building, architectural photography, symmetry", captionTemplate: "يشمخ {domain_ar} شاهداً على عبقرية الإنسان" },
    { label: "التفاصيل المعمارية", promptTemplate: "Intricate architectural details of {domain_ar}, patterns, textures, close-up", captionTemplate: "في كل زخرفة قصة تروى" },
    { label: "الداخل", promptTemplate: "Interior of {domain_ar}, columns, light through windows, depth", captionTemplate: "يدعوك الداخل إلى عالم من الفخامة" },
    { label: "المنظور الجوي", promptTemplate: "Aerial view of {domain_ar} complex, urban context, bird's eye", captionTemplate: "من الأعلى يتجلى عظم {domain_ar}" },
    { label: "في الليل", promptTemplate: "Night photography of {domain_ar}, illuminated, reflections, dramatic", captionTemplate: "يتألق {domain_ar} في عباءة الليل" },
  ],
  space: [
    { label: "الكون الواسع", promptTemplate: "Deep space nebula, stars, cosmic dust, vibrant colors, NASA style", captionTemplate: "في أعماق الكون تتشكل عوالم لا تُحصى" },
    { label: "الكواكب", promptTemplate: "Planet surface, craters, atmosphere, space photography style", captionTemplate: "كل كوكب عالم قائم بذاته" },
    { label: "المجرة", promptTemplate: "Milky way galaxy, spiral arms, star clusters, long exposure", captionTemplate: "مجرتنا جزيرة من النجوم في محيط الكون" },
    { label: "الشمس", promptTemplate: "Solar flares, sun surface, plasma, extreme close-up, scientific", captionTemplate: "تنبض الشمس بطاقة تُضيء حياتنا" },
    { label: "الأفق الكوني", promptTemplate: "Space horizon, earth from orbit, blue marble, ISS view", captionTemplate: "من الفضاء تبدو الأرض جوهرة زرقاء" },
  ],
  desert: [
    { label: "الكثبان الذهبية", promptTemplate: "Golden sand dunes, desert landscape, wind patterns, sunrise", captionTemplate: "تمتد الكثبان الذهبية حتى الأفق" },
    { label: "الواحة", promptTemplate: "Desert oasis, palm trees, water reflection, lush green", captionTemplate: "في قلب الصحراء تنبت الحياة" },
    { label: "السراب", promptTemplate: "Desert mirage, heat waves, distant horizon, atmospheric", captionTemplate: "يخدع السراب العين في قلب الصحراء" },
    { label: "الليل الصحراوي", promptTemplate: "Desert night, stars, Milky Way, sand dunes silhouette", captionTemplate: "تتجلى النجوم في صفاء سماء الصحراء" },
    { label: "قافلة الإبل", promptTemplate: "Camel caravan silhouette, desert sunset, ancient trade route", captionTemplate: "تسير القوافل كما سارت منذ آلاف السنين" },
  ],
};

// قالب افتراضي لأي مجال
const DEFAULT_SCENE_TEMPLATES = [
  { label: "المشهد الافتتاحي", promptTemplate: "Cinematic wide shot of {domain_en}, golden hour, professional photography", captionTemplate: "نبدأ رحلتنا في عالم {domain_ar}" },
  { label: "التفاصيل", promptTemplate: "Close-up details of {domain_en}, textures, natural light, macro", captionTemplate: "نقترب لنكتشف أسرار {domain_ar}" },
  { label: "المنظور الواسع", promptTemplate: "Panoramic view of {domain_en}, landscape, atmospheric perspective", captionTemplate: "تتسع الرؤية لتشمل {domain_ar} بأكملها" },
  { label: "اللحظة المميزة", promptTemplate: "Dramatic moment in {domain_en}, perfect timing, cinematic lighting", captionTemplate: "هذه اللحظة تلخص جوهر {domain_ar}" },
  { label: "الخاتمة", promptTemplate: "Sunset/golden hour final shot of {domain_en}, peaceful, wide angle", captionTemplate: "تختم {domain_ar} رحلتنا بصورة لا تُنسى" },
];

// ═══════════════════════════════════════════════════════════
// مولّد السيناريو الفردي
// ═══════════════════════════════════════════════════════════

function generateSingleScript(
  domain: typeof DOMAINS[0],
  genre: typeof GENRES[0],
  style: typeof STYLES[0],
  level: typeof LEVELS[0]
): GeneratedScript {
  const templates = SCENE_TEMPLATES[domain.id] || DEFAULT_SCENE_TEMPLATES;
  const sceneCount = level.sceneCount;
  const selectedTemplates = templates.slice(0, sceneCount);

  const scenes: GeneratedScene[] = selectedTemplates.map((t, i) => ({
    label: t.label,
    prompt: t.promptTemplate
      .replace(/{domain_ar}/g, domain.ar)
      .replace(/{domain_en}/g, domain.en)
      + `, ${style.ar} style, ${genre.en} tone`,
    caption: t.captionTemplate.replace(/{domain_ar}/g, domain.ar),
    duration: level.id === "simple" ? 4 : level.id === "medium" ? 5 : 6,
  }));

  const narrationParts = scenes.map((s, i) => s.caption);
  const narration = narrationParts.join("... ");

  const titleTemplates = [
    `${domain.ar}: ${genre.ar} ${style.ar}`,
    `رحلة في ${domain.ar}`,
    `${domain.ar} من منظور ${genre.ar}`,
    `عالم ${domain.ar}`,
    `اكتشف ${domain.ar}`,
  ];
  const titleIndex = (DOMAINS.indexOf(domain) + GENRES.indexOf(genre)) % titleTemplates.length;

  return {
    title: titleTemplates[titleIndex],
    titleEn: `${domain.en}: ${genre.en} ${style.id}`,
    domain: domain.id,
    genre: genre.id,
    style: style.id,
    level: level.id,
    keywords: `${domain.keywords},${genre.ar},${style.ar}`,
    scenes,
    narration,
    musicMood: style.musicMood,
  };
}

// ═══════════════════════════════════════════════════════════
// المولّد الضخم — يولّد كل التوليفات الممكنة
// ═══════════════════════════════════════════════════════════

export function generateAllScripts(): GeneratedScript[] {
  const scripts: GeneratedScript[] = [];

  for (const domain of DOMAINS) {
    for (const genre of GENRES) {
      for (const style of STYLES) {
        for (const level of LEVELS) {
          scripts.push(generateSingleScript(domain, genre, style, level));
        }
      }
    }
  }

  return scripts;
}

// إحصاء: 20 × 15 × 10 × 3 = 9,000 سيناريو
export function countTotalScripts(): number {
  return DOMAINS.length * GENRES.length * STYLES.length * LEVELS.length;
}

// ═══════════════════════════════════════════════════════════
// البحث الذكي — يجد أقرب سيناريو لأي وصف نصي
// ═══════════════════════════════════════════════════════════

export interface ScriptSearchResult {
  script: GeneratedScript;
  score: number;
  matchedKeywords: string[];
}

export function smartSearchScripts(
  query: string,
  scripts: GeneratedScript[],
  topK: number = 3
): ScriptSearchResult[] {
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/[\s,،]+/).filter(w => w.length > 1);

  const results: ScriptSearchResult[] = scripts.map(script => {
    const scriptText = `${script.title} ${script.keywords} ${script.domain} ${script.genre}`.toLowerCase();
    const matchedKeywords: string[] = [];
    let score = 0;

    for (const word of queryWords) {
      if (scriptText.includes(word)) {
        matchedKeywords.push(word);
        score += word.length > 3 ? 3 : 1; // كلمات أطول = وزن أعلى
      }
    }

    // مكافأة التطابق الكامل
    if (scriptText.includes(queryLower)) score += 10;

    // مكافأة تطابق المجال
    const domainData = DOMAINS.find(d => d.id === script.domain);
    if (domainData && queryLower.includes(domainData.ar)) score += 5;

    return { script, score, matchedKeywords };
  });

  return results
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

// ═══════════════════════════════════════════════════════════
// كشف المجال والنوع من النص
// ═══════════════════════════════════════════════════════════

export function detectDomainAndGenre(text: string): { domain: string; genre: string; style: string } {
  const textLower = text.toLowerCase();

  let bestDomain = DOMAINS[0];
  let bestDomainScore = 0;

  for (const domain of DOMAINS) {
    const keywords = domain.keywords.split(",");
    let score = 0;
    for (const kw of keywords) {
      if (textLower.includes(kw)) score++;
    }
    if (score > bestDomainScore) {
      bestDomainScore = score;
      bestDomain = domain;
    }
  }

  // كشف النوع من الكلمات المفتاحية
  let bestGenre = GENRES[0];
  const genreHints: Record<string, string[]> = {
    documentary: ["وثائقي", "تاريخ", "حقيقة", "واقع"],
    cinematic: ["سينما", "فيلم", "درامي", "مشهد"],
    educational: ["تعليم", "تعلم", "معلومة", "شرح"],
    travel: ["سفر", "رحلة", "سياحة", "زيارة"],
    inspirational: ["إلهام", "دافع", "نجاح", "حلم"],
  };

  for (const [genreId, hints] of Object.entries(genreHints)) {
    if (hints.some(h => textLower.includes(h))) {
      bestGenre = GENRES.find(g => g.id === genreId) || GENRES[0];
      break;
    }
  }

  // كشف الأسلوب
  let bestStyle = STYLES[0];
  const styleHints: Record<string, string[]> = {
    calm: ["هادئ", "سلام", "راحة", "طمأنينة"],
    dramatic: ["درامي", "مثير", "قوي", "مؤثر"],
    epic: ["ملحمي", "عظيم", "تاريخي", "بطولي"],
    nostalgic: ["حنين", "ذكريات", "قديم", "ماضي"],
  };

  for (const [styleId, hints] of Object.entries(styleHints)) {
    if (hints.some(h => textLower.includes(h))) {
      bestStyle = STYLES.find(s => s.id === styleId) || STYLES[0];
      break;
    }
  }

  return {
    domain: bestDomain.id,
    genre: bestGenre.id,
    style: bestStyle.id,
  };
}

// ═══════════════════════════════════════════════════════════
// توليد سيناريو واحد بناءً على وصف نصي
// ═══════════════════════════════════════════════════════════

export function generateScriptFromText(text: string, sceneCount: number = 5): GeneratedScript {
  const { domain, genre, style } = detectDomainAndGenre(text);

  const domainData = DOMAINS.find(d => d.id === domain) || DOMAINS[0];
  const genreData = GENRES.find(g => g.id === genre) || GENRES[0];
  const styleData = STYLES.find(s => s.id === style) || STYLES[0];
  const levelData = LEVELS.find(l => l.sceneCount === sceneCount) || LEVELS[1];

  return generateSingleScript(domainData, genreData, styleData, levelData);
}
