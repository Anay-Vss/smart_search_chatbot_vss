/**
 * LumiSearch AI Plugin v2
 * ─────────────────────────────────────────────────────────────────
 * Drop-in embeddable AI search + chat widget. Zero dependencies.
 * Works on any website including Angular, React, Vue, plain HTML.
 *
 * Usage A – Auto init via data attributes:
 *   <script src="lumisearch-plugin.js"
 *     data-lumi-auto
 *     data-lumi-api="https://your-api/query"
 *     data-lumi-color="#2563eb"
 *     data-lumi-brand="Luminous AI">
 *   </script>
 *
 * Usage B – Manual init:
 *   LumiSearch.init({ apiUrl, accentColor, brandName, ... })
 *
 * Usage C – Angular / React / Vue (call after component mounts):
 *   import 'lumisearch-plugin.js';
 *   ngAfterViewInit() { window.LumiSearch.init({ ... }); }
 * ─────────────────────────────────────────────────────────────────
 */

(function (global) {
  "use strict";

  // ─── DEFAULTS ─────────────────────────────────────────────────────────────
  const DEFAULTS = {
    apiUrl: "https://designing-sequel-stingray.ngrok-free.dev/query",
    sessionId: "lumi_" + Math.random().toString(36).slice(2, 9),
    strategy: "hybrid",
    accentColor: "#1a56db",
    brandName: "AI Search",
    triggerLabel: "Search",
    placeholder: "Search products, ask questions…",
    logoText: "✦",
  };

  // ─── STYLE BLOCK ──────────────────────────────────────────────────────────
  function injectStyles(cfg) {
    if (document.getElementById("__lumi-styles")) return;

    const a = cfg.accentColor;

    const style = document.createElement("style");
    style.id = "__lumi-styles";
    style.textContent = /* css */`

/* ── FONT ─────────────────────────────── */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

/* ── SCOPE RESET ──────────────────────── */
#__lumi-root *, #__lumi-chat *, #__lumi-trigger * {
  box-sizing: border-box;
  margin: 0; padding: 0;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  line-height: 1;
}

/* ── VARIABLES ────────────────────────── */
#__lumi-root, #__lumi-chat, #__lumi-trigger {
  --la: ${a};
  --la10: ${a}1a;
  --la20: ${a}33;
  --la40: ${a}66;
  --bg:    #ffffff;
  --bg2:   #f7f8fb;
  --bg3:   #eef0f6;
  --bdr:   #e3e6ef;
  --txt:   #0f1623;
  --txt2:  #4b5568;
  --txt3:  #8b95a8;
  --r:     20px;
  --r-sm:  12px;
  --shadow: 0 32px 80px rgba(15,22,35,0.16), 0 8px 24px rgba(15,22,35,0.08);
  --shadow-sm: 0 2px 10px rgba(15,22,35,0.07);
  --ease: cubic-bezier(0.32, 0.72, 0, 1);
  --spring: cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* ═══════════════════════════════════════
   TRIGGER BUTTON
═══════════════════════════════════════ */
#__lumi-trigger {
  position: fixed;
  bottom: 28px;
  right: 28px;
  z-index: 99998;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 0 20px 0 14px;
  height: 50px;
  background: var(--la);
  color: #fff;
  border: none;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.01em;
  cursor: pointer;
  box-shadow: 0 4px 16px var(--la40), 0 1px 3px rgba(0,0,0,0.1);
  transition: transform 0.22s var(--spring), box-shadow 0.22s ease, background 0.18s;
  outline: none;
  user-select: none;
}
#__lumi-trigger:hover {
  transform: translateY(-3px) scale(1.02);
  box-shadow: 0 10px 32px var(--la40), 0 2px 6px rgba(0,0,0,0.12);
}
#__lumi-trigger:active { transform: scale(0.96); }
#__lumi-trigger .__lt-icon {
  display: flex; align-items: center; justify-content: center;
  width: 26px; height: 26px;
  background: rgba(255,255,255,0.2);
  border-radius: 50%;
  flex-shrink: 0;
}

/* ═══════════════════════════════════════
   BACKDROP
═══════════════════════════════════════ */
#__lumi-backdrop {
  position: fixed;
  inset: 0;
  z-index: 99998;
  background: rgba(8, 12, 28, 0.5);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.28s ease;
}
#__lumi-backdrop.lumi-on { opacity: 1; pointer-events: all; }

/* ═══════════════════════════════════════
   SEARCH POPUP
═══════════════════════════════════════ */
#__lumi-root {
  position: fixed;
  top: 50%;
  left: 50%;
  z-index: 99999;
  width: min(660px, calc(100vw - 40px));
  max-height: min(82vh, 680px);
  background: var(--bg);
  border-radius: var(--r);
  box-shadow: var(--shadow);
  border: 1px solid rgba(255,255,255,0.8);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transform: translate(-50%, -48%) scale(0.95);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s var(--ease), transform 0.35s var(--spring);
}
#__lumi-root.lumi-on {
  opacity: 1;
  pointer-events: all;
  transform: translate(-50%, -50%) scale(1);
}

/* ── Search hero header ── */
.__lumi-hero {
  background: linear-gradient(135deg, var(--la) 0%, color-mix(in srgb, var(--la) 80%, #7c3aed) 100%);
  padding: 28px 28px 0;
  position: relative;
  overflow: hidden;
  flex-shrink: 0;
}
.__lumi-hero::before {
  content: '';
  position: absolute;
  top: -40px; right: -40px;
  width: 160px; height: 160px;
  background: rgba(255,255,255,0.06);
  border-radius: 50%;
}
.__lumi-hero::after {
  content: '';
  position: absolute;
  bottom: 8px; left: 40%;
  width: 80px; height: 80px;
  background: rgba(255,255,255,0.04);
  border-radius: 50%;
}
.__lumi-hero-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
  position: relative;
  z-index: 1;
}
.__lumi-brand-row {
  display: flex; align-items: center; gap: 10px;
}
.__lumi-brand-logo {
  width: 34px; height: 34px;
  background: rgba(255,255,255,0.2);
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  font-size: 16px;
  color: #fff;
  font-weight: 700;
}
.__lumi-brand-name {
  font-size: 14px;
  font-weight: 700;
  color: rgba(255,255,255,0.95);
  letter-spacing: 0.01em;
}
.__lumi-brand-badge {
  font-size: 10px;
  font-weight: 600;
  color: rgba(255,255,255,0.65);
  background: rgba(255,255,255,0.12);
  padding: 2px 7px;
  border-radius: 99px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.__lumi-hero-close {
  width: 30px; height: 30px;
  background: rgba(255,255,255,0.15);
  border: none; border-radius: 8px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  color: rgba(255,255,255,0.9);
  transition: background 0.15s, transform 0.15s;
  position: relative; z-index: 1;
}
.__lumi-hero-close:hover { background: rgba(255,255,255,0.25); transform: scale(1.08); }

/* ── Search bar inside hero ── */
.__lumi-searchbar {
  display: flex;
  align-items: center;
  gap: 11px;
  background: #fff;
  border-radius: 14px 14px 0 0;
  padding: 14px 16px;
  position: relative;
  z-index: 1;
  box-shadow: 0 -1px 0 0 rgba(255,255,255,0.1);
}
.__lumi-searchbar-icon { color: var(--la); flex-shrink: 0; }
.__lumi-searchbar-input {
  flex: 1;
  border: none; outline: none;
  font-size: 15px;
  font-weight: 500;
  color: var(--txt);
  background: transparent;
  caret-color: var(--la);
  min-width: 0;
}
.__lumi-searchbar-input::placeholder { color: var(--txt3); font-weight: 400; }
.__lumi-searchbar-kbd {
  display: flex; align-items: center; gap: 3px;
  flex-shrink: 0;
}
.__lumi-searchbar-kbd span {
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--bg2);
  border: 1px solid var(--bdr);
  border-radius: 5px;
  font-size: 11px;
  font-weight: 600;
  color: var(--txt3);
  padding: 2px 6px;
  line-height: 1.5;
}

/* ── Divider under header ── */
.__lumi-divider {
  height: 1px;
  background: var(--bdr);
  flex-shrink: 0;
}

/* ── Body scroll area ── */
.__lumi-body {
  overflow-y: auto;
  flex: 1;
  min-height: 120px;
  overscroll-behavior: contain;
}
.__lumi-body::-webkit-scrollbar { width: 4px; }
.__lumi-body::-webkit-scrollbar-track { background: transparent; }
.__lumi-body::-webkit-scrollbar-thumb { background: var(--bg3); border-radius: 99px; }

/* ── Body inner padding ── */
.__lumi-body-inner {
  padding: 22px 24px 24px;
}

/* ── Empty hint ── */
.__lumi-hint {
  display: flex; flex-direction: column;
  align-items: center; gap: 10px;
  padding: 40px 20px;
  text-align: center;
}
.__lumi-hint-glyph {
  width: 56px; height: 56px;
  background: var(--la10);
  border-radius: 18px;
  display: flex; align-items: center; justify-content: center;
  color: var(--la);
  margin-bottom: 4px;
}
.__lumi-hint h3 { font-size: 16px; font-weight: 700; color: var(--txt); }
.__lumi-hint p  { font-size: 13.5px; color: var(--txt3); line-height: 1.55; max-width: 300px; }
.__lumi-hint-chips {
  display: flex; flex-wrap: wrap; gap: 7px;
  justify-content: center;
  margin-top: 6px;
}
.__lumi-hint-chip {
  background: var(--bg2);
  border: 1px solid var(--bdr);
  border-radius: 99px;
  padding: 6px 14px;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--txt2);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s, color 0.15s;
  white-space: nowrap;
}
.__lumi-hint-chip:hover {
  border-color: var(--la);
  background: var(--la10);
  color: var(--la);
}

/* ── Loader ── */
.__lumi-loader {
  display: flex; align-items: center;
  gap: 10px; padding: 44px 0;
  justify-content: center;
  color: var(--txt3); font-size: 13.5px;
}
.__lumi-spinner {
  width: 18px; height: 18px;
  border: 2px solid var(--bg3);
  border-top-color: var(--la);
  border-radius: 50%;
  animation: __lumi-spin 0.65s linear infinite;
}
@keyframes __lumi-spin { to { transform: rotate(360deg); } }

/* ── Section label ── */
.__lumi-section-label {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 14px;
}
.__lumi-section-label-text {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--txt3);
}
.__lumi-section-count {
  font-size: 11px; font-weight: 600;
  color: var(--la);
  background: var(--la10);
  padding: 2px 8px;
  border-radius: 99px;
}

/* ── Product cards ── */
.__lumi-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(185px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
}
.__lumi-card {
  background: var(--bg);
  border: 1.5px solid var(--bdr);
  border-radius: var(--r-sm);
  padding: 0;
  overflow: hidden;
  text-decoration: none;
  color: inherit;
  display: flex;
  flex-direction: column;
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s, transform 0.22s var(--spring);
  animation: __lumi-cardIn 0.3s var(--ease) both;
}
@keyframes __lumi-cardIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
.__lumi-card:hover {
  border-color: var(--la);
  box-shadow: 0 0 0 3px var(--la10), var(--shadow-sm);
  transform: translateY(-3px);
}
.__lumi-card-thumb {
  height: 88px;
  background: linear-gradient(135deg, var(--la10) 0%, var(--la20) 100%);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  position: relative;
  overflow: hidden;
}
.__lumi-card-thumb::after {
  content: '';
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: 1px;
  background: var(--bdr);
}
.__lumi-card-thumb-icon {
  color: var(--la);
  opacity: 0.5;
}
.__lumi-card-body {
  padding: 13px 14px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
}
.__lumi-card-name {
  font-size: 13px;
  font-weight: 700;
  color: var(--txt);
  line-height: 1.35;
}
.__lumi-card-desc {
  font-size: 12px;
  color: var(--txt3);
  line-height: 1.55;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  flex: 1;
}
.__lumi-card-footer {
  display: flex; align-items: center; justify-content: space-between;
  margin-top: 8px;
  padding-top: 10px;
  border-top: 1px solid var(--bg3);
}
.__lumi-card-cta {
  font-size: 12px; font-weight: 700;
  color: var(--la);
  display: flex; align-items: center; gap: 4px;
}
.__lumi-card-badge {
  font-size: 10px; font-weight: 600;
  color: #059669;
  background: #d1fae5;
  padding: 2px 7px;
  border-radius: 99px;
}

/* ── Deep dive button ── */
.__lumi-deepdive {
  width: 100%;
  padding: 14px 20px;
  background: var(--la);
  border: none;
  border-radius: var(--r-sm);
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 9px;
  letter-spacing: 0.01em;
  transition: filter 0.18s, transform 0.18s var(--spring);
  margin-top: 4px;
}
.__lumi-deepdive:hover { filter: brightness(1.12); transform: translateY(-1px); }
.__lumi-deepdive:active { transform: scale(0.98); }
.__lumi-deepdive-sub {
  font-size: 11px; font-weight: 400;
  opacity: 0.7;
  margin-left: 2px;
}

/* ── Error ── */
.__lumi-error-box {
  background: #fff5f5;
  border: 1.5px solid #fed7d7;
  border-radius: var(--r-sm);
  padding: 16px 18px;
  display: flex; gap: 12px; align-items: flex-start;
}
.__lumi-error-icon { color: #e53e3e; flex-shrink: 0; margin-top: 1px; }
.__lumi-error-text { font-size: 13.5px; color: #742a2a; line-height: 1.55; }
.__lumi-error-text strong { font-weight: 700; display: block; margin-bottom: 3px; }

/* ═══════════════════════════════════════
   CHAT WINDOW
═══════════════════════════════════════ */
#__lumi-chat {
  position: fixed;
  bottom: 92px;
  right: 28px;
  z-index: 99997;
  width: min(370px, calc(100vw - 32px));
  height: 530px;
  background: var(--bg);
  border-radius: var(--r);
  box-shadow: var(--shadow);
  border: 1px solid var(--bdr);
  display: flex; flex-direction: column;
  overflow: hidden;
  transform: translateY(16px) scale(0.97);
  opacity: 0; pointer-events: none;
  transition: opacity 0.28s var(--ease), transform 0.32s var(--spring);
}
#__lumi-chat.lumi-on {
  opacity: 1; pointer-events: all;
  transform: translateY(0) scale(1);
}

.__lumi-chat-head {
  background: linear-gradient(135deg, var(--la) 0%, color-mix(in srgb, var(--la) 75%, #7c3aed) 100%);
  padding: 16px 18px;
  display: flex; align-items: center; gap: 12px;
  flex-shrink: 0;
  position: relative;
  overflow: hidden;
}
.__lumi-chat-head::before {
  content: ''; position: absolute; top: -30px; right: -20px;
  width: 100px; height: 100px;
  background: rgba(255,255,255,0.07);
  border-radius: 50%;
}
.__lumi-chat-avatar {
  width: 38px; height: 38px;
  background: rgba(255,255,255,0.2);
  border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  font-size: 17px;
  flex-shrink: 0;
  position: relative; z-index: 1;
}
.__lumi-chat-headinfo { flex: 1; position: relative; z-index: 1; }
.__lumi-chat-headname {
  font-size: 14px; font-weight: 700;
  color: #fff; line-height: 1.3;
}
.__lumi-chat-headsub {
  font-size: 11.5px; font-weight: 400;
  color: rgba(255,255,255,0.65);
  display: flex; align-items: center; gap: 5px;
  margin-top: 2px;
}
.__lumi-online-dot {
  width: 6px; height: 6px;
  background: #4ade80;
  border-radius: 50%;
  animation: __lumi-pulse 2s ease infinite;
}
@keyframes __lumi-pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.4; }
}
.__lumi-chat-headclose {
  width: 28px; height: 28px;
  background: rgba(255,255,255,0.15);
  border: none; border-radius: 8px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  color: rgba(255,255,255,0.9);
  transition: background 0.15s; position: relative; z-index: 1;
}
.__lumi-chat-headclose:hover { background: rgba(255,255,255,0.28); }

.__lumi-msgs {
  flex: 1; overflow-y: auto;
  padding: 18px 16px;
  display: flex; flex-direction: column; gap: 14px;
  scroll-behavior: smooth;
  background: var(--bg2);
}
.__lumi-msgs::-webkit-scrollbar { width: 4px; }
.__lumi-msgs::-webkit-scrollbar-thumb { background: var(--bdr); border-radius: 99px; }

.__lumi-msg {
  display: flex; gap: 8px;
  animation: __lumi-msgIn 0.22s var(--ease) both;
}
@keyframes __lumi-msgIn {
  from { opacity: 0; transform: translateY(5px); }
  to   { opacity: 1; transform: translateY(0); }
}
.__lumi-msg-user { flex-direction: row-reverse; }

.__lumi-avatar {
  width: 30px; height: 30px; flex-shrink: 0;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700;
}
.__lumi-avatar-bot { background: var(--la10); color: var(--la); }
.__lumi-avatar-user { background: var(--la); color: #fff; }

.__lumi-bubble {
  max-width: 80%;
  padding: 10px 14px;
  font-size: 13.5px;
  line-height: 1.6;
  border-radius: 16px;
  word-break: break-word;
}
.__lumi-bubble-bot {
  background: var(--bg);
  border: 1.5px solid var(--bdr);
  color: var(--txt);
  border-top-left-radius: 4px;
  box-shadow: var(--shadow-sm);
}
.__lumi-bubble-bot a { color: var(--la); font-weight: 600; text-decoration: none; }
.__lumi-bubble-bot a:hover { text-decoration: underline; }
.__lumi-bubble-bot strong { font-weight: 700; color: var(--txt); }
.__lumi-bubble-user {
  background: var(--la);
  color: #fff;
  border-top-right-radius: 4px;
}

/* ── Product cards inside chat ── */
.__lumi-chat .__lumi-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 10px;
  margin-bottom: 14px;
}
.__lumi-chat .__lumi-card {
  background: var(--bg);
  border: 1.5px solid var(--bdr);
  border-radius: var(--r-sm);
  overflow: hidden;
  text-decoration: none;
  color: inherit;
  display: flex;
  flex-direction: column;
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s, transform 0.22s var(--spring);
}
.__lumi-chat .__lumi-card:hover {
  border-color: var(--la);
  box-shadow: 0 0 0 2px var(--la10), var(--shadow-sm);
  transform: translateY(-2px);
}
.__lumi-chat .__lumi-card-thumb {
  height: 72px;
  background: linear-gradient(135deg, var(--la10) 0%, var(--la20) 100%);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.__lumi-chat .__lumi-card-body {
  padding: 10px 12px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}
.__lumi-chat .__lumi-card-name {
  font-size: 12px;
  font-weight: 700;
  color: var(--txt);
  line-height: 1.35;
}
.__lumi-chat .__lumi-card-desc {
  font-size: 11px;
  color: var(--txt3);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.__lumi-chat .__lumi-card-footer {
  display: flex; align-items: center; justify-content: space-between;
  margin-top: 6px;
  padding-top: 8px;
  border-top: 1px solid var(--bg3);
}
.__lumi-chat .__lumi-card-cta {
  font-size: 11px; font-weight: 700;
  color: var(--la);
  display: flex; align-items: center; gap: 3px;
}
.__lumi-chat .__lumi-card-badge {
  font-size: 9px; font-weight: 600;
  color: #059669;
  background: #d1fae5;
  padding: 2px 6px;
  border-radius: 99px;
}

.__lumi-typing {
  display: flex; gap: 4px; align-items: center;
  padding: 11px 14px;
  background: var(--bg);
  border: 1.5px solid var(--bdr);
  border-radius: 16px 16px 16px 4px;
  width: fit-content;
  box-shadow: var(--shadow-sm);
}
.__lumi-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--txt3);
  animation: __lumi-tdot 1.1s ease infinite;
}
.__lumi-dot:nth-child(2) { animation-delay: 0.18s; }
.__lumi-dot:nth-child(3) { animation-delay: 0.36s; }
@keyframes __lumi-tdot {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
  30%            { transform: translateY(-5px); opacity: 1; }
}

.__lumi-chat-input-area {
  padding: 12px 14px;
  border-top: 1.5px solid var(--bdr);
  background: var(--bg);
  display: flex; gap: 9px; align-items: flex-end;
  flex-shrink: 0;
}
.__lumi-chat-ta {
  flex: 1; border: 1.5px solid var(--bdr);
  border-radius: 12px;
  padding: 9px 13px;
  font-size: 13.5px;
  font-family: inherit;
  color: var(--txt);
  background: var(--bg2);
  outline: none; resize: none;
  max-height: 90px; line-height: 1.5;
  transition: border-color 0.15s, background 0.15s;
}
.__lumi-chat-ta::placeholder { color: var(--txt3); }
.__lumi-chat-ta:focus { border-color: var(--la); background: var(--bg); }
.__lumi-chat-send {
  width: 38px; height: 38px; flex-shrink: 0;
  background: var(--la); border: none;
  border-radius: 10px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  color: #fff;
  transition: filter 0.15s, transform 0.15s var(--spring);
}
.__lumi-chat-send:hover { filter: brightness(1.12); transform: scale(1.06); }
.__lumi-chat-send:disabled { opacity: 0.45; cursor: not-allowed; transform: none; }

/* ── Date separator in chat ── */
.__lumi-date-sep {
  display: flex; align-items: center; gap: 10px;
  font-size: 11px; font-weight: 600; color: var(--txt3);
  letter-spacing: 0.04em;
}
.__lumi-date-sep::before, .__lumi-date-sep::after {
  content: ''; flex: 1; height: 1px; background: var(--bdr);
}

    `;
    document.head.appendChild(style);
  }

  // ─── ICONS ────────────────────────────────────────────────────────────────
  const I = {
    search: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
    close: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    send: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`,
    product: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>`,
    bolt: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
    arrow: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`,
    bot: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><circle cx="12" cy="5" r="2"/><line x1="12" y1="7" x2="12" y2="11"/><line x1="8" y1="15" x2="8" y2="17"/><line x1="16" y1="15" x2="16" y2="17"/></svg>`,
    warn: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
  };

  // ─── MARKDOWN-LITE ────────────────────────────────────────────────────────
  function md(t) {
    return t
      .replace(/\*\*\[([^\]]+)\]\(([^)]+)\)\*\*/g, '<a href="$2" rel="noopener"><strong>$1</strong></a>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" rel="noopener">$1</a>')
      .replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\n\n/g, "</p><p>")
      .replace(/\n/g, "<br>")
      .replace(/^\d+\.\s*/gm, "")
      .replace(/^[-•]\s*/gm, "");
  }

  // ─── PLUGIN CLASS ─────────────────────────────────────────────────────────
  class LumiPlugin {
    constructor(config) {
      this.cfg = { ...DEFAULTS, ...config };
      this.chatHistory = [];
      this._searchOpen = false;
      this._chatOpen = false;
      this._busy = false;
      this._mount();
    }

    _mount() {
      injectStyles(this.cfg);
      this._mkTrigger();
      this._mkBackdrop();
      this._mkSearch();
      this._mkChat();
      document.addEventListener("keydown", e => { if (e.key === "Escape") this.closeAll(); });
    }

    // ── DOM BUILDERS ────────────────────────────────────────────────────────

    _mkTrigger() {
      const btn = document.createElement("button");
      btn.id = "__lumi-trigger";
      btn.setAttribute("aria-label", "Open AI Search");
      btn.innerHTML = `<span class="__lt-icon">${I.search}</span><span>${this.cfg.triggerLabel}</span>`;
      btn.addEventListener("click", () => this.openSearch());
      document.body.appendChild(btn);
      this.$trigger = btn;
    }

    _mkBackdrop() {
      const el = document.createElement("div");
      el.id = "__lumi-backdrop";
      el.addEventListener("click", () => this.closeAll());
      document.body.appendChild(el);
      this.$bd = el;
    }

    _mkSearch() {
      const root = document.createElement("div");
      root.id = "__lumi-root";
      root.setAttribute("role", "dialog");
      root.setAttribute("aria-modal", "true");

      root.innerHTML = `
        <div class="__lumi-hero">
          <div class="__lumi-hero-top">
            <div class="__lumi-brand-row">
              <div class="__lumi-brand-logo">${this.cfg.logoText}</div>
              <div>
                <div class="__lumi-brand-name">${this.cfg.brandName}</div>
              </div>
              <span class="__lumi-brand-badge">AI Powered</span>
            </div>
            <button class="__lumi-hero-close" aria-label="Close">${I.close}</button>
          </div>
          <div class="__lumi-searchbar">
            <span class="__lumi-searchbar-icon">${I.search}</span>
            <input
              class="__lumi-searchbar-input"
              type="text"
              placeholder="${this.cfg.placeholder}"
              autocomplete="off" spellcheck="false"
              aria-label="Search"
            />
            <div class="__lumi-searchbar-kbd">
              <span>↵</span>
            </div>
          </div>
        </div>
        <div class="__lumi-divider"></div>
        <div class="__lumi-body">
          <div class="__lumi-body-inner">${this._htmlHint()}</div>
        </div>
      `;

      this.$input = root.querySelector(".__lumi-searchbar-input");
      this.$body = root.querySelector(".__lumi-body");
      root.querySelector(".__lumi-hero-close").addEventListener("click", () => this.closeAll());

      this.$input.addEventListener("keydown", e => {
        if (e.key === "Enter") this._search(this.$input.value.trim());
      });

      // Hint chip clicks
      root.addEventListener("click", e => {
        const chip = e.target.closest(".__lumi-hint-chip");
        if (chip) {
          this.$input.value = chip.dataset.q;
          this._search(chip.dataset.q);
        }
      });

      document.body.appendChild(root);
      this.$root = root;
    }

    _mkChat() {
      const el = document.createElement("div");
      el.id = "__lumi-chat";
      el.setAttribute("role", "complementary");

      el.innerHTML = `
        <div class="__lumi-chat-head">
          <div class="__lumi-chat-avatar">${this.cfg.logoText}</div>
          <div class="__lumi-chat-headinfo">
            <div class="__lumi-chat-headname">${this.cfg.brandName}</div>
            <div class="__lumi-chat-headsub">
              <span class="__lumi-online-dot"></span> Online · Ask me anything
            </div>
          </div>
          <button class="__lumi-chat-headclose" aria-label="Close chat">${I.close}</button>
        </div>
        <div class="__lumi-msgs">
          <div class="__lumi-date-sep">Today</div>
        </div>
        <div class="__lumi-chat-input-area">
          <textarea class="__lumi-chat-ta" placeholder="Type a message…" rows="1" aria-label="Message"></textarea>
          <button class="__lumi-chat-send" aria-label="Send">${I.send}</button>
        </div>
      `;

      this.$msgs = el.querySelector(".__lumi-msgs");
      this.$ta = el.querySelector(".__lumi-chat-ta");
      this.$sendBtn = el.querySelector(".__lumi-chat-send");

      el.querySelector(".__lumi-chat-headclose").addEventListener("click", () => this.closeChat());

      this.$sendBtn.addEventListener("click", () => this._sendMsg());
      this.$ta.addEventListener("keydown", e => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); this._sendMsg(); }
      });
      this.$ta.addEventListener("input", () => {
        this.$ta.style.height = "auto";
        this.$ta.style.height = Math.min(this.$ta.scrollHeight, 90) + "px";
      });

      document.body.appendChild(el);
      this.$chat = el;
    }

    // ── HTML BUILDERS ───────────────────────────────────────────────────────

    _htmlHint() {
      const chips = [
        { label: "Home inverters", q: "I want to buy home inverters" },
        { label: "Solar products", q: "Show me solar panels" },
        { label: "Battery backup", q: "I need battery backup solutions" },
        { label: "Best selling", q: "What are your best selling products?" },
      ];
      return `
        <div class="__lumi-hint">
          <div class="__lumi-hint-glyph">${I.search}</div>
          <h3>What are you looking for?</h3>
          <p>Search products, compare features, or ask anything about our catalogue.</p>
          <div class="__lumi-hint-chips">
            ${chips.map(c => `<div class="__lumi-hint-chip" data-q="${c.q}">${c.label}</div>`).join("")}
          </div>
        </div>
      `;
    }

    _htmlLoader() {
      return `<div class="__lumi-loader"><div class="__lumi-spinner"></div><span>Searching…</span></div>`;
    }

    _htmlError(msg) {
      return `
        <div class="__lumi-error-box">
          <span class="__lumi-error-icon">${I.warn}</span>
          <div class="__lumi-error-text">
            <strong>Couldn't complete search</strong>
            ${msg || "Something went wrong. Please check your connection and try again."}
          </div>
        </div>
      `;
    }

    _htmlProducts(data, originalQuery, forChat = false) {
      const cards = data.products.map((p, i) => `
        <a class="__lumi-card"
           href="${p.product_link || p.eshop_link || '#'}"
           rel="noopener"
           style="animation-delay:${i * 45}ms"
        >
          <div class="__lumi-card-thumb">
            <span class="__lumi-card-thumb-icon">${I.product}</span>
          </div>
          <div class="__lumi-card-body">
            <div class="__lumi-card-name">${p.product_name}</div>
            <div class="__lumi-card-desc">${p.description || ""}</div>
            <div class="__lumi-card-footer">
              <span class="__lumi-card-cta">${I.arrow} View</span>
              <span class="__lumi-card-badge">In Stock</span>
            </div>
          </div>
        </a>
      `).join("");

      if (forChat) {
        return `
          <div class="__lumi-section-label">
            <span class="__lumi-section-label-text">Products found</span>
            <span class="__lumi-section-count">${data.products.length} results</span>
          </div>
          <div class="__lumi-cards">${cards}</div>
        `;
      }

      return `
        <div class="__lumi-section-label">
          <span class="__lumi-section-label-text">Products found</span>
          <span class="__lumi-section-count">${data.products.length} results</span>
        </div>
        <div class="__lumi-cards">${cards}</div>
        <button class="__lumi-deepdive" data-q="${originalQuery}">
          ${I.bolt}
          Deep Dive with AI
          <span class="__lumi-deepdive-sub">— Ask follow-up questions</span>
        </button>
      `;
    }

    // ── OPEN / CLOSE ────────────────────────────────────────────────────────

    openSearch() {
      this._searchOpen = true;
      this.$root.classList.add("lumi-on");
      this.$bd.classList.add("lumi-on");
      setTimeout(() => this.$input.focus(), 80);
    }

    closeSearch() {
      this._searchOpen = false;
      this.$root.classList.remove("lumi-on");
      if (!this._chatOpen) this.$bd.classList.remove("lumi-on");
    }

    openChat(botMsg) {
      this._chatOpen = true;
      this.$chat.classList.add("lumi-on");
      if (botMsg) this._botMsg(botMsg);
    }

    closeChat() {
      this._chatOpen = false;
      this.$chat.classList.remove("lumi-on");
      if (!this._searchOpen) this.$bd.classList.remove("lumi-on");
    }

    closeAll() {
      this.closeSearch();
      this.closeChat();
      this.$bd.classList.remove("lumi-on");
    }

    // ── SEARCH FLOW ─────────────────────────────────────────────────────────

    async _search(query) {
      if (!query || this._busy) return;
      this._busy = true;
      this._setBody(this._htmlLoader());

      try {
        const res = await fetch(this.cfg.apiUrl, {
          method: "POST",
          headers: { "accept": "application/json", "Content-Type": "application/json" },
          body: JSON.stringify({ query, session_id: this.cfg.sessionId, strategy: this.cfg.strategy }),
        });
        if (!res.ok) throw new Error(`Server error ${res.status}`);
        const data = await res.json();

        if (data.intent === "buy" && data.products?.length) {
          this._setBody(this._htmlProducts(data, query));
          // Wire deep dive button
          const btn = this.$body.querySelector(".__lumi-deepdive");
          if (btn) btn.addEventListener("click", () => this._deepDive(btn.dataset.q));
        } else if (data.intent === "info" || data.message) {
          this.closeSearch();
          this.$msgs.querySelectorAll(".__lumi-msg").forEach(m => m.remove());
          this.openChat(data.message);
        } else {
          this._setBody(this._htmlError("No results found for your query."));
        }
      } catch (err) {
        this._setBody(this._htmlError(err.message));
      } finally {
        this._busy = false;
      }
    }

    _setBody(html) {
      this.$body.innerHTML = `<div class="__lumi-body-inner">${html}</div>`;
    }

    _deepDive(query) {
      const q = `Tell me more about: ${query}`;
      this.closeSearch();
      this.$msgs.querySelectorAll(".__lumi-msg").forEach(m => m.remove());
      this.openChat();
      this._userMsg(q);
      this._callApi(q);
    }

    // ── CHAT FLOW ────────────────────────────────────────────────────────────

    async _sendMsg() {
      const text = this.$ta.value.trim();
      if (!text || this._busy) return;
      this.$ta.value = "";
      this.$ta.style.height = "auto";
      this._userMsg(text);
      await this._callApi(text);
    }

    async _callApi(query) {
      this._busy = true;
      this.$sendBtn.disabled = true;
      const typing = this._showTyping();

      try {
        const res = await fetch(this.cfg.apiUrl, {
          method: "POST",
          headers: { "accept": "application/json", "Content-Type": "application/json" },
          body: JSON.stringify({ query, session_id: this.cfg.sessionId, strategy: this.cfg.strategy }),
        });
        if (!res.ok) throw new Error(`Server error ${res.status}`);
        const data = await res.json();
        typing.remove();

        // Handle buy intent in chat — render product cards + message
        if (data.intent === "buy" && data.products?.length) {
          this._botMsg(data.message || "Here are some products that match your request:");
          this._botProductCards(data, query);
        } else if (data.message) {
          this._botMsg(data.message);
        } else {
          this._botMsg("I couldn't find anything for that query.");
        }
      } catch (err) {
        typing.remove();
        this._botMsg("I'm having trouble connecting right now. Please try again.");
      } finally {
        this._busy = false;
        this.$sendBtn.disabled = false;
      }
    }

    _userMsg(text) {
      const el = document.createElement("div");
      el.className = "__lumi-msg __lumi-msg-user";
      el.innerHTML = `
        <div class="__lumi-bubble __lumi-bubble-user">${text}</div>
        <div class="__lumi-avatar __lumi-avatar-user">You</div>
      `;
      this.$msgs.appendChild(el);
      this._scrollMsgs();
    }

    _botMsg(text) {
      const el = document.createElement("div");
      el.className = "__lumi-msg __lumi-msg-bot";
      el.innerHTML = `
        <div class="__lumi-avatar __lumi-avatar-bot">${I.bot}</div>
        <div class="__lumi-bubble __lumi-bubble-bot"><p>${md(text)}</p></div>
      `;
      this.$msgs.appendChild(el);
      this._scrollMsgs();
    }

    _botProductCards(data, query) {
      const el = document.createElement("div");
      el.className = "__lumi-msg __lumi-msg-bot";
      el.innerHTML = `
        <div class="__lumi-avatar __lumi-avatar-bot">${I.bot}</div>
        <div class="__lumi-bubble __lumi-bubble-bot">
          ${this._htmlProducts(data, query, true)}
        </div>
      `;
      this.$msgs.appendChild(el);
      this._scrollMsgs();
    }

    _showTyping() {
      const el = document.createElement("div");
      el.className = "__lumi-msg __lumi-msg-bot";
      el.innerHTML = `
        <div class="__lumi-avatar __lumi-avatar-bot">${I.bot}</div>
        <div class="__lumi-typing">
          <div class="__lumi-dot"></div>
          <div class="__lumi-dot"></div>
          <div class="__lumi-dot"></div>
        </div>
      `;
      this.$msgs.appendChild(el);
      this._scrollMsgs();
      return el;
    }

    _scrollMsgs() {
      this.$msgs.scrollTop = this.$msgs.scrollHeight;
    }
  }

  // ─── PUBLIC API ────────────────────────────────────────────────────────────
  global.LumiSearch = {
    _inst: null,
    init(config) {
      if (this._inst) return this._inst;
      this._inst = new LumiPlugin(config);
      return this._inst;
    },
    open() { this._inst?.openSearch(); },
    close() { this._inst?.closeAll(); },
    destroy() {
      if (!this._inst) return;
      ["__lumi-trigger", "__lumi-backdrop", "__lumi-root", "__lumi-chat", "__lumi-styles"].forEach(id => {
        document.getElementById(id)?.remove();
      });
      this._inst = null;
    },
  };

  // Auto-init via data attributes
  const init = () => {
    const s = document.querySelector("script[data-lumi-auto]");
    if (s) {
      global.LumiSearch.init({
        apiUrl: s.dataset.lumiApi || undefined,
        accentColor: s.dataset.lumiColor || undefined,
        brandName: s.dataset.lumiBrand || undefined,
        triggerLabel: s.dataset.lumiLabel || undefined,
        logoText: s.dataset.lumiLogo || undefined,
      });
    }
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

})(window);
