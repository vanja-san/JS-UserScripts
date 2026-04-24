/**
 * Класс для управления переводом текстовых элементов на странице
 * Обрабатывает как текстовые узлы, так и атрибуты элементов
 */
class TranslationEngine {
  #cache;
  #contextMatcher;
  #processedNodes;
  #processedAttrs;
  #observer;

  /**
   * @param {TranslationCache} cache - экземпляр кэша для хранения переводов
   */
  constructor(cache) {
    this.#cache = cache;
    this.#contextMatcher = null; // будет инициализирован позже
    this.#processedNodes = new WeakSet();
    this.#processedAttrs = new WeakMap();
    this.#observer = null;
  }

  /**
   * Возвращает кэш переводов
   * @returns {TranslationCache}
   */
  get cache() {
    return this.#cache;
  }

  /**
   * Устанавливает контекстный матчинг
   * @param {ContextMatcher} value - экземпляр контекстного матчера
   */
  set contextMatcher(value) {
    this.#contextMatcher = value;
  }

  /**
   * Переводит атрибуты элемента
   * @param {Element} element - элемент для обработки
   */
  async translateAttributes(element) {
    try {
      if (!element || !element.attributes) return;

      // Create a specific cache for this element to handle attribute translation
      let processedAttrsForElement = this.#processedAttrs.get(element);
      if (!processedAttrsForElement) {
        processedAttrsForElement = new Map(); // Use Map instead of Set to store original values
        this.#processedAttrs.set(element, processedAttrsForElement);
      }

      const attrs = window.NRL_TRANSLATIONS?.translatableAttributes || [];
      // Ограничение количества обрабатываемых атрибутов для производительности
      const maxAttrsToProcess = 20;
      let attrsProcessed = 0;

      for (const attr of attrs) {
        if (attrsProcessed >= maxAttrsToProcess) break;

        const currentValue = element.getAttribute(attr);
        if (!currentValue) continue;

        // Проверяем длину значения атрибута для безопасности
        if (currentValue.length > 1000) {
          console.warn('Skipping very long attribute value for security reasons:', attr, currentValue.substring(0, 50) + '...');
          processedAttrsForElement.set(`last_${attr}`, currentValue);
          attrsProcessed++;
          continue;
        }

        // Get the original value if this attribute was previously translated
        const originalValue = processedAttrsForElement.get(attr) || currentValue;

        // Check if the value has changed since last translation
        if (currentValue === processedAttrsForElement.get(`last_${attr}`)) {
          attrsProcessed++;
          continue; // Skip if value hasn't changed
        }

        // Skip if value appears to be already translated (contains cyrillic)
        const firstChar = currentValue.charCodeAt(0);
        if ((firstChar >= 1040 && firstChar <= 1103) || firstChar === 1105 || firstChar === 1025) {
          if (!/[a-zA-Z]/.test(currentValue)) {
            processedAttrsForElement.set(`last_${attr}`, currentValue);
            attrsProcessed++;
            continue;
          }
        }

        // Skip if purely numeric
        if (/^\d+$/.test(currentValue)) {
          processedAttrsForElement.set(`last_${attr}`, currentValue);
          attrsProcessed++;
          continue;
        }

        // First apply dynamic templates (pluralization) before dictionary
        // to ensure number+unit patterns are correctly inflected
        const dynamicResult = await this.applyDynamicTemplates(currentValue, element);
        let translated = dynamicResult.replaced ? dynamicResult.text : null;

        // If no dynamic template matched, check for direct translation
        if (!translated) {
          translated = window.NRL_TRANSLATIONS?.main[currentValue];
        }

        // Check context matching if no direct translation
        if (!translated) {
          const contextualResult = this.#contextMatcher?.findTranslation(currentValue, element);
          if (contextualResult) {
            translated = contextualResult.translation;
          }
        }

        // Apply date formatting if no translation found
        if (!translated) {
          translated = window.dateFormatter.format(currentValue);
        }

        // If no translation found, check cache
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

        attrsProcessed++;
      }
    } catch (error) {
      console.warn('Error translating attributes:', error, element);
    }
  }

