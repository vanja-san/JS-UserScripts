// Класс для управления переводом
class TranslationEngine {
  #cache;
  #contextMatcher;
  #processedNodes;
  #processedAttrs;
  #observer;

  constructor(cache) {
    this.#cache = cache;
    this.#contextMatcher = null; // будет инициализирован позже
    this.#processedNodes = new WeakSet();
    this.#processedAttrs = new WeakMap();
    this.#observer = null;
  }

  get cache() {
    return this.#cache;
  }

  set contextMatcher(value) {
    this.#contextMatcher = value;
  }

  async translateAttributes(element) {
    if (!element || !element.attributes) return;

    let processedAttrsForElement = this.#processedAttrs.get(element);
    if (!processedAttrsForElement) {
      processedAttrsForElement = new Set();
      this.#processedAttrs.set(element, processedAttrsForElement);
    }

    const attrs = window.NRL_TRANSLATIONS?.translatableAttributes || [];
    const len = attrs.length;
    for (let i = 0; i < len; i++) {
      const attr = attrs[i];
      if (processedAttrsForElement.has(attr)) continue;

      const value = element.getAttribute(attr);
      if (!value) continue;

      // Быстрая проверка: пропускаем чисто числовые значения и текст на кириллице
      const firstChar = value.charCodeAt(0);
      if ((firstChar >= 48 && firstChar <= 57) || // цифры
          (firstChar >= 1040 && firstChar <= 1103) || firstChar === 1105 || firstChar === 1025) { // кириллица
        if (/^\d+$/.test(value) || 
            ((firstChar >= 1040 && firstChar <= 1103) || firstChar === 1105 || firstChar === 1025) && !/[a-zA-Z]/.test(value)) {
          processedAttrsForElement.add(attr);
          continue;
        }
      }

      // Проверяем кэш первым (наиболее быстрая операция)
      let translated = await this.#cache.getCachedTranslation(value);
      if (!translated) {
        // Проверяем контекстные правила для атрибутов
        const contextualResult = this.#contextMatcher?.findTranslation(value, element);
        if (contextualResult) {
          translated = contextualResult.translation;
          
          // Кэшируем контекстный перевод
          await this.#cache.cacheTranslation(value, contextualResult.context, translated);
        } else {
          // Если не нашли контекстный перевод, используем общий словарь
          translated = window.NRL_TRANSLATIONS?.main[value];
          if (translated) {
            await this.#cache.cacheTranslation(value, '', translated);
          }
        }
      }

      if (translated) {
        element.setAttribute(attr, translated);
        processedAttrsForElement.add(attr);
      }
    }
  }

  async applyDynamicTemplates(text, element) {
    // Быстрая проверка: пропускаем чисто числовые значения
    if (/^[\d\s\.\,\-\+\:\%]+$/.test(text)) {
      return { text, replaced: false };
    }

    // Быстрая проверка: если текст не содержит цифр и английских букв, пропускаем
    if (!/\d|[a-zA-Z]/.test(text)) {
      return { text, replaced: false };
    }

    // Проверим кэш шаблонов
    const cacheKey = `template_${text}`;
    const cached = window.templateCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    let newText = text;
    let replaced = false;

    const templates = window.DYNAMIC_TEMPLATES;
    const len = templates.length;
    for (let i = 0; i < len; i++) {
      const template = templates[i];
      
      // Пропускаем шаблоны, если текст превышает максимальную длину для безопасности
      if (template.maxLength && newText.length > template.maxLength) {
        continue;
      }
      
      // Сбрасываем lastIndex для глобальных регулярных выражений
      template.pattern.lastIndex = 0;

      // Быстрая проверка перед применением regex
      if (template.pattern.test(newText)) {
        template.pattern.lastIndex = 0; // Сбрасываем снова после проверки

        if (template.replacer) {
          newText = newText.replace(template.pattern, (...args) => {
            replaced = true;
            return template.replacer(...args);
          });
        } else if (template.replacement) {
          newText = newText.replace(template.pattern, template.replacement);
          replaced = true;
        }
      }
    }

    const result = { text: newText, replaced };

    // Кэшируем результат
    if (replaced && text.length < 100) {
      window.templateCache.set(cacheKey, result);
    }

    return result;
  }

