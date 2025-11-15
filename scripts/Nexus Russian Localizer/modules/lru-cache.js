// LRU кэш для памяти
class LRUCache {
  #cache;
  #limit;

  constructor(limit = window.CONFIG?.MEMORY_CACHE_LIMIT || 1000) {
    this.#cache = new Map();
    this.#limit = limit;
  }

  get(key) {
    if (!this.#cache.has(key)) return null;
    const value = this.#cache.get(key);
    this.#cache.delete(key);
    this.#cache.set(key, value);
    return value;
  }

  set(key, value) {
    if (this.#cache.size >= this.#limit) {
      this.#cache.delete(this.#cache.keys().next().value);
    }
    this.#cache.set(key, value);
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
const CONTEXT_CHECK_CACHE_LIMIT = 15000; // Increased from 10000
function checkAndTrimContextCache() {
  if (window.contextCheckCache?.size > CONTEXT_CHECK_CACHE_LIMIT) {
    // Удаляем старые записи если кэш превышает лимит
    const keys = Array.from(window.contextCheckCache.keys());
    const excessCount = keys.length - Math.floor(CONTEXT_CHECK_CACHE_LIMIT * 0.8);
    if (excessCount > 0) {
      for (let i = 0; i < excessCount; i++) {
        window.contextCheckCache.delete(keys[i]);
      }
    }
  }
}

// Добавляем периодическую проверку размера кэша
setInterval(checkAndTrimContextCache, 30000); // каждые 30 секунд

// Добавим функцию для очистки кэшей при необходимости
window.clearAllCaches = function() {
  window.contextCheckCache.clear();
  window.headingElementsCache.clear();
  if (window.templateCache && typeof window.templateCache.clear === 'function') {
    window.templateCache.clear();
  }
};