/**
 * musicEngine.ts — محرك الموسيقى المحيطية لمنصة خيال
 * ─────────────────────────────────────────────────────────────
 * القاعدة الأساسية:
 * - الصوت دائماً هادئ وناعم — يعطي روح الخيال والذكاء الاصطناعي
 * - لا oscillators حادة — فقط نغمات ناعمة متدرجة
 * - يستخدم sine waves بترددات منخفضة جداً مع reverb طويل
 * - الحجم منخفض جداً (0.04 افتراضياً) — يُسمع كخلفية لطيفة
 */

export type MusicMood = "ambient" | "dramatic" | "peaceful" | "epic" | "mysterious" | "joyful";

// ── اختيار المزاج ──
// القاعدة: peaceful هو الافتراضي دائماً
// تتغير فقط إذا طلب المستخدم صراحةً
export function selectMusicMood(
  scenarioType: string,
  atmosphere?: string,
  userExplicitRequest?: string
): MusicMood {
  const userReq = (userExplicitRequest || "").toLowerCase();

  // طلب صريح من المستخدم يتجاوز كل شيء
  if (userReq) {
    if (/dramatic|intense|درامي|مكثف|قوي/.test(userReq)) return "dramatic";
    if (/epic|grand|ملحمي|عظيم/.test(userReq)) return "epic";
    if (/mysterious|غامض|سحري/.test(userReq)) return "mysterious";
    if (/joyful|vibrant|مبهج|حيوي/.test(userReq)) return "joyful";
    if (/ambient|محيطي/.test(userReq)) return "ambient";
  }

  // الافتراضي دائماً: سلمي هادئ وطبيعي
  return "peaceful";
}

// ── تعريفات النغمات ──
// كل المزاجات هادئة — تختلف فقط في الترددات والإيقاع
interface MoodConfig {
  label_ar: string;
  // ترددات أساسية منخفضة جداً (Hz) — تحت 200Hz لتجنب الحدة
  frequencies: number[];
  // مدة كل نغمة (ثانية)
  noteDuration: number;
  // فترة الصمت بين النغمات (ثانية)
  silenceDuration: number;
  // حجم الصوت الأقصى (0-1) — منخفض جداً
  maxVolume: number;
}

const MOOD_CONFIGS: Record<MusicMood, MoodConfig> = {
  peaceful: {
    label_ar: "سلمي هادئ — روح الطبيعة",
    frequencies: [55, 82.4, 110, 146.8, 164.8],   // A1, E2, A2, D3, E3
    noteDuration: 4.0,
    silenceDuration: 2.5,
    maxVolume: 0.04,
  },
  ambient: {
    label_ar: "محيطي — روح الخيال",
    frequencies: [65.4, 87.3, 130.8, 174.6, 196],  // C2, F2, C3, F3, G3
    noteDuration: 5.0,
    silenceDuration: 3.0,
    maxVolume: 0.035,
  },
  mysterious: {
    label_ar: "غامض ساحر — روح الذكاء الاصطناعي",
    frequencies: [46.2, 69.3, 92.5, 123.5, 138.6], // Bb1, F2, Bb2, Eb3, F3
    noteDuration: 6.0,
    silenceDuration: 4.0,
    maxVolume: 0.03,
  },
  dramatic: {
    label_ar: "درامي هادئ",
    frequencies: [55, 73.4, 110, 146.8, 220],       // A1, D2, A2, D3, A3
    noteDuration: 3.5,
    silenceDuration: 2.0,
    maxVolume: 0.045,
  },
  epic: {
    label_ar: "ملحمي رزين",
    frequencies: [41.2, 55, 82.4, 110, 164.8],      // E1, A1, E2, A2, E3
    noteDuration: 4.5,
    silenceDuration: 2.5,
    maxVolume: 0.04,
  },
  joyful: {
    label_ar: "مبهج خفيف",
    frequencies: [65.4, 98, 130.8, 196, 261.6],     // C2, G2, C3, G3, C4
    noteDuration: 3.0,
    silenceDuration: 1.5,
    maxVolume: 0.04,
  },
};

