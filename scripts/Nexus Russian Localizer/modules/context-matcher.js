// ============================================
// Context Matcher - Optimized with LRU cache and sanitization
// ============================================
class ContextMatcher {
#translations;
#rulesCache;

constructor(translations) {
this.#translations = translations || {};
this.#rulesCache = new Map();
this.buildRulesCache();
}

buildRulesCache() {
if (!this.#translations.contextual) return;
for (const [text, contexts] of Object.entries(this.#translations.contextual)) {
if (typeof text !== 'string' || text.length > 500) continue;
const rules = Object.entries(contexts).map(([context, translation]) => {
if (typeof context !== 'string' || typeof translation !== 'string') return null;
return {
context,
translation,
compiledSelector: this.compileSelector(context)
};
}).filter(r => r && r.compiledSelector.length > 0);
this.#rulesCache.set(text, rules);
}
}

compileSelector(selector) {
if (typeof selector !== 'string' || selector.length > 200) return [];
selector = this.sanitizeSelector(selector);
// Simple selector parsing (only direct parent relationships, no complex descendant)
return selector.split('>').map(part => {
const trimmed = part.trim();
const tagMatch = trimmed.match(/^([a-zA-Z][a-zA-Z0-9]*)/);
if (!tagMatch) return null;
const tag = tagMatch[1];
const classMatches = trimmed.match(/.([a-zA-Z][a-zA-Z0-9_-]*)/g);
const classes = classMatches ? classMatches.map(c => c.substring(1)) : null;
return { tag, classes };
}).filter(p => p !== null);
}

sanitizeSelector(selector) {
// Remove dangerous characters
return selector.replace(/[\u0000-\u001F\u007F-\u009F<>]/g, '').replace(/javascript:/gi, '');
}

match(element, compiledSelector) {
if (!element || !compiledSelector.length) return false;
const cacheKey = `${element.tagName}_${element.className || ''}_${compiledSelector.map(s => s.tag + (s.classes ? '.' + s.classes.join('.') : '')).join('>')}`;
if (window.contextCheckCache.has(cacheKey)) return window.contextCheckCache.get(cacheKey);

let current = element;
for (let i = compiledSelector.length - 1; i >= 0; i--) {
if (!current) {
window.contextCheckCache.set(cacheKey, false);
return false;
}
const part = compiledSelector[i];
if (current.tagName.toLowerCase() !== part.tag.toLowerCase()) {
window.contextCheckCache.set(cacheKey, false);
return false;
}
if (part.classes) {
for (const cls of part.classes) {
if (!current.classList || !current.classList.contains(cls)) {
window.contextCheckCache.set(cacheKey, false);
return false;
}
}
}
current = current.parentElement;
}
window.contextCheckCache.set(cacheKey, true);
return true;
}

findTranslation(text, element) {
if (!text || !element || typeof text !== 'string' || text.length > 2000) return null;
const rules = this.#rulesCache.get(text);
if (!rules) return null;
for (const rule of rules) {
if (this.match(element, rule.compiledSelector)) {
return { translation: rule.translation, context: rule.context };
}
}
return null;
}
}

window.ContextMatcher = ContextMatcher;