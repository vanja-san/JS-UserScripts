/**
 * NRL core — словарь, текстовые правила, перевод DOM, SPA-навигация.
 *
 * Зависимости: translations.js (window.NRL_TRANSLATIONS), подключается из NRL.user.js.
 * Весь движок синхронный: ни IndexedDB, ни Web Worker, ни await в горячем пути.
 */
(() => {
  'use strict';

  // ═══════════════════════════════════════════════════════════════════════
  //  0. Настройки
  // ═══════════════════════════════════════════════════════════════════════

  const CONFIG = {
    // Не переводить: названия/описания модов и пользовательский контент.
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

    // Склеивание соседних текстовых узлов в одну фразу (для React-разметки).
    PHRASE_ASSEMBLY: true,
    PHRASE_MAX_PIECES: 4,

    MAX_TEXT_LENGTH: 2000,   // длиннее — заведомо не из словаря, regex'ы не гоняем
    MAX_ATTR_LENGTH: 1000,

    OBSERVER_DEBOUNCE_MS: 40,
    ROUTE_DEBOUNCE_MS: 60,
    CHUNK_SIZE: 500,        // узлов за один срез, дальше уступаем браузеру

    RULE_CACHE_LIMIT: 2000
  };

  // ═══════════════════════════════════════════════════════════════════════
  //  1. Утилиты
  // ═══════════════════════════════════════════════════════════════════════

  const RE_CYRILLIC = /[\u0400-\u04FF]/;
  const RE_LATIN = /[A-Za-z]/;
  const RE_DIGIT = /\d/;
  const RE_NUMERIC_ONLY = /^[\d\s.,\-+:%/]+$/;
  const RE_HAS_LETTER_OR_DIGIT = /[\p{L}\p{N}]/u;
  const RE_NEXT_CHUNK = /self\.__next_f|__next_f\.push|\.push\(\[1,"/;
  const RE_CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g;

  const storage = {
    get(key) { try { return sessionStorage.getItem(key); } catch { return null; } },
    set(key, value) { try { sessionStorage.setItem(key, value); } catch { /* нет доступа */ } },
    remove(key) { try { sessionStorage.removeItem(key); } catch { /* нет доступа */ } }
  };

  const debug = {
    on: storage.get('NRL_DEBUG') === 'true',
    log(...a) { if (this.on) console.log('[NRL]', ...a); },
    warn(...a) { if (this.on) console.warn('[NRL]', ...a); },
    enable() {
      this.on = true;
      storage.set('NRL_DEBUG', 'true');
      console.log('[NRL] Отладка включена. Перезагрузите страницу.');
    },
    disable() {
      this.on = false;
      storage.remove('NRL_DEBUG');
      console.log('[NRL] Отладка выключена.');
    }
  };

  function escapeRe(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function normalizeSpace(s) {
    return s.replace(/\s+/g, ' ').trim();
  }

  /** Возвращает обрезанный текст и исходные пробелы по краям, чтобы их вернуть при записи. */
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

  /** Оставляет только валидные селекторы и склеивает их в один: 1 matches() вместо 20. */
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

  /** Дешёвые отсевы до словаря и regex'ов. */
  function isSkippableText(trimmed) {
    if (!trimmed) return true;
    if (trimmed.length > CONFIG.MAX_TEXT_LENGTH) return true;
    if (RE_NEXT_CHUNK.test(trimmed)) return true;
    if (RE_NUMERIC_ONLY.test(trimmed)) return true;
    if (!RE_HAS_LETTER_OR_DIGIT.test(trimmed)) return true;
    return isTrulyTranslated(trimmed);
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  2. Словарь
  // ═══════════════════════════════════════════════════════════════════════

  const dict = {
    main: Object.create(null),  // null-прототип: main['constructor'] не вернёт Object
    contextual: new Map(),      // текст -> [{selector, translation}]
    months: new Map(),          // lower-case -> русская форма
    units: new Map(),           // en -> [1 шт., 2-4 шт., 5+ шт.]
    timeUnits: new Map(),
    fileSizes: [],
    datePrefixes: [],
    suffixes: new Map(),
    attributes: ['title', 'placeholder', 'alt', 'aria-label'],
    inlineTags: new Set()
  };

  function loadDictionary(source) {
    const data = source || {};

    dict.main = Object.assign(Object.create(null), data.main || {});
    dict.attributes = (data.translatableAttributes && data.translatableAttributes.length)
      ? data.translatableAttributes.slice()
      : ['title', 'placeholder', 'alt', 'aria-label'];

    dict.months = new Map();
    for (const [en, ru] of Object.entries(data.months || {})) dict.months.set(en.toLowerCase(), ru);

    dict.units = new Map(Object.entries(data.units || {}));
    dict.timeUnits = new Map(Object.entries(data.timeUnits || {}));
    dict.fileSizes = Object.entries(data.fileSizes || {}).map(([en, ru]) => ({ en, ru }));
    dict.datePrefixes = Object.entries(data.datePrefixes || {});
    dict.suffixes = new Map(Object.entries(data.suffixes || {}));
    dict.inlineTags = new Set((data.phraseInlineTags || []).map(t => t.toUpperCase()));

    dict.contextual = new Map();
    for (const [text, selectors] of Object.entries(data.contextual || {})) {
      const rules = [];
      for (const [selector, translation] of Object.entries(selectors || {})) {
        if (selector && translation) rules.push({ selector, translation });
      }
      if (rules.length) dict.contextual.set(text, rules);
    }
  }

  /** Контекстные правила имеют приоритет над общим словарём. */
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
    return dict.main[text] || null;
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  3. Правила текста: даты, плюрализация, размеры файлов
  //  Регулярки без флага g — сбрасывать lastIndex больше не нужно.
  // ═══════════════════════════════════════════════════════════════════════

  const SUFFIX_MULTIPLIERS = { k: 1e3, m: 1e6, b: 1e9, t: 1e12 };
  const RE_NUMBER = /([$€£]?)\s*(\d+(?:[.,]\d+)?)\s*([kmbt])?\b/i;
  const FALLBACK_MONTHS = 'Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec';

  let TEXT_RULES = [];
  const ruleCache = new Map();

  /** Правильное русское окончание: n=1 -> forms[0], 2-4 -> forms[1], 5+ -> forms[2]. */
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

  function formatNumberWord(prefix, numStr, suffix, forms) {
    const num = parseNumber(String(numStr).replace(/[^\d.,]/g, ''));
    if (Number.isNaN(num)) return `${prefix}${numStr} ${pluralize(0, forms)}`;
    const currency = String(numStr).match(/^([$€£])\s*/)?.[1] || '';
    const clean = String(numStr).replace(/^[\s$€£]+/, '');
    return `${prefix}${currency}${clean}${suffix} ${pluralize(expandNumber(num, suffix), forms)}`;
  }

  function buildTextRules() {
    // Длинные названия месяцев идут первыми: иначе «January» распадётся на «Jan» + хвост.
    const monthNames = [...dict.months.keys()].sort((a, b) => b.length - a.length).map(escapeRe);
    const monthAlt = monthNames.length ? monthNames.join('|') : FALLBACK_MONTHS;

    const rules = [];

    // «Published 10 Oct 2025» -> «Опубликовано 10 окт 2025»
    for (const [en, ru] of dict.datePrefixes) {
      rules.push({
        re: new RegExp(`${escapeRe(en)}\\s+(\\d{1,2})\\s+(${monthAlt})\\s+(\\d{4})`, 'i'),
        fn: (m, day, month, year) => {
          const v = validDayYear(day, year);
          return v ? `${ru} ${v.d} ${monthRu(month)} ${v.y}` : m;
        }
      });
    }

    // «10 Oct 2025 ago» -> «10 окт 2025 назад»
    rules.push({
      re: new RegExp(`(\\d{1,2})\\s+(${monthAlt})\\s+(\\d{4})\\s+ago`, 'i'),
      fn: (m, day, month, year) => {
        const v = validDayYear(day, year);
        return v ? `${v.d} ${monthRu(month)} ${v.y} назад` : m;
      }
    });

    // «Updated on 10 Oct 2025» — неизвестный префикс берётся из общего словаря
    rules.push({
      re: new RegExp(`([A-Za-z][A-Za-z ]*?)\\s+(\\d{1,2})\\s+(${monthAlt})\\s+(\\d{4})`, 'i'),
      fn: (m, prefix, day, month, year) => {
        const v = validDayYear(day, year);
        if (!v) return m;
        const head = prefix.trim();
        return `${dict.main[head] || head} ${v.d} ${monthRu(month)} ${v.y}`;
      }
    });

    // «12 January 2024» -> «12 января 2024»
    rules.push({
      re: new RegExp(`(\\d{1,2})\\s+(${monthAlt})\\s+(\\d{4})`, 'i'),
      fn: (m, day, month, year) => {
        const v = validDayYear(day, year);
        return v ? `${v.d} ${monthRu(month)} ${v.y}` : m;
      }
    });

    const unitsAlt = [...dict.timeUnits.keys()].map(escapeRe).join('|');
    if (unitsAlt) {
      // «5 minutes ago» -> «5 минут назад»
      rules.push({
        re: new RegExp(`(\\d+)[\\s\\u00A0]+(${unitsAlt})s?[\\s\\u00A0]+ago`, 'i'),
        fn: (m, count, unit) => formatTimeUnit(count, unit, ' назад')
      });
      // «5 minutes to» -> «5 минут до»
      rules.push({
        re: new RegExp(`(\\d+)[\\s\\u00A0]+(${unitsAlt})s?[\\s\\u00A0]+(to|through|before)`, 'i'),
        fn: (m, count, unit) => formatTimeUnit(count, unit, ' до')
      });
    }

    // «8.9k mods» -> «8.9k модов». Ключи словаря во множественном числе,
    // поэтому его финальное s делаем необязательным: «1 mod» -> «1 мод».
    for (const [en, forms] of dict.units) {
      const base = escapeRe(en);
      const word = base.endsWith('s') ? base.slice(0, -1) + 's?' : base;
      rules.push({
        re: new RegExp(`^[\\s]*([\\$€£]?\\s*\\d+(?:[.,]\\d+)?)([kmbt])?\\s+${word}\\s*$`, 'i'),
        fn: (m, numStr, suffix) => formatNumberWord('', numStr, suffix || '', forms)
      });
    }

    // «1.2 GB» -> «1.2 ГБ»
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

  /** Прогоняет текст через правила. null — ни одно правило не сработало. */
  function applyTextRules(text) {
    if (!RE_DIGIT.test(text)) return null;

    const cached = ruleCache.get(text);
    if (cached !== undefined) return cached;

    const cleaned = text.replace(RE_CONTROL_CHARS, '');
    let result = null;

    for (const rule of TEXT_RULES) {
      if (!rule.re.test(cleaned)) continue;
      // null/undefined от replacer'а превратился бы в строку "null" — возвращаем исходное совпадение.
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

  /** «8.9k» -> «8.9 тыс.». Работает, только если в словаре заполнен раздел suffixes. */
  function applySuffix(text) {
    if (dict.suffixes.size === 0) return null;
    const m = RE_NUMBER.exec(text);
    if (!m || !m[3]) return null;
    const ru = dict.suffixes.get(m[3].toLowerCase());
    return ru ? `${m[1] || ''}${m[2]}${ru}` : null;
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  4. Число и существительное в разнесённой по DOM разметке
  // ═══════════════════════════════════════════════════════════════════════

  const TEXT_NOUN_FORMS = new Map(); // lower-case форма -> [1 шт., 2-4 шт., 5+ шт.]

  function buildNounIndex() {
    TEXT_NOUN_FORMS.clear();
    for (const [en, forms] of dict.units) {
      TEXT_NOUN_FORMS.set(en.toLowerCase(), forms);
      for (const form of forms) TEXT_NOUN_FORMS.set(form.toLowerCase(), forms);
    }
  }

  function findCountableNoun(text) {
    const lower = text?.toLowerCase().trim();
    if (!lower) return null;
    const forms = TEXT_NOUN_FORMS.get(lower);
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
      // Прямой текст родителя ищем на всех уровнях — это разнесённая по <span> разметка.
      // Полный textContent допускаем только у непосредственного родителя:
      // выше по дереву контейнеры слишком большие и дают ложные срабатывания.
      const direct = numberFrom(directChildText(parent));
      const full = direct || (levels === 0 ? numberFrom(parent.textContent) : null);
      if (full) return full;
      parent = parent.parentElement;
      levels++;
    }
    return null;
  }

  /** Текстовый узел, либо inline-элемент с единственным текстовым потомком. */
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
   * Узел и следующие соседи-тексты в пределах родителя.
   * Именно «вперёд», чтобы носителем перевода всегда оставался сам node.
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
  //  5. Перевод DOM
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
    #ignoreClasses = new Set();
    #alwaysTranslate = new Set();
    #ignoredTags = new Set();
    #stats = { text: 0, attr: 0, phrase: 0, plural: 0, nodes: 0 };

    #walkerFilter = {
      acceptNode: (node) => (node.nodeType === Node.ELEMENT_NODE && this.#isIgnoredElement(node)
        ? NodeFilter.FILTER_REJECT
        : NodeFilter.FILTER_ACCEPT)
    };

    constructor() {
      this.#ignoreSelector = compileSelectorList(CONFIG.IGNORED_SELECTORS);
      this.#ignoreClasses = new Set(CONFIG.IGNORED_CLASSES);
      this.#alwaysTranslate = new Set(CONFIG.ALWAYS_TRANSLATE_CLASSES);
      this.#ignoredTags = new Set(CONFIG.IGNORED_TAGS);
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

    // ── Текстовые узлы ───────────────────────────────────────────────────

    /** @returns {boolean} true, если текст узла был изменён */
    translateTextNode(node) {
      if (!node || node.nodeType !== Node.TEXT_NODE) return false;
      const raw = node.data;
      if (!raw) return false;

      const state = this.#textState.get(node);
      if (state) {
        if (raw === state.out) return false;                  // наш перевод уже на месте
        if (raw === state.src && state.out === null) return false; // тот же непереведённый текст
        this.#textState.delete(node);
      }

      const { trimmed, lead, trail } = trimBounds(raw);
      const element = node.parentElement;

      if (isSkippableText(trimmed) || this.#isIgnoredElement(element)) {
        // out === null: при повторном показе узла пробуем ещё раз —
        // контекст (классы родителя) мог измениться при SPA-навигации.
        this.#textState.set(node, { src: raw, out: null });
        return false;
      }

      // Плюрализация идёт первым: если рядом есть число, форма стоит
      // любого общего словаря ("Mods" -> "модов", а не "Моды").
      const translated =
        this.#pluralizeFromParent(node, element) ||
        lookup(trimmed, element) ||
        applyTextRules(trimmed) ||
        applySuffix(trimmed) ||
        this.#assemblePhrase(node);

      if (!translated || translated === trimmed) {
        this.#textState.set(node, { src: raw, out: null });
        return false;
      }

      node.data = lead + translated + trail;
      this.#textState.set(node, { src: raw, out: node.data });
      this.#stats.text++;
      return true;
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

      // Если хоть один кусок уже переведён — фраза не английская, не трогаем.
      for (const piece of pieces) {
        const state = this.#textState.get(piece);
        if ((state && piece.data === state.out) || isTrulyTranslated(piece.data)) return null;
      }

      const source = normalizeSpace(pieces.map(p => p.data).join(''));
      if (!source || source.length > CONFIG.MAX_TEXT_LENGTH) return null;

      const translated = lookup(source, node.parentElement);
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
          map.delete(attr); // значение изменилось — переоцениваем с нуля
        }

        if (!current || current.length > CONFIG.MAX_ATTR_LENGTH || RE_NEXT_CHUNK.test(current)) {
          map.set(attr, { src: current, out: current });
          continue;
        }
        if (isSkippableText(current)) {
          map.set(attr, { src: current, out: null });
          continue;
        }

        const translated = lookup(current, element) || applyTextRules(current) || applySuffix(current);
        if (translated && translated !== current) {
          element.setAttribute(attr, translated);
          map.set(attr, { src: current, out: translated });
          this.#stats.attr++;
        } else {
          map.set(attr, { src: current, out: null });
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

      if (root.nodeType === Node.ELEMENT_NODE) {
        if (this.#isIgnoredElement(root)) return { textNodes, elements };
        elements.push(root);
      }

      const walker = document.createTreeWalker(
        root,
        NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
        this.#walkerFilter,
        false
      );
      let node;
      while ((node = walker.nextNode())) {
        if (node.nodeType === Node.TEXT_NODE) textNodes.push(node);
        else elements.push(node);
      }
      return { textNodes, elements };
    }

    /**
     * Переводит всё дерево по срезам, уступая браузеру между ними.
     * Ничего не обрезается: длинные страницы просто проходят за несколько кадров.
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

    // ── Наблюдение за DOM ────────────────────────────────────────────────

    observe(root = document.body) {
      if (!root || this.#observer) return;
      this.#observer = new MutationObserver(records => this.#onMutations(records));

      const options = {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: dict.attributes.length > 0
      };
      // Пустой attributeFilter бросает TypeError, поэтому добавляем его отдельно.
      if (options.attributes) options.attributeFilter = dict.attributes.slice();

      this.#observer.observe(root, options);
    }

    disconnect() {
      if (this.#observer) {
        this.#observer.disconnect();
        this.#observer = null;
      }
    }

    #onMutations(records) {
      const textNodes = new Set();
      const attrTargets = new Set();
      const addedRoots = new Set();

      for (const record of records) {
        if (record.type === 'childList') {
          for (const node of record.addedNodes) {
            if (node.nodeType === Node.TEXT_NODE) textNodes.add(node);
            else if (node.nodeType === Node.ELEMENT_NODE) addedRoots.add(node);
          }
        } else if (record.type === 'characterData') {
          textNodes.add(record.target);
        } else if (record.type === 'attributes') {
          // Только сам элемент: обход поддерева здесь давал бы лавину мутаций.
          attrTargets.add(record.target);
        }
      }

      if (!textNodes.size && !attrTargets.size && !addedRoots.size) return;

      if (this.#debounceId) clearTimeout(this.#debounceId);
      this.#debounceId = setTimeout(() => {
        this.#debounceId = 0;
        for (const element of attrTargets) this.translateAttributes(element);
        for (const node of textNodes) this.translateTextNode(node);
        for (const root of addedRoots) this.enqueue(root);
      }, CONFIG.OBSERVER_DEBOUNCE_MS);
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
      this.#stats = { text: 0, attr: 0, phrase: 0, plural: 0, nodes: 0 };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  6. SPA-навигация: pushState / replaceState / popstate / pageshow
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
        // Тот же URL после load/pageshow — повтор всё равно не повредит,
        // но экономим проход; после history-навигации URL всегда новый.
        if (url === this.lastUrl) return;
        this.lastUrl = url;
        this.repeated = false; // счётчик повторов живёт в пределах одного перехода
        this.run(reason);
      }, CONFIG.ROUTE_DEBOUNCE_MS);
    },

    async run(reason = 'manual') {
      if (!this.translator || !document.body) return;

      debug.log('Проход по странице:', reason);
      await this.translator.translateTree(document.body);

      // Контент Next.js стримится после первой разметки — короткий повтор в простое.
      if (!this.repeated) {
        this.repeated = true;
        await idleTask(CONFIG.ROUTE_DEBOUNCE_MS);
        if (this.translator) await this.translator.translateTree(document.body);
      }
    },

    reset() {
      this.repeated = false;
    }
  };

  // ═══════════════════════════════════════════════════════════════════════
  //  7. Публичный API
  // ═══════════════════════════════════════════════════════════════════════

  const NRL = {
    version: '3.0.0',
    CONFIG,
    debug,
    dict,
    translator: null,

    loadDictionary,
    buildRules: buildTextRules,
    get rules() { return TEXT_RULES; },
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

    /** Ставится сразу при document-start, чтобы не пропустить ранний pushState. */
    installRouter() {
      router.install();
    },

    /** Единственная точка старта: словарь -> правила -> перевод -> наблюдение. */
    async start() {
      if (this.translator) return this.translator; // повторный вызов не должен плодить наблюдатели

      loadDictionary(window.NRL_TRANSLATIONS);
      buildTextRules();
      debug.log('Словарь загружен:', Object.keys(dict.main).length, 'записей,', TEXT_RULES.length, 'правил');

      this.translator = new Translator();
      router.translator = this.translator;

      // Первый проход — до подключения наблюдателя, иначе каждая наша
      // запись попала бы в очередь мутаций и породила повторный обход.
      await this.translator.translateTree(document.body);
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

    translateElement(root) {
      if (!this.translator || !root) return;
      this.translator.enqueue(root);
    },

    report() {
      const stats = this.translator?.stats || {};
      const data = {
        'Версия': NRL.version,
        'Переведено текстовых узлов': stats.text || 0,
        'Переведено атрибутов': stats.attr || 0,
        'Склеено фраз': stats.phrase || 0,
        'Плюрализация по родителю': stats.plural || 0,
        'Просмотрено узлов': stats.nodes || 0,
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
