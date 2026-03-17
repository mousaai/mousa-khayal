/**
 * cinematicEngine.ts
 * محرك الإخراج السينمائي الاحترافي لمنصة خيال
 * مستوى Hollywood — حركة كاميرا حقيقية، إضاءة درامية، انتقالات سينمائية
 */

// ══════════════════════════════════════════════════════════════
// أنواع البيانات
// ══════════════════════════════════════════════════════════════

export type CameraMove =
  | "dolly-in"       // تقريب بطيء — يشعر بالاقتراب
  | "dolly-out"      // ابتعاد — يكشف المشهد
  | "crane-up"       // رفع الكاميرا — إحساس بالعلو والسمو
  | "crane-down"     // خفض الكاميرا — نزول إلى التفاصيل
  | "pan-left"       // مسح أفقي يسار
  | "pan-right"      // مسح أفقي يمين
  | "tilt-up"        // إمالة للأعلى — كشف السماء
  | "tilt-down"      // إمالة للأسفل — كشف الأرض
  | "orbit-cw"       // دوران حول المحور باتجاه عقارب الساعة
  | "orbit-ccw"      // دوران عكس عقارب الساعة
  | "parallax"       // تأثير التوازي — عمق ثلاثي الأبعاد
  | "handheld"       // حركة يدوية — واقعية وحيوية
  | "push-in-fast"   // اقتراب سريع — إثارة
  | "pull-out-slow"  // ابتعاد بطيء — ختام درامي
  | "dutch-tilt"     // إمالة هولندية — توتر وغموض
  | "bird-eye-spin"; // نظرة طائر دوارة — إبهار

export type TransitionType =
  | "fade-black"     // تلاشٍ للسواد — كلاسيكي
  | "fade-white"     // تلاشٍ للأبيض — حلمي
  | "cross-dissolve" // ذوبان متقاطع — ناعم
  | "zoom-in-blur"   // تكبير مع ضبابية — ديناميكي
  | "zoom-out-blur"  // تصغير مع ضبابية
  | "pan-wipe-right" // مسح أفقي يمين
  | "pan-wipe-left"  // مسح أفقي يسار
  | "flash"          // ومضة بيضاء — انتقال مفاجئ
  | "motion-blur"    // ضبابية الحركة
  | "iris-open"      // فتح دائري — بداية مشهد
  | "iris-close";    // إغلاق دائري — نهاية مشهد

export type LightingMood =
  | "golden-hour"    // ساعة ذهبية — دافئة وشاعرية
  | "blue-hour"      // ساعة زرقاء — هادئة وغامضة
  | "dramatic-storm" // عاصفة درامية — توتر وقوة
  | "moonlight"      // ضوء القمر — رومانسي
  | "harsh-noon"     // ظهيرة حادة — واقعية
  | "soft-overcast"  // غائم ناعم — محايد
  | "sunrise"        // شروق — أمل وبداية
  | "sunset";        // غروب — نهاية وحنين

export interface CinematicFrame {
  // تحويلات الصورة
  scaleX: number;
  scaleY: number;
  translateX: number; // بالنسبة المئوية
  translateY: number;
  rotation: number;   // بالدرجات
  skewX: number;

  // تأثيرات الإضاءة (CSS filters)
  brightness: number;
  contrast: number;
  saturate: number;
  sepia: number;
  hueRotate: number;  // بالدرجات

  // تأثيرات Canvas
  vignetteStrength: number;   // 0-1
  lensFlareX?: number;        // موضع اللمعة
  lensFlareY?: number;
  lensFlareIntensity: number; // 0-1
  colorGrade: ColorGrade;

  // الانتقال
  opacity: number;
  blurPx: number;
}

export interface ColorGrade {
  r: number; // 0-1 multiplier
  g: number;
  b: number;
  gamma: number; // 0.5-2.0
}

// ══════════════════════════════════════════════════════════════
// تعريفات الألوان حسب المزاج
// ══════════════════════════════════════════════════════════════

