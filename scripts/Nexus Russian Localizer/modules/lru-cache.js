// ============================================
// LRU Cache - Optimized with max size control
// ============================================
class LRUCache {
#cache;
#limit;

constructor(limit = window.CONFIG?.MEMORY_CACHE_LIMIT || 800) {
this.#cache = new Map();
this.#limit = limit;
}

get(key) {
if (!this.#cache.has(key)) return null;
const value = this.#cache.get(key);
// Move to the end (most recently used)
this.#cache.delete(key);
this.#cache.set(key, value);
return value;
}

set(key, value) {
if (this.#cache.size >= this.#limit) {
const firstKey = this.#cache.keys().next().value;
this.#cache.delete(firstKey);
}
this.#cache.set(key, value);
return this;
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

keys() {
return Array.from(this.#cache.keys());
}

values() {
return Array.from(this.#cache.values());
}

entries() {
return Array.from(this.#cache.entries());
}
}

// Global caches - now using LRU where appropriate
window.contextCheckCache = new LRUCache(2000);      // Was Map, now LRU
window.headingElementsCache = new WeakSet();        // WeakSet for elements (auto cleanup)
window.IGNORED_CLASSES = new Set(['no-translate', 'ignore-translation', 'code', 'pre', 'notranslate']);
window.ALWAYS_TRANSLATE_CLASSES = new Set(['sr-only']);
window.templateCache = new LRUCache(500);           // Reduced size

// Cleanup function
window.clearAllCaches = function() {
if (window.contextCheckCache) window.contextCheckCache.clear();
if (window.headingElementsCache && typeof window.headingElementsCache.clear === 'function') {
window.headingElementsCache.clear();
} else if (window.headingElementsCache) {
// WeakSet cannot be cleared, create new one
window.headingElementsCache = new WeakSet();
}
if (window.templateCache) window.templateCache.clear();
console.log('[NRL] All caches cleared');
};

// Periodic memory check (less aggressive)
setInterval(() => {
if (window.contextCheckCache && window.contextCheckCache.size > 2500) {
window.contextCheckCache.clear();
}
}, 60000); // every 60 seconds