  /**
   * Применяет динамические шаблоны к тексту
   * @param {string} text - текст для обработки
   * @param {Element} element - элемент, содержащий текст
   * @returns {Object} результат с текстом и флагом замены
   */
  async applyDynamicTemplates(text, element) {
    try {
      // Быстрая проверка: пропускаем Next.js/React чанки и длинные тексты
      if (text.length > 1000 || text.includes('self.__next_') || text.includes('__next_f.push')) {
        return { text, replaced: false }; // Просто пропускаем без логов
      }

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
      // Ограничиваем количество шаблонов для обработки
      const templatesToProcess = templates.slice(0, 50); // ограничение для безопасности

      for (const template of templatesToProcess) {
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
    } catch (error) {
      console.warn('Error applying dynamic templates:', error, text);
      return { text, replaced: false };
    }
  }

  /**
   * Переводит текстовый узел
   * @param {Text} node - текстовый узел для перевода
   * @returns {boolean} - true, если текст был переведен
   */
  async translateTextNode(node) {
    try {
      // Don't use WeakSet for text nodes as they get recreated frequently
      // Instead, compare the text content to see if it's been processed
      const originalText = node.textContent;
      let text = originalText?.toString().trim();
      if (!text) return false;

      // Быстрая проверка: проверяем длину текста для безопасности
      if (text.length > 10000) {
        console.warn('Skipping very long text for security reasons:', text.substring(0, 50) + '...');
        return false;
      }

      // Быстрая проверка: пропускаем чисто числовые значения
      const firstChar = text.charCodeAt(0);
      if (firstChar >= 48 && firstChar <= 57 && /^\d+$/.test(text)) {
        return false;
      }

      // Быстрая проверка: пропускаем Next.js/React чанки и скрипты
      if (text.includes('self.__next_') || text.includes('__next_f.push') || text.length > 5000) {
        return false; // Пропускаем без логов
      }

      // Быстрая проверка: пропускаем комбинации чисел и специальных символов
      if (/^[\d\s\.\,\-\+\:\%]+$/.test(text)) {
        return false;
      }

      // Быстрая проверка: если текст уже на кириллице, пропускаем
      const firstCode = text.charCodeAt(0);
      if ((firstCode >= 1040 && firstCode <= 1103) || firstCode === 1105 || firstCode === 1025) { // А-я, Ё, ё
        if (!/[a-zA-Z]/.test(text)) {
          return false;
        }
      }

      // Санитизируем текст перед использованием
      text = this.sanitizeText(text);
      if (!text) return false;

      // 1. Сначала проверяем кэш (наиболее быстрая операция)
      let cachedTranslation = await this.#cache.getCachedTranslation(text);
      if (cachedTranslation && cachedTranslation !== text) {
        node.textContent = cachedTranslation;
        return true;
      }

      // 2. Пробуем применить динамические шаблоны (плюрализацию) ДО словаря,
      // чтобы числа с единицами измерения корректно склонялись
      const element = node.parentNode;
      const dynamicResult = await this.applyDynamicTemplates(originalText, element);
      if (dynamicResult.replaced) {
        node.textContent = dynamicResult.text;
        return true;
      }

      // 2.5. Если слово — исчисляемое существительное, ищем число в родительском контейнере
      if (window.PLURAL_MAP && element) {
        const trimmedText = text.trim().toLowerCase();
        // Проверяем английские и русские формы исчисляемых слов
        let pluralKey = null;
        let isRussianForm = false;
        // Сначала ищем английский ключ
        for (const key of Object.keys(window.PLURAL_MAP)) {
          if (trimmedText === key || trimmedText.endsWith(key)) {
            pluralKey = key;
            break;
          }
        }
        // Если английский не нашли, проверяем русские формы (мод, мода, модов и т.д.)
        if (!pluralKey) {
          for (const [enKey, ruForms] of Object.entries(window.PLURAL_MAP)) {
            const ruBase = ruForms[2]; // родительный падеж мн.ч. (модов, одобрений и т.д.)
            if (trimmedText === ruBase || trimmedText.endsWith(ruBase)) {
              pluralKey = enKey;
              isRussianForm = true;
              break;
            }
          }
        }
        if (pluralKey) {
          if (window.NRL_DEBUG?.enabled) {
            console.log('NRL: Found countable noun:', trimmedText, 'key:', pluralKey, 'isRussian:', isRussianForm, 'element:', element);
          }
          // Ищем число в родительском контейнере (до 3 уровней вверх)
          let parentElement = element.parentElement;
          let parentText = '';
          let levelsUp = 0;
          while (parentElement && levelsUp < 3) {
            parentText += parentElement.textContent || '';
            const numberMatch = parentText.match(/(\d+\.?\d*)([kmbt]?)/i);
            if (numberMatch) {
              const numStr = numberMatch[1];
              const num = parseFloat(numStr);
              if (!isNaN(num) && num >= 0) {
                const ruForms = window.PLURAL_MAP[pluralKey];
                const pluralized = window.pluralize(num, ruForms);
                if (window.NRL_DEBUG?.enabled) {
                  console.log('NRL: Applying pluralization:', trimmedText, '->', pluralized, 'num:', num);
                }
                // Заменяем слово на правильную форму
                const textNodeText = node.textContent;
                // Если это русская форма, заменяем её, иначе английскую
                let regex;
                if (isRussianForm) {
                  // Заменяем русскую форму (например, "моды" на "модов")
                  const ruBase = ruForms[2]; // родительный падеж мн.ч.
                  regex = new RegExp(ruBase, 'gi');
                } else {
                  regex = new RegExp(pluralKey, 'gi');
                }
                if (regex.test(textNodeText)) {
                  node.textContent = textNodeText.replace(regex, pluralized);
                  return true;
                }
              }
              break;
            }
            parentElement = parentElement.parentElement;
            levelsUp++;
          }
          if (window.NRL_DEBUG?.enabled && !parentText.match(/(\d+\.?\d*)([kmbt]?)/i)) {
            console.log('NRL: No number found for countable noun:', trimmedText);
          }
        }
      }

      // 3. Затем проверяем общий словарь
      const directTranslation = window.NRL_TRANSLATIONS?.main[text];
      if (directTranslation) {
        node.textContent = directTranslation;
        await this.#cache.cacheTranslation(text, '', directTranslation);
        return true;
      }

      // 4. Затем проверяем контекстные правила
      if (element) {
        const contextualResult = this.#contextMatcher?.findTranslation(text, element);
        if (contextualResult) {
          node.textContent = contextualResult.translation;
          await this.#cache.cacheTranslation(text, contextualResult.context, contextualResult.translation);
          return true;
        }
      }

      // 5. If we reach here, we couldn't translate, but still need to remember we processed this
      return false;
    } catch (error) {
      console.warn('Error translating text node:', error, node);
      return false;
    }
  }

  /**
   * Санитизирует текст для безопасности
   * @param {string} text - текст для санитизации
   * @returns {string} - безопасный текст
   */
  sanitizeText(text) {
    if (typeof text !== 'string') return '';

    // Удаляем потенциально опасные символы
    return text
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '') // Control characters
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Script tags
      .replace(/javascript:/gi, '') // JavaScript URLs
      .replace(/vbscript:/gi, '') // VBScript URLs
      .replace(/on\w+\s*=/gi, ''); // Event handlers
  }

