// Класс для управления кэшированием
class TranslationCache {
  constructor() {
    this.memoryCache = new window.LRUCache();
    this.pendingCompressions = new Map();
    this.pendingDecompressions = new Map();
    this.db = null;
    this.worker = null;
    this.initWorker();
  }

  initWorker() {
    const workerCode = `
      const COMPRESSION_THRESHOLD = ${window.CONFIG?.COMPRESSION_THRESHOLD || 100};

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

    try {
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
    } catch (error) {
      console.warn('Ошибка инициализации Web Worker:', error);
      // Используем резервный вариант без воркера
      this.worker = null;
    }
  }

  async initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(window.CONFIG?.DB_NAME || 'translationCache', window.CONFIG?.DB_VERSION || 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const database = event.target.result;
        if (!database.objectStoreNames.contains(window.CONFIG?.STORE_NAME || 'translations')) {
          const store = database.createObjectStore(window.CONFIG?.STORE_NAME || 'translations', { keyPath: 'key' });
          store.createIndex('version', 'version', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  async save(key, value, isCompressed = false) {
    if (!this.db) return;

    try {
      const transaction = this.db.transaction([window.CONFIG?.STORE_NAME || 'translations'], 'readwrite');
      const store = transaction.objectStore(window.CONFIG?.STORE_NAME || 'translations');
      const item = {
        key: `${window.CONFIG?.CACHE_VERSION || 'v1.0.1'}:${key}`,
        value: value,
        compressed: isCompressed,
        timestamp: Date.now(),
        version: window.CONFIG?.CACHE_VERSION || 'v1.0.1'
      };
      store.put(item);
    } catch (e) {
      console.warn('Ошибка сохранения в IndexedDB:', e);
    }
  }

  async bulkSaveTranslations(translations) {
    if (!this.db || !translations.length) return;

    try {
      const transaction = this.db.transaction([window.CONFIG?.STORE_NAME || 'translations'], 'readwrite');
      const store = transaction.objectStore(window.CONFIG?.STORE_NAME || 'translations');

      translations.forEach(([key, value, isCompressed = false]) => {
        store.put({
          key: `${window.CONFIG?.CACHE_VERSION || 'v1.0.1'}:${key}`,
          value,
          compressed: isCompressed,
          timestamp: Date.now(),
          version: window.CONFIG?.CACHE_VERSION || 'v1.0.1'
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
      const transaction = this.db.transaction([window.CONFIG?.STORE_NAME || 'translations'], 'readonly');
      const store = transaction.objectStore(window.CONFIG?.STORE_NAME || 'translations');
      const request = store.get(`${window.CONFIG?.CACHE_VERSION || 'v1.0.1'}:${key}`);

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
    if (translation.length >= (window.CONFIG?.COMPRESSION_THRESHOLD || 100)) {
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