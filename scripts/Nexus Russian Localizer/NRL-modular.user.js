import { CONFIG } from './src/config.js';
import { LRUCache, contextCheckCache, headingElementsCache, IGNORED_CLASSES, templateCache } from './src/lru-cache.js';
import { pluralize, createPluralizationTemplates, DYNAMIC_TEMPLATES } from './src/helpers.js';
import { ContextMatcher } from './src/context-matcher.js';
import { TranslationCache } from './src/translation-cache.js';
import { TranslationEngine } from './src/translation-engine.js';

(function() {
  'use strict';

  // Функция для получения приоритетных элементов
  function getPriorityElements() {
    return CONFIG.PRIORITY_SELECTORS.flatMap(selector =>
                                             Array.from(document.querySelectorAll(selector))
                                            ).filter(el => el.offsetParent !== null); // Только видимые элементы
  }

  // Предзагрузка ключевых переводов
  async function preloadCriticalTranslations(cache) {
    const criticalTerms = ['Download', 'Mods', 'Games', 'Collections', 'Media', 'Community', 'Support', 'Home', 'Search', 'Login', 'Register'];
    await Promise.all(criticalTerms.map(term =>
                                        cache.getCachedTranslation(term)
                                       ));
  }

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
      await translator.translateElementBatch(priorityElements);

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

  // Запуск
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();