/**
 * CrystalOrb — الكرة الكريستالية التقنية لمنصة خيال
 * مصنوعة بـ CSS + Canvas animations
 * تدور، تتوهج، وتستجيب للتفاعل
 */
import { useEffect, useRef, useState } from "react";

interface CrystalOrbProps {
  size?: number;
  isActive?: boolean;
  isGenerating?: boolean;
  onClick?: () => void;
}

export default function CrystalOrb({
  size = 200,
  isActive = false,
  isGenerating = false,
  onClick,
}: CrystalOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const timeRef = useRef(0);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    const s = size * dpr;
    canvas.width = s;
    canvas.height = s;
    const cx = s / 2;
    const cy = s / 2;
    const r = (size * 0.38) * dpr;

    const draw = (t: number) => {
      ctx.clearRect(0, 0, s, s);
      const speed = isGenerating ? 0.025 : 0.008;
      timeRef.current += speed;
      const time = timeRef.current;

      // ===== توهج خارجي =====
      const glowSize = isGenerating ? r * 1.8 : r * 1.4;
      const glowIntensity = isGenerating ? 0.35 : hovered ? 0.25 : 0.15;
      const outerGlow = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, glowSize);
      outerGlow.addColorStop(0, `rgba(100, 200, 255, ${glowIntensity})`);
      outerGlow.addColorStop(0.4, `rgba(80, 120, 255, ${glowIntensity * 0.5})`);
      outerGlow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = outerGlow;
      ctx.beginPath();
      ctx.arc(cx, cy, glowSize, 0, Math.PI * 2);
      ctx.fill();

      // ===== الكرة الكريستالية الرئيسية =====
      // طبقة زجاجية عميقة
      const baseGrad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r);
      baseGrad.addColorStop(0, "rgba(180, 230, 255, 0.95)");
      baseGrad.addColorStop(0.3, "rgba(60, 140, 220, 0.7)");
      baseGrad.addColorStop(0.7, "rgba(20, 60, 140, 0.85)");
      baseGrad.addColorStop(1, "rgba(5, 15, 50, 0.95)");
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = baseGrad;
      ctx.fill();

      // ===== خطوط الدوائر الداخلية (circuit) =====
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.clip();

      // دوائر متحركة
      for (let i = 0; i < 5; i++) {
        const angle = time * (i % 2 === 0 ? 1 : -1) + (i * Math.PI * 2) / 5;
        const rx = cx + Math.cos(angle) * r * 0.2;
        const ry = cy + Math.sin(angle) * r * 0.2;
        const cr = r * (0.15 + i * 0.12);
        ctx.beginPath();
        ctx.arc(rx, ry, cr, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(100, 220, 255, ${0.08 + i * 0.03})`;
        ctx.lineWidth = dpr * 0.5;
        ctx.stroke();
      }

      // خطوط circuit board
      const circuitAlpha = isGenerating ? 0.4 : 0.2;
      ctx.strokeStyle = `rgba(80, 200, 255, ${circuitAlpha})`;
      ctx.lineWidth = dpr * 0.8;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + time * 0.3;
        const x1 = cx + Math.cos(a) * r * 0.2;
        const y1 = cy + Math.sin(a) * r * 0.2;
        const x2 = cx + Math.cos(a) * r * 0.75;
        const y2 = cy + Math.sin(a) * r * 0.75;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      // نقاط circuit
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2 + time * 0.5;
        const dist = r * (0.3 + (i % 3) * 0.2);
        const px = cx + Math.cos(a) * dist;
        const py = cy + Math.sin(a) * dist;
        const pulse = 0.5 + 0.5 * Math.sin(time * 3 + i);
        ctx.beginPath();
        ctx.arc(px, py, dpr * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(100, 220, 255, ${0.3 + pulse * 0.5})`;
        ctx.fill();
      }

      // ===== تدفق البيانات (data streams) =====
      if (isGenerating) {
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + time * 2;
          const len = r * 0.6;
          const x1 = cx + Math.cos(a) * r * 0.1;
          const y1 = cy + Math.sin(a) * r * 0.1;
          const x2 = cx + Math.cos(a) * len;
          const y2 = cy + Math.sin(a) * len;
          const streamGrad = ctx.createLinearGradient(x1, y1, x2, y2);
          streamGrad.addColorStop(0, "rgba(100,220,255,0)");
          streamGrad.addColorStop(0.5, "rgba(100,220,255,0.6)");
          streamGrad.addColorStop(1, "rgba(100,220,255,0)");
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.strokeStyle = streamGrad;
          ctx.lineWidth = dpr * 1.5;
          ctx.stroke();
        }
      }

      ctx.restore();

      // ===== انعكاس ضوئي علوي =====
      const highlight = ctx.createRadialGradient(
        cx - r * 0.35, cy - r * 0.35, r * 0.05,
        cx - r * 0.2, cy - r * 0.2, r * 0.7
      );
      highlight.addColorStop(0, "rgba(255,255,255,0.7)");
      highlight.addColorStop(0.3, "rgba(200,240,255,0.2)");
      highlight.addColorStop(1, "rgba(255,255,255,0)");
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = highlight;
      ctx.fill();

      // ===== حافة كريستالية =====
      const edgeGrad = ctx.createRadialGradient(cx, cy, r * 0.85, cx, cy, r);
      edgeGrad.addColorStop(0, "rgba(0,0,0,0)");
      edgeGrad.addColorStop(0.5, "rgba(100,180,255,0.15)");
      edgeGrad.addColorStop(1, "rgba(150,220,255,0.4)");
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = edgeGrad;
      ctx.fill();

      // ===== إطار ذهبي جيوديسي =====
      const goldAlpha = hovered ? 0.7 : 0.45;
      ctx.strokeStyle = `rgba(212, 175, 55, ${goldAlpha})`;
      ctx.lineWidth = dpr * 0.8;
      const frameR = r * 1.18;
      const sides = 6;
      for (let i = 0; i < sides; i++) {
        const a1 = (i / sides) * Math.PI * 2 + time * 0.15;
        const a2 = ((i + 1) / sides) * Math.PI * 2 + time * 0.15;
        const a3 = ((i + 3) / sides) * Math.PI * 2 + time * 0.15;
        // خطوط الإطار
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a1) * frameR, cy + Math.sin(a1) * frameR);
        ctx.lineTo(cx + Math.cos(a2) * frameR, cy + Math.sin(a2) * frameR);
        ctx.stroke();
        // خطوط قطرية
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a1) * frameR, cy + Math.sin(a1) * frameR);
        ctx.lineTo(cx + Math.cos(a3) * frameR, cy + Math.sin(a3) * frameR);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // نقاط الإطار
      for (let i = 0; i < sides; i++) {
        const a = (i / sides) * Math.PI * 2 + time * 0.15;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(a) * frameR, cy + Math.sin(a) * frameR, dpr * 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(212, 175, 55, ${goldAlpha})`;
        ctx.fill();
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [size, isActive, isGenerating, hovered]);

  return (
    <div
      className="relative cursor-pointer select-none"
      style={{ width: size, height: size }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: size,
          height: size,
          filter: isGenerating
            ? "drop-shadow(0 0 30px rgba(100,200,255,0.8)) drop-shadow(0 0 60px rgba(80,120,255,0.4))"
            : hovered
            ? "drop-shadow(0 0 20px rgba(100,200,255,0.6)) drop-shadow(0 0 40px rgba(80,120,255,0.3))"
            : "drop-shadow(0 0 12px rgba(100,200,255,0.4))",
          transition: "filter 0.5s ease",
          transform: `scale(${hovered ? 1.05 : 1})`,
          transitionProperty: "filter, transform",
          transitionDuration: "0.3s",
        }}
      />
      {/* نبضة توليد */}
      {isGenerating && (
        <div
          className="absolute inset-0 rounded-full animate-ping"
          style={{
            background: "radial-gradient(circle, rgba(100,200,255,0.15) 0%, transparent 70%)",
            animationDuration: "1.5s",
          }}
        />
      )}
    </div>
  );
}
