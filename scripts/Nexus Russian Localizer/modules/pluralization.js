/**
 * PluralizationEngine — standalone module for all pluralization logic.
 *
 * Responsibilities:
 *   1. Translate suffixed numbers: "8.9k" → "8.9 тыс.", "$18.2m" → "$18.2 млн"
 *   2. Pluralize countable nouns: "mods" → "модов", "collections" → "коллекций"
 *   3. Combined: "8.9k mods" → "8.9 тыс. модов"
 *   4. Parent-based: find number in parent elements for split-DOM layouts
 *   5. Provide templates for the TranslationEngine's dynamic template system
 *
 * This module is completely independent of the translation engine.
 * It exposes a global `window.pluralizationEngine` instance.
 */
class PluralizationEngine {
  constructor() {
    /** @type {Map<string, string[]>} en word → [ru singular, ru few, ru many] */
    this.pluralMap = new Map();

    /** @type {{k:{ru:string,multiplier:number},m:{...},b:{...},t:{...}}} */
    this.suffixMap = {
      k: { ru: 'тыс.',  multiplier: 1_000 },
      m: { ru: 'млн',   multiplier: 1_000_000 },
      b: { ru: 'млрд',  multiplier: 1_000_000_000 },
      t: { ru: 'трлн',  multiplier: 1_000_000_000_000 }
    };

    /** Number + optional suffix pattern: captures $, 8.9k, 100, etc. */
    this.RE_NUMBER = /([\$€£]?)\s*(\d+(?:[.,]\d+)?)\s*([kmbt])?\b/i;

    /** Number + suffix + word pattern: "8.9k mods", "$18.2m endorsements" */
    this.RE_NUMBER_SUFFIX_WORD = null; // built per-word in _buildWordRegex

    this._initPluralMap();
  }

  // ──────────────────────────────────────────────
  //  Initialization
  // ──────────────────────────────────────────────

  _initPluralMap() {
    const units = [
      ['mods',            ['мод', 'моды', 'модов']],
      ['images',          ['изображение', 'изображения', 'изображений']],
      ['collections',     ['коллекция', 'коллекции', 'коллекций']],
      ['downloads',       ['скачивание', 'скачивания', 'скачиваний']],
      ['endorsements',    ['одобрение', 'одобрения', 'одобрений']],
      ['views',           ['просмотр', 'просмотры', 'просмотров']],
      ['replies',         ['ответ', 'ответы', 'ответов']],
      ['members',         ['участник', 'участники', 'участников']],
      ['anonymous',       ['аноним', 'анонимы', 'анонимов']],
      ['guests',          ['гость', 'гости', 'гостей']],
      ['results',         ['результат', 'результаты', 'результатов']],
      ['comments',        ['комментарий', 'комментарии', 'комментариев']],
      ['files',           ['файл', 'файлы', 'файлов']],
      ['items',           ['элемент', 'элементы', 'элементов']],
      ['users',           ['пользователь', 'пользователи', 'пользователей']],
      ['posts',           ['пост', 'посты', 'постов']],
      ['topics',          ['тема', 'темы', 'тем']],
      ['likes',           ['лайк', 'лайки', 'лайков']],
      ['stars',           ['звезда', 'звезды', 'звезд']],
      ['votes',           ['голос', 'голоса', 'голосов']]
    ];

    for (const [en, ru] of units) {
      this.pluralMap.set(en, ru);
    }
  }

  // ──────────────────────────────────────────────
  //  Core: Russian pluralization rule
  // ──────────────────────────────────────────────

  /**
   * Determine the correct Russian plural form.
   * @param {number} n - the number (integer part is used)
   * @param {string[]} forms - [singular, few, many]
   * @returns {string} the correct form
   */
  pluralize(n, forms) {
    if (!forms || forms.length < 3) return forms?.[2] || '';
    const abs = Math.floor(Math.abs(n));
    const lastTwo = abs % 100;
    if (lastTwo >= 11 && lastTwo <= 19) return forms[2];
    const lastDigit = abs % 10;
    if (lastDigit === 1) return forms[0];
    if (lastDigit >= 2 && lastDigit <= 4) return forms[1];
    return forms[2];
  }

  // ──────────────────────────────────────────────
  //  Suffix detection & translation
  // ──────────────────────────────────────────────

  /**
   * Check if a character is a known numeric suffix.
   * @param {string} s
   * @returns {boolean}
   */
  isSuffix(s) {
    return s && s.length === 1 && s.toLowerCase() in this.suffixMap;
  }

