// ============================================
// Translation Engine - Optimized, incremental, with mutation debouncing and duplicate protection
// ============================================
class TranslationEngine {
  #cache;
  #contextMatcher;
  #processedElements;
  #processedTextNodes;
  #observer;
  #debounceTimer;
  #pendingNodes;

  constructor(cache) {
    this.#cache = cache;
    this.#contextMatcher = null;
    this.#processedElements = new WeakSet();
    this.#processedTextNodes = new WeakSet();
    this.#pendingNodes = new Set();
    this.#debounceTimer = null;
    this.#observer = null;
  }

  set contextMatcher(value) {
    this.#contextMatcher = value;
  }

  // Check if element should be ignored
  #shouldIgnoreElement(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;
    const classList = element.classList;
    if (!classList || classList.length === 0) return false;
    for (const cls of classList) {
      if (window.IGNORED_CLASSES.has(cls)) {
        // Always translate classes override
        if (!window.ALWAYS_TRANSLATE_CLASSES.has(cls)) {
          return true;
        }
      }
    }
    return false;
  }

  // Translate a single text node
  async translateTextNode(node) {
    if (this.#processedTextNodes.has(node)) return false;
    const originalText = node.textContent;
    let text = originalText?.trim();
    if (!text || text.length > 5000) return false;

    // Skip if already Cyrillic with no Latin
    if (window.isCyrillic(text)) return false;

    // Skip numeric-only
    if (/^\d+$/.test(text)) return false;

    const parent = node.parentElement;
    if (parent && this.#shouldIgnoreElement(parent)) return false;

    // 1. Dynamic templates
    const dynamicResult = await this.applyDynamicTemplates(
      originalText,
      parent,
    );
    if (dynamicResult.replaced) {
      node.textContent = dynamicResult.text;
      this.#processedTextNodes.add(node);
      return true;
    }

    // 2. Direct dictionary
    let translated = window.NRL_TRANSLATIONS?.main[text];
    if (translated) {
      node.textContent = translated;
      this.#processedTextNodes.add(node);
      await this.#cache.cacheTranslation(text, "", translated);
      return true;
    }

    // 3. Contextual
    if (parent) {
      const contextual = this.#contextMatcher?.findTranslation(text, parent);
      if (contextual) {
        node.textContent = contextual.translation;
        this.#processedTextNodes.add(node);
        await this.#cache.cacheTranslation(
          text,
          contextual.context,
          contextual.translation,
        );
        return true;
      }
    }

    // 4. Cache lookup
    const cached = await this.#cache.getCachedTranslation(text);
    if (cached) {
      node.textContent = cached;
      this.#processedTextNodes.add(node);
      return true;
    }

    return false;
  }

  // Translate element attributes
  async translateAttributes(element) {
    const attrs = window.NRL_TRANSLATIONS?.translatableAttributes || [];
    for (const attr of attrs) {
      const value = element.getAttribute(attr);
      if (!value || value.length > 500) continue;
      if (window.isCyrillic(value)) continue;

      let translated = window.NRL_TRANSLATIONS?.main[value];
      if (!translated) {
        const contextual = this.#contextMatcher?.findTranslation(
          value,
          element,
        );
        if (contextual) translated = contextual.translation;
      }
      if (!translated) {
        translated = await this.#cache.getCachedTranslation(value);
      }
      if (translated && translated !== value) {
        element.setAttribute(attr, translated);
      }
    }
  }

  // Translate an element (recursive but with WeakSet protection)
  async translateElement(element) {
    if (this.#processedElements.has(element)) return;
    if (this.#shouldIgnoreElement(element)) return;

    // Special handling for time elements
    if (element.tagName === "TIME") {
      await this.handleTimeElement(element);
    }

    await this.translateAttributes(element);

    // Process child nodes
    const children = element.childNodes;
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (child.nodeType === Node.TEXT_NODE) {
        await this.translateTextNode(child);
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        await this.translateElement(child);
      }
    }

    this.#processedElements.add(element);
  }

  async handleTimeElement(element) {
    const text = element.textContent.trim();
    if (!text) return;
    if (window.isCyrillic(text)) return;

    // Apply date formatter
    const formatted = window.dateFormatter.format(text);
    if (formatted !== text) {
      element.textContent = formatted;
      return;
    }

    const translated = window.NRL_TRANSLATIONS?.main[text];
    if (translated) {
      element.textContent = translated;
    }
  }

  async applyDynamicTemplates(text, element) {
    if (text.length > 1000) return { text, replaced: false };
    if (!/\d/.test(text)) return { text, replaced: false };

    const cacheKey = `template_${text}`;
    const cached = window.templateCache.get(cacheKey);
    if (cached) return cached;

    let newText = text;
    let replaced = false;

    // Apply date formatting first
    const dateFormatted = window.dateFormatter.format(newText);
    if (dateFormatted !== newText) {
      newText = dateFormatted;
      replaced = true;
    }

    for (const template of window.DYNAMIC_TEMPLATES) {
      if (template.pattern.test(newText)) {
        if (template.replacer) {
          newText = newText.replace(template.pattern, template.replacer);
          replaced = true;
        } else if (template.replacement) {
          newText = newText.replace(template.pattern, template.replacement);
          replaced = true;
        }
      }
    }

    const result = { text: newText, replaced };
    if (replaced && text.length < 200) {
      window.templateCache.set(cacheKey, result);
    }
    return result;
  }

  // Process a batch of elements
  async translateElementBatch(elements) {
    const batchSize = window.CONFIG?.BATCH_SIZE || 30;
    const delay = window.CONFIG?.BATCH_DELAY || 8;
    for (let i = 0; i < elements.length; i += batchSize) {
      const batch = elements.slice(i, i + batchSize);
      for (const el of batch) {
        if (el.nodeType === Node.ELEMENT_NODE) {
          await this.translateElement(el);
        } else if (el.nodeType === Node.TEXT_NODE) {
          await this.translateTextNode(el);
        }
      }
      if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // Incremental translation of visible area first
  async translateVisible() {
    const visibleElements = [];
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_ELEMENT,
      {
        acceptNode: (node) => {
          const rect = node.getBoundingClientRect();
          const isVisible =
            rect.width > 0 &&
            rect.height > 0 &&
            ((rect.top < window.innerHeight && rect.bottom > 0) ||
              node === document.body);
          return isVisible ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
        },
      },
    );
    let node;
    let count = 0;
    while ((node = walker.nextNode()) && count < 500) {
      visibleElements.push(node);
      count++;
    }
    await this.translateElementBatch(visibleElements);
  }

  observeMutations() {
    this.#observer = new MutationObserver((mutations) => {
      if (this.#debounceTimer) clearTimeout(this.#debounceTimer);
      this.#debounceTimer = setTimeout(() => {
        this.#processMutations(mutations);
        this.#debounceTimer = null;
      }, window.CONFIG?.MUTATION_DEBOUNCE || 50);
    });

    const options = window.CONFIG?.MUTATION_OBSERVER_OPTIONS || {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [
        "title",
        "placeholder",
        "alt",
        "data-tooltip",
        "aria-label",
        "value",
      ],
      characterData: true,
    };
    this.#observer.observe(document.body, options);
  }

  async #processMutations(mutations) {
    const nodesToProcess = new Set();
    for (const mutation of mutations) {
      if (mutation.type === "childList") {
        for (const node of mutation.addedNodes) {
          if (
            node.nodeType === Node.ELEMENT_NODE ||
            node.nodeType === Node.TEXT_NODE
          ) {
            nodesToProcess.add(node);
          }
        }
      } else if (mutation.type === "attributes" && mutation.target) {
        nodesToProcess.add(mutation.target);
      } else if (mutation.type === "characterData" && mutation.target) {
        nodesToProcess.add(mutation.target);
      }
    }
    const array = Array.from(nodesToProcess).slice(0, 300);
    await this.translateElementBatch(array);
  }

  cleanup() {
    if (this.#observer) {
      this.#observer.disconnect();
      this.#observer = null;
    }
    if (this.#debounceTimer) {
      clearTimeout(this.#debounceTimer);
      this.#debounceTimer = null;
    }
    this.#processedElements = new WeakSet();
    this.#processedTextNodes = new WeakSet();
  }
}

window.TranslationEngine = TranslationEngine;
