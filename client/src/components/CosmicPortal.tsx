/**
 * CosmicPortal — البوابة الكونية لمنصة خيال
 * فضاء حي بنجوم + بوابة ضوئية دائرية دوّارة
 * تعكس مشاهد متغيرة من عوالم مختلفة
 * تستجيب للتفاعل وتنفجر عند التوليد
 */
import { useEffect, useRef, useCallback } from "react";

const PORTAL_SCENES = [
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663315855165/BXEkPAJgGiqWs3v7muUPfr/khayal_demo_arabic-fdviFwTwnHX4epsUNqxRt6.webp",
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663315855165/BXEkPAJgGiqWs3v7muUPfr/khayal_demo_scifi-hnVeTaZdZrB4eYmJPki2V5.webp",
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663315855165/BXEkPAJgGiqWs3v7muUPfr/khayal_demo_nature-YRqqvykW3UvYpPTMdSKHE3.webp",
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663315855165/BXEkPAJgGiqWs3v7muUPfr/khayal_hero_bg-PpbZ3zko8TAh5SzBP3YAPx.webp",
];

interface Star {
  x: number; y: number; z: number;
  px: number; py: number;
  size: number; brightness: number; speed: number;
}

interface CosmicPortalProps {
  isGenerating?: boolean;
  isActive?: boolean;
  width?: number;
  height?: number;
}