  /**
   * Get suffix info (Russian text + multiplier).
   * @param {string} suffixChar - 'k', 'm', 'b', 't'
   * @returns {{ru: string, multiplier: number} | null}
   */
  getSuffixInfo(suffixChar) {
    if (!suffixChar) return null;
    return this.suffixMap[suffixChar.toLowerCase()] || null;
  }

  /**
   * Translate a suffix character to Russian.
   * @param {string} suffixChar
   * @returns {string} e.g. " тыс." or "" if no suffix
   */
  translateSuffix(suffixChar) {
    const info = this.getSuffixInfo(suffixChar);
    return info ? ' ' + info.ru : '';
  }

  /**
   * Compute the full numeric value accounting for suffix.
   * "8.9k" → 8900, "100" → 100, "2.5m" → 2500000
   * @param {number} num
   * @param {string} suffixChar
   * @returns {number}
   */
  expandNumber(num, suffixChar) {
    const info = this.getSuffixInfo(suffixChar);
    return info ? num * info.multiplier : num;
  }

  // ──────────────────────────────────────────────
  //  Inline translation: "8.9k mods" → "8.9 тыс. модов"
  // ──────────────────────────────────────────────

  /**
   * Attempt to translate a text that contains "number + suffix + word".
   * Returns null if no match.
   * @param {string} text - original text node content
   * @returns {{text: string, replaced: boolean}}
   */
  translateInline(text) {
    if (!text || text.length > 200) return { text, replaced: false };

    // Try each known word
    for (const [enWord, ruForms] of this.pluralMap) {
      // Build a regex: optional prefix chars, then number+suffix, then the word
      // Handles: "8.9k mods", "$18.2m endorsements", "100 files", "2.5b downloads"
      const wordRegex = new RegExp(
        `^([\\s]*)([\\$€£]?\\s*\\d+(?:[.,]\\d+)?\\s*[kmbt]?)\\s+(${enWord})\\s*$`,
        'i'
      );
      const m = text.match(wordRegex);
      if (m) {
        return { text: this._formatMatch(m[1], m[2], m[3], ruForms), replaced: true };
      }
    }

    return { text, replaced: false };
  }

  /**
   * Translate a standalone suffixed number: "8.9k" → "8.9 тыс.", "$18.2m" → "$18.2 млн"
   * Returns null if text is not a suffixed number.
   * @param {string} text
   * @returns {{text: string, replaced: boolean}}
   */
  translateSuffixedNumber(text) {
    if (!text || text.length > 50) return { text, replaced: false };

    const trimmed = text.trim();
    const m = this.RE_NUMBER.exec(trimmed);
    if (!m) return { text, replaced: false };

    const [, currency, numStr, suffix] = m;
    if (!suffix) return { text, replaced: false }; // no suffix → nothing to translate

    // Verify the entire text is just the number (with optional currency/space)
    const cleaned = trimmed.replace(/\s+/g, ' ').trim();
    const expected = (currency || '') + numStr + suffix;
    if (cleaned.toLowerCase() !== expected.toLowerCase()) return { text, replaced: false };

    const translated = (currency || '') + numStr + this.translateSuffix(suffix);
    return { text: translated, replaced: true };
  }

  // ──────────────────────────────────────────────
  //  Parent-based: word in child, number in parent
  // ──────────────────────────────────────────────

  /**
   * Check if a text node is a countable noun (English or already-translated Russian form).
   * @param {string} text - trimmed, lowercase text of the node
   * @returns {{enKey: string, ruForms: string[]} | null}
   */
  findCountableNoun(text) {
    if (!text) return null;
    const lower = text.toLowerCase().trim();

    // Check English forms
    for (const [enKey, ruForms] of this.pluralMap) {
      if (lower === enKey) return { enKey, ruForms };
    }

    // Check Russian forms (singular or plural variants)
    for (const [, ruForms] of this.pluralMap) {
      for (const form of ruForms) {
        if (lower === form) return { enKey: null, ruForms };
      }
    }

    return null;
  }

