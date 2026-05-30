// LRU кэш для памяти
class LRUCache {
  #cache;
  #limit;

  constructor(limit = window.CONFIG?.MEMORY_CACHE_LIMIT || 1500) {
    this.#cache = new Map();
    this.#limit = limit;
  }

  get(key) {
    if (!this.#cache.has(key)) return null;
    const value = this.#cache.get(key);
    // Move the key to the end to mark it as recently used
    this.#cache.delete(key);
    this.#cache.set(key, value);
    return value;
  }

  set(key, value) {
    if (this.#cache.size >= this.#limit) {
      // Delete the first key (least recently used) in the map
      const firstKey = this.#cache.keys().next().value;
      this.#cache.delete(firstKey);
    }
    this.#cache.set(key, value);
    return this; // Enable method chaining
  }

  has(key) {
    return this.#cache.has(key);
  }

  delete(key) {
    return this.#cache.delete(key);
  }

  clear() {
    this.#cache.clear();
  }

  get size() {
    return this.#cache.size;
  }

  // Additional modern methods
  keys() {
    return Array.from(this.#cache.keys());
  }

  values() {
    return Array.from(this.#cache.values());
  }

  entries() {
    return Array.from(this.#cache.entries());
  }

  forEach(callback) {
    this.#cache.forEach((value, key) => {
      callback(value, key, this);
    });
  }
}

// Кэш для проверки контекста
window.contextCheckCache = new Map();
window.headingElementsCache = new Set();
window.IGNORED_CLASSES = new Set(['no-translate', 'ignore-translation', 'code', 'pre', 'notranslate']);
// Классы, которые НЕ нужно игнорировать (всегда обрабатывать, даже если похожи на игнорируемые)
window.ALWAYS_TRANSLATE_CLASSES = new Set(['sr-only']); // Обрабатываем даже если элементы скрыты
window.templateCache = new LRUCache(1000); // Increased from 500 to 1000
window.LRUCache = LRUCache;

// Ограничение размера для предотвращения утечек памяти
const CONTEXT_CHECK_CACHE_LIMIT = 20000; // Increased from 15000
const HEADING_ELEMENTS_CACHE_LIMIT = 5000;
const TEMPLATE_CACHE_LIMIT = 1000; // Already handled by LRUCache

function checkAndTrimContextCache() {
  if (window.contextCheckCache?.size > CONTEXT_CHECK_CACHE_LIMIT) {
    // Удаляем старые записи если кэш превышает лимит
    const keys = Array.from(window.contextCheckCache.keys());
    const excessCount = keys.length - Math.floor(CONTEXT_CHECK_CACHE_LIMIT * 0.75); // удаляем 25% лишних
    if (excessCount > 0) {
      for (let i = 0; i < excessCount; i++) {
        window.contextCheckCache.delete(keys[i]);
      }
    }
  }

  if (window.headingElementsCache?.size > HEADING_ELEMENTS_CACHE_LIMIT) {
    // Очищаем кэш элементов заголовков если он превышает лимит
    window.headingElementsCache.clear();
  }
}

// Добавляем периодическую проверку размера кэша
const memoryCheckInterval = setInterval(checkAndTrimContextCache, 30000); // каждые 30 секунд

// Добавим функцию для очистки кэшей при необходимости с лучшим управлением памятью
window.clearAllCaches = function() {
  if (window.contextCheckCache && typeof window.contextCheckCache.clear === 'function') {
    window.contextCheckCache.clear();
  }
  if (window.headingElementsCache && typeof window.headingElementsCache.clear === 'function') {
    window.headingElementsCache.clear();
  }
  if (window.templateCache && typeof window.templateCache.clear === 'function') {
    window.templateCache.clear();
  }

  console.log('All caches cleared successfully');
};

// Добавляем функцию для завершения работы и освобождения ресурсов
window.cleanupNRL = function() {
  // Очищаем все кэши
  window.clearAllCaches();

  // Очищаем интервал проверки памяти
  if (memoryCheckInterval) {
    clearInterval(memoryCheckInterval);
  }

  console.log('NRL resources cleaned up successfully');
};

// Добавляем обработчик выгрузки страницы для очистки ресурсов
window.addEventListener('beforeunload', () => {
  // Не используем window.cleanupNRL здесь, так как это может привести к проблемам с доступом к DOM
  if (window.templateCache) {
    window.templateCache.clear();
  }
});