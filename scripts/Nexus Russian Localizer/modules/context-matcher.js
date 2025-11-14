// Класс для компиляции и сопоставления контекстных правил
class ContextMatcher {
  #translations;
  #rulesCache;

  constructor(translations) {
    this.#translations = translations;
    this.#rulesCache = new Map();
    this.buildRulesCache();
  }

  buildRulesCache() {
    for (const [text, contexts] of Object.entries(this.#translations.contextual)) {
      const rules = Object.entries(contexts).map(([context, translation]) => ({
        context,
        translation,
        compiledSelector: this.compileSelector(context)
      }));
      this.#rulesCache.set(text, rules);
    }
  }

  compileSelector(selector) {
    // Improved selector parsing to handle more complex selectors
    return selector.split('>').map(part => {
      const trimmedPart = part.trim();
      const spaceIndex = trimmedPart.indexOf(' ');
      if (spaceIndex !== -1) {
        // Handle descendant selectors (space separated)
        return { tag: trimmedPart.split(' ')[0].trim(), class: null, isDescendant: true };
      }

      const parts = trimmedPart.split('.');
      const tag = parts[0].trim();
      const cls = parts.slice(1).join('.'); // handle multiple classes properly

      return { tag, class: cls || null };
    });
  }

  match(element, compiledSelector) {
    if (!element || !compiledSelector || compiledSelector.length === 0) {
      return false;
    }

    // Create a more specific cache key to avoid conflicts
    const cacheKey = `${element.tagName}_${element.classList ? Array.from(element.classList).join('_') : ''}_${compiledSelector.map(s => s.tag + (s.class ? '.' + s.class : '')).join('>')}_${element.textContent?.substring(0, 20) || ''}`;

    if (window.contextCheckCache?.has(cacheKey)) {
      return window.contextCheckCache.get(cacheKey);
    }

    // Check if the last selector part matches the current element
    const lastSelector = compiledSelector[compiledSelector.length - 1];
    if (element.tagName.toLowerCase() !== lastSelector.tag.toLowerCase()) {
      if (window.contextCheckCache) window.contextCheckCache.set(cacheKey, false);
      return false;
    }

    // Check class if specified
    if (lastSelector.class && element.classList && !element.classList.contains(lastSelector.class)) {
      if (window.contextCheckCache) window.contextCheckCache.set(cacheKey, false);
      return false;
    }

    // Walk up the DOM tree to match parent selectors
    let currentElement = element.parentElement;
    for (let i = compiledSelector.length - 2; i >= 0; i--) {
      if (!currentElement) {
        if (window.contextCheckCache) window.contextCheckCache.set(cacheKey, false);
        return false;
      }

      const selector = compiledSelector[i];

      // If this is a descendant selector, walk up until we find a match
      if (selector.isDescendant) {
        let found = false;
        while (currentElement) {
          if (currentElement.tagName.toLowerCase() === selector.tag.toLowerCase()) {
            if (!selector.class || (currentElement.classList && currentElement.classList.contains(selector.class))) {
              found = true;
              break;
            }
          }
          currentElement = currentElement.parentElement;
        }
        if (!found) {
          if (window.contextCheckCache) window.contextCheckCache.set(cacheKey, false);
          return false;
        }
      } else {
        // Direct parent selector
        if (currentElement.tagName.toLowerCase() !== selector.tag.toLowerCase()) {
          if (window.contextCheckCache) window.contextCheckCache.set(cacheKey, false);
          return false;
        }
        if (selector.class && currentElement.classList && !currentElement.classList.contains(selector.class)) {
          if (window.contextCheckCache) window.contextCheckCache.set(cacheKey, false);
          return false;
        }
        currentElement = currentElement.parentElement;
      }
    }

    if (window.contextCheckCache) window.contextCheckCache.set(cacheKey, true);
    return true;
  }

  findTranslation(text, element) {
    if (!text || !element) return null;
    
    const rules = this.#rulesCache.get(text);
    if (!rules) return null;

    try {
      for (const rule of rules) {
        if (this.match(element, rule.compiledSelector)) {
          return {
            translation: rule.translation,
            context: rule.context
          };
        }
      }
    } catch (error) {
      console.warn('Ошибка при поиске контекстного перевода:', error);
      return null;
    }

    return null;
  }
}

window.ContextMatcher = ContextMatcher;