  /**
   * Extract a number (with optional currency & suffix) from parent text.
   * Walks up to `maxLevels` ancestors. Prefers numbers adjacent to the child's position.
   *
   * @param {Element} element - the child element containing the countable noun
   * @param {number} [maxLevels=3]
   * @returns {{numStr: string, suffix: string, currency: string, fullNum: number} | null}
   */
  extractNumberFromParent(element, maxLevels = 3) {
    let parent = element?.parentElement;
    let levels = 0;

    while (parent && levels < maxLevels) {
      // Get direct child text (excluding deeply nested text) for positional accuracy
      const directText = this._getDirectChildText(parent);
      const m = this.RE_NUMBER.exec(directText);
      if (m) {
        const [, currency, numStr, suffix] = m;
        const num = parseFloat(numStr.replace(',', '.'));
        if (!isNaN(num) && num >= 0) {
          return {
            numStr,
            suffix: suffix || '',
            currency: currency || '',
            fullNum: this.expandNumber(num, suffix)
          };
        }
      }

      // Fallback: full textContent
      const fullText = parent.textContent || '';
      const m2 = this.RE_NUMBER.exec(fullText);
      if (m2) {
        const [, currency, numStr, suffix] = m2;
        const num = parseFloat(numStr.replace(',', '.'));
        if (!isNaN(num) && num >= 0) {
          return {
            numStr,
            suffix: suffix || '',
            currency: currency || '',
            fullNum: this.expandNumber(num, suffix)
          };
        }
      }

      parent = parent.parentElement;
      levels++;
    }

    return null;
  }

  /**
   * Process a countable noun in a text node using parent-based number lookup.
   * If a number is found, replaces the noun with the correct plural form.
   * Also translates the number's suffix if present.
   *
   * @param {Text} node - the text node containing the noun
   * @param {Element} element - the parent element of the text node
   * @returns {boolean} true if replaced
   */
  processParentPluralization(node, element) {
    if (!node || !element) return false;

    const text = node.textContent?.trim();
    if (!text) return false;

    const noun = this.findCountableNoun(text);
    if (!noun) return false;

    const numInfo = this.extractNumberFromParent(element);
    if (!numInfo) return false;

    // Pluralize the noun
    let pluralized = this.pluralize(numInfo.fullNum, noun.ruForms);

    // Preserve original capitalization: "Моды" → "Модов", "моды" → "модов"
    const originalText = text.trim();
    if (originalText && originalText[0] === originalText[0].toUpperCase() && originalText[0] !== originalText[0].toLowerCase()) {
      pluralized = pluralized.charAt(0).toUpperCase() + pluralized.slice(1);
    }

    // Replace the noun in the text node
    const nodeText = node.textContent;
    const regex = new RegExp(this._escapeRegex(originalText), 'gi');
    if (regex.test(nodeText)) {
      node.textContent = nodeText.replace(regex, pluralized);
    }

    // Translate the number node's suffix if it's a separate text node
    this._translateNumberNodeSuffix(element, numInfo);

    return true;
  }

  // ──────────────────────────────────────────────
  //  Template generation for TranslationEngine
  // ──────────────────────────────────────────────

  /**
   * Generate DYNAMIC_TEMPLATES entries for the TranslationEngine.
   * These handle inline patterns like "8.9k mods" → "8.9 тыс. модов"
   * and time/date patterns.
   *
   * @returns {Array<{pattern: RegExp, replacer?: Function, replacement?: string, maxLength?: number}>}
   */
  getTemplates() {
    const templates = [];

    // Inline pluralization templates: "number+suffix+word" → "number+ruSuffix+ruWord"
    for (const [enWord, ruForms] of this.pluralMap) {
      // Build regex pattern that correctly captures the suffix AFTER the decimal
      // Pattern: prefix? number (int.dec?) suffix? space? word
      const escapedWord = enWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      templates.push({
        pattern: new RegExp(
          `^([\\s]*)([\\$€£]?\\s*\\d+(?:[.,]\\d+)?)([kmbt])?\\s+${escapedWord}\\s*$`,
          'i'
        ),
        replacer: (_match, prefix, numStr, suffix) => {
          return this._formatMatch(prefix, numStr, suffix || '', ruForms);
        }
      });
    }

    // Date template: "12 Jan 2024" → "12 января 2024"
    templates.push({
      pattern: /(\d{1,2})\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s*(\d{4})/gi,
      replacer: (_match, day, month, year) => {
        const dayNum = parseInt(day);
        const yearNum = parseInt(year);
        if (dayNum < 1 || dayNum > 31 || yearNum < 1000 || yearNum > 9999) return _match;
        const months = window.NRL_TRANSLATIONS?.months || {};
        return `${dayNum} ${months[month] || month} ${yearNum}`;
      }
    });

    // Time ago: "5 minutes ago" → "5 минут назад"
    const timeUnits = {
      second: ['секунду', 'секунды', 'секунд'],
      minute: ['минуту', 'минуты', 'минут'],
      hour:   ['час', 'часа', 'часов'],
      day:    ['день', 'дня', 'дней'],
      week:   ['неделю', 'недели', 'недель'],
      month:  ['месяц', 'месяца', 'месяцев'],
      year:   ['год', 'года', 'лет']
    };

    templates.push({
      pattern: /(\d+)[\s\u00A0]+(second|minute|hour|day|week|month|year)s?[\s\u00A0]+ago/gi,
      replacer: (_match, count, unit) => {
        const num = parseInt(count);
        if (isNaN(num) || num < 0 || num > 1000000) return _match;
        return `${num} ${this.pluralize(num, timeUnits[unit])} назад`;
      }
    });

    // Time until: "5 minutes to/through/before" → "5 минут до"
    templates.push({
      pattern: /(\d+)[\s\u00A0]+(second|minute|hour|day|week|month|year)s?[\s\u00A0]+(to|through|before)/gi,
      replacer: (_match, count, unit, prep) => {
        const num = parseInt(count);
        if (isNaN(num) || num < 0 || num > 1000000) return _match;
        return `${num} ${this.pluralize(num, timeUnits[unit])} до`;
      }
    });

    // File size conversions
    templates.push({ pattern: /(\d+(?:[.,]\d+)?)\s*GB/gi, replacement: '$1 ГБ', maxLength: 20 });
    templates.push({ pattern: /(\d+(?:[.,]\d+)?)\s*MB/gi, replacement: '$1 МБ', maxLength: 20 });
    templates.push({ pattern: /(\d+(?:[.,]\d+)?)\s*KB/gi, replacement: '$1 КБ', maxLength: 20 });
    templates.push({ pattern: /(\d+(?:[.,]\d+)?)\s*TB/gi, replacement: '$1 ТБ', maxLength: 20 });

    return templates;
  }

