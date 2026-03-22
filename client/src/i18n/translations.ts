/**
 * translations.ts — نظام الترجمة لمنصة خيال
 * اللغات المدعومة: العربية (AR)، الإنجليزية (EN)، الأوردو (UR)، الفرنسية (FR)
 */

export type LangCode = "AR" | "EN" | "UR" | "FR";

export const RTL_LANGS: LangCode[] = ["AR", "UR"];

export function isRTLLang(lang: LangCode): boolean {
  return RTL_LANGS.includes(lang);
}

export interface Translations {
  // ── Meta ──
  appName: string;
  appTagline: string;
  appSubtitle: string;

  // ── Input ──
  placeholder: string;
  generateBtn: string;
  listening: string;
  processingAudio: string;
  thinking: string;
  analyzing: string;

  // ── Examples ──
  examplesTitle: string;

  // ── Attach menu ──
  attachHint: string;
  attachImage: string;
  attachDocument: string;
  attachUrl: string;

  // ── Intent labels ──
  intentCinematicImage: string;
  intentCinematicScenes: string;
  intentScript: string;
  intentImmersive: string;
  intentPersonalTransform: string;
  intentAutoGenerate: string;

  // ── Mode buttons ──
  modeAuto: string;
  modeFast: string;
  modePro: string;
  modeImages: string;
  modeImmersive: string;

  // ── Mode tooltips ──
  tooltipAuto: string;
  tooltipFast: string;
  tooltipPro: string;

  // ── Generation status ──
  generatingScenes: string;
  generatingScript: string;
  analyzingDoc: string;
  willBeGenerated: string;

  // ── Video job ──
  preparing: string;
  videoReady: string;
  videoFailed: string;
  retryProduction: string;
  downloadVideo: string;
  openVideo: string;
  shareVideo: string;
  copied: string;
  queuePosition: string;
  queueWait: string;
  serverPower: string;
  serverHigh: string;
  serverMedium: string;
  serverLow: string;
  activeJobs: string;
  minutesApprox: string;
  secondsApprox: string;
  lessThanMinute: string;

  // ── Chat ──
  chatPlaceholder: string;
  chatWithKhayal: string;
  productionComplete: string;
  productionError: string;
  connectionError: string;
  retryConnection: string;

  // ── Script ──
  scriptTitle: string;
  downloadScript: string;

  // ── Capabilities row ──
  capVideo: string;
  capImage: string;
  capScript: string;
  capVoice: string;
  capAttachments: string;
  capLinks: string;
  capMultilingual: string;

  // ── Navigation ──
  myFilms: string;
  backHome: string;

  // ── Face preservation ──
  facePreserved: string;
  facePreservedTooltip: string;

  // ── Credits ──
  creditsBalance: string;
  creditsPerSession: string;
  creditsInsufficient: string;
  creditsTopUp: string;

  // ── Autonomous ──
  autonomousThinking: string;
  autonomousDecided: string;
  autonomousScenes: string;

  // ── Errors ──
  errorImageGen: string;
  errorServerRestart: string;
  errorServerRestartMax: string;
  errorGeneric: string;

  // ── MyFilms page ──
  myFilmsTitle: string;
  myFilmsEmpty: string;
  myFilmsLoading: string;
  myFilmsDate: string;
  myFilmsStatus: string;
  myFilmsStatusDone: string;
  myFilmsStatusProcessing: string;
  myFilmsStatusFailed: string;
  myFilmsDownload: string;
  myFilmsShare: string;
  myFilmsDelete: string;
  myFilmsEdit: string;
  myFilmsRefine: string;
  myFilmsRefinePlaceholder: string;
  myFilmsRefineSend: string;
  myFilmsScenes: string;

  // ── SharePage ──
  loadingVideo: string;
  invalidLink: string;
  invalidLinkDesc: string;
  views: string;
  createdBy: string;
  createYourOwn: string;
}

