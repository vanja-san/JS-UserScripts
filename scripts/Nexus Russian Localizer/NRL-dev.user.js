// ==UserScript==
// @name            Nexus Russian Localizer DEV
// @name:ru         Nexus Russian Localizer DEV
// @namespace       http://tampermonkey.net/
// @description     Add Russian localization for Nexus Mods.
// @description:ru  Добавляет русскую локализацию для сайта Nexus Mods.
// @version         2.5.5-dev
// @author          vanja-san
// @match           https://*.nexusmods.com/*
// @icon            https://www.google.com/s2/favicons?sz=64&domain=nexusmods.com
// @downloadURL     https://raw.githubusercontent.com/vanja-san/JS-UserScripts/main/scripts/Nexus Russian Localizer/NRL-dev.user.js
// @updateURL       https://raw.githubusercontent.com/vanja-san/JS-UserScripts/main/scripts/Nexus Russian Localizer/NRL-dev.user.js
// @require         https://raw.githubusercontent.com/vanja-san/JS-UserScripts/main/scripts/Nexus Russian Localizer/translations.js
// @require         https://raw.githubusercontent.com/vanja-san/JS-UserScripts/main/scripts/Nexus Russian Localizer/modules/config.js
// @require         https://raw.githubusercontent.com/vanja-san/JS-UserScripts/main/scripts/Nexus Russian Localizer/modules/lru-cache.js
// @require         https://raw.githubusercontent.com/vanja-san/JS-UserScripts/main/scripts/Nexus Russian Localizer/modules/helpers.js
// @require         https://raw.githubusercontent.com/vanja-san/JS-UserScripts/main/scripts/Nexus Russian Localizer/modules/date-formatter.js
// @require         https://raw.githubusercontent.com/vanja-san/JS-UserScripts/main/scripts/Nexus Russian Localizer/modules/context-matcher.js
// @require         https://raw.githubusercontent.com/vanja-san/JS-UserScripts/main/scripts/Nexus Russian Localizer/modules/translation-cache.js
// @require         https://raw.githubusercontent.com/vanja-san/JS-UserScripts/main/scripts/Nexus Russian Localizer/modules/translation-engine.js
// @grant           GM_registerMenuCommand
// @grant           none
// @license         MIT
// ==/UserScript==

