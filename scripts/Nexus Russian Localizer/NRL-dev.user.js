// ==UserScript==
// @name            Nexus Russian Localizer DEV
// @name:ru         Nexus Russian Localizer DEV
// @namespace       http://tampermonkey.net/
// @description     Add Russian localization for Nexus Mods.
// @description:ru  Добавляет русскую локализацию для сайта Nexus Mods.
// @version         2.2.0-dev
// @author          vanja-san
// @match           https://*.nexusmods.com/*
// @icon            https://www.google.com/s2/favicons?sz=64&domain=nexusmods.com
// @downloadURL     https://raw.githubusercontent.com/vanja-san/JS-UserScripts/main/scripts/Nexus Russian Localizer/NRL-dev.user.js
// @updateURL       https://raw.githubusercontent.com/vanja-san/JS-UserScripts/main/scripts/Nexus Russian Localizer/NRL-dev.user.js
// @require         https://raw.githubusercontent.com/vanja-san/JS-UserScripts/main/scripts/Nexus Russian Localizer/translations.js
// @grant           none
// @license         MIT
// ==/UserScript==

(function() {
  'use strict';

  // Константы
  const CONFIG = {
    CACHE_VERSION: 'v1.0.1',
    DB_NAME: 'translationCache',
    DB_VERSION: 1,
    STORE_NAME: 'translations',
    COMPRESSION_THRESHOLD: 100,
    MEMORY_CACHE_LIMIT: 1000,
    BATCH_SIZE: 50,
    BATCH_DELAY: 0,
    PRIORITY_SELECTORS: ['h1', 'h2', 'h3', 'nav', 'button', 'a', '[data-translate-priority="high"]']
  };

  // LRU кэш для памяти
  class LRUCache {
    constructor(limit = CONFIG.MEMORY_CACHE_LIMIT) {
      this.cache = new Map();
      this.limit = limit;
    }

    get(key) {
      if (!this.cache.has(key)) return null;
      const value = this.cache.get(key);
      this.cache.delete(key);
      this.cache.set(key, value);
      return value;
    }

    set(key, value) {
      if (this.cache.size >= this.limit) {
        this.cache.delete(this.cache.keys().next().value);
      }
      this.cache.set(key, value);
    }

    has(key) {
      return this.cache.has(key);
    }

    delete(key) {
      return this.cache.delete(key);
    }

    clear() {
      this.cache.clear();
    }

    get size() {
      return this.cache.size;
    }
  }

  const contextCheckCache = new Map();
  const headingElementsCache = new Set();
  const IGNORED_CLASSES = new Set(['no-translate', 'ignore-translation', 'code', 'pre']);
  const templateCache = new LRUCache(500);

  // Импортируем словари переводов из отдельного файла
  // Словари вынесены в отдельные константы для лучшей организации
  const DICTIONARIES = window.NRL_TRANSLATIONS || {
    main: {},
    contextual: {},
    months: {},
    translatableAttributes: []
  };

  // Класс для компиляции и сопоставления контекстных правил
  class ContextMatcher {
    constructor() {
      this.rulesCache = new Map();
      this.buildRulesCache();
    }

    buildRulesCache() {
      for (const [text, contexts] of Object.entries(DICTIONARIES.contextual)) {
        const rules = Object.entries(contexts).map(([context, translation]) => ({
          context,
          translation,
          compiledSelector: this.compileSelector(context)
        }));
        this.rulesCache.set(text, rules);
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

      if (contextCheckCache.has(cacheKey)) {
        return contextCheckCache.get(cacheKey);
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

      contextCheckCache.set(cacheKey, result);
      return result;
    }

    findTranslation(text, element) {
      const rules = this.rulesCache.get(text);
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

  // Шаблоны для динамического перевода
  const DYNAMIC_TEMPLATES = [
    {
      pattern: /(\d{1,2})\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s*(\d{4})/gi,
      replacer: (match, day, month, year) =>
      `${day} ${DICTIONARIES.months[month] || month} ${year}`
  },
    // Универсальный шаблон для всех временных интервалов с ago
    {
      pattern: /(\d+)[\s\u00A0]+(second|minute|hour|day|week|month|year)s?[\s\u00A0]+ago/gi,
      replacer: (match, count, unit) => {
        const num = parseInt(count);
        const units = {
          second: ['секунду', 'секунды', 'секунд'],
          minute: ['минуту', 'минуты', 'минут'],
          hour: ['час', 'часа', 'часов'],
          day: ['день', 'дня', 'дней'],
          week: ['неделю', 'недели', 'недель'],
          month: ['месяц', 'месяца', 'месяцев'],
          year: ['год', 'года', 'лет']
        };

        return `${num} ${pluralize(num, units[unit])} назад`;
      }
    },

    // Шаблоны с плюрализацией (только для отдельных слов, без ago)
    ...createPluralizationTemplates([
      {en: 'mods', ru: ['мод', 'мода', 'модов']},
      {en: 'images?', ru: ['изображение', 'изображения', 'изображений']},
      {en: 'collections?', ru: ['коллекция', 'коллекции', 'коллекций']},
      {en: 'downloads?', ru: ['скачивание', 'скачивания', 'скачиваний']},
      {en: 'endorsements?', ru: ['одобрение', 'одобрения', 'одобрений']},
      {en: 'views?', ru: ['просмотр', 'просмотра', 'просмотров']},
      {en: 'replies?', ru: ['ответ', 'ответа', 'ответов']},
      {en: 'Members', ru: ['участник', 'участника', 'участников']},
      {en: 'Anonymous', ru: ['аноним', 'анонима', 'анонимов']},
      {en: 'Guests', ru: ['гость', 'гостя', 'гостей']},
      {en: 'members', ru: ['участник', 'участника', 'участников']},
      {en: 'results', ru: ['результат', 'результата', 'результатов']},
      {en: 'Comments', ru: ['комментарий', 'комментария', 'комментариев']},
      {en: 'mods in 1-click with Premium', ru: ['мод в один клик с премиум', 'мода в один клик с премиум', 'модов в один клик с премиум']}
    ]),

    // Статические шаблоны
    { pattern: /(\d+)\s*GB/gi, replacement: "$1 ГБ" },
    { pattern: /(\d+)\s*MB/gi, replacement: "$1 МБ" },
    { pattern: /(\d+)\s*KB/gi, replacement: "$1 КБ" },
    { pattern: /(\d+)\s*Collections/gi, replacement: "$1 коллекций" },
    { pattern: /(\d+)\s*files/gi, replacement: "$1 файлов" },
  ];

  // Вспомогательные функции
  function pluralize(number, forms) {
    if (!number || !forms || forms.length < 3) return forms[2] || '';
    const lastTwo = number % 100;
    if (lastTwo >= 11 && lastTwo <= 19) return forms[2];

    const lastDigit = number % 10;
    if (lastDigit === 1) return forms[0];
    if (lastDigit >= 2 && lastDigit <= 4) return forms[1];
    return forms[2];
  }

  function createPluralizationTemplates(units) {
    return units.map(({en, ru}) => ({
      pattern: new RegExp(`(\\d+)\\s*${en}`, 'gi'),
      replacer: (match, count) => {
        const num = parseInt(count);
        return `${num} ${pluralize(num, ru)}`;
      }
    }));
  }

  // Класс для управления кэшированием
  class TranslationCache {
    constructor() {
      this.memoryCache = new LRUCache();
      this.pendingCompressions = new Map();
      this.pendingDecompressions = new Map();
      this.db = null;
      this.worker = null;
      this.initWorker();
    }

    initWorker() {
      const workerCode = `
        const COMPRESSION_THRESHOLD = ${CONFIG.COMPRESSION_THRESHOLD};

        function compressText(text) {
          if (text.length < COMPRESSION_THRESHOLD) return text;
          try {
            return new TextEncoder().encode(text);
          } catch (e) {
            return text;
          }
        }

        function decompressText(compressed) {
          if (typeof compressed === 'string') return compressed;
          try {
            return new TextDecoder().decode(compressed);
          } catch (e) {
            return '';
          }
        }

        self.onmessage = function(e) {
          const { type, data } = e.data;
          switch (type) {
            case 'compress':
              self.postMessage({
                type: 'compressed',
                id: data.id,
                result: compressText(data.text)
              });
              break;
            case 'decompress':
              self.postMessage({
                type: 'decompressed',
                id: data.id,
                result: decompressText(data.compressed)
              });
              break;
          }
        };
      `;

      const blob = new Blob([workerCode], { type: 'application/javascript' });
      this.worker = new Worker(URL.createObjectURL(blob));

      this.worker.onmessage = (e) => {
        const { type, id, result } = e.data;
        if (type === 'compressed') {
          this.handleCompressed(id, result);
        } else if (type === 'decompressed') {
          this.handleDecompressed(id, result);
        }
      };
    }

    async initDB() {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(CONFIG.DB_NAME, CONFIG.DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          this.db = request.result;
          resolve(this.db);
        };

        request.onupgradeneeded = (event) => {
          const database = event.target.result;
          if (!database.objectStoreNames.contains(CONFIG.STORE_NAME)) {
            const store = database.createObjectStore(CONFIG.STORE_NAME, { keyPath: 'key' });
            store.createIndex('version', 'version', { unique: false });
            store.createIndex('timestamp', 'timestamp', { unique: false });
          }
        };
      });
    }

    async save(key, value, isCompressed = false) {
      if (!this.db) return;

      try {
        const transaction = this.db.transaction([CONFIG.STORE_NAME], 'readwrite');
        const store = transaction.objectStore(CONFIG.STORE_NAME);
        const item = {
          key: `${CONFIG.CACHE_VERSION}:${key}`,
          value: value,
          compressed: isCompressed,
          timestamp: Date.now(),
          version: CONFIG.CACHE_VERSION
        };
        store.put(item);
      } catch (e) {
        console.warn('Ошибка сохранения в IndexedDB:', e);
      }
    }

    async bulkSaveTranslations(translations) {
      if (!this.db || !translations.length) return;

      try {
        const transaction = this.db.transaction([CONFIG.STORE_NAME], 'readwrite');
        const store = transaction.objectStore(CONFIG.STORE_NAME);

        translations.forEach(([key, value, isCompressed = false]) => {
          store.put({
            key: `${CONFIG.CACHE_VERSION}:${key}`,
            value,
            compressed: isCompressed,
            timestamp: Date.now(),
            version: CONFIG.CACHE_VERSION
          });
        });

        return new Promise(resolve => transaction.oncomplete = resolve);
      } catch (e) {
        console.warn('Ошибка массового сохранения в IndexedDB:', e);
      }
    }

    async get(key) {
      if (!this.db) return null;

      try {
        const transaction = this.db.transaction([CONFIG.STORE_NAME], 'readonly');
        const store = transaction.objectStore(CONFIG.STORE_NAME);
        const request = store.get(`${CONFIG.CACHE_VERSION}:${key}`);

        return new Promise((resolve) => {
          request.onerror = () => resolve(null);
          request.onsuccess = () => resolve(request.result || null);
        });
      } catch (e) {
        console.warn('Ошибка чтения из IndexedDB:', e);
        return null;
      }
    }

    async cacheTranslation(text, context, translation) {
      const key = context ? `${text}::${context}` : text;

      // Сохраняем в памяти
      this.memoryCache.set(key, translation);

      // Для длинных текстов используем сжатие
      if (translation.length >= CONFIG.COMPRESSION_THRESHOLD) {
        const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        this.pendingCompressions.set(id, { key, translation });
        this.worker.postMessage({
          type: 'compress',
          data: { id, text: translation }
        });
      } else {
        // Короткие тексты сохраняем без сжатия
        await this.save(key, translation, false);
      }
    }

    async getCachedTranslation(text, context = '') {
      const key = context ? `${text}::${context}` : text;

      // Сначала проверяем кэш в памяти
      const memoryCached = this.memoryCache.get(key);
      if (memoryCached) {
        return memoryCached;
      }

      // Затем проверяем IndexedDB
      const cached = await this.get(key);
      if (!cached) {
        return null;
      }

      // Если данные сжаты, распаковываем их
      if (cached.compressed && cached.value instanceof Uint8Array) {
        return new Promise((resolve) => {
          const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          this.pendingDecompressions.set(id, resolve);
          this.worker.postMessage({
            type: 'decompress',
            data: { id, compressed: cached.value }
          });
        });
      }

      // Сохраняем в памяти для будущего использования
      this.memoryCache.set(key, cached.value);
      return cached.value;
    }

    handleCompressed(id, result) {
      const data = this.pendingCompressions.get(id);
      if (data) {
        this.save(data.key, result, true);
        this.pendingCompressions.delete(id);
      }
    }

    handleDecompressed(id, result) {
      const resolve = this.pendingDecompressions.get(id);
      if (resolve) {
        resolve(result);
        this.pendingDecompressions.delete(id);
      }
    }

    async preCacheTranslations() {
      const bulkData = [];

      // Кэшируем общий словарь
      for (const [text, translation] of Object.entries(DICTIONARIES.main)) {
        this.memoryCache.set(text, translation);
        bulkData.push([text, translation, false]);
      }

      // Кэшируем контекстный словарь
      for (const [text, contexts] of Object.entries(DICTIONARIES.contextual)) {
        for (const [context, translation] of Object.entries(contexts)) {
          const cacheKey = `${text}::${context}`;
          this.memoryCache.set(cacheKey, translation);
          bulkData.push([cacheKey, translation, false]);
        }
      }

      // Массовое сохранение в IndexedDB
      await this.bulkSaveTranslations(bulkData);
    }
  }

  // Класс для управления переводом
  class TranslationEngine {
    constructor(cache) {
      this.cache = cache;
      this.contextMatcher = new ContextMatcher();
      this.processedNodes = new WeakSet();
      this.processedAttrs = new WeakMap();
      this.observer = null;
    }

    async translateAttributes(element) {
      if (!element || !element.attributes) return;

      let processedAttrsForElement = this.processedAttrs.get(element);
      if (!processedAttrsForElement) {
        processedAttrsForElement = new Set();
        this.processedAttrs.set(element, processedAttrsForElement);
      }

      for (const attr of DICTIONARIES.translatableAttributes) {
        if (processedAttrsForElement.has(attr)) continue;

        const value = element.getAttribute(attr);
        if (!value) continue;

        // Проверяем контекстные правила для атрибутов
        const contextualResult = this.contextMatcher.findTranslation(value, element);
        let translated = contextualResult ? contextualResult.translation : null;

        // Если не нашли контекстный перевод, используем общий словарь
        if (!translated) {
          translated = await this.cache.getCachedTranslation(value);
          if (!translated && DICTIONARIES.main[value]) {
            translated = DICTIONARIES.main[value];
            await this.cache.cacheTranslation(value, '', translated);
          }
        }

        if (translated) {
          element.setAttribute(attr, translated);
          processedAttrsForElement.add(attr);

          // Кэшируем контекстный перевод
          if (contextualResult) {
            await this.cache.cacheTranslation(value, contextualResult.context, translated);
          }
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
      const cached = templateCache.get(cacheKey);
      if (cached) {
        return cached;
      }

      let newText = text;
      let replaced = false;

      for (const template of DYNAMIC_TEMPLATES) {
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
        templateCache.set(cacheKey, result);
      }

      return result;
    }

    async translateTextNode(node) {
      if (this.processedNodes.has(node)) return false;

      const originalText = node.textContent;
      let text = originalText.trim();
      if (!text) return false;

      // Быстрая проверка: пропускаем чисто числовые значения
      if (/^\d+$/.test(text)) {
        this.processedNodes.add(node);
        return false;
      }

      // Быстрая проверка: пропускаем комбинации чисел и специальных символов
      if (/^[\d\s\.\,\-\+\:\%]+$/.test(text)) {
        this.processedNodes.add(node);
        return false;
      }

      // Быстрая проверка: если текст уже на кириллице, пропускаем
      if (/[а-яёА-ЯЁ]/.test(text) && !/[a-zA-Z]/.test(text)) {
        this.processedNodes.add(node);
        return false;
      }

      const element = node.parentNode;

      // 0. Сначала проверяем контекстные правила (самые специфичные)
      const contextualResult = this.contextMatcher.findTranslation(text, element);
      if (contextualResult) {
        node.textContent = contextualResult.translation;
        await this.cache.cacheTranslation(text, contextualResult.context, contextualResult.translation);
        this.processedNodes.add(node);
        return true;
      }

      // 1. Затем проверяем общий словарь
      if (DICTIONARIES.main[text]) {
        node.textContent = DICTIONARIES.main[text];
        await this.cache.cacheTranslation(text, '', DICTIONARIES.main[text]);
        this.processedNodes.add(node);
        return true;
      }

      // 2. Затем проверяем кэш
      const cachedTranslation = await this.cache.getCachedTranslation(text);
      if (cachedTranslation) {
        node.textContent = cachedTranslation;
        this.processedNodes.add(node);
        return true;
      }

      // 3. Пробуем применить все динамические шаблоны
      const dynamicResult = await this.applyDynamicTemplates(originalText, element);
      if (dynamicResult.replaced) {
        node.textContent = dynamicResult.text;
        this.processedNodes.add(node);
        return true;
      }

      this.processedNodes.add(node);
      return false;
    }

    async translateElement(element) {
      if (!element || this.processedNodes.has(element)) return;

      // Пропускаем элементы с определенными классами
      if (Array.from(element.classList).some(cls => IGNORED_CLASSES.has(cls))) {
        this.processedNodes.add(element);
        return;
      }

      // Специальная обработка заголовков
      const tagName = element.tagName.toLowerCase();
      if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
        if (headingElementsCache.has(element)) return;
        headingElementsCache.add(element);

        // Для заголовков используем упрощенную логику
        const text = element.textContent.trim();
        if (text && DICTIONARIES.main[text]) {
          element.textContent = DICTIONARIES.main[text];
          await this.cache.cacheTranslation(text, '', DICTIONARIES.main[text]);
          this.processedNodes.add(element);
          return;
        }
      }

      // Переводим атрибуты элемента
      await this.translateAttributes(element);

      // Рекурсивно обходим дочерние элементы
      for (const child of element.childNodes) {
        await this.translateNode(child);
      }

      this.processedNodes.add(element);
    }

    async translateNode(node) {
      if (this.processedNodes.has(node)) return;

      if (node.nodeType === Node.TEXT_NODE) {
        await this.translateTextNode(node);
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        await this.translateElement(node);
      }
    }

    async translateElementBatch(elements) {
      for (let i = 0; i < elements.length; i += CONFIG.BATCH_SIZE) {
        const batch = Array.from(elements).slice(i, i + CONFIG.BATCH_SIZE);
        await Promise.all(batch.map(el => this.translateNode(el)));

        // Даем браузеру возможность обработать другие события
        if (CONFIG.BATCH_DELAY > 0) {
          await new Promise(resolve => setTimeout(resolve, CONFIG.BATCH_DELAY));
        }
      }
    }

    observeMutations() {
      this.observer = new MutationObserver(async (mutations) => {
        const addedNodes = mutations.flatMap(m => Array.from(m.addedNodes));
        const visibleNodes = addedNodes.filter(node =>
                                               node.nodeType === Node.ELEMENT_NODE &&
                                               node.isConnected &&
                                               node.offsetParent !== null
                                              );

        for (const node of visibleNodes) {
          await this.translateNode(node);
        }
      });

      this.observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    }

    cleanup() {
      if (this.observer) {
        this.observer.disconnect();
        this.observer = null;
      }

      this.processedAttrs = new WeakMap();
    }
  }

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

      const translator = new TranslationEngine(cache);

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
      const simpleTranslate = (node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent.trim();
          if (!text) return;
          const element = node.parentElement;

          // Сначала проверяем контекстные правила
          const contextualResult = translator.contextMatcher.findTranslation(text, element);
          if (contextualResult) {
            node.textContent = contextualResult.translation;
            return;
          }

          // Затем общий словарь
          if (DICTIONARIES.main[text]) {
            node.textContent = DICTIONARIES.main[text];
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