const AR: Translations = {
  appName: "خيال",
  appTagline: "خيال",
  appSubtitle: "حوّل أي وصف إلى مرئيات سينمائية",

  placeholder: "صِف ما تتخيله أو تريده... فيديو، صورة، سيناريو، أو أي فكرة",
  generateBtn: "✦ خيال تقرر",
  listening: "يستمع...",
  processingAudio: "يُحلّل الصوت...",
  thinking: "يفهم ويُحلّل...",
  analyzing: "يحلل...",

  examplesTitle: "أمثلة للإلهام",

  attachHint: "أرفق صورة أو مستنداً أو أدخل رابطاً",
  attachImage: "صورة مرجعية",
  attachDocument: "مستند / مخطط",
  attachUrl: "رابط URL",

  intentCinematicImage: "🎨 صورة سينمائية",
  intentCinematicScenes: "🎨 مشاهد سينمائية",
  intentScript: "📄 سيناريو",
  intentImmersive: "🌍 أنا هناك — جولة 360°",
  intentPersonalTransform: "🪄 تحويل شخصي",
  intentAutoGenerate: "🧠 خيال تقرر",

  modeAuto: "🧠 ذاتية",
  modeFast: "⚡ سريع",
  modePro: "✨ احترافي",
  modeImages: "🎨 صور",
  modeImmersive: "🌍 أنا هناك",

  tooltipAuto: "خيال تقرر كل شيء تلقائياً",
  tooltipFast: "فيديو سريع (720p)",
  tooltipPro: "فيديو احترافي (1080p + انتقالات سينمائية)",

  generatingScenes: "يُحلّل الخيال ويُشكّل المشاهد السينمائية...",
  generatingScript: "يكتب السيناريو الاحترافي...",
  analyzingDoc: "يُحلّل المستند ويُشكّل المشاهد...",
  willBeGenerated: "سيُولَّد تلقائياً",

  preparing: "جاري التحضير...",
  videoReady: "✨ اكتمل الإنتاج! فيديوك جاهز.",
  videoFailed: "❌ حدث خطأ في الإنتاج. هل تريد إعادة المحاولة؟",
  retryProduction: "إعادة الإنتاج",
  downloadVideo: "تحميل",
  openVideo: "فتح",
  shareVideo: "مشاركة",
  copied: "تم النسخ",
  queuePosition: "أنت رقم {pos} في الطابور",
  queueWait: "انتظار: {time}",
  serverPower: "طاقة الخادم",
  serverHigh: "مرتفع",
  serverMedium: "متوسط",
  serverLow: "منخفض",
  activeJobs: "مهمة نشطة",
  minutesApprox: "≈ {n} دقائق",
  secondsApprox: "≈ {n} ثانية",
  lessThanMinute: "≈ أقل من دقيقة",

  chatPlaceholder: "اسأل خيال... كم يستغرق؟ عدّل المشهد الثاني...",
  chatWithKhayal: "تحدّث مع خيال",
  productionComplete: "✨ اكتمل الإنتاج! فيديوك جاهز. اضغط على زر التحميل لحفظ الفيديو.",
  productionError: "❌ حدث خطأ في الإنتاج. هل تريد إعادة المحاولة؟",
  connectionError: "انقطع الاتصال مؤقتاً. يمكنك إعادة المحاولة.",
  retryConnection: "عذراً، حدث خطأ في الاتصال. حاول مرة أخرى.",

  scriptTitle: "📄 السيناريو",
  downloadScript: "تحميل",

  capVideo: "فيديو",
  capImage: "صورة",
  capScript: "سيناريو",
  capVoice: "صوت",
  capAttachments: "مرفقات",
  capLinks: "روابط",
  capMultilingual: "متعدد اللغات",

  myFilms: "أفلامي",
  backHome: "الرئيسية",

  facePreserved: "ملامحك محفوظة",
  facePreservedTooltip: "سيتم الحفاظ على ملامحك في جميع الصور",

  creditsBalance: "رصيد خيال",
  creditsPerSession: "كل جلسة",
  creditsInsufficient: "رصيدك غير كافٍ",
  creditsTopUp: "شحن الرصيد",

  autonomousThinking: "🧠 خيال تفكّر...",
  autonomousDecided: "🎬 قررت خيال:",
  autonomousScenes: "مشاهد",

  errorImageGen: "🎨 فشل توليد الصور — يرجى إعادة المحاولة",
  errorServerRestart: "⚡ انقطع الإنتاج بسبب إعادة تشغيل السيرفر — يمكنك إعادة المحاولة الآن",
  errorServerRestartMax: "⚡ انقطع الإنتاج بسبب إعادة تشغيل السيرفر وتجاوز عدد المحاولات — يمكنك إعادة المحاولة يدوياً",
  errorGeneric: "حدث خطأ أثناء الإنتاج",

  myFilmsTitle: "أفلامي",
  myFilmsEmpty: "لا توجد أفلام بعد",
  myFilmsLoading: "جاري التحميل...",
  myFilmsDate: "التاريخ",
  myFilmsStatus: "الحالة",
  myFilmsStatusDone: "مكتمل",
  myFilmsStatusProcessing: "جاري الإنتاج",
  myFilmsStatusFailed: "فشل",
  myFilmsDownload: "تحميل",
  myFilmsShare: "مشاركة",
  myFilmsDelete: "حذف",
  myFilmsEdit: "تعديل",
  myFilmsRefine: "تحسين المشهد",
  myFilmsRefinePlaceholder: "اكتب تعديلاتك...",
  myFilmsRefineSend: "إرسال",
  myFilmsScenes: "مشاهد",

  loadingVideo: "جاري تحميل الفيديو...",
  invalidLink: "الرابط غير صالح",
  invalidLinkDesc: "هذا الفيديو غير موجود أو انتهت صلاحيته",
  views: "مشاهدة",
  createdBy: "تم الإنشاء بواسطة",
  createYourOwn: "أنشئ فيلمك الخاص",
};

