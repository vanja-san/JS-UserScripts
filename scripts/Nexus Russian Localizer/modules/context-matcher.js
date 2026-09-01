/**
 * ContextMatcher — contextual translation rules via native CSS selectors.
 *
 * Uses element.matches() for reliable, fast CSS selector matching.
 * Supports ANY valid CSS selector — no custom parsing needed.
 *
 * Format in translations.js contextual:
 *   "text": { "css-selector": "translation", ... }
 *
 * Matching logic:
 *   1. Find all rules for the given text
 *   2. For each rule, check element.matches(selector)
 *   3. Return first matching translation
 */
class ContextMatcher {
  /** @type {Map<string, Array<{selector: string, translation: string}>>} */
  #rules;

  /** @type {WeakMap<Element, Map<string, string>>} element → text → translation */
  #matchCache;

  constructor(translations) {
    this.#rules = new Map();
    this.#matchCache = new WeakMap();
    this.#build(translations?.contextual);
  }

  /**
   * Build rules from translations.contextual object.
   * @param {Record<string, Record<string, string>>|undefined} contextual
   */
  #build(contextual) {
    if (!contextual || typeof contextual !== 'object') return;

    for (const [text, selectors] of Object.entries(contextual)) {
      if (typeof text !== 'string' || !selectors || typeof selectors !== 'object') continue;

      const rules = [];
      for (const [selector, translation] of Object.entries(selectors)) {
        if (typeof selector !== 'string' || typeof translation !== 'string') continue;
        if (!selector || !translation) continue;

        // Skip unsafe selectors
        if (/javascript:|on\w+\s*=|<\w|expression\(/i.test(selector)) {
          console.warn('[NRL] Unsafe selector skipped:', selector);
          continue;
        }

        // Validate selector syntax
        if (!this.#isValidSelector(selector)) {
          console.warn('[NRL] Invalid CSS selector skipped:', selector);
          continue;
        }

        rules.push({ selector, translation });
      }

      if (rules.length > 0) {
        this.#rules.set(text, rules);
      }
    }
  }

  /**
   * Find contextual translation for text within an element.
   * @param {string} text - the text to translate
   * @param {Element} element - the element containing the text
   * @returns {{translation: string, context: string} | null}
   */
  findTranslation(text, element) {
    if (!text || !element || typeof text !== 'string') return null;

    const rules = this.#rules.get(text);
    if (!rules) return null;

    // Check cache
    const cached = this.#matchCache.get(element);
    if (cached?.has(text)) {
      const t = cached.get(text);
      return t ? { translation: t, context: 'cached' } : null;
    }

    // Try each rule — first match wins
    for (const rule of rules) {
      try {
        if (element.matches(rule.selector)) {
          this.#cacheResult(element, text, rule.translation);
          return { translation: rule.translation, context: rule.selector };
        }
      } catch {
        // Invalid selector at runtime — skip
      }
    }

    this.#cacheResult(element, text, null);
    return null;
  }

  /** Number of loaded rules (for debugging). */
  get ruleCount() {
    return this.#rules.size;
  }

  // ── Internal ──

  #cacheResult(element, text, translation) {
    let map = this.#matchCache.get(element);
    if (!map) {
      map = new Map();
      this.#matchCache.set(element, map);
    }
    if (map.size > 50) {
      map.delete(map.keys().next().value);
    }
    map.set(text, translation);
  }

  #isValidSelector(selector) {
    try {
      document.querySelector(selector);
      return true;
    } catch {
      return false;
    }
  }
}

window.ContextMatcher = ContextMatcher;
