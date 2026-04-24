// ==UserScript==
// @name            Nexus Russian Localizer
// @name:ru         Nexus Russian Localizer
// @namespace       http://tampermonkey.net/
// @description     Add Russian localization for Nexus Mods.
// @description:ru  Добавляет русскую локализацию для сайта Nexus Mods.
// @version         2.6.9
// @author          vanja-san
// @match           https://*.nexusmods.com/*
// @icon            https://www.google.com/s2/favicons?sz=64&domain=nexusmods.com
// @downloadURL     https://vanja-san.github.io/JS-UserScripts/scripts/Nexus%20Russian%20Localizer/NRL.user.js
// @updateURL       https://vanja-san.github.io/JS-UserScripts/scripts/Nexus%20Russian%20Localizer/NRL.user.js
// @require         https://vanja-san.github.io/JS-UserScripts/scripts/Nexus%20Russian%20Localizer/translations.js
// @require         https://vanja-san.github.io/JS-UserScripts/scripts/Nexus%20Russian%20Localizer/modules/config.js
// @require         https://vanja-san.github.io/JS-UserScripts/scripts/Nexus%20Russian%20Localizer/modules/lru-cache.js
// @require         https://vanja-san.github.io/JS-UserScripts/scripts/Nexus%20Russian%20Localizer/modules/helpers.js
// @require         https://vanja-san.github.io/JS-UserScripts/scripts/Nexus%20Russian%20Localizer/modules/date-formatter.js
// @require         https://vanja-san.github.io/JS-UserScripts/scripts/Nexus%20Russian%20Localizer/modules/context-matcher.js
// @require         https://vanja-san.github.io/JS-UserScripts/scripts/Nexus%20Russian%20Localizer/modules/translation-cache.js
// @require         https://vanja-san.github.io/JS-UserScripts/scripts/Nexus%20Russian%20Localizer/modules/translation-engine.js
// @grant           GM_registerMenuCommand
// @license         MIT
// ==/UserScript==