const EN: Translations = {
  appName: "Khayal",
  appTagline: "Khayal",
  appSubtitle: "Transform any description into cinematic visuals",

  placeholder: "Describe what you want... video, image, script, or any idea",
  generateBtn: "✦ Generate",
  listening: "Listening...",
  processingAudio: "Analyzing audio...",
  thinking: "Understanding & analyzing...",
  analyzing: "Analyzing...",

  examplesTitle: "Inspiration examples",

  attachHint: "Attach image, document, or enter a URL",
  attachImage: "Reference Image",
  attachDocument: "Document / Plan",
  attachUrl: "URL Link",

  intentCinematicImage: "🎨 Cinematic Image",
  intentCinematicScenes: "🎨 Cinematic Scenes",
  intentScript: "📄 Script",
  intentImmersive: "🌍 I'm There — 360° Tour",
  intentPersonalTransform: "🪄 Personal Transform",
  intentAutoGenerate: "🧠 Khayal Decides",

  modeAuto: "🧠 Auto",
  modeFast: "⚡ Fast",
  modePro: "✨ Pro",
  modeImages: "🎨 Images",
  modeImmersive: "🌍 I'm There",

  tooltipAuto: "Khayal decides everything automatically",
  tooltipFast: "Fast video (720p)",
  tooltipPro: "Pro video (1080p + cinematic transitions)",

  generatingScenes: "Analyzing and generating cinematic scenes...",
  generatingScript: "Writing professional script...",
  analyzingDoc: "Analyzing document and generating scenes...",
  willBeGenerated: "will be generated automatically",

  preparing: "Preparing...",
  videoReady: "✨ Production complete! Your video is ready.",
  videoFailed: "❌ Production failed. Would you like to retry?",
  retryProduction: "Retry Production",
  downloadVideo: "Download",
  openVideo: "Open",
  shareVideo: "Share",
  copied: "Copied!",
  queuePosition: "You are #{pos} in queue",
  queueWait: "Wait: {time}",
  serverPower: "Server Power",
  serverHigh: "High",
  serverMedium: "Medium",
  serverLow: "Low",
  activeJobs: "active jobs",
  minutesApprox: "≈ {n} min",
  secondsApprox: "≈ {n} sec",
  lessThanMinute: "≈ less than a minute",

  chatPlaceholder: "Ask Khayal... how long? edit scene 2...",
  chatWithKhayal: "Chat with Khayal",
  productionComplete: "✨ Production complete! Your video is ready. Click download to save.",
  productionError: "❌ Production failed. Would you like to retry?",
  connectionError: "Connection interrupted. You can retry.",
  retryConnection: "Sorry, a connection error occurred. Please try again.",

  scriptTitle: "📄 Script",
  downloadScript: "Download",

  capVideo: "Video",
  capImage: "Image",
  capScript: "Script",
  capVoice: "Voice",
  capAttachments: "Attachments",
  capLinks: "Links",
  capMultilingual: "Multilingual",

  myFilms: "My Films",
  backHome: "Home",

  facePreserved: "Face preserved",
  facePreservedTooltip: "Your facial features will be preserved across all images",

  creditsBalance: "Khayal Credits",
  creditsPerSession: "per session",
  creditsInsufficient: "Insufficient credits",
  creditsTopUp: "Top Up",

  autonomousThinking: "🧠 Khayal is thinking...",
  autonomousDecided: "🎬 Khayal decided:",
  autonomousScenes: "scenes",

  errorImageGen: "🎨 Image generation failed — please retry",
  errorServerRestart: "⚡ Production interrupted due to server restart — you can retry now",
  errorServerRestartMax: "⚡ Production interrupted and max retries exceeded — please retry manually",
  errorGeneric: "An error occurred during production",

  myFilmsTitle: "My Films",
  myFilmsEmpty: "No films yet",
  myFilmsLoading: "Loading...",
  myFilmsDate: "Date",
  myFilmsStatus: "Status",
  myFilmsStatusDone: "Complete",
  myFilmsStatusProcessing: "Processing",
  myFilmsStatusFailed: "Failed",
  myFilmsDownload: "Download",
  myFilmsShare: "Share",
  myFilmsDelete: "Delete",
  myFilmsEdit: "Edit",
  myFilmsRefine: "Refine Scene",
  myFilmsRefinePlaceholder: "Write your edits...",
  myFilmsRefineSend: "Send",
  myFilmsScenes: "scenes",

  loadingVideo: "Loading video...",
  invalidLink: "Invalid Link",
  invalidLinkDesc: "This video does not exist or has expired",
  views: "views",
  createdBy: "Created by",
  createYourOwn: "Create your own film",
};

