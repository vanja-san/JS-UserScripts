// ==UserScript==
// @name            Nexus Russian Localizer
// @name:ru         Nexus Russian Localizer
// @namespace       [http://tampermonkey.net/](http://tampermonkey.net/)
// @description     Add Russian localization for Nexus Mods.
// @description:ru  Добавляет русскую локализацию для сайта Nexus Mods.
// @version         3.0.0
// @author          vanja-san
// @match           https://*.[nexusmods.com/](https://nexusmods.com/)*
// @icon            [https://www.google.com/s2/favicons?sz=64&domain=nexusmods.com](https://www.google.com/s2/favicons?sz=64&domain=nexusmods.com)
// @downloadURL     [https://vanja-san.github.io/JS-UserScripts/scripts/Nexus%20Russian%20Localizer/NRL.user.js](https://vanja-san.github.io/JS-UserScripts/scripts/Nexus%2520Russian%2520Localizer/NRL.user.js)
// @updateURL       [https://vanja-san.github.io/JS-UserScripts/scripts/Nexus%20Russian%20Localizer/NRL.user.js](https://vanja-san.github.io/JS-UserScripts/scripts/Nexus%2520Russian%2520Localizer/NRL.user.js)
// @require         [https://vanja-san.github.io/JS-UserScripts/scripts/Nexus%20Russian%20Localizer/translations.js](https://vanja-san.github.io/JS-UserScripts/scripts/Nexus%2520Russian%2520Localizer/translations.js)
// @require         [https://vanja-san.github.io/JS-UserScripts/scripts/Nexus%20Russian%20Localizer/config.js](https://vanja-san.github.io/JS-UserScripts/scripts/Nexus%2520Russian%2520Localizer/config.js)
// @require         [https://vanja-san.github.io/JS-UserScripts/scripts/Nexus%20Russian%20Localizer/lru-cache.js](https://vanja-san.github.io/JS-UserScripts/scripts/Nexus%2520Russian%2520Localizer/lru-cache.js)
// @require         [https://vanja-san.github.io/JS-UserScripts/scripts/Nexus%20Russian%20Localizer/helpers.js](https://vanja-san.github.io/JS-UserScripts/scripts/Nexus%2520Russian%2520Localizer/helpers.js)
// @require         [https://vanja-san.github.io/JS-UserScripts/scripts/Nexus%20Russian%20Localizer/date-formatter.js](https://vanja-san.github.io/JS-UserScripts/scripts/Nexus%2520Russian%2520Localizer/date-formatter.js)
// @require         [https://vanja-san.github.io/JS-UserScripts/scripts/Nexus%20Russian%20Localizer/context-matcher.js](https://vanja-san.github.io/JS-UserScripts/scripts/Nexus%2520Russian%2520Localizer/context-matcher.js)
// @require         [https://vanja-san.github.io/JS-UserScripts/scripts/Nexus%20Russian%20Localizer/translation-cache.js](https://vanja-san.github.io/JS-UserScripts/scripts/Nexus%2520Russian%2520Localizer/translation-cache.js)
// @require         [https://vanja-san.github.io/JS-UserScripts/scripts/Nexus%20Russian%20Localizer/translation-engine.js](https://vanja-san.github.io/JS-UserScripts/scripts/Nexus%2520Russian%2520Localizer/translation-engine.js)
// @grant           GM_registerMenuCommand
// @license         MIT
// ==/UserScript==

(function() {
'use strict';

let translator = null;
let initialized = false;

async function preloadCriticalTranslations(cache) {
const criticalTerms = ['Download', 'Mods', 'Games', 'Collections', 'Media', 'Community', 'Support', 'Home', 'Search', 'Login', 'Register'];
await Promise.allSettled(criticalTerms.map(term => cache.getCachedTranslation(term)));
}

async function clearCache() {
try {
if ('indexedDB' in window) {
const dbName = window.CONFIG?.DB_NAME || 'translationCache';
indexedDB.deleteDatabase(dbName);
}
if (typeof window.clearAllCaches === 'function') window.clearAllCaches();
console.log('[NRL] Cache cleared. Reloading...');
setTimeout(() => window.location.reload(), 1000);
} catch (e) {
console.warn('[NRL] Clear cache error:', e);
alert('Ошибка очистки кэша: ' + e.message);
}
}

// Register menu commands
if (typeof GM_registerMenuCommand !== 'undefined') {
GM_registerMenuCommand('NRL: Очистить кэш', clearCache, 'c');
GM_registerMenuCommand('NRL: Включить отладку', () => {
if (window.CONFIG) window.CONFIG.DEBUG = true;
console.log('[NRL] Debug mode enabled');
}, 'd');
GM_registerMenuCommand('NRL: Отключить отладку', () => {
if (window.CONFIG) window.CONFIG.DEBUG = false;
console.log('[NRL] Debug mode disabled');
}, 'e');
}

async function init() {
if (initialized) return;
initialized = true;

try {
const cache = new TranslationCache();
await cache.initDB();

const contextMatcher = new ContextMatcher(window.NRL_TRANSLATIONS);
translator = new TranslationEngine(cache);
translator.contextMatcher = contextMatcher;

const isInitialized = await cache.getCachedTranslation('initialized');
if (!isInitialized) {
await cache.preCacheTranslations();
await cache.save('initialized', 'true');
}

await preloadCriticalTranslations(cache);

// First translate visible area only
await translator.translateVisible();

// Then translate remaining elements in background
setTimeout(async () => {
const allElements = [];
const walker = document.createTreeWalker(
document.body,
NodeFilter.SHOW_ELEMENT,
{
acceptNode: (node) => {
if (node === document.body) return NodeFilter.FILTER_SKIP;
if (node.classList && window.IGNORED_CLASSES) {
for (const cls of node.classList) {
if (window.IGNORED_CLASSES.has(cls) && !window.ALWAYS_TRANSLATE_CLASSES.has(cls)) {
return NodeFilter.FILTER_REJECT;
}
}
}
return NodeFilter.FILTER_ACCEPT;
}
}
);
let node;
let count = 0;
const maxNodes = window.CONFIG?.MAX_NODES_PER_WALK || 5000;
while ((node = walker.nextNode()) && count < maxNodes) {
allElements.push(node);
count++;
}
await translator.translateElementBatch(allElements);
}, 300);

translator.observeMutations();

window.addEventListener('beforeunload', () => {
if (translator) translator.cleanup();
});

console.log('[NRL] Initialization complete');
} catch (error) {
console.error('[NRL] Init error:', error);
// Fallback simple translation without cache
if (typeof window.simpleTranslateFallback === 'undefined') {
window.simpleTranslateFallback = (node) => {
if (node.nodeType === Node.TEXT_NODE) {
let text = node.textContent.trim();
if (!text || text.length > 500) return;
if (window.isCyrillic(text)) return;
const translated = window.NRL_TRANSLATIONS?.main[text];
if (translated) node.textContent = translated;
} else if (node.nodeType === Node.ELEMENT_NODE && node.tagName !== 'SCRIPT' && node.tagName !== 'STYLE') {
for (const child of node.childNodes) window.simpleTranslateFallback(child);
}
};
window.simpleTranslateFallback(document.body);
}
}
}

if (document.readyState === 'loading') {
document.addEventListener('DOMContentLoaded', init);
} else {
init();
}
})();