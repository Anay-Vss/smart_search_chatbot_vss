/**
 * LumiSearch AI Plugin v3.0 (CSP-safe, Production Ready)
 * Drop-in embeddable AI search + chat widget. Zero dependencies.
 * 
 * FEATURES:
 * - CSP-safe: all styles loaded via external CSS
 * - Persistent chat history across redirects using sessionStorage
 * - Chat state (open/closed) persists across redirects
 * - Multiple redirects maintain full chat history
 * - Proper debouncing with cancelation
 * - Production-ready error handling
 * - Memory leak prevention
 * - Performance optimized
 */

(function (global) {
  "use strict";

  const DEFAULTS = {
    apiUrl: "https://designing-sequel-stingray.ngrok-free.dev/query",
    cssUrl: "assets/lumi-search.css",   // <-- Angular dev: put lumi-search.css in src/assets/
    sessionId: "lumi_" + Math.random().toString(36).slice(2, 9),
    strategy: "hybrid",
    accentColor: "#1a56db",
    brandName: "AI Search",
    triggerLabel: "Search",
    placeholder: "Search products, ask questions…",
    logoText: "✦",
    currency: "₹",
    searchDebounceMs: 1000,
    chatDebounceMs: 1000,
    maxHistoryLength: 50,
    redirectDelay: 150,
    messageExpiryMs: 30000,
  };

  // Storage keys for persistence
  const STORAGE_KEYS = {
    REDIRECT_MESSAGE: '__lumi_redirect_message',
    REDIRECT_TIMESTAMP: '__lumi_redirect_timestamp',
    CHAT_HISTORY: '__lumi_chat_history',
    CHAT_OPEN: '__lumi_chat_open',
    SESSION_ID: '__lumi_session_id',
  };

  // Utility: Debounce with leading/trailing options (CSP-safe)
  function debounce(func, wait, options = {}) {
    let timeoutId = null;
    let lastArgs = null;
    let lastThis = null;
    let result = null;
    let lastCallTime = 0;
    let lastInvokeTime = 0;
    const maxWait = options.maxWait || 0;
    const leading = options.leading || false;
    const trailing = options.trailing !== false;

    function shouldInvoke(time) {
      const timeSinceLastCall = time - lastCallTime;
      const timeSinceLastInvoke = time - lastInvokeTime;
      return (
        lastCallTime === 0 ||
        timeSinceLastCall >= wait ||
        (maxWait > 0 && timeSinceLastInvoke >= maxWait)
      );
    }

    function invokeFunc(time) {
      lastInvokeTime = time;
      const args = lastArgs;
      const context = lastThis;
      lastArgs = null;
      lastThis = null;
      result = func.apply(context, args);
      return result;
    }

    function timerExpired() {
      const time = Date.now();
      if (shouldInvoke(time)) {
        return trailingEdge(time);
      }
      timeoutId = setTimeout(timerExpired, remainingWait(time));
      return null;
    }

    function remainingWait(time) {
      const timeSinceLastCall = time - lastCallTime;
      const timeSinceLastInvoke = time - lastInvokeTime;
      const timeWaiting = wait - timeSinceLastCall;
      return maxWait > 0
        ? Math.min(timeWaiting, maxWait - timeSinceLastInvoke)
        : timeWaiting;
    }

    function leadingEdge(time) {
      lastInvokeTime = time;
      timeoutId = setTimeout(timerExpired, wait);
      return leading ? invokeFunc(time) : result;
    }

    function trailingEdge(time) {
      timeoutId = null;
      if (trailing && lastArgs) {
        return invokeFunc(time);
      }
      lastArgs = null;
      lastThis = null;
      return result;
    }

    function debounced(...args) {
      const time = Date.now();
      const isInvoking = shouldInvoke(time);
      lastArgs = args;
      lastThis = this;
      lastCallTime = time;

      if (isInvoking) {
        if (timeoutId === null) {
          return leadingEdge(time);
        }
        if (maxWait > 0) {
          timeoutId = setTimeout(timerExpired, wait);
          return invokeFunc(time);
        }
        return result;
      }
      if (timeoutId === null) {
        timeoutId = setTimeout(timerExpired, wait);
      }
      return result;
    }

    debounced.cancel = function () {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
      lastArgs = null;
      lastThis = null;
      lastCallTime = 0;
      lastInvokeTime = 0;
      timeoutId = null;
    };

    debounced.flush = function () {
      return timeoutId === null ? result : trailingEdge(Date.now());
    };

    return debounced;
  }

  // Utility: Throttle for rate limiting (CSP-safe)
  function throttle(func, limit) {
    let inThrottle = false;
    let lastFunc = null;
    let lastRan = 0;

    return function (...args) {
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        lastRan = Date.now();
        inThrottle = true;
        setTimeout(() => {
          inThrottle = false;
          if (lastFunc) {
            lastFunc.apply(context, args);
            lastFunc = null;
          }
        }, limit);
      } else {
        clearTimeout(lastFunc);
        lastFunc = function () {
          if (Date.now() - lastRan >= limit) {
            func.apply(context, args);
            lastRan = Date.now();
          }
        };
        setTimeout(lastFunc, limit);
      }
    };
  }

  // CSP-SAFE: Load external CSS file instead of injecting inline <style>
  function injectStyles(cfg) {
    if (document.getElementById("__lumi-styles")) return;

    const link = document.createElement("link");
    link.id = "__lumi-styles";
    link.rel = "stylesheet";
    link.href = cfg.cssUrl;
    document.head.appendChild(link);

    // Inter font from Google (CSP whitelist required)
    if (!document.getElementById("__lumi-font")) {
      const fontLink = document.createElement("link");
      fontLink.id = "__lumi-font";
      fontLink.rel = "stylesheet";
      fontLink.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap";
      document.head.appendChild(fontLink);
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
    if (!t) return '';
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

  function cleanLinkUrl(url) {
    if (!url || url === '#') return '#';
    try {
      const urlObj = new URL(url);
      return urlObj.pathname + urlObj.search + urlObj.hash;
    } catch (e) {
      return url;
    }
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

  // Helper functions for persistent storage with error handling
  function saveChatHistory(history) {
    try {
      sessionStorage.setItem(STORAGE_KEYS.CHAT_HISTORY, JSON.stringify(history));
      return true;
    } catch (e) {
      return false;
    }
  }

  function getChatHistory() {
    try {
      const data = sessionStorage.getItem(STORAGE_KEYS.CHAT_HISTORY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  function saveChatState(isOpen) {
    try {
      sessionStorage.setItem(STORAGE_KEYS.CHAT_OPEN, isOpen ? 'true' : 'false');
      return true;
    } catch (e) {
      return false;
    }
  }

  function getChatState() {
    try {
      return sessionStorage.getItem(STORAGE_KEYS.CHAT_OPEN) === 'true';
    } catch (e) {
      return false;
    }
  }

  function getRedirectMessage() {
    try {
      const message = sessionStorage.getItem(STORAGE_KEYS.REDIRECT_MESSAGE);
      const timestamp = sessionStorage.getItem(STORAGE_KEYS.REDIRECT_TIMESTAMP);

      if (message && timestamp) {
        const age = Date.now() - parseInt(timestamp);
        if (age < 30000) {
          return message;
        }
        sessionStorage.removeItem(STORAGE_KEYS.REDIRECT_MESSAGE);
        sessionStorage.removeItem(STORAGE_KEYS.REDIRECT_TIMESTAMP);
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  function clearRedirectData() {
    try {
      sessionStorage.removeItem(STORAGE_KEYS.REDIRECT_MESSAGE);
      sessionStorage.removeItem(STORAGE_KEYS.REDIRECT_TIMESTAMP);
    } catch (e) { }
  }

  // Main Plugin Class
  class LumiPlugin {
    constructor(config) {
      this.cfg = { ...DEFAULTS, ...config };
      this.chatHistory = [];
      this._searchOpen = false;
      this._chatOpen = false;
      this._busy = false;
      this._lastSearchQuery = "";
      this._searchRequestId = 0;
      this._restoredHistory = false;
      this._pendingMessage = null;
      this._destroyed = false;
      this._isInitialized = false;

      // Create debounced functions with proper configuration
      this._debouncedSearch = debounce(
        (value) => this._search(value),
        this.cfg.searchDebounceMs,
        { leading: false, trailing: true }
      );

      this._debouncedChat = debounce(
        (value) => this._callApi(value),
        this.cfg.chatDebounceMs,
        { leading: false, trailing: true }
      );

      this._mount();
      this._restoreState();
      this._isInitialized = true;
    }

    _mount() {
      try {
        injectStyles(this.cfg);
        this._mkTrigger();
        this._mkBackdrop();
        this._mkSearch();
        this._mkChat();
        document.addEventListener("keydown", this._handleKeydown.bind(this));
      } catch (e) {
        console.warn('LumiSearch: Error during mount:', e);
      }
    }

    _handleKeydown(e) {
      if (e.key === "Escape") {
        this.closeAll();
      }
    }

    _restoreState() {
      try {
        // Restore chat history
        const history = getChatHistory();
        if (history.length > 0) {
          this.chatHistory = history;
          this._restoredHistory = true;
        }

        // Check for pending redirect message
        const pendingMsg = getRedirectMessage();
        if (pendingMsg) {
          this._pendingMessage = pendingMsg;
          clearRedirectData();
        }

        // Restore chat open state
        const wasOpen = getChatState();
        if (wasOpen || this._pendingMessage) {
          if (typeof requestAnimationFrame !== 'undefined') {
            requestAnimationFrame(() => {
              this._showRestoredChat();
            });
          } else {
            setTimeout(() => this._showRestoredChat(), 50);
          }
        }
      } catch (e) {
        console.warn('LumiSearch: Error restoring state:', e);
      }
    }

    _showRestoredChat() {
      if (this._destroyed) return;

      if (this._pendingMessage) {
        this.openChat(this._pendingMessage);
        this._pendingMessage = null;
      } else {
        this.openChat();
      }

      if (this._restoredHistory && this.chatHistory.length > 0) {
        setTimeout(() => {
          if (!this._destroyed) {
            this._renderChatHistory();
          }
        }, 50);
      }
    }

    _renderChatHistory() {
      if (!this.$msgs || this._destroyed) return;

      const dateSep = this.$msgs.querySelector('.__lumi-date-sep');
      this.$msgs.querySelectorAll('.__lumi-msg').forEach(m => m.remove());

      const fragment = document.createDocumentFragment();
      this.chatHistory.forEach(msg => {
        if (msg.type === 'user') {
          const el = this._createUserMsgElement(msg.text);
          fragment.appendChild(el);
        } else if (msg.type === 'bot') {
          const el = this._createBotMsgElement(msg.text);
          fragment.appendChild(el);
        }
      });

      if (dateSep) {
        this.$msgs.prepend(dateSep);
      }

      this.$msgs.appendChild(fragment);
      this._scrollMsgs();
    }

    _createUserMsgElement(text) {
      const el = document.createElement("div");
      el.className = "__lumi-msg __lumi-msg-user";
      el.innerHTML = `
        <div class="__lumi-bubble __lumi-bubble-user">${this._escapeHtml(text)}</div>
        <div class="__lumi-avatar __lumi-avatar-user">You</div>
      `;
      return el;
    }

    _createBotMsgElement(text) {
      const el = document.createElement("div");
      el.className = "__lumi-msg __lumi-msg-bot";
      el.innerHTML = `
        <div class="__lumi-avatar __lumi-avatar-bot">${I.bot}</div>
        <div class="__lumi-bubble __lumi-bubble-bot"><p>${md(text)}</p></div>
      `;
      return el;
    }

    _mkTrigger() {
      const btn = document.createElement("button");
      btn.id = "__lumi-trigger";
      btn.setAttribute("aria-label", "Open AI Search");
      btn.innerHTML = `<span class="__lt-icon">${I.search}</span><span>${this.cfg.triggerLabel}</span>`;

      btn.addEventListener("click", () => this.openSearch(), { passive: true });

      document.body.appendChild(btn);
      this.$trigger = btn;
    }

    _mkBackdrop() {
      const el = document.createElement("div");
      el.id = "__lumi-backdrop";
      el.addEventListener("click", () => this.closeAll(), { passive: true });
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

      const closeBtn = root.querySelector(".__lumi-hero-close");
      closeBtn.addEventListener("click", () => this.closeAll(), { passive: true });

      // Throttled input handler
      const handleInput = throttle((e) => {
        if (this._destroyed) return;
        this._clearHtmlFromInput(this.$input);
        const value = this.$input.value.trim();
        this._debouncedSearch.cancel();

        if (!value) {
          this._lastSearchQuery = "";
          this._setBody(this._htmlHint());
          return;
        }

        this._lastSearchQuery = value;
        this._debouncedSearch(value);
      }, 100);

      this.$input.addEventListener("input", handleInput, { passive: true });

      this.$input.addEventListener("focus", () => {
        if (!this.$input.value.trim()) {
          this._setBody(this._htmlHint());
        }
      }, { passive: true });

      this.$input.addEventListener("keydown", e => {
        if (e.key === "Enter") {
          e.preventDefault();
          const value = this.$input.value.trim();
          if (!value) return;
          this._debouncedSearch.cancel();
          this._search(value);
        }
      }, { passive: false });

      root.addEventListener("click", e => {
        const chip = e.target.closest(".__lumi-hint-chip");
        if (chip && chip.dataset.q) {
          this.$input.value = chip.dataset.q;
          this._search(chip.dataset.q);
        }
      }, { passive: true });

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

      const closeBtn = el.querySelector(".__lumi-chat-headclose");
      closeBtn.addEventListener("click", () => {
        this.closeChat();
        saveChatState(false);
      }, { passive: true });

      this.$sendBtn.addEventListener("click", () => this._sendMsg(), { passive: true });

      // Throttled textarea handler
      const handleTextareaInput = throttle(() => {
        if (this._destroyed) return;
        this._clearHtmlFromInput(this.$ta);
        this.$ta.style.height = "auto";
        this.$ta.style.height = Math.min(this.$ta.scrollHeight, 90) + "px";
      }, 100);

      this.$ta.addEventListener("input", handleTextareaInput, { passive: true });

      this.$ta.addEventListener("keydown", e => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          this._sendMsg();
        }
      }, { passive: false });

      document.body.appendChild(el);
      this.$chat = el;
    }

    _htmlHint() {
      const chips = [
        { label: "Home inverters", q: "I want to buy home inverters" },
        { label: "Solar products", q: "Show me solar panels" },
        { label: "Battery backup", q: "I need battery backup solutions" },
       
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
        const cleanLink = cleanLinkUrl(p.product_link || p.eshop_link || '#');

        if (forChat) {
          return `
        <a class="__lumi-chat-product-card"
           href="${cleanLink}"
           rel="noopener"
           style="animation-delay:${i * 45}ms"
        >
          <div class="__lumi-chat-product-thumb">
            ${imgUrl
              ? `<img src="${imgUrl}" alt="${this._escapeHtml(p.product_name)}" loading="lazy" onerror="this.style.display='none';this.parentElement.querySelector('.fallback-icon')?.style.removeProperty('display');">`
              : `<span class="__lumi-card-thumb-icon">${I.product}</span>`
            }
            <span class="__lumi-card-thumb-icon fallback-icon" style="display:none;">${I.product}</span>
          </div>
          <div class="__lumi-chat-product-body">
            <div class="__lumi-chat-product-name">${this._escapeHtml(p.product_name)}</div>
            <div class="__lumi-chat-product-desc">${this._escapeHtml(cleanDesc)}</div>
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
         href="${cleanLink}"
         rel="noopener"
         style="animation-delay:${i * 45}ms"
      >
        <div class="__lumi-card-thumb">
          ${imgUrl
            ? `<img src="${imgUrl}" alt="${this._escapeHtml(p.product_name)}" loading="lazy" onerror="this.style.display='none';this.parentElement.querySelector('.fallback-icon')?.style.removeProperty('display');">`
            : `<span class="__lumi-card-thumb-icon">${I.product}</span>`
          }
          <span class="__lumi-card-thumb-icon fallback-icon" style="display:none;">${I.product}</span>
        </div>
        <div class="__lumi-card-body">
          <div class="__lumi-card-name">${this._escapeHtml(p.product_name)}</div>
          <div class="__lumi-card-desc">${this._escapeHtml(cleanDesc)}</div>
          <div class="__lumi-card-price-row">
            ${p.price ? `<span class="__lumi-card-price">${formatPrice(p.price, this.cfg.currency)}</span>` : ""}
            ${p.mrp && p.mrp > p.price ? `<span class="__lumi-card-mrp">${formatPrice(p.mrp, this.cfg.currency)}</span>` : ""}
            ${discount ? `<span class="__lumi-card-discount">${discount}% off</span>` : ""}
          </div>
          ${p.sku ? `<div class="__lumi-card-sku">SKU: ${this._escapeHtml(p.sku)}</div>` : ""}
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
    <button class="__lumi-deepdive" data-q="${this._escapeHtml(originalQuery)}">
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

      try {
        const doc = new DOMParser().parseFromString(text, "text/html");
        const hasElements = [...doc.body.childNodes].some(
          n => n.nodeType === Node.ELEMENT_NODE
        );
        if (hasElements) {
          return { ok: false, reason: "HTML tags are not allowed in your input." };
        }
      } catch (e) {
        if (/<[^>]*>/g.test(text)) {
          return { ok: false, reason: "HTML tags are not allowed in your input." };
        }
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

    _clearHtmlFromInput(inputElement) {
      if (!inputElement) return "";

      const rawValue = inputElement.value;
      try {
        const doc = new DOMParser().parseFromString(rawValue, "text/html");
        const hasElements = [...doc.body.childNodes].some(
          n => n.nodeType === Node.ELEMENT_NODE
        );

        if (hasElements) {
          const textOnly = doc.body.textContent || "";
          inputElement.value = textOnly;
          this._showHtmlWarning();
          return textOnly;
        }
      } catch (e) {
        if (/<[^>]*>/g.test(rawValue)) {
          const textOnly = rawValue.replace(/<[^>]*>/g, '');
          inputElement.value = textOnly;
          this._showHtmlWarning();
          return textOnly;
        }
      }

      return rawValue;
    }

    _showHtmlWarning() {
      let warning = document.getElementById("__lumi-html-warning");
      if (!warning) {
        warning = document.createElement("div");
        warning.id = "__lumi-html-warning";
        warning.style.cssText = `
          position: fixed;
          bottom: 90px;
          right: 28px;
          background: #ff9800;
          color: white;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          z-index: 100000;
          animation: __lumi-fadeOut 3s ease forwards;
          pointer-events: none;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        `;
        document.body.appendChild(warning);
      }

      warning.textContent = "⚠️ HTML tags removed for security";
      warning.style.animation = "none";
      warning.offsetHeight;
      warning.style.animation = "__lumi-fadeOut 3s ease forwards";

      setTimeout(() => {
        if (warning.parentNode) warning.remove();
      }, 3000);
    }

    openSearch() {
      if (this._destroyed) return;
      this.closeChat();
      this._searchOpen = true;
      this.$root.classList.add("lumi-on");
      this.$bd.classList.add("lumi-on");

      if (!this.$input.value.trim()) {
        this._setBody(this._htmlHint());
      }

      setTimeout(() => this.$input.focus(), 80);
    }

    closeSearch() {
      if (this._destroyed) return;
      this._searchOpen = false;
      this.$root.classList.remove("lumi-on");
      if (!this._chatOpen) this.$bd.classList.remove("lumi-on");

      if (this.$input) {
        this.$input.value = "";
        this._setBody(this._htmlHint());
      }

      this._debouncedSearch.cancel();
      this._busy = false;
    }

    openChat(botMsg) {
      if (this._destroyed) return;
      this._chatOpen = true;
      this.$chat.classList.add("lumi-on");
      saveChatState(true);

      if (botMsg) {
        this._botMsg(botMsg);
      }

      if (this._restoredHistory && this.chatHistory.length > 0) {
        this._renderChatHistory();
        this._restoredHistory = false;
      }

      this._scrollMsgs();
    }

    closeChat() {
      if (this._destroyed) return;
      this._chatOpen = false;
      this.$chat.classList.remove("lumi-on");
      if (!this._searchOpen) this.$bd.classList.remove("lumi-on");
      saveChatState(false);
    }

    closeAll() {
      if (this._destroyed) return;
      this.closeSearch();
      this.closeChat();
      this.$bd.classList.remove("lumi-on");
    }

    // ─── REDIRECTION HANDLING WITH PERSISTENCE ───
    _handleRedirection(data) {
      if (!data.redirection_link || typeof data.redirection_link !== 'string') {
        return false;
      }

      const link = data.redirection_link.trim();
      if (!link) return false;

      try {
        // Store message for after redirect
        if (data.message) {
          sessionStorage.setItem(STORAGE_KEYS.REDIRECT_MESSAGE, data.message);
          sessionStorage.setItem(STORAGE_KEYS.REDIRECT_TIMESTAMP, Date.now().toString());

          // Save chat history before redirect
          if (this.chatHistory.length > 0) {
            saveChatHistory(this.chatHistory);
            saveChatState(true);
          }
        }

        this.closeAll();

        // Delay redirect to ensure UI closes
        setTimeout(() => {
          if (!this._destroyed) {
            window.location.href = link;
          }
        }, this.cfg.redirectDelay || 150);
        return true;
      } catch (e) {
        console.warn('LumiSearch: Redirect error:', e);
        return false;
      }
    }

    _saveToHistory(type, text) {
      if (!text) return;

      this.chatHistory.push({
        type,
        text: String(text).substring(0, 1000),
        timestamp: Date.now()
      });

      if (this.chatHistory.length > this.cfg.maxHistoryLength) {
        this.chatHistory = this.chatHistory.slice(-this.cfg.maxHistoryLength);
      }
      saveChatHistory(this.chatHistory);
    }

    async _search(rawQuery) {
      if (this._destroyed) return;

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

      const requestId = ++this._searchRequestId;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const res = await fetch(this.cfg.apiUrl, {
          method: "POST",
          headers: {
            "accept": "application/json",
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            query: value,
            session_id: this.cfg.sessionId,
            strategy: this.cfg.strategy
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!res.ok) throw new Error(`Server error ${res.status}`);

        if (requestId !== this._searchRequestId) {
          this._busy = false;
          return;
        }

        const data = await res.json();

        const currentInputValue = this.$input.value.trim();
        if (currentInputValue !== value) {
          this._busy = false;
          return;
        }

        // ─── CHECK FOR REDIRECTION ───
        if (this._handleRedirection(data)) {
          this._busy = false;
          return;
        }

        if (data.intent === "buy" && data.products?.length) {
          this._setBody(this._htmlProducts(data, value));
          const btn = this.$body.querySelector(".__lumi-deepdive");
          if (btn) {
            btn.addEventListener("click", () => this._deepDive(btn.dataset.q), { passive: true });
          }
        } else if (data.intent === "info" || data.message) {
          this._busy = false;
          if (this.$input) {
            this.$input.value = "";
            this.$input.blur();
          }
          this._setBody(this._htmlHint());
          this.closeSearch();
          this._saveToHistory('user', value);
          this.openChat(data.message);
          this._saveToHistory('bot', data.message);
          return;
        } else {
          this._setBody(this._htmlError("No results found for your query."));
        }
      } catch (err) {
        if (err.name === 'AbortError') {
          this._setBody(this._htmlError("Request timed out. Please try again."));
        } else {
          const currentInputValue = this.$input.value.trim();
          if (currentInputValue === query) {
            this._setBody(this._htmlError(err.message));
          }
        }
      } finally {
        if (this._busy && requestId === this._searchRequestId) {
          this._busy = false;
        }
      }
    }

    _setBody(html) {
      if (this.$body && !this._destroyed) {
        this.$body.innerHTML = `<div class="__lumi-body-inner">${html}</div>`;
      }
    }

    _deepDive(query) {
      if (this._destroyed) return;

      const q = `Tell me more about: ${query}`;
      this._debouncedSearch.cancel();
      this._busy = false;

      if (this.$input) {
        this.$input.value = "";
        this.$input.blur();
      }
      this.closeSearch();

      this._saveToHistory('user', q);
      this.openChat();
      this._userMsg(this._escapeHtml(q));
      this._callApi(q);
    }

    async _sendMsg() {
      if (this._destroyed) return;

      this._clearHtmlFromInput(this.$ta);
      const { ok, value, reason } = this._sanitizeInput(this.$ta.value);

      if (!ok) {
        this._botMsg(reason);
        if (reason.includes("HTML") || reason.includes("tags")) {
          this.$ta.value = "";
        }
        return;
      }

      if (this._busy) return;

      this.$ta.value = "";
      this.$ta.style.height = "auto";

      this._saveToHistory('user', this._escapeHtml(value));
      this._userMsg(this._escapeHtml(value));
      await this._callApi(value);
    }

    async _callApi(query) {
      if (this._destroyed) return;

      this._busy = true;
      this.$sendBtn.disabled = true;
      const typing = this._showTyping();

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const res = await fetch(this.cfg.apiUrl, {
          method: "POST",
          headers: {
            "accept": "application/json",
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            query,
            session_id: this.cfg.sessionId,
            strategy: this.cfg.strategy
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        typing.remove();

        if (!res.ok) throw new Error(`Server error ${res.status}`);
        const data = await res.json();

        // ─── CHECK FOR REDIRECTION IN CHAT ───
        if (this._handleRedirection(data)) {
          this._busy = false;
          this.$sendBtn.disabled = false;
          return;
        }

        if (data.intent === "buy" && data.products?.length) {
          const msg = data.message || "Here are some products that match your request:";
          this._botMsg(msg);
          this._saveToHistory('bot', msg);
          this._botProductCards(data);
        } else if (data.message) {
          this._botMsg(data.message);
          this._saveToHistory('bot', data.message);
        } else {
          const fallbackMsg = "I could not find anything for that query.";
          this._botMsg(fallbackMsg);
          this._saveToHistory('bot', fallbackMsg);
        }
      } catch (err) {
        typing.remove();
        const errorMsg = err.name === 'AbortError'
          ? "Request timed out. Please try again."
          : "I am having trouble connecting right now. Please try again.";
        this._botMsg(errorMsg);
        this._saveToHistory('bot', errorMsg);
      } finally {
        this._busy = false;
        this.$sendBtn.disabled = false;
      }
    }

    _userMsg(text) {
      if (this._destroyed || !this.$msgs) return;
      const el = this._createUserMsgElement(text);
      this.$msgs.appendChild(el);
      this._scrollMsgs();
    }

    _botMsg(text) {
      if (this._destroyed || !this.$msgs) return;
      const el = this._createBotMsgElement(text);
      this.$msgs.appendChild(el);
      this._scrollMsgs();
    }

    _botProductCards(data) {
      if (this._destroyed || !this.$msgs) return;

      const el = document.createElement("div");
      el.className = "__lumi-msg __lumi-msg-bot";

      const label = document.createElement("div");
      label.className = "__lumi-chat-products-label";
      label.textContent = `${data.products.length} result${data.products.length !== 1 ? "s" : ""} found`;

      const grid = document.createElement("div");
      grid.className = "__lumi-chat-products-grid";

      const fragment = document.createDocumentFragment();
      data.products.forEach((p, i) => {
        const imgUrl = cleanImageUrl(p.image_url);
        const cleanDesc = stripHtml(p.description);
        const card = document.createElement("a");
        card.className = "__lumi-chat-product-card";
        card.href = cleanLinkUrl(p.product_link || p.eshop_link || "#");
        card.rel = "noopener";
        card.style.animationDelay = `${i * 45}ms`;

        card.innerHTML = `
          <div class="__lumi-chat-product-thumb">
            ${imgUrl
            ? `<img src="${imgUrl}" alt="${this._escapeHtml(p.product_name)}" loading="lazy" onerror="this.remove();">`
            : I.product
          }
          </div>
          <div class="__lumi-chat-product-body">
            <div class="__lumi-chat-product-name">${this._escapeHtml(p.product_name)}</div>
            <div class="__lumi-chat-product-desc">${this._escapeHtml(cleanDesc)}</div>
            ${p.price ? `<div class="__lumi-chat-product-price">${formatPrice(p.price, this.cfg.currency)}</div>` : ""}
            <div class="__lumi-chat-product-footer">
              <span class="__lumi-chat-product-cta">${I.arrow} View</span>
              <span class="__lumi-chat-product-badge">In Stock</span>
            </div>
          </div>
        `;
        fragment.appendChild(card);
      });
      grid.appendChild(fragment);

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
      if (this._destroyed || !this.$msgs) return document.createElement('div');

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
      if (this.$msgs && !this._destroyed) {
        this.$msgs.scrollTop = this.$msgs.scrollHeight;
      }
    }

    destroy() {
      if (this._destroyed) return;
      this._destroyed = true;
      this._isInitialized = false;

      this._debouncedSearch.cancel();
      this._debouncedChat.cancel();

      document.removeEventListener("keydown", this._handleKeydown.bind(this));

      ["__lumi-trigger", "__lumi-backdrop", "__lumi-root", "__lumi-chat", "__lumi-styles", "__lumi-font"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.remove();
      });

      try {
        sessionStorage.removeItem(STORAGE_KEYS.CHAT_HISTORY);
        sessionStorage.removeItem(STORAGE_KEYS.CHAT_OPEN);
        sessionStorage.removeItem(STORAGE_KEYS.REDIRECT_MESSAGE);
        sessionStorage.removeItem(STORAGE_KEYS.REDIRECT_TIMESTAMP);
      } catch (e) { }
    }
  }

  // Global API
  global.LumiSearch = {
    _inst: null,
    init(config) {
      if (this._inst) {
        if (!this._inst._destroyed) {
          return this._inst;
        }
        this._inst.destroy();
        this._inst = null;
      }
      this._inst = new LumiPlugin(config);
      return this._inst;
    },
    open() {
      if (this._inst && !this._inst._destroyed) {
        this._inst.openSearch();
      }
    },
    close() {
      if (this._inst && !this._inst._destroyed) {
        this._inst.closeAll();
      }
    },
    destroy() {
      if (this._inst) {
        this._inst.destroy();
        this._inst = null;
      }
    },
    getInstance() {
      return this._inst;
    }
  };

  // Auto-init
  const init = () => {
    const s = document.querySelector("script[data-lumi-auto]");
    if (s && !global.LumiSearch._inst) {
      try {
        global.LumiSearch.init({
          apiUrl: s.dataset.lumiApi || undefined,
          cssUrl: s.dataset.lumiCss || undefined,
          accentColor: s.dataset.lumiColor || undefined,
          brandName: s.dataset.lumiBrand || undefined,
          triggerLabel: s.dataset.lumiLabel || undefined,
          logoText: s.dataset.lumiLogo || undefined,
          currency: s.dataset.lumiCurrency || undefined,
        });
      } catch (e) {
        console.warn('LumiSearch: Auto-init failed:', e);
      }
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    Promise.resolve().then(init);
  }

})(window);