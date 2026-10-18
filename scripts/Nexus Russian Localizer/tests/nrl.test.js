/**
 * Тесты чистой логики NRL: словарь, плюрализация, правила дат и размеров.
 * Запуск: node --test "scripts/Nexus Russian Localizer/tests"
 *
 * DOM не эмулируется намеренно — всё, что здесь проверяется, не должно
 * его требовать. Это же гарантирует, что ядро остаётся тестируемым.
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

// Минимальные заглушки: на этапе загрузки ядро обращается только к ним.
const memoryStore = new Map();

globalThis.window = globalThis;
globalThis.localStorage = {
  getItem: key => (memoryStore.has(key) ? memoryStore.get(key) : null),
  setItem: (key, value) => memoryStore.set(key, String(value)),
  removeItem: key => memoryStore.delete(key)
};
globalThis.sessionStorage = globalThis.localStorage;
globalThis.location = {
  href: 'https://www.nexusmods.com/mods',
  pathname: '/mods',
  search: '',
  hash: ''
};
globalThis.history = { pushState() {}, replaceState() {} };
globalThis.addEventListener = () => {};
globalThis.document = { querySelector: () => null };

require(path.join(ROOT, 'translations.js'));
require(path.join(ROOT, 'modules', 'core.js'));

const NRL = globalThis.NRL;
const DICTIONARY = globalThis.NRL_TRANSLATIONS;

NRL.loadDictionary(DICTIONARY);
NRL.buildRules();

// ═══════════════════════════════════════════════════════════════════════
//  Целостность словаря
// ═══════════════════════════════════════════════════════════════════════

test('словарь main: все ключи и значения — непустые строки', () => {
  const entries = Object.entries(DICTIONARY.main);
  assert.ok(entries.length > 500, 'словарь слишком мал: ' + entries.length);
  for (const [key, value] of entries) {
    assert.equal(typeof key, 'string');
    assert.ok(key.trim().length > 0, 'пустой ключ');
    assert.equal(typeof value, 'string', 'не строка: ' + key);
    assert.ok(value.trim().length > 0, 'пустое значение для: ' + key);
  }
});

test('словарь main: прототип не протекает в lookup', () => {
  // Object-прототип не должен выдавать переводы для служебных имён.
  for (const key of ['constructor', 'toString', 'hasOwnProperty', '__proto__', 'valueOf']) {
    assert.equal(NRL.lookup(key, null), null, 'lookup вернул значение для ' + key);
  }
});

test('словарь contextual: значения — строки, переводы не пустые', () => {
  for (const [text, selectors] of Object.entries(DICTIONARY.contextual)) {
    assert.ok(text.length > 0);
    for (const [selector, translation] of Object.entries(selectors)) {
      assert.ok(selector.length > 0, 'пустой селектор для ' + text);
      assert.equal(typeof translation, 'string');
      assert.ok(translation.trim().length > 0, 'пустой перевод для ' + text);
    }
  }
});

test('units и timeUnits: ровно три формы', () => {
  for (const [name, forms] of Object.entries(DICTIONARY.units)) {
    assert.ok(Array.isArray(forms) && forms.length === 3, 'units.' + name);
  }
  for (const [name, forms] of Object.entries(DICTIONARY.timeUnits)) {
    assert.ok(Array.isArray(forms) && forms.length === 3, 'timeUnits.' + name);
  }
});

test('месяцы: ключи уникальны в нижнем регистре, значения непустые', () => {
  const lower = new Set();
  for (const [en, ru] of Object.entries(DICTIONARY.months)) {
    assert.ok(ru.trim().length > 0, 'пустой месяц ' + en);
    assert.ok(!lower.has(en.toLowerCase()), 'дубликат месяца: ' + en);
    lower.add(en.toLowerCase());
  }
  assert.ok(lower.has('jan') && lower.has('december'));
});

test('translatableAttributes не содержит value — перевод ломает ввод в формы', () => {
  assert.ok(!DICTIONARY.translatableAttributes.includes('value'));
});

test('phraseInlineTags заданы в верхнем регистре', () => {
  assert.ok(DICTIONARY.phraseInlineTags.length > 0);
  for (const tag of DICTIONARY.phraseInlineTags) {
    assert.equal(tag, tag.toUpperCase(), tag);
  }
});

// ═══════════════════════════════════════════════════════════════════════
//  Плюрализация
// ═══════════════════════════════════════════════════════════════════════

test('pluralize: правила русской числительной', () => {
  const forms = ['мод', 'моды', 'модов'];
  assert.equal(NRL.pluralize(1, forms), 'мод');
  assert.equal(NRL.pluralize(2, forms), 'моды');
  assert.equal(NRL.pluralize(5, forms), 'модов');
  assert.equal(NRL.pluralize(11, forms), 'модов');
  assert.equal(NRL.pluralize(21, forms), 'мод');
  assert.equal(NRL.pluralize(22, forms), 'моды');
  assert.equal(NRL.pluralize(25, forms), 'модов');
  assert.equal(NRL.pluralize(112, forms), 'модов');
  assert.equal(NRL.pluralize(0, forms), 'модов');
});

test('expandNumber: суффиксы масштаба', () => {
  assert.equal(NRL.expandNumber(8.9, 'k'), 8900);
  assert.equal(NRL.expandNumber(1.2, 'M'), 1200000);
  assert.equal(NRL.expandNumber(5, ''), 5);
  assert.equal(NRL.expandNumber(5, 'x'), 5);
});

test('findCountableNoun: английские и русские формы', () => {
  assert.deepEqual(NRL.findCountableNoun('Mods').forms, ['мод', 'моды', 'модов']);
  assert.deepEqual(NRL.findCountableNoun('mods').forms, ['мод', 'моды', 'модов']);
  assert.deepEqual(NRL.findCountableNoun('модов').forms, ['мод', 'моды', 'модов']);
  assert.equal(NRL.findCountableNoun('Something else'), null);
  assert.equal(NRL.findCountableNoun(''), null);
});

// ═══════════════════════════════════════════════════════════════════════
//  Правила текста
// ═══════════════════════════════════════════════════════════════════════

test('даты с префиксами из datePrefixes', () => {
  assert.equal(NRL.applyTextRules('Published 10 Oct 2025'), 'Опубликовано 10 окт 2025');
  assert.equal(NRL.applyTextRules('Updated 15 Nov 2025'), 'Обновлено 15 ноя 2025');
  assert.equal(NRL.applyTextRules('Created 1 Jan 2024'), 'Создано 1 янв 2024');
});

test('даты в обратном порядке и с регистром месяца', () => {
  assert.equal(NRL.applyTextRules('10 Oct 2025 ago'), '10 окт 2025 назад');
  assert.equal(NRL.applyTextRules('12 January 2024'), '12 января 2024');
  assert.equal(NRL.applyTextRules('Published 10 OCT 2025'), 'Опубликовано 10 окт 2025');
});

test('некорректные даты остаются нетронутыми', () => {
  assert.equal(NRL.applyTextRules('Published 99 Oct 2025'), null);
  assert.equal(NRL.applyTextRules('Published 10 Zzz 2025'), null);
});

test('время назад склоняется (винительный падеж)', () => {
  assert.equal(NRL.applyTextRules('1 minute ago'), '1 минуту назад');
  assert.equal(NRL.applyTextRules('2 minutes ago'), '2 минуты назад');
  assert.equal(NRL.applyTextRules('5 minutes ago'), '5 минут назад');
  assert.equal(NRL.applyTextRules('11 minutes ago'), '11 минут назад');
  assert.equal(NRL.applyTextRules('21 minutes ago'), '21 минуту назад');
  assert.equal(NRL.applyTextRules('22 minutes ago'), '22 минуты назад');
  assert.equal(NRL.applyTextRules('1 hour ago'), '1 час назад');
  assert.equal(NRL.applyTextRules('3 days ago'), '3 дня назад');
});

test('число + существительное склоняется', () => {
  assert.equal(NRL.applyTextRules('1 mod'), '1 мод');
  assert.equal(NRL.applyTextRules('3 mods'), '3 моды');
  assert.equal(NRL.applyTextRules('8.9k mods'), '8.9k модов');
  assert.equal(NRL.applyTextRules('100 files'), '100 файлов');
  assert.equal(NRL.applyTextRules('21 file'), '21 файл');
});

test('размеры файлов', () => {
  assert.equal(NRL.applyTextRules('1.2 GB'), '1.2 ГБ');
  assert.equal(NRL.applyTextRules('350 MB'), '350 МБ');
});

test('текст без цифр не трогаем правилами', () => {
  assert.equal(NRL.applyTextRules('Download'), null);
  assert.equal(NRL.applyTextRules(''), null);
});

test('суффиксы остаются как есть, пока suffixes пуст', () => {
  assert.equal(NRL.applySuffix('8.9k'), null);
  assert.equal(NRL.applySuffix('18.2m'), null);
  assert.equal(NRL.applySuffix('100'), null);
});

test('суффиксы переводятся, когда словарь их содержит', () => {
  NRL.loadDictionary({
    ...DICTIONARY,
    suffixes: { k: 'тыс.', m: 'млн' }
  });
  NRL.buildRules();
  try {
    assert.equal(NRL.applySuffix('8.9k'), '8.9тыс.');
    assert.equal(NRL.applySuffix('$18.2m'), '$18.2млн');
    assert.equal(NRL.applySuffix('5b'), null);
  } finally {
    NRL.loadDictionary(DICTIONARY);
    NRL.buildRules();
  }
});

// ═══════════════════════════════════════════════════════════════════════
//  Утилиты и поиск
// ═══════════════════════════════════════════════════════════════════════

test('trimBounds сохраняет пробелы по краям', () => {
  assert.deepEqual(NRL.trimBounds('  Hello  '), { trimmed: 'Hello', lead: '  ', trail: '  ' });
  assert.deepEqual(NRL.trimBounds('Hello'), { trimmed: 'Hello', lead: '', trail: '' });
  assert.equal(NRL.trimBounds('   ').trimmed, '');
});

test('monthRu регистронезависим', () => {
  assert.equal(NRL.monthRu('Jan'), 'янв');
  assert.equal(NRL.monthRu('JAN'), 'янв');
  assert.equal(NRL.monthRu('Zzz'), 'Zzz');
});

test('escapeRe экранирует спецсимволы', () => {
  assert.equal(NRL.escapeRe('a.b'), 'a\\.b');
  assert.equal(NRL.escapeRe('Last updated'), 'Last updated');
  assert.equal(NRL.escapeRe('a(b)'), 'a\\(b\\)');
});

test('normalizeSpace схлопывает пробелы', () => {
  assert.equal(NRL.normalizeSpace('  a \n b\tc  '), 'a b c');
});

test('lookup: контекстное правило важнее общего словаря', () => {
  const asHeading = { matches: selector => selector === 'h2' };
  assert.equal(NRL.lookup('Mods', asHeading), 'Моды');
  assert.equal(NRL.lookup('Mods', { matches: () => false }), DICTIONARY.main.Mods ?? null);
  assert.equal(NRL.lookup('Home', null), 'Главная');
});

test('lookup не падает на невалидном селекторе', () => {
  const broken = { matches() { throw new SyntaxError('bad selector'); } };
  assert.equal(NRL.lookup('Mods', broken), DICTIONARY.main.Mods ?? null);
});

// ═══════════════════════════════════════════════════════════════════════
//  Публичный API
//  NRL.user.js вызывает эти члены при загрузке и из меню. Если хоть один
//  пропадёт, скрипт упадёт на реальной странице — проверяем здесь.
// ═══════════════════════════════════════════════════════════════════════

test('публичный API покрывает все вызовы из NRL.user.js', () => {
  const methods = {
    installRouter: 'вызывается в boot() до всего остального',
    start: 'вызывается в boot()',
    enable: 'вызывается переключателем при включении',
    restoreAll: 'вызывается переключателем при выключении',
    isRunning: 'переключатель проверяет, что переключение сработало',
    translateAll: 'пункт меню «перевести заново»',
    report: 'пункт меню «статистика»',
    setMissedTerms: 'меню учёта непереведённых',
    stop: 'остановка движка',
    safe: 'используется NRL.user.js'
  };
  for (const [name, reason] of Object.entries(methods)) {
    assert.equal(typeof NRL[name], 'function', `NRL.${name} пропал — ${reason}`);
  }
});

test('вложенные объекты публичного API на месте', () => {
  assert.equal(typeof NRL.debug.enable, 'function');
  assert.equal(typeof NRL.debug.disable, 'function');
  assert.equal(typeof NRL.debug.log, 'function');
  assert.equal(typeof NRL.debug.warn, 'function');
  assert.equal(typeof NRL.Missed.stats, 'function');
  assert.equal(typeof NRL.Missed.record, 'function');
  assert.equal(typeof NRL.Missed.exportFile, 'function');
  assert.equal(typeof NRL.Missed.clearAll, 'function');
  assert.equal(typeof NRL.Storage.setVerified, 'function');
  assert.equal(typeof NRL.TitleTranslator.apply, 'function');
  assert.equal(typeof NRL.TitleTranslator.restore, 'function');
  assert.equal(typeof NRL.dict, 'object');
  assert.equal(typeof NRL.CONFIG, 'object');
});

test('installRouter вызывается дважды без побочных последствий', () => {
  // boot() может отработать повторно, а навигация — уже висеть на хуках.
  assert.equal(typeof NRL.installRouter, 'function');
  NRL.installRouter();
  NRL.installRouter();
  assert.equal(NRL.routerInstalled, true);
});

test('safe() требует receiver и возвращает результат вызова', () => {
  // Полная проверка safe() на приватных методах — в dom-stub.test.js.
  const receiver = { double: value => value * 2 };
  assert.equal(NRL.safe(receiver, receiver.double, 'double')(21), 42);
  assert.equal(NRL.safe(receiver, () => { throw new Error('boom'); }, 'boom')(), undefined);
});

test('Storage.setVerified возвращает true при успешной записи', () => {
  assert.equal(NRL.Storage.setVerified('nrl_test_key', 'значение'), true);
  assert.equal(NRL.Storage.get('nrl_test_key'), 'значение');
  NRL.Storage.remove('nrl_test_key');
});

test('Storage.setVerified возвращает false, если запись не фиксируется', () => {
  const original = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: () => null,
    setItem() { /* молча ничего не делаем */ },
    removeItem() {}
  };
  try {
    assert.equal(NRL.Storage.setVerified('nrl_test_key', 'значение'), false);
  } finally {
    globalThis.localStorage = original;
  }
});

