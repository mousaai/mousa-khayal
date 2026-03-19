/**
 * مكتبة سيناريوهات جاهزة — تعمل بدون LLM
 * تُستخدم عند انتهاء حد الاستخدام أو عند طلب المستخدم سيناريو فورياً
 */

export interface PrebuiltScene {
  title: string;
  imagePrompt: string;
  narration: string;
  duration: number;
  transition: "fade" | "dissolve" | "cut" | "wipe";
  motion?: string;
}

export interface PrebuiltScript {
  id: string;
  title: string;
  titleAr: string;
  description: string;
  category: "nature" | "city" | "story" | "documentary" | "cinematic" | "abstract" | "travel" | "tech";
  emoji: string;
  language: "ar";
  voice: "ar_male" | "ar_female";
  scenes: PrebuiltScene[];
  tags: string[];
}

// ═══════════════════════════════════════════════════════════
// مكتبة السيناريوهات
// ═══════════════════════════════════════════════════════════

export const PREBUILT_SCRIPTS: PrebuiltScript[] = [
  // ── الطبيعة ──────────────────────────────────────────────
  {
    id: "nature_ocean",
    title: "Ocean Journey",
    titleAr: "رحلة البحر",
    description: "رحلة بصرية ساحرة عبر أعماق البحر وشواطئه الخلابة",
    category: "nature",
    emoji: "🌊",
    language: "ar",
    voice: "ar_male",
    tags: ["بحر", "طبيعة", "ماء", "هدوء"],
    scenes: [
      {
        title: "فجر على الشاطئ",
        imagePrompt: "Golden sunrise over a calm ocean beach, soft waves, warm light, cinematic photography, ultra-detailed",
        narration: "مع أول خيوط الفجر، يستيقظ البحر على أنغام الأمواج الهادئة، ليبدأ يوم جديد مليء بالجمال.",
        duration: 6,
        transition: "dissolve",
        motion: "zoom_in",
      },
      {
        title: "أعماق المحيط",
        imagePrompt: "Underwater ocean scene, coral reef, colorful fish, crystal clear water, rays of sunlight, cinematic",
        narration: "تحت السطح، عالم آخر يزخر بالحياة والألوان، حيث تسبح الأسماك في رقصة أزلية.",
        duration: 6,
        transition: "dissolve",
        motion: "pan_right",
      },
      {
        title: "غروب البحر",
        imagePrompt: "Dramatic ocean sunset, orange and purple sky, silhouette of waves, golden reflections, cinematic photography",
        narration: "وحين يودّع الشمس البحرَ، تتحول السماء إلى لوحة من الذهب والبنفسج، تاركةً في القلب أثراً لا يُنسى.",
        duration: 6,
        transition: "fade",
        motion: "zoom_out",
      },
    ],
  },
  {
    id: "nature_desert",
    title: "Desert Silence",
    titleAr: "صمت الصحراء",
    description: "رحلة في قلب الصحراء العربية وجمالها الأبدي",
    category: "nature",
    emoji: "🏜️",
    language: "ar",
    voice: "ar_male",
    tags: ["صحراء", "رمال", "عربي", "هدوء"],
    scenes: [
      {
        title: "الكثبان الذهبية",
        imagePrompt: "Vast golden sand dunes at sunrise, dramatic shadows, Arabian desert, cinematic wide shot, ultra-detailed",
        narration: "في قلب الصحراء، حيث تمتد الكثبان الذهبية إلى ما لا نهاية، تجد الروح سكينتها الأبدية.",
        duration: 6,
        transition: "dissolve",
        motion: "pan_right",
      },
      {
        title: "واحة الحياة",
        imagePrompt: "Desert oasis with palm trees, clear water pool, lush green vegetation surrounded by sand dunes, cinematic",
        narration: "وسط القسوة، تنبثق الحياة من باطن الأرض، لتروي الظمأ وتبعث الأمل في قلب الرمال.",
        duration: 6,
        transition: "dissolve",
        motion: "zoom_in",
      },
      {
        title: "نجوم الصحراء",
        imagePrompt: "Milky Way galaxy over Arabian desert dunes at night, star trails, dramatic sky, long exposure photography",
        narration: "وحين يسدل الليل ستاره، تتحول الصحراء إلى مرصد كوني، حيث تتلألأ النجوم بكل عظمتها.",
        duration: 6,
        transition: "fade",
        motion: "zoom_out",
      },
    ],
  },

  // ── المدينة ───────────────────────────────────────────────
  {
    id: "city_dubai",
    title: "Dubai Skyline",
    titleAr: "أفق دبي",
    description: "رحلة بصرية عبر ناطحات سحاب دبي وعجائبها المعمارية",
    category: "city",
    emoji: "🏙️",
    language: "ar",
    voice: "ar_male",
    tags: ["دبي", "مدينة", "معمار", "حداثة"],
    scenes: [
      {
        title: "برج خليفة",
        imagePrompt: "Burj Khalifa tower at golden hour, Dubai skyline, dramatic clouds, architectural photography, ultra-detailed",
        narration: "يشق برج خليفة عنان السماء، شاهداً على إرادة الإنسان في تجاوز حدود الممكن.",
        duration: 6,
        transition: "dissolve",
        motion: "zoom_in",
      },
      {
        title: "نافورة دبي",
        imagePrompt: "Dubai Fountain at night, water jets illuminated, Burj Khalifa background, reflections on water, cinematic",
        narration: "وعند حلول الليل، ترقص نافورة دبي على إيقاع الموسيقى، في عرض يسحر الأبصار.",
        duration: 6,
        transition: "dissolve",
        motion: "pan_right",
      },
      {
        title: "دبي من الأعلى",
        imagePrompt: "Aerial view of Dubai at sunset, highway lights, skyscrapers, desert meeting city, drone photography",
        narration: "من الأعلى، تتجلى دبي في كامل روعتها — مدينة تجمع بين أصالة الصحراء وحداثة المستقبل.",
        duration: 6,
        transition: "fade",
        motion: "zoom_out",
      },
    ],
  },

  // ── سينمائي ───────────────────────────────────────────────
  {
    id: "cinematic_hero",
    title: "The Hero's Journey",
    titleAr: "رحلة البطل",
    description: "قصة بطل يواجه التحديات ويصل إلى النصر",
    category: "cinematic",
    emoji: "⚔️",
    language: "ar",
    voice: "ar_male",
    tags: ["بطولة", "تحدي", "نصر", "قصة"],
    scenes: [
      {
        title: "البداية",
        imagePrompt: "Lone warrior standing on cliff edge at dawn, dramatic backlight, epic cinematic shot, fog in valley below",
        narration: "في كل رحلة عظيمة، ثمة لحظة يقف فيها البطل وحيداً أمام المجهول، يحمل في قلبه حلماً لا يموت.",
        duration: 6,
        transition: "dissolve",
        motion: "zoom_in",
      },
      {
        title: "المعركة",
        imagePrompt: "Epic battle scene, warrior fighting through storm, lightning, dramatic lighting, cinematic action photography",
        narration: "تأتي التحديات كالعواصف، تختبر المعدن وتكشف الجوهر. لكن البطل الحقيقي لا ينكسر — بل يزداد صلابة.",
        duration: 6,
        transition: "cut",
        motion: "pan_left",
      },
      {
        title: "النصر",
        imagePrompt: "Triumphant hero standing on mountain peak, sunrise, arms raised, epic cinematic moment, golden light",
        narration: "وفي النهاية، يقف المنتصر على قمة أحلامه، ليدرك أن كل ألم كان ثمناً لهذه اللحظة من المجد.",
        duration: 6,
        transition: "fade",
        motion: "zoom_out",
      },
    ],
  },

  // ── وثائقي ────────────────────────────────────────────────
  {
    id: "documentary_space",
    title: "Beyond the Stars",
    titleAr: "ما وراء النجوم",
    description: "رحلة وثائقية في أعماق الكون وأسراره",
    category: "documentary",
    emoji: "🚀",
    language: "ar",
    voice: "ar_male",
    tags: ["فضاء", "كون", "علم", "استكشاف"],
    scenes: [
      {
        title: "الأرض من الفضاء",
        imagePrompt: "Earth from space, blue marble, clouds, atmosphere glow, ISS perspective, ultra-detailed NASA photography style",
        narration: "من الفضاء، تبدو الأرض كجوهرة زرقاء تتوهج في ظلام الكون — وطن واحد لثمانية مليارات إنسان.",
        duration: 6,
        transition: "dissolve",
        motion: "zoom_out",
      },
      {
        title: "درب التبانة",
        imagePrompt: "Milky Way galaxy, spiral arms, billions of stars, deep space photography, ultra-detailed astrophotography",
        narration: "مجرتنا تحتضن مئتي مليار نجم، وشمسنا واحدة منها — نقطة ضوء صغيرة في محيط لا حدود له.",
        duration: 6,
        transition: "dissolve",
        motion: "pan_right",
      },
      {
        title: "المستقبل",
        imagePrompt: "Futuristic space station, Mars colony, astronaut looking at stars, cinematic sci-fi photography",
        narration: "والإنسان، بفضوله الأبدي، يمد يده نحو النجوم — يحلم بأن يجعل الكون بيته القادم.",
        duration: 6,
        transition: "fade",
        motion: "zoom_in",
      },
    ],
  },

  // ── سفر ───────────────────────────────────────────────────
  {
    id: "travel_japan",
    title: "Spirit of Japan",
    titleAr: "روح اليابان",
    description: "رحلة بصرية عبر جمال اليابان بين الأصالة والحداثة",
    category: "travel",
    emoji: "🗾",
    language: "ar",
    voice: "ar_female",
    tags: ["يابان", "سفر", "ثقافة", "جمال"],
    scenes: [
      {
        title: "أزهار الكرز",
        imagePrompt: "Cherry blossom trees in full bloom, Tokyo park, pink petals falling, soft light, cinematic photography",
        narration: "في الربيع، تتفتح أزهار الكرز لتغطي اليابان بعباءة وردية ساحرة، تدوم أسابيع ثم تودّع بصمت.",
        duration: 6,
        transition: "dissolve",
        motion: "pan_right",
      },
      {
        title: "جبل فوجي",
        imagePrompt: "Mount Fuji at sunrise, snow-capped peak, reflection in lake, traditional Japanese landscape, cinematic",
        narration: "يقف جبل فوجي شامخاً منذ آلاف السنين، رمزاً للصمود والجمال الأبدي في الروح اليابانية.",
        duration: 6,
        transition: "dissolve",
        motion: "zoom_in",
      },
      {
        title: "طوكيو الليلية",
        imagePrompt: "Tokyo at night, neon lights, Shibuya crossing, rain reflections, cyberpunk aesthetic, cinematic photography",
        narration: "وحين يحل الليل على طوكيو، تتحول المدينة إلى سيمفونية من الأضواء والألوان — مستقبل يعيش في الحاضر.",
        duration: 6,
        transition: "fade",
        motion: "zoom_out",
      },
    ],
  },

  // ── تقنية ─────────────────────────────────────────────────
  {
    id: "tech_ai",
    title: "The AI Revolution",
    titleAr: "ثورة الذكاء الاصطناعي",
    description: "رحلة في عالم الذكاء الاصطناعي وتأثيره على مستقبل البشرية",
    category: "tech",
    emoji: "🤖",
    language: "ar",
    voice: "ar_male",
    tags: ["ذكاء اصطناعي", "تقنية", "مستقبل", "ابتكار"],
    scenes: [
      {
        title: "الشبكات العصبية",
        imagePrompt: "Neural network visualization, glowing nodes and connections, blue and purple light, abstract technology art",
        narration: "تتشابك ملايين العقد في شبكة عصبية اصطناعية، تحاكي دماغ الإنسان وتتجاوز قدراته في بعض المجالات.",
        duration: 6,
        transition: "dissolve",
        motion: "zoom_in",
      },
      {
        title: "الروبوتات والإنسان",
        imagePrompt: "Human hand touching robot hand, warm light, symbolic image of human-AI collaboration, cinematic photography",
        narration: "ليس الذكاء الاصطناعي بديلاً عن الإنسان — بل شريكه في رحلة الاكتشاف والإبداع.",
        duration: 6,
        transition: "dissolve",
        motion: "pan_right",
      },
      {
        title: "مدينة المستقبل",
        imagePrompt: "Futuristic smart city, autonomous vehicles, holographic displays, green technology, cinematic sci-fi",
        narration: "المدينة الذكية ليست خيالاً — إنها تُبنى الآن، حجراً حجراً، بيتاً بيتاً، بيتاً من البيانات والحلم.",
        duration: 6,
        transition: "fade",
        motion: "zoom_out",
      },
    ],
  },

  // ── تجريدي ────────────────────────────────────────────────
  {
    id: "abstract_emotions",
    title: "Colors of Emotion",
    titleAr: "ألوان المشاعر",
    description: "رحلة بصرية شعرية عبر ألوان المشاعر الإنسانية",
    category: "abstract",
    emoji: "🎨",
    language: "ar",
    voice: "ar_female",
    tags: ["فن", "مشاعر", "ألوان", "شعر"],
    scenes: [
      {
        title: "الفرح",
        imagePrompt: "Explosion of warm colors, yellow and orange paint splashes, joyful abstract art, dynamic movement, cinematic",
        narration: "الفرح لون أصفر يتفجر في الروح، موجة دافئة تغمر القلب وتجعل العالم يبدو أكثر إشراقاً.",
        duration: 6,
        transition: "dissolve",
        motion: "zoom_in",
      },
      {
        title: "الحنين",
        imagePrompt: "Soft blue and purple watercolor abstract, flowing shapes, nostalgic mood, dreamy atmosphere, cinematic art",
        narration: "الحنين لون أزرق هادئ، ذكرى تطفو على سطح الوعي كالضباب، تجمع بين الألم والجمال.",
        duration: 6,
        transition: "dissolve",
        motion: "pan_left",
      },
      {
        title: "الأمل",
        imagePrompt: "Green and gold abstract art, light breaking through darkness, hopeful colors, dynamic abstract painting",
        narration: "والأمل؟ الأمل لون أخضر ينبثق من الظلام، يذكّرنا أن بعد كل ليل فجراً، وبعد كل عاصفة صفاء.",
        duration: 6,
        transition: "fade",
        motion: "zoom_out",
      },
    ],
  },

  // ── قصة ───────────────────────────────────────────────────
  {
    id: "story_water",
    title: "The Water Cycle",
    titleAr: "رحلة الماء — دورة الحياة",
    description: "قصة شعرية عن رحلة قطرة الماء عبر دورة الحياة",
    category: "story",
    emoji: "💧",
    language: "ar",
    voice: "ar_female",
    tags: ["ماء", "طبيعة", "قصة", "شعر"],
    scenes: [
      {
        title: "المحيط الأم",
        imagePrompt: "Vast ocean surface, morning light, gentle waves, water droplets catching sunlight, cinematic photography",
        narration: "في البداية كانت المحيطات — أم الحياة وحاضنتها. من هنا تبدأ كل قطرة رحلتها الأبدية.",
        duration: 6,
        transition: "dissolve",
        motion: "pan_right",
      },
      {
        title: "السحاب والمطر",
        imagePrompt: "Storm clouds forming over mountains, lightning, heavy rain, dramatic sky, cinematic weather photography",
        narration: "تتصاعد القطرات إلى السماء، تتحول إلى سحاب، ثم تعود مطراً يروي الأرض ويبعث الحياة.",
        duration: 6,
        transition: "dissolve",
        motion: "zoom_in",
      },
      {
        title: "النهر والبحر",
        imagePrompt: "River flowing through green valley, crystal clear water, mountains in background, cinematic landscape",
        narration: "وتعود القطرة إلى البحر، مكتملة دورتها، حاملةً معها قصص كل الأرواح التي أحيتها في طريقها.",
        duration: 6,
        transition: "fade",
        motion: "zoom_out",
      },
    ],
  },

  // ── طبيعة 2 ──────────────────────────────────────────────
  {
    id: "nature_forest",
    title: "Ancient Forest",
    titleAr: "الغابة الأزلية",
    description: "رحلة في قلب غابة قديمة مليئة بالأسرار والجمال",
    category: "nature",
    emoji: "🌲",
    language: "ar",
    voice: "ar_female",
    tags: ["غابة", "طبيعة", "أشجار", "هدوء"],
    scenes: [
      {
        title: "مدخل الغابة",
        imagePrompt: "Ancient forest entrance, massive trees, morning mist, rays of sunlight through canopy, cinematic photography",
        narration: "تقف على عتبة الغابة القديمة، حيث تتشابك الأشجار لتشكّل قبة خضراء تحجب السماء وتكشف عالماً آخر.",
        duration: 6,
        transition: "dissolve",
        motion: "zoom_in",
      },
      {
        title: "قلب الغابة",
        imagePrompt: "Deep forest interior, ancient trees, moss-covered ground, magical atmosphere, fairy tale forest, cinematic",
        narration: "في أعماق الغابة، حيث لا يصل الضوء إلا خيوطاً ذهبية، تعيش آلاف الكائنات في توازن مقدس.",
        duration: 6,
        transition: "dissolve",
        motion: "pan_right",
      },
      {
        title: "الغابة في الخريف",
        imagePrompt: "Autumn forest, red and orange leaves, golden light, fallen leaves, magical atmosphere, cinematic photography",
        narration: "وفي الخريف، تلبس الغابة ثوبها الأحمر والذهبي، وداعاً جميلاً قبل نوم الشتاء الطويل.",
        duration: 6,
        transition: "fade",
        motion: "zoom_out",
      },
    ],
  },
];

