/**
 * Регрессии маршрутизации словаря.
 *
 * Каждая поломка — отдельный тест с описанием, что именно сломалось.
 * Добавляйте тест сюда, когда страница сайта меняет разметку или маршрутизацию,
 * иначе поломка обнаружится только у пользователей.
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

globalThis.window = globalThis;
const memoryStore = new Map();
globalThis.localStorage = {
  getItem: key => (memoryStore.has(key) ? memoryStore.get(key) : null),
  setItem: (key, value) => memoryStore.set(key, String(value)),
  removeItem: key => memoryStore.delete(key)
};
globalThis.sessionStorage = globalThis.localStorage;
globalThis.location = { href: 'https://www.nexusmods.com/', pathname: '/', search: '', hash: '' };
globalThis.document = { querySelector: () => null };

require(path.join(ROOT, 'translations.js'));
require(path.join(ROOT, 'modules', 'core.js'));

const NRL = globalThis.NRL;
const DICTIONARY = globalThis.NRL_TRANSLATIONS;

NRL.loadDictionary(DICTIONARY);
NRL.buildRules();

const page = pathname => NRL.detectPageType(pathname);

// ── Маршруты ────────────────────────────────────────────────────────────

test('регрессия: главная страница', () => {
  assert.equal(page('/'), 'home');
});

test('регрессия: страница мода отличена от вкладки и от списка', () => {
  assert.equal(page('/mods/skyrim'), 'mods/detail');
  assert.equal(page('/mods/skyrim/files'), 'mods/files');
  assert.equal(page('/mods/skyrim/screenshots'), 'mods/screenshots');
  assert.equal(page('/mods/skyrim/changelog'), 'mods/changelog');
  assert.equal(page('/mods/skyrim/info'), 'mods/tab');
  assert.equal(page('/mods'), 'mods/listing');
});

test('регрессия: вкладка мода не перехватывается страницей мода', () => {
  // /mods/<slug>/<tab> должен попадать в mods/tab, а не в mods/detail
  assert.equal(page('/mods/skyrim/info'), 'mods/tab');
  assert.notEqual(page('/mods/skyrim/info'), 'mods/detail');
});

test('регрессия: служебные разделы', () => {
  assert.equal(page('/games'), 'games');
  assert.equal(page('/collections'), 'collections');
  assert.equal(page('/users/someone'), 'user');
  assert.equal(page('/users/someone/mods'), 'user');
});

test('регрессия: неизвестный путь падает в универсальный словарь', () => {
  assert.equal(page('/something/unknown/deep/path'), '*');
});

test('маршруты регистронезависимы', () => {
  assert.equal(page('/MODS'), 'mods/listing');
  assert.equal(page('/Games'), 'games');
});

// ── Сборка конфига страницы ─────────────────────────────────────────────

test('конфиг страницы кэшируется и переиспользуется', () => {
  const first = NRL.buildPageConfig('mods/listing');
  const second = NRL.buildPageConfig('mods/listing');
  assert.equal(first, second, 'повторный запрос должен вернуть тот же объект');
});

test('после сброса кэша конфиг собирается заново', () => {
  const before = NRL.buildPageConfig('mods/listing');
  NRL.clearPageConfigCache();
  const after = NRL.buildPageConfig('mods/listing');
  assert.notEqual(before, after);
  assert.deepEqual(after.staticDict, before.staticDict);
});

test('универсальный словарь входит в словарь любой страницы', () => {
  const config = NRL.buildPageConfig('mods/listing');
  assert.equal(config.staticDict.Home, DICTIONARY.main.Home);
  assert.equal(config.staticDict['Recently added'], 'Недавно добавлены');
});

test('конфиг страницы содержит скомпилированные селекторы', () => {
  const config = NRL.buildPageConfig('mods/listing');
  assert.equal(typeof config.ignoreSelector, 'string');
  assert.ok(config.ignoreSelector.includes('.mod-name'), 'глобальные игноры должны попасть в строку');
  assert.ok(config.ignoreSelector.includes('.tabs'), 'игноры страницы должны добавиться');
  assert.equal(typeof config.ignoreMutationSelector, 'string');
});

test('characterData наблюдается везде, пока список отключений пуст', () => {
  assert.equal(NRL.buildPageConfig('mods/listing').characterData, true);
  assert.equal(NRL.buildPageConfig('user').characterData, true);
});

test('characterData выключается для перечисленных страниц', () => {
  NRL.dict.characterDataIgnorePage = ['user'];
  NRL.clearPageConfigCache();
  try {
    assert.equal(NRL.buildPageConfig('user').characterData, false);
    assert.equal(NRL.buildPageConfig('home').characterData, true);
  } finally {
    NRL.dict.characterDataIgnorePage = [];
    NRL.clearPageConfigCache();
  }
});

test('пустой characterDataIgnorePage означает наблюдение везде', () => {
  NRL.dict.characterDataIgnorePage = [];
  NRL.clearPageConfigCache();
  assert.equal(NRL.buildPageConfig('anything').characterData, true);
});

// ── Приоритеты словарей ─────────────────────────────────────────────────

test('словарь страницы перекрывает универсальный', () => {
  NRL.loadDictionary({
    ...DICTIONARY,
    pageDictionaries: {
      'mods/files': { static: { Home: 'Домой (вкладка файлов)' } }
    }
  });
  NRL.buildPageConfig('mods/files');

  const config = NRL.buildPageConfig('mods/files');
  assert.equal(config.staticDict.Home, 'Домой (вкладка файлов)');
  // На другой странице остаётся универсальный перевод
  assert.equal(NRL.buildPageConfig('mods/listing').staticDict.Home, DICTIONARY.main.Home);
});

test('регулярки страницы доступны только своей странице', () => {
  NRL.loadDictionary({
    ...DICTIONARY,
    pageDictionaries: {
      'mods/files': { regexp: [[/^File (\d+)$/, 'Файл №$1']] }
    }
  });
  assert.equal(NRL.buildPageConfig('mods/files').regexpRules.length, 1);
  assert.equal(NRL.buildPageConfig('mods/listing').regexpRules.length, 0);
});

test('контекстное правило перекрывает словарь страницы', () => {
  const asHeading = { matches: selector => selector === 'h2' };
  assert.equal(NRL.lookup('Mods', asHeading), 'Моды');
});