const LIGHTING_GRADES: Record<LightingMood, ColorGrade> = {
  "golden-hour":    { r: 1.15, g: 0.95, b: 0.75, gamma: 1.05 },
  "blue-hour":      { r: 0.80, g: 0.90, b: 1.20, gamma: 0.95 },
  "dramatic-storm": { r: 0.85, g: 0.85, b: 0.95, gamma: 0.85 },
  "moonlight":      { r: 0.75, g: 0.85, b: 1.15, gamma: 0.80 },
  "harsh-noon":     { r: 1.05, g: 1.05, b: 1.00, gamma: 1.10 },
  "soft-overcast":  { r: 0.95, g: 0.95, b: 1.00, gamma: 1.00 },
  "sunrise":        { r: 1.20, g: 0.90, b: 0.70, gamma: 1.00 },
  "sunset":         { r: 1.25, g: 0.80, b: 0.65, gamma: 0.95 },
};

const LIGHTING_FILTERS: Record<LightingMood, { brightness: number; contrast: number; saturate: number; sepia: number; hueRotate: number }> = {
  "golden-hour":    { brightness: 1.05, contrast: 1.10, saturate: 1.20, sepia: 0.15, hueRotate: 5 },
  "blue-hour":      { brightness: 0.85, contrast: 1.15, saturate: 1.10, sepia: 0.00, hueRotate: -10 },
  "dramatic-storm": { brightness: 0.80, contrast: 1.30, saturate: 0.90, sepia: 0.05, hueRotate: 0 },
  "moonlight":      { brightness: 0.70, contrast: 1.20, saturate: 0.70, sepia: 0.00, hueRotate: -15 },
  "harsh-noon":     { brightness: 1.15, contrast: 1.05, saturate: 1.10, sepia: 0.00, hueRotate: 0 },
  "soft-overcast":  { brightness: 0.95, contrast: 0.95, saturate: 0.95, sepia: 0.00, hueRotate: 0 },
  "sunrise":        { brightness: 1.00, contrast: 1.10, saturate: 1.25, sepia: 0.20, hueRotate: 10 },
  "sunset":         { brightness: 0.95, contrast: 1.15, saturate: 1.30, sepia: 0.25, hueRotate: 15 },
};

// ══════════════════════════════════════════════════════════════
// محرك الحركة — يحسب الإطار في أي لحظة زمنية
// ══════════════════════════════════════════════════════════════

/**
 * easing functions — منحنيات التسارع والتباطؤ
 */
