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
    return selector.split('>').map(part => {
      const [tag, cls] = part.split('.');
      return { tag: tag.trim(), class: cls ? cls.trim() : null };
    });
  }

  match(element, compiledSelector) {
    const cacheKey = `${element.tagName}_${Array.from(element.classList).join('_')}_${compiledSelector.map(s => s.tag + (s.class ? '.' + s.class : '')).join('>')}`;

    if (window.contextCheckCache?.has(cacheKey)) {
      return window.contextCheckCache.get(cacheKey);
    }

    let currentElement = element;
    let result = true;

    for (let i = compiledSelector.length - 1; i >= 0; i--) {
      if (!currentElement) {
        result = false;
        break;
      }

      const { tag, class: cls } = compiledSelector[i];

      if (currentElement.tagName.toLowerCase() !== tag) {
        result = false;
        break;
      }

      if (cls && !currentElement.classList.contains(cls)) {
        result = false;
        break;
      }

      currentElement = currentElement.parentElement;
    }

    if (window.contextCheckCache) {
      window.contextCheckCache.set(cacheKey, result);
    }
    return result;
  }

  findTranslation(text, element) {
    const rules = this.#rulesCache.get(text);
    if (!rules) return null;

    for (const rule of rules) {
      if (this.match(element, rule.compiledSelector)) {
        return {
          translation: rule.translation,
          context: rule.context
        };
      }
    }

    return null;
  }
}

window.ContextMatcher = ContextMatcher;