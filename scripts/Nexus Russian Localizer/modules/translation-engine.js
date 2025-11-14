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

    // Create a specific cache for this element to handle attribute translation
    let processedAttrsForElement = this.#processedAttrs.get(element);
    if (!processedAttrsForElement) {
      processedAttrsForElement = new Map(); // Use Map instead of Set to store original values
      this.#processedAttrs.set(element, processedAttrsForElement);
    }

    const attrs = window.NRL_TRANSLATIONS?.translatableAttributes || [];
    const len = attrs.length;
    for (let i = 0; i < len; i++) {
      const attr = attrs[i];

      const currentValue = element.getAttribute(attr);
      if (!currentValue) continue;

      // Get the original value if this attribute was previously translated
      const originalValue = processedAttrsForElement.get(attr) || currentValue;

      // Check if the value has changed since last translation
      if (currentValue === processedAttrsForElement.get(`last_${attr}`)) {
        continue; // Skip if value hasn't changed
      }

      // Skip if value appears to be already translated (contains cyrillic)
      const firstChar = currentValue.charCodeAt(0);
      if ((firstChar >= 1040 && firstChar <= 1103) || firstChar === 1105 || firstChar === 1025) {
        if (!/[a-zA-Z]/.test(currentValue)) {
          processedAttrsForElement.set(`last_${attr}`, currentValue);
          continue;
        }
      }

      // Skip if purely numeric
      if (/^\d+$/.test(currentValue)) {
        processedAttrsForElement.set(`last_${attr}`, currentValue);
        continue;
      }

      // Check for direct translation first
      let translated = window.NRL_TRANSLATIONS?.main[currentValue];
      if (!translated) {
        // Check context matching
        const contextualResult = this.#contextMatcher?.findTranslation(currentValue, element);
        if (contextualResult) {
          translated = contextualResult.translation;
        }
      }

      // If no direct translation found, check cache
      if (!translated) {
        translated = await this.#cache.getCachedTranslation(currentValue);
      }

      if (translated && translated !== currentValue) {
        element.setAttribute(attr, translated);
        // Store the original value to detect if it changes back
        processedAttrsForElement.set(attr, originalValue);
        processedAttrsForElement.set(`last_${attr}`, currentValue);
      } else {
        // Update the last value but don't translate
        processedAttrsForElement.set(`last_${attr}`, currentValue);
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

    // Сначала применяем форматирование дат
    const dateFormatted = window.dateFormatter.format(newText);
    if (dateFormatted !== newText) {
      newText = dateFormatted;
      replaced = true;
    }

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
    // Don't use WeakSet for text nodes as they get recreated frequently
    // Instead, compare the text content to see if it's been processed
    const originalText = node.textContent;
    let text = originalText.trim();
    if (!text) return false;

    // Быстрая проверка: пропускаем чисто числовые значения
    const firstChar = text.charCodeAt(0);
    if (firstChar >= 48 && firstChar <= 57 && /^\d+$/.test(text)) {
      return false;
    }

    // Быстрая проверка: пропускаем комбинации чисел и специальных символов
    if (/^[\d\s\.\,\-\+\:\%]+$/.test(text)) {
      return false;
    }

    // Быстрая проверка: если текст уже на кириллице, пропускаем
    // Проверяем только первый символ, чтобы избежать полного перебора
    const firstCode = text.charCodeAt(0);
    if ((firstCode >= 1040 && firstCode <= 1103) || firstCode === 1105 || firstCode === 1025) { // А-я, Ё, ё
      if (!/[a-zA-Z]/.test(text)) {
        return false;
      }
    }

    const element = node.parentNode;

    // 1. Затем проверяем контекстные правила (самые специфичные)
    const contextualResult = this.#contextMatcher?.findTranslation(text, element);
    if (contextualResult) {
      node.textContent = contextualResult.translation;
      await this.#cache.cacheTranslation(text, contextualResult.context, contextualResult.translation);
      return true;
    }

    // 2. Затем проверяем общий словарь
    const directTranslation = window.NRL_TRANSLATIONS?.main[text];
    if (directTranslation) {
      node.textContent = directTranslation;
      await this.#cache.cacheTranslation(text, '', directTranslation);
      return true;
    }

    // 3. Сначала проверяем кэш (наиболее быстрая операция) - moved to after direct check for better flow
    let cachedTranslation = await this.#cache.getCachedTranslation(text);
    if (cachedTranslation && cachedTranslation !== text) {
      node.textContent = cachedTranslation;
      return true;
    }

    // 4. Пробуем применить все динамические шаблоны
    const dynamicResult = await this.applyDynamicTemplates(originalText, element);
    if (dynamicResult.replaced) {
      node.textContent = dynamicResult.text;
      return true;
    }

    // 5. If we reach here, we couldn't translate, but still need to remember we processed this
    return false;
  }

  async translateElement(element) {
    if (!element) return;

    // Пропускаем элементы с определенными классами
    const elementClasses = element.classList;
    if (elementClasses && elementClasses.length > 0) {
      for (let i = 0; i < elementClasses.length; i++) {
        if (window.IGNORED_CLASSES.has(elementClasses[i])) {
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
  }

  async translateNode(node) {
    if (!node) return;

    if (node.nodeType === Node.TEXT_NODE) {
      await this.translateTextNode(node);
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      // Only use WeakSet for elements, not text nodes
      if (this.#processedNodes.has(node)) return;
      await this.translateElement(node);
      this.#processedNodes.add(node);
    }
  }

  async translateElementBatch(elements) {
    const batchSize = window.CONFIG?.BATCH_SIZE || 30; // Updated default
    const batchDelay = window.CONFIG?.BATCH_DELAY || 10; // Updated default

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
          // Handle added nodes
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              nodesToProcess.add(node);

              // Check if node is visible (even if currently hidden)
              const isVisible = node.offsetParent !== null || node.tagName === 'BODY' ||
                               getComputedStyle(node).display !== 'none' ||
                               getComputedStyle(node).visibility !== 'hidden';

              if (isVisible) {
                // Рекурсивно добавляем дочерние элементы
                const walker = document.createTreeWalker(
                  node,
                  NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
                  null,
                  false
                );

                let child;
                while (child = walker.nextNode()) {
                  nodesToProcess.add(child);
                }
              }
            } else if (mutation.type === 'childList' && node.nodeType === Node.TEXT_NODE) {
              // Handle direct text node changes
              nodesToProcess.add(node);
            }
          }

          // Handle attribute changes (for title, placeholder, etc.)
          if (mutation.type === 'attributes' && mutation.target) {
            nodesToProcess.add(mutation.target);
          }

          // Handle characterData changes (text content changes)
          if (mutation.type === 'characterData' && mutation.target) {
            nodesToProcess.add(mutation.target);
          }
        }

        // Обрабатываем накопленные узлы
        for (const node of nodesToProcess) {
          await this.translateNode(node);
        }
      }, 100); // 100мс задержка для объединения изменений
    });

    // Use config options for mutation observer
    const options = window.CONFIG?.MUTATION_OBSERVER_OPTIONS || {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: window.NRL_TRANSLATIONS?.translatableAttributes || ['title', 'placeholder', 'alt', 'data-tooltip', 'aria-label', 'value'],
      characterData: true,
      characterDataOldValue: true
    };

    this.#observer.observe(document.body, options);
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