// ── محرك الصوت ──
class KhayalMusicEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private reverbNode: ConvolverNode | null = null;
  private activeOscillators: OscillatorNode[] = [];
  private activeGains: GainNode[] = [];
  private isPlaying = false;
  private currentMood: MusicMood | null = null;
  private scheduleTimer: ReturnType<typeof setTimeout> | null = null;
  private noteIndex = 0;

  private getContext(): AudioContext {
    if (!this.ctx || this.ctx.state === "closed") {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.ctx;
  }

  // ── إنشاء reverb طبيعي ──
  // يُعطي الصوت عمقاً وهدوءاً بدون حدة
  private async createReverb(ctx: AudioContext): Promise<ConvolverNode> {
    const convolver = ctx.createConvolver();
    const sampleRate = ctx.sampleRate;
    const length = sampleRate * 3; // 3 ثوانٍ reverb
    const impulse = ctx.createBuffer(2, length, sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const data = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        // تدهور أسي ناعم
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.5);
      }
    }

    convolver.buffer = impulse;
    return convolver;
  }

  // ── تشغيل نغمة واحدة بشكل ناعم ──
  private playNote(
    ctx: AudioContext,
    freq: number,
    startTime: number,
    duration: number,
    volume: number
  ): void {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    // sine فقط — أنعم نوع ممكن
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, startTime);

    // تذبذب خفيف جداً للحياة (vibrato ناعم)
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.type = "sine";
    lfo.frequency.setValueAtTime(0.08, startTime); // بطيء جداً
    lfoGain.gain.setValueAtTime(freq * 0.002, startTime); // طفيف جداً
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    lfo.start(startTime);
    lfo.stop(startTime + duration + 0.5);

    // envelope ناعم: attack طويل + release طويل
    const attackTime = Math.min(duration * 0.4, 2.0);
    const releaseTime = Math.min(duration * 0.5, 2.5);
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(volume, startTime + attackTime);
    gainNode.gain.setValueAtTime(volume, startTime + duration - releaseTime);
    gainNode.gain.linearRampToValueAtTime(0, startTime + duration);

    osc.connect(gainNode);

    // توصيل بـ reverb إذا كان متاحاً
    if (this.reverbNode && this.masterGain) {
      const dryGain = ctx.createGain();
      const wetGain = ctx.createGain();
      dryGain.gain.setValueAtTime(0.3, startTime);
      wetGain.gain.setValueAtTime(0.7, startTime); // reverb أكثر من dry

      gainNode.connect(dryGain);
      gainNode.connect(this.reverbNode);
      this.reverbNode.connect(wetGain);
      dryGain.connect(this.masterGain);
      wetGain.connect(this.masterGain);
    } else if (this.masterGain) {
      gainNode.connect(this.masterGain);
    }

    osc.start(startTime);
    osc.stop(startTime + duration + 0.1);

    this.activeOscillators.push(osc);
    this.activeGains.push(gainNode);
  }

  // ── جدولة النغمات بشكل متتابع ──
  private scheduleNextNote(config: MoodConfig): void {
    if (!this.isPlaying || !this.ctx) return;

    const ctx = this.ctx;
    const now = ctx.currentTime;
    const freq = config.frequencies[this.noteIndex % config.frequencies.length];

    // نغمة أساسية
    this.playNote(ctx, freq, now, config.noteDuration, config.maxVolume);

    // نغمة ثانوية (أوكتاف أعلى بحجم أقل) لإضافة عمق
    const secondFreq = config.frequencies[(this.noteIndex + 2) % config.frequencies.length];
    this.playNote(ctx, secondFreq * 0.5, now + 1.0, config.noteDuration * 0.8, config.maxVolume * 0.4);

    this.noteIndex++;

    // تنظيف الـ oscillators المنتهية
    const nextNoteDelay = (config.noteDuration + config.silenceDuration) * 1000;
    this.scheduleTimer = setTimeout(() => {
      this.cleanupFinishedOscillators();
      this.scheduleNextNote(config);
    }, nextNoteDelay);
  }

  private cleanupFinishedOscillators(): void {
    // إزالة المراجع القديمة فقط — لا نوقف النغمات الجارية
    if (this.activeOscillators.length > 20) {
      this.activeOscillators = this.activeOscillators.slice(-10);
      this.activeGains = this.activeGains.slice(-10);
    }
  }

  async play(mood: MusicMood, volume?: number): Promise<void> {
    if (this.isPlaying && this.currentMood === mood) return;
    await this.stop();

    const ctx = this.getContext();
    if (ctx.state === "suspended") {
      try { await ctx.resume(); } catch {}
    }

    const config = MOOD_CONFIGS[mood];
    const actualVolume = volume ?? config.maxVolume;

    // Master gain
    this.masterGain = ctx.createGain();
    this.masterGain.gain.setValueAtTime(0, ctx.currentTime);
    this.masterGain.gain.linearRampToValueAtTime(actualVolume * 20, ctx.currentTime + 3); // fade in بطيء
    this.masterGain.connect(ctx.destination);

    // Reverb
    try {
      this.reverbNode = await this.createReverb(ctx);
    } catch {
      this.reverbNode = null;
    }

    this.isPlaying = true;
    this.currentMood = mood;
    this.noteIndex = 0;

    // ابدأ الجدولة
    this.scheduleNextNote(config);
  }

  async stop(): Promise<void> {
    if (!this.isPlaying && !this.masterGain) return;

    // إلغاء الجدولة
    if (this.scheduleTimer) {
      clearTimeout(this.scheduleTimer);
      this.scheduleTimer = null;
    }

    // Fade out ناعم
    if (this.masterGain && this.ctx) {
      const ctx = this.ctx;
      this.masterGain.gain.cancelScheduledValues(ctx.currentTime);
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, ctx.currentTime);
      this.masterGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 2.0);
    }

    // إيقاف بعد الـ fade out
    await new Promise<void>(resolve => setTimeout(resolve, 2100));

    this.activeOscillators.forEach(osc => {
      try { osc.stop(); } catch {}
    });
    this.activeOscillators = [];
    this.activeGains = [];
    this.isPlaying = false;
    this.currentMood = null;
    this.noteIndex = 0;
  }

  async crossfadeTo(newMood: MusicMood): Promise<void> {
    if (this.currentMood === newMood) return;
    await this.stop();
    setTimeout(() => this.play(newMood), 300);
  }

  setVolume(volume: number): void {
    if (this.masterGain && this.ctx) {
      const ctx = this.ctx;
      this.masterGain.gain.cancelScheduledValues(ctx.currentTime);
      this.masterGain.gain.linearRampToValueAtTime(
        Math.max(0, Math.min(1, volume)),
        ctx.currentTime + 0.5
      );
    }
  }

  get playing(): boolean {
    return this.isPlaying;
  }

  get mood(): MusicMood | null {
    return this.currentMood;
  }

  getMoodLabel(mood: MusicMood): string {
    return MOOD_CONFIGS[mood]?.label_ar || mood;
  }
}

// ── Singleton ──
export const musicEngine = new KhayalMusicEngine();
export { MOOD_CONFIGS };
