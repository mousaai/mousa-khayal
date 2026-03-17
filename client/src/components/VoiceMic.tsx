import { useEffect, useRef, useState, useCallback } from "react";

interface VoiceMicProps {
  onTranscript: (text: string) => void;
  isRecording: boolean;
  onToggle: () => void;
}

export default function VoiceMic({ onTranscript, isRecording, onToggle }: VoiceMicProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);
  const [volume, setVolume] = useState(0);

  // Draw live waveform on canvas
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Compute volume level
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        const v = (dataArray[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / bufferLength);
      setVolume(rms);

      // Draw waveform bars
      const barCount = 28;
      const barWidth = canvas.width / barCount;
      const step = Math.floor(bufferLength / barCount);

      for (let i = 0; i < barCount; i++) {
        const value = dataArray[i * step] / 128.0;
        const barHeight = Math.max(4, (value - 0.5) * canvas.height * 2.5 + canvas.height * 0.15);

        // Color gradient based on position and volume
        const hue = 260 + i * 3 + rms * 60;
        const saturation = 70 + rms * 30;
        const lightness = 55 + rms * 20;
        const alpha = 0.5 + rms * 1.5;

        ctx.fillStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${Math.min(alpha, 1)})`;

        const x = i * barWidth + barWidth * 0.15;
        const y = (canvas.height - barHeight) / 2;
        const w = barWidth * 0.7;
        const r = Math.min(w / 2, 3);

        // Rounded bars
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + barHeight - r);
        ctx.quadraticCurveTo(x + w, y + barHeight, x + w - r, y + barHeight);
        ctx.lineTo(x + r, y + barHeight);
        ctx.quadraticCurveTo(x, y + barHeight, x, y + barHeight - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
        ctx.fill();

        // Glow effect
        ctx.shadowColor = `hsla(${hue}, 100%, 70%, 0.8)`;
        ctx.shadowBlur = 6 + rms * 10;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    };

    draw();
  }, []);

  useEffect(() => {
    if (!isRecording) {
      cancelAnimationFrame(animFrameRef.current);
      analyserRef.current = null;
      setVolume(0);
      // Clear canvas
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, [isRecording]);

  // Called by parent when stream is available
  const connectStream = useCallback((stream: MediaStream) => {
    const audioCtx = new AudioContext();
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;
    source.connect(analyser);
    analyserRef.current = analyser;
    drawWaveform();
  }, [drawWaveform]);

  // Expose connectStream via ref
  (VoiceMic as any)._connectStream = connectStream;

  const glowIntensity = Math.min(volume * 8, 1);

  return (
    <div className="relative flex items-center gap-2">
      {/* Waveform canvas — visible only when recording */}
      <div
        className="overflow-hidden rounded-xl transition-all duration-300"
        style={{
          width: isRecording ? 160 : 0,
          height: 36,
          opacity: isRecording ? 1 : 0,
          background: "rgba(139,92,246,0.08)",
          border: isRecording ? "1px solid rgba(167,139,250,0.3)" : "none",
          transition: "width 0.3s ease, opacity 0.3s ease",
        }}
      >
        <canvas
          ref={canvasRef}
          width={160}
          height={36}
          style={{ display: "block" }}
        />
      </div>

      {/* Mic button */}
      <button
        onClick={onToggle}
        className="relative flex items-center justify-center rounded-xl transition-all duration-200 hover:scale-110 active:scale-95"
        style={{
          width: 36,
          height: 36,
          background: isRecording
            ? `rgba(239,68,68,${0.15 + glowIntensity * 0.25})`
            : "rgba(167,139,250,0.1)",
          border: `1px solid ${isRecording
            ? `rgba(239,68,68,${0.5 + glowIntensity * 0.5})`
            : "rgba(167,139,250,0.25)"}`,
          color: isRecording ? "#ef4444" : "#a78bfa",
          boxShadow: isRecording
            ? `0 0 ${8 + glowIntensity * 20}px rgba(239,68,68,${0.3 + glowIntensity * 0.5}), 0 0 ${20 + glowIntensity * 30}px rgba(239,68,68,${0.1 + glowIntensity * 0.3})`
            : "none",
        }}
        title={isRecording ? "إيقاف التسجيل" : "تسجيل صوتي"}
      >
        {/* Pulse rings when recording */}
        {isRecording && (
          <>
            <div
              className="absolute rounded-xl pointer-events-none"
              style={{
                inset: -4,
                border: "1px solid rgba(239,68,68,0.4)",
                animation: "micPulse 1.2s ease-out infinite",
              }}
            />
            <div
              className="absolute rounded-xl pointer-events-none"
              style={{
                inset: -8,
                border: "1px solid rgba(239,68,68,0.2)",
                animation: "micPulse 1.2s ease-out infinite 0.4s",
              }}
            />
          </>
        )}

        {/* Mic icon */}
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/>
          <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8"/>
        </svg>
      </button>

      <style>{`
        @keyframes micPulse {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(1.6); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