test('Storage.json переживает битые данные', () => {
  NRL.Storage.set('nrl_broken_json', '{это не json');
  assert.deepEqual(NRL.Storage.json('nrl_broken_json', { fallback: true }), { fallback: true });
  NRL.Storage.remove('nrl_broken_json');
});

// ═══════════════════════════════════════════════════════════════════════
//  Учёт непереведённых строк
// ═══════════════════════════════════════════════════════════════════════

test('Missed записывает новую строку один раз', () => {
  NRL.dict.missedTerms.enabled = true;
  NRL.Missed.clearAll();

  assert.equal(NRL.Missed.record('Untranslated label'), true);
  assert.equal(NRL.Missed.record('Untranslated label'), false, 'повтор не должен добавлять');
  assert.equal(NRL.Missed.stats().terms, 1);

  NRL.Missed.cleanup('Untranslated label');
  assert.equal(NRL.Missed.stats().terms, 0, 'переведённая строка убирается из списка');
});

test('Missed хранит строки по pathname', () => {
  NRL.dict.missedTerms.enabled = true;
  NRL.Missed.clearAll();
  globalThis.location.pathname = '/mods';

  NRL.Missed.record('On page one');
  globalThis.location.pathname = '/games';
  NRL.Missed.record('On page two');

  const stats = NRL.Missed.stats();
  assert.equal(stats.paths, 2);
  assert.equal(stats.terms, 2);
  assert.deepEqual(Object.keys(NRL.Missed.exportPayload().data).sort(), ['/games', '/mods']);

  NRL.Missed.clearAll();
  globalThis.location.pathname = '/mods';
});

