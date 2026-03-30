import { useTranslation } from 'react-i18next';
/*
 * PlatformBonyan — بنيان | دليل البناء والعمران الذكي
 * iframe integration: embeds BonyanGuide external platform
 * Design: Blueprint Intelligence | Slate Ink + Amber | RTL
 */

const PLATFORM_URL = "https://bonyanguide-shmrbwkj.manus.space";
const PLATFORM_NAME = "بنيان — دليل البناء والعمران الذكي";
const PLATFORM_COLOR = "#2563EB";

export default function PlatformBonyan() {
  const { t } = useTranslation();
  return (
    <div style={{ width: "100%", height: "100vh", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      {/* mousa.ai slim back-bar */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: "40px",
          background: "#0D1B2A",
          borderBottom: "1px solid rgba(37,99,235,0.35)",
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          zIndex: 1000,
          gap: "12px",
        }}
      >
        <a
          href="/"
          style={{
            color: "#D4A017",
            fontSize: "13px",
            textDecoration: "none",
            fontFamily: "'IBM Plex Sans Arabic', sans-serif",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: "6px",
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: "14px" }}>←</span>
          mousa.ai
        </a>
        <span style={{ color: "rgba(255,255,255,0.2)", fontSize: "12px" }}>|</span>
        <span
          style={{
            color: "rgba(255,255,255,0.75)",
            fontSize: "13px",
            fontFamily: "'IBM Plex Sans Arabic', sans-serif",
          }}
        >
          {PLATFORM_NAME}
        </span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "6px" }}>
          <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: PLATFORM_COLOR }} />
          <span style={{ color: PLATFORM_COLOR, fontSize: "11px", fontFamily: "monospace", letterSpacing: "0.05em" }}>BONYAN</span>
        </div>
      </div>

      {/* Full-viewport iframe */}
      <iframe
        src={PLATFORM_URL}
        style={{
          width: "100%",
          height: "calc(100vh - 40px)",
          marginTop: "40px",
          border: "none",
          display: "block",
        }}
        title={PLATFORM_NAME}
        allow="camera; microphone; geolocation; fullscreen; clipboard-write"
        loading="lazy"
      />
    </div>
  );
}