// ═══════════════════════════════════════════════════════════
// دوال مساعدة
// ═══════════════════════════════════════════════════════════

/**
 * البحث عن سيناريو مناسب بناءً على الوصف والفئة
 */
export function findBestScript(description: string, category?: string): PrebuiltScript {
  const desc = description.toLowerCase();

  // بحث بالكلمات المفتاحية
  const keywords: Record<string, string[]> = {
    nature_ocean: ["بحر", "محيط", "شاطئ", "موج", "ocean", "sea", "beach"],
    nature_desert: ["صحراء", "رمال", "كثبان", "desert", "sand"],
    nature_forest: ["غابة", "أشجار", "forest", "trees", "wood"],
    city_dubai: ["دبي", "مدينة", "ناطحة", "dubai", "city", "urban"],
    cinematic_hero: ["بطل", "حرب", "معركة", "hero", "battle", "fight", "warrior"],
    documentary_space: ["فضاء", "نجوم", "كوكب", "space", "stars", "galaxy", "cosmos"],
    travel_japan: ["يابان", "japan", "tokyo", "سفر", "travel"],
    tech_ai: ["ذكاء", "تقنية", "روبوت", "ai", "tech", "robot", "future"],
    abstract_emotions: ["مشاعر", "فن", "ألوان", "emotion", "art", "colors"],
    story_water: ["ماء", "مطر", "نهر", "water", "rain", "river"],
  };

  for (const [scriptId, words] of Object.entries(keywords)) {
    if (words.some(w => desc.includes(w))) {
      const found = PREBUILT_SCRIPTS.find(s => s.id === scriptId);
      if (found) return found;
    }
  }

  // إذا لم يجد، اختر حسب الفئة
  if (category) {
    const byCategory = PREBUILT_SCRIPTS.filter(s => s.category === category);
    if (byCategory.length > 0) return byCategory[0];
  }

  // افتراضي: أول سيناريو
  return PREBUILT_SCRIPTS[0];
}

