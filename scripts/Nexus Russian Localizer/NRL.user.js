// ==UserScript==
// @name            Nexus Russian Localizer
// @name:ru         Nexus Russian Localizer
// @namespace       http://tampermonkey.net/
// @description     Add Russian localization for Nexus Mods.
// @description:ru  Добавляет русскую локализацию для сайта Nexus Mods.
// @version         2.3.0
// @author          vanja-san
// @match           https://*.nexusmods.com/*
// @icon            https://www.google.com/s2/favicons?sz=64&domain=nexusmods.com
// @downloadURL     https://raw.githubusercontent.com/vanja-san/JS-UserScripts/main/scripts/Nexus Russian Localizer/NRL.user.js
// @updateURL       https://raw.githubusercontent.com/vanja-san/JS-UserScripts/main/scripts/Nexus Russian Localizer/NRL.user.js
// @require         https://raw.githubusercontent.com/vanja-san/JS-UserScripts/main/scripts/Nexus Russian Localizer/translations.js
// @require         https://raw.githubusercontent.com/vanja-san/JS-UserScripts/main/scripts/Nexus Russian Localizer/src/config.js
// @require         https://raw.githubusercontent.com/vanja-san/JS-UserScripts/main/scripts/Nexus Russian Localizer/src/lru-cache.js
// @require         https://raw.githubusercontent.com/vanja-san/JS-UserScripts/main/scripts/Nexus Russian Localizer/src/helpers.js
// @require         https://raw.githubusercontent.com/vanja-san/JS-UserScripts/main/scripts/Nexus Russian Localizer/src/context-matcher.js
// @require         https://raw.githubusercontent.com/vanja-san/JS-UserScripts/main/scripts/Nexus Russian Localizer/src/translation-cache.js
// @require         https://raw.githubusercontent.com/vanja-san/JS-UserScripts/main/scripts/Nexus Russian Localizer/src/translation-engine.js
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

      // Обрабатываем все остальные элементы батчами
      const allElements = document.querySelectorAll('body *');
      await translator.translateElementBatch(allElements);

      // Показываем контент после завершения перевода
      document.documentElement.style.visibility = '';

      // Начинаем наблюдение за изменениями DOM
      translator.observeMutations();

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
          const text = node.textContent.trim();
          if (!text) return;
          const element = node.parentElement;

          // Сначала проверяем контекстные правила
          const contextualResult = contextMatcher.findTranslation(text, element);
          if (contextualResult) {
            node.textContent = contextualResult.translation;
            return;
          }

          // Затем общий словарь
          if (window.NRL_TRANSLATIONS?.main[text]) {
            node.textContent = window.NRL_TRANSLATIONS.main[text];
          }
        } else {
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
      const elements = document.querySelectorAll(selectors[i]);
      for (let j = 0; j < elements.length; j++) {
        const el = elements[j];
        if (el.offsetParent !== null) { // Только видимые элементы
          result.push(el);
        }
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

  // Запуск
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();