export default function CosmicPortal({
  isGenerating = false,
  isActive = false,
  width = 600,
  height = 500,
}: CosmicPortalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const timeRef = useRef(0);
  const sceneIndexRef = useRef(0);
  const sceneFadeRef = useRef(1);
  const sceneTimerRef = useRef(0);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const imagesLoadedRef = useRef(0);
  const starsRef = useRef<Star[]>([]);
  const particlesRef = useRef<Array<{x:number;y:number;vx:number;vy:number;life:number;maxLife:number;size:number;color:string}>>([]);
  const explosionRef = useRef(0);

  // تحميل الصور
  useEffect(() => {
    PORTAL_SCENES.forEach((src, i) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => { imagesLoadedRef.current++; };
      img.src = src;
      imagesRef.current[i] = img;
    });
  }, []);

  // إنشاء النجوم
  useEffect(() => {
    starsRef.current = Array.from({ length: 300 }, () => ({
      x: (Math.random() - 0.5) * 2,
      y: (Math.random() - 0.5) * 2,
      z: Math.random(),
      px: 0, py: 0,
      size: Math.random() * 2 + 0.5,
      brightness: Math.random() * 0.8 + 0.2,
      speed: Math.random() * 0.0005 + 0.0002,
    }));
  }, []);

  // انفجار عند التوليد
  useEffect(() => {
    if (isGenerating) {
      explosionRef.current = 1;
      // إنشاء جسيمات الانفجار
      const cx = width / 2;
      const cy = height * 0.42;
      for (let i = 0; i < 80; i++) {
        const angle = (i / 80) * Math.PI * 2;
        const speed = Math.random() * 4 + 1;
        particlesRef.current.push({
          x: cx, y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1, maxLife: 1,
          size: Math.random() * 4 + 1,
          color: i % 3 === 0 ? "#64c8ff" : i % 3 === 1 ? "#a78bfa" : "#fbbf24",
        });
      }
    }
  }, [isGenerating, width, height]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const cx = width / 2;
    const cy = height * 0.42;
    const baseR = Math.min(width, height) * 0.28;

    const draw = () => {
      const speed = isGenerating ? 0.03 : 0.008;
      timeRef.current += speed;
      const t = timeRef.current;

      // تبديل المشاهد كل 6 ثوانٍ
      sceneTimerRef.current += speed;
      if (sceneTimerRef.current > 6) {
        sceneTimerRef.current = 0;
        sceneFadeRef.current = 0;
        setTimeout(() => {
          sceneIndexRef.current = (sceneIndexRef.current + 1) % PORTAL_SCENES.length;
        }, 500);
      }
      if (sceneFadeRef.current < 1) sceneFadeRef.current = Math.min(1, sceneFadeRef.current + 0.02);

      // ===== خلفية الفضاء =====
      ctx.fillStyle = "#03040d";
      ctx.fillRect(0, 0, width, height);

      // سديم خلفي
      const nebula1 = ctx.createRadialGradient(cx * 0.3, cy * 0.5, 0, cx * 0.3, cy * 0.5, width * 0.4);
      nebula1.addColorStop(0, "rgba(30, 0, 80, 0.3)");
      nebula1.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = nebula1;
      ctx.fillRect(0, 0, width, height);

      const nebula2 = ctx.createRadialGradient(cx * 1.7, cy * 1.2, 0, cx * 1.7, cy * 1.2, width * 0.35);
      nebula2.addColorStop(0, "rgba(0, 20, 80, 0.25)");
      nebula2.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = nebula2;
      ctx.fillRect(0, 0, width, height);

      // ===== النجوم المتحركة =====
      starsRef.current.forEach(star => {
        star.z -= star.speed;
        if (star.z <= 0) {
          star.x = (Math.random() - 0.5) * 2;
          star.y = (Math.random() - 0.5) * 2;
          star.z = 1;
        }
        const sx = (star.x / star.z) * width * 0.5 + cx;
        const sy = (star.y / star.z) * height * 0.5 + cy;
        const size = (1 - star.z) * star.size * 2;
        const alpha = (1 - star.z) * star.brightness;
        const twinkle = 0.7 + 0.3 * Math.sin(t * 2 + star.brightness * 10);

        ctx.beginPath();
        ctx.arc(sx, sy, Math.max(0.3, size), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200, 220, 255, ${alpha * twinkle})`;
        ctx.fill();
        star.px = sx; star.py = sy;
      });

      // ===== البوابة الدائرية =====
      const portalR = isGenerating
        ? baseR * (1 + 0.15 * Math.sin(t * 4))
        : baseR * (1 + 0.03 * Math.sin(t * 1.5));

      // قص داخل البوابة لعرض الصورة
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, portalR * 0.92, 0, Math.PI * 2);
      ctx.clip();

      // عرض صورة المشهد داخل البوابة
      const img = imagesRef.current[sceneIndexRef.current];
      if (img && img.complete && img.naturalWidth > 0) {
        ctx.globalAlpha = sceneFadeRef.current * 0.85;
        const imgAspect = img.naturalWidth / img.naturalHeight;
        const drawW = portalR * 2.2;
        const drawH = drawW / imgAspect;
        // Ken Burns
        const kbScale = 1 + 0.05 * Math.sin(t * 0.3);
        const kbX = cx - drawW * kbScale / 2 + Math.sin(t * 0.2) * 10;
        const kbY = cy - drawH * kbScale / 2 + Math.cos(t * 0.15) * 8;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(kbScale, kbScale);
        ctx.translate(-cx, -cy);
        ctx.drawImage(img, kbX, kbY, drawW, drawH);
        ctx.restore();
        ctx.globalAlpha = 1;
      } else {
        // خلفية بديلة إذا لم تُحمَّل الصورة
        const fallback = ctx.createRadialGradient(cx, cy, 0, cx, cy, portalR);
        fallback.addColorStop(0, "#1a3a6a");
        fallback.addColorStop(0.5, "#0d1f3c");
        fallback.addColorStop(1, "#050a14");
        ctx.fillStyle = fallback;
        ctx.fillRect(cx - portalR, cy - portalR, portalR * 2, portalR * 2);
      }

      // تدرج داخلي للعمق
      const innerVignette = ctx.createRadialGradient(cx, cy, portalR * 0.5, cx, cy, portalR * 0.92);
      innerVignette.addColorStop(0, "rgba(0,0,0,0)");
      innerVignette.addColorStop(0.7, "rgba(0,0,0,0)");
      innerVignette.addColorStop(1, "rgba(0,5,20,0.7)");
      ctx.fillStyle = innerVignette;
      ctx.fillRect(cx - portalR, cy - portalR, portalR * 2, portalR * 2);

      ctx.restore();

      // ===== حلقات البوابة الدوّارة =====
      // الحلقة الخارجية الرئيسية
      const ringGlow = isGenerating ? 0.9 : 0.6;
      for (let ring = 0; ring < 3; ring++) {
        const rr = portalR * (0.93 + ring * 0.04);
        const ringAlpha = (0.8 - ring * 0.25) * ringGlow;
        // ring gradient placeholder

        ctx.beginPath();
        ctx.arc(cx, cy, rr, 0, Math.PI * 2);
        ctx.strokeStyle = ring === 0
          ? `rgba(100, 200, 255, ${ringAlpha})`
          : ring === 1
          ? `rgba(80, 140, 255, ${ringAlpha * 0.7})`
          : `rgba(167, 139, 250, ${ringAlpha * 0.5})`;
        ctx.lineWidth = ring === 0 ? 2.5 : ring === 1 ? 1.5 : 1;
        ctx.shadowColor = "rgba(100, 200, 255, 0.8)";
        ctx.shadowBlur = isGenerating ? 20 : 10;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // ===== شعاع دوّار على الحلقة =====
      const numBeams = isGenerating ? 4 : 2;
      for (let b = 0; b < numBeams; b++) {
        const beamAngle = t * (isGenerating ? 3 : 1.5) + (b * Math.PI * 2) / numBeams;
        const bx = cx + Math.cos(beamAngle) * portalR;
        const by = cy + Math.sin(beamAngle) * portalR;

        const beamGrad = ctx.createRadialGradient(bx, by, 0, bx, by, portalR * 0.3);
        beamGrad.addColorStop(0, "rgba(150, 220, 255, 0.9)");
        beamGrad.addColorStop(0.3, "rgba(100, 180, 255, 0.4)");
        beamGrad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = beamGrad;
        ctx.beginPath();
        ctx.arc(bx, by, portalR * 0.3, 0, Math.PI * 2);
        ctx.fill();
      }

      // ===== خطوط هندسية دوّارة =====
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(t * 0.2);
      const hexSides = 6;
      ctx.beginPath();
      for (let i = 0; i <= hexSides; i++) {
        const a = (i / hexSides) * Math.PI * 2;
        const hx = Math.cos(a) * portalR * 1.12;
        const hy = Math.sin(a) * portalR * 1.12;
        i === 0 ? ctx.moveTo(hx, hy) : ctx.lineTo(hx, hy);
      }
      ctx.strokeStyle = "rgba(212, 175, 55, 0.3)";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.rotate(-t * 0.4);
      ctx.beginPath();
      for (let i = 0; i <= hexSides; i++) {
        const a = (i / hexSides) * Math.PI * 2 + Math.PI / hexSides;
        const hx = Math.cos(a) * portalR * 1.22;
        const hy = Math.sin(a) * portalR * 1.22;
        i === 0 ? ctx.moveTo(hx, hy) : ctx.lineTo(hx, hy);
      }
      ctx.strokeStyle = "rgba(100, 200, 255, 0.15)";
      ctx.lineWidth = 0.8;
      ctx.stroke();
      ctx.restore();

      // ===== توهج مركزي =====
      const coreGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, portalR * 1.5);
      const glowAlpha = isGenerating ? 0.4 : 0.15;
      coreGlow.addColorStop(0, `rgba(100, 200, 255, ${glowAlpha})`);
      coreGlow.addColorStop(0.3, `rgba(80, 120, 255, ${glowAlpha * 0.5})`);
      coreGlow.addColorStop(0.6, `rgba(167, 139, 250, ${glowAlpha * 0.2})`);
      coreGlow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = coreGlow;
      ctx.fillRect(0, 0, width, height);

      // ===== جسيمات الانفجار =====
      particlesRef.current = particlesRef.current.filter(p => p.life > 0);
      particlesRef.current.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05;
        p.life -= 0.02;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fillStyle = p.color.replace(")", `, ${p.life})`).replace("rgb", "rgba").replace("#", "rgba(").replace("64c8ff", "100,200,255,").replace("a78bfa", "167,139,250,").replace("fbbf24", "251,191,36,");
        // بسيط
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      // ===== جسيمات طائرة حول البوابة =====
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + t * 0.5;
        const dist = portalR * (1.1 + 0.1 * Math.sin(t * 2 + i));
        const px = cx + Math.cos(a) * dist;
        const py = cy + Math.sin(a) * dist;
        const pAlpha = 0.4 + 0.4 * Math.sin(t * 3 + i * 0.8);
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(100, 200, 255, ${pAlpha})`;
        ctx.shadowColor = "rgba(100, 200, 255, 0.8)";
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [width, height, isGenerating]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width,
        height,
        display: "block",
      }}
    />
  );
}