const ease = {
  linear: (t: number) => t,
  easeInOut: (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  easeIn: (t: number) => t * t * t,
  easeOut: (t: number) => 1 - Math.pow(1 - t, 3),
  easeInOutQuart: (t: number) => t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2,
  spring: (t: number) => {
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },
  cinematic: (t: number) => {
    // منحنى سينمائي: بطيء في البداية والنهاية، سريع في المنتصف
    return t < 0.1 ? 5 * t * t
      : t > 0.9 ? 1 - 5 * (1 - t) * (1 - t)
      : 0.05 + 0.9 * ease.easeInOut((t - 0.1) / 0.8);
  },
};

/**
 * حساب إطار الحركة في الوقت t (0-1)
 */
export function computeCameraFrame(
  move: CameraMove,
  t: number,
  mood: LightingMood = "golden-hour"
): CinematicFrame {
  const filters = LIGHTING_FILTERS[mood];
  const grade = LIGHTING_GRADES[mood];

  // القيم الأساسية
  let scaleX = 1, scaleY = 1;
  let translateX = 0, translateY = 0;
  let rotation = 0, skewX = 0;
  let blurPx = 0;
  let vignetteStrength = 0.35;
  let lensFlareIntensity = 0;
  let lensFlareX: number | undefined;
  let lensFlareY: number | undefined;

  const tc = ease.cinematic(t);
  const te = ease.easeInOut(t);
  const to = ease.easeOut(t);

  switch (move) {
    case "dolly-in":
      // تقريب بطيء من 1.0 إلى 1.18 — إحساس بالاقتراب
      scaleX = scaleY = 1.0 + tc * 0.18;
      vignetteStrength = 0.3 + tc * 0.15;
      break;

    case "dolly-out":
      // ابتعاد من 1.15 إلى 1.0 — كشف المشهد
      scaleX = scaleY = 1.15 - tc * 0.15;
      vignetteStrength = 0.45 - tc * 0.15;
      break;

    case "crane-up":
      // رفع الكاميرا — الصورة تتحرك للأسفل
      scaleX = scaleY = 1.08 + tc * 0.05;
      translateY = tc * -8; // يتحرك للأعلى
      vignetteStrength = 0.25 + tc * 0.1;
      lensFlareIntensity = tc * 0.3;
      lensFlareX = 0.7; lensFlareY = 0.2;
      break;

    case "crane-down":
      scaleX = scaleY = 1.10 - tc * 0.05;
      translateY = tc * 8;
      vignetteStrength = 0.35;
      break;

    case "pan-left":
      scaleX = scaleY = 1.12;
      translateX = tc * -10;
      break;

    case "pan-right":
      scaleX = scaleY = 1.12;
      translateX = tc * 10;
      break;

    case "tilt-up":
      scaleX = scaleY = 1.10;
      translateY = -5 + tc * 10; // من -5% إلى +5%
      vignetteStrength = 0.3;
      break;

    case "tilt-down":
      scaleX = scaleY = 1.10;
      translateY = 5 - tc * 10;
      vignetteStrength = 0.3;
      break;

    case "orbit-cw":
      // دوران — نحاكيه بتحريك أفقي + تغيير طفيف في الحجم
      scaleX = scaleY = 1.08 + Math.sin(t * Math.PI) * 0.05;
      translateX = Math.sin(t * Math.PI * 2) * 6;
      translateY = Math.cos(t * Math.PI * 2) * 3;
      break;

    case "orbit-ccw":
      scaleX = scaleY = 1.08 + Math.sin(t * Math.PI) * 0.05;
      translateX = -Math.sin(t * Math.PI * 2) * 6;
      translateY = Math.cos(t * Math.PI * 2) * 3;
      break;

    case "parallax":
      // تأثير التوازي — طبقات تتحرك بسرعات مختلفة
      scaleX = scaleY = 1.15;
      translateX = (t - 0.5) * 8;
      translateY = (t - 0.5) * 4;
      vignetteStrength = 0.4;
      break;

    case "handheld":
      // حركة يدوية — اهتزاز طبيعي صغير
      scaleX = scaleY = 1.05;
      translateX = Math.sin(t * 13.7) * 0.8 + Math.sin(t * 7.3) * 0.5;
      translateY = Math.cos(t * 11.1) * 0.6 + Math.cos(t * 5.9) * 0.4;
      rotation = Math.sin(t * 9.3) * 0.3;
      vignetteStrength = 0.25;
      break;

    case "push-in-fast":
      // اقتراب سريع — للحظات الدرامية
      scaleX = scaleY = 1.0 + ease.easeIn(t) * 0.25;
      vignetteStrength = 0.2 + ease.easeIn(t) * 0.3;
      blurPx = t > 0.8 ? (t - 0.8) * 5 * 10 : 0;
      break;

    case "pull-out-slow":
      // ابتعاد بطيء — ختام درامي
      scaleX = scaleY = 1.20 - ease.easeOut(t) * 0.20;
      vignetteStrength = 0.5 - ease.easeOut(t) * 0.2;
      lensFlareIntensity = (1 - t) * 0.2;
      lensFlareX = 0.5; lensFlareY = 0.3;
      break;

    case "dutch-tilt":
      // إمالة هولندية — توتر وغموض
      scaleX = scaleY = 1.08;
      rotation = Math.sin(t * Math.PI) * 4; // إمالة تصل إلى 4 درجات
      translateX = Math.sin(t * Math.PI) * 2;
      vignetteStrength = 0.5;
      break;

    case "bird-eye-spin":
      // نظرة طائر دوارة
      scaleX = scaleY = 1.20 - tc * 0.10;
      rotation = tc * 8; // دوران 8 درجات
      translateX = Math.sin(tc * Math.PI) * 5;
      vignetteStrength = 0.4;
      lensFlareIntensity = tc * 0.25;
      lensFlareX = 0.5; lensFlareY = 0.15;
      break;
  }

  return {
    scaleX, scaleY, translateX, translateY, rotation, skewX,
    brightness: filters.brightness,
    contrast: filters.contrast,
    saturate: filters.saturate,
    sepia: filters.sepia,
    hueRotate: filters.hueRotate,
    vignetteStrength,
    lensFlareX, lensFlareY, lensFlareIntensity,
    colorGrade: grade,
    opacity: 1,
    blurPx,
  };
}

// ══════════════════════════════════════════════════════════════
// محرك الانتقالات
// ══════════════════════════════════════════════════════════════

export interface TransitionFrame {
  // للصورة الحالية (تختفي)
  currentOpacity: number;
  currentScale: number;
  currentBlur: number;
  currentTranslateX: number;

  // للصورة القادمة (تظهر)
  nextOpacity: number;
  nextScale: number;
  nextBlur: number;
  nextTranslateX: number;

  // تأثير عام
  flashOpacity: number; // ومضة بيضاء
  vignetteBoost: number;
}

/**
 * حساب إطار الانتقال في الوقت t (0-1)
 */
export function computeTransitionFrame(
  type: TransitionType,
  t: number
): TransitionFrame {
  const te = ease.easeInOut(t);
  const to = ease.easeOut(t);

  let currentOpacity = 1, currentScale = 1, currentBlur = 0, currentTranslateX = 0;
  let nextOpacity = 0, nextScale = 1, nextBlur = 0, nextTranslateX = 0;
  let flashOpacity = 0, vignetteBoost = 0;

  switch (type) {
    case "fade-black":
      currentOpacity = t < 0.5 ? 1 - te * 2 : 0;
      nextOpacity = t > 0.5 ? (te - 0.5) * 2 : 0;
      vignetteBoost = Math.sin(t * Math.PI) * 0.5;
      break;

    case "fade-white":
      currentOpacity = 1 - te;
      nextOpacity = te;
      flashOpacity = Math.sin(t * Math.PI) * 0.6;
      break;

    case "cross-dissolve":
      currentOpacity = 1 - te;
      nextOpacity = te;
      currentBlur = te * 2;
      nextBlur = (1 - te) * 2;
      break;

    case "zoom-in-blur":
      currentOpacity = 1 - te;
      currentScale = 1 + te * 0.15;
      currentBlur = te * 8;
      nextOpacity = te;
      nextScale = 1.15 - te * 0.15;
      nextBlur = (1 - te) * 6;
      break;

    case "zoom-out-blur":
      currentOpacity = 1 - te;
      currentScale = 1 - te * 0.1;
      currentBlur = te * 6;
      nextOpacity = te;
      nextScale = 0.9 + te * 0.1;
      nextBlur = (1 - te) * 4;
      break;

    case "pan-wipe-right":
      currentTranslateX = -te * 100;
      nextTranslateX = (1 - te) * 100;
      nextOpacity = 1;
      currentOpacity = 1;
      break;

    case "pan-wipe-left":
      currentTranslateX = te * 100;
      nextTranslateX = -(1 - te) * 100;
      nextOpacity = 1;
      currentOpacity = 1;
      break;

    case "flash":
      flashOpacity = t < 0.15 ? t / 0.15 : t < 0.3 ? 1 - (t - 0.15) / 0.15 : 0;
      currentOpacity = t < 0.15 ? 1 : 0;
      nextOpacity = t >= 0.15 ? 1 : 0;
      break;

    case "motion-blur":
      currentOpacity = 1 - te;
      currentBlur = te * 15;
      currentTranslateX = -te * 5;
      nextOpacity = te;
      nextBlur = (1 - te) * 10;
      nextTranslateX = (1 - te) * 5;
      break;

    case "iris-open":
      // نحاكي iris بـ opacity + scale
      nextOpacity = te;
      nextScale = 0.3 + te * 0.7;
      currentOpacity = 1 - te;
      break;

    case "iris-close":
      currentOpacity = 1 - te;
      currentScale = 1 + te * 0.5;
      currentBlur = te * 5;
      nextOpacity = te;
      break;
  }

  return {
    currentOpacity, currentScale, currentBlur, currentTranslateX,
    nextOpacity, nextScale, nextBlur, nextTranslateX,
    flashOpacity, vignetteBoost,
  };
}

// ══════════════════════════════════════════════════════════════
// محرك النصوص السينمائية
// ══════════════════════════════════════════════════════════════

export type TextAnimation = "slide-up" | "fade-in" | "typewriter" | "scale-in" | "blur-in";

export interface TextOverlayState {
  titleOpacity: number;
  titleTranslateY: number;
  titleScale: number;
  titleBlur: number;
  subtitleOpacity: number;
  subtitleTranslateY: number;
  descOpacity: number;
  descTranslateY: number;
  barWidth: number; // شريط الزخرفة 0-1
}

/**
 * حساب حالة النصوص في الوقت t (0-1) لمشهد بمدة معينة
 * النصوص تظهر في أول 30% وتختفي في آخر 20%
 */
export function computeTextOverlay(
  t: number,
  animation: TextAnimation = "slide-up"
): TextOverlayState {
  // مراحل ظهور النصوص
  const TITLE_START = 0.05;
  const SUBTITLE_START = 0.12;
  const DESC_START = 0.18;
  const FADE_OUT_START = 0.75;

  const titleT = Math.max(0, Math.min(1, (t - TITLE_START) / 0.15));
  const subtitleT = Math.max(0, Math.min(1, (t - SUBTITLE_START) / 0.12));
  const descT = Math.max(0, Math.min(1, (t - DESC_START) / 0.10));
  const fadeOutT = Math.max(0, Math.min(1, (t - FADE_OUT_START) / 0.20));

  const titleIn = ease.easeOut(titleT);
  const subtitleIn = ease.easeOut(subtitleT);
  const descIn = ease.easeOut(descT);
  const fadeOut = ease.easeIn(fadeOutT);

  let titleOpacity = titleIn * (1 - fadeOut);
  let titleTranslateY = 0;
  let titleScale = 1;
  let titleBlur = 0;
  let subtitleOpacity = subtitleIn * (1 - fadeOut);
  let subtitleTranslateY = 0;
  let descOpacity = descIn * (1 - fadeOut);
  let descTranslateY = 0;
  let barWidth = titleIn * (1 - fadeOut);

  switch (animation) {
    case "slide-up":
      titleTranslateY = (1 - titleIn) * 30;
      subtitleTranslateY = (1 - subtitleIn) * 20;
      descTranslateY = (1 - descIn) * 15;
      break;

    case "scale-in":
      titleScale = 0.7 + titleIn * 0.3;
      titleBlur = (1 - titleIn) * 4;
      break;

    case "blur-in":
      titleBlur = (1 - titleIn) * 8;
      subtitleTranslateY = (1 - subtitleIn) * 10;
      break;

    case "fade-in":
      // opacity فقط — بسيط وأنيق
      break;

    case "typewriter":
      // نحاكي typewriter بـ opacity متدرج
      titleOpacity = titleIn > 0 ? Math.min(1, titleIn * 3) * (1 - fadeOut) : 0;
      break;
  }

  return {
    titleOpacity, titleTranslateY, titleScale, titleBlur,
    subtitleOpacity, subtitleTranslateY,
    descOpacity, descTranslateY,
    barWidth,
  };
}

// ══════════════════════════════════════════════════════════════
// محرك رسم Canvas — يرسم كل شيء على canvas
// ══════════════════════════════════════════════════════════════

export interface DrawSceneOptions {
  canvas: HTMLCanvasElement;
  image: HTMLImageElement;
  frame: CinematicFrame;
  textOverlay: TextOverlayState;
  title: string;
  subtitle?: string;
  description?: string;
  accentColor?: string;
  showLetterbox?: boolean; // أشرطة سينمائية
  width?: number;
  height?: number;
}

/**
 * رسم مشهد كامل على canvas بجميع التأثيرات
 */
export function drawCinematicScene(opts: DrawSceneOptions): void {
  const {
    canvas, image, frame, textOverlay,
    title, subtitle, description,
    accentColor = "#7c3aed",
    showLetterbox = true,
  } = opts;

  const W = opts.width || canvas.width;
  const H = opts.height || canvas.height;
  const ctx = canvas.getContext("2d")!;

  // ── 1. مسح الكانفاس ──
  ctx.clearRect(0, 0, W, H);

  // ── 2. رسم الصورة مع تحويلات الكاميرا ──
  ctx.save();

  // تطبيق filters
  ctx.filter = [
    `brightness(${frame.brightness})`,
    `contrast(${frame.contrast})`,
    `saturate(${frame.saturate})`,
    `sepia(${frame.sepia})`,
    `hue-rotate(${frame.hueRotate}deg)`,
    frame.blurPx > 0 ? `blur(${frame.blurPx}px)` : "",
  ].filter(Boolean).join(" ");

  // تطبيق تحويلات الكاميرا
  ctx.translate(W / 2, H / 2);
  ctx.rotate((frame.rotation * Math.PI) / 180);
  ctx.scale(frame.scaleX, frame.scaleY);
  ctx.translate(
    -W / 2 + (frame.translateX / 100) * W,
    -H / 2 + (frame.translateY / 100) * H
  );

  // رسم الصورة مع color grading
  ctx.drawImage(image, 0, 0, W, H);

  ctx.restore();

  // ── 3. Color Grading عبر blend modes ──
  const { r, g, b, gamma } = frame.colorGrade;
  if (r !== 1 || g !== 1 || b !== 1) {
    ctx.save();
    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = `rgba(${Math.round(r * 128)}, ${Math.round(g * 128)}, ${Math.round(b * 128)}, 0.25)`;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // ── 4. Vignette ──
  if (frame.vignetteStrength > 0) {
    const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, H * 0.85);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, `rgba(0,0,0,${frame.vignetteStrength})`);
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
  }

  // ── 5. Lens Flare ──
  if (frame.lensFlareIntensity > 0 && frame.lensFlareX !== undefined) {
    const fx = frame.lensFlareX * W;
    const fy = (frame.lensFlareY ?? 0.2) * H;
    const flare = ctx.createRadialGradient(fx, fy, 0, fx, fy, H * 0.3);
    flare.addColorStop(0, `rgba(255,240,200,${frame.lensFlareIntensity * 0.6})`);
    flare.addColorStop(0.3, `rgba(255,200,100,${frame.lensFlareIntensity * 0.2})`);
    flare.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = flare;
    ctx.fillRect(0, 0, W, H);
  }

  // ── 6. Cinematic Letterbox (أشرطة سينمائية) ──
  if (showLetterbox) {
    const barH = H * 0.08;
    ctx.fillStyle = "rgba(0,0,0,0.92)";
    ctx.fillRect(0, 0, W, barH);
    ctx.fillRect(0, H - barH, W, barH);
  }

  // ── 7. النصوص السينمائية ──
  const textAreaTop = H * 0.08;
  const textAreaH = H * 0.84;

  // شريط الزخرفة الجانبي
  if (textOverlay.barWidth > 0) {
    const barW = 3;
    const barH = textAreaH * 0.18;
    const barX = W * 0.06;
    const barY = H * 0.62;
    ctx.save();
    ctx.globalAlpha = textOverlay.titleOpacity;
    const barGrad = ctx.createLinearGradient(barX, barY, barX, barY + barH * textOverlay.barWidth);
    barGrad.addColorStop(0, accentColor);
    barGrad.addColorStop(1, accentColor + "00");
    ctx.fillStyle = barGrad;
    ctx.fillRect(barX, barY, barW, barH * textOverlay.barWidth);
    ctx.restore();
  }

  // العنوان الرئيسي
  if (textOverlay.titleOpacity > 0.01) {
    ctx.save();
    ctx.globalAlpha = textOverlay.titleOpacity;
    ctx.translate(W * 0.5, H * 0.68 + textOverlay.titleTranslateY);
    ctx.scale(textOverlay.titleScale, textOverlay.titleScale);

    if (textOverlay.titleBlur > 0) {
      ctx.filter = `blur(${textOverlay.titleBlur}px)`;
    }

    // ظل العنوان
    ctx.shadowColor = "rgba(0,0,0,0.8)";
    ctx.shadowBlur = 20;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    const titleSize = Math.round(W * 0.055);
    ctx.font = `bold ${titleSize}px 'Cairo', 'Tajawal', sans-serif`;
    ctx.textAlign = "center";
    ctx.direction = "rtl";

    // خلفية شفافة للعنوان
    const titleMetrics = ctx.measureText(title);
    const titleW = Math.min(titleMetrics.width + 40, W * 0.85);
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.roundRect(-titleW / 2, -titleSize * 0.8, titleW, titleSize * 1.3, 4);
    ctx.fill();

    // النص
    ctx.fillStyle = "#ffffff";
    ctx.fillText(title, 0, 0, W * 0.85);
    ctx.restore();
  }

  // العنوان الفرعي
  if (subtitle && textOverlay.subtitleOpacity > 0.01) {
    ctx.save();
    ctx.globalAlpha = textOverlay.subtitleOpacity;
    ctx.translate(W * 0.5, H * 0.74 + textOverlay.subtitleTranslateY);

    ctx.shadowColor = "rgba(0,0,0,0.7)";
    ctx.shadowBlur = 10;

    const subSize = Math.round(W * 0.022);
    ctx.font = `${subSize}px 'Cairo', 'Tajawal', sans-serif`;
    ctx.textAlign = "center";
    ctx.direction = "rtl";
    ctx.fillStyle = accentColor;
    ctx.fillText(subtitle.toUpperCase(), 0, 0, W * 0.75);
    ctx.restore();
  }

  // الوصف
  if (description && textOverlay.descOpacity > 0.01) {
    ctx.save();
    ctx.globalAlpha = textOverlay.descOpacity * 0.75;
    ctx.translate(W * 0.5, H * 0.80 + textOverlay.descTranslateY);

    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = 8;

    const descSize = Math.round(W * 0.016);
    ctx.font = `${descSize}px 'Cairo', 'Tajawal', sans-serif`;
    ctx.textAlign = "center";
    ctx.direction = "rtl";
    ctx.fillStyle = "rgba(255,255,255,0.75)";

    // قطع الوصف إذا كان طويلاً
    const maxWidth = W * 0.70;
    const words = description.split(" ");
    let line = "";
    let lineY = 0;
    const lineH = descSize * 1.5;

    for (const word of words) {
      const testLine = line + word + " ";
      if (ctx.measureText(testLine).width > maxWidth && line !== "") {
        ctx.fillText(line.trim(), 0, lineY, maxWidth);
        line = word + " ";
        lineY += lineH;
        if (lineY > lineH * 2) break; // سطرين فقط
      } else {
        line = testLine;
      }
    }
    if (line) ctx.fillText(line.trim(), 0, lineY, maxWidth);
    ctx.restore();
  }
}

