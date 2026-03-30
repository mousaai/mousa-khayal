/*
 * DiamondHero — فيديو خلفية كاملة مع نص متجاوب
 * Design: Full-screen video hero | Mobile-first | RTL/LTR
 * i18n: Full multi-language support via useTranslation
 */
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { getLoginUrl } from "@/const";

const MARKETING_VIDEO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663315855165/6PpfERRQXfuwb7GGi2gFrK/mousa_ai_v4_medium_31e30a70.mp4";
const HERO_POSTER_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663315855165/6PpfERRQXfuwb7GGi2gFrK/hero-v4_03b844d7.jpg";

interface Star {
  x: number; y: number; size: number; opacity: number; speed: number; angle: number;
}

interface DiamondHeroProps {
  isAuthenticated?: boolean;
}

export default function DiamondHero({ isAuthenticated = false }: DiamondHeroProps) {
  const starsRef  = useRef<HTMLCanvasElement>(null);
  const starsAnim = useRef<number>(0);
  const { t } = useTranslation();

  /* ── Star field ── */
  useEffect(() => {
    const canvas = starsRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const resize = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const stars: Star[] = Array.from({ length: 100 }, () => ({
      x:       Math.random() * canvas.width,
      y:       Math.random() * canvas.height,
      size:    Math.random() * 1.6 + 0.2,
      opacity: Math.random() * 0.5 + 0.1,
      speed:   Math.random() * 0.3 + 0.05,
      angle:   Math.random() * Math.PI * 2,
    }));

    let frame = 0;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frame++;
      stars.forEach(s => {
        const tw = Math.sin(frame * s.speed + s.angle) * 0.4 + 0.6;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(212,160,23,${s.opacity * tw})`;
        ctx.fill();
        s.x += Math.cos(s.angle) * 0.06;
        s.y += Math.sin(s.angle) * 0.06;
        if (s.x < 0) s.x = canvas.width;
        if (s.x > canvas.width)  s.x = 0;
        if (s.y < 0) s.y = canvas.height;
        if (s.y > canvas.height) s.y = 0;
      });
      starsAnim.current = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(starsAnim.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div className="hero-root">
      {/* ── Background video ── */}
      <video
        src={MARKETING_VIDEO_URL}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        poster={HERO_POSTER_URL}
        className="hero-video"
        onError={(e) => {
          // If video fails, hide it so poster shows through background-image
          (e.target as HTMLVideoElement).style.display = 'none';
        }}
      />

      {/* ── Multi-layer overlay for perfect text legibility ── */}
      <div className="hero-overlay-bottom" />
      <div className="hero-overlay-top" />
      <div className="hero-overlay-center" />

      {/* ── Star particles ── */}
      <canvas ref={starsRef} className="hero-stars" />

      {/* ── Content ── */}
      <div className="hero-content">

        {/* Badge */}
        <div className="hero-badge">
          <span className="hero-badge-dot" />
          {t("hero.badge")}
        </div>

        {/* Headline */}
        <h1 className="hero-title">
          <span className="hero-title-line1">{t("hero.title")}</span>
          <span className="hero-title-gold-wrap">
            <span className="hero-title-gold">{t("hero.titleHighlight")}</span>
          </span>
        </h1>

        {/* Subtext */}
        <p className="hero-sub">
          {t("hero.subtitle")}
        </p>

        {/* CTA Buttons */}
        <div className="hero-cta-row">
          <button
            className="hero-btn-primary"
            onClick={() => {
              // Scroll to platforms section — the core of the product
              const el = document.getElementById("platforms");
              if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "start" });
              } else {
                window.location.href = "/#platforms";
              }
            }}
          >
            {t("hero.ctaPrimary")}
          </button>
          <button
            className="hero-btn-secondary"
            data-mousa-action="ابدأ مجاناً"
            onClick={() => {
              if (isAuthenticated) {
                window.location.href = "/dashboard";
              } else {
                window.location.href = getLoginUrl("/dashboard");
              }
            }}
          >
            {isAuthenticated ? t("hero.ctaDashboard") : t("hero.ctaSecondary")}
          </button>
        </div>

        {/* Fine print */}
        <p className="hero-fine">
          {t("hero.freeCredits")}
        </p>

        {/* Scroll indicator */}
        <div className="hero-scroll">
          <span className="hero-scroll-label">{t("hero.scroll")}</span>
          <div className="hero-scroll-line" />
          <span className="hero-scroll-arrow">⌄</span>
        </div>
      </div>

      <style>{`
        /* ── Root ── */
        .hero-root {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100svh;
          overflow: hidden;
          width: 100%;
          /* Fallback background when video cannot play (e.g. iOS Low Power Mode) */
          background-image: url('https://d2xsxph8kpxj0f.cloudfront.net/310519663315855165/6PpfERRQXfuwb7GGi2gFrK/hero-v4_03b844d7.jpg');
          background-size: cover;
          background-position: center center;
          background-color: #0D1B2A;
        }

        /* ── Video ── */
        .hero-video {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center center;
          z-index: 0;
          filter: saturate(1.1) brightness(0.82);
        }

        /* ── Overlays — layered for depth ── */
        .hero-overlay-bottom {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to bottom,
            transparent 0%,
            transparent 35%,
            rgba(6, 14, 24, 0.72) 68%,
            rgba(6, 14, 24, 0.97) 100%
          );
          z-index: 1;
        }
        .hero-overlay-top {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to bottom,
            rgba(6, 14, 24, 0.52) 0%,
            transparent 28%
          );
          z-index: 1;
        }
        .hero-overlay-center {
          position: absolute;
          inset: 0;
          background: radial-gradient(
            ellipse 80% 60% at 50% 50%,
            rgba(6, 14, 24, 0.42) 0%,
            transparent 70%
          );
          z-index: 1;
        }

        /* ── Stars ── */
        .hero-stars {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 2;
        }

        /* ── Content wrapper ── */
        .hero-content {
          position: relative;
          z-index: 10;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          width: 100%;
          padding: 0 1rem;
          box-sizing: border-box;
        }

        /* ── Badge ── */
        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.4rem 1.1rem;
          border-radius: 9999px;
          background: rgba(212, 160, 23, 0.10);
          border: 1px solid rgba(212, 160, 23, 0.30);
          color: #F0C040;
          font-size: 0.73rem;
          font-family: 'JetBrains Mono', monospace;
          letter-spacing: 0.07em;
          margin-bottom: 1.5rem;
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          text-shadow: 0 1px 4px rgba(0,0,0,0.6);
        }
        .hero-badge-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #F0C040;
          box-shadow: 0 0 6px rgba(240,192,64,0.8);
          animation: pulse 2s ease-in-out infinite;
        }

        /* ── Title ── */
        .hero-title {
          font-family: 'IBM Plex Sans Arabic', sans-serif;
          font-weight: 800;
          line-height: 1.2;
          color: #FFFFFF;
          margin-bottom: 1.25rem;
          font-size: clamp(2rem, 9vw, 4.25rem);
          max-width: 90vw;
          text-shadow:
            0 2px 12px rgba(0, 0, 0, 0.85),
            0 4px 32px rgba(0, 0, 0, 0.60);
          letter-spacing: -0.025em;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.15em;
        }
        .hero-title-line1 {
          display: block;
          color: #E8EDF2;
          text-shadow:
            0 2px 12px rgba(0,0,0,0.9),
            0 4px 32px rgba(0,0,0,0.65);
        }
        .hero-title-gold-wrap {
          display: block;
          position: relative;
          line-height: 1.1;
        }
        .hero-title-gold {
          display: inline-block;
          /* Solid metallic gold — no transparency issues */
          color: #D4A017;
          -webkit-text-fill-color: #D4A017;
          background: none;
          /* Layered text-shadow for 3D engraved metal effect */
          text-shadow:
            0 1px 0 #8B6200,
            0 2px 0 #7A5500,
            0 3px 0 #6B4A00,
            0 4px 0 rgba(0,0,0,0.4),
            0 0 20px rgba(212,160,23,0.6),
            0 0 50px rgba(212,160,23,0.25),
            0 0 80px rgba(212,160,23,0.12);
          letter-spacing: 0.02em;
          font-size: 1.22em;
          font-weight: 900;
          animation: gold-pulse 3s ease-in-out infinite;
        }
        /* Decorative separator line */
        .hero-title-gold-wrap::before {
          content: '';
          display: block;
          margin: 0 auto 0.2em;
          width: 40px;
          height: 1px;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(212,160,23,0.7) 50%,
            transparent
          );
        }
        .hero-title-gold-wrap::after {
          content: '';
          display: block;
          margin: 0.2em auto 0;
          width: 40px;
          height: 1px;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(212,160,23,0.7) 50%,
            transparent
          );
        }
        @keyframes gold-pulse {
          0%, 100% {
            text-shadow:
              0 1px 0 #8B6200,
              0 2px 0 #7A5500,
              0 3px 0 #6B4A00,
              0 4px 0 rgba(0,0,0,0.4),
              0 0 20px rgba(212,160,23,0.6),
              0 0 50px rgba(212,160,23,0.25),
              0 0 80px rgba(212,160,23,0.12);
          }
          50% {
            text-shadow:
              0 1px 0 #8B6200,
              0 2px 0 #7A5500,
              0 3px 0 #6B4A00,
              0 4px 0 rgba(0,0,0,0.4),
              0 0 30px rgba(212,160,23,0.85),
              0 0 70px rgba(212,160,23,0.45),
              0 0 120px rgba(212,160,23,0.2);
          }
        }

        /* ── Subtext ── */
        .hero-sub {
          color: rgba(232, 237, 242, 0.90);
          line-height: 1.80;
          margin-bottom: 2.25rem;
          max-width: min(520px, 90vw);
          font-size: clamp(0.88rem, 3.5vw, 1.08rem);
          font-family: 'IBM Plex Sans Arabic', sans-serif;
          font-weight: 400;
          text-shadow: 0 1px 8px rgba(0, 0, 0, 0.75);
        }

        /* ── CTA row ── */
        .hero-cta-row {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          width: 100%;
          max-width: 320px;
          margin-bottom: 1rem;
        }

        .hero-btn-primary {
          width: 100%;
          padding: 0.95rem 1.75rem;
          border-radius: 0.875rem;
          font-weight: 700;
          font-size: 1rem;
          font-family: 'IBM Plex Sans Arabic', sans-serif;
          background: linear-gradient(135deg, #C9940F, #F0C040);
          color: #0D1B2A;
          border: none;
          cursor: pointer;
          box-shadow:
            0 4px 20px rgba(212, 160, 23, 0.45),
            0 1px 0 rgba(255,255,255,0.15) inset;
          transition: transform 0.18s ease, box-shadow 0.18s ease;
          letter-spacing: 0.01em;
        }
        .hero-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 28px rgba(212, 160, 23, 0.55);
        }
        .hero-btn-primary:active { transform: scale(0.97); }

        .hero-btn-secondary {
          width: 100%;
          padding: 0.95rem 1.75rem;
          border-radius: 0.875rem;
          font-weight: 600;
          font-size: 1rem;
          font-family: 'IBM Plex Sans Arabic', sans-serif;
          background: rgba(13, 27, 42, 0.55);
          color: #F0C040;
          border: 1.5px solid rgba(212, 160, 23, 0.42);
          cursor: pointer;
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          transition: background 0.2s ease, border-color 0.2s ease, transform 0.18s ease;
          letter-spacing: 0.01em;
        }
        .hero-btn-secondary:hover {
          background: rgba(212, 160, 23, 0.12);
          border-color: rgba(212, 160, 23, 0.65);
          transform: translateY(-2px);
        }
        .hero-btn-secondary:active { background: rgba(212, 160, 23, 0.18); }

        /* ── Fine print ── */
        .hero-fine {
          font-size: 0.73rem;
          color: rgba(138, 155, 176, 0.72);
          margin-bottom: 2.5rem;
          font-family: 'IBM Plex Sans Arabic', sans-serif;
          text-shadow: 0 1px 4px rgba(0,0,0,0.5);
        }

        /* ── Scroll indicator ── */
        .hero-scroll {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.25rem;
          color: rgba(212,160,23,0.45);
        }
        .hero-scroll-label {
          font-size: 0.65rem;
          font-family: 'JetBrains Mono', monospace;
          letter-spacing: 0.08em;
        }
        .hero-scroll-line {
          width: 1px;
          height: 32px;
          background: linear-gradient(to bottom, rgba(212,160,23,0.5), transparent);
          animation: scroll-fade 2.2s ease-in-out infinite;
        }
        .hero-scroll-arrow {
          font-size: 0.9rem;
          animation: bounce-down 2s ease-in-out infinite;
        }

        /* ── Tablet & Desktop: side-by-side buttons ── */
        @media (min-width: 480px) {
          .hero-cta-row {
            flex-direction: row;
            max-width: none;
            width: auto;
            gap: 1rem;
          }
          .hero-btn-primary,
          .hero-btn-secondary {
            width: auto;
            min-width: 170px;
          }
        }

        /* ── Animations ── */
        @keyframes pulse {
          0%, 100% { opacity: 0.7; transform: scale(1); }
          50%       { opacity: 1;   transform: scale(1.15); }
        }
        @keyframes scroll-fade {
          0%, 100% { opacity: 0.3; }
          50%       { opacity: 0.8; }
        }
        @keyframes bounce-down {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(5px); }
        }
      `}</style>
    </div>
  );
}