const UR: Translations = {
  appName: "خیال",
  appTagline: "خیال",
  appSubtitle: "کسی بھی وضاحت کو سینماٹک ویژول میں تبدیل کریں",

  placeholder: "اپنا خیال بیان کریں... ویڈیو، تصویر، اسکرپٹ، یا کوئی بھی آئیڈیا",
  generateBtn: "✦ بنائیں",
  listening: "سن رہا ہے...",
  processingAudio: "آڈیو تجزیہ...",
  thinking: "سمجھ رہا ہے...",
  analyzing: "تجزیہ کر رہا ہے...",

  examplesTitle: "مثالیں",

  attachHint: "تصویر، دستاویز منسلک کریں یا لنک درج کریں",
  attachImage: "حوالہ تصویر",
  attachDocument: "دستاویز / منصوبہ",
  attachUrl: "URL لنک",

  intentCinematicImage: "🎨 سینماٹک تصویر",
  intentCinematicScenes: "🎨 سینماٹک مناظر",
  intentScript: "📄 اسکرپٹ",
  intentImmersive: "🌍 میں وہاں ہوں — 360°",
  intentPersonalTransform: "🪄 ذاتی تبدیلی",
  intentAutoGenerate: "🧠 خیال فیصلہ کرے",

  modeAuto: "🧠 خودکار",
  modeFast: "⚡ تیز",
  modePro: "✨ پیشہ ور",
  modeImages: "🎨 تصاویر",
  modeImmersive: "🌍 میں وہاں ہوں",

  tooltipAuto: "خیال خود بخود سب کچھ فیصلہ کرتا ہے",
  tooltipFast: "تیز ویڈیو (720p)",
  tooltipPro: "پیشہ ور ویڈیو (1080p + سینماٹک ٹرانزیشن)",

  generatingScenes: "سینماٹک مناظر تیار کیے جا رہے ہیں...",
  generatingScript: "پیشہ ور اسکرپٹ لکھا جا رہا ہے...",
  analyzingDoc: "دستاویز کا تجزیہ اور مناظر تیار کیے جا رہے ہیں...",
  willBeGenerated: "خودکار طور پر بنایا جائے گا",

  preparing: "تیاری جاری ہے...",
  videoReady: "✨ پروڈکشن مکمل! آپ کی ویڈیو تیار ہے۔",
  videoFailed: "❌ پروڈکشن ناکام۔ دوبارہ کوشش کریں؟",
  retryProduction: "دوبارہ بنائیں",
  downloadVideo: "ڈاؤنلوڈ",
  openVideo: "کھولیں",
  shareVideo: "شیئر",
  copied: "کاپی ہو گیا!",
  queuePosition: "آپ قطار میں نمبر {pos} پر ہیں",
  queueWait: "انتظار: {time}",
  serverPower: "سرور طاقت",
  serverHigh: "زیادہ",
  serverMedium: "درمیانی",
  serverLow: "کم",
  activeJobs: "فعال کام",
  minutesApprox: "≈ {n} منٹ",
  secondsApprox: "≈ {n} سیکنڈ",
  lessThanMinute: "≈ ایک منٹ سے کم",

  chatPlaceholder: "خیال سے پوچھیں... کتنا وقت لگے گا؟",
  chatWithKhayal: "خیال سے بات کریں",
  productionComplete: "✨ پروڈکشن مکمل! آپ کی ویڈیو تیار ہے۔",
  productionError: "❌ پروڈکشن ناکام۔ دوبارہ کوشش کریں؟",
  connectionError: "کنکشن عارضی طور پر منقطع۔ دوبارہ کوشش کریں۔",
  retryConnection: "معذرت، کنکشن میں خرابی۔ دوبارہ کوشش کریں۔",

  scriptTitle: "📄 اسکرپٹ",
  downloadScript: "ڈاؤنلوڈ",

  capVideo: "ویڈیو",
  capImage: "تصویر",
  capScript: "اسکرپٹ",
  capVoice: "آواز",
  capAttachments: "منسلکات",
  capLinks: "لنکس",
  capMultilingual: "کثیر لسانی",

  myFilms: "میری فلمیں",
  backHome: "ہوم",

  facePreserved: "چہرہ محفوظ",
  facePreservedTooltip: "تمام تصاویر میں آپ کی چہرے کی خصوصیات محفوظ رہیں گی",

  creditsBalance: "خیال کریڈٹس",
  creditsPerSession: "فی سیشن",
  creditsInsufficient: "کریڈٹس ناکافی",
  creditsTopUp: "کریڈٹس بھریں",

  autonomousThinking: "🧠 خیال سوچ رہا ہے...",
  autonomousDecided: "🎬 خیال نے فیصلہ کیا:",
  autonomousScenes: "مناظر",

  errorImageGen: "🎨 تصویر بنانے میں ناکامی — دوبارہ کوشش کریں",
  errorServerRestart: "⚡ سرور ری اسٹارٹ کی وجہ سے پروڈکشن رک گئی — ابھی دوبارہ کوشش کریں",
  errorServerRestartMax: "⚡ سرور ری اسٹارٹ اور زیادہ کوششوں کی وجہ سے رک گئی — دستی دوبارہ کوشش کریں",
  errorGeneric: "پروڈکشن کے دوران خرابی",

  myFilmsTitle: "میری فلمیں",
  myFilmsEmpty: "ابھی تک کوئی فلم نہیں",
  myFilmsLoading: "لوڈ ہو رہا ہے...",
  myFilmsDate: "تاریخ",
  myFilmsStatus: "حالت",
  myFilmsStatusDone: "مکمل",
  myFilmsStatusProcessing: "پروسیسنگ",
  myFilmsStatusFailed: "ناکام",
  myFilmsDownload: "ڈاؤنلوڈ",
  myFilmsShare: "شیئر",
  myFilmsDelete: "حذف",
  myFilmsEdit: "ترمیم",
  myFilmsRefine: "منظر بہتر کریں",
  myFilmsRefinePlaceholder: "اپنی ترامیم لکھیں...",
  myFilmsRefineSend: "بھیجیں",
  myFilmsScenes: "مناظر",

  loadingVideo: "ویڈیو لوڈ ہو رہی ہے...",
  invalidLink: "لنک غلط ہے",
  invalidLinkDesc: "یہ ویڈیو موجود نہیں یا میعاد ختم ہو گئی",
  views: "منظر",
  createdBy: "بنایا گیا بذریعہ",
  createYourOwn: "اپنی فلم بنائیں",
};

