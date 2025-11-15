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

      // Apply date formatting if no direct translation found
      if (!translated) {
        translated = window.dateFormatter.format(currentValue);
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

    // Проверяем, нужно ли пропустить этот элемент
    const elementClasses = element.classList;
    if (elementClasses && elementClasses.length > 0) {
      // Проверяем, есть ли классы, которые нужно всегда переводить
      let alwaysTranslate = false;
      for (let i = 0; i < elementClasses.length; i++) {
        if (window.ALWAYS_TRANSLATE_CLASSES && window.ALWAYS_TRANSLATE_CLASSES.has(elementClasses[i])) {
          alwaysTranslate = true;
          break;
        }
      }

      // Если не всегда переводить, проверяем игнорируемые классы
      if (!alwaysTranslate) {
        for (let i = 0; i < elementClasses.length; i++) {
          if (window.IGNORED_CLASSES.has(elementClasses[i])) {
            return;
          }
        }
      }
    }

    // Специальная обработка всплывающих элементов
    if (element.classList &&
        (element.classList.contains('tooltip') ||
         element.classList.contains('popover') ||
         element.classList.contains('tippy-box') ||
         element.classList.contains('qtip') ||
         element.classList.contains('ui-tooltip'))) {
      // Если это всплывающий элемент, обрабатываем его текст немедленно
      await this.translateImmediateTextContent(element);
    } else if (element.className && typeof element.className.includes === 'function' &&
               (element.className.includes('tip') || element.className.includes('popper'))) {
      // Обработка элементов с классами, содержащими 'tip' или 'popper'
      await this.translateImmediateTextContent(element);
    }

    // Специальная обработка элементов, видимых только для программ чтения с экрана
    if (element.classList && element.classList.contains('sr-only')) {
      // Даже если элемент визуально скрыт, его текст нужно перевести для доступности
      await this.translateImmediateTextContent(element);
    }

    // Обработка элементов, на которые ссылается aria-describedby
    const ariaDescribedBy = element.getAttribute('aria-describedby');
    if (ariaDescribedBy) {
      const tooltipElement = document.getElementById(ariaDescribedBy);
      if (tooltipElement) {
        await this.translateImmediateTextContent(tooltipElement);
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

    // Специальная обработка элементов времени
    if (tagName === 'time') {
      // Обрабатываем текст внутри time элемента
      await this.handleTimeElement(element);
    }

    // Переводим атрибуты элемента
    await this.translateAttributes(element);

    // Рекурсивно обходим дочерние элементы
    const childNodes = element.childNodes;
    for (let i = 0; i < childNodes.length; i++) {
      await this.translateNode(childNodes[i]);
    }
  }

  // Метод для немедленного перевода текстового содержимого элемента
  async translateImmediateTextContent(element) {
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    let textNode;
    while (textNode = walker.nextNode()) {
      const originalText = textNode.textContent.trim();
      if (originalText) {
        let translated = window.NRL_TRANSLATIONS?.main[originalText];
        if (!translated) {
          // Проверяем контекстные правила
          const contextualResult = this.#contextMatcher?.findTranslation(originalText, element);
          if (contextualResult) {
            translated = contextualResult.translation;
          }
        }

        // Применяем форматирование дат
        if (!translated) {
          translated = window.dateFormatter.format(originalText);
        }

        if (translated && translated !== originalText) {
          textNode.textContent = translated;
        }
      }
    }
  }

  // Метод для обработки элементов времени
  async handleTimeElement(element) {
    const originalText = element.textContent.trim();
    if (!originalText) return;

    // Проверяем формат времени, например "1 hour ago", "2 days ago"
    const timeAgoPattern = /(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago/i;
    if (timeAgoPattern.test(originalText)) {
      // Это формат времени "ago", применяем динамические шаблоны
      for (const template of window.DYNAMIC_TEMPLATES) {
        if (template.pattern.test(originalText)) {
          template.pattern.lastIndex = 0; // сбрасываем для повторного использования
          if (template.replacer) {
            const newText = originalText.replace(template.pattern, (...args) => template.replacer(...args));
            if (newText !== originalText) {
              element.textContent = newText;
              return;
            }
          } else if (template.replacement) {
            const newText = originalText.replace(template.pattern, template.replacement);
            if (newText !== originalText) {
              element.textContent = newText;
              return;
            }
          }
        }
      }
    }

    // Если это дата в формате "DD MMM YYYY", применяем форматирование дат
    let translated = window.dateFormatter.format(originalText);
    if (translated !== originalText) {
      element.textContent = translated;
      return;
    }

    // Проверяем общий словарь
    translated = window.NRL_TRANSLATIONS?.main[originalText];
    if (translated && translated !== originalText) {
      element.textContent = translated;
      return;
    }

    // Проверяем кэш
    translated = await this.#cache.getCachedTranslation(originalText);
    if (translated && translated !== originalText) {
      element.textContent = translated;
      return;
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
            // Быстро переводим атрибуты, если они изменились
            if (mutation.attributeName === 'title' || mutation.attributeName === 'data-tooltip') {
              const newValue = mutation.target.getAttribute(mutation.attributeName);
              if (newValue) {
                let translated = await this.#cache.getCachedTranslation(newValue);
                if (!translated) {
                  // Проверяем контекстные правила
                  const contextualResult = this.#contextMatcher?.findTranslation(newValue, mutation.target);
                  if (contextualResult) {
                    translated = contextualResult.translation;
                  } else {
                    // Проверяем общий словарь
                    translated = window.NRL_TRANSLATIONS?.main[newValue];
                  }
                }

                // Применяем форматирование дат, если текст не был переведен из словаря
                if (!translated) {
                  translated = window.dateFormatter.format(newValue);
                }

                if (translated && translated !== newValue) {
                  mutation.target.setAttribute(mutation.attributeName, translated);
                }
              }
            }

            // Обработка атрибута aria-describedby - это может указывать на подсказку
            if (mutation.attributeName === 'aria-describedby') {
              const describedById = mutation.target.getAttribute('aria-describedby');
              if (describedById) {
                // Находим элемент подсказки и переводим его, если он существует
                const tooltipElement = document.getElementById(describedById);
                if (tooltipElement) {
                  await this.translateElement(tooltipElement);
                }
              }
            }

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
      }, 50); // уменьшил задержку до 50мс для более быстрой реакции на всплывающие элементы
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