  // ──────────────────────────────────────────────
  //  Internal helpers
  // ──────────────────────────────────────────────

  /**
   * Format a matched number+suffix+word into translated text.
   * @param {string} prefix - leading whitespace
   * @param {string} numStr - the number string (e.g. "8.9", "$18.2")
   * @param {string} suffix - suffix char or ""
   * @param {string[]} ruForms - [singular, few, many]
   * @returns {string}
   */
  _formatMatch(prefix, numStr, suffix, ruForms) {
    const num = parseFloat(numStr.replace(/[^\d.,-]/g, '').replace(',', '.'));
    if (isNaN(num)) return prefix + numStr + (suffix || '') + ' ' + ruForms[2];

    const fullNum = this.expandNumber(num, suffix);
    const translatedSuffix = this.translateSuffix(suffix);
    // Preserve currency prefix if present
    const currency = numStr.match(/^([\$€£])\s*/)?.[1] || '';
    const cleanNum = numStr.replace(/^[\s\$€£]+/, '');

    return `${prefix}${currency}${cleanNum}${translatedSuffix} ${this.pluralize(fullNum, ruForms)}`;
  }

  /**
   * Get the direct text content of child nodes (not deeply nested).
   * This helps find numbers that are siblings of the word element.
   * @param {Element} element
   * @returns {string}
   */
  _getDirectChildText(element) {
    let text = '';
    for (const child of element.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        text += child.textContent || '';
      }
    }
    return text;
  }

  /**
   * After pluralizing a noun, also translate the suffix in the number's text node.
   * @param {Element} parentElement
   * @param {{suffix: string, numStr: string}} numInfo
   */
  _translateNumberNodeSuffix(parentElement, numInfo) {
    if (!numInfo.suffix) return;

    // Find text nodes in the parent that contain the number+suffix
    const walker = document.createTreeWalker(parentElement, NodeFilter.SHOW_TEXT);
    let node;
    while (node = walker.nextNode()) {
      const t = node.textContent;
      if (t && t.includes(numInfo.suffix) && t.includes(numInfo.numStr)) {
        // Replace "8.9k" with "8.9 тыс."
        const suffixInfo = this.getSuffixInfo(numInfo.suffix);
        if (suffixInfo) {
          const pattern = new RegExp(
            `(${this._escapeRegex(numInfo.numStr)})\\s*${this._escapeRegex(numInfo.suffix)}\\b`,
            'i'
          );
          node.textContent = t.replace(pattern, `$1 ${suffixInfo.ru}`);
        }
        break;
      }
    }
  }

  /**
   * Escape special regex characters.
   * @param {string} s
   * @returns {string}
   */
  _escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

// Expose globally
window.PluralizationEngine = PluralizationEngine;
window.pluralizationEngine = new PluralizationEngine();
