/**
 * mousa-widget.js — ثاني الذكي v5.0
 * Enhanced Voice Assistant | Smart Barge-In | Premium SVG UI
 * Features:
 *   - Always-on continuous listening (no touch needed)
 *   - Single tap = pause/resume
 *   - Smart barge-in: stops speaking when user talks
 *   - Auto-welcome on page load with platform intro
 *   - Premium SVG AI avatar (no robot emoji)
 *   - Animated voice-wave mic icon
 *   - Auto-hide chat during guided tour
 *   - Hide/show widget toggle with localStorage persistence
 *   - Fast response pipeline
 *   - Volume control slider
 *   - Speed control (0.7x - 1.2x)
 *   - Improved STT with noise filtering
 *   - Retry on audio failure
 *   - Multi-voice: ثاني (male) | اليازية (female)
 */
(function () {
  "use strict";

  const API_BASE = window.location.origin + "/api/widget";
  const WIDGET_ID = "mousa-ai-guide";
  const STORAGE_KEY = "thani_widget_v50";

  if (document.getElementById(WIDGET_ID)) return;

  // ── State ─────────────────────────────────────────────────────────────────────
  let orbState = "idle";       // idle | listening | thinking | speaking | paused
  let isOpen = false;
  let userClosedChat = false;
  let messages = [];
  let currentAudio = null;
  let recognition = null;
  let isTourActive = false;
  let tourIndex = 0;
  let tourTargets = [];
  let hasWelcomed = false;
  let isWidgetHidden = false;
  let isPaused = false;
  let isSpeaking = false;
  let isProcessing = false;
  let bargeInDetected = false;
  let audioContext = null;
  let analyserNode = null;
  let micStream = null;
  let bargeInInterval = null;
  let audioUnlocked = false;
  let pendingWelcome = null;
  let pendingAudioSrc = null;
  let pendingAudioMime = null;
  let activeVoice = "thani";   // thani | noura
  let preloadedWelcomeAudio = null;
  let smartPositionEnabled = true;
  let audioVolume = 1.0;       // 0.0 - 1.0
  let audioSpeed = 1.0;        // 0.7 - 1.2
  let consecutiveErrors = 0;   // track consecutive TTS errors
  let continuousRecognition = null;
  let continuousRestartTimer = null;
  let silenceTimer = null;

  // Load persisted state
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    isPaused = saved.paused || false;
    isWidgetHidden = saved.hidden || false;
    activeVoice = saved.voice || "thani";
    audioVolume = typeof saved.volume === "number" ? saved.volume : 1.0;
    audioSpeed = typeof saved.speed === "number" ? saved.speed : 1.0;
  } catch (_) {}

  // ── SVG Icons ─────────────────────────────────────────────────────────────────
  const SVG_AI_FACE = `<svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="idleGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#fff8e1" stop-opacity="0.95"/>
        <stop offset="40%" stop-color="#d4a017" stop-opacity="0.8"/>
        <stop offset="100%" stop-color="#8b6914" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(212,160,23,0.15)" stroke-width="1"><animate attributeName="r" values="14;17;14" dur="2.5s" repeatCount="indefinite"/><animate attributeName="stroke-opacity" values="0.15;0.35;0.15" dur="2.5s" repeatCount="indefinite"/></circle>
    <circle cx="18" cy="18" r="11" fill="none" stroke="rgba(212,160,23,0.3)" stroke-width="1"><animate attributeName="r" values="9;12;9" dur="2.5s" begin="0.3s" repeatCount="indefinite"/><animate attributeName="stroke-opacity" values="0.3;0.6;0.3" dur="2.5s" begin="0.3s" repeatCount="indefinite"/></circle>
    <circle cx="18" cy="18" r="7" fill="url(#idleGlow)"><animate attributeName="r" values="5;8;5" dur="2.5s" begin="0.6s" repeatCount="indefinite"/></circle>
    <circle cx="18" cy="18" r="3" fill="white" opacity="0.9"><animate attributeName="opacity" values="0.7;1;0.7" dur="2.5s" repeatCount="indefinite"/></circle>
    <line x1="18" y1="2" x2="18" y2="6" stroke="rgba(212,160,23,0.5)" stroke-width="1.5" stroke-linecap="round"><animate attributeName="opacity" values="0.3;0.8;0.3" dur="2.5s" begin="0s" repeatCount="indefinite"/></line>
    <line x1="18" y1="30" x2="18" y2="34" stroke="rgba(212,160,23,0.5)" stroke-width="1.5" stroke-linecap="round"><animate attributeName="opacity" values="0.3;0.8;0.3" dur="2.5s" begin="0.4s" repeatCount="indefinite"/></line>
    <line x1="2" y1="18" x2="6" y2="18" stroke="rgba(212,160,23,0.5)" stroke-width="1.5" stroke-linecap="round"><animate attributeName="opacity" values="0.3;0.8;0.3" dur="2.5s" begin="0.8s" repeatCount="indefinite"/></line>
    <line x1="30" y1="18" x2="34" y2="18" stroke="rgba(212,160,23,0.5)" stroke-width="1.5" stroke-linecap="round"><animate attributeName="opacity" values="0.3;0.8;0.3" dur="2.5s" begin="1.2s" repeatCount="indefinite"/></line>
    <line x1="5.5" y1="5.5" x2="8.5" y2="8.5" stroke="rgba(212,160,23,0.35)" stroke-width="1.2" stroke-linecap="round"><animate attributeName="opacity" values="0.2;0.6;0.2" dur="2.5s" begin="0.2s" repeatCount="indefinite"/></line>
    <line x1="27.5" y1="27.5" x2="30.5" y2="30.5" stroke="rgba(212,160,23,0.35)" stroke-width="1.2" stroke-linecap="round"><animate attributeName="opacity" values="0.2;0.6;0.2" dur="2.5s" begin="0.6s" repeatCount="indefinite"/></line>
    <line x1="30.5" y1="5.5" x2="27.5" y2="8.5" stroke="rgba(212,160,23,0.35)" stroke-width="1.2" stroke-linecap="round"><animate attributeName="opacity" values="0.2;0.6;0.2" dur="2.5s" begin="1s" repeatCount="indefinite"/></line>
    <line x1="5.5" y1="30.5" x2="8.5" y2="27.5" stroke="rgba(212,160,23,0.35)" stroke-width="1.2" stroke-linecap="round"><animate attributeName="opacity" values="0.2;0.6;0.2" dur="2.5s" begin="1.4s" repeatCount="indefinite"/></line>
  </svg>`;

  const SVG_AI_THINKING = `<svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="18" cy="18" r="14" stroke="rgba(212,160,23,0.15)" stroke-width="1"/>
    <circle cx="18" cy="18" r="14" stroke="url(#thinkGrad)" stroke-width="2" stroke-dasharray="22 66" stroke-linecap="round">
      <animateTransform attributeName="transform" type="rotate" from="0 18 18" to="360 18 18" dur="1.2s" repeatCount="indefinite"/>
    </circle>
    <defs>
      <linearGradient id="thinkGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#d4a017"/>
        <stop offset="100%" stop-color="transparent"/>
      </linearGradient>
    </defs>
    <circle cx="12" cy="18" r="2" fill="#d4a017"><animate attributeName="opacity" values="1;0.2;1" dur="1.2s" begin="0s" repeatCount="indefinite"/></circle>
    <circle cx="18" cy="18" r="2" fill="#d4a017"><animate attributeName="opacity" values="1;0.2;1" dur="1.2s" begin="0.4s" repeatCount="indefinite"/></circle>
    <circle cx="24" cy="18" r="2" fill="#d4a017"><animate attributeName="opacity" values="1;0.2;1" dur="1.2s" begin="0.8s" repeatCount="indefinite"/></circle>
  </svg>`;

  const SVG_AI_LISTENING = `<svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="18" cy="18" r="10" stroke="rgba(0,200,83,0.3)" stroke-width="1" fill="none"/>
    <rect x="8" y="15" width="2.5" height="6" rx="1.2" fill="#00c853"><animate attributeName="height" values="4;12;4" dur="0.8s" begin="0s" repeatCount="indefinite"/><animate attributeName="y" values="16;12;16" dur="0.8s" begin="0s" repeatCount="indefinite"/></rect>
    <rect x="12" y="13" width="2.5" height="10" rx="1.2" fill="#00c853"><animate attributeName="height" values="6;16;6" dur="0.8s" begin="0.15s" repeatCount="indefinite"/><animate attributeName="y" values="15;10;15" dur="0.8s" begin="0.15s" repeatCount="indefinite"/></rect>
    <rect x="16" y="11" width="2.5" height="14" rx="1.2" fill="#00c853"><animate attributeName="height" values="8;18;8" dur="0.8s" begin="0.3s" repeatCount="indefinite"/><animate attributeName="y" values="14;9;14" dur="0.8s" begin="0.3s" repeatCount="indefinite"/></rect>
    <rect x="20" y="13" width="2.5" height="10" rx="1.2" fill="#00c853"><animate attributeName="height" values="6;16;6" dur="0.8s" begin="0.15s" repeatCount="indefinite"/><animate attributeName="y" values="15;10;15" dur="0.8s" begin="0.15s" repeatCount="indefinite"/></rect>
    <rect x="24" y="15" width="2.5" height="6" rx="1.2" fill="#00c853"><animate attributeName="height" values="4;12;4" dur="0.8s" begin="0s" repeatCount="indefinite"/><animate attributeName="y" values="16;12;16" dur="0.8s" begin="0s" repeatCount="indefinite"/></rect>
  </svg>`;

  const SVG_AI_SPEAKING = `<svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="18" cy="18" r="10" stroke="rgba(212,160,23,0.3)" stroke-width="1" fill="none"/>
    <rect x="8" y="15" width="2.5" height="6" rx="1.2" fill="#d4a017"><animate attributeName="height" values="3;10;3" dur="0.5s" begin="0s" repeatCount="indefinite"/><animate attributeName="y" values="16.5;13;16.5" dur="0.5s" begin="0s" repeatCount="indefinite"/></rect>
    <rect x="12" y="13" width="2.5" height="10" rx="1.2" fill="#d4a017"><animate attributeName="height" values="5;14;5" dur="0.5s" begin="0.1s" repeatCount="indefinite"/><animate attributeName="y" values="15.5;11;15.5" dur="0.5s" begin="0.1s" repeatCount="indefinite"/></rect>
    <rect x="16" y="11" width="2.5" height="14" rx="1.2" fill="#d4a017"><animate attributeName="height" values="7;18;7" dur="0.5s" begin="0.2s" repeatCount="indefinite"/><animate attributeName="y" values="14.5;9;14.5" dur="0.5s" begin="0.2s" repeatCount="indefinite"/></rect>
    <rect x="20" y="13" width="2.5" height="10" rx="1.2" fill="#d4a017"><animate attributeName="height" values="5;14;5" dur="0.5s" begin="0.1s" repeatCount="indefinite"/><animate attributeName="y" values="15.5;11;15.5" dur="0.5s" begin="0.1s" repeatCount="indefinite"/></rect>
    <rect x="24" y="15" width="2.5" height="6" rx="1.2" fill="#d4a017"><animate attributeName="height" values="3;10;3" dur="0.5s" begin="0s" repeatCount="indefinite"/><animate attributeName="y" values="16.5;13;16.5" dur="0.5s" begin="0s" repeatCount="indefinite"/></rect>
  </svg>`;

  const SVG_AI_PAUSED = `<svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="pausedGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#e0d0a0" stop-opacity="0.5"/>
        <stop offset="100%" stop-color="#5a4a14" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <circle cx="18" cy="18" r="13" fill="none" stroke="rgba(212,160,23,0.15)" stroke-width="1"/>
    <circle cx="18" cy="18" r="8" fill="url(#pausedGlow)"/>
    <circle cx="18" cy="18" r="3" fill="rgba(212,160,23,0.4)"/>
    <rect x="14" y="13" width="3" height="10" rx="1.5" fill="rgba(212,160,23,0.45)"/>
    <rect x="19" y="13" width="3" height="10" rx="1.5" fill="rgba(212,160,23,0.45)"/>
  </svg>`;

  const SVG_MIC = `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="6.5" y="1" width="5" height="9" rx="2.5" stroke="currentColor" stroke-width="1.4"/>
    <path d="M3 8.5C3 11.8 5.7 14.5 9 14.5C12.3 14.5 15 11.8 15 8.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
    <line x1="9" y1="14.5" x2="9" y2="17" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
    <line x1="6" y1="17" x2="12" y2="17" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
  </svg>`;

  const SVG_MIC_ACTIVE = `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="6.5" y="1" width="5" height="9" rx="2.5" fill="rgba(0,200,83,0.2)" stroke="#00c853" stroke-width="1.4"/>
    <path d="M3 8.5C3 11.8 5.7 14.5 9 14.5C12.3 14.5 15 11.8 15 8.5" stroke="#00c853" stroke-width="1.4" stroke-linecap="round"/>
    <line x1="9" y1="14.5" x2="9" y2="17" stroke="#00c853" stroke-width="1.4" stroke-linecap="round"/>
    <line x1="6" y1="17" x2="12" y2="17" stroke="#00c853" stroke-width="1.4" stroke-linecap="round"/>
  </svg>`;

  const SVG_SEND = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 2L7 9M14 2L9.5 14L7 9M14 2L2 6.5L7 9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;

  const SVG_HIDE = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M1 7C1 7 3 3 7 3C11 3 13 7 13 7C13 7 11 11 7 11C3 11 1 7 1 7Z" stroke="currentColor" stroke-width="1.3"/>
    <circle cx="7" cy="7" r="2" stroke="currentColor" stroke-width="1.3"/>
    <line x1="2" y1="2" x2="12" y2="12" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
  </svg>`;

  const SVG_SHOW = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M1 7C1 7 3 3 7 3C11 3 13 7 13 7C13 7 11 11 7 11C3 11 1 7 1 7Z" stroke="currentColor" stroke-width="1.3"/>
    <circle cx="7" cy="7" r="2" fill="currentColor"/>
  </svg>`;

  const SVG_POINTER = `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 4L8 22L12 18L15 26L17.5 25L14.5 17L20 17Z" fill="#d4a017" stroke="rgba(8,14,26,0.8)" stroke-width="1.5" stroke-linejoin="round"/>
    <circle cx="8" cy="4" r="2" fill="rgba(212,160,23,0.4)"/>
  </svg>`;

  // Volume icon
  const SVG_VOLUME = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2 5H4.5L7 2.5V11.5L4.5 9H2V5Z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>
    <path d="M9 4.5C9.8 5.3 10.3 6.1 10.3 7C10.3 7.9 9.8 8.7 9 9.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
    <path d="M11 2.5C12.5 3.8 13.3 5.3 13.3 7C13.3 8.7 12.5 10.2 11 11.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
  </svg>`;

  // Speed icon
  const SVG_SPEED = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="1.2"/>
    <path d="M7 4V7L9 9" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
    <path d="M4 1.5L5 3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
    <path d="M10 1.5L9 3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
  </svg>`;

  // ── Inject CSS ────────────────────────────────────────────────────────────────
  const style = document.createElement("style");
  style.textContent = `
    #${WIDGET_ID} * { box-sizing: border-box; font-family: 'Tajawal', 'Cairo', 'IBM Plex Arabic', 'Segoe UI', sans-serif; }
    #${WIDGET_ID} { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); z-index: 999999; display: flex; flex-direction: column; align-items: center; gap: 12px; }
    #${WIDGET_ID}.hidden-widget { display: none; }

    /* Collapsed tab */
    #mousa-show-tab {
      position: fixed; bottom: 0; left: 50%; transform: translateX(-50%);
      z-index: 999999; background: rgba(8,14,26,0.95);
      border: 1px solid rgba(212,160,23,0.3); border-bottom: none;
      border-radius: 12px 12px 0 0; padding: 6px 18px 4px;
      cursor: pointer; display: none; align-items: center; gap: 8px;
      color: rgba(212,160,23,0.8); font-size: 11px; font-family: 'Tajawal', sans-serif;
      transition: all 0.2s; backdrop-filter: blur(8px);
    }
    #mousa-show-tab:hover { background: rgba(13,27,42,0.98); color: #d4a017; }
    #mousa-show-tab.visible { display: flex; }
    #mousa-show-tab-dot { width: 6px; height: 6px; border-radius: 50%; background: #d4a017; animation: mousa-pulse 2s ease-in-out infinite; }

    /* Orb */
    #mousa-orb { width: 72px; height: 72px; border-radius: 50%; cursor: pointer; position: relative; transition: transform 0.2s; user-select: none; -webkit-tap-highlight-color: transparent; }
    #mousa-orb:active { transform: scale(0.93); }
    #mousa-orb-inner { width: 100%; height: 100%; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: all 0.4s; position: relative; overflow: visible; }
    #mousa-orb-svg { pointer-events: none; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; flex-shrink: 0; }

    /* Orb states */
    #mousa-orb-inner.idle {
      background: radial-gradient(circle at 35% 30%, #e8b820, #8b6914 70%);
      box-shadow: 0 4px 24px rgba(212,160,23,0.55), 0 0 0 2px rgba(212,160,23,0.2), 0 0 50px rgba(212,160,23,0.12);
    }
    #mousa-orb-inner.listening {
      background: radial-gradient(circle at 35% 30%, #1de97a, #006b2f 70%);
      box-shadow: 0 4px 28px rgba(0,200,83,0.6), 0 0 0 3px rgba(0,200,83,0.25), 0 0 60px rgba(0,200,83,0.15);
    }
    #mousa-orb-inner.thinking {
      background: radial-gradient(circle at 35% 30%, #e8b820, #c44a00 70%);
      box-shadow: 0 4px 28px rgba(212,160,23,0.65);
      animation: mousa-orb-think 2s ease-in-out infinite;
    }
    #mousa-orb-inner.speaking {
      background: radial-gradient(circle at 35% 30%, #f0c030, #6a1aff 70%);
      box-shadow: 0 4px 28px rgba(212,160,23,0.5), 0 0 0 3px rgba(106,26,255,0.25), 0 0 60px rgba(212,160,23,0.2);
      animation: mousa-orb-speak 0.5s ease-in-out infinite;
    }
    #mousa-orb-inner.paused {
      background: radial-gradient(circle at 35% 30%, #5a6a7a, #2a3a4a 70%);
      box-shadow: 0 4px 16px rgba(90,106,122,0.4), 0 0 0 2px rgba(212,160,23,0.1);
    }

    #mousa-orb-label {
      position: absolute; bottom: -26px; left: 50%; transform: translateX(-50%);
      white-space: nowrap; font-size: 10px; color: rgba(212,160,23,0.9);
      background: rgba(8,14,26,0.88); padding: 2px 10px; border-radius: 10px;
      backdrop-filter: blur(4px); border: 1px solid rgba(212,160,23,0.18);
      letter-spacing: 0.02em; pointer-events: none;
    }

    /* Ripple rings */
    .mousa-ring { position: absolute; border-radius: 50%; border: 1.5px solid; animation: mousa-ring-expand 2.4s ease-out infinite; pointer-events: none; }
    .mousa-ring:nth-child(1) { width: 88px; height: 88px; top: -8px; left: -8px; border-color: rgba(212,160,23,0.3); animation-delay: 0s; }
    .mousa-ring:nth-child(2) { width: 112px; height: 112px; top: -20px; left: -20px; border-color: rgba(212,160,23,0.15); animation-delay: 0.8s; }
    .mousa-ring:nth-child(3) { width: 136px; height: 136px; top: -32px; left: -32px; border-color: rgba(212,160,23,0.07); animation-delay: 1.6s; }
    #mousa-orb-inner.listening ~ .mousa-ring { border-color: rgba(0,200,83,0.3) !important; }

    /* Hide widget button */
    #mousa-hide-btn {
      position: absolute; top: -6px; right: -6px; width: 20px; height: 20px;
      border-radius: 50%; background: rgba(8,14,26,0.9); border: 1px solid rgba(212,160,23,0.2);
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      color: rgba(212,160,23,0.5); transition: all 0.2s; z-index: 2;
    }
    #mousa-hide-btn:hover { color: #d4a017; border-color: rgba(212,160,23,0.5); }

    /* Chat panel */
    #mousa-chat {
      width: min(400px, calc(100vw - 28px));
      background: linear-gradient(160deg, rgba(20,35,60,0.82) 0%, rgba(8,14,26,0.92) 60%, rgba(30,20,5,0.88) 100%);
      border: 1px solid rgba(212,160,23,0.28);
      border-radius: 24px;
      box-shadow: 0 24px 64px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.04) inset, 0 0 60px rgba(212,160,23,0.08), 0 0 120px rgba(212,160,23,0.04);
      overflow: hidden; display: none; flex-direction: column; max-height: 520px;
      backdrop-filter: blur(32px) saturate(1.4);
      -webkit-backdrop-filter: blur(32px) saturate(1.4);
    }
    #mousa-chat.open { display: flex; animation: mousa-slide-up 0.3s cubic-bezier(0.34,1.56,0.64,1); }

    /* Chat header */
    #mousa-chat-header {
      padding: 13px 16px 11px;
      border-bottom: 1px solid rgba(212,160,23,0.12);
      display: flex; align-items: center; justify-content: space-between;
      background: linear-gradient(135deg, rgba(212,160,23,0.08) 0%, rgba(212,160,23,0.02) 60%, transparent 100%);
      position: relative;
    }
    #mousa-chat-header::after {
      content: ''; position: absolute; bottom: 0; left: 10%; right: 10%; height: 1px;
      background: linear-gradient(90deg, transparent, rgba(212,160,23,0.4), transparent);
    }
    #mousa-chat-header-left { display: flex; align-items: center; gap: 10px; }
    #mousa-chat-avatar {
      width: 34px; height: 34px; border-radius: 50%;
      background: radial-gradient(circle at 35% 30%, #e8b820, #8b6914 70%);
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 2px 10px rgba(212,160,23,0.4); flex-shrink: 0;
    }
    #mousa-chat-title { color: #d4a017; font-size: 13.5px; font-weight: 700; letter-spacing: 0.02em; }
    #mousa-chat-subtitle { color: rgba(212,160,23,0.45); font-size: 10px; display: block; }
    #mousa-chat-status-dot {
      width: 7px; height: 7px; border-radius: 50%; background: #00c853;
      display: inline-block; margin-left: 5px;
      box-shadow: 0 0 6px rgba(0,200,83,0.6);
      animation: mousa-pulse 2s ease-in-out infinite;
    }
    #mousa-chat-status-dot.paused { background: rgba(212,160,23,0.4); box-shadow: none; animation: none; }
    #mousa-chat-close {
      background: none; border: none; color: rgba(255,255,255,0.3);
      font-size: 15px; cursor: pointer; padding: 2px 5px; line-height: 1;
      transition: color 0.2s; border-radius: 6px;
    }
    #mousa-chat-close:hover { color: rgba(255,255,255,0.65); background: rgba(255,255,255,0.05); }

    /* Messages */
    #mousa-chat-messages { flex: 1; overflow-y: auto; padding: 12px 14px; display: flex; flex-direction: column; gap: 9px; scroll-behavior: smooth; }
    #mousa-chat-messages::-webkit-scrollbar { width: 3px; }
    #mousa-chat-messages::-webkit-scrollbar-thumb { background: rgba(212,160,23,0.25); border-radius: 2px; }
    .mousa-msg { max-width: 90%; padding: 9px 13px; border-radius: 16px; font-size: 13px; line-height: 1.68; direction: rtl; word-break: break-word; animation: mousa-msg-in 0.22s ease; }
    .mousa-msg.user {
      background: linear-gradient(135deg, rgba(212,160,23,0.12), rgba(212,160,23,0.06));
      border: 1px solid rgba(212,160,23,0.25);
      box-shadow: 0 0 12px rgba(212,160,23,0.08), inset 0 1px 0 rgba(255,255,255,0.06);
      color: #f5e8c0; align-self: flex-start; border-radius: 16px 16px 4px 16px;
    }
    .mousa-msg.assistant {
      background: linear-gradient(135deg, rgba(20,40,70,0.9), rgba(10,20,40,0.95));
      border: 1px solid rgba(255,255,255,0.07);
      box-shadow: 0 0 16px rgba(100,150,255,0.05), inset 0 1px 0 rgba(255,255,255,0.04);
      color: #d0dff0; align-self: flex-end; border-radius: 16px 16px 16px 4px;
    }
    .mousa-msg.status { background: transparent; color: rgba(255,255,255,0.28); font-size: 10.5px; align-self: center; border: none; text-align: center; padding: 3px 8px; }
    .mousa-msg.action { background: rgba(212,160,23,0.05); border: 1px solid rgba(212,160,23,0.12); color: rgba(212,160,23,0.75); align-self: center; font-size: 11px; text-align: center; border-radius: 10px; }
    .mousa-msg.error { background: rgba(255,60,60,0.07); border: 1px solid rgba(255,60,60,0.2); color: rgba(255,150,150,0.85); align-self: center; font-size: 11px; text-align: center; border-radius: 10px; }

    /* Typing indicator */
    #mousa-typing { display: none; align-self: flex-end; padding: 10px 14px; background: rgba(15,30,50,0.85); border: 1px solid rgba(255,255,255,0.06); border-radius: 16px 16px 16px 4px; }
    #mousa-typing.show { display: flex; gap: 4px; align-items: center; }
    .mousa-dot { width: 6px; height: 6px; border-radius: 50%; background: rgba(212,160,23,0.6); }
    .mousa-dot:nth-child(1) { animation: mousa-dot-bounce 1.2s ease-in-out infinite; }
    .mousa-dot:nth-child(2) { animation: mousa-dot-bounce 1.2s ease-in-out 0.2s infinite; }
    .mousa-dot:nth-child(3) { animation: mousa-dot-bounce 1.2s ease-in-out 0.4s infinite; }

    /* Quick actions */
    #mousa-quick-actions { padding: 8px 12px 6px; display: flex; gap: 6px; flex-wrap: wrap; border-top: 1px solid rgba(212,160,23,0.05); }
    .mousa-quick-btn {
      padding: 5px 11px; border-radius: 20px; font-size: 11px; cursor: pointer;
      background: rgba(212,160,23,0.07); border: 1px solid rgba(212,160,23,0.18);
      color: rgba(212,160,23,0.75); transition: all 0.2s; white-space: nowrap;
      font-family: 'Tajawal', sans-serif;
    }
    .mousa-quick-btn:hover { background: rgba(212,160,23,0.14); color: #d4a017; transform: translateY(-1px); }

    /* Audio controls bar */
    #mousa-audio-controls {
      padding: 6px 12px 4px;
      border-top: 1px solid rgba(212,160,23,0.06);
      display: flex; align-items: center; gap: 10px;
      background: rgba(0,0,0,0.15);
    }
    .mousa-ctrl-label {
      color: rgba(212,160,23,0.45); font-size: 10px; display: flex; align-items: center; gap: 4px;
      white-space: nowrap; flex-shrink: 0;
    }
    .mousa-ctrl-label svg { opacity: 0.6; }
    .mousa-slider {
      flex: 1; -webkit-appearance: none; appearance: none;
      height: 3px; border-radius: 2px; outline: none; cursor: pointer;
      background: linear-gradient(to right, rgba(212,160,23,0.6) var(--val, 100%), rgba(255,255,255,0.1) var(--val, 100%));
    }
    .mousa-slider::-webkit-slider-thumb {
      -webkit-appearance: none; width: 12px; height: 12px; border-radius: 50%;
      background: #d4a017; cursor: pointer;
      box-shadow: 0 0 6px rgba(212,160,23,0.5);
    }
    .mousa-slider::-moz-range-thumb {
      width: 12px; height: 12px; border-radius: 50%;
      background: #d4a017; cursor: pointer; border: none;
    }
    .mousa-ctrl-val { color: rgba(212,160,23,0.55); font-size: 9px; min-width: 24px; text-align: center; }

    /* Input bar */
    #mousa-chat-input-bar {
      padding: 8px 10px 10px;
      border-top: 1px solid rgba(212,160,23,0.1);
      display: flex; gap: 7px; align-items: center;
      background: linear-gradient(0deg, rgba(212,160,23,0.03), transparent);
      position: relative;
    }
    #mousa-chat-input-bar::before {
      content: ''; position: absolute; top: 0; left: 10%; right: 10%; height: 1px;
      background: linear-gradient(90deg, transparent, rgba(212,160,23,0.3), transparent);
    }
    #mousa-chat-input {
      flex: 1; background: rgba(255,255,255,0.04);
      border: 1px solid rgba(212,160,23,0.15);
      border-radius: 20px; padding: 8px 13px; color: #f0e0b0; font-size: 13px;
      font-family: 'Tajawal', sans-serif; direction: rtl; outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    #mousa-chat-input:focus {
      border-color: rgba(212,160,23,0.4);
      box-shadow: 0 0 0 3px rgba(212,160,23,0.06);
    }
    #mousa-chat-input::placeholder { color: rgba(212,160,23,0.3); }
    #mousa-chat-send {
      width: 34px; height: 34px; border-radius: 50%;
      background: linear-gradient(135deg, #d4a017, #8b6914);
      border: none; cursor: pointer; display: flex; align-items: center; justify-content: center;
      color: #080e1a; flex-shrink: 0; transition: opacity 0.2s, transform 0.15s;
    }
    #mousa-chat-send:hover:not(:disabled) { transform: scale(1.1); }
    #mousa-chat-send:disabled { opacity: 0.2; cursor: default; }
    #mousa-chat-mic {
      width: 34px; height: 34px; border-radius: 50%;
      background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07);
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      color: rgba(255,255,255,0.35); flex-shrink: 0; transition: all 0.2s;
    }
    #mousa-chat-mic:hover { background: rgba(0,200,83,0.08); color: #00c853; border-color: rgba(0,200,83,0.25); }
    #mousa-chat-mic.active { background: rgba(0,200,83,0.12); color: #00c853; border-color: rgba(0,200,83,0.35); animation: mousa-pulse 1s ease-in-out infinite; }

    /* Tour elements */
    #mousa-hand { position: fixed; z-index: 999998; pointer-events: none; width: 32px; height: 32px; transition: left 0.75s cubic-bezier(0.34,1.56,0.64,1), top 0.75s cubic-bezier(0.34,1.56,0.64,1); filter: drop-shadow(0 4px 16px rgba(212,160,23,0.8)); display: none; }
    #mousa-hand.active { display: block; }
    #${WIDGET_ID}.tour-mode { position: fixed; transition: left 0.8s cubic-bezier(0.34,1.56,0.64,1), top 0.8s cubic-bezier(0.34,1.56,0.64,1), bottom 0.8s cubic-bezier(0.34,1.56,0.64,1); }
    #${WIDGET_ID}.tour-mode #mousa-orb { box-shadow: 0 0 40px rgba(212,160,23,0.5), 0 0 80px rgba(212,160,23,0.2); animation: mousa-orb-float 2s ease-in-out infinite; }
    @keyframes mousa-orb-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
    #mousa-highlight {
      position: fixed; z-index: 999997; border-radius: 14px; pointer-events: none;
      border: 2px solid rgba(212,160,23,0.85);
      box-shadow: 0 0 32px rgba(212,160,23,0.35), inset 0 0 32px rgba(212,160,23,0.05);
      transition: all 0.5s ease; display: none;
    }
    #mousa-highlight.active { display: block; }

    /* Action toast */
    #mousa-action-toast {
      position: fixed; bottom: 130px; left: 50%; transform: translateX(-50%);
      background: rgba(6,12,22,0.96); border: 1px solid rgba(212,160,23,0.28);
      border-radius: 14px; padding: 10px 18px; z-index: 999996;
      color: rgba(212,160,23,0.9); font-size: 12px; font-family: 'Tajawal', sans-serif;
      display: none; align-items: center; gap: 9px; white-space: nowrap;
      box-shadow: 0 10px 30px rgba(0,0,0,0.7); backdrop-filter: blur(12px);
    }
    #mousa-action-toast.show { display: flex; animation: mousa-slide-up 0.2s ease; }

    /* Barge-in indicator */
    #mousa-barge-indicator {
      position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
      background: rgba(0,200,83,0.15); border: 1px solid rgba(0,200,83,0.4);
      border-radius: 20px; padding: 6px 16px; z-index: 999996;
      color: #00c853; font-size: 11px; font-family: 'Tajawal', sans-serif;
      display: none; align-items: center; gap: 7px;
    }
    #mousa-barge-indicator.show { display: flex; animation: mousa-slide-up 0.2s ease; }

    /* Audio quality indicator */
    #mousa-audio-quality {
      position: absolute; top: 8px; left: 12px;
      display: flex; align-items: center; gap: 4px;
      font-size: 9px; color: rgba(212,160,23,0.4);
    }
    #mousa-audio-quality.elevenlabs { color: rgba(0,200,83,0.6); }
    #mousa-audio-quality.browser { color: rgba(255,180,0,0.5); }
    #mousa-audio-quality.failed { color: rgba(255,80,80,0.5); }

    /* Retry button */
    .mousa-retry-btn {
      margin-top: 6px; padding: 4px 12px; border-radius: 12px; font-size: 11px;
      background: rgba(212,160,23,0.1); border: 1px solid rgba(212,160,23,0.25);
      color: rgba(212,160,23,0.8); cursor: pointer; font-family: 'Tajawal', sans-serif;
      transition: all 0.2s;
    }
    .mousa-retry-btn:hover { background: rgba(212,160,23,0.2); color: #d4a017; }

    /* Animations */
    @keyframes mousa-pulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.12); opacity: 0.7; } }
    @keyframes mousa-orb-think { 0%,100% { filter: brightness(1); } 50% { filter: brightness(1.3) hue-rotate(20deg); } }
    @keyframes mousa-orb-speak { 0%,100% { transform: scale(1); } 50% { transform: scale(1.06); } }
    @keyframes mousa-ring-expand { 0% { opacity: 0.65; transform: scale(0.82); } 100% { opacity: 0; transform: scale(1.65); } }
    @keyframes mousa-slide-up { from { opacity: 0; transform: translateY(12px) translateX(-50%); } to { opacity: 1; transform: translateY(0) translateX(-50%); } }
    @keyframes mousa-msg-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes mousa-dot-bounce { 0%,80%,100% { transform: translateY(0); opacity: 0.4; } 40% { transform: translateY(-5px); opacity: 1; } }
  `;
  document.head.appendChild(style);

  // ── Build DOM ─────────────────────────────────────────────────────────────────
  const container = document.createElement("div");
  container.id = WIDGET_ID;
  if (isWidgetHidden) container.classList.add("hidden-widget");

  const volPct = Math.round(audioVolume * 100);
  const speedPct = Math.round(((audioSpeed - 0.7) / 0.5) * 100);

  container.innerHTML = `
    <div id="mousa-hand">${SVG_POINTER}</div>
    <div id="mousa-highlight"></div>
    <div id="mousa-action-toast"><span id="mousa-action-toast-icon">⚡</span><span id="mousa-action-toast-text"></span></div>
    <div id="mousa-barge-indicator"><span style="width:7px;height:7px;border-radius:50%;background:#00c853;display:inline-block;"></span>يستمع إليك...</div>

    <div id="mousa-chat">
      <div id="mousa-chat-header">
        <div id="mousa-chat-header-left">
          <div id="mousa-chat-avatar">${SVG_AI_FACE}</div>
          <div>
            <span id="mousa-chat-title">ثاني الذكي <span id="mousa-chat-status-dot"></span></span>
            <span id="mousa-chat-subtitle">مرشدك الذكي في mousa.ai</span>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <div id="mousa-audio-quality" title="جودة الصوت"></div>
          <button id="mousa-chat-close">✕</button>
        </div>
      </div>
      <div id="mousa-chat-messages">
        <div id="mousa-typing"><div class="mousa-dot"></div><div class="mousa-dot"></div><div class="mousa-dot"></div></div>
      </div>
      <div id="mousa-quick-actions">
        <button class="mousa-quick-btn" data-action="tour">🗺 جولة تعريفية</button>
        <button class="mousa-quick-btn" data-action="platforms">المنصات الست</button>
        <button class="mousa-quick-btn" data-action="credits">الكريدت</button>
        <button class="mousa-quick-btn" data-action="help">مساعدة</button>
        <button class="mousa-quick-btn mousa-voice-toggle" id="mousa-voice-toggle" title="تغيير الصوت">🎤 ثاني</button>
      </div>
      <div id="mousa-audio-controls">
        <span class="mousa-ctrl-label">${SVG_VOLUME} صوت</span>
        <input type="range" class="mousa-slider" id="mousa-vol-slider" min="0" max="100" value="${volPct}" style="--val:${volPct}%" />
        <span class="mousa-ctrl-val" id="mousa-vol-val">${volPct}%</span>
        <span class="mousa-ctrl-label" style="margin-right:4px;">${SVG_SPEED} سرعة</span>
        <input type="range" class="mousa-slider" id="mousa-speed-slider" min="0" max="100" value="${speedPct}" style="--val:${speedPct}%" />
        <span class="mousa-ctrl-val" id="mousa-speed-val">${audioSpeed.toFixed(1)}x</span>
      </div>
      <div id="mousa-chat-input-bar">
        <button id="mousa-chat-mic" title="تحدث">${SVG_MIC}</button>
        <input id="mousa-chat-input" type="text" placeholder="اكتب رسالتك..." dir="rtl" autocomplete="off" />
        <button id="mousa-chat-send" disabled>${SVG_SEND}</button>
      </div>
    </div>

    <div id="mousa-orb">
      <div class="mousa-ring"></div>
      <div class="mousa-ring"></div>
      <div class="mousa-ring"></div>
      <div id="mousa-orb-inner" class="${isPaused ? 'paused' : 'idle'}">
        <div id="mousa-orb-svg">${isPaused ? SVG_AI_PAUSED : SVG_AI_FACE}</div>
      </div>
      <div id="mousa-hide-btn" title="إخفاء ثاني">${SVG_HIDE}</div>
      <span id="mousa-orb-label">${isPaused ? 'موقوف مؤقتاً' : 'ثاني الذكي'}</span>
    </div>
  `;
  document.body.appendChild(container);

  // Show tab (when hidden)
  const showTab = document.createElement("div");
  showTab.id = "mousa-show-tab";
  showTab.innerHTML = `<div id="mousa-show-tab-dot"></div><span>ثاني الذكي</span>`;
  if (isWidgetHidden) showTab.classList.add("visible");
  document.body.appendChild(showTab);

  // ── DOM refs ──────────────────────────────────────────────────────────────────
  const orb = document.getElementById("mousa-orb");
  const orbInner = document.getElementById("mousa-orb-inner");
  const orbSvg = document.getElementById("mousa-orb-svg");
  const orbLabel = document.getElementById("mousa-orb-label");
  const hideBtn = document.getElementById("mousa-hide-btn");
  const chat = document.getElementById("mousa-chat");
  const chatMessages = document.getElementById("mousa-chat-messages");
  const chatClose = document.getElementById("mousa-chat-close");
  const chatInput = document.getElementById("mousa-chat-input");
  const chatSend = document.getElementById("mousa-chat-send");
  const chatMic = document.getElementById("mousa-chat-mic");
  const statusDot = document.getElementById("mousa-chat-status-dot");
  const typingIndicator = document.getElementById("mousa-typing");
  const handCursor = document.getElementById("mousa-hand");
  const highlight = document.getElementById("mousa-highlight");
  const actionToast = document.getElementById("mousa-action-toast");
  const actionToastText = document.getElementById("mousa-action-toast-text");
  const bargeIndicator = document.getElementById("mousa-barge-indicator");
  const audioQualityEl = document.getElementById("mousa-audio-quality");
  const volSlider = document.getElementById("mousa-vol-slider");
  const speedSlider = document.getElementById("mousa-speed-slider");
  const volVal = document.getElementById("mousa-vol-val");
  const speedVal = document.getElementById("mousa-speed-val");

  // ── Orb state machine ─────────────────────────────────────────────────────────
  const ORB_CONFIG = {
    idle:      { svg: SVG_AI_FACE,      label: "ثاني الذكي",    dot: true },
    listening: { svg: SVG_AI_LISTENING, label: "يستمع...",      dot: true },
    thinking:  { svg: SVG_AI_THINKING,  label: "يفكر...",       dot: true },
    speaking:  { svg: SVG_AI_SPEAKING,  label: "يتكلم...",      dot: true },
    paused:    { svg: SVG_AI_PAUSED,    label: "موقوف مؤقتاً", dot: false },
  };

  function setOrbState(state) {
    orbState = state;
    orbInner.className = state;
    const cfg = ORB_CONFIG[state] || ORB_CONFIG.idle;
    orbSvg.innerHTML = cfg.svg;
    orbLabel.textContent = cfg.label;
    if (statusDot) {
      statusDot.className = cfg.dot ? "" : "paused";
    }
  }

  // ── Audio quality indicator ───────────────────────────────────────────────────
  function setAudioQuality(type) {
    if (!audioQualityEl) return;
    audioQualityEl.className = `mousa-audio-quality ${type}`;
    const labels = {
      elevenlabs: "● ElevenLabs",
      browser: "● متصفح",
      failed: "● فشل الصوت",
      "": "",
    };
    audioQualityEl.textContent = labels[type] || "";
  }

  // ── Volume & Speed Controls ───────────────────────────────────────────────────
  function updateSliderBackground(slider) {
    slider.style.setProperty("--val", slider.value + "%");
  }

  volSlider.addEventListener("input", () => {
    audioVolume = volSlider.value / 100;
    volVal.textContent = volSlider.value + "%";
    updateSliderBackground(volSlider);
    if (currentAudio) currentAudio.volume = audioVolume;
    saveState();
  });

  speedSlider.addEventListener("input", () => {
    // Map 0-100 to 0.7-1.2
    audioSpeed = 0.7 + (speedSlider.value / 100) * 0.5;
    speedVal.textContent = audioSpeed.toFixed(1) + "x";
    updateSliderBackground(speedSlider);
    if (currentAudio) currentAudio.playbackRate = audioSpeed;
    saveState();
  });

  // ── Persist state ─────────────────────────────────────────────────────────────
  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        paused: isPaused,
        hidden: isWidgetHidden,
        voice: activeVoice,
        volume: audioVolume,
        speed: audioSpeed,
      }));
    } catch (_) {}
  }

  // ── Hide / Show widget ────────────────────────────────────────────────────────
  function hideWidget() {
    isWidgetHidden = true;
    container.classList.add("hidden-widget");
    showTab.classList.add("visible");
    stopContinuousListening();
    saveState();
  }

  function showWidget() {
    isWidgetHidden = false;
    container.classList.remove("hidden-widget");
    showTab.classList.remove("visible");
    saveState();
    if (!isPaused) {
      setTimeout(() => startContinuousListening(), 500);
    }
  }

  hideBtn.addEventListener("click", (e) => { e.stopPropagation(); hideWidget(); });
  showTab.addEventListener("click", showWidget);

  // ── Action Toast ──────────────────────────────────────────────────────────────
  let toastTimer = null;
  function showActionToast(icon, text) {
    actionToast.querySelector("#mousa-action-toast-icon").textContent = icon;
    actionToastText.textContent = text;
    actionToast.classList.add("show");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => actionToast.classList.remove("show"), 3000);
  }

  // ── Chat UI ───────────────────────────────────────────────────────────────────
  function openChat(byUser = false) {
    if (byUser) userClosedChat = false;
    isOpen = true;
    chat.classList.add("open");
  }

  function closeChat(byUser = false) {
    isOpen = false;
    chat.classList.remove("open");
    if (byUser) userClosedChat = true;
  }

  function addMessage(role, text) {
    typingIndicator.classList.remove("show");
    const div = document.createElement("div");
    div.className = `mousa-msg ${role}`;
    div.textContent = text;
    chatMessages.insertBefore(div, typingIndicator);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    if (role === "user" || role === "assistant") {
      messages.push({ role, content: text });
    }
    return div;
  }

  function addRetryButton(lastText) {
    const div = document.createElement("div");
    div.className = "mousa-msg error";
    div.innerHTML = `تعذّر تشغيل الصوت <button class="mousa-retry-btn" onclick="this.parentNode.remove(); window.ThaniWidget && window.ThaniWidget.speak('${lastText.replace(/'/g, "\\'")}')">🔄 إعادة المحاولة</button>`;
    chatMessages.insertBefore(div, typingIndicator);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function showTyping() {
    typingIndicator.classList.add("show");
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function hideTyping() {
    typingIndicator.classList.remove("show");
  }

  function addActionMsg(text) {
    const div = document.createElement("div");
    div.className = "mousa-msg action";
    div.textContent = "⚡ " + text;
    chatMessages.insertBefore(div, typingIndicator);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  // ── Audio Unlock ──────────────────────────────────────────────────────────────
  function setupAudioUnlock() {
    const unlock = async () => {
      if (!audioUnlocked) {
        audioUnlocked = true;
        if (pendingAudioSrc && !isSpeaking) {
          const src = pendingAudioSrc;
          const mime = pendingAudioMime || "audio/mpeg";
          pendingAudioSrc = null;
          pendingAudioMime = null;
          const base64 = src.split(",")[1];
          if (base64) {
            await speakFromBase64(base64, mime);
            return;
          }
        }
        if (pendingWelcome && !isSpeaking) {
          const text = pendingWelcome;
          pendingWelcome = null;
          speak(text);
        }
      }
    };
    document.addEventListener("click", unlock, { once: true, passive: true });
    document.addEventListener("touchstart", unlock, { once: true, passive: true });
  }

  // ── Welcome on page load ──────────────────────────────────────────────────────
  async function autoWelcome() {
    if (isWidgetHidden) return;
    const ctx = window.MOUSA_CONTEXT || {};
    const path = window.location.pathname;
    const platformMap = { "/fada": "فضاء", "/raqaba": "رقابة", "/harara": "حرارة", "/maskan": "مسكن", "/code": "كود" };
    const currentPlatform = platformMap[path];
    const isReturning = !!localStorage.getItem("thani_visited");
    localStorage.setItem("thani_visited", "1");

    let welcome;
    if (currentPlatform) {
      const platformDesc = {
        "فضاء": "مستشارك الذكي للديكور الداخلي",
        "رقابة": "مشرفك الميداني الذكي لمواقع البناء",
        "حرارة": "محللك الذكي للكفاءة الطاقوية",
        "مسكن": "محللك الذكي للاحتياجات السكنية",
        "كود": "مرجعك الفوري لكودات البناء والسلامة",
      };
      welcome = ctx.userName
        ? `أهلاً ${ctx.userName}! أنا ثاني، مرشدك الذكي في منصة ${currentPlatform} — ${platformDesc[currentPlatform]}. كيف يمكنني مساعدتك اليوم؟`
        : `أهلاً بك في منصة ${currentPlatform}! أنا ثاني، مرشدك الذكي. ${platformDesc[currentPlatform]}. تفضل، كيف أخدمك؟`;
    } else if (isReturning && ctx.userName) {
      welcome = `مرحباً مجدداً ${ctx.userName}! أنا ثاني، مرشدك الذكي في mousa.ai. رصيدك الحالي ${ctx.credits || 0} كريدت. هل تريد الاستمرار من حيث توقفت؟`;
    } else {
      welcome = ctx.userName
        ? `أهلاً ${ctx.userName}! أنا ثاني الذكي، مرشدك في mousa.ai — المنظومة الرقمية الذكية للبناء والعمران. نقدم ست منصات متخصصة: فضاء للديكور، رقابة للتفتيش، حرارة للطاقة، مسكن للسكن، كود للمراجع الهندسية، وخيال لتوليد المرئيات. كيف يمكنني مساعدتك؟`
        : `أهلاً بك في mousa.ai! أنا ثاني الذكي — مرشدك الشخصي في المنظومة الرقمية الذكية للبناء والعمران. نقدم ست منصات ذكية متخصصة تخدم المهندسين والمصممين وأصحاب المشاريع. سجّل الآن واحصل على 200 كريدت مجاناً. هل تريد جولة تعريفية؟`;
    }

    // Preload welcome audio in background
    pendingWelcome = welcome;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/tts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: welcome, voice: activeVoice, speed: audioSpeed }),
          signal: AbortSignal.timeout(15000),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.audio) {
            preloadedWelcomeAudio = {
              text: welcome,
              src: `data:${data.mimeType};base64,${data.audio}`,
              mimeType: data.mimeType,
            };
            console.info("[ثاني] Welcome audio preloaded ✅");
          }
        }
      } catch (_) {}
    })();

    if (!isPaused && !isWidgetHidden) {
      await delay(300);
      startContinuousListening();
    }
  }

  // ── TTS: Play base64 audio ────────────────────────────────────────────────────
  async function speakFromBase64(base64Audio, mimeType) {
    if (!base64Audio) return;
    if (isSpeaking) {
      if (currentAudio) { currentAudio.pause(); currentAudio = null; }
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      isSpeaking = false;
      await delay(80);
    }
    isSpeaking = true;
    bargeInDetected = false;
    setOrbState("speaking");
    stopContinuousListening();

    try {
      const audioSrc = `data:${mimeType};base64,${base64Audio}`;
      const audio = new Audio(audioSrc);
      audio.volume = audioVolume;
      audio.playbackRate = audioSpeed;
      currentAudio = audio;
      startBargeInDetection();

      let playedSuccessfully = false;
      await new Promise((resolve) => {
        audio.onended = () => { playedSuccessfully = true; resolve(); };
        audio.onerror = (e) => {
          console.warn("[ثاني TTS] Audio error:", e);
          resolve();
        };
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => { audioUnlocked = true; setAudioQuality("elevenlabs"); consecutiveErrors = 0; })
            .catch((err) => {
              console.warn("[ثاني TTS] Autoplay blocked:", err.message);
              pendingAudioSrc = audioSrc;
              pendingAudioMime = mimeType;
              resolve();
            });
        }
        setTimeout(resolve, 90000);
      });
    } catch (e) {
      console.warn("[ثاني TTS] speakFromBase64 error:", e.message);
    } finally {
      stopBargeInDetection();
      currentAudio = null;
      isSpeaking = false;
      if (!bargeInDetected && !isPaused && !isWidgetHidden) {
        setOrbState("idle");
        await delay(400);
        startContinuousListening();
      } else if (bargeInDetected) {
        bargeInDetected = false;
      } else {
        setOrbState(isPaused ? "paused" : "idle");
      }
    }
  }

  // ── Browser Web Speech API fallback ──────────────────────────────────────────
  function speakBrowser(text) {
    return new Promise((resolve) => {
      if (!window.speechSynthesis) { resolve(); return; }
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = "ar-SA";
      utter.rate = Math.min(1.5, Math.max(0.5, audioSpeed));
      utter.pitch = 1.0;
      utter.volume = audioVolume;
      setAudioQuality("browser");
      let started = false;
      const trySpeak = () => {
        if (started) return;
        started = true;
        const voices = window.speechSynthesis.getVoices();
        const arVoice = voices.find(v => v.lang && v.lang.startsWith("ar"));
        if (arVoice) utter.voice = arVoice;
        utter.onend = resolve;
        utter.onerror = resolve;
        window.speechSynthesis.speak(utter);
        setTimeout(resolve, 30000);
      };
      if (window.speechSynthesis.getVoices().length > 0) {
        trySpeak();
      } else {
        window.speechSynthesis.onvoiceschanged = () => { window.speechSynthesis.onvoiceschanged = null; trySpeak(); };
        setTimeout(() => { window.speechSynthesis.onvoiceschanged = null; trySpeak(); }, 500);
      }
    });
  }

  // ── Main speak function ───────────────────────────────────────────────────────
  async function speak(text) {
    if (!text?.trim()) return;
    if (isSpeaking) {
      if (currentAudio) { currentAudio.pause(); currentAudio = null; }
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      isSpeaking = false;
      await delay(80);
    }
    if (pendingWelcome === text) pendingWelcome = null;
    isSpeaking = true;
    bargeInDetected = false;
    setOrbState("speaking");
    stopContinuousListening();

    try {
      if (currentAudio) { currentAudio.pause(); currentAudio = null; }

      let usedServerTTS = false;
      try {
        let audioSrc = null;
        let mimeType = "audio/mpeg";

        // Use preloaded audio if available
        if (preloadedWelcomeAudio && preloadedWelcomeAudio.text === text) {
          audioSrc = preloadedWelcomeAudio.src;
          mimeType = preloadedWelcomeAudio.mimeType;
          preloadedWelcomeAudio = null;
          console.info("[ثاني TTS] Using preloaded welcome audio ⚡");
        } else {
          const controller = new AbortController();
          const ttsTimeout = setTimeout(() => controller.abort(), 20000); // 20s timeout
          const res = await fetch(`${API_BASE}/tts`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text, voice: activeVoice, speed: audioSpeed }),
            signal: controller.signal,
          });
          clearTimeout(ttsTimeout);
          if (res.ok) {
            const data = await res.json();
            if (data.audio) {
              audioSrc = `data:${data.mimeType};base64,${data.audio}`;
              mimeType = data.mimeType;
            }
          }
        }

        if (audioSrc) {
          const audio = new Audio(audioSrc);
          audio.volume = audioVolume;
          audio.playbackRate = audioSpeed;
          currentAudio = audio;
          startBargeInDetection();

          let playedSuccessfully = false;
          await new Promise((resolve) => {
            audio.onended = () => { playedSuccessfully = true; resolve(); };
            audio.onerror = resolve;
            const playPromise = audio.play();
            if (playPromise !== undefined) {
              playPromise
                .then(() => { audioUnlocked = true; setAudioQuality("elevenlabs"); consecutiveErrors = 0; })
                .catch(async (err) => {
                  console.warn("[ثاني TTS] Autoplay blocked:", err.message);
                  pendingAudioSrc = audioSrc;
                  pendingAudioMime = mimeType;
                  resolve();
                });
            }
            setTimeout(resolve, 90000);
          });

          if (playedSuccessfully) usedServerTTS = true;
        }
      } catch (e) {
        consecutiveErrors++;
        console.info("[ثاني TTS] Server TTS unavailable, using browser Web Speech API");
        if (consecutiveErrors >= 3 && isOpen) {
          setAudioQuality("failed");
        }
      }

      // Fallback: browser TTS
      if (!usedServerTTS && !bargeInDetected) {
        startBargeInDetection();
        await speakBrowser(text);
      }
    } catch (e) {
      console.warn("[ثاني TTS] Error:", e.message);
    } finally {
      stopBargeInDetection();
      currentAudio = null;
      isSpeaking = false;
      if (!bargeInDetected && !isPaused && !isWidgetHidden) {
        setOrbState("idle");
        await delay(400);
        startContinuousListening();
      } else if (bargeInDetected) {
        bargeInDetected = false;
      } else {
        setOrbState(isPaused ? "paused" : "idle");
      }
    }
  }

  // ── Barge-In Detection ────────────────────────────────────────────────────────
  // Threshold 25 (was 18) — reduces false positives from background noise
  const BARGE_IN_THRESHOLD = 25;

  function startBargeInDetection() {
    if (!navigator.mediaDevices?.getUserMedia) return;
    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      .then((stream) => {
        if (!isSpeaking) { stream.getTracks().forEach(t => t.stop()); return; }
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);

        bargeInInterval = setInterval(() => {
          if (!isSpeaking) {
            clearInterval(bargeInInterval);
            stream.getTracks().forEach(t => t.stop());
            ctx.close();
            return;
          }
          analyser.getByteFrequencyData(data);
          const avg = data.reduce((a, b) => a + b, 0) / data.length;
          if (avg > BARGE_IN_THRESHOLD) {
            bargeInDetected = true;
            clearInterval(bargeInInterval);
            stream.getTracks().forEach(t => t.stop());
            ctx.close();
            if (currentAudio) { currentAudio.pause(); currentAudio = null; }
            if (window.speechSynthesis) window.speechSynthesis.cancel();
            isSpeaking = false;
            bargeIndicator.classList.add("show");
            setTimeout(() => bargeIndicator.classList.remove("show"), 2000);
            setOrbState("listening");
            startContinuousListening();
          }
        }, 80);
      })
      .catch(() => {});
  }

  function stopBargeInDetection() {
    if (bargeInInterval) { clearInterval(bargeInInterval); bargeInInterval = null; }
  }

  // ── Continuous Listening (STT) ────────────────────────────────────────────────
  function startContinuousListening() {
    if (isPaused || isWidgetHidden || isProcessing || isSpeaking) return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    if (continuousRecognition) {
      try { continuousRecognition.abort(); } catch (_) {}
      continuousRecognition = null;
    }

    const recog = new SpeechRecognition();
    recog.lang = "ar-SA";
    recog.continuous = true;
    recog.interimResults = true;
    recog.maxAlternatives = 3; // Get multiple alternatives for better accuracy
    continuousRecognition = recog;

    setOrbState("listening");

    let speechProcessed = false;
    let interimTranscript = "";

    recog.onresult = (event) => {
      if (isPaused || isSpeaking) return;

      let finalTranscript = "";
      interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          // Pick best alternative (highest confidence)
          let bestText = result[0].transcript;
          let bestConf = result[0].confidence || 0;
          for (let j = 1; j < result.length; j++) {
            if ((result[j].confidence || 0) > bestConf) {
              bestConf = result[j].confidence;
              bestText = result[j].transcript;
            }
          }
          finalTranscript += bestText;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      if (finalTranscript.trim()) {
        if (silenceTimer) { clearTimeout(silenceTimer); silenceTimer = null; }
        if (speechProcessed) return;
        speechProcessed = true;
        try { recog.stop(); } catch (_) {}
        continuousRecognition = null;
        processSpeech(finalTranscript.trim());
      } else if (interimTranscript) {
        // Reset silence timer on interim results
        if (silenceTimer) clearTimeout(silenceTimer);
        silenceTimer = setTimeout(() => {
          if (interimTranscript && !speechProcessed) {
            speechProcessed = true;
            try { recog.stop(); } catch (_) {}
            continuousRecognition = null;
            processSpeech(interimTranscript.trim());
          }
        }, 2500); // 2.5s silence timeout (was 2s)
      }
    };

    recog.onerror = (e) => {
      if (e.error === "no-speech") {
        if (!isPaused && !isSpeaking && !isProcessing && !isWidgetHidden) {
          continuousRestartTimer = setTimeout(() => startContinuousListening(), 300);
        }
      } else if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        if (!isOpen && !userClosedChat) openChat();
        setOrbState("idle");
        if (isOpen) addMessage("status", "🎤 الميكروفون غير متاح — استخدم الكتابة للتواصل");
      } else if (e.error === "network") {
        // Network error — retry after delay
        if (!isPaused && !isSpeaking && !isProcessing && !isWidgetHidden) {
          continuousRestartTimer = setTimeout(() => startContinuousListening(), 2000);
        }
      } else {
        if (!isPaused && !isSpeaking && !isProcessing && !isWidgetHidden) {
          continuousRestartTimer = setTimeout(() => startContinuousListening(), 1000);
        }
      }
    };

    recog.onend = () => {
      if (!isPaused && !isSpeaking && !isProcessing && !isWidgetHidden && continuousRecognition === recog) {
        continuousRestartTimer = setTimeout(() => startContinuousListening(), 400);
      }
    };

    try { recog.start(); } catch (e) {
      setOrbState("idle");
    }
  }

  function stopContinuousListening() {
    if (continuousRestartTimer) { clearTimeout(continuousRestartTimer); continuousRestartTimer = null; }
    if (silenceTimer) { clearTimeout(silenceTimer); silenceTimer = null; }
    if (continuousRecognition) {
      try { continuousRecognition.abort(); } catch (_) {}
      continuousRecognition = null;
    }
  }

  async function processSpeech(transcript) {
    if (!transcript) return;
    if (isProcessing) return;
    if (!isOpen && !isTourActive && !userClosedChat) openChat();
    addMessage("user", transcript);
    await sendToAI(transcript);
  }

  // ── AI Chat ───────────────────────────────────────────────────────────────────
  async function sendToAI(message) {
    isProcessing = true;
    setOrbState("thinking");
    showTyping();

    try {
      const ctx = window.MOUSA_CONTEXT || {};
      const path = window.location.pathname;
      const contextParts = [
        `الصفحة الحالية: ${path}`,
        `عنوان الصفحة: ${document.title}`,
      ];
      if (ctx.userName) contextParts.push(`اسم المستخدم: ${ctx.userName}`);
      if (ctx.credits !== undefined) contextParts.push(`الكريدت المتبقي: ${ctx.credits}`);
      if (ctx.plan) contextParts.push(`خطة الاشتراك: ${ctx.plan}`);
      if (ctx.currentPlatform) contextParts.push(`المنصة الحالية: ${ctx.currentPlatform}`);
      if (ctx.isAuthenticated !== undefined) contextParts.push(`مسجل الدخول: ${ctx.isAuthenticated ? "نعم" : "لا"}`);

      const fieldsOnPage = Array.from(document.querySelectorAll("[data-mousa-field]"))
        .map(el => el.getAttribute("data-mousa-field")).join(", ");
      if (fieldsOnPage) contextParts.push(`الحقول المتاحة: ${fieldsOnPage}`);

      const actionsOnPage = Array.from(document.querySelectorAll("[data-mousa-action]"))
        .map(el => el.getAttribute("data-mousa-action")).join(", ");
      if (actionsOnPage) contextParts.push(`الأزرار المتاحة: ${actionsOnPage}`);

      const res = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          context: contextParts.join("، "),
          history: messages.slice(-12),
          voice: activeVoice,
          speed: audioSpeed,
        }),
      });

      if (!res.ok) throw new Error("Chat API failed");
      const data = await res.json();

      hideTyping();
      if (isOpen) addMessage("assistant", data.reply);

      // Execute UI commands
      if (data.uiCommand) {
        if (Array.isArray(data.uiCommands)) {
          for (const cmd of data.uiCommands) await executeUICommand(cmd);
        } else {
          await executeUICommand(data.uiCommand);
        }
      }

      // Play audio from response
      if (data.audio && data.ttsAvailable) {
        setAudioQuality("elevenlabs");
        await speakFromBase64(data.audio, data.audioMime || "audio/mpeg");
      } else {
        setAudioQuality("browser");
        await speakBrowser(data.reply);
      }
    } catch (e) {
      hideTyping();
      console.warn("[thani-widget] Chat error:", e);
      if (isOpen) addMessage("assistant", "عذراً، حدث خطأ مؤقت. يرجى المحاولة مجدداً.");
      setOrbState(isPaused ? "paused" : "idle");
      if (!isPaused && !isWidgetHidden) {
        await delay(500);
        startContinuousListening();
      }
    } finally {
      isProcessing = false;
    }
  }

  // ── UI Commands ───────────────────────────────────────────────────────────────
  async function executeUICommand(cmd) {
    if (!cmd?.ui_command) return;
    switch (cmd.ui_command) {
      case "SHOW_CHAT": openChat(); break;
      case "HIDE_CHAT": closeChat(); break;
      case "START_TOUR": startTour(); break;

      case "NAVIGATE":
        if (cmd.target) {
          showActionToast("🚀", `جارٍ الانتقال إلى ${cmd.target}...`);
          if (isOpen) addActionMsg(`جارٍ الانتقال إلى ${cmd.target}`);
          await delay(1500);
          window.location.href = cmd.target;
        }
        break;

      case "CLICK_SMART": {
        const target = cmd.target || "";
        let found = null;
        try { found = document.querySelector(target); } catch (_) {}
        if (!found) found = document.querySelector(`[data-mousa-action="${target}"]`);
        if (!found) {
          const allBtns = document.querySelectorAll('button, a, [role="button"]');
          for (const b of allBtns) {
            if (b.textContent.trim().includes(target) || b.getAttribute("aria-label")?.includes(target)) {
              found = b; break;
            }
          }
        }
        if (found) {
          found.scrollIntoView({ behavior: "smooth", block: "center" });
          highlightElement(found);
          showActionToast("👆", `جارٍ الضغط على "${found.textContent.trim().slice(0, 20)}"...`);
          if (isOpen) addActionMsg(`ضغطت على: ${found.textContent.trim().slice(0, 30)}`);
          await delay(900);
          found.click();
        }
        break;
      }

      case "FILL_FIELD": {
        const field = findField(cmd.selector || cmd.target);
        if (field) {
          field.scrollIntoView({ behavior: "smooth", block: "center" });
          highlightElement(field);
          showActionToast("✏️", "جارٍ ملء الحقل...");
          await delay(600);
          typeIntoField(field, cmd.value || "");
        }
        break;
      }

      case "FILL_FORM": {
        if (Array.isArray(cmd.fields) && cmd.fields.length > 0) {
          showActionToast("📝", "جارٍ ملء النموذج تلقائياً...");
          if (isOpen) addActionMsg(`جارٍ ملء ${cmd.fields.length} حقول`);
          for (let i = 0; i < cmd.fields.length; i++) {
            const f = cmd.fields[i];
            await delay(i === 0 ? 400 : 700);
            const field = findField(f.selector || f.name || f.field);
            if (field) {
              field.scrollIntoView({ behavior: "smooth", block: "center" });
              highlightElement(field);
              typeIntoField(field, f.value || "");
            }
          }
        }
        break;
      }

      case "FILL_CHAT_INPUT": {
        const chatInputEl = document.querySelector('[data-mousa-field="chat_input"]') ||
          document.querySelector('textarea[placeholder*="اسأل"]') ||
          document.querySelector('textarea[placeholder*="اكتب"]');
        if (chatInputEl) {
          chatInputEl.scrollIntoView({ behavior: "smooth", block: "center" });
          highlightElement(chatInputEl);
          showActionToast("✏️", "جارٍ كتابة رسالتك...");
          await delay(600);
          typeIntoField(chatInputEl, cmd.value || "");
          if (cmd.submit) {
            await delay(800);
            const sendButton = chatInputEl.closest("div")?.querySelector("button") ||
              document.querySelector('[data-mousa-action="send_message"]');
            if (sendButton) { highlightElement(sendButton); await delay(400); sendButton.click(); }
          }
        }
        break;
      }

      case "SCROLL":
        if (cmd.target) {
          let el = null;
          try { el = document.querySelector(cmd.target); } catch (_) {}
          if (!el) el = document.querySelector(`[data-mousa="${cmd.target}"]`);
          if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        break;

      case "OPEN_PLATFORM": {
        const platformPaths = {
          "فضاء": "/fada", "fada": "/fada",
          "رقابة": "/raqaba", "raqaba": "/raqaba",
          "حرارة": "/harara", "harara": "/harara",
          "مسكن": "/maskan", "maskan": "/maskan",
          "كود": "/code", "code": "/code",
        };
        const path2 = platformPaths[cmd.target] || platformPaths[cmd.target?.toLowerCase()] || cmd.target;
        if (path2) {
          showActionToast("🚀", `فتح منصة ${cmd.target}...`);
          if (cmd.value) sessionStorage.setItem("thani_prefill_message", cmd.value);
          await delay(1500);
          window.location.href = path2;
        }
        break;
      }

      case "MOVE_ORB": {
        const moveTarget = cmd.target;
        let targetEl = null;
        if (moveTarget) {
          try { targetEl = document.querySelector(moveTarget); } catch (_) {}
          if (!targetEl) targetEl = document.querySelector(`[data-mousa="${moveTarget}"]`);
          if (!targetEl) {
            const allEls = document.querySelectorAll("h1, h2, h3, section, [data-platform], .platform-card");
            for (const el of allEls) {
              if (el.textContent.trim().includes(moveTarget)) { targetEl = el; break; }
            }
          }
        }
        if (targetEl && smartPositionEnabled) {
          targetEl.scrollIntoView({ behavior: "smooth", block: "center" });
          await delay(400);
          const rect = targetEl.getBoundingClientRect();
          const orbSize = 72;
          const margin = 16;
          let orbLeft = rect.right + margin;
          let orbTop = rect.top + window.scrollY + (rect.height / 2) - (orbSize / 2);
          if (orbLeft + orbSize > window.innerWidth - margin) {
            orbLeft = rect.left - orbSize - margin;
          }
          if (orbLeft < margin) {
            orbLeft = rect.left + (rect.width / 2) - (orbSize / 2);
            orbTop = rect.top + window.scrollY - orbSize - margin;
          }
          orbLeft = Math.max(margin, Math.min(window.innerWidth - orbSize - margin, orbLeft));
          container.style.transition = "left 0.6s cubic-bezier(0.34,1.56,0.64,1), top 0.6s cubic-bezier(0.34,1.56,0.64,1), bottom 0.3s ease";
          container.style.left = orbLeft + "px";
          container.style.top = orbTop + "px";
          container.style.bottom = "auto";
          container.style.transform = "none";
          highlight.style.left = `${rect.left + window.scrollX - 4}px`;
          highlight.style.top = `${rect.top + window.scrollY - 4}px`;
          highlight.style.width = `${rect.width + 8}px`;
          highlight.style.height = `${rect.height + 8}px`;
          highlight.classList.add("active");
          setTimeout(() => highlight.classList.remove("active"), 3000);
        } else if (cmd.position) {
          const pos = cmd.position;
          const orbSize = 72;
          const margin = 24;
          container.style.transition = "left 0.6s cubic-bezier(0.34,1.56,0.64,1), top 0.6s cubic-bezier(0.34,1.56,0.64,1), bottom 0.3s ease";
          if (pos === "top-right") { container.style.left = (window.innerWidth - orbSize - margin) + "px"; container.style.top = margin + "px"; container.style.bottom = "auto"; container.style.transform = "none"; }
          else if (pos === "top-left") { container.style.left = margin + "px"; container.style.top = margin + "px"; container.style.bottom = "auto"; container.style.transform = "none"; }
          else if (pos === "bottom-right") { container.style.left = (window.innerWidth - orbSize - margin) + "px"; container.style.bottom = margin + "px"; container.style.top = "auto"; container.style.transform = "none"; }
          else if (pos === "bottom-left") { container.style.left = margin + "px"; container.style.bottom = margin + "px"; container.style.top = "auto"; container.style.transform = "none"; }
          else { container.style.left = "50%"; container.style.bottom = "24px"; container.style.top = ""; container.style.transform = "translateX(-50%)"; }
        }
        break;
      }

      case "PLAY_VIDEO": {
        const videoSel = cmd.target || "video";
        let videoEl = null;
        try { videoEl = document.querySelector(videoSel); } catch (_) {}
        if (!videoEl) videoEl = document.querySelector("video");
        if (!videoEl) videoEl = document.querySelector('iframe[src*="youtube"], iframe[src*="vimeo"]');
        if (videoEl) {
          videoEl.scrollIntoView({ behavior: "smooth", block: "center" });
          highlightElement(videoEl);
          showActionToast("▶️", "تشغيل الفيديو...");
          await delay(600);
          if (videoEl.tagName === "VIDEO") {
            videoEl.play().catch(() => {});
          } else if (videoEl.tagName === "IFRAME") {
            const src = videoEl.src;
            if (!src.includes("autoplay=1")) {
              videoEl.src = src + (src.includes("?") ? "&" : "?") + "autoplay=1";
            }
          }
        }
        break;
      }

      case "SKIP_VIDEO": {
        const skipEl = document.querySelector("video");
        if (skipEl) {
          skipEl.pause();
          skipEl.currentTime = skipEl.duration || 0;
          showActionToast("⏭️", "تم تخطي الفيديو");
        }
        break;
      }

      case "SET_VOICE": {
        const voiceMap = { "ثاني": "thani", "thani": "thani", "اليازية": "noura", "noura": "noura", "موسى": "thani", "mousa": "thani", "أسماء": "noura", "asmaa": "noura" };
        const newVoice = voiceMap[cmd.target?.toLowerCase()] || voiceMap[cmd.target] || "thani";
        activeVoice = newVoice;
        try {
          const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
          saved.voice = newVoice;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
        } catch (_) {}
        updateVoiceToggleBtn();
        const voiceNames = { thani: "ثاني (ذكوري)", noura: "اليازية (أنثوي)" };
        showActionToast("🎤", `تم تغيير الصوت إلى ${voiceNames[newVoice]}`);
        if (isOpen) addActionMsg(`الصوت الحالي: ${voiceNames[newVoice]}`);
        await speak(newVoice === "noura" ? "مرحباً، أنا اليازية، مساعدتك في mousa.ai" : "مرحباً، أنا ثاني، مرشدك الذكي في mousa.ai");
        break;
      }
    }
  }

  // ── DOM Helpers ───────────────────────────────────────────────────────────────
  function findField(selector) {
    if (!selector) return null;
    const byMousa = document.querySelector(`[data-mousa-field="${selector}"]`);
    if (byMousa) return byMousa;
    try { const el = document.querySelector(selector); if (el) return el; } catch (_) {}
    const byName = document.querySelector(`[name="${selector}"]`);
    if (byName) return byName;
    const byId = document.getElementById(selector);
    if (byId) return byId;
    const allInputs = document.querySelectorAll("input, textarea, select");
    for (const inp of allInputs) {
      if (inp.placeholder?.includes(selector) || inp.getAttribute("aria-label")?.includes(selector)) return inp;
    }
    return null;
  }

  function typeIntoField(field, value) {
    field.focus();
    const nativeInputSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
    const nativeTextareaSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
    const setter = field.tagName === "TEXTAREA" ? nativeTextareaSetter : nativeInputSetter;
    if (setter) setter.call(field, value);
    else field.value = value;
    field.dispatchEvent(new Event("input", { bubbles: true }));
    field.dispatchEvent(new Event("change", { bubbles: true }));
    field.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true }));
    field.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true }));
    if (field.tagName === "SELECT") {
      for (const opt of field.options) {
        if (opt.text.includes(value) || opt.value === value) {
          field.value = opt.value;
          field.dispatchEvent(new Event("change", { bubbles: true }));
          break;
        }
      }
    }
    if (field.tagName === "TEXTAREA") {
      field.style.height = "auto";
      field.style.height = Math.min(field.scrollHeight, 120) + "px";
    }
  }

  function highlightElement(el) {
    const rect = el.getBoundingClientRect();
    highlight.style.left = (rect.left + window.scrollX - 4) + "px";
    highlight.style.top = (rect.top + window.scrollY - 4) + "px";
    highlight.style.width = (rect.width + 8) + "px";
    highlight.style.height = (rect.height + 8) + "px";
    highlight.classList.add("active");
    setTimeout(() => highlight.classList.remove("active"), 2200);
  }

  function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

  // ── Chat input bar ────────────────────────────────────────────────────────────
  chatInput.addEventListener("input", () => {
    chatSend.disabled = !chatInput.value.trim();
    if (chatInput.value && !isPaused) {
      stopContinuousListening();
      setOrbState("idle");
    }
  });

  chatInput.addEventListener("blur", () => {
    if (!isPaused && !isSpeaking && !isProcessing && !isWidgetHidden) {
      setTimeout(() => startContinuousListening(), 500);
    }
  });

  chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && chatInput.value.trim()) handleChatSend();
  });
  chatSend.addEventListener("click", handleChatSend);

  async function handleChatSend() {
    const text = chatInput.value.trim();
    if (!text) return;
    if (isProcessing) return;
    chatInput.value = "";
    chatSend.disabled = true;
    addMessage("user", text);
    await sendToAI(text);
  }

  chatMic.addEventListener("click", () => {
    if (orbState === "listening") {
      stopContinuousListening();
      chatMic.innerHTML = SVG_MIC;
      chatMic.classList.remove("active");
      setOrbState(isPaused ? "paused" : "idle");
    } else {
      chatMic.innerHTML = SVG_MIC_ACTIVE;
      chatMic.classList.add("active");
      startContinuousListening();
    }
  });

  // ── Quick action buttons ──────────────────────────────────────────────────────
  document.querySelectorAll(".mousa-quick-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const action = btn.getAttribute("data-action");
      const quickMessages = {
        tour: "ابدأ جولة تعريفية بالمنصات الست",
        platforms: "أخبرني عن المنصات الست في mousa.ai",
        credits: "كيف يعمل نظام الكريدت؟",
        help: "كيف يمكنني استخدام هذه المنصة؟",
      };
      const msg = quickMessages[action];
      if (msg) {
        addMessage("user", msg);
        await sendToAI(msg);
      }
    });
  });

  // ── Voice toggle button ───────────────────────────────────────────────────────
  function updateVoiceToggleBtn() {
    const btn = document.getElementById("mousa-voice-toggle");
    if (!btn) return;
    if (activeVoice === "noura") {
      btn.textContent = "🎤 اليازية";
      btn.style.borderColor = "rgba(255,100,150,0.4)";
      btn.style.color = "rgba(255,150,180,0.9)";
    } else {
      btn.textContent = "🎤 ثاني";
      btn.style.borderColor = "";
      btn.style.color = "";
    }
  }

  const voiceToggleBtn = document.getElementById("mousa-voice-toggle");
  if (voiceToggleBtn) {
    updateVoiceToggleBtn();
    voiceToggleBtn.addEventListener("click", async () => {
      const newVoice = activeVoice === "thani" ? "noura" : "thani";
      activeVoice = newVoice;
      try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
        saved.voice = newVoice;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
      } catch (_) {}
      updateVoiceToggleBtn();
      const voiceNames = { thani: "ثاني (ذكوري)", noura: "اليازية (أنثوي)" };
      showActionToast("🎤", `تم تغيير الصوت إلى ${voiceNames[newVoice]}`);
      addActionMsg(`الصوت الحالي: ${voiceNames[newVoice]}`);
      await speak(newVoice === "noura" ? "مرحباً، أنا اليازية، مساعدتك في mousa.ai" : "مرحباً، أنا ثاني، مرشدك الذكي في mousa.ai");
    });
  }

  // ── Orb click ─────────────────────────────────────────────────────────────────
  orb.addEventListener("click", async (e) => {
    if (e.target === hideBtn || hideBtn.contains(e.target)) return;

    // Unlock audio on orb click
    if (!audioUnlocked) {
      audioUnlocked = true;
      if (pendingAudioSrc && !isSpeaking) {
        const src = pendingAudioSrc;
        const mime = pendingAudioMime || "audio/mpeg";
        pendingAudioSrc = null;
        pendingAudioMime = null;
        const base64 = src.split(",")[1];
        if (base64) {
          await speakFromBase64(base64, mime);
          return;
        }
      }
      if (pendingWelcome && !isSpeaking) {
        const text = pendingWelcome;
        pendingWelcome = null;
        speak(text);
        return;
      }
    }

    if (isSpeaking) {
      if (currentAudio) { currentAudio.pause(); currentAudio = null; }
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      isSpeaking = false;
      bargeInDetected = true;
    }

    if (isPaused) {
      isPaused = false;
      saveState();
      setOrbState("idle");
      showActionToast("🎙", "ثاني يستمع إليك الآن");
      startContinuousListening();
    } else {
      isPaused = true;
      saveState();
      stopContinuousListening();
      setOrbState("paused");
      showActionToast("⏸", "تم إيقاف ثاني مؤقتاً — اضغط للاستئناف");
    }

    if (!isSpeaking && !isProcessing) {
      if (isOpen) closeChat(true);
      else openChat(true);
    }
  });

  // ── Tour ──────────────────────────────────────────────────────────────────────
  const TOUR_SELECTORS = [
    { selector: "[data-mousa='fada'], [data-mousa-platform='fada']", label: "فضاء", desc: "المستشار الذكي للديكور الداخلي. صف مساحتك واحصل على توصيات تصميمية احترافية بـ 15-40 كريدت." },
    { selector: "[data-mousa='raqaba'], [data-mousa-platform='raqaba']", label: "رقابة", desc: "المشرف الميداني الذكي. ارفع صور الموقع واحصل على تقرير تفتيش فوري بـ 20-50 كريدت." },
    { selector: "[data-mousa='harara'], [data-mousa-platform='harara']", label: "حرارة", desc: "محلل الكفاءة الطاقوية. احصل على تقرير شامل للأحمال الحرارية بـ 25-60 كريدت." },
    { selector: "[data-mousa='maskan'], [data-mousa-platform='maskan']", label: "مسكن", desc: "محلل الاحتياجات السكنية. احصل على توصية مدروسة بأنسب خيار سكني بـ 10-30 كريدت." },
    { selector: "[data-mousa='code'], [data-mousa-platform='code']", label: "كود", desc: "مرجع الكودات الهندسية. ابحث في أكثر من 700 بند من كودات البناء بـ 5-15 كريدت." },
    { selector: "[data-mousa='khayal'], [data-mousa-platform='khayal']", label: "خيال", desc: "مولد المرئيات بكل المجالات. حوّل أي فكرة إلى صورة أو فيديو سينمائي بـ 20-60 كريدت." },
  ];

  function startTour() {
    if (isTourActive) return;
    tourTargets = TOUR_SELECTORS.map(t => {
      let el = null;
      for (const s of t.selector.split(", ")) {
        try { el = document.querySelector(s.trim()); if (el) break; } catch (_) {}
      }
      return { ...t, el };
    }).filter(t => t.el);

    if (tourTargets.length === 0) {
      addMessage("assistant", "لم أجد بطاقات المنصات في هذه الصفحة. انتقل للصفحة الرئيسية لبدء الجولة.");
      speak("لم أجد بطاقات المنصات. انتقل للصفحة الرئيسية لبدء الجولة.");
      return;
    }

    isTourActive = true;
    tourIndex = 0;
    closeChat();
    container.classList.add("tour-mode");
    highlight.classList.add("active");
    runTourStep();
  }

  async function runTourStep() {
    if (!isTourActive || tourIndex >= tourTargets.length) {
      endTour();
      container.style.left = "50%";
      container.style.top = "";
      container.style.bottom = "24px";
      container.style.transform = "translateX(-50%)";
      await delay(600);
      if (!userClosedChat) openChat();
      addMessage("assistant", "انتهت الجولة التعريفية! أي منصة تريد البدء بها؟");
      await speak("انتهت الجولة التعريفية. أي منصة تريد البدء بها؟");
      return;
    }
    const target = tourTargets[tourIndex];
    target.el.scrollIntoView({ behavior: "smooth", block: "center" });
    await delay(500);

    const rect = target.el.getBoundingClientRect();
    const orbSize = 72;
    const margin = 16;
    let orbLeft = rect.left + rect.width / 2 - orbSize / 2;
    let orbTop = rect.top - orbSize - margin;
    orbLeft = Math.max(margin, Math.min(window.innerWidth - orbSize - margin, orbLeft));
    if (orbTop < margin) orbTop = rect.bottom + margin;

    container.style.left = orbLeft + "px";
    container.style.top = (orbTop + window.scrollY) + "px";
    container.style.bottom = "auto";
    container.style.transform = "none";

    highlight.style.left = `${rect.left + window.scrollX - 6}px`;
    highlight.style.top = `${rect.top + window.scrollY - 6}px`;
    highlight.style.width = `${rect.width + 12}px`;
    highlight.style.height = `${rect.height + 12}px`;

    await speak(`${target.label}: ${target.desc}`);
    tourIndex++;
    if (isTourActive) setTimeout(runTourStep, 500);
  }

  function endTour() {
    isTourActive = false;
    container.classList.remove("tour-mode");
    highlight.classList.remove("active");
    container.style.left = "50%";
    container.style.top = "";
    container.style.bottom = "24px";
    container.style.transform = "translateX(-50%)";
  }

  // ── Pre-fill from session storage ─────────────────────────────────────────────
  function checkPrefillMessage() {
    const prefill = sessionStorage.getItem("thani_prefill_message") || sessionStorage.getItem("mousa_prefill_message");
    if (prefill) {
      sessionStorage.removeItem("thani_prefill_message");
      sessionStorage.removeItem("mousa_prefill_message");
      setTimeout(async () => {
        const chatInputEl = document.querySelector('[data-mousa-field="chat_input"]') ||
          document.querySelector('textarea[placeholder*="اسأل"]') ||
          document.querySelector('textarea[placeholder*="اكتب"]');
        if (chatInputEl) {
          typeIntoField(chatInputEl, prefill);
          highlightElement(chatInputEl);
          showActionToast("✏️", "تم ملء الرسالة تلقائياً");
        }
      }, 1500);
    }
  }

  // ── Chat close ────────────────────────────────────────────────────────────────
  chatClose.addEventListener("click", () => closeChat(true));

  // ── Keyboard shortcut: Alt+M ──────────────────────────────────────────────────
  document.addEventListener("keydown", (e) => {
    if (e.altKey && (e.key === "m" || e.key === "t")) {
      if (!isOpen) openChat(true);
      else closeChat(true);
    }
    if (e.key === "Escape" && isOpen) closeChat(true);
  });

  // ── Smart Collision Avoidance ─────────────────────────────────────────────────
  let collisionCheckTimer = null;

  function checkOrbCollision() {
    if (isTourActive || !smartPositionEnabled || isOpen) return;
    const orbRect = container.getBoundingClientRect();
    const orbSize = orbRect.width;
    const margin = 20;
    const importantSelectors = [
      'button[type="submit"]', ".btn-primary", "[data-mousa-field]",
      "h1", ".platform-card", "[data-platform]",
      'input[type="text"]', "textarea",
    ];
    let overlapping = false;
    for (const sel of importantSelectors) {
      let els;
      try { els = document.querySelectorAll(sel); } catch (_) { continue; }
      for (const el of els) {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        if (rect.bottom < 0 || rect.top > window.innerHeight) continue;
        const overlap = !(
          orbRect.right + margin < rect.left ||
          orbRect.left - margin > rect.right ||
          orbRect.bottom + margin < rect.top ||
          orbRect.top - margin > rect.bottom
        );
        if (overlap) { overlapping = true; break; }
      }
      if (overlapping) break;
    }
    if (overlapping) {
      const positions = [
        { left: window.innerWidth - orbSize - 24, bottom: 24, top: null },
        { left: 24, bottom: 24, top: null },
        { left: window.innerWidth - orbSize - 24, bottom: null, top: 24 },
        { left: 24, bottom: null, top: 24 },
      ];
      let bestPos = positions[0];
      let minOverlap = Infinity;
      for (const pos of positions) {
        const testRect = {
          left: pos.left, right: pos.left + orbSize,
          top: pos.top !== null ? pos.top : window.innerHeight - (pos.bottom || 0) - orbSize,
          bottom: pos.top !== null ? pos.top + orbSize : window.innerHeight - (pos.bottom || 0),
        };
        let overlapCount = 0;
        for (const sel of importantSelectors) {
          let els;
          try { els = document.querySelectorAll(sel); } catch (_) { continue; }
          for (const el of els) {
            const rect = el.getBoundingClientRect();
            if (rect.width === 0 || rect.bottom < 0 || rect.top > window.innerHeight) continue;
            const ov = !(testRect.right + 8 < rect.left || testRect.left - 8 > rect.right || testRect.bottom + 8 < rect.top || testRect.top - 8 > rect.bottom);
            if (ov) overlapCount++;
          }
        }
        if (overlapCount < minOverlap) { minOverlap = overlapCount; bestPos = pos; }
      }
      container.style.transition = "left 0.5s ease, top 0.5s ease, bottom 0.5s ease";
      container.style.left = bestPos.left + "px";
      if (bestPos.bottom !== null) {
        container.style.bottom = bestPos.bottom + "px";
        container.style.top = "auto";
      } else {
        container.style.top = bestPos.top + "px";
        container.style.bottom = "auto";
      }
      container.style.transform = "none";
    }
  }

  window.addEventListener("scroll", () => {
    if (collisionCheckTimer) clearTimeout(collisionCheckTimer);
    collisionCheckTimer = setTimeout(checkOrbCollision, 400);
  }, { passive: true });

  window.addEventListener("resize", () => {
    if (collisionCheckTimer) clearTimeout(collisionCheckTimer);
    collisionCheckTimer = setTimeout(checkOrbCollision, 400);
  }, { passive: true });

  setTimeout(checkOrbCollision, 2500);

  // ── Load Google Fonts ─────────────────────────────────────────────────────────
  if (!document.querySelector('link[href*="Tajawal"]')) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap";
    document.head.appendChild(link);
  }

  // ── Expose public API ─────────────────────────────────────────────────────────
  window.ThaniWidget = {
    open: () => openChat(true),
    close: () => closeChat(true),
    speak,
    sendMessage: async (msg) => { if (!isOpen && !userClosedChat) openChat(); addMessage("user", msg); await sendToAI(msg); },
    executeCommand: executeUICommand,
    startTour,
    pause: () => { isPaused = true; stopContinuousListening(); setOrbState("paused"); saveState(); },
    resume: () => { isPaused = false; setOrbState("idle"); startContinuousListening(); saveState(); },
    hide: hideWidget,
    show: showWidget,
    fillField: (selector, value) => { const f = findField(selector); if (f) { highlightElement(f); typeIntoField(f, value); } },
    setVolume: (v) => { audioVolume = Math.min(1, Math.max(0, v)); if (currentAudio) currentAudio.volume = audioVolume; saveState(); },
    setSpeed: (s) => { audioSpeed = Math.min(1.2, Math.max(0.7, s)); if (currentAudio) currentAudio.playbackRate = audioSpeed; saveState(); },
  };
  // Legacy alias
  window.MousaWidget = window.ThaniWidget;

  // ── Init ──────────────────────────────────────────────────────────────────────
  setupAudioUnlock();
  checkPrefillMessage();

  function waitForContextAndWelcome() {
    const ctx = window.MOUSA_CONTEXT;
    if (ctx || !document.querySelector("[data-trpc]")) {
      setTimeout(() => autoWelcome(), 1200);
    } else {
      setTimeout(waitForContextAndWelcome, 300);
    }
  }

  if (document.readyState === "complete") {
    setTimeout(() => waitForContextAndWelcome(), 800);
  } else {
    window.addEventListener("load", () => setTimeout(() => waitForContextAndWelcome(), 800));
  }

  console.log("[ثاني الذكي] v5.0 — Enhanced Voice | Volume Control | Speed Control | Retry Logic | Multi-Voice (ثاني/اليازية) | window.ThaniWidget API");
})();
