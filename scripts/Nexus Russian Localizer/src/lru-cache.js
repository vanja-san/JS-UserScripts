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
window.IGNORED_CLASSES = new Set(['no-translate', 'ignore-translation', 'code', 'pre']);
window.templateCache = new LRUCache(500);
window.LRUCache = LRUCache;

// Ограничение размера для предотвращения утечек памяти
const CONTEXT_CHECK_CACHE_LIMIT = 10000;
function checkAndTrimContextCache() {
  if (window.contextCheckCache?.size > CONTEXT_CHECK_CACHE_LIMIT) {
    // Удаляем старые записи если кэш превышает лимит
    const keys = Array.from(window.contextCheckCache.keys());
    for (let i = 0; i < keys.length - (CONTEXT_CHECK_CACHE_LIMIT * 0.8); i++) {
      window.contextCheckCache.delete(keys[i]);
    }
  }
}

// Добавляем периодическую проверку размера кэша
setInterval(checkAndTrimContextCache, 30000); // каждые 30 секунд