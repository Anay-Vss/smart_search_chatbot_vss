/**
 * LumiSearch AI Plugin v2.1 (fixed)
 * Drop-in embeddable AI search + chat widget. Zero dependencies.
 * Updated for new API response format with price, MRP, SKU, and images.
 *
 * FIXES:
 *  - openSearch() now closes chat popup first before opening search modal
 *  - Empty input always shows "What are you looking for?" hint UI
 *    (on open, on input clear, and on focus-while-empty)
 */

(function (global) {
  "use strict";

  const DEFAULTS = {
    apiUrl: "https://designing-sequel-stingray.ngrok-free.dev/query",
    sessionId: "lumi_" + Math.random().toString(36).slice(2, 9),
    strategy: "hybrid",
    accentColor: "#1a56db",
    brandName: "AI Search",
    triggerLabel: "Search",
    placeholder: "Search products, ask questions…",
    logoText: "✦",
    currency: "₹",
    searchDebounceMs: 500,
    chatDebounceMs: 500,
  };

  function injectStyles(cfg) {
    if (document.getElementById("__lumi-styles")) return;

    const a = cfg.accentColor;

    const style = document.createElement("style");
    style.id = "__lumi-styles";
    style.textContent = `
#__lumi-root,
#__lumi-chat,
#__lumi-trigger {
  --ls-accent: ${a};
  --ls-accent-10: ${a}1a;
  --ls-accent-20: ${a}33;
  --ls-accent-40: ${a}66;
  --ls-bg: #ffffff;
  --ls-bg-2: #f7f8fb;
  --ls-bg-3: #eef0f6;
  --ls-border: #e3e6ef;
  --ls-text: #0f1623;
  --ls-text-2: #4b5568;
  --ls-text-3: #8b95a8;
  --ls-radius: 20px;
  --ls-radius-sm: 12px;
  --ls-shadow: 0 32px 80px rgba(15,22,35,0.16), 0 8px 24px rgba(15,22,35,0.08);
  --ls-shadow-sm: 0 2px 10px rgba(15,22,35,0.07);
  --ls-ease: cubic-bezier(0.32, 0.72, 0, 1);
  --ls-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
}

#__lumi-root,
#__lumi-root *,
#__lumi-chat,
#__lumi-chat *,
#__lumi-trigger,
#__lumi-trigger * {
  box-sizing: border-box;
}

#__lumi-root,
#__lumi-chat,
#__lumi-trigger {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

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
  background: var(--ls-accent);
  color: #fff;
  border: none;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.01em;
  cursor: pointer;
  box-shadow: 0 4px 16px var(--ls-accent-40), 0 1px 3px rgba(0,0,0,0.1);
  transition: transform 0.22s var(--ls-spring), box-shadow 0.22s ease, background 0.18s;
  outline: none;
  user-select: none;
  margin: 0;
}
#__lumi-trigger:hover {
  transform: translateY(-3px) scale(1.02);
  box-shadow: 0 10px 32px var(--ls-accent-40), 0 2px 6px rgba(0,0,0,0.12);
}
#__lumi-trigger:active { transform: scale(0.96); }
#__lumi-trigger .__lt-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  background: rgba(255,255,255,0.2);
  border-radius: 50%;
  flex-shrink: 0;
  margin: 0;
  padding: 0;
}

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

#__lumi-root {
  position: fixed;
  top: 50%;
  left: 50%;
  z-index: 99999;
  width: min(720px, calc(100vw - 40px));
  max-height: min(82vh, 720px);
  background: var(--ls-bg);
  border-radius: var(--ls-radius);
  box-shadow: var(--ls-shadow);
  border: 1px solid rgba(255,255,255,0.8);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transform: translate(-50%, -48%) scale(0.95);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s var(--ls-ease), transform 0.35s var(--ls-spring);
  margin: 0;
  padding: 0;
}
#__lumi-root.lumi-on {
  opacity: 1;
  pointer-events: all;
  transform: translate(-50%, -50%) scale(1);
}

#__lumi-root .__lumi-hero {
  background: linear-gradient(135deg, var(--ls-accent) 0%, color-mix(in srgb, var(--ls-accent) 80%, #7c3aed) 100%);
  padding: 28px 28px 0;
  position: relative;
  overflow: hidden;
  flex-shrink: 0;
  margin: 0;
}
#__lumi-root .__lumi-hero::before {
  content: '';
  position: absolute;
  top: -40px;
  right: -40px;
  width: 160px;
  height: 160px;
  background: rgba(255,255,255,0.06);
  border-radius: 50%;
}
#__lumi-root .__lumi-hero::after {
  content: '';
  position: absolute;
  bottom: 8px;
  left: 40%;
  width: 80px;
  height: 80px;
  background: rgba(255,255,255,0.04);
  border-radius: 50%;
}
#__lumi-root .__lumi-hero-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0 0 18px 0;
  padding: 0;
  position: relative;
  z-index: 1;
}
#__lumi-root .__lumi-brand-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  padding: 0;
}
#__lumi-root .__lumi-brand-logo {
  width: 34px;
  height: 34px;
  background: rgba(255,255,255,0.2);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: #fff;
  font-weight: 700;
  margin: 0;
  padding: 0;
  flex-shrink: 0;
}
#__lumi-root .__lumi-brand-name {
  font-size: 14px;
  font-weight: 700;
  color: rgba(255,255,255,0.95);
  letter-spacing: 0.01em;
  margin: 0;
  padding: 0;
  line-height: 1.3;
}
#__lumi-root .__lumi-brand-badge {
  font-size: 10px;
  font-weight: 600;
  color: rgba(255,255,255,0.65);
  background: rgba(255,255,255,0.12);
  padding: 2px 7px;
  border-radius: 99px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  margin: 0;
  line-height: 1;
}
#__lumi-root .__lumi-hero-close {
  width: 30px;
  height: 30px;
  background: rgba(255,255,255,0.15);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255,255,255,0.9);
  transition: background 0.15s, transform 0.15s;
  position: relative;
  z-index: 1;
  margin: 0;
  padding: 0;
}
#__lumi-root .__lumi-hero-close:hover {
  background: rgba(255,255,255,0.25);
  transform: scale(1.08);
}

#__lumi-root .__lumi-searchbar {
  display: flex;
  align-items: center;
  gap: 11px;
  background: #fff;
  border-radius: 14px 14px 0 0;
  padding: 14px 16px;
  position: relative;
  z-index: 1;
  box-shadow: 0 -1px 0 0 rgba(255,255,255,0.1);
  margin: 0;
}
#__lumi-root .__lumi-searchbar-icon {
  color: var(--ls-accent);
  flex-shrink: 0;
  margin: 0;
  padding: 0;
  display: flex;
}
#__lumi-root .__lumi-searchbar-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 15px;
  font-weight: 500;
  color: var(--ls-text);
  background: transparent;
  caret-color: var(--ls-accent);
  min-width: 0;
  margin: 0;
  padding: 0;
  line-height: 1.4;
}
#__lumi-root .__lumi-searchbar-input::placeholder {
  color: var(--ls-text-3);
  font-weight: 400;
}
#__lumi-root .__lumi-searchbar-kbd {
  display: flex;
  align-items: center;
  gap: 3px;
  flex-shrink: 0;
  margin: 0;
  padding: 0;
}
#__lumi-root .__lumi-searchbar-kbd span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--ls-bg-2);
  border: 1px solid var(--ls-border);
  border-radius: 5px;
  font-size: 11px;
  font-weight: 600;
  color: var(--ls-text-3);
  padding: 2px 6px;
  line-height: 1.5;
  margin: 0;
}

#__lumi-root .__lumi-divider {
  height: 1px;
  background: var(--ls-border);
  flex-shrink: 0;
  margin: 0;
  padding: 0;
}

#__lumi-root .__lumi-body {
  overflow-y: auto;
  flex: 1;
  min-height: 120px;
  overscroll-behavior: contain;
  background: var(--ls-bg);
  margin: 0;
  padding: 0;
}
#__lumi-root .__lumi-body::-webkit-scrollbar { width: 4px; }
#__lumi-root .__lumi-body::-webkit-scrollbar-track { background: transparent; }
#__lumi-root .__lumi-body::-webkit-scrollbar-thumb {
  background: var(--ls-bg-3);
  border-radius: 99px;
}

#__lumi-root .__lumi-body-inner {
  padding: 22px 24px 24px;
  margin: 0;
}

#__lumi-root .__lumi-hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 40px 20px;
  text-align: center;
  margin: 0;
}
#__lumi-root .__lumi-hint-glyph {
  width: 56px;
  height: 56px;
  background: var(--ls-accent-10);
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ls-accent);
  margin: 0 0 4px 0;
  padding: 0;
}
#__lumi-root .__lumi-hint h3 {
  font-size: 16px;
  font-weight: 700;
  color: var(--ls-text);
  margin: 0;
  padding: 0;
  line-height: 1.3;
}
#__lumi-root .__lumi-hint p {
  font-size: 13.5px;
  color: var(--ls-text-3);
  line-height: 1.55;
  max-width: 300px;
  margin: 0;
  padding: 0;
}
#__lumi-root .__lumi-hint-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  justify-content: center;
  margin: 6px 0 0 0;
  padding: 0;
}
#__lumi-root .__lumi-hint-chip {
  background: var(--ls-bg-2);
  border: 1px solid var(--ls-border);
  border-radius: 99px;
  padding: 6px 14px;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--ls-text-2);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s, color 0.15s;
  white-space: nowrap;
  margin: 0;
  line-height: 1.4;
}
#__lumi-root .__lumi-hint-chip:hover {
  border-color: var(--ls-accent);
  background: var(--ls-accent-10);
  color: var(--ls-accent);
}

#__lumi-root .__lumi-loader {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 44px 0;
  justify-content: center;
  color: var(--ls-text-3);
  font-size: 13.5px;
  margin: 0;
}
#__lumi-root .__lumi-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid var(--ls-bg-3);
  border-top-color: var(--ls-accent);
  border-radius: 50%;
  animation: __lumi-spin 0.65s linear infinite;
  margin: 0;
  padding: 0;
}
@keyframes __lumi-spin {
  to { transform: rotate(360deg); }
}

#__lumi-root .__lumi-section-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0 0 14px 0;
  padding: 0;
}
#__lumi-root .__lumi-section-label-text {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--ls-text-3);
  margin: 0;
  padding: 0;
  line-height: 1;
}
#__lumi-root .__lumi-section-count {
  font-size: 11px;
  font-weight: 600;
  color: var(--ls-accent);
  background: var(--ls-accent-10);
  padding: 2px 8px;
  border-radius: 99px;
  margin: 0;
  line-height: 1;
}

/* UPDATED: Product cards with image support */
#__lumi-root .__lumi-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 14px;
  margin: 0 0 20px 0;
  padding: 0;
}
#__lumi-root .__lumi-card {
  background: var(--ls-bg);
  border: 1.5px solid var(--ls-border);
  border-radius: var(--ls-radius-sm);
  padding: 0;
  overflow: hidden;
  text-decoration: none;
  color: inherit;
  display: flex;
  flex-direction: column;
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s, transform 0.22s var(--ls-spring);
  animation: __lumi-cardIn 0.3s var(--ls-ease) both;
  margin: 0;
}
@keyframes __lumi-cardIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
#__lumi-root .__lumi-card:hover {
  border-color: var(--ls-accent);
  box-shadow: 0 0 0 3px var(--ls-accent-10), var(--ls-shadow-sm);
  transform: translateY(-3px);
}
#__lumi-root .__lumi-card-thumb {
  height: 120px;
  background: linear-gradient(135deg, var(--ls-accent-10) 0%, var(--ls-accent-20) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  position: relative;
  overflow: hidden;
  margin: 0;
  padding: 0;
}
#__lumi-root .__lumi-card-thumb img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 8px;
  transition: transform 0.3s var(--ls-spring);
}
#__lumi-root .__lumi-card:hover .__lumi-card-thumb img {
  transform: scale(1.05);
}
#__lumi-root .__lumi-card-thumb-icon {
  color: var(--ls-accent);
  opacity: 0.5;
  margin: 0;
  padding: 0;
  display: flex;
}
#__lumi-root .__lumi-card-body {
  padding: 13px 14px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
  margin: 0;
}
#__lumi-root .__lumi-card-name {
  font-size: 13px;
  font-weight: 700;
  color: var(--ls-text);
  line-height: 1.35;
  margin: 0;
  padding: 0;
}
#__lumi-root .__lumi-card-desc {
  font-size: 12px;
  color: var(--ls-text-3);
  line-height: 1.55;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  flex: 1;
  margin: 0;
  padding: 0;
}
/* NEW: Price styling */
#__lumi-root .__lumi-card-price-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 4px 0 0 0;
  padding: 0;
}
#__lumi-root .__lumi-card-price {
  font-size: 15px;
  font-weight: 700;
  color: var(--ls-accent);
  margin: 0;
  padding: 0;
  line-height: 1;
}
#__lumi-root .__lumi-card-mrp {
  font-size: 12px;
  color: var(--ls-text-3);
  text-decoration: line-through;
  margin: 0;
  padding: 0;
  line-height: 1;
}
#__lumi-root .__lumi-card-discount {
  font-size: 10px;
  font-weight: 700;
  color: #059669;
  background: #d1fae5;
  padding: 2px 6px;
  border-radius: 99px;
  margin: 0;
  line-height: 1;
}
#__lumi-root .__lumi-card-sku {
  font-size: 10px;
  color: var(--ls-text-3);
  font-family: 'SF Mono', monospace;
  margin: 2px 0 0 0;
  padding: 0;
  line-height: 1;
}
#__lumi-root .__lumi-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 8px 0 0 0;
  padding: 10px 0 0 0;
  border-top: 1px solid var(--ls-bg-3);
}
#__lumi-root .__lumi-card-cta {
  font-size: 12px;
  font-weight: 700;
  color: var(--ls-accent);
  display: flex;
  align-items: center;
  gap: 4px;
  margin: 0;
  padding: 0;
  line-height: 1;
}
#__lumi-root .__lumi-card-badge {
  font-size: 10px;
  font-weight: 600;
  color: #059669;
  background: #d1fae5;
  padding: 2px 7px;
  border-radius: 99px;
  margin: 0;
  line-height: 1;
}

#__lumi-root .__lumi-deepdive {
  width: 100%;
  padding: 14px 20px;
  background: var(--ls-accent);
  border: none;
  border-radius: var(--ls-radius-sm);
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  letter-spacing: 0.01em;
  transition: filter 0.18s, transform 0.18s var(--ls-spring);
  margin: 4px 0 0 0;
  line-height: 1;
}
#__lumi-root .__lumi-deepdive:hover {
  filter: brightness(1.12);
  transform: translateY(-1px);
}
#__lumi-root .__lumi-deepdive:active { transform: scale(0.98); }
#__lumi-root .__lumi-deepdive-sub {
  font-size: 11px;
  font-weight: 400;
  opacity: 0.7;
  margin: 0 0 0 2px;
  padding: 0;
  line-height: 1;
}

#__lumi-root .__lumi-error-box {
  background: #fff5f5;
  border: 1.5px solid #fed7d7;
  border-radius: var(--ls-radius-sm);
  padding: 16px 18px;
  display: flex;
  gap: 12px;
  align-items: flex-start;
  margin: 0;
}
#__lumi-root .__lumi-error-icon {
  color: #e53e3e;
  flex-shrink: 0;
  margin: 1px 0 0 0;
  padding: 0;
  display: flex;
}
#__lumi-root .__lumi-error-text {
  font-size: 13.5px;
  color: #742a2a;
  line-height: 1.55;
  margin: 0;
  padding: 0;
}
#__lumi-root .__lumi-error-text strong {
  font-weight: 700;
  display: block;
  margin: 0 0 3px 0;
  padding: 0;
  line-height: 1.3;
}

#__lumi-chat {
  position: fixed;
  bottom: 92px;
  right: 28px;
  z-index: 99997;
  width: min(400px, calc(100vw - 32px));
  height: 560px;
  background: var(--ls-bg);
  border-radius: var(--ls-radius);
  box-shadow: var(--ls-shadow);
  border: 1px solid var(--ls-border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transform: translateY(16px) scale(0.97);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.28s var(--ls-ease), transform 0.32s var(--ls-spring);
  margin: 0;
  padding: 0;
}
#__lumi-chat.lumi-on {
  opacity: 1;
  pointer-events: all;
  transform: translateY(0) scale(1);
}

#__lumi-chat .__lumi-chat-head {
  background: linear-gradient(135deg, var(--ls-accent) 0%, color-mix(in srgb, var(--ls-accent) 75%, #7c3aed) 100%);
  padding: 16px 18px;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
  position: relative;
  overflow: hidden;
  margin: 0;
}
#__lumi-chat .__lumi-chat-head::before {
  content: '';
  position: absolute;
  top: -30px;
  right: -20px;
  width: 100px;
  height: 100px;
  background: rgba(255,255,255,0.07);
  border-radius: 50%;
}
#__lumi-chat .__lumi-chat-avatar {
  width: 38px;
  height: 38px;
  background: rgba(255,255,255,0.2);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 17px;
  flex-shrink: 0;
  position: relative;
  z-index: 1;
  margin: 0;
  padding: 0;
}
#__lumi-chat .__lumi-chat-headinfo {
  flex: 1;
  position: relative;
  z-index: 1;
  margin: 0;
  padding: 0;
}
#__lumi-chat .__lumi-chat-headname {
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  line-height: 1.3;
  margin: 0;
  padding: 0;
}
#__lumi-chat .__lumi-chat-headsub {
  font-size: 11.5px;
  font-weight: 400;
  color: rgba(255,255,255,0.65);
  display: flex;
  align-items: center;
  gap: 5px;
  margin: 2px 0 0 0;
  padding: 0;
  line-height: 1.3;
}
#__lumi-chat .__lumi-online-dot {
  width: 6px;
  height: 6px;
  background: #4ade80;
  border-radius: 50%;
  animation: __lumi-pulse 2s ease infinite;
  margin: 0;
  padding: 0;
  flex-shrink: 0;
}
@keyframes __lumi-pulse {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.4; }
}
#__lumi-chat .__lumi-chat-headclose {
  width: 28px;
  height: 28px;
  background: rgba(255,255,255,0.15);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255,255,255,0.9);
  transition: background 0.15s;
  position: relative;
  z-index: 1;
  margin: 0;
  padding: 0;
}
#__lumi-chat .__lumi-chat-headclose:hover {
  background: rgba(255,255,255,0.28);
}

#__lumi-chat .__lumi-msgs {
  flex: 1;
  overflow-y: auto;
  padding: 18px 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  scroll-behavior: smooth;
  background: var(--ls-bg-2);
  margin: 0;
}
#__lumi-chat .__lumi-msgs::-webkit-scrollbar { width: 4px; }
#__lumi-chat .__lumi-msgs::-webkit-scrollbar-thumb {
  background: var(--ls-border);
  border-radius: 99px;
}

#__lumi-chat .__lumi-msg {
  display: flex;
  gap: 8px;
  animation: __lumi-msgIn 0.22s var(--ls-ease) both;
  margin: 0;
  padding: 0;
}
@keyframes __lumi-msgIn {
  from { opacity: 0; transform: translateY(5px); }
  to   { opacity: 1; transform: translateY(0); }
}
#__lumi-chat .__lumi-msg-user { flex-direction: row-reverse; }

#__lumi-chat .__lumi-avatar {
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  margin: 0;
  padding: 0;
}
#__lumi-chat .__lumi-avatar-bot {
  background: var(--ls-accent-10);
  color: var(--ls-accent);
}
#__lumi-chat .__lumi-avatar-user {
  background: var(--ls-accent);
  color: #fff;
}

#__lumi-chat .__lumi-bubble {
  max-width: 80%;
  padding: 10px 14px;
  font-size: 13.5px;
  line-height: 1.6;
  border-radius: 16px;
  word-break: break-word;
  margin: 0;
}
#__lumi-chat .__lumi-bubble-bot {
  background: var(--ls-bg);
  border: 1.5px solid var(--ls-border);
  color: var(--ls-text);
  border-top-left-radius: 4px;
  box-shadow: var(--ls-shadow-sm);
}
#__lumi-chat .__lumi-bubble-bot a {
  color: var(--ls-accent);
  font-weight: 600;
  text-decoration: none;
}
#__lumi-chat .__lumi-bubble-bot a:hover { text-decoration: underline; }
#__lumi-chat .__lumi-bubble-bot strong { font-weight: 700; color: var(--ls-text); }
#__lumi-chat .__lumi-bubble-user {
  background: var(--ls-accent);
  color: #fff;
  border-top-right-radius: 4px;
}

#__lumi-chat .__lumi-chat-products-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--ls-text-3);
  margin: 0 0 10px 0;
  padding: 0;
  line-height: 1;
}
#__lumi-chat .__lumi-chat-products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 8px;
  margin: 0;
  padding: 0;
}
#__lumi-chat .__lumi-chat-product-card {
  background: var(--ls-bg);
  border: 1.5px solid var(--ls-border);
  border-radius: var(--ls-radius-sm);
  padding: 0;
  overflow: hidden;
  text-decoration: none;
  color: inherit;
  display: flex;
  flex-direction: column;
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s, transform 0.22s var(--ls-spring);
  margin: 0;
}
#__lumi-chat .__lumi-chat-product-card:hover {
  border-color: var(--ls-accent);
  box-shadow: 0 0 0 2px var(--ls-accent-10), var(--ls-shadow-sm);
  transform: translateY(-2px);
}
#__lumi-chat .__lumi-chat-product-thumb {
  height: 70px;
  background: linear-gradient(135deg, var(--ls-accent-10) 0%, var(--ls-accent-20) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
  margin: 0;
  padding: 0;
}
#__lumi-chat .__lumi-chat-product-thumb img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 4px;
}
#__lumi-chat .__lumi-chat-product-body {
  padding: 10px 11px 11px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  margin: 0;
}
#__lumi-chat .__lumi-chat-product-name {
  font-size: 12px;
  font-weight: 700;
  color: var(--ls-text);
  line-height: 1.35;
  margin: 0;
  padding: 0;
}
#__lumi-chat .__lumi-chat-product-desc {
  font-size: 11px;
  color: var(--ls-text-3);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin: 0;
  padding: 0;
}
/* NEW: Chat product price */
#__lumi-chat .__lumi-chat-product-price {
  font-size: 13px;
  font-weight: 700;
  color: var(--ls-accent);
  margin: 2px 0 0 0;
  padding: 0;
  line-height: 1;
}
#__lumi-chat .__lumi-chat-product-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 6px 0 0 0;
  padding: 7px 0 0 0;
  border-top: 1px solid var(--ls-bg-3);
}
#__lumi-chat .__lumi-chat-product-cta {
  font-size: 11px;
  font-weight: 700;
  color: var(--ls-accent);
  display: flex;
  align-items: center;
  gap: 3px;
  margin: 0;
  padding: 0;
  line-height: 1;
}
#__lumi-chat .__lumi-chat-product-badge {
  font-size: 9px;
  font-weight: 600;
  color: #059669;
  background: #d1fae5;
  padding: 2px 6px;
  border-radius: 99px;
  margin: 0;
  line-height: 1;
}

#__lumi-chat .__lumi-typing {
  display: flex;
  gap: 4px;
  align-items: center;
  padding: 11px 14px;
  background: var(--ls-bg);
  border: 1.5px solid var(--ls-border);
  border-radius: 16px 16px 16px 4px;
  width: fit-content;
  box-shadow: var(--ls-shadow-sm);
  margin: 0;
}
#__lumi-chat .__lumi-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--ls-text-3);
  animation: __lumi-tdot 1.1s ease infinite;
  margin: 0;
  padding: 0;
}
#__lumi-chat .__lumi-dot:nth-child(2) { animation-delay: 0.18s; }
#__lumi-chat .__lumi-dot:nth-child(3) { animation-delay: 0.36s; }
@keyframes __lumi-tdot {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
  30%            { transform: translateY(-5px); opacity: 1; }
}

#__lumi-chat .__lumi-chat-input-area {
  padding: 12px 14px;
  border-top: 1.5px solid var(--ls-border);
  background: var(--ls-bg);
  display: flex;
  gap: 9px;
  align-items: flex-end;
  flex-shrink: 0;
  margin: 0;
}
#__lumi-chat .__lumi-chat-ta {
  flex: 1;
  border: 1.5px solid var(--ls-border);
  border-radius: 12px;
  padding: 9px 13px;
  font-size: 13.5px;
  font-family: inherit;
  color: var(--ls-text);
  background: var(--ls-bg-2);
  outline: none;
  resize: none;
  max-height: 90px;
  line-height: 1.5;
  transition: border-color 0.15s, background 0.15s;
  margin: 0;
}
#__lumi-chat .__lumi-chat-ta::placeholder { color: var(--ls-text-3); }
#__lumi-chat .__lumi-chat-ta:focus {
  border-color: var(--ls-accent);
  background: var(--ls-bg);
}
#__lumi-chat .__lumi-chat-send {
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  background: var(--ls-accent);
  border: none;
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  transition: filter 0.15s, transform 0.15s var(--ls-spring);
  margin: 0;
  padding: 0;
}
#__lumi-chat .__lumi-chat-send:hover {
  filter: brightness(1.12);
  transform: scale(1.06);
}
#__lumi-chat .__lumi-chat-send:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  transform: none;
}

#__lumi-chat .__lumi-date-sep {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 11px;
  font-weight: 600;
  color: var(--ls-text-3);
  letter-spacing: 0.04em;
  margin: 4px 0;
  padding: 0;
  line-height: 1;
}
#__lumi-chat .__lumi-date-sep::before,
#__lumi-chat .__lumi-date-sep::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--ls-border);
}
`;
    document.head.appendChild(style);

    if (!document.getElementById("__lumi-font")) {
      const link = document.createElement("link");
      link.id = "__lumi-font";
      link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap";
      document.head.appendChild(link);
    }
  }

  const I = {
    search: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
    close: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    send: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`,
    product: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>`,
    bolt: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
    arrow: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`,
    bot: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><circle cx="12" cy="5" r="2"/><line x1="12" y1="7" x2="12" y2="11"/><line x1="8" y1="15" x2="8" y2="17"/><line x1="16" y1="15" x2="16" y2="17"/></svg>`,
    warn: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    tag: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>`,
  };

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

  function cleanImageUrl(url) {
    if (!url) return null;
    return url.replace(/%22$/, "").replace(/"$/, "");
  }

  function formatPrice(price, currency) {
    if (price == null || isNaN(price)) return "";
    return currency + " " + price.toLocaleString("en-IN");
  }

  function calcDiscount(price, mrp) {
    if (!mrp || !price || mrp <= price) return null;
    return Math.round(((mrp - price) / mrp) * 100);
  }

  function stripHtml(html) {
    if (!html) return "";
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  }

  function debounce(func, delay) {
    let timeoutId;
    function debounced(...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    }
    debounced.cancel = () => {
      clearTimeout(timeoutId);
    };
    return debounced;
  }

  class LumiPlugin {
    constructor(config) {
      this.cfg = { ...DEFAULTS, ...config };
      this.chatHistory = [];
      this._searchOpen = false;
      this._chatOpen = false;
      this._busy = false;
      this._lastSearchQuery = "";
      this._searchRequestId = 0;

      this._debouncedSearch = debounce((value) => this._search(value), this.cfg.searchDebounceMs);
      this._debouncedChat = debounce((value) => this._callApi(value), this.cfg.chatDebounceMs);

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

      this.$input.addEventListener("input", (e) => {
        const value = e.target.value.trim();
        this._debouncedSearch.cancel();

        if (!value) {
          this._lastSearchQuery = "";
          this._setBody(this._htmlHint());
          return;
        }

        this._lastSearchQuery = value;
        this._debouncedSearch(value);
      });

      // FIX: Also reset to hint when input is focused while already empty
      // (handles case where user clears input via backspace then refocuses,
      // or search popup re-opens with empty field showing stale results)
      this.$input.addEventListener("focus", () => {
        if (!this.$input.value.trim()) {
          this._setBody(this._htmlHint());
        }
      });

      this.$input.addEventListener("keydown", e => {
        if (e.key === "Enter") {
          e.preventDefault();
          const value = this.$input.value.trim();
          if (!value) return;
          this._debouncedSearch.cancel();
          this._search(value);
        }
      });

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

      this.$ta.addEventListener("input", () => {
        this.$ta.style.height = "auto";
        this.$ta.style.height = Math.min(this.$ta.scrollHeight, 90) + "px";
      });

      this.$ta.addEventListener("keydown", e => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          this._sendMsg();
        }
      });

      document.body.appendChild(el);
      this.$chat = el;
    }

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
            <strong>Could not complete search</strong>
            ${msg || "Something went wrong. Please check your connection and try again."}
          </div>
        </div>
      `;
    }

    _htmlProducts(data, originalQuery, forChat = false) {
      const cards = data.products.map((p, i) => {
        const imgUrl = cleanImageUrl(p.image_url);
        const discount = calcDiscount(p.price, p.mrp);
        const cleanDesc = stripHtml(p.description);

        if (forChat) {
          return `
        <a class="__lumi-chat-product-card"
           href="${p.product_link || p.eshop_link || '#'}"
           rel="noopener"
           style="animation-delay:${i * 45}ms"
        >
          <div class="__lumi-chat-product-thumb">
            ${imgUrl
              ? `<img src="${imgUrl}" alt="${p.product_name}" loading="lazy" onerror="this.style.display='none';this.parentElement.querySelector('.fallback-icon')?.style.removeProperty('display');">`
              : `<span class="__lumi-card-thumb-icon">${I.product}</span>`
            }
            <span class="__lumi-card-thumb-icon fallback-icon" style="display:none;">${I.product}</span>
          </div>
          <div class="__lumi-chat-product-body">
            <div class="__lumi-chat-product-name">${p.product_name}</div>
            <div class="__lumi-chat-product-desc">${cleanDesc}</div>
            ${p.price ? `<div class="__lumi-chat-product-price">${formatPrice(p.price, this.cfg.currency)}</div>` : ""}
            <div class="__lumi-chat-product-footer">
              <span class="__lumi-chat-product-cta">${I.arrow} View</span>
              <span class="__lumi-chat-product-badge">In Stock</span>
            </div>
          </div>
        </a>
      `;
        }

        return `
      <a class="__lumi-card"
         href="${p.product_link || p.eshop_link || '#'}"
         rel="noopener"
         style="animation-delay:${i * 45}ms"
      >
        <div class="__lumi-card-thumb">
          ${imgUrl
            ? `<img src="${imgUrl}" alt="${p.product_name}" loading="lazy" onerror="this.style.display='none';this.parentElement.querySelector('.fallback-icon')?.style.removeProperty('display');">`
            : `<span class="__lumi-card-thumb-icon">${I.product}</span>`
          }
          <span class="__lumi-card-thumb-icon fallback-icon" style="display:none;">${I.product}</span>
        </div>
        <div class="__lumi-card-body">
          <div class="__lumi-card-name">${p.product_name}</div>
          <div class="__lumi-card-desc">${cleanDesc}</div>
          <div class="__lumi-card-price-row">
            ${p.price ? `<span class="__lumi-card-price">${formatPrice(p.price, this.cfg.currency)}</span>` : ""}
            ${p.mrp && p.mrp > p.price ? `<span class="__lumi-card-mrp">${formatPrice(p.mrp, this.cfg.currency)}</span>` : ""}
            ${discount ? `<span class="__lumi-card-discount">${discount}% off</span>` : ""}
          </div>
          ${p.sku ? `<div class="__lumi-card-sku">SKU: ${p.sku}</div>` : ""}
          <div class="__lumi-card-footer">
            <span class="__lumi-card-cta">${I.arrow} View Product</span>
            <span class="__lumi-card-badge">In Stock</span>
          </div>
        </div>
      </a>
    `;
      }).join("");

      if (forChat) {
        return `
      <div class="__lumi-section-label">
        <span class="__lumi-section-label-text">Products found</span>
        <span class="__lumi-section-count">${data.products.length} results</span>
      </div>
      <div class="__lumi-chat-products-grid">${cards}</div>
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

    _sanitizeInput(raw) {
      const text = (raw || "").trim();

      if (!text) {
        return { ok: false, reason: "Please enter a search term." };
      }

      if (text.length > 500) {
        return { ok: false, reason: "Input is too long (max 500 characters)." };
      }

      const doc = new DOMParser().parseFromString(text, "text/html");
      const hasElements = [...doc.body.childNodes].some(
        n => n.nodeType === Node.ELEMENT_NODE
      );
      if (hasElements) {
        return { ok: false, reason: "HTML tags are not allowed in your input." };
      }

      return { ok: true, value: text };
    }

    _escapeHtml(str) {
      return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    }

    // ─── FIX 1: Close chat popup before opening search modal ───────────────────
    openSearch() {
      // Always close chat first so the two panels never overlap
      this.closeChat();

      this._searchOpen = true;
      this.$root.classList.add("lumi-on");
      this.$bd.classList.add("lumi-on");

      // FIX 2: Always show hint UI when input is empty on open
      // (prevents stale loader/results/error from a previous session showing up)
      if (!this.$input.value.trim()) {
        this._setBody(this._htmlHint());
      }

      setTimeout(() => this.$input.focus(), 80);
    }
    // ───────────────────────────────────────────────────────────────────────────

    closeSearch() {
      this._searchOpen = false;
      this.$root.classList.remove("lumi-on");
      if (!this._chatOpen) this.$bd.classList.remove("lumi-on");

      // CLEAR INPUT AND RESET TO HINT UI WHEN CLOSING SEARCH
      if (this.$input) {
        this.$input.value = "";
        this._setBody(this._htmlHint());
      }

      // Cancel any pending search debounce
      this._debouncedSearch.cancel();

      // Reset busy state
      this._busy = false;
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

    async _search(rawQuery) {
      const query = (rawQuery || "").trim();

      if (!query) {
        this._setBody(this._htmlHint());
        return;
      }

      const { ok, value, reason } = this._sanitizeInput(query);
      if (!ok) {
        this._setBody(this._htmlError(reason));
        return;
      }

      if (this._busy) return;

      this._busy = true;
      this._setBody(this._htmlLoader());

      try {
        const res = await fetch(this.cfg.apiUrl, {
          method: "POST",
          headers: { "accept": "application/json", "Content-Type": "application/json" },
          body: JSON.stringify({ query: value, session_id: this.cfg.sessionId, strategy: this.cfg.strategy }),
        });
        if (!res.ok) throw new Error(`Server error ${res.status}`);

        const data = await res.json();
        console.log(data);

        // Check if the current search input still matches
        const currentInputValue = this.$input.value.trim();
        if (currentInputValue !== value) {
          this._busy = false;
          return;
        }

        if (data.intent === "buy" && data.products?.length) {
          this._setBody(this._htmlProducts(data, value));
          const btn = this.$body.querySelector(".__lumi-deepdive");
          if (btn) btn.addEventListener("click", () => this._deepDive(btn.dataset.q));
        } else if (data.intent === "info" || data.message) {
          // Properly reset state before navigation
          this._busy = false;

          // Clear the search input to prevent residual state
          if (this.$input) {
            this.$input.value = "";
            this.$input.blur();
          }

          // Reset the body to hint UI
          this._setBody(this._htmlHint());

          // Close search and ensure backdrop is handled
          this.closeSearch();

          // Clear existing chat messages
          if (this.$msgs) {
            this.$msgs.querySelectorAll(".__lumi-msg").forEach(m => m.remove());
          }

          // Open chat with bot message
          this.openChat(data.message);
          return; // Exit early
        } else {
          this._setBody(this._htmlError("No results found for your query."));
        }
      } catch (err) {
        const currentInputValue = this.$input.value.trim();
        if (currentInputValue === query) {
          this._setBody(this._htmlError(err.message));
        }
      } finally {
        // Only reset busy if we didn't navigate to chat
        if (this._busy) {
          this._busy = false;
        }
      }
    }

    _setBody(html) {
      if (this.$body) {
        this.$body.innerHTML = `<div class="__lumi-body-inner">${html}</div>`;
      }
    }

    _deepDive(query) {
      const q = `Tell me more about: ${query}`;

      // Clear any pending searches
      this._debouncedSearch.cancel();
      this._busy = false;

      // Clear search input
      if (this.$input) {
        this.$input.value = "";
        this.$input.blur();
      }

      this.closeSearch();

      // Reset chat messages
      if (this.$msgs) {
        this.$msgs.querySelectorAll(".__lumi-msg").forEach(m => m.remove());
      }

      // Open chat and send message
      this.openChat();
      this._userMsg(this._escapeHtml(q));
      this._callApi(q);
    }

    async _sendMsg() {
      const { ok, value, reason } = this._sanitizeInput(this.$ta.value);
      if (!ok) {
        this._botMsg(reason);
        return;
      }
      if (this._busy) return;

      this.$ta.value = "";
      this.$ta.style.height = "auto";
      this._userMsg(this._escapeHtml(value));
      await this._callApi(value);
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

        if (data.intent === "buy" && data.products?.length) {
          this._botMsg(data.message || "Here are some products that match your request:");
          this._botProductCards(data);
        } else if (data.message) {
          this._botMsg(data.message);
        } else {
          this._botMsg("I could not find anything for that query.");
        }
      } catch (err) {
        typing.remove();
        this._botMsg("I am having trouble connecting right now. Please try again.");
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

    _botProductCards(data) {
      const el = document.createElement("div");
      el.className = "__lumi-msg __lumi-msg-bot";

      const label = document.createElement("div");
      label.className = "__lumi-chat-products-label";
      label.textContent = `${data.products.length} result${data.products.length !== 1 ? "s" : ""} found`;

      const grid = document.createElement("div");
      grid.className = "__lumi-chat-products-grid";

      data.products.forEach((p, i) => {
        const imgUrl = cleanImageUrl(p.image_url);
        const cleanDesc = stripHtml(p.description);
        const card = document.createElement("a");
        card.className = "__lumi-chat-product-card";
        card.href = p.product_link || p.eshop_link || "#";
        card.rel = "noopener";
        card.style.animationDelay = `${i * 45}ms`;

        card.innerHTML = `
          <div class="__lumi-chat-product-thumb">
            ${imgUrl
            ? `<img
      src="${imgUrl}"
      alt="${p.product_name}"
      loading="lazy"
      onerror="this.remove();"
    >`
            : I.product
          }
          </div>
          <div class="__lumi-chat-product-body">
            <div class="__lumi-chat-product-name">${p.product_name}</div>
            <div class="__lumi-chat-product-desc">${cleanDesc}</div>
            ${p.price ? `<div class="__lumi-chat-product-price">${formatPrice(p.price, this.cfg.currency)}</div>` : ""}
            <div class="__lumi-chat-product-footer">
              <span class="__lumi-chat-product-cta">${I.arrow} View</span>
              <span class="__lumi-chat-product-badge">In Stock</span>
            </div>
          </div>
        `;
        grid.appendChild(card);
      });

      const bubble = document.createElement("div");
      bubble.className = "__lumi-bubble __lumi-bubble-bot";
      bubble.appendChild(label);
      bubble.appendChild(grid);

      el.innerHTML = `<div class="__lumi-avatar __lumi-avatar-bot">${I.bot}</div>`;
      el.appendChild(bubble);

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
      ["__lumi-trigger", "__lumi-backdrop", "__lumi-root", "__lumi-chat", "__lumi-styles", "__lumi-font"].forEach(id => {
        document.getElementById(id)?.remove();
      });
      this._inst = null;
    },
  };

  const init = () => {
    const s = document.querySelector("script[data-lumi-auto]");
    if (s) {
      global.LumiSearch.init({
        apiUrl: s.dataset.lumiApi || undefined,
        accentColor: s.dataset.lumiColor || undefined,
        brandName: s.dataset.lumiBrand || undefined,
        triggerLabel: s.dataset.lumiLabel || undefined,
        logoText: s.dataset.lumiLogo || undefined,
        currency: s.dataset.lumiCurrency || undefined,
      });
    }
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

})(window);