test('Missed уважает лимит на страницу', () => {
  NRL.dict.missedTerms.enabled = true;
  NRL.dict.missedTerms.maxPerPath = 3;
  NRL.Missed.clearAll();

  for (let i = 0; i < 10; i++) NRL.Missed.record(`Term ${i}`);
  assert.equal(NRL.Missed.stats().terms, 3);

  NRL.Missed.clearAll();
  NRL.dict.missedTerms.maxPerPath = 300;
});

test('Missed молчит, когда выключен', () => {
  NRL.dict.missedTerms.enabled = false;
  NRL.Missed.clearAll();
  assert.equal(NRL.Missed.record('Should not be stored'), false);
  assert.equal(NRL.Missed.stats().terms, 0);
});

// ═══════════════════════════════════════════════════════════════════════
//  Заголовок вкладки
// ═══════════════════════════════════════════════════════════════════════

test('правила заголовка доступны из словаря', () => {
  assert.ok(Object.keys(DICTIONARY.titleRules.static).length > 0);
  assert.ok(Array.isArray(DICTIONARY.titleRules.regexp));
  assert.equal(NRL.dict.titleStatic['Nexus Mods'], 'Nexus Mods — русская локализация');
});

test('регулярки заголовка объявлены как [паттерн, замена]', () => {
  for (const rule of DICTIONARY.titleRules.regexp) {
    assert.ok(Array.isArray(rule), 'ожидалась пара [RegExp, замена]');
    assert.ok(rule[0] instanceof RegExp, String(rule));
    assert.equal(typeof rule[1], 'string');
  }
});

