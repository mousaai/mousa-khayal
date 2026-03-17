/**
 * Home.tsx
 * Design: Parametric Minimalism — full-screen 3D experience
 * Dark architectural theme with blue accents
 */

import { useState } from "react";
import Walkthrough3D from "@/components/Walkthrough3D";

export default function Home() {
  const [started, setStarted] = useState(false);

  if (!started) {
    return (
      <div className="min-h-screen bg-[#08090f] flex flex-col items-center justify-center relative overflow-hidden">
        {/* Background grid */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "linear-gradient(rgba(68,136,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(68,136,255,0.3) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* Radial glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(30,60,120,0.4)_0%,transparent_70%)]" />

        {/* Content */}
        <div className="relative z-10 text-center max-w-2xl px-6">
          {/* Logo mark */}
          <div className="mb-8 flex justify-center">
            <div className="relative">
              <div className="w-20 h-20 border-2 border-blue-500/40 rounded-lg rotate-12 absolute inset-0 animate-spin" style={{ animationDuration: "8s" }} />
              <div className="w-20 h-20 border-2 border-blue-400/60 rounded-lg flex items-center justify-center relative">
                <span className="text-blue-300 font-mono text-2xl font-bold">T</span>
              </div>
            </div>
          </div>

          <h1 className="text-5xl font-bold text-white mb-2 tracking-tight">
            Tashkila House
          </h1>
          <p className="text-blue-400 font-mono text-sm tracking-widest mb-2 uppercase">
            نموذج معماري تفاعلي ثلاثي الأبعاد
          </p>
          <p className="text-blue-300/50 font-mono text-xs mb-10">
            أرض 25 × 43 م · شكل C · 3 طوابق · ارتداد أمامي 5م
          </p>

          {/* Feature cards */}
          <div className="grid grid-cols-3 gap-4 mb-10">
            {[
              { icon: "🎬", title: "جولة سينمائية", desc: "مسار كاميرا احترافي" },
              { icon: "🚶", title: "تجوال حر", desc: "استكشف بحرية كاملة" },
              { icon: "🗺️", title: "مناظير متعددة", desc: "مسقط، واجهة، جانبي" },
            ].map((f) => (
              <div
                key={f.title}
                className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4 text-center"
              >
                <div className="text-2xl mb-2">{f.icon}</div>
                <div className="text-blue-200 text-sm font-semibold">{f.title}</div>
                <div className="text-blue-400/50 text-xs mt-1">{f.desc}</div>
              </div>
            ))}
          </div>

          <button
            onClick={() => setStarted(true)}
            className="group relative px-10 py-4 bg-blue-600 hover:bg-blue-500 text-white font-mono text-lg rounded-lg transition-all duration-300 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-105"
          >
            <span className="relative z-10">ابدأ التجربة ثلاثية الأبعاد</span>
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-400 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </button>

          <p className="text-blue-400/30 font-mono text-xs mt-6">
            يتطلب متصفحاً حديثاً يدعم WebGL
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen bg-[#08090f] overflow-hidden">
      <Walkthrough3D />
    </div>
  );
}