  async translateTextNode(node) {
    if (this.#processedNodes.has(node)) return false;

    const originalText = node.textContent;
    let text = originalText.trim();
    if (!text) return false;

    // Быстрая проверка: пропускаем чисто числовые значения
    const firstChar = text.charCodeAt(0);
    if (firstChar >= 48 && firstChar <= 57 && /^\d+$/.test(text)) {
      this.#processedNodes.add(node);
      return false;
    }

    // Быстрая проверка: пропускаем комбинации чисел и специальных символов
    if (/^[\d\s\.\,\-\+\:\%]+$/.test(text)) {
      this.#processedNodes.add(node);
      return false;
    }

    // Быстрая проверка: если текст уже на кириллице, пропускаем
    // Проверяем только первый символ, чтобы избежать полного перебора
    const firstCode = text.charCodeAt(0);
    if ((firstCode >= 1040 && firstCode <= 1103) || firstCode === 1105 || firstCode === 1025) { // А-я, Ё, ё
      if (!/[a-zA-Z]/.test(text)) {
        this.#processedNodes.add(node);
        return false;
      }
    }

    const element = node.parentNode;

    // 0. Сначала проверяем кэш (наиболее быстрая операция)
    let cachedTranslation = await this.#cache.getCachedTranslation(text);
    if (cachedTranslation) {
      node.textContent = cachedTranslation;
      this.#processedNodes.add(node);
      return true;
    }

    // 1. Затем проверяем контекстные правила (самые специфичные)
    const contextualResult = this.#contextMatcher?.findTranslation(text, element);
    if (contextualResult) {
      node.textContent = contextualResult.translation;
      await this.#cache.cacheTranslation(text, contextualResult.context, contextualResult.translation);
      this.#processedNodes.add(node);
      return true;
    }

    // 2. Затем проверяем общий словарь
    const directTranslation = window.NRL_TRANSLATIONS?.main[text];
    if (directTranslation) {
      node.textContent = directTranslation;
      await this.#cache.cacheTranslation(text, '', directTranslation);
      this.#processedNodes.add(node);
      return true;
    }

    // 3. Пробуем применить все динамические шаблоны
    const dynamicResult = await this.applyDynamicTemplates(originalText, element);
    if (dynamicResult.replaced) {
      node.textContent = dynamicResult.text;
      this.#processedNodes.add(node);
      return true;
    }

    this.#processedNodes.add(node);
    return false;
  }

  async translateElement(element) {
    if (!element || this.#processedNodes.has(element)) return;

    // Пропускаем элементы с определенными классами
    const elementClasses = element.classList;
    if (elementClasses.length > 0) {
      for (let i = 0; i < elementClasses.length; i++) {
        if (window.IGNORED_CLASSES.has(elementClasses[i])) {
          this.#processedNodes.add(element);
          return;
        }
      }
    }

    // Специальная обработка заголовков
    const tagName = element.tagName.toLowerCase();
    if (tagName >= 'h1' && tagName <= 'h6') {
      if (window.headingElementsCache.has(element)) return;
      window.headingElementsCache.add(element);

      // Для заголовков используем упрощенную логику
      const text = element.textContent.trim();
      if (text && window.NRL_TRANSLATIONS?.main[text]) {
        element.textContent = window.NRL_TRANSLATIONS.main[text];
        await this.#cache.cacheTranslation(text, '', window.NRL_TRANSLATIONS.main[text]);
        this.#processedNodes.add(element);
        return;
      }
    }

    // Переводим атрибуты элемента
    await this.translateAttributes(element);

    // Рекурсивно обходим дочерние элементы
    const childNodes = element.childNodes;
    for (let i = 0; i < childNodes.length; i++) {
      await this.translateNode(childNodes[i]);
    }

    this.#processedNodes.add(element);
  }

  async translateNode(node) {
    if (this.#processedNodes.has(node)) return;

    if (node.nodeType === Node.TEXT_NODE) {
      await this.translateTextNode(node);
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      await this.translateElement(node);
    }
  }

  async translateElementBatch(elements) {
    const batchSize = window.CONFIG?.BATCH_SIZE || 50;
    const batchDelay = window.CONFIG?.BATCH_DELAY || 0;
    
    // Обрабатываем элементы батчами для уменьшения нагрузки на DOM
    for (let i = 0; i < elements.length; i += batchSize) {
      const batch = elements.slice(i, i + batchSize);

      // Выполняем перевод элементов последовательно, а не параллельно, чтобы уменьшить нагрузку
      for (const element of batch) {
        await this.translateNode(element);
      }

      // Даем браузеру возможность обработать другие события
      if (batchDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, batchDelay));
      }
    }
  }

  observeMutations() {
    // Используем дебаунсинг для оптимизации частых вызовов
    let timeoutId = null;
    
    this.#observer = new MutationObserver((mutations) => {
      // Откладываем обработку, чтобы объединить несколько изменений
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      timeoutId = setTimeout(async () => {
        const nodesToProcess = new Set();
        
        for (const mutation of mutations) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE && node.isConnected && node.offsetParent !== null) {
              nodesToProcess.add(node);
              
              // Рекурсивно добавляем дочерние элементы
              const walker = document.createTreeWalker(
                node,
                NodeFilter.SHOW_ELEMENT,
                null,
                false
              );
              
              let child;
              while (child = walker.nextNode()) {
                nodesToProcess.add(child);
              }
            }
          }
        }
        
        // Обрабатываем накопленные узлы
        for (const node of nodesToProcess) {
          await this.translateNode(node);
        }
      }, 100); // 100мс задержка для объединения изменений
    });

    this.#observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  cleanup() {
    if (this.#observer) {
      this.#observer.disconnect();
      this.#observer = null;
    }

    this.#processedAttrs = new WeakMap();
  }

  set observer(value) {
    this.#observer = value;
  }

  get observer() {
    return this.#observer;
  }
}

window.TranslationEngine = TranslationEngine;