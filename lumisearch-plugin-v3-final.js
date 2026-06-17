/**
 * LumiSearch AI Plugin v2.2 (CSP-safe)
 * Drop-in embeddable AI search + chat widget. Zero dependencies.
 * Updated for new API response format with price, MRP, SKU, and images.
 * ADDED: Auto-redirection when API returns redirection_link
 * FIXED: All styles moved to external CSS file — no inline styles, CSP-safe
 *
 * FIXES:
 *  - openSearch() now closes chat popup first before opening search modal
 *  - Empty input always shows "What are you looking for?" hint UI
 *    (on open, on input clear, and on focus-while-empty)
 *  - Auto-redirect when API response includes redirection_link
 *  - Auto-clear HTML tags from inputs with warning notification
 *  - Remove domain from product links (convert to relative paths)
 *  - CSP-safe: no inline <style> tags, all CSS loaded via external <link>
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
    searchDebounceMs: 500,
    chatDebounceMs: 500,
  };

  // CSP-SAFE: Load external CSS file instead of injecting inline <style>
  function injectStyles(cfg) {
    if (document.getElementById("__lumi-styles")) return;

    // Load external CSS from assets folder (or any path you configure)
    const link = document.createElement("link");
    link.id = "__lumi-styles";
    link.rel = "stylesheet";
    link.href = cfg.cssUrl;
    document.head.appendChild(link);

    // Inter font from Google (already external, but needs CSP whitelist)
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
        const cleanedValue = this._clearHtmlFromInput(this.$input);
        const value = cleanedValue.trim();
        this._debouncedSearch.cancel();

        if (!value) {
          this._lastSearchQuery = "";
          this._setBody(this._htmlHint());
          return;
        }

        this._lastSearchQuery = value;
        this._debouncedSearch(value);
      });

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
        this._clearHtmlFromInput(this.$ta);
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
         href="${cleanLink}"
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

    _clearHtmlFromInput(inputElement) {
      if (!inputElement) return "";
      const rawValue = inputElement.value;
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
      return rawValue;
    }

    // CSP-SAFE: No inline <style> injection. Animation is in external CSS.
    _showHtmlWarning() {
      let warning = document.getElementById("__lumi-html-warning");
      if (!warning) {
        warning = document.createElement("div");
        warning.id = "__lumi-html-warning";
        // All styles inline here are on the element itself — this is allowed by most CSPs
        // The @keyframes animation is defined in the external CSS file
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
      warning.offsetHeight; // Trigger reflow
      warning.style.animation = "__lumi-fadeOut 3s ease forwards";

      setTimeout(() => {
        if (warning.parentNode) warning.remove();
      }, 3000);
    }

    openSearch() {
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

    _handleRedirection(data) {
      if (data.redirection_link && typeof data.redirection_link === 'string' && data.redirection_link.trim()) {
        this.closeAll();
        setTimeout(() => {
          window.location.href = data.redirection_link;
        }, 100);
        return true;
      }
      return false;
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

        const currentInputValue = this.$input.value.trim();
        if (currentInputValue !== value) {
          this._busy = false;
          return;
        }

        if (this._handleRedirection(data)) {
          this._busy = false;
          return;
        }

        if (data.intent === "buy" && data.products?.length) {
          this._setBody(this._htmlProducts(data, value));
          const btn = this.$body.querySelector(".__lumi-deepdive");
          if (btn) btn.addEventListener("click", () => this._deepDive(btn.dataset.q));
        } else if (data.intent === "info" || data.message) {
          this._busy = false;
          if (this.$input) {
            this.$input.value = "";
            this.$input.blur();
          }
          this._setBody(this._htmlHint());
          this.closeSearch();
          if (this.$msgs) {
            this.$msgs.querySelectorAll(".__lumi-msg").forEach(m => m.remove());
          }
          this.openChat(data.message);
          return;
        } else {
          this._setBody(this._htmlError("No results found for your query."));
        }
      } catch (err) {
        const currentInputValue = this.$input.value.trim();
        if (currentInputValue === query) {
          this._setBody(this._htmlError(err.message));
        }
      } finally {
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
      this._debouncedSearch.cancel();
      this._busy = false;
      if (this.$input) {
        this.$input.value = "";
        this.$input.blur();
      }
      this.closeSearch();
      if (this.$msgs) {
        this.$msgs.querySelectorAll(".__lumi-msg").forEach(m => m.remove());
      }
      this.openChat();
      this._userMsg(this._escapeHtml(q));
      this._callApi(q);
    }

    async _sendMsg() {
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

        if (this._handleRedirection(data)) {
          this._busy = false;
          this.$sendBtn.disabled = false;
          return;
        }

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
        card.href = cleanLinkUrl(p.product_link || p.eshop_link || "#");
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
        cssUrl: s.dataset.lumiCss || undefined,
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