/**
 * تحويل سيناريو جاهز إلى VideoScript كامل
 */
export function prebuiltToVideoScript(script: PrebuiltScript, customTitle?: string) {
  return {
    title: customTitle || script.titleAr,
    description: script.description,
    language: script.language,
    voice: script.voice,
    domain: script.category === "cinematic" ? "cinematic" :
            script.category === "documentary" ? "documentary" :
            script.category === "nature" ? "nature" :
            script.category === "city" ? "urban" : "general",
    scenes: script.scenes.map((scene, i) => ({
      id: i + 1,
      title: scene.title,
      imagePrompt: scene.imagePrompt,
      narration: scene.narration,
      duration: scene.duration,
      transition: scene.transition,
      motion: scene.motion,
    })),
  };
}

/**
 * بناء سيناريو من مشاهد يدوية
 */
export function buildManualScript(
  title: string,
  language: "ar" | "en",
  voice: string,
  scenes: Array<{
    imagePrompt: string;
    narration: string;
    duration?: number;
  }>
) {
  return {
    title,
    description: title,
    language,
    voice,
    domain: "general",
    scenes: scenes.map((scene, i) => ({
      id: i + 1,
      title: `مشهد ${i + 1}`,
      imagePrompt: scene.imagePrompt,
      narration: scene.narration,
      duration: scene.duration ?? 6,
      transition: i === scenes.length - 1 ? "fade" : "dissolve",
    })),
  };
}