  /**
   * Переводит элемент и его содержимое
   * @param {Element} element - элемент для перевода
   */
  async translateElement(element) {
    if (!element) return;

    try {
      // Быстрая проверка: сначала проверяем специальные теги
      const tagName = element.tagName.toLowerCase();

      // Специальная обработка элементов времени - делаем это быстрее
      if (tagName === 'time') {
        await this.handleTimeElement(element);
        return; // Выходим сразу после обработки времени, чтобы ускорить
      }

      // Проверяем, нужно ли пропустить этот элемент
      const elementClasses = element.classList;
      if (elementClasses && elementClasses.length > 0) {
        // Оптимизируем проверку классов
        const classesArray = Array.from(elementClasses);
        const ignoredClassesArray = Array.from(window.IGNORED_CLASSES || new Set());
        const alwaysTranslateClassesArray = Array.from(window.ALWAYS_TRANSLATE_CLASSES || new Set());

        // Проверяем, есть ли классы, которые нужно всегда переводить
        let alwaysTranslate = false;
        for (const cls of classesArray) {
          if (alwaysTranslateClassesArray.includes(cls)) {
            alwaysTranslate = true;
            break;
          }
        }

        // Если не всегда переводить, проверяем игнорируемые классы
        if (!alwaysTranslate) {
          for (const cls of classesArray) {
            if (ignoredClassesArray.includes(cls)) {
              return;
            }
          }
        }
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
    } catch (error) {
      console.warn('Error translating element:', error, element);
    }
  }

  /**
   * Немедленно переводит текстовое содержимое элемента
   * @param {Element} element - элемент с текстовым содержимым
   */
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
        // First apply dynamic templates (pluralization) before dictionary
        const dynamicResult = await this.applyDynamicTemplates(originalText, element);
        let translated = dynamicResult.replaced ? dynamicResult.text : null;

        // If no dynamic template matched, check dictionary
        if (!translated) {
          translated = window.NRL_TRANSLATIONS?.main[originalText];
        }

        // Check context matching if no direct translation
        if (!translated) {
          const contextualResult = this.#contextMatcher?.findTranslation(originalText, element);
          if (contextualResult) {
            translated = contextualResult.translation;
          }
        }

        // Apply date formatting if no translation found
        if (!translated) {
          translated = window.dateFormatter.format(originalText);
        }

        if (translated && translated !== originalText) {
          textNode.textContent = translated;
        }
      }
    }
  }

  /**
   * Обрабатывает элемент времени (тег <time>)
   * @param {Element} element - элемент времени
   */
  async handleTimeElement(element) {
    try {
      const originalText = element.textContent.trim();
      if (!originalText) return;

      // Проверяем длину текста для безопасности
      if (originalText.length > 1000) {
        console.warn('Skipping very long time element text for security reasons:', originalText.substring(0, 50) + '...');
        return;
      }

      // First apply dynamic templates (pluralization) for number+unit patterns
      const dynamicResult = await this.applyDynamicTemplates(originalText, element);
      if (dynamicResult.replaced) {
        element.textContent = dynamicResult.text;
        return;
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
    } catch (error) {
      console.warn('Error handling time element:', error, element);
    }
  }

  /**
   * Переводит узел (элемент или текст)
   * @param {Node} node - узел для перевода
   */
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

  /**
   * Переводит элементы батчами
   * @param {Element[]} elements - массив элементов для перевода
   */
  async translateElementBatch(elements) {
    try {
      // Ограничение общего количества элементов для обработки
      const maxElementsToProcess = window.CONFIG?.MAX_ELEMENTS_PER_BATCH || 5000;
      const elementsToProcess = elements.length > maxElementsToProcess
        ? elements.slice(0, maxElementsToProcess)
        : [...elements]; // создаем копию чтобы избежать изменений исходного массива

      const batchSize = window.CONFIG?.BATCH_SIZE || 30; // Updated default
      const batchDelay = window.CONFIG?.BATCH_DELAY || 5; // Reduced default for better performance
      const startTime = performance.now();

      // Обрабатываем элементы батчами для уменьшения нагрузки на DOM
      for (let i = 0; i < elementsToProcess.length; i += batchSize) {
        const batch = elementsToProcess.slice(i, i + batchSize);

        // Perform translation with performance tracking
        const batchStartTime = performance.now();
        for (const element of batch) {
          await this.translateNode(element);
        }

        // If this batch took too long, reduce the delay to yield control to the browser
        const batchTime = performance.now() - batchStartTime;
        if (batchTime > 16) { // If batch took more than 1 frame (60fps), yield immediately
          await new Promise(resolve => setTimeout(resolve, 1)); // Minimal delay for browser to handle events
        } else if (batchDelay > 0) {
          // Сравниваем время выполнения и адаптивно уменьшаем задержку при быстрых вычислениях
          const currentTime = performance.now();
          if (currentTime - startTime > 16) { // Если уже прошло более 16ms (1 фрейм), уменьшаем задержку
            await new Promise(resolve => setTimeout(resolve, Math.max(1, batchDelay / 2)));
          } else {
            await new Promise(resolve => setTimeout(resolve, batchDelay));
          }
        }
      }
    } catch (error) {
      console.warn('Error in translateElementBatch:', error);
    }
  }

  /**
   * Наблюдает за изменениями DOM и обновляет переводы
   */
  observeMutations() {
    // Используем дебаунсинг для оптимизации частых вызовов
    let timeoutId = null;

    this.#observer = new MutationObserver((mutations) => {
      // Откладываем обработку, чтобы объединить несколько изменений
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(async () => {
        try {
          const nodesToProcess = new Set();

          // Ограничение количества мутаций для обработки
          const mutationsToProcess = mutations.length > 100
            ? mutations.slice(0, 100)
            : mutations;

          for (const mutation of mutationsToProcess) {
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
                  let childCount = 0; // ограничение для производительности
                  while ((child = walker.nextNode()) && childCount < 1000) {
                    nodesToProcess.add(child);
                    childCount++;
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
                if (newValue && newValue.length <= 1000) { // Ограничение длины для безопасности
                  let translated;
                  try {
                    translated = await this.#cache.getCachedTranslation(newValue);
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
                  } catch (error) {
                    console.warn('Error translating attribute:', error, mutation.target, mutation.attributeName);
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
              // Проверяем длину текста для безопасности
              if (mutation.target.textContent && mutation.target.textContent.length <= 10000) {
                nodesToProcess.add(mutation.target);
              }
            }
          }

          // Обрабатываем накопленные узлы
          const nodesArray = Array.from(nodesToProcess);
          // Ограничение количества узлов для обработки
          const nodesToProcessLimited = nodesArray.length > 500
            ? nodesArray.slice(0, 500)
            : nodesArray;

          for (const node of nodesToProcessLimited) {
            await this.translateNode(node);
          }
        } catch (error) {
          console.warn('Error in MutationObserver callback:', error);
        }
      }, 25); // уменьшил задержку до 25мс для более быстрой реакции на изменения
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

  /**
   * Очищает ресурсы, освобождает наблюдателя
   */
  cleanup() {
    if (this.#observer) {
      this.#observer.disconnect();
      this.#observer = null;
    }

    this.#processedAttrs = new WeakMap();
  }

  /**
   * Устанавливает наблюдателя за изменениями DOM
   * @param {MutationObserver} value - новый наблюдатель
   */
  set observer(value) {
    this.#observer = value;
  }

  /**
   * Возвращает наблюдателя за изменениями DOM
   * @returns {MutationObserver}
   */
  get observer() {
    return this.#observer;
  }
}

window.TranslationEngine = TranslationEngine;