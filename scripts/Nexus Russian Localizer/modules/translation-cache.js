// ============================================
// Translation Cache - Simplified without Web Worker (better reliability)
// Uses IndexedDB + LRU memory cache
// ============================================
class TranslationCache {
constructor() {
this.memoryCache = new window.LRUCache();
this.db = null;
this.initPromise = null;
}

async initDB() {
if (this.db) return this.db;
if (this.initPromise) return this.initPromise;

this.initPromise = new Promise((resolve, reject) => {
const dbName = window.CONFIG?.DB_NAME || 'translationCache';
const dbVersion = window.CONFIG?.DB_VERSION || 2;
const request = indexedDB.open(dbName, dbVersion);

request.onerror = () => {
console.error('IndexedDB error:', request.error);
reject(request.error);
};
request.onsuccess = () => {
this.db = request.result;
resolve(this.db);
};
request.onupgradeneeded = (event) => {
const db = event.target.result;
const storeName = window.CONFIG?.STORE_NAME || 'translations';
if (!db.objectStoreNames.contains(storeName)) {
const store = db.createObjectStore(storeName, { keyPath: 'key' });
store.createIndex('version', 'version');
store.createIndex('timestamp', 'timestamp');
}
};
});
return this.initPromise;
}

async get(key) {
await this.initDB();
if (!this.db) return null;
// Memory first
const memCached = this.memoryCache.get(key);
if (memCached) return memCached;

try {
const storeName = window.CONFIG?.STORE_NAME || 'translations';
const transaction = this.db.transaction([storeName], 'readonly');
const store = transaction.objectStore(storeName);
const fullKey = `${window.CONFIG?.CACHE_VERSION || 'v2.0.0'}:${key}`;
const request = store.get(fullKey);
return new Promise((resolve) => {
request.onsuccess = () => {
const result = request.result;
if (result && result.value) {
this.memoryCache.set(key, result.value);
resolve(result.value);
} else {
resolve(null);
}
};
request.onerror = () => resolve(null);
});
} catch (e) {
console.warn('IndexedDB get error:', e);
return null;
}
}

async save(key, value) {
await this.initDB();
if (!this.db) return;
try {
const storeName = window.CONFIG?.STORE_NAME || 'translations';
const transaction = this.db.transaction([storeName], 'readwrite');
const store = transaction.objectStore(storeName);
const fullKey = `${window.CONFIG?.CACHE_VERSION || 'v2.0.0'}:${key}`;
store.put({
key: fullKey,
value: value,
timestamp: Date.now(),
version: window.CONFIG?.CACHE_VERSION
});
} catch (e) {
console.warn('IndexedDB save error:', e);
}
}

async bulkSaveTranslations(translations) {
await this.initDB();
if (!this.db || !translations.length) return;
try {
const storeName = window.CONFIG?.STORE_NAME || 'translations';
const transaction = this.db.transaction([storeName], 'readwrite');
const store = transaction.objectStore(storeName);
const version = window.CONFIG?.CACHE_VERSION || 'v2.0.0';
for (const [key, value] of translations) {
if (key.length > 500) continue;
const fullKey = `${version}:${key}`;
store.put({ key: fullKey, value, timestamp: Date.now(), version });
}
} catch (e) {
console.warn('Bulk save error:', e);
}
}

async cacheTranslation(text, context, translation) {
const key = context ? `${text}::${context}` : text;
this.memoryCache.set(key, translation);
await this.save(key, translation);
}

async getCachedTranslation(text, context = '') {
const key = context ? `${text}::${context}` : text;
return await this.get(key);
}

async preCacheTranslations() {
const bulkData = [];
const main = window.NRL_TRANSLATIONS?.main || {};
const contextual = window.NRL_TRANSLATIONS?.contextual || {};

// Chunk processing to avoid UI freeze
const entries = Object.entries(main);
const chunkSize = 200;
for (let i = 0; i < entries.length; i += chunkSize) {
const chunk = entries.slice(i, i + chunkSize);
for (const [text, translation] of chunk) {
this.memoryCache.set(text, translation);
bulkData.push([text, translation]);
}
await new Promise(resolve => setTimeout(resolve, 0));
}

for (const [text, contexts] of Object.entries(contextual)) {
for (const [context, translation] of Object.entries(contexts)) {
const cacheKey = `${text}::${context}`;
this.memoryCache.set(cacheKey, translation);
bulkData.push([cacheKey, translation]);
}
}

await this.bulkSaveTranslations(bulkData);
// Mark as initialized
await this.save('initialized', 'true');
}
}

window.TranslationCache = TranslationCache;