// ═══════════════════════════════════════════════════════════════════════
//  Целостность конфигурации
// ═══════════════════════════════════════════════════════════════════════

test('conf.routes — валидные RegExp с непустым page', () => {
  assert.ok(DICTIONARY.conf.routes.length > 0);
  for (const route of DICTIONARY.conf.routes) {
    assert.ok(route.re instanceof RegExp, JSON.stringify(route.page));
    assert.ok(typeof route.page === 'string' && route.page.length > 0);
  }
});

test('conf.routes упорядочены: специфичные до общих', () => {
  const routes = DICTIONARY.conf.routes;
  const filesIdx = routes.findIndex(r => r.page === 'mods/files');
  const detailIdx = routes.findIndex(r => r.page === 'mods/detail');
  const listingIdx = routes.findIndex(r => r.page === 'mods/listing');
  assert.ok(filesIdx < detailIdx, 'mods/files должен проверяться раньше mods/detail');
  assert.ok(detailIdx < listingIdx, 'mods/detail раньше mods/listing');
});

test('conf: списки игнора — массивы строк', () => {
  for (const [key, value] of Object.entries(DICTIONARY.conf.ignoreSelectorPage)) {
    assert.ok(Array.isArray(value), key);
    for (const selector of value) assert.equal(typeof selector, 'string');
  }
  for (const [key, value] of Object.entries(DICTIONARY.conf.ignoreMutationSelectorPage)) {
    assert.ok(Array.isArray(value), key);
  }
  assert.ok(Array.isArray(DICTIONARY.conf.characterDataIgnorePage));
});

test('pageDictionaries и titleRules имеют ожидаемую форму', () => {
  for (const [page, entry] of Object.entries(DICTIONARY.pageDictionaries)) {
    assert.ok(entry.static === undefined || typeof entry.static === 'object', page);
    assert.ok(entry.regexp === undefined || Array.isArray(entry.regexp), page);
  }
});
