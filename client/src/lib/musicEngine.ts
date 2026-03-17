/**
 * musicEngine.ts — محرك الموسيقى التصويرية الذكية
 * ─────────────────────────────────────────────────────────────
 * يختار الموسيقى تلقائياً حسب السيناريو ويتزامن مع الفيلم
 * يستخدم Web Audio API لتوليد موسيقى محيطية بدون ملفات خارجية
 */

export type MusicMood = "ambient" | "dramatic" | "peaceful" | "epic" | "mysterious" | "joyful";

interface MusicTrack {
  mood: MusicMood;
  label_ar: string;
  bpm: number;
  baseFrequencies: number[];
  chordProgression: number[][];
  description: string;
}

// ── خصائص كل مزاج موسيقي ──
const MUSIC_TRACKS: Record<MusicMood, MusicTrack> = {
  ambient: {
    mood: "ambient",
    label_ar: "محيطي هادئ",
    bpm: 60,
    baseFrequencies: [220, 277.18, 329.63, 440],
    chordProgression: [[0, 4, 7], [0, 3, 7], [0, 5, 9], [0, 4, 7]],
    description: "موسيقى محيطية هادئة للمشاهد التأملية",
  },
  dramatic: {
    mood: "dramatic",
    label_ar: "درامي مكثف",
    bpm: 90,
    baseFrequencies: [110, 146.83, 196, 261.63],
    chordProgression: [[0, 3, 7], [0, 4, 7], [0, 3, 6], [0, 4, 8]],
    description: "موسيقى درامية مكثفة للمشاهد التطويرية",
  },
  peaceful: {
    mood: "peaceful",
    label_ar: "سلمي رقيق",
    bpm: 50,
    baseFrequencies: [261.63, 329.63, 392, 523.25],
    chordProgression: [[0, 4, 7], [0, 5, 9], [0, 4, 7], [0, 2, 5]],
    description: "موسيقى سلمية رقيقة للمشاهد الطبيعية",
  },
  epic: {
    mood: "epic",
    label_ar: "ملحمي عظيم",
    bpm: 120,
    baseFrequencies: [87.31, 110, 130.81, 174.61],
    chordProgression: [[0, 4, 7, 11], [0, 3, 7, 10], [0, 5, 9, 12], [0, 4, 7, 11]],
    description: "موسيقى ملحمية عظيمة للمشاهد المعمارية الكبرى",
  },
  mysterious: {
    mood: "mysterious",
    label_ar: "غامض ساحر",
    bpm: 70,
    baseFrequencies: [138.59, 185, 246.94, 369.99],
    chordProgression: [[0, 3, 6], [0, 4, 8], [0, 2, 6], [0, 3, 7]],
    description: "موسيقى غامضة ساحرة للمشاهد الخيالية",
  },
  joyful: {
    mood: "joyful",
    label_ar: "مبهج حيوي",
    bpm: 110,
    baseFrequencies: [261.63, 329.63, 392, 523.25],
    chordProgression: [[0, 4, 7], [0, 5, 9], [0, 2, 7], [0, 4, 7]],
    description: "موسيقى مبهجة حيوية للمشاهد الاحتفالية",
  },
};

// ── اختيار المزاج تلقائياً ──
// القاعدة الأساسية: الطبيعة والهدوء هو الافتراضي دائماً
// تتغير فقط إذا طلب المستخدم صراحةً موسيقى مختلفة
export function selectMusicMood(
  scenarioType: string,
  atmosphere?: string,
  userExplicitRequest?: string
): MusicMood {
  const lower = (atmosphere || "").toLowerCase();
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
  // كل السيناريوهات تبدأ بالهدوء ولا تتغير إلا بطلب صريح
  return "peaceful";
}

// ── محرك الصوت ──
class KhayalMusicEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private oscillators: OscillatorNode[] = [];
  private isPlaying = false;
  private currentMood: MusicMood | null = null;
  private fadeInterval: number | null = null;

  private getContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.ctx;
  }

  async play(mood: MusicMood, volume: number = 0.15): Promise<void> {
    if (this.isPlaying && this.currentMood === mood) return;
    await this.stop();

    const ctx = this.getContext();
    if (ctx.state === "suspended") await ctx.resume();

    const track = MUSIC_TRACKS[mood];
    this.masterGain = ctx.createGain();
    this.masterGain.gain.setValueAtTime(0, ctx.currentTime);
    this.masterGain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 2);
    this.masterGain.connect(ctx.destination);

    // توليد نغمات محيطية متعددة الطبقات
    track.baseFrequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      const panNode = ctx.createStereoPanner();

      osc.type = i === 0 ? "sine" : i === 1 ? "triangle" : "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      // تذبذب خفيف للحياة
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.setValueAtTime(0.1 + i * 0.05, ctx.currentTime);
      lfoGain.gain.setValueAtTime(freq * 0.005, ctx.currentTime);
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start();

      gainNode.gain.setValueAtTime(0.3 / (i + 1), ctx.currentTime);
      panNode.pan.setValueAtTime((i % 2 === 0 ? -1 : 1) * 0.3, ctx.currentTime);

      osc.connect(gainNode);
      gainNode.connect(panNode);
      panNode.connect(this.masterGain!);

      osc.start();
      this.oscillators.push(osc);

      // تغيير النغمة تدريجياً حسب التقدم الزمني
      this.scheduleChordChanges(osc, freq, track, ctx);
    });

    this.isPlaying = true;
    this.currentMood = mood;
  }

  private scheduleChordChanges(
    osc: OscillatorNode,
    baseFreq: number,
    track: MusicTrack,
    ctx: AudioContext
  ): void {
    const beatDuration = 60 / track.bpm;
    const chordDuration = beatDuration * 4;

    track.chordProgression.forEach((chord, chordIdx) => {
      const startTime = ctx.currentTime + chordIdx * chordDuration;
      const semitoneShift = chord[0] || 0;
      const newFreq = baseFreq * Math.pow(2, semitoneShift / 12);
      osc.frequency.setValueAtTime(newFreq, startTime);
    });
  }

  async stop(): Promise<void> {
    if (!this.isPlaying) return;

    const ctx = this.getContext();
    if (this.masterGain) {
      this.masterGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.5);
    }

    setTimeout(() => {
      this.oscillators.forEach(osc => {
        try { osc.stop(); } catch {}
      });
      this.oscillators = [];
      this.isPlaying = false;
      this.currentMood = null;
    }, 1600);
  }

  async crossfadeTo(newMood: MusicMood, volume: number = 0.15): Promise<void> {
    if (this.currentMood === newMood) return;
    await this.stop();
    setTimeout(() => this.play(newMood, volume), 500);
  }

  setVolume(volume: number): void {
    if (this.masterGain) {
      const ctx = this.getContext();
      this.masterGain.gain.linearRampToValueAtTime(
        Math.max(0, Math.min(1, volume)),
        ctx.currentTime + 0.3
      );
    }
  }

  get playing(): boolean {
    return this.isPlaying;
  }

  get mood(): MusicMood | null {
    return this.currentMood;
  }

  getMoodInfo(mood: MusicMood): MusicTrack {
    return MUSIC_TRACKS[mood];
  }
}

// ── Singleton ──
export const musicEngine = new KhayalMusicEngine();
export { MUSIC_TRACKS };
