/**
 * NRL core — словарь, правила, перевод DOM, SPA-навигация.
 *
 * Зависимости: translations.js (window.NRL_TRANSLATIONS), подключается из NRL.user.js.
 * Архитектура:
 *   Storage  — доступ к GM_getValue и localStorage с проверкой записи
 *   safe     — граница ошибок: одна сбойная функция не роняет скрипт
 *   Dictionary — маршрутизация страниц, сборка per-page конфига, поиск
 *   Rules    — даты, плюрализация, размеры файлов
 *   Missed   — учёт непереведённых строк, экспорт в JSON
 *   Translator — обход DOM, текстовые узлы, атрибуты, shadow root, restore
 *   Router   — SPA-навигация Next.js
 *
 * Горячий путь синхронный: ни IndexedDB, ни Web Worker, ни await на узел.
 */
(() => {
  'use strict';

  // ═══════════════════════════════════════════════════════════════════════
  //  0. Настройки движка (переопределяются из translations.js -> conf)
  // ═══════════════════════════════════════════════════════════════════════

  const CONFIG = {
    // Названия/описания модов и пользовательский контент — не переводим.
    IGNORED_SELECTORS: [
      '.mod-name', '.mod-title', '.name', '#pagetitle', '.file-expander-header',
      '.mod-card .title a', '.list-item .name a',
      'h3 a[href*="/mods/"]', 'h4 a[href*="/mods/"]',
      '.mod-desc', '.description', '.summary', '.mod-details', '.mod_description_container',
      '.mod-card .description', '.mod-card .summary',
      '.user-content', '.wysiwyg',
      'blockquote', '.quote',
      'article .body', 'article .content',
      'i', 'i.material-icons-outlined'
    ],

    IGNORED_CLASSES: ['no-translate', 'notranslate', 'ignore-translation', 'code', 'pre'],
    IGNORED_TAGS: ['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'CODE', 'PRE', 'SVG', 'CANVAS', 'TEMPLATE'],
    // Переводятся всегда, даже если выглядят как игнорируемые (доступность).
    ALWAYS_TRANSLATE_CLASSES: ['sr-only'],

    PHRASE_ASSEMBLY: true,
    PHRASE_MAX_PIECES: 4,

    MAX_TEXT_LENGTH: 2000,
    MAX_ATTR_LENGTH: 1000,

    OBSERVER_DEBOUNCE_MS: 40,
    ROUTE_DEBOUNCE_MS: 60,
    CHUNK_SIZE: 500,
    RULE_CACHE_LIMIT: 2000,

    OBSERVE_SHADOW_ROOTS: true
  };

  // ═══════════════════════════════════════════════════════════════════════
  //  1. Хранилище и отладка
  // ═══════════════════════════════════════════════════════════════════════

  const has = name => typeof GM !== 'undefined' && typeof GM[name] === 'function';

  /** GM_* — хранилище менеджера скриптов, localStorage — запасной вариант. */
  const Storage = {
    available(which) {
      try {
        if (which === 'gm') return has('getValue') && has('setValue');
        return typeof localStorage !== 'undefined';
      } catch {
        return false;
      }
    },

    get(key, fallback, which = 'auto') {
      try {
        if (which !== 'local' && has('getValue')) {
          const v = GM_getValue(key, undefined);
          return v === undefined ? fallback : v;
        }
        if (typeof localStorage !== 'undefined') {
          const v = localStorage.getItem(key);
          return v === null ? fallback : v;
        }
      } catch { /* запрещённый доступ */ }
      return fallback;
    },

    set(key, value, which = 'auto') {
      if (which !== 'local' && has('setValue')) {
        GM_setValue(key, value);
        return true;
      }
      localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
      return true;
    },

    remove(key, which = 'auto') {
      try {
        if (which !== 'local' && has('deleteValue')) GM_deleteValue(key);
        else if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
      } catch { /* запрещённый доступ */ }
    },

    /**
     * Запись с проверкой: возвращает false, если значение не зафиксировалось.
     * Молча теряющиеся настройки — худший вид поломки, поэтому проверяем.
     */
    setVerified(key, value, which = 'auto') {
      try {
        this.set(key, value, which);
        return this.get(key, '__nrl_missing__', which) === value;
      } catch {
        return false;
      }
    },

    json(key, fallback) {
      const raw = this.get(key, null);
      if (raw === null) return fallback;
      if (typeof raw === 'object') return raw;
      try { return JSON.parse(raw); } catch { return fallback; }
    },

    setJson(key, value, which = 'auto') {
      const payload = JSON.stringify(value);
      return this.setVerified(key, payload, which);
    }
  };

  const debug = {
    on: false,
    init() {
      try { this.on = Storage.get('NRL_DEBUG', 'false') === 'true'; } catch { this.on = false; }
      return this;
    },
    log(...a) { if (this.on) console.log('[NRL]', ...a); },
    warn(...a) { if (this.on) console.warn('[NRL]', ...a); },
    enable() {
      this.on = true;
      Storage.set('NRL_DEBUG', 'true');
      console.log('[NRL] Отладка включена. Перезагрузите страницу.');
    },
    disable() {
      this.on = false;
      Storage.set('NRL_DEBUG', 'false');
      console.log('[NRL] Отладка выключена.');
    }
  };
  debug.init();

  /**
   * Граница ошибок: одна сбойная функция не должна ронять перевод страницы.
   *
   * receiver передаётся явно и обязательно. Приватные методы не автосвязываются,
   * поэтому безопасная обёртка, вызванная как обычная функция, передаёт им
   * this === undefined и они падают на первом же обращении к полю.
   */
  function safe(receiver, fn, label) {
    return function (...args) {
      try {
        return fn.apply(receiver, args);
      } catch (error) {
        console.error(`[NRL] ${label}:`, error);
        return undefined;
      }
    };
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  2. Утилиты
  // ═══════════════════════════════════════════════════════════════════════

  const RE_CYRILLIC = /[\u0400-\u04FF]/;
  const RE_LATIN = /[A-Za-z]/;
  const RE_DIGIT = /\d/;
  const RE_NUMERIC_ONLY = /^[\d\s.,\-+:%/]+$/;
  const RE_HAS_LETTER_OR_DIGIT = /[\p{L}\p{N}]/u;
  const RE_NEXT_CHUNK = /self\.__next_f|__next_f\.push|\.push\(\[1,"/;
  const RE_CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g;

  function escapeRe(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function normalizeSpace(s) {
    return s.replace(/\s+/g, ' ').trim();
  }

  /** Обрезанный текст плюс исходные пробелы по краям — вернём их при записи. */
  function trimBounds(raw) {
    const trimmed = raw.trim();
    if (!trimmed) return { trimmed: '', lead: raw, trail: '' };
    const start = raw.indexOf(trimmed);
    return { trimmed, lead: raw.slice(0, start), trail: raw.slice(start + trimmed.length) };
  }

  function nextTask() {
    return new Promise(resolve => setTimeout(resolve, 0));
  }

  function idleTask(timeout) {
    return new Promise(resolve => {
      if (typeof requestIdleCallback === 'function') requestIdleCallback(resolve, { timeout });
      else setTimeout(resolve, 0);
    });
  }

  /** Оставляет валидные селекторы и склеивает в один: 1 matches() вместо 20. */
  function compileSelectorList(list) {
    const valid = [];
    for (const selector of list) {
      try {
        document.querySelector(selector);
        valid.push(selector);
      } catch {
        debug.warn('Некорректный селектор пропущен:', selector);
      }
    }
    return valid.join(', ');
  }

  function isTrulyTranslated(text) {
    return RE_CYRILLIC.test(text) && !RE_LATIN.test(text);
  }

  function isSkippableText(trimmed) {
    if (!trimmed) return true;
    if (trimmed.length > CONFIG.MAX_TEXT_LENGTH) return true;
    if (RE_NEXT_CHUNK.test(trimmed)) return true;
    if (RE_NUMERIC_ONLY.test(trimmed)) return true;
    if (!RE_HAS_LETTER_OR_DIGIT.test(trimmed)) return true;
    return isTrulyTranslated(trimmed);
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  3. Словарь и маршрутизация страниц
  // ═══════════════════════════════════════════════════════════════════════

  const dict = {
    main: Object.create(null),        // null-прототип: main['constructor'] не вернёт Object
    contextual: new Map(),
    pageDictionaries: {},
    routes: [],
    titleStatic: Object.create(null),
    titleRegexp: [],
    ignoreSelectorPage: {},
    ignoreMutationSelectorPage: {},
    characterDataIgnorePage: [],
    observeShadowRoots: true,
    months: new Map(),
    units: new Map(),
    timeUnits: new Map(),
    fileSizes: [],
    datePrefixes: [],
    suffixes: new Map(),
    attributes: ['title', 'placeholder', 'alt', 'aria-label'],
    inlineTags: new Set(),
    missedTerms: { enabled: false, maxPerPath: 300, maxTotal: 5000 }
  };

  function detectPageType(pathname) {
    for (const route of dict.routes) {
      let matched = false;
      try { matched = route.re.test(pathname); } catch { matched = false; }
      if (matched) return route.page;
    }
    return '*';
  }

  function loadDictionary(source) {
    const data = source || {};
    const conf = data.conf || {};

    dict.main = Object.assign(Object.create(null), data.main || {});
    dict.attributes = (data.translatableAttributes && data.translatableAttributes.length)
      ? data.translatableAttributes.slice()
      : ['title', 'placeholder', 'alt', 'aria-label'];

    dict.routes = Array.isArray(conf.routes) ? conf.routes.filter(r => r && r.re && r.page) : [];
    dict.ignoreSelectorPage = conf.ignoreSelectorPage || {};
    dict.ignoreMutationSelectorPage = conf.ignoreMutationSelectorPage || {};
    dict.characterDataIgnorePage = Array.isArray(conf.characterDataIgnorePage) ? conf.characterDataIgnorePage : [];
    dict.observeShadowRoots = conf.observeShadowRoots !== false;

    dict.pageDictionaries = data.pageDictionaries || {};

    dict.titleStatic = Object.assign(Object.create(null), data.titleRules?.static || {});
    dict.titleRegexp = Array.isArray(data.titleRules?.regexp) ? data.titleRules.regexp : [];

    dict.months = new Map();
    for (const [en, ru] of Object.entries(data.months || {})) dict.months.set(en.toLowerCase(), ru);

    dict.units = new Map(Object.entries(data.units || {}));
    dict.timeUnits = new Map(Object.entries(data.timeUnits || {}));
    dict.fileSizes = Object.entries(data.fileSizes || {}).map(([en, ru]) => ({ en, ru }));
    dict.datePrefixes = Object.entries(data.datePrefixes || {});
    dict.suffixes = new Map(Object.entries(data.suffixes || {}));
    dict.inlineTags = new Set((data.phraseInlineTags || []).map(t => t.toUpperCase()));
    dict.missedTerms = { ...dict.missedTerms, ...(data.missedTerms || {}) };

    dict.contextual = new Map();
    for (const [text, selectors] of Object.entries(data.contextual || {})) {
      const rules = [];
      for (const [selector, translation] of Object.entries(selectors || {})) {
        if (selector && translation) rules.push({ selector, translation });
      }
      if (rules.length) dict.contextual.set(text, rules);
    }

    // Словарь изменился — все собранные конфиги страниц устарели.
    clearPageConfigCache();
  }

  /**
   * Конфиг страницы собирается один раз и кэшируется: компиляция селекторов
   * на каждой навигации — лишняя работа.
   */
  const pageConfigCache = new Map();
  let pageConfig = null;

  function buildPageConfig(pageType) {
    const cached = pageConfigCache.get(pageType);
    if (cached) return cached;

    const pageDict = dict.pageDictionaries[pageType] || {};
    const baseIgnore = dict.ignoreSelectorPage['*'] || [];
    const pageIgnore = dict.ignoreSelectorPage[pageType] || [];
    const baseMut = dict.ignoreMutationSelectorPage['*'] || [];
    const pageMut = dict.ignoreMutationSelectorPage[pageType] || [];

    const config = {
      pageType,
      // Страничные переводы имеют приоритет над универсальными.
      staticDict: Object.assign(Object.create(null), dict.main, pageDict.static || {}),
      regexpRules: Array.isArray(pageDict.regexp) ? pageDict.regexp : [],
      ignoreSelector: compileSelectorList([...CONFIG.IGNORED_SELECTORS, ...baseIgnore, ...pageIgnore]),
      ignoreMutationSelector: compileSelectorList([...baseMut, ...pageMut]),
      // characterData наблюдается везде, кроме перечисленных в
      // conf.characterDataIgnorePage страниц.
      characterData: !dict.characterDataIgnorePage.includes(pageType)
    };

    pageConfigCache.set(pageType, config);
    return config;
  }

  function clearPageConfigCache() {
    pageConfigCache.clear();
    pageConfig = null;
  }

  /** Конфиг всегда актуален: собирается лениво и сбрасывается вместе со словарём. */
  function getPageConfig() {
    if (!pageConfig) pageConfig = buildPageConfig('*');
    return pageConfig;
  }

  function setPageType(pageType) {
    if (!pageConfig || pageConfig.pageType !== pageType) {
      pageConfig = buildPageConfig(pageType);
      debug.log('Страница:', pageType);
    }
    return pageConfig;
  }

  /** Контекстные правила важнее словаря; словарь страницы важнее универсального. */
  function lookup(text, element) {
    if (element) {
      const rules = dict.contextual.get(text);
      if (rules) {
        for (const rule of rules) {
          try {
            if (element.matches(rule.selector)) return rule.translation;
          } catch { /* невалидный селектор — пропускаем */ }
        }
      }
    }
    return getPageConfig().staticDict[text] || null;
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  4. Учёт непереведённых строк
  //  Показывает реальное покрытие словаря — без него непонятно, что ещё переводить.
  // ═══════════════════════════════════════════════════════════════════════

  const Missed = {
    data: null,
    dirty: false,
    saveTimer: 0,

    load() {
      this.data = Storage.json('NRL_MISSED_TERMS', {});
      return this;
    },

    get enabled() { return !!dict.missedTerms.enabled; },

    pathKey() {
      return location.pathname + location.search;
    },

    count() {
      return Object.values(this.data).reduce((sum, terms) => sum + Object.keys(terms).length, 0);
    },

    record(text) {
      if (!this.enabled || !text || text.length > 120) return false;
      if (!this.data) this.load();

      const key = this.pathKey();
      if (!this.data[key]) this.data[key] = {};
      if (Object.hasOwn(this.data[key], text)) return false;
      if (Object.keys(this.data[key]).length >= dict.missedTerms.maxPerPath) return false;
      if (this.count() >= dict.missedTerms.maxTotal) return false;

      this.data[key][text] = '';
      this.scheduleSave();
      return true;
    },

    /** Строка переведена — убираем из списка, чтобы он показывал только актуальное. */
    cleanup(text) {
      if (!this.data) return;
      const key = this.pathKey();
      if (!this.data[key] || !Object.hasOwn(this.data[key], text)) return;
      delete this.data[key][text];
      if (Object.keys(this.data[key]).length === 0) delete this.data[key];
      this.scheduleSave();
    },

    scheduleSave() {
      this.dirty = true;
      if (this.saveTimer) return;
      this.saveTimer = setTimeout(() => {
        this.saveTimer = 0;
        this.flush();
      }, 2000);
    },

    flush() {
      if (!this.dirty) return;
      this.dirty = false;
      Storage.setJson('NRL_MISSED_TERMS', this.data);
    },

    stats() {
      const paths = Object.keys(this.data || {});
      return { paths: paths.length, terms: this.count() };
    },

    exportPayload() {
      return {
        metadata: {
          exportedAt: new Date().toISOString(),
          version: NRL.version,
          ...this.stats()
        },
        data: this.data || {}
      };
    },

    exportFile() {
      const blob = new Blob([JSON.stringify(this.exportPayload(), null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `NRL_непереведенные_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    },

    clearAll() {
      this.data = {};
      this.flush();
      Storage.setJson('NRL_MISSED_TERMS', {});
    },

    clearPath() {
      if (!this.data) return;
      delete this.data[this.pathKey()];
      this.flush();
    }
  };
  Missed.load();

  // ═══════════════════════════════════════════════════════════════════════
  //  5. Правила текста: даты, плюрализация, размеры
  //  Регулярки без флага g — сбрасывать lastIndex не нужно.
  // ═══════════════════════════════════════════════════════════════════════

  const SUFFIX_MULTIPLIERS = { k: 1e3, m: 1e6, b: 1e9, t: 1e12 };
  const RE_NUMBER = /([$€£]?)\s*(\d+(?:[.,]\d+)?)\s*([kmbt])?\b/i;
  const FALLBACK_MONTHS = 'Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec';
  const NOUN_FORMS = new Map();

  let TEXT_RULES = [];
  const ruleCache = new Map();

  function pluralize(n, forms) {
    if (!forms || forms.length < 3) return forms?.[2] || '';
    const abs = Math.floor(Math.abs(n));
    const lastTwo = abs % 100;
    if (lastTwo >= 11 && lastTwo <= 19) return forms[2];
    const lastDigit = abs % 10;
    if (lastDigit === 1) return forms[0];
    if (lastDigit >= 2 && lastDigit <= 4) return forms[1];
    return forms[2];
  }

  function expandNumber(num, suffix) {
    if (!suffix) return num;
    const multiplier = SUFFIX_MULTIPLIERS[suffix.toLowerCase()];
    return multiplier ? num * multiplier : num;
  }

  function parseNumber(str) {
    return parseFloat(String(str).replace(',', '.'));
  }

  function monthRu(name) {
    return dict.months.get(String(name).toLowerCase()) || name;
  }

  function validDayYear(day, year) {
    const d = parseInt(day, 10);
    const y = parseInt(year, 10);
    if (Number.isNaN(d) || d < 1 || d > 31) return null;
    if (Number.isNaN(y) || y < 1000 || y > 9999) return null;
    return { d, y };
  }

  function formatTimeUnit(count, unit, tail) {
    const forms = dict.timeUnits.get(String(unit).toLowerCase());
    const num = parseInt(count, 10);
    if (!forms || Number.isNaN(num) || num < 0 || num > 1000000) return null;
    return `${num} ${pluralize(num, forms)}${tail}`;
  }

  function formatNumberWord(numStr, suffix, forms) {
    const num = parseNumber(String(numStr).replace(/[^\d.,]/g, ''));
    if (Number.isNaN(num)) return `${numStr} ${pluralize(0, forms)}`;
    const currency = String(numStr).match(/^([$€£])\s*/)?.[1] || '';
    const clean = String(numStr).replace(/^[\s$€£]+/, '');
    return `${currency}${clean}${suffix} ${pluralize(expandNumber(num, suffix), forms)}`;
  }

  function buildNounIndex() {
    NOUN_FORMS.clear();
    for (const [en, forms] of dict.units) {
      NOUN_FORMS.set(en.toLowerCase(), forms);
      for (const form of forms) NOUN_FORMS.set(form.toLowerCase(), forms);
    }
  }

  function buildTextRules() {
    // Длинные названия месяцев первыми: иначе «January» распадётся на «Jan» + хвост.
    const monthNames = [...dict.months.keys()].sort((a, b) => b.length - a.length).map(escapeRe);
    const monthAlt = monthNames.length ? monthNames.join('|') : FALLBACK_MONTHS;

    const rules = [];

    for (const [en, ru] of dict.datePrefixes) {
      rules.push({
        re: new RegExp(`${escapeRe(en)}\\s+(\\d{1,2})\\s+(${monthAlt})\\s+(\\d{4})`, 'i'),
        fn: (m, day, month, year) => {
          const v = validDayYear(day, year);
          return v ? `${ru} ${v.d} ${monthRu(month)} ${v.y}` : m;
        }
      });
    }

    rules.push({
      re: new RegExp(`(\\d{1,2})\\s+(${monthAlt})\\s+(\\d{4})\\s+ago`, 'i'),
      fn: (m, day, month, year) => {
        const v = validDayYear(day, year);
        return v ? `${v.d} ${monthRu(month)} ${v.y} назад` : m;
      }
    });

    rules.push({
      re: new RegExp(`([A-Za-z][A-Za-z ]*?)\\s+(\\d{1,2})\\s+(${monthAlt})\\s+(\\d{4})`, 'i'),
      fn: (m, prefix, day, month, year) => {
        const v = validDayYear(day, year);
        if (!v) return m;
        const head = prefix.trim();
        return `${dict.main[head] || head} ${v.d} ${monthRu(month)} ${v.y}`;
      }
    });

    rules.push({
      re: new RegExp(`(\\d{1,2})\\s+(${monthAlt})\\s+(\\d{4})`, 'i'),
      fn: (m, day, month, year) => {
        const v = validDayYear(day, year);
        return v ? `${v.d} ${monthRu(month)} ${v.y}` : m;
      }
    });

    const unitsAlt = [...dict.timeUnits.keys()].map(escapeRe).join('|');
    if (unitsAlt) {
      rules.push({
        re: new RegExp(`(\\d+)[\\s\\u00A0]+(${unitsAlt})s?[\\s\\u00A0]+ago`, 'i'),
        fn: (m, count, unit) => formatTimeUnit(count, unit, ' назад')
      });
      rules.push({
        re: new RegExp(`(\\d+)[\\s\\u00A0]+(${unitsAlt})s?[\\s\\u00A0]+(to|through|before)`, 'i'),
        fn: (m, count, unit) => formatTimeUnit(count, unit, ' до')
      });
    }

    // Ключи словаря во множественном числе, поэтому финальное s необязательно.
    for (const [en, forms] of dict.units) {
      const base = escapeRe(en);
      const word = base.endsWith('s') ? base.slice(0, -1) + 's?' : base;
      rules.push({
        re: new RegExp(`^[\\s]*([\\$€£]?\\s*\\d+(?:[.,]\\d+)?)([kmbt])?\\s+${word}\\s*$`, 'i'),
        fn: (m, numStr, suffix) => formatNumberWord(numStr, suffix || '', forms)
      });
    }

    for (const { en, ru } of dict.fileSizes) {
      rules.push({
        re: new RegExp(`(\\d+(?:[.,]\\d+)?)\\s*${escapeRe(en)}\\b`, 'i'),
        fn: (m, num) => `${num} ${ru}`
      });
    }

    TEXT_RULES = rules;
    buildNounIndex();
    ruleCache.clear();
  }

  function applyTextRules(text) {
    if (!RE_DIGIT.test(text)) return null;

    const cached = ruleCache.get(text);
    if (cached !== undefined) return cached;

    const cleaned = text.replace(RE_CONTROL_CHARS, '');
    let result = null;

    for (const rule of TEXT_RULES) {
      if (!rule.re.test(cleaned)) continue;
      // null из replacer'а превратился бы в строку "null".
      const replaced = cleaned.replace(rule.re, (...args) => {
        const out = rule.fn(...args);
        return out === null || out === undefined ? args[0] : out;
      });
      if (replaced !== cleaned) {
        result = replaced;
        break;
      }
    }

    if (ruleCache.size >= CONFIG.RULE_CACHE_LIMIT) ruleCache.clear();
    ruleCache.set(text, result);
    return result;
  }

  /** «8.9k» -> «8.9 тыс.». Работает, только если заполнен раздел suffixes. */
  function applySuffix(text) {
    if (dict.suffixes.size === 0) return null;
    const m = RE_NUMBER.exec(text);
    if (!m || !m[3]) return null;
    const ru = dict.suffixes.get(m[3].toLowerCase());
    return ru ? `${m[1] || ''}${m[2]}${ru}` : null;
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  6. Число и существительное в разнесённой разметке
  // ═══════════════════════════════════════════════════════════════════════

  function findCountableNoun(text) {
    const lower = text?.toLowerCase().trim();
    if (!lower) return null;
    const forms = NOUN_FORMS.get(lower);
    return forms ? { forms } : null;
  }

  function numberFrom(text) {
    if (!text) return null;
    const m = RE_NUMBER.exec(text);
    if (!m) return null;
    const num = parseNumber(m[2]);
    if (Number.isNaN(num) || num < 0) return null;
    return { currency: m[1] || '', numStr: m[2], suffix: m[3] || '', fullNum: expandNumber(num, m[3]) };
  }

  function directChildText(element) {
    let text = '';
    for (const child of element.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) text += child.data || '';
    }
    return text;
  }

  function extractNumberFromParent(element, maxLevels = 3) {
    let parent = element.parentElement;
    let levels = 0;
    while (parent && levels < maxLevels) {
      const direct = numberFrom(directChildText(parent));
      // Полный textContent допускаем только у непосредственного родителя:
      // выше по дереву контейнеры слишком большие и дают ложные срабатывания.
      const full = direct || (levels === 0 ? numberFrom(parent.textContent) : null);
      if (full) return full;
      parent = parent.parentElement;
      levels++;
    }
    return null;
  }

  function asInlineText(node) {
    if (node.nodeType === Node.TEXT_NODE) return node;
    if (node.nodeType !== Node.ELEMENT_NODE) return null;
    if (!dict.inlineTags.has(node.tagName)) return null;
    if (node.getAttribute('translate') === 'no') return null;
    if (node.childNodes.length !== 1) return null;
    const only = node.firstChild;
    return only.nodeType === Node.TEXT_NODE ? only : null;
  }

  /**
   * Узел и следующие соседи-тексты в пределах родителя. Только «вперёд»,
   * чтобы носителем перевода всегда оставался сам node.
   */
  function collectInlinePieces(node, max) {
    if (!node.parentElement) return null;
    const pieces = [node];
    let cursor = node;
    while (pieces.length < max) {
      const next = cursor.nextSibling;
      const text = next && asInlineText(next);
      if (!text || !text.data.trim()) break;
      pieces.push(text);
      cursor = next;
    }
    return pieces.length >= 2 ? pieces : null;
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  7. Перевод DOM
  // ═══════════════════════════════════════════════════════════════════════

  class Translator {
    /** Text -> {src, out}. out === null означает «перевода нет, попробуем снова». */
    #textState = new WeakMap();
    /** Element -> Map<attr, {src, out}> */
    #attrState = new WeakMap();

    #observer = null;
    #debounceId = 0;
    #pendingRoots = [];
    #draining = false;
    #ignoreSelector = '';
    #ignoreMutationSelector = '';
    #ignoreClasses = new Set();
    #alwaysTranslate = new Set();
    #ignoredTags = new Set();
    #stats = { text: 0, attr: 0, phrase: 0, plural: 0, nodes: 0, restored: 0 };

    #walkerFilter = {
      acceptNode: (node) => (node.nodeType === Node.ELEMENT_NODE && this.#isIgnoredElement(node)
        ? NodeFilter.FILTER_REJECT
        : NodeFilter.FILTER_ACCEPT)
    };

    constructor() {
      this.#ignoreClasses = new Set(CONFIG.IGNORED_CLASSES);
      this.#alwaysTranslate = new Set(CONFIG.ALWAYS_TRANSLATE_CLASSES);
      this.#ignoredTags = new Set(CONFIG.IGNORED_TAGS);
      this.applyPageConfig();
    }

    /** Селекторы зависят от страницы — обновляем при навигации. */
    applyPageConfig() {
      const config = getPageConfig();
      this.#ignoreSelector = config.ignoreSelector;
      this.#ignoreMutationSelector = config.ignoreMutationSelector;
    }

    // ── Фильтрация ──────────────────────────────────────────────────────

    #isIgnoredElement(element) {
      if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;
      if (this.#ignoredTags.has(element.tagName)) return true;
      if (element.getAttribute('translate') === 'no') return true;

      const classes = element.classList;
      let always = false;
      if (classes && classes.length) {
        for (const cls of classes) {
          if (this.#ignoreClasses.has(cls)) return true;
          if (!always && this.#alwaysTranslate.has(cls)) always = true;
        }
      }

      if (!always && this.#ignoreSelector) {
        try { if (element.matches(this.#ignoreSelector)) return true; } catch { /* ignore */ }
      }
      return false;
    }

    /** Игнорировать ли саму мутацию (без обхода поддерева). */
    #isIgnoredMutationTarget(element) {
      if (!element || !this.#ignoreMutationSelector) return false;
      try {
        return typeof element.closest === 'function'
          && !!element.closest(this.#ignoreMutationSelector);
      } catch {
        return false;
      }
    }

    // ── Текстовые узлы ───────────────────────────────────────────────────

    /** @returns {boolean} true, если текст узла был изменён */
    translateTextNode(node) {
      if (!node || node.nodeType !== Node.TEXT_NODE) return false;
      const raw = node.data;
      if (!raw) return false;

      const state = this.#textState.get(node);
      if (state) {
        if (raw === state.out) return false;                        // наш перевод уже на месте
        if (raw === state.src && state.out === null) return false;  // тот же непереведённый текст
        this.#textState.delete(node);
      }

      const { trimmed, lead, trail } = trimBounds(raw);
      const element = node.parentElement;

      if (isSkippableText(trimmed) || this.#isIgnoredElement(element)) {
        // out === null: покажем узел снова — попробуем ещё раз, контекст мог измениться.
        this.#textState.set(node, { src: raw, out: null });
        return false;
      }

      // Плюрализация первым: если рядом есть число, форма важнее любого словаря.
      const translated =
        this.#pluralizeFromParent(node, element) ||
        lookup(trimmed, element) ||
        this.#applyPageRegexp(trimmed) ||
        applyTextRules(trimmed) ||
        applySuffix(trimmed) ||
        this.#assemblePhrase(node);

      if (!translated || translated === trimmed) {
        this.#textState.set(node, { src: raw, out: null });
        Missed.record(trimmed);
        return false;
      }

      node.data = lead + translated + trail;
      this.#textState.set(node, { src: raw, out: node.data });
      this.#stats.text++;
      Missed.cleanup(trimmed);
      return true;
    }

    /** Регулярки страницы выполняются до общих правил. */
    #applyPageRegexp(text) {
      for (const [pattern, replacement] of getPageConfig().regexpRules) {
        if (!pattern || !pattern.test(text)) continue;
        const replaced = text.replace(pattern, replacement);
        if (replaced && replaced !== text) return replaced;
      }
      return null;
    }

    /** «Mods» + число в соседнем узле: 8.9k | Mods -> 8.9k модов. */
    #pluralizeFromParent(node, element) {
      if (!element) return null;
      const noun = findCountableNoun(node.data);
      if (!noun) return null;
      const numInfo = extractNumberFromParent(element);
      if (!numInfo) return null;

      let form = pluralize(numInfo.fullNum, noun.forms);
      const original = node.data.trim();
      if (original[0] === original[0].toUpperCase() && original[0] !== original[0].toLowerCase()) {
        form = form.charAt(0).toUpperCase() + form.slice(1);
      }
      this.#stats.plural++;
      return form;
    }

    /**
     * Склейка соседних узлов в одну фразу — то, что нужно React-разметке,
     * где «Recently added» приходит двумя <span>. Перевод уходит в первый узел.
     */
    #assemblePhrase(node) {
      if (!CONFIG.PHRASE_ASSEMBLY) return null;

      const pieces = collectInlinePieces(node, CONFIG.PHRASE_MAX_PIECES);
      if (!pieces) return null;

      for (const piece of pieces) {
        const state = this.#textState.get(piece);
        if ((state && piece.data === state.out) || isTrulyTranslated(piece.data)) return null;
      }

      const source = normalizeSpace(pieces.map(p => p.data).join(''));
      if (!source || source.length > CONFIG.MAX_TEXT_LENGTH) return null;

      const translated = this.#applyPageRegexp(source) || lookup(source, node.parentElement);
      if (!translated || translated === source) return null;

      for (let i = 1; i < pieces.length; i++) {
        const piece = pieces[i];
        const src = piece.data;
        piece.data = '';
        this.#textState.set(piece, { src, out: '' });
      }
      this.#stats.phrase++;
      return translated;
    }

    // ── Атрибуты ─────────────────────────────────────────────────────────

    translateAttributes(element) {
      if (!element || typeof element.getAttribute !== 'function') return;
      if (this.#isIgnoredElement(element)) return;

      let map = this.#attrState.get(element);
      if (!map) {
        map = new Map();
        this.#attrState.set(element, map);
      }

      for (const attr of dict.attributes) {
        const current = element.getAttribute(attr);
        if (current === null) continue;

        const state = map.get(attr);
        if (state) {
          if (current === state.out) continue;
          map.delete(attr);
        }

        if (!current || current.length > CONFIG.MAX_ATTR_LENGTH || RE_NEXT_CHUNK.test(current)) {
          map.set(attr, { src: current, out: current });
          continue;
        }
        if (isSkippableText(current)) {
          map.set(attr, { src: current, out: null });
          continue;
        }

        const translated = lookup(current, element) || this.#applyPageRegexp(current)
          || applyTextRules(current) || applySuffix(current);

        if (translated && translated !== current) {
          element.setAttribute(attr, translated);
          map.set(attr, { src: current, out: translated });
          this.#stats.attr++;
        } else {
          map.set(attr, { src: current, out: null });
          Missed.record(current);
        }
      }
    }

    // ── Обход дерева ─────────────────────────────────────────────────────

    /** Собирает узлы поддерева, отсекая игнорируемые ветки целиком. */
    collect(root) {
      const textNodes = [];
      const elements = [];
      if (!root) return { textNodes, elements };

      if (root.nodeType === Node.TEXT_NODE) {
        textNodes.push(root);
        return { textNodes, elements };
      }

      const visit = (node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          textNodes.push(node);
          return;
        }
        if (node.nodeType !== Node.ELEMENT_NODE) return;
        if (this.#isIgnoredElement(node)) return;

        elements.push(node);

        const walker = document.createTreeWalker(
          node,
          NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
          this.#walkerFilter,
          false
        );
        let child;
        while ((child = walker.nextNode())) {
          if (child.nodeType === Node.TEXT_NODE) textNodes.push(child);
          else elements.push(child);
        }

        // Открытые shadow root: веб-компоненты прячут текст от обычного обхода.
        if (dict.observeShadowRoots && child === null && node.shadowRoot) {
          this.#collectShadow(node.shadowRoot, textNodes, elements);
        }
      };

      visit(root);
      return { textNodes, elements };
    }

    #collectShadow(shadowRoot, textNodes, elements) {
      const walker = document.createTreeWalker(
        shadowRoot,
        NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
        this.#walkerFilter,
        false
      );
      let child;
      while ((child = walker.nextNode())) {
        if (child.nodeType === Node.TEXT_NODE) textNodes.push(child);
        else elements.push(child);
      }
    }

    /**
     * Переводит всё дерево по срезам, уступая браузеру между ними.
     * Ничего не обрезается: длинные страницы проходят за несколько кадров.
     */
    async translateTree(root) {
      const { textNodes, elements } = this.collect(root);
      this.#stats.nodes += textNodes.length;

      for (const element of elements) this.translateAttributes(element);

      const chunk = CONFIG.CHUNK_SIZE;
      for (let i = 0; i < textNodes.length; i += chunk) {
        const end = Math.min(i + chunk, textNodes.length);
        for (let j = i; j < end; j++) this.translateTextNode(textNodes[j]);
        if (end < textNodes.length) await nextTask();
      }
    }

    /**
     * Возвращает страницу к английскому оригиналу.
     * Оригиналы сохранены в #textState/#attrState, поэтому перевод обратим.
     */
    restoreTree(root) {
      const { textNodes, elements } = this.collect(root);

      for (const node of textNodes) {
        const state = this.#textState.get(node);
        if (state && state.out !== null && node.data === state.out) {
          node.data = state.src;
          this.#textState.delete(node);
          this.#stats.restored++;
        }
      }

      for (const element of elements) {
        const map = this.#attrState.get(element);
        if (!map) continue;
        for (const [attr, state] of map) {
          if (state.out !== null && element.getAttribute(attr) === state.out) {
            element.setAttribute(attr, state.src);
            this.#stats.restored++;
          }
        }
        this.#attrState.delete(element);
      }
    }

    // ── Наблюдение за DOM ────────────────────────────────────────────────

    observe(root = document.body) {
      if (!root || this.#observer) return;
      this.#observer = new MutationObserver(
        records => safe(this, this.#onMutations, 'MutationObserver')(records));

      const options = {
        childList: true,
        subtree: true,
        characterData: getPageConfig().characterData,
        attributes: dict.attributes.length > 0
      };
      // Пустой attributeFilter бросает TypeError, поэтому добавляем отдельно.
      if (options.attributes) options.attributeFilter = dict.attributes.slice();

      this.#observer.observe(root, options);
    }

    disconnect() {
      if (this.#observer) {
        this.#observer.disconnect();
        this.#observer = null;
      }
      if (this.#debounceId) {
        clearTimeout(this.#debounceId);
        this.#debounceId = 0;
      }
    }

    #onMutations(records) {
      const textNodes = new Set();
      const attrTargets = new Set();
      const addedRoots = new Set();

      for (const record of records) {
        if (record.type === 'childList') {
          // Настоящий MutationRecord всегда даёт NodeList, но дешёвая проверка
          // снимает падение на синтетических записях.
          const added = record.addedNodes;
          if (!added) continue;
          for (const node of added) {
            if (this.#isIgnoredMutationTarget(node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement)) continue;
            if (node.nodeType === Node.TEXT_NODE) textNodes.add(node);
            else if (node.nodeType === Node.ELEMENT_NODE) addedRoots.add(node);
          }
        } else if (record.type === 'characterData') {
          if (getPageConfig().characterData) textNodes.add(record.target);
        } else if (record.type === 'attributes') {
          // Только сам элемент: обход поддерева здесь давал бы лавину мутаций.
          if (!this.#isIgnoredMutationTarget(record.target)) attrTargets.add(record.target);
        }
      }

      this.#dedupeAncestors(addedRoots);

      if (!textNodes.size && !attrTargets.size && !addedRoots.size) return;

      if (this.#debounceId) clearTimeout(this.#debounceId);
      this.#debounceId = setTimeout(() => {
        this.#debounceId = 0;
        for (const element of attrTargets) this.translateAttributes(element);
        for (const node of textNodes) this.translateTextNode(node);
        for (const root of addedRoots) this.enqueue(root);
      }, CONFIG.OBSERVER_DEBOUNCE_MS);
    }

    /** В одной пачке мутаций родитель и его потомок обходятся один раз. */
    #dedupeAncestors(nodes) {
      if (nodes.size < 2) return;
      for (const node of [...nodes]) {
        let ancestor = node.parentNode;
        while (ancestor) {
          if (nodes.has(ancestor)) {
            nodes.delete(node);
            break;
          }
          ancestor = ancestor.parentNode;
        }
      }
    }

    /** Последовательная очередь поддеревьев, чтобы не плодить параллельные обходы. */
    enqueue(root) {
      if (!root) return;
      this.#pendingRoots.push(root);
      if (this.#draining) return;
      this.#draining = true;
      (async () => {
        try {
          while (this.#pendingRoots.length) {
            await this.translateTree(this.#pendingRoots.shift());
          }
        } finally {
          this.#draining = false;
        }
      })();
    }

    get stats() {
      return { ...this.#stats };
    }

    resetStats() {
      this.#stats = { text: 0, attr: 0, phrase: 0, plural: 0, nodes: 0, restored: 0 };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  8. Заголовок вкладки
  // ═══════════════════════════════════════════════════════════════════════

  const TitleTranslator = {
    original: null,

    capture() {
      if (this.original === null) this.original = document.title;
      return this.original;
    },

    apply() {
      const original = this.capture();
      if (!original) return false;
      if (isTrulyTranslated(original)) return false;

      const direct = dict.titleStatic[original];
      if (direct && direct !== original) {
        document.title = direct;
        return true;
      }
      for (const [pattern, replacement] of dict.titleRegexp) {
        if (!pattern || !pattern.test(original)) continue;
        const replaced = original.replace(pattern, replacement);
        if (replaced && replaced !== original) {
          document.title = replaced;
          return true;
        }
      }
      return false;
    },

    restore() {
      if (this.original === null) return;
      if (document.title !== this.original) document.title = this.original;
    }
  };

  // ═══════════════════════════════════════════════════════════════════════
  //  9. SPA-навигация: pushState / replaceState / popstate / pageshow
  // ═══════════════════════════════════════════════════════════════════════

  const router = {
    translator: null,
    lastUrl: '',
    timer: 0,
    repeated: false,

    /** Ставится сразу при document-start, чтобы не пропустить ранний pushState. */
    install() {
      this.lastUrl = location.href;

      for (const name of ['pushState', 'replaceState']) {
        const original = history[name];
        if (typeof original !== 'function') continue;
        history[name] = function (...args) {
          const result = original.apply(this, args);
          router.schedule('history.' + name);
          return result;
        };
      }

      addEventListener('popstate', () => this.schedule('popstate'));
      addEventListener('hashchange', () => this.schedule('hashchange'));
      addEventListener('pageshow', () => this.schedule('pageshow'));
      addEventListener('load', () => this.schedule('load'));

      debug.log('SPA-хуки установлены');
    },

    schedule(reason) {
      if (this.timer) clearTimeout(this.timer);
      this.timer = setTimeout(() => {
        this.timer = 0;
        const url = location.href;
        if (url === this.lastUrl) return;
        this.lastUrl = url;
        this.repeated = false;
        this.run(reason);
      }, CONFIG.ROUTE_DEBOUNCE_MS);
    },

    async run(reason = 'manual') {
      if (!this.translator || !document.body) return;

      debug.log('Проход по странице:', reason);
      await this.translator.translateTree(document.body);
      TitleTranslator.apply();

      // Контент Next.js стримится после первой разметки — короткий повтор.
      if (!this.repeated) {
        this.repeated = true;
        await idleTask(CONFIG.ROUTE_DEBOUNCE_MS);
        if (this.translator) {
          await this.translator.translateTree(document.body);
          TitleTranslator.apply();
        }
      }
    },

    reset() {
      this.repeated = false;
    }
  };

  // ═══════════════════════════════════════════════════════════════════════
  //  10. Публичный API
  // ═══════════════════════════════════════════════════════════════════════

  const NRL = {
    version: '3.1.0',
    CONFIG,
    debug,
    dict,
    Storage,
    Missed,
    TitleTranslator,
    // Экспортируется для тестов: без него нельзя прогнать обход и
    // обработку мутаций без реального браузера.
    Translator,
    translator: null,
    routerInstalled: false,

    loadDictionary,
    buildRules: buildTextRules,
    clearPageConfigCache,
    detectPageType,
    buildPageConfig,

    /** Ставится сразу при document-start, чтобы не пропустить ранний pushState. */
    installRouter() {
      if (this.routerInstalled) return;
      this.routerInstalled = true;
      router.install();
    },

    get pageConfig() { return getPageConfig(); },
    lookup,
    pluralize,
    expandNumber,
    parseNumber,
    monthRu,
    applyTextRules,
    applySuffix,
    normalizeSpace,
    escapeRe,
    trimBounds,
    findCountableNoun,
    extractNumberFromParent,
    collectInlinePieces,
    safe,

    /** Единственная точка старта: словарь -> правила -> страница -> перевод. */
    async start() {
      if (this.translator) return this.translator;

      loadDictionary(window.NRL_TRANSLATIONS);
      buildTextRules();
      setPageType(detectPageType(location.pathname));
      debug.log('Словарь:', Object.keys(dict.main).length, 'записей,', TEXT_RULES.length,
        'правил, страница', getPageConfig().pageType);

      this.translator = new Translator();
      router.translator = this.translator;

      // Первый проход — до подключения наблюдателя, иначе каждая наша
      // запись попала бы в очередь мутаций и породила повторный обход.
      await this.translator.translateTree(document.body);
      TitleTranslator.capture();
      TitleTranslator.apply();
      this.translator.observe(document.body);
      router.reset();

      debug.log('Готово:', this.translator.stats);
      return this.translator;
    },

    /** Принудительный полный проход (меню, отладка). */
    async translateAll(reason = 'manual') {
      router.reset();
      await router.run(reason);
    },

    /** Возврат к английскому — точная отмена всех наших правок. */
    restoreAll() {
      if (!this.translator) return;
      this.translator.disconnect();
      safe(this.translator, this.translator.restoreTree, 'restoreTree')(document.body);
      TitleTranslator.restore();
      Missed.flush();
      debug.log('Восстановлено узлов:', this.translator.stats.restored);
    },

    /** Мгновенное включение после выключения — без перезагрузки страницы. */
    async enable() {
      if (this.translator) {
        this.translator.observe(document.body);
        await this.translateAll('enable');
      }
    },

    stop() {
      this.translator?.disconnect();
      Missed.flush();
    },

    isRunning() {
      return !!this.translator && !!this.translator.observer;
    },

    translateElement(root) {
      if (!this.translator || !root) return;
      this.translator.enqueue(root);
    },

    setMissedTerms(enabled) {
      dict.missedTerms.enabled = enabled;
      Storage.set('NRL_MISSED_TERMS_ENABLED', String(enabled));
      if (!enabled) Missed.clearAll();
    },

    report() {
      const stats = this.translator?.stats || {};
      const missed = Missed.stats();
      const data = {
        'Версия': NRL.version,
        'Страница': getPageConfig().pageType,
        'Переведено текстовых узлов': stats.text || 0,
        'Переведено атрибутов': stats.attr || 0,
        'Склеено фраз': stats.phrase || 0,
        'Плюрализация по родителю': stats.plural || 0,
        'Просмотрено узлов': stats.nodes || 0,
        'Не переведено (страниц)': missed.paths,
        'Не переведено (строк)': missed.terms,
        'Контекстных правил': dict.contextual.size,
        'Текстовых правил': TEXT_RULES.length,
        'Записей в main': Object.keys(dict.main).length,
        'Кэш правил': ruleCache.size
      };
      console.table(data);
      return data;
    },

    resetStats() {
      this.translator?.resetStats();
    },

    clearRuleCache() {
      ruleCache.clear();
    }
  };

  window.NRL = NRL;
  window.NRL.router = router;
})();