(function() {
  'use strict';

  // Основная функция инициализации
  async function init() {
    try {
      // Скрываем контент до завершения перевода
      document.documentElement.style.visibility = 'hidden';

      const cache = new TranslationCache();
      await cache.initDB();

      // Инициализируем контекстный матчинг
      const contextMatcher = new ContextMatcher(window.NRL_TRANSLATIONS);
      
      const translator = new TranslationEngine(cache);
      translator.contextMatcher = contextMatcher; // Устанавливаем после инициализации

      // Предварительное кэширование при первом запуске
      const isInitialized = await cache.get('initialized');
      if (!isInitialized) {
        await cache.preCacheTranslations();
        await cache.save('initialized', 'true');
      }

      // Предзагрузка ключевых переводов
      await preloadCriticalTranslations(cache);

      // Обрабатываем приоритетные элементы в первую очередь
      const priorityElements = getPriorityElements();
      const priorityLen = priorityElements.length;
      for (let i = 0; i < priorityLen; i++) {
        await translator.translateNode(priorityElements[i]);
      }

      // Обрабатываем элементы с всплывающими подсказками немедленно
      await processTooltipElements();

      // Обрабатываем все остальные элементы батчами
      // Используем TreeWalker для более эффективного обхода DOM
      const allElements = [];
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
        {
          acceptNode: function(node) {
            // Include more elements that might be initially hidden but become visible later
            if (node === document.body) {
              return NodeFilter.FILTER_REJECT; // Исключаем сам body элемент
            }

            // Check if element is in ignored classes
            if (node.nodeType === Node.ELEMENT_NODE &&
                node.classList &&
                window.IGNORED_CLASSES) {
              for (let i = 0; i < node.classList.length; i++) {
                if (window.IGNORED_CLASSES.has(node.classList[i])) {
                  return NodeFilter.FILTER_REJECT;
                }
              }
            }

            return NodeFilter.FILTER_ACCEPT;
          }
        }
      );

      let node;
      while (node = walker.nextNode()) {
        allElements.push(node);
      }

      await translator.translateElementBatch(allElements);

      // Показываем контент после завершения перевода
      document.documentElement.style.visibility = '';

      // Начинаем наблюдение за изменениями DOM
      translator.observeMutations();

      // Добавим повторную проверку через 5 секунд для динамически загруженного контента
      setTimeout(async () => {
        const allElements = [];
        const walker = document.createTreeWalker(
          document.body,
          NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
          {
            acceptNode: function(node) {
              if (node === document.body) {
                return NodeFilter.FILTER_REJECT;
              }

              if (node.nodeType === Node.ELEMENT_NODE &&
                  node.classList &&
                  window.IGNORED_CLASSES) {
                // Проверяем, есть ли классы, которые нужно всегда переводить
                let alwaysTranslate = false;
                if (window.ALWAYS_TRANSLATE_CLASSES) {
                  for (let i = 0; i < node.classList.length; i++) {
                    if (window.ALWAYS_TRANSLATE_CLASSES.has(node.classList[i])) {
                      alwaysTranslate = true;
                      break;
                    }
                  }
                }

                // Если не всегда переводить, проверяем игнорируемые классы
                if (!alwaysTranslate && window.IGNORED_CLASSES) {
                  for (let i = 0; i < node.classList.length; i++) {
                    if (window.IGNORED_CLASSES.has(node.classList[i])) {
                      return NodeFilter.FILTER_REJECT;
                    }
                  }
                }
              }

              // Включаем элементы с aria-describedby для обработки (они могут указывать на подсказки)
              if (node.nodeType === Node.ELEMENT_NODE) {
                const ariaDescribedBy = node.getAttribute('aria-describedby');
                if (ariaDescribedBy) {
                  // Не отфильтровываем элементы с aria-describedby
                  return NodeFilter.FILTER_ACCEPT;
                }
              }

              return NodeFilter.FILTER_ACCEPT;
            }
          }
        );

        let node;
        while (node = walker.nextNode()) {
          allElements.push(node);
        }

        await translator.translateElementBatch(allElements);
      }, 5000); // Проверяем снова через 5 секунд

      // Очистка при выгрузке страницы
      window.addEventListener('beforeunload', () => {
        if (cache.worker) {
          cache.worker.terminate();
        }
        translator.cleanup();
      });

    } catch (error) {
      console.error('Ошибка инициализации:', error);
      // Всегда показываем контент, даже при ошибке
      document.documentElement.style.visibility = '';

      // Fallback: простая обработка без кэширования
      const contextMatcher = new ContextMatcher(window.NRL_TRANSLATIONS);
      const simpleTranslate = (node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          let text = node.textContent.trim();
          if (!text) return;
          const element = node.parentElement;

          // Проверяем, не является ли уже переведенным (кириллица без латиницы)
          const firstCode = text.charCodeAt(0);
          if ((firstCode >= 1040 && firstCode <= 1103) || firstCode === 1105 || firstCode === 1025) {
            if (!/[a-zA-Z]/.test(text)) {
              return;
            }
          }

          // Пропускаем чисто числовые значения
          if (/^\d+$/.test(text)) {
            return;
          }

          // Сначала проверяем контекстные правила
          const contextualResult = contextMatcher.findTranslation(text, element);
          if (contextualResult) {
            node.textContent = contextualResult.translation;
            return;
          }

          // Затем общий словарь
          if (window.NRL_TRANSLATIONS?.main[text]) {
            node.textContent = window.NRL_TRANSLATIONS.main[text];
            return;
          }

          // Сначала применяем форматирование дат
          let newText = window.dateFormatter.format(text);
          if (newText !== text) {
            node.textContent = newText;
            return;
          }

          // Затем пробуем динамические шаблоны
          for (const template of window.DYNAMIC_TEMPLATES) {
            if (template.pattern.test(newText)) {
              template.pattern.lastIndex = 0; // сбрасываем для повторного использования
              if (template.replacer) {
                newText = newText.replace(template.pattern, (...args) => template.replacer(...args));
                if (newText !== text) {
                  node.textContent = newText;
                  return;
                }
              } else if (template.replacement) {
                newText = newText.replace(template.pattern, template.replacement);
                if (newText !== text) {
                  node.textContent = newText;
                  return;
                }
              }
            }
          }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const tagName = node.tagName.toLowerCase();

          // Специальная обработка элементов времени
          if (tagName === 'time') {
            let text = node.textContent.trim();
            if (text) {
              // Применяем форматирование дат
              let translated = window.dateFormatter.format(text);
              if (translated !== text) {
                node.textContent = translated;
              } else {
                // Проверяем общий словарь
                translated = window.NRL_TRANSLATIONS?.main[text];
                if (translated && translated !== text) {
                  node.textContent = translated;
                }
              }
            }
          }

          // Обработка элементов, связанных через aria-describedby
          const ariaDescribedBy = node.getAttribute('aria-describedby');
          if (ariaDescribedBy) {
            const tooltipElement = document.getElementById(ariaDescribedBy);
            if (tooltipElement) {
              // Обрабатываем текст в элементе подсказки
              let text = tooltipElement.textContent.trim();
              if (text) {
                // Применяем форматирование дат
                let translated = window.dateFormatter.format(text);
                if (translated !== text) {
                  tooltipElement.textContent = translated;
                } else {
                  // Проверяем общий словарь
                  translated = window.NRL_TRANSLATIONS?.main[text];
                  if (translated && translated !== text) {
                    tooltipElement.textContent = translated;
                  } else {
                    // Пробуем динамические шаблоны
                    for (const template of window.DYNAMIC_TEMPLATES) {
                      if (template.pattern.test(text)) {
                        template.pattern.lastIndex = 0; // сбрасываем для повторного использования
                        if (template.replacer) {
                          const newText = text.replace(template.pattern, (...args) => template.replacer(...args));
                          if (newText !== text) {
                            tooltipElement.textContent = newText;
                            break;
                          }
                        } else if (template.replacement) {
                          const newText = text.replace(template.pattern, template.replacement);
                          if (newText !== text) {
                            tooltipElement.textContent = newText;
                            break;
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }

          // Переводим атрибуты элемента
          const attrs = window.NRL_TRANSLATIONS?.translatableAttributes || ['title', 'placeholder', 'alt', 'data-tooltip', 'aria-label', 'value'];
          for (const attr of attrs) {
            const value = node.getAttribute(attr);
            if (value) {
              // Проверяем, не кириллица ли это
              const firstCode = value.charCodeAt(0);
              if (!((firstCode >= 1040 && firstCode <= 1103) || firstCode === 1105 || firstCode === 1025) || /[a-zA-Z]/.test(value)) {
                if (window.NRL_TRANSLATIONS?.main[value]) {
                  node.setAttribute(attr, window.NRL_TRANSLATIONS.main[value]);
                } else {
                  // Проверяем контекстные правила
                  const contextualResult = contextMatcher.findTranslation(value, node);
                  if (contextualResult) {
                    node.setAttribute(attr, contextualResult.translation);
                  }
                }
              }
            }
          }

          // Рекурсивно обходим дочерние элементы
          for (const child of node.childNodes) {
            simpleTranslate(child);
          }
        }
      };

      simpleTranslate(document.body);
    }
  }

  // Функция для получения приоритетных элементов
  function getPriorityElements() {
    const selectors = window.CONFIG?.PRIORITY_SELECTORS || ['h1', 'h2', 'h3', 'nav', 'button', 'a', '[data-translate-priority="high"]'];
    const result = [];
    const len = selectors.length;

    for (let i = 0; i < len; i++) {
      try {
        const elements = document.querySelectorAll(selectors[i]);
        for (let j = 0; j < elements.length; j++) {
          const el = elements[j];
          // Check visibility using multiple methods to catch more cases
          const isVisible = el.offsetParent !== null ||
                           getComputedStyle(el).display !== 'none' ||
                           getComputedStyle(el).visibility !== 'hidden';
          if (isVisible) { // Only visible or potentially visible elements
            result.push(el);
          }
        }
      } catch (e) {
        console.warn(`Selector error for ${selectors[i]}:`, e);
      }
    }

    return result;
  }

  // Предзагрузка ключевых переводов
  async function preloadCriticalTranslations(cache) {
    const criticalTerms = ['Download', 'Mods', 'Games', 'Collections', 'Media', 'Community', 'Support', 'Home', 'Search', 'Login', 'Register'];
    const len = criticalTerms.length;
    for (let i = 0; i < len; i++) {
      await cache.getCachedTranslation(criticalTerms[i]); // Выполняем последовательно, а не параллельно, чтобы не перегружать
    }
  }

  // Функция для очистки кэша
  async function clearCache() {
    try {
      // Очистка IndexedDB
      if ('indexedDB' in window) {
        const deleteReq = indexedDB.deleteDatabase(window.CONFIG?.DB_NAME || 'translationCache');
        await new Promise((resolve) => {
          deleteReq.onsuccess = () => resolve();
          deleteReq.onerror = () => resolve(); // Просто продолжаем, даже если ошибка
        });
      }
      
      // Очистка всех кэшей в памяти
      if (window.templateCache && typeof window.templateCache.clear === 'function') {
        window.templateCache.clear();
      }
      
      // Очистка контекстного кэша
      if (window.contextCheckCache && typeof window.contextCheckCache.clear === 'function') {
        window.contextCheckCache.clear();
      } else if (window.contextCheckCache) {
        window.contextCheckCache.clear(); // для Map
      }
      
      // Очистка кэша заголовков
      if (window.headingElementsCache && typeof window.headingElementsCache.clear === 'function') {
        window.headingElementsCache.clear();
      } else if (window.headingElementsCache) {
        window.headingElementsCache.clear(); // для Set
      }
      
      // Если есть доступ к экземплярам кэша перевода, очищаем их тоже
      if (window.TranslationCache) {
        // Перебираем все возможные экземпляры, если они существуют
        // На случай, если кэш уже был инициализирован где-то
      }
      
      console.log('Кэш NRL полностью очищен. Перезагрузите страницу для полного эффекта.');
      alert('Кэш NRL полностью очищен. Перезагрузите страницу для полного обновления перевода.');
    } catch (e) {
      console.warn('Ошибка при очистке кэша:', e);
      alert('Ошибка при очистке кэша: ' + e.message);
    }
  }

  // Регистрация команды меню для Tampermonkey
  if (typeof GM_registerMenuCommand !== 'undefined') {
    GM_registerMenuCommand('NRL: Очистить кэш', clearCache, 'c'); // добавляем горячую клавишу 'c'
  }

  // Функция для обработки элементов с всплывающими подсказками
  async function processTooltipElements() {
    // Находим элементы с атрибутами подсказок
    const tooltipSelectors = [
      '[title]',
      '[data-tooltip]',
      '[data-original-title]',
      '[data-bs-title]',
      '[data-bs-tooltip]',
      '[data-toggle="tooltip"]',
      '[data-toggle="popover"]'
    ];

    const elements = [];
    for (const selector of tooltipSelectors) {
      elements.push(...Array.from(document.querySelectorAll(selector)));
    }

    for (const element of elements) {
      // Обрабатываем атрибуты подсказок
      const title = element.getAttribute('title');
      if (title && title.trim()) {
        let translated = window.NRL_TRANSLATIONS?.main[title];
        if (!translated) {
          translated = window.dateFormatter.format(title);
        }
        if (translated && translated !== title) {
          element.setAttribute('title', translated);
        }
      }

      const dataTooltip = element.getAttribute('data-tooltip');
      if (dataTooltip && dataTooltip.trim()) {
        let translated = window.NRL_TRANSLATIONS?.main[dataTooltip];
        if (!translated) {
          translated = window.dateFormatter.format(dataTooltip);
        }
        if (translated && translated !== dataTooltip) {
          element.setAttribute('data-tooltip', translated);
        }
      }

      const dataOriginalTitle = element.getAttribute('data-original-title');
      if (dataOriginalTitle && dataOriginalTitle.trim()) {
        let translated = window.NRL_TRANSLATIONS?.main[dataOriginalTitle];
        if (!translated) {
          translated = window.dateFormatter.format(dataOriginalTitle);
        }
        if (translated && translated !== dataOriginalTitle) {
          element.setAttribute('data-original-title', translated);
        }
      }
    }
  }

  // Запуск
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();