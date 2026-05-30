/**
 * Класс для управления кэшированием переводов
 * Использует как IndexedDB для долгосрочного хранения, так и LRU кэш в памяти для быстрого доступа
 */
class TranslationCache {
  /**
   * Создает экземпляр кэша переводов
   */
  constructor() {
    this.memoryCache = new window.LRUCache();
    this.pendingCompressions = new Map();
    this.pendingDecompressions = new Map();
    this.db = null;
    this.worker = null;
    this.initWorker();
  }

  /**
   * Инициализирует Web Worker для сжатия/распаковки данных
   */
  initWorker() {
    const compressionThreshold = window.CONFIG?.COMPRESSION_THRESHOLD || 100;

    // Проверяем, поддерживаются ли Web Workers
    if (typeof Worker === 'undefined') {
      console.warn('Web Workers не поддерживаются в этом браузере, используем резервный вариант');
      this.worker = null;
      return;
    }

    const workerCode = `
      const COMPRESSION_THRESHOLD = ${compressionThreshold};

      function compressText(text) {
        if (text.length < COMPRESSION_THRESHOLD) return text;
        try {
          return new TextEncoder().encode(text);
        } catch (e) {
          // Резервный вариант для старых браузеров
          if (typeof btoa !== 'undefined') {
            return btoa(encodeURIComponent(text).replace(/%([0-9A-F]{2})/g, function(match, p1) {
              return String.fromCharCode('0x' + p1);
            }));
          }
          return text;
        }
      }

      function decompressText(compressed) {
        if (typeof compressed === 'string') return compressed;
        try {
          // Если это строка (резервный вариант), декодируем её
          if (typeof compressed === 'string') {
            return decodeURIComponent(escape(atob(compressed)));
          }
          // Если это Uint8Array, используем TextDecoder
          return new TextDecoder().decode(compressed);
        } catch (e) {
          // Резервный вариант для старых браузеров
          if (typeof compressed === 'string') {
            try {
              return decodeURIComponent(escape(atob(compressed)));
            } catch (e2) {
              console.error('Ошибка декомпрессии:', e2);
              return compressed;
            }
          }
          return '';
        }
      }

      self.onmessage = function(e) {
        const { type, data } = e.data;
        try {
          switch (type) {
            case 'compress':
              const compressedResult = compressText(data.text);
              self.postMessage({
                type: 'compressed',
                id: data.id,
                result: compressedResult
              });
              break;
            case 'decompress':
              const decompressedResult = decompressText(data.compressed);
              self.postMessage({
                type: 'decompressed',
                id: data.id,
                result: decompressedResult
              });
              break;
            default:
              console.warn('Неизвестный тип сообщения:', type);
          }
        } catch (error) {
          self.postMessage({
            type: 'error',
            id: data?.id,
            error: error.message
          });
        }
      };
    `;

    try {
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      this.worker = new Worker(URL.createObjectURL(blob));

      // Улучшенная обработка сообщений с проверкой ошибок
      this.worker.onmessage = (e) => {
        try {
          const { type, id, result, error } = e.data;

          if (type === 'error') {
            console.error('Ошибка в Web Worker:', error);
            // Удаляем ожидающий элемент из очереди, чтобы избежать утечки памяти
            if (this.pendingCompressions && this.pendingCompressions.has(id)) {
              this.pendingCompressions.delete(id);
            }
            if (this.pendingDecompressions && this.pendingDecompressions.has(id)) {
              const resolve = this.pendingDecompressions.get(id);
              resolve(''); // Возвращаем пустую строку при ошибке
              this.pendingDecompressions.delete(id);
            }
            return;
          }

          if (type === 'compressed') {
            this.handleCompressed(id, result);
          } else if (type === 'decompressed') {
            this.handleDecompressed(id, result);
          }
        } catch (error) {
          console.warn('Ошибка при обработке сообщения от воркера:', error);
        }
      };

      // Обработка ошибок воркера
      this.worker.onerror = (error) => {
        console.error('Ошибка Web Worker:', error);
        // Отключаем воркер при ошибке и используем резервный вариант
        this.worker = null;
      };

      // Обработка ошибок при завершении воркера
      this.worker.onmessageerror = (error) => {
        console.error('Ошибка в передаче сообщения Web Worker:', error);
      };
    } catch (error) {
      console.warn('Ошибка инициализации Web Worker:', error);
      // Используем резервный вариант без воркера
      this.worker = null;
    }
  }

  /**
   * Инициализирует IndexedDB
   * @returns {Promise} Promise, который разрешается после инициализации базы данных
   */
  async initDB() {
    const dbName = window.CONFIG?.DB_NAME || 'translationCache';
    const dbVersion = window.CONFIG?.DB_VERSION || 1;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, dbVersion);

      request.onerror = () => {
        console.error('Ошибка при открытии IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        // Проверим, нужно ли обновить версию кэша
        this.cleanupOldVersions().catch(err => console.warn('Ошибка при очистке старых версий:', err));
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const database = event.target.result;
        const storeName = window.CONFIG?.STORE_NAME || 'translations';

        if (!database.objectStoreNames.contains(storeName)) {
          const store = database.createObjectStore(storeName, { keyPath: 'key' });
          store.createIndex('version', 'version', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  /**
   * Метод для очистки старых версий кэша
   */
  async cleanupOldVersions() {
    if (!this.db) return;

    try {
      const transaction = this.db.transaction([window.CONFIG?.STORE_NAME || 'translations'], 'readwrite');
      const store = transaction.objectStore(window.CONFIG?.STORE_NAME || 'translations');
      const allRecords = await this.getAllRecords(store);

      const currentVersion = window.CONFIG?.CACHE_VERSION || 'v1.0.2';
      const keysToDelete = [];

      for (const record of allRecords) {
        if (!record.key.includes(currentVersion)) {
          keysToDelete.push(record.key);
        }
      }

      // Удаляем устаревшие записи
      for (const key of keysToDelete) {
        store.delete(key);
      }
    } catch (e) {
      console.warn('Ошибка при очистке старых версий кэша:', e);
    }
  }

  /**
   * Вспомогательный метод для получения всех записей из хранилища
   * @param {IDBObjectStore} store - объект хранилища
   * @returns {Promise} Promise, который разрешается массивом записей
   */
  async getAllRecords(store) {
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Сохраняет перевод в IndexedDB
   * @param {string} key - ключ для сохранения
   * @param {*} value - значение для сохранения
   * @param {boolean} isCompressed - флаг сжатия
   */
  async save(key, value, isCompressed = false) {
    if (!this.db) return;

    try {
      // Проверяем длину ключа и значения для безопасности
      if (key.length > 1000 || (value && value.toString().length > 1000000)) {
        console.warn('Skipping save for very large key or value:', key.substring(0, 50));
        return;
      }

      const transaction = this.db.transaction([window.CONFIG?.STORE_NAME || 'translations'], 'readwrite');
      const store = transaction.objectStore(window.CONFIG?.STORE_NAME || 'translations');
      const item = {
        key: `${window.CONFIG?.CACHE_VERSION || 'v1.0.3'}:${key}`,
        value: value,
        compressed: isCompressed,
        timestamp: Date.now(),
        version: window.CONFIG?.CACHE_VERSION || 'v1.0.3'
      };
      store.put(item);
    } catch (e) {
      console.warn('Ошибка сохранения в IndexedDB:', e);
    }
  }

  /**
   * Массовое сохранение переводов в IndexedDB
   * @param {Array} translations - массив переводов для сохранения
   */
  async bulkSaveTranslations(translations) {
    if (!this.db || !translations.length) return;

    try {
      const transaction = this.db.transaction([window.CONFIG?.STORE_NAME || 'translations'], 'readwrite');
      const store = transaction.objectStore(window.CONFIG?.STORE_NAME || 'translations');

      // Ограничиваем количество записей для массового сохранения
      const maxRecords = 1000;
      const recordsToSave = translations.length > maxRecords
        ? translations.slice(0, maxRecords)
        : translations;

      for (const [key, value, isCompressed = false] of recordsToSave) {
        // Проверяем длину ключа и значения для безопасности
        if (key.length > 1000 || (value && value.toString().length > 1000000)) {
          console.warn('Skipping save for very large key or value:', key.substring(0, 50));
          continue;
        }

        store.put({
          key: `${window.CONFIG?.CACHE_VERSION || 'v1.0.3'}:${key}`,
          value,
          compressed: isCompressed,
          timestamp: Date.now(),
          version: window.CONFIG?.CACHE_VERSION || 'v1.0.3'
        });
      }

      return new Promise(resolve => transaction.oncomplete = resolve);
    } catch (e) {
      console.warn('Ошибка массового сохранения в IndexedDB:', e);
    }
  }

  /**
   * Получает перевод из IndexedDB
   * @param {string} key - ключ для получения
   * @returns {*} значение из кэша или null
   */
  async get(key) {
    if (!this.db) return null;

    try {
      const transaction = this.db.transaction([window.CONFIG?.STORE_NAME || 'translations'], 'readonly');
      const store = transaction.objectStore(window.CONFIG?.STORE_NAME || 'translations');
      const request = store.get(`${window.CONFIG?.CACHE_VERSION || 'v1.0.3'}:${key}`);

      return new Promise((resolve) => {
        request.onerror = () => resolve(null);
        request.onsuccess = () => resolve(request.result || null);
      });
    } catch (e) {
      console.warn('Ошибка чтения из IndexedDB:', e);
      return null;
    }
  }

  /**
   * Кэширует перевод
   * @param {string} text - текст для кэширования
   * @param {string} context - контекст текста
   * @param {string} translation - перевод
   */
  async cacheTranslation(text, context, translation) {
    // Проверка безопасности для больших переводов
    if (translation && translation.length > 100000) {
      console.warn('Skipping very large translation for security reasons:', translation.substring(0, 50) + '...');
      return;
    }

    const key = context ? `${text}::${context}` : text;

    // Сохраняем в памяти
    this.memoryCache.set(key, translation);

    // Для длинных текстов используем сжатие
    if (translation.length >= (window.CONFIG?.COMPRESSION_THRESHOLD || 100)) {
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Ограничение количества ожидающих сжатий для предотвращения переполнения
      if (this.pendingCompressions.size > 500) {
        console.warn('Too many pending compressions, skipping compression for:', key);
        await this.save(key, translation, false);
        return;
      }

      this.pendingCompressions.set(id, { key, translation });
      // Проверяем, есть ли воркер, иначе сохраняем без сжатия
      if (this.worker) {
        try {
          this.worker.postMessage({
            type: 'compress',
            data: { id, text: translation }
          });
        } catch (error) {
          console.warn('Error posting message to worker, saving without compression:', error);
          await this.save(key, translation, false);
          this.pendingCompressions.delete(id);
        }
      } else {
        // Если воркер недоступен, сохраняем без сжатия
        await this.save(key, translation, false);
        this.pendingCompressions.delete(id);
      }
    } else {
      // Короткие тексты сохраняем без сжатия
      await this.save(key, translation, false);
    }
  }

  /**
   * Получает закэшированный перевод
   * @param {string} text - текст для поиска
   * @param {string} context - контекст текста
   * @returns {Promise} Promise, который разрешается переводом
   */
  async getCachedTranslation(text, context = '') {
    // Проверка безопасности для длинных текстов
    if (text && text.length > 10000) {
      console.warn('Skipping very long text for security reasons:', text.substring(0, 50) + '...');
      return null;
    }

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
        // Проверяем, есть ли воркер, иначе возвращаем пустую строку
        if (this.worker) {
          this.worker.postMessage({
            type: 'decompress',
            data: { id, compressed: cached.value }
          });
        } else {
          resolve('');
        }
      });
    }

    // Сохраняем в памяти для будущего использования
    this.memoryCache.set(key, cached.value);
    return cached.value;
  }

  /**
   * Обрабатывает результат сжатия
   * @param {string} id - идентификатор операции
   * @param {*} result - результат сжатия
   */
  handleCompressed(id, result) {
    const data = this.pendingCompressions.get(id);
    if (data) {
      this.save(data.key, result, true);
      this.pendingCompressions.delete(id);
    }
  }

  /**
   * Обрабатывает результат распаковки
   * @param {string} id - идентификатор операции
   * @param {*} result - результат распаковки
   */
  handleDecompressed(id, result) {
    const resolve = this.pendingDecompressions.get(id);
    if (resolve) {
      resolve(result);
      this.pendingDecompressions.delete(id);
    }
  }

  /**
   * Предварительно кэширует переводы из основного словаря
   */
  async preCacheTranslations() {
    const bulkData = [];

    // Кэшируем общий словарь
    for (const [text, translation] of Object.entries(window.NRL_TRANSLATIONS?.main || {})) {
      this.memoryCache.set(text, translation);
      bulkData.push([text, translation, false]);
    }

    // Кэшируем контекстный словарь
    for (const [text, contexts] of Object.entries(window.NRL_TRANSLATIONS?.contextual || {})) {
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

window.TranslationCache = TranslationCache;