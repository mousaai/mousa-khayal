import { useTranslation } from 'react-i18next';
/*
 * PlatformRaqaba — رقابة
 * iframe integration: embeds external raqaba platform
 * Design: Engineering Precision | Navy/Gold | RTL
 */

const PLATFORM_URL = "https://raqaba.mousa.ai/";
const PLATFORM_NAME = "رقابة — المشرف الميداني الذكي";

export default function PlatformRaqaba() {
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
          background: "#0F1B2D",
          borderBottom: "1px solid rgba(201,168,76,0.3)",
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
            color: "#C9A84C",
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
          <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#4A9B7F" }} />
          <span style={{ color: "#4A9B7F", fontSize: "11px", fontFamily: "monospace", letterSpacing: "0.05em" }}>RAQABA</span>
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
