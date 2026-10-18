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
// Пути сверены с script/probe-routes.py — см. docs/nexus-markup.md.
// Если Nexus поменяет структуру, тесты упадут первыми.

test('регрессия: главная страница', () => {
  assert.equal(page('/'), 'home');
});

test('регрессия: разделы', () => {
  assert.equal(page('/mods'), 'mods');
  assert.equal(page('/games'), 'games');
  assert.equal(page('/collections'), 'collections');
  assert.equal(page('/media'), 'media');
  assert.equal(page('/users'), 'users');
  assert.equal(page('/users/someone'), 'users');
});

test('регрессия: игровые страницы в обоих написаниях', () => {
  assert.equal(page('/skyrim'), 'game');
  assert.equal(page('/games/skyrim'), 'game');
  assert.equal(page('/skyrim/mods'), 'game/mods');
  assert.equal(page('/games/skyrim/mods'), 'game/mods');
});

test('регрессия: страница мода отличена от списка', () => {
  assert.equal(page('/skyrim/mods/15538'), 'mod/detail');
  assert.equal(page('/mods/skyrim/15538'), 'mod/detail');
  assert.notEqual(page('/skyrim/mods/15538'), 'game/mods');
  assert.notEqual(page('/skyrim/mods/15538'), 'game');
});

test('регрессия: /mods не перехватывается правилом игры', () => {
  // Общее правило /<segment> должно стоять после /mods, иначе
  // /mods классифицировался бы как страница игры.
  assert.equal(page('/mods'), 'mods');
  assert.notEqual(page('/mods'), 'game');
  assert.equal(page('/games'), 'games');
  assert.notEqual(page('/games'), 'game');
});

test('регрессия: неизвестный путь', () => {
  assert.equal(page('/some/deep/unknown/path'), '*');
});

test('маршруты регистронезависимы', () => {
  assert.equal(page('/MODS'), 'mods');
  assert.equal(page('/Games'), 'games');
  assert.equal(page('/SKYRIM'), 'game');
});

test('закрытые Nexus маршруты никуда не ведут', () => {
  // /login, /register, /wiki, /forums отдают 404 — проверяем,
  // что мы не тратим на них время, отправляя в универсальный словарь.
  for (const path of ['/login', '/register', '/wiki', '/forums']) {
    assert.notEqual(page(path), '*', path + ' не должен попадать в универсальный словарь');
  }
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
  const config = NRL.buildPageConfig('mods');
  assert.equal(typeof config.ignoreSelector, 'string');
  // Глобальные игноры берутся из реальной разметки Nexus
  assert.ok(config.ignoreSelector.includes('prose-lexical'), 'глобальные игноры должны попасть в строку');
  assert.ok(config.ignoreSelector.includes('mod-header__title'));
  // Игноры страницы добавляются поверх
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