// ══════════════════════════════════════════════════════════════
// خوارزمية اختيار الحركة والانتقال الذكي
// ══════════════════════════════════════════════════════════════

const CAMERA_SEQUENCE: CameraMove[] = [
  "dolly-in",
  "crane-up",
  "pan-right",
  "dolly-out",
  "orbit-cw",
  "tilt-up",
  "parallax",
  "crane-down",
  "pan-left",
  "push-in-fast",
  "pull-out-slow",
  "handheld",
  "dutch-tilt",
  "bird-eye-spin",
  "orbit-ccw",
  "tilt-down",
];

const TRANSITION_SEQUENCE: TransitionType[] = [
  "cross-dissolve",
  "fade-black",
  "zoom-in-blur",
  "pan-wipe-right",
  "fade-white",
  "zoom-out-blur",
  "motion-blur",
  "flash",
  "pan-wipe-left",
  "iris-open",
  "cross-dissolve",
  "fade-black",
];

const MOOD_SEQUENCE: LightingMood[] = [
  "golden-hour",
  "blue-hour",
  "sunrise",
  "soft-overcast",
  "sunset",
  "moonlight",
  "dramatic-storm",
  "harsh-noon",
];

const TEXT_ANIMATIONS: TextAnimation[] = [
  "slide-up",
  "fade-in",
  "scale-in",
  "blur-in",
  "slide-up",
  "fade-in",
];

export function getSceneConfig(sceneIndex: number, totalScenes: number): {
  cameraMove: CameraMove;
  transition: TransitionType;
  mood: LightingMood;
  textAnimation: TextAnimation;
} {
  return {
    cameraMove: CAMERA_SEQUENCE[sceneIndex % CAMERA_SEQUENCE.length],
    transition: TRANSITION_SEQUENCE[sceneIndex % TRANSITION_SEQUENCE.length],
    mood: MOOD_SEQUENCE[sceneIndex % MOOD_SEQUENCE.length],
    textAnimation: TEXT_ANIMATIONS[sceneIndex % TEXT_ANIMATIONS.length],
  };
}