const FR: Translations = {
  appName: "Khayal",
  appTagline: "خيال",
  appSubtitle: "Transformez toute description en scène cinématographique",

  placeholder: "Décrivez ce que vous imaginez... vidéo, image, script, ou toute idée",
  generateBtn: "✦ Générer",
  listening: "Écoute...",
  processingAudio: "Analyse audio...",
  thinking: "Compréhension en cours...",
  analyzing: "Analyse...",

  examplesTitle: "Exemples d'inspiration",

  attachHint: "Joindre une image, un document ou entrer une URL",
  attachImage: "Image de référence",
  attachDocument: "Document / Plan",
  attachUrl: "Lien URL",

  intentCinematicImage: "🎨 Image cinématographique",
  intentCinematicScenes: "🎨 Scènes cinématographiques",
  intentScript: "📄 Script",
  intentImmersive: "🌍 J'y suis — Tour 360°",
  intentPersonalTransform: "🪄 Transformation personnelle",
  intentAutoGenerate: "🧠 Khayal décide",

  modeAuto: "🧠 Auto",
  modeFast: "⚡ Rapide",
  modePro: "✨ Pro",
  modeImages: "🎨 Images",
  modeImmersive: "🌍 J'y suis",

  tooltipAuto: "Khayal décide tout automatiquement",
  tooltipFast: "Vidéo rapide (720p)",
  tooltipPro: "Vidéo pro (1080p + transitions cinématographiques)",

  generatingScenes: "Analyse et génération de scènes cinématographiques...",
  generatingScript: "Rédaction du script professionnel...",
  analyzingDoc: "Analyse du document et génération de scènes...",
  willBeGenerated: "sera généré automatiquement",

  preparing: "Préparation...",
  videoReady: "✨ Production terminée ! Votre vidéo est prête.",
  videoFailed: "❌ Production échouée. Réessayer ?",
  retryProduction: "Relancer la production",
  downloadVideo: "Télécharger",
  openVideo: "Ouvrir",
  shareVideo: "Partager",
  copied: "Copié !",
  queuePosition: "Vous êtes n°{pos} dans la file",
  queueWait: "Attente : {time}",
  serverPower: "Puissance serveur",
  serverHigh: "Élevée",
  serverMedium: "Moyenne",
  serverLow: "Faible",
  activeJobs: "tâches actives",
  minutesApprox: "≈ {n} min",
  secondsApprox: "≈ {n} sec",
  lessThanMinute: "≈ moins d'une minute",

  chatPlaceholder: "Demandez à Khayal... combien de temps ? modifier la scène 2...",
  chatWithKhayal: "Discuter avec Khayal",
  productionComplete: "✨ Production terminée ! Votre vidéo est prête. Cliquez sur télécharger.",
  productionError: "❌ Production échouée. Réessayer ?",
  connectionError: "Connexion interrompue. Vous pouvez réessayer.",
  retryConnection: "Désolé, une erreur de connexion s'est produite. Réessayez.",

  scriptTitle: "📄 Script",
  downloadScript: "Télécharger",

  capVideo: "Vidéo",
  capImage: "Image",
  capScript: "Script",
  capVoice: "Voix",
  capAttachments: "Pièces jointes",
  capLinks: "Liens",
  capMultilingual: "Multilingue",

  myFilms: "Mes Films",
  backHome: "Accueil",

  facePreserved: "Visage préservé",
  facePreservedTooltip: "Vos traits seront préservés dans toutes les images",

  creditsBalance: "Crédits Khayal",
  creditsPerSession: "par session",
  creditsInsufficient: "Crédits insuffisants",
  creditsTopUp: "Recharger",

  autonomousThinking: "🧠 Khayal réfléchit...",
  autonomousDecided: "🎬 Khayal a décidé :",
  autonomousScenes: "scènes",

  errorImageGen: "🎨 Échec de la génération d'images — réessayez",
  errorServerRestart: "⚡ Production interrompue suite à un redémarrage serveur — réessayez maintenant",
  errorServerRestartMax: "⚡ Production interrompue, tentatives max dépassées — réessayez manuellement",
  errorGeneric: "Une erreur s'est produite lors de la production",

  myFilmsTitle: "Mes Films",
  myFilmsEmpty: "Aucun film pour l'instant",
  myFilmsLoading: "Chargement...",
  myFilmsDate: "Date",
  myFilmsStatus: "Statut",
  myFilmsStatusDone: "Terminé",
  myFilmsStatusProcessing: "En cours",
  myFilmsStatusFailed: "Échoué",
  myFilmsDownload: "Télécharger",
  myFilmsShare: "Partager",
  myFilmsDelete: "Supprimer",
  myFilmsEdit: "Modifier",
  myFilmsRefine: "Affiner la scène",
  myFilmsRefinePlaceholder: "Écrivez vos modifications...",
  myFilmsRefineSend: "Envoyer",
  myFilmsScenes: "scènes",

  loadingVideo: "Chargement de la vidéo...",
  invalidLink: "Lien invalide",
  invalidLinkDesc: "Cette vidéo n'existe pas ou a expiré",
  views: "vues",
  createdBy: "Créé par",
  createYourOwn: "Créez votre propre film",
};

export const TRANSLATIONS: Record<LangCode, Translations> = { AR, EN, UR, FR };

export const LANG_NAMES: Record<LangCode, string> = {
  AR: "العربية",
  EN: "English",
  UR: "اردو",
  FR: "Français",
};

export const LANG_FLAGS: Record<LangCode, string> = {
  AR: "🇦🇪",
  EN: "🇬🇧",
  UR: "🇵🇰",
  FR: "🇫🇷",
};

export const ALL_LANGS: LangCode[] = ["AR", "EN", "UR", "FR"];