(function() {
  'use strict';

  // Основная функция инициализации
  async function init() {
    try {
      // Скрываем контент до завершения перевода
      document.documentElement.style.visibility = 'hidden';

      // Failsafe: show page after 3 seconds even if init fails
      setTimeout(() => { document.documentElement.style.visibility = ''; }, 3000);

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

      // Обрабатываем элементы времени немедленно
      await processTimeElements();

      // Обрабатываем приоритетные элементы в первую очередь
      const priorityElements = getPriorityElements();
      await translator.translateElementBatch(priorityElements);

      // Обрабатываем элементы с всплывающими подсказками немедленно
      await processTooltipElements();

      // Обрабатываем все остальные элементы батчами
      // Быстрая обработка элементов времени и дат для ускорения отображения
      // Используем оптимизированный подход: сначала конкретные элементы, потом все остальное
      let specificElements = [];

      // Сначала обрабатываем теги времени для быстрой отрисовки дат
      const timeElements = document.querySelectorAll('time');
      specificElements = specificElements.concat(Array.from(timeElements));

      // Затем обрабатываем важные элементы, содержащие текст
      const importantSelectors = 'h1, h2, h3, h4, h5, h6, p, span, div, a, button, li, td, th, small, label, caption';
      const importantElements = document.querySelectorAll(importantSelectors);

      // Оптимизируем проверку игнорируемых классов
      const ignoredClassesArray = Array.from(window.IGNORED_CLASSES);
      const ignoredClassesLen = ignoredClassesArray.length;

      for (const element of importantElements) {
        // Проверяем, есть ли у элемента текстовое содержимое для перевода
        if (element.textContent && element.textContent.trim()) {
          // Проверяем игнорируемые классы
          let shouldIgnore = false;
          if (element.classList && element.classList.length > 0) {
            for (let i = 0; i < ignoredClassesLen; i++) {
              if (element.classList.contains(ignoredClassesArray[i])) {
                shouldIgnore = true;
                break;
              }
            }
          }
          if (!shouldIgnore) {
            specificElements.push(element);
          }
        }
      }

      // Обрабатываем найденные элементы
      await translator.translateElementBatch(specificElements);

      // Показываем контент после завершения перевода
      document.documentElement.style.visibility = '';

      // Начинаем наблюдение за изменениями DOM
      translator.observeMutations();

      // Повторная проверка через 1.5 секунды для динамически загруженного контента
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
                  node.classList.length > 0 &&
                  window.IGNORED_CLASSES) {
                // Проверяем, есть ли классы, которые нужно всегда переводить (оптимизированная проверка)
                const classesArray = Array.from(node.classList);
                const alwaysTranslateClasses = window.ALWAYS_TRANSLATE_CLASSES || new Set();

                let alwaysTranslate = false;
                for (const cls of classesArray) {
                  if (alwaysTranslateClasses.has(cls)) {
                    alwaysTranslate = true;
                    break;
                  }
                }

                // Если не всегда переводить, проверяем игнорируемые классы (оптимизированная проверка)
                if (!alwaysTranslate && window.IGNORED_CLASSES) {
                  const ignoredClasses = window.IGNORED_CLASSES;
                  for (const cls of classesArray) {
                    if (ignoredClasses.has(cls)) {
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
        let count = 0; // Ограничение количества узлов для производительности
        const maxNodes = window.CONFIG?.MAX_NODES_PER_WALK || 10000;
        while ((node = walker.nextNode()) && count < maxNodes) {
          allElements.push(node);
          count++;
        }

        await translator.translateElementBatch(allElements);
      }, 1500); // Проверяем снова через 1.5 секунды

      // Очистка при выгрузке страницы
      window.addEventListener('beforeunload', () => {
        if (cache.worker) {
          cache.worker.terminate();
        }
        translator.cleanup();
      });

      // Debug: log initialization success
      console.log('NRL: Инициализация успешно завершена');

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

  // Debug utility functions
  // Check sessionStorage for persisted debug state
  const debugEnabled = sessionStorage.getItem('NRL_DEBUG') === 'true';
  
  window.NRL_DEBUG = {
    enabled: debugEnabled,
    log: function(...args) {
      if (this.enabled) {
        console.log('[NRL Debug]', ...args);
      }
    },
    time: function(label) {
      if (this.enabled) {
        console.time('[NRL Debug] ' + label);
      }
    },
    timeEnd: function(label) {
      if (this.enabled) {
        console.timeEnd('[NRL Debug] ' + label);
      }
    },
    enable: function() {
      this.enabled = true;
      sessionStorage.setItem('NRL_DEBUG', 'true');
      console.log('[NRL Debug] Debug mode enabled. Please refresh the page (F5) to see logs.');
    },
    disable: function() {
      this.enabled = false;
      sessionStorage.removeItem('NRL_DEBUG');
      console.log('[NRL Debug] Debug mode disabled.');
    },
    performanceReport: function() {
      const performanceData = {
        'IndexedDB Available': 'indexedDB' in window,
        'Web Workers Available': 'Worker' in window,
        'Memory Cache Size': window.templateCache?.size || 0,
        'Context Cache Size': window.contextCheckCache?.size || 0,
        'Heading Elements Cache Size': window.headingElementsCache?.size || 0
      };
      console.table(performanceData);
    }
  };
  
  // Log initial state if debug is enabled
  if (debugEnabled) {
    console.log('[NRL Debug] Debug mode was enabled from previous session.');
  }

  // Функция для получения приоритетных элементов
  function getPriorityElements() {
    const selectors = window.CONFIG?.PRIORITY_SELECTORS || ['h1', 'h2', 'h3', 'nav', 'button', 'a', '[data-translate-priority="high"]'];
    const result = [];
    const len = selectors.length;

    // Используем DocumentFragment для оптимизации селекторов
    const selectorString = selectors.join(', ');

    try {
      const elements = document.querySelectorAll(selectorString);
      for (let i = 0; i < elements.length; i++) {
        const el = elements[i];
        // Check visibility using multiple methods to catch more cases
        const isVisible = el.offsetParent !== null ||
                         getComputedStyle(el).display !== 'none' ||
                         getComputedStyle(el).visibility !== 'hidden';
        if (isVisible) { // Only visible or potentially visible elements
          result.push(el);
        }
      }
    } catch (e) {
      console.warn(`Selector error for combined selector:`, e);
      // Fallback: проверяем селекторы по отдельности
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
    }

    return result;
  }

  // Предзагрузка ключевых переводов
  async function preloadCriticalTranslations(cache) {
    const criticalTerms = ['Download', 'Mods', 'Games', 'Collections', 'Media', 'Community', 'Support', 'Home', 'Search', 'Login', 'Register'];
    // Выполняем параллельно, так как кэш может обрабатывать несколько запросов
    const promises = criticalTerms.map(term => cache.getCachedTranslation(term));
    await Promise.allSettled(promises);
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

       // Вызываем глобальную очистку всех кэшей (из lru-cache.js)
       if (typeof window.clearAllCaches === 'function') {
         window.clearAllCaches();
       } else {
         // Fallback очистка, если функция недоступна
         if (window.templateCache && typeof window.templateCache.clear === 'function') {
           window.templateCache.clear();
         }
         if (window.contextCheckCache instanceof Map) {
           window.contextCheckCache.clear();
         }
         if (window.headingElementsCache instanceof Set) {
           window.headingElementsCache.clear();
         }
       }

       // Очистка PLURAL_MAP если есть
       if (window.PLURAL_MAP) {
         window.PLURAL_MAP = {};
       }
       
       console.log('[NRL] Кэш полностью очищен. Страница будет перезагружена...');
       // Автоматическая перезагрузка через 1 секунду
       setTimeout(() => {
         window.location.reload();
       }, 1000);
     } catch (e) {
       console.warn('[NRL] Ошибка при очистке кэша:', e);
       alert('Ошибка при очистке кэша: ' + e.message);
     }
   }

   // Регистрация команд меню для Tampermonkey
   if (typeof GM_registerMenuCommand !== 'undefined') {
     // Максимально совместимый синтаксис для всех версий
     GM_registerMenuCommand('NRL: Очистить кэш', clearCache, 'c');
     GM_registerMenuCommand('NRL: Включить отладку', () => {
       if (window.NRL_DEBUG && typeof window.NRL_DEBUG.enable === 'function') {
         window.NRL_DEBUG.enable();
       } else {
         alert('Отладка недоступна');
       }
     }, 'd');
     GM_registerMenuCommand('NRL: Отключить отладку', () => {
       if (window.NRL_DEBUG && typeof window.NRL_DEBUG.disable === 'function') {
         window.NRL_DEBUG.disable();
       } else {
         alert('Отладка недоступна');
       }
     }, 'e');
   }

  // Функция для обработки элементов времени
  async function processTimeElements() {
    const timeElements = document.querySelectorAll('time');
    const elementsArray = Array.from(timeElements);

    for (const element of elementsArray) {
      let text = element.textContent.trim();
      if (text) {
        // Применяем форматирование дат
        let translated = window.dateFormatter.format(text);
        if (translated !== text) {
          element.textContent = translated;
        } else {
          // Проверяем общий словарь
          translated = window.NRL_TRANSLATIONS?.main[text];
          if (translated && translated !== text) {
            element.textContent = translated;
          } else {
            // Пробуем динамические шаблоны
            for (const template of window.DYNAMIC_TEMPLATES) {
              // Быстрая проверка на длину текста для безопасности
              if (text.length > 1000) {
                console.warn('Skipping very long text for security reasons:', text.substring(0, 50) + '...');
                continue;
              }

              if (template.pattern.test(text)) {
                template.pattern.lastIndex = 0; // сбрасываем для повторного использования
                if (template.replacer) {
                  const newText = text.replace(template.pattern, (...args) => template.replacer(...args));
                  if (newText !== text) {
                    element.textContent = newText;
                    break;
                  }
                } else if (template.replacement) {
                  const newText = text.replace(template.pattern, template.replacement);
                  if (newText !== text) {
                    element.textContent = newText;
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

  // Функция для обработки элементов с всплывающими подсказками
  async function processTooltipElements() {
    // Находим элементы с атрибутами подсказок - используем один селектор для производительности
    const selectorString = '[title], [data-tooltip], [data-original-title], [data-bs-title], [data-bs-tooltip], [data-toggle="tooltip"], [data-toggle="popover"]';
    const elements = Array.from(document.querySelectorAll(selectorString));

    for (const element of elements) {
      // Обрабатываем атрибуты подсказок
      const title = element.getAttribute('title');
      if (title && title.trim()) {
        // Добавляем проверку на длину текста для безопасности
        if (title.length > 1000) {
          console.warn('Skipping very long title for security reasons:', title.substring(0, 50) + '...');
        } else {
          let translated = window.NRL_TRANSLATIONS?.main[title];
          if (!translated) {
            translated = window.dateFormatter.format(title);
          }
          if (translated && translated !== title) {
            element.setAttribute('title', translated);
          }
        }
      }

      const dataTooltip = element.getAttribute('data-tooltip');
      if (dataTooltip && dataTooltip.trim()) {
        if (dataTooltip.length > 1000) {
          console.warn('Skipping very long data-tooltip for security reasons:', dataTooltip.substring(0, 50) + '...');
        } else {
          let translated = window.NRL_TRANSLATIONS?.main[dataTooltip];
          if (!translated) {
            translated = window.dateFormatter.format(dataTooltip);
          }
          if (translated && translated !== dataTooltip) {
            element.setAttribute('data-tooltip', translated);
          }
        }
      }

      const dataOriginalTitle = element.getAttribute('data-original-title');
      if (dataOriginalTitle && dataOriginalTitle.trim()) {
        if (dataOriginalTitle.length > 1000) {
          console.warn('Skipping very long data-original-title for security reasons:', dataOriginalTitle.substring(0, 50) + '...');
        } else {
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
  }

  // Запуск
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();