/**
 * Класс для компиляции и сопоставления контекстных правил
 */
class ContextMatcher {
  #translations;
  #rulesCache;

  /**
   * Создает экземпляр контекстного матчера
   * @param {Object} translations - объект с переводами
   */
  constructor(translations) {
    // Проверяем, что translations - объект
    if (!translations || typeof translations !== 'object') {
      console.warn('Invalid translations object provided to ContextMatcher');
      this.#translations = {};
    } else {
      this.#translations = translations;
    }

    this.#rulesCache = new Map();
    this.buildRulesCache();
  }

  /**
   * Создает кэш правил на основе переводов
   */
  buildRulesCache() {
    if (!this.#translations.contextual) return;

    for (const [text, contexts] of Object.entries(this.#translations.contextual)) {
      // Проверяем безопасность текста
      if (typeof text !== 'string' || text.length > 1000) {
        console.warn('Skipping invalid or too long text in contextual rules:', text);
        continue;
      }

      const rules = Object.entries(contexts).map(([context, translation]) => {
        if (typeof context !== 'string' || typeof translation !== 'string') {
          console.warn('Skipping invalid context or translation:', context, translation);
          return null;
        }
        return {
          context,
          translation,
          compiledSelector: this.compileSelector(context)
        };
      }).filter(rule => rule !== null); // фильтруем невалидные правила

      this.#rulesCache.set(text, rules);
    }
  }

  /**
   * Компилирует селектор в структуру для быстрого сопоставления
   * @param {string} selector - CSS-селектор
   * @returns {Array} массив скомпилированных селекторов
   */
  compileSelector(selector) {
    // Проверяем безопасность селектора
    if (typeof selector !== 'string' || selector.length > 1000) {
      console.warn('Invalid selector provided:', selector);
      return [];
    }

    // Sanitize the selector to prevent injection
    selector = this.sanitizeSelector(selector);

    // Improved selector parsing to handle more complex selectors
    return selector.split('>').map(part => {
      // Ограничиваем количество частей селектора для безопасности
      if (selector.split('>').length > 10) {
        console.warn('Selector is too complex, skipping:', selector);
        return null;
      }

      const trimmedPart = part.trim();
      const spaceIndex = trimmedPart.indexOf(' ');
      if (spaceIndex !== -1) {
        // Handle descendant selectors (space separated)
        const tagPart = trimmedPart.split(' ')[0].trim();
        // Проверяем безопасность тега
        if (!/^[a-zA-Z0-9-]+$/.test(tagPart)) {
          console.warn('Invalid tag in selector:', tagPart);
          return null;
        }
        return { tag: tagPart, class: null, isDescendant: true };
      }

      const parts = trimmedPart.split('.');
      const tag = parts[0].trim();
      // Проверяем безопасность тега
      if (!/^[a-zA-Z0-9-]+$/.test(tag)) {
        console.warn('Invalid tag in selector:', tag);
        return null;
      }
      // Sanitize class names
      const classes = parts.slice(1).map(className => this.sanitizeClassName(className.trim())).filter(Boolean);

      return { tag, classes: classes.length > 0 ? classes : null };
    }).filter(part => part !== null); // фильтруем невалидные части
  }

  /**
   * Sanitizes a CSS selector to prevent injection
   * @param {string} selector - selector to sanitize
   * @returns {string} - sanitized selector
   */
  sanitizeSelector(selector) {
    if (typeof selector !== 'string') return '';

    // Remove potential dangerous characters but preserve valid CSS selectors
    return selector
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Control characters
      .replace(/<|>/g, '') // Angle brackets
      .replace(/\bjavascript:/gi, '') // JavaScript URLs
      .replace(/\bon\w+\s*=/gi, ''); // Event handlers
  }

  /**
   * Sanitizes a class name to prevent injection
   * @param {string} className - class name to sanitize
   * @returns {string} - sanitized class name
   */
  sanitizeClassName(className) {
    if (typeof className !== 'string') return '';

    // Only allow alphanumeric characters, hyphens, and underscores
    return className.replace(/[^a-zA-Z0-9_-]/g, '');
  }

  /**
   * Проверяет соответствие элемента скомпилированному селектору
   * @param {Element} element - элемент для проверки
   * @param {Array} compiledSelector - скомпилированный селектор
   * @returns {boolean} результат проверки
   */
  match(element, compiledSelector) {
    if (!element || !compiledSelector || compiledSelector.length === 0) {
      return false;
    }

    // Ограничиваем количество проверок для производительности
    if (compiledSelector.length > 10) {
      console.warn('Selector is too long, skipping:', compiledSelector);
      return false;
    }

    // Create a more specific cache key to avoid conflicts
    const cacheKey = `${element.tagName}_${element.classList ? Array.from(element.classList).join('_') : ''}_${compiledSelector.map(s => s.tag + (s.class ? '.' + s.class : '')).join('>')}_${element.textContent?.substring(0, 20) || ''}`;

    if (window.contextCheckCache?.has(cacheKey)) {
      return window.contextCheckCache.get(cacheKey);
    }

    // Проверяем количество символов в кэше чтобы избежать переполнения
    if (window.contextCheckCache && window.contextCheckCache.size > 20000) {
      // Очищаем кэш если он слишком большой
      window.contextCheckCache.clear();
    }

    // Check if the last selector part matches the current element
    const lastSelector = compiledSelector[compiledSelector.length - 1];
    if (!lastSelector || element.tagName.toLowerCase() !== lastSelector.tag.toLowerCase()) {
      if (window.contextCheckCache) window.contextCheckCache.set(cacheKey, false);
      return false;
    }

    // Check classes if specified
    if (lastSelector.classes && element.classList) {
      for (const cls of lastSelector.classes) {
        if (!element.classList.contains(cls)) {
          if (window.contextCheckCache) window.contextCheckCache.set(cacheKey, false);
          return false;
        }
      }
    }

    // Walk up the DOM tree to match parent selectors
    let currentElement = element.parentElement;
    for (let i = compiledSelector.length - 2; i >= 0; i--) {
      if (!currentElement) {
        if (window.contextCheckCache) window.contextCheckCache.set(cacheKey, false);
        return false;
      }

      // Ограничиваем глубину поиска для производительности
      if (i < -50) {
        console.warn('Selector depth is too deep, aborting:', element);
        if (window.contextCheckCache) window.contextCheckCache.set(cacheKey, false);
        return false;
      }

      const selector = compiledSelector[i];
      if (!selector) {
        if (window.contextCheckCache) window.contextCheckCache.set(cacheKey, false);
        return false;
      }

      // If this is a descendant selector, walk up until we find a match
      if (selector.isDescendant) {
        let found = false;
        let descendantSearchCount = 0; // ограничиваем количество итераций
        while (currentElement && descendantSearchCount < 20) {
          if (currentElement.tagName.toLowerCase() === selector.tag.toLowerCase()) {
            if (!selector.classes || (currentElement.classList && selector.classes.every(cls => currentElement.classList.contains(cls)))) {
              found = true;
              break;
            }
          }
          currentElement = currentElement.parentElement;
          descendantSearchCount++;
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
        if (selector.classes && currentElement.classList && !selector.classes.every(cls => currentElement.classList.contains(cls))) {
          if (window.contextCheckCache) window.contextCheckCache.set(cacheKey, false);
          return false;
        }
        currentElement = currentElement.parentElement;
      }
    }

    if (window.contextCheckCache) window.contextCheckCache.set(cacheKey, true);
    return true;
  }

  /**
   * Находит перевод для текста с учетом контекста элемента
   * @param {string} text - текст для поиска перевода
   * @param {Element} element - элемент, в котором находится текст
   * @returns {Object|null} объект с переводом и контекстом, или null
   */
  findTranslation(text, element) {
    if (!text || !element || typeof text !== 'string' || text.length > 10000) {
      return null;
    }

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