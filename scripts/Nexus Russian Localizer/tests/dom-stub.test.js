/**
 * Тесты обхода DOM и MutationObserver без браузера.
 *
 * Минимальный DOM-стаб достаточен для реального прогона движка: обход дерева,
 * фильтр игнора, перевод узлов и обработка мутаций. Так ловятся ошибки
 * вроде потери this у приватных методов — в браузере они выглядят как
 * молчаливо неработающий наблюдатель.
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

// ═══════════════════════════════════════════════════════════════════════
//  Минимальный DOM
// ═══════════════════════════════════════════════════════════════════════

const ELEMENT_NODE = 1, TEXT_NODE = 3;
globalThis.Node = { ELEMENT_NODE, TEXT_NODE };
globalThis.NodeFilter = { SHOW_ELEMENT: 1, SHOW_TEXT: 4, FILTER_ACCEPT: 1, FILTER_REJECT: 2 };

class MiniClassList {
  constructor(element) { this.element = element; }
  get length() { return this.element.classes.size; }
  contains(name) { return this.element.classes.has(name); }
  [Symbol.iterator]() { return this.element.classes[Symbol.iterator](); }
}

class MiniNode {
  constructor(nodeType) {
    this.nodeType = nodeType;
    this.childNodes = [];
    this.parentNode = null;
  }
  get parentElement() {
    return this.parentNode && this.parentNode.nodeType === ELEMENT_NODE ? this.parentNode : null;
  }
  get textContent() { return this.childNodes.map(c => c.textContent).join(''); }
  appendChild(child) {
    child.parentNode = this;
    this.childNodes.push(child);
    return child;
  }
}

class MiniText extends MiniNode {
  constructor(data) { super(TEXT_NODE); this.data = data; }
  get textContent() { return this.data; }
}

class MiniElement extends MiniNode {
  constructor(tagName, classNames = []) {
    super(ELEMENT_NODE);
    this.tagName = String(tagName).toUpperCase();
    this.classes = new Set(classNames);
    this.classList = new MiniClassList(this);
    this.attrs = new Map();
    this.shadowRoot = null;
  }
  getAttribute(name) { return this.attrs.has(name) ? this.attrs.get(name) : null; }
  setAttribute(name, value) { this.attrs.set(name, String(value)); }

  /** Поддерживает 'tag', '.class', '#id' и 'tag.a.b' — этого хватает для игнор-селекторов. */
  matches(selector) {
    return String(selector).split(',').some(part => {
      const token = part.trim();
      if (!token) return false;
      const [tag, ...rest] = token.split('.');
      if (tag && tag !== '*' && tag.toUpperCase() !== this.tagName) return false;
      return rest.every(cls => this.classes.has(cls));
    });
  }

  closest(selector) {
    let node = this;
    while (node && node.nodeType === ELEMENT_NODE) {
      if (node.matches(selector)) return node;
      node = node.parentElement;
    }
    return null;
  }
}

function walkTree(root, whatToShow, filter, out) {
  for (const child of root.childNodes) {
    if (filter && filter.acceptNode(child) === NodeFilter.FILTER_REJECT) continue;
    if (whatToShow & (child.nodeType === ELEMENT_NODE ? NodeFilter.SHOW_ELEMENT : NodeFilter.SHOW_TEXT)) {
      out.push(child);
    }
    if (child.nodeType === ELEMENT_NODE) walkTree(child, whatToShow, filter, out);
  }
}

globalThis.document = {
  querySelector: () => null,
  createElement: tag => new MiniElement(tag),
  createTreeWalker(root, whatToShow, filter) {
    const all = [];
    walkTree(root, whatToShow, filter, all);
    let i = 0;
    return { nextNode: () => (i < all.length ? all[i++] : null) };
  }
};

let observerRef = null;
globalThis.MutationObserver = class {
  constructor(callback) { this.callback = callback; observerRef = this; }
  observe() {}
  disconnect() {}
};

globalThis.requestIdleCallback = callback => setTimeout(callback, 0);

// ═══════════════════════════════════════════════════════════════════════
//  Окружение
// ═══════════════════════════════════════════════════════════════════════

globalThis.window = globalThis;
const memory = new Map();
globalThis.localStorage = {
  getItem: key => (memory.has(key) ? memory.get(key) : null),
  setItem: (key, value) => memory.set(key, String(value)),
  removeItem: key => memory.delete(key)
};
globalThis.sessionStorage = globalThis.localStorage;
globalThis.location = { href: 'https://www.nexusmods.com/mods', pathname: '/mods', search: '', hash: '' };
globalThis.history = { pushState() {}, replaceState() {} };
globalThis.addEventListener = () => {};

require(path.join(ROOT, 'translations.js'));
require(path.join(ROOT, 'modules', 'core.js'));

const NRL = globalThis.NRL;
NRL.loadDictionary(globalThis.NRL_TRANSLATIONS);
NRL.buildRules();

const settle = () => new Promise(resolve => setTimeout(resolve, 90));

function makeBody() {
  const body = new MiniElement('body');
  const nav = new MiniElement('nav');
  const link = new MiniElement('a');
  link.appendChild(new MiniText('Home'));
  nav.appendChild(link);
  body.appendChild(nav);
  return { body, nav, link };
}

// ═══════════════════════════════════════════════════════════════════════
//  safe()
//
//  Регрессия: обёртка отдавала приватный метод без receiver, и this
//  становился undefined. Наблюдатель молча переставал работать.
// ═══════════════════════════════════════════════════════════════════════

// Образец того, что ломается при отрыве метода от объекта.
class SecretHolder {
  #secret = 42;
  read() { return this.#secret; }
  boom() { throw new Error('boom'); }
}

test('safe передаёт receiver приватному методу', () => {
  const holder = new SecretHolder();
  const guarded = NRL.safe(holder, holder.read, 'read');
  assert.equal(guarded(), 42, 'receiver должен дойти до метода');
});

test('safe гасит исключение и возвращает undefined', () => {
  const holder = new SecretHolder();
  const guarded = NRL.safe(holder, holder.boom, 'boom');
  assert.equal(guarded(), undefined);
});

test('без receiver приватный метод падает — это и есть исходный баг', () => {
  const holder = new SecretHolder();
  const detached = holder.read;
  assert.throws(() => detached(), 'отрыв приватного метода обязан ломаться');
});

// ═══════════════════════════════════════════════════════════════════════
//  Обход дерева
// ═══════════════════════════════════════════════════════════════════════

test('первичный обход переводит текст и атрибуты', async () => {
  const { body, link } = makeBody();
  link.setAttribute('title', 'Download');

  const translator = new NRL.Translator();
  await translator.translateTree(body);

  assert.equal(link.childNodes[0].data, 'Главная');
  // В словаре у Download есть хвостовой пробел, поэтому сверяем без него.
  assert.equal(link.getAttribute('title').trim(), 'Скачать');
});

test('игнорируемый класс не переводится', async () => {
  const { body } = makeBody();
  const hidden = new MiniElement('span', ['no-translate']);
  hidden.appendChild(new MiniText('Home'));
  body.appendChild(hidden);

  const translator = new NRL.Translator();
  await translator.translateTree(body);

  assert.equal(hidden.childNodes[0].data, 'Home');
});

test('sr-only переводится несмотря на игнор', async () => {
  const { body } = makeBody();
  const sr = new MiniElement('p', ['sr-only']);
  sr.appendChild(new MiniText('Premium Member'));
  body.appendChild(sr);

  const translator = new NRL.Translator();
  await translator.translateTree(body);

  assert.notEqual(sr.childNodes[0].data, 'Premium Member');
});

test('откат возвращает исходный текст и атрибут', async () => {
  const { body, link } = makeBody();
  link.setAttribute('title', 'Download');

  const translator = new NRL.Translator();
  await translator.translateTree(body);
  translator.restoreTree(body);

  assert.equal(link.childNodes[0].data, 'Home');
  assert.equal(link.getAttribute('title'), 'Download');
});

// ═══════════════════════════════════════════════════════════════════════
//  MutationObserver — то, что молча сломалось
// ═══════════════════════════════════════════════════════════════════════

test('childList: добавленный текстовый узел переводится', async () => {
  const { body, nav } = makeBody();
  const translator = new NRL.Translator();
  await translator.translateTree(body);
  translator.observe(body);

  const added = new MiniText('Register');
  nav.appendChild(added);
  observerRef.callback([{ type: 'childList', target: nav, addedNodes: [added] }], observerRef);
  await settle();

  assert.equal(added.data, 'Регистрация');
});

test('characterData: изменение существующего узла переводится', async () => {
  const { body, link } = makeBody();
  const translator = new NRL.Translator();
  await translator.translateTree(body);
  translator.observe(body);

  const node = link.childNodes[0];
  node.data = 'Support';
  observerRef.callback([{ type: 'characterData', target: node }], observerRef);
  await settle();

  assert.equal(node.data, 'Поддержка');
});

test('attributes: изменение title переводится', async () => {
  const { body, link } = makeBody();
  const translator = new NRL.Translator();
  await translator.translateTree(body);
  translator.observe(body);

  link.setAttribute('title', 'Home');
  observerRef.callback([
    { type: 'attributes', target: link, attributeName: 'title' }
  ], observerRef);
  await settle();

  assert.equal(link.getAttribute('title'), 'Главная');
});

test('мутация внутри игнорируемого элемента пропускается', async () => {
  const { body } = makeBody();
  // mod_description_container — реальный класс текста пользователя,
  // проверен на /skyrim/mods/1234
  const modName = new MiniElement('span', ['mod_description_container']);
  const text = new MiniText('Home');
  modName.appendChild(text);
  body.appendChild(modName);

  const translator = new NRL.Translator();
  await translator.translateTree(body);
  translator.observe(body);

  text.data = 'Register';
  observerRef.callback([{ type: 'characterData', target: text }], observerRef);
  await settle();

  assert.equal(text.data, 'Register', 'игнорируемая ветка не должна переводиться');
});

test('мутации с неизвестным типом не ломают обработку', async () => {
  const { body } = makeBody();
  const translator = new NRL.Translator();
  await translator.translateTree(body);
  translator.observe(body);

  assert.doesNotThrow(() => {
    observerRef.callback([{ type: 'что-то', target: body }], observerRef);
  });
  await settle();
});

test('пачка мутаций обрабатывается целиком', async () => {
  const { body, nav, link } = makeBody();
  const translator = new NRL.Translator();
  await translator.translateTree(body);
  translator.observe(body);

  const first = new MiniText('Games');
  const second = new MiniText('Community');
  nav.appendChild(first);
  nav.appendChild(second);
  link.setAttribute('title', 'Home');

  observerRef.callback([
    { type: 'childList', target: nav, addedNodes: [first] },
    { type: 'childList', target: nav, addedNodes: [second] },
    { type: 'attributes', target: link, attributeName: 'title' }
  ], observerRef);
  await settle();

  assert.equal(first.data, 'Игры');
  assert.equal(second.data, 'Сообщество');
  assert.equal(link.getAttribute('title'), 'Главная');
});

test('отсоединённый узел не роняет обработку', async () => {
  const { body } = makeBody();
  const translator = new NRL.Translator();
  await translator.translateTree(body);
  translator.observe(body);

  const orphan = new MiniText('Home');
  assert.doesNotThrow(() => {
    observerRef.callback([
      { type: 'childList', target: body, addedNodes: [orphan] },
      { type: 'attributes', target: new MiniElement('a'), attributeName: 'title' }
    ], observerRef);
  });
  await settle();
});

test('свой перевод не вызывает повторной правки', async () => {
  const { body, link } = makeBody();
  const translator = new NRL.Translator();
  await translator.translateTree(body);
  translator.observe(body);

  const node = link.childNodes[0];
  const before = translator.stats.text;
  observerRef.callback([{ type: 'characterData', target: node }], observerRef);
  await settle();

  assert.equal(translator.stats.text, before, 'повторно переводить нечего');
});

// ── Реальная разметка Nexus ──────────────────────────────────────────────
// Формат проверен по клиентскому коду timeAgo() на странице мода:
//   function timeAgo(t){ ... r = o + " minute" + (o !== 1 ? "s" : "") }
//   <span>${timeAgo(updatedAt)} ago</span>

test('относительное время переводится в разметке уведомлений', async () => {
  const { body } = makeBody();

  // Разметка как в .notification-wrapper на nexusmods.com
  const wrapper = new MiniElement('li', ['notification-wrapper']);
  const notification = new MiniElement('div', ['notification']);
  const anchor = new MiniElement('a', ['notification-link']);
  const content = new MiniElement('div', ['notification-content']);
  const date = new MiniElement('div', ['notification-date']);

  const time = new MiniElement('span');
  time.appendChild(new MiniText('5 minutes ago'));

  date.appendChild(time);
  content.appendChild(date);
  anchor.appendChild(content);
  notification.appendChild(anchor);
  wrapper.appendChild(notification);
  body.appendChild(wrapper);

  const translator = new NRL.Translator();
  await translator.translateTree(body);

  assert.equal(time.childNodes[0].data, '5 минут назад');
});

test('относительное время переводится при мутации characterData', async () => {
  const { body } = makeBody();
  const date = new MiniElement('div', ['notification-date']);
  const time = new MiniElement('span');
  const node = new MiniText('2 hours ago');
  time.appendChild(node);
  date.appendChild(time);
  body.appendChild(date);

  const translator = new NRL.Translator();
  await translator.translateTree(body);
  translator.observe(body);

  observerRef.callback([{ type: 'characterData', target: node }], observerRef);
  await settle();

  assert.equal(node.data, '2 часа назад');
});

test('форматы timeAgo со страницы мода переводятся все', async () => {
  // Набор строк, которые реально выдаёт клиентский timeAgo().
  const cases = [
    ['1 minute ago', '1 минуту назад'],
    ['5 minutes ago', '5 минут назад'],
    ['21 minutes ago', '21 минуту назад'],
    ['1 hour ago', '1 час назад'],
    ['2 hours ago', '2 часа назад'],
    ['3 days ago', '3 дня назад'],
    ['1 week ago', '1 неделю назад'],
    ['2 months ago', '2 месяца назад'],
    ['1 year ago', '1 год назад']
  ];
  for (const [source, expected] of cases) {
    assert.equal(NRL.applyTextRules(source), expected, source);
  }
});

test('уведомление, вставленное скриптом сайта, переводится', async () => {
  // Уведомления рендерит клиентский JS после загрузки страницы:
  // <li class='notification-wrapper ...'><span>${timeAgo(updatedAt)} ago</span>
  // То есть узел появляется через childList, а не в исходном HTML.
  const { body } = makeBody();
  const translator = new NRL.Translator();
  await translator.translateTree(body);
  translator.observe(body);

  const wrapper = new MiniElement('li', ['notification-wrapper', 'notification-unread']);
  const notification = new MiniElement('div', ['notification']);
  const anchor = new MiniElement('a', ['notification-link']);
  const content = new MiniElement('div', ['notification-content']);
  const date = new MiniElement('div', ['notification-date']);
  const time = new MiniElement('span');
  const node = new MiniText('5 minutes ago');
  time.appendChild(node);
  date.appendChild(time);
  content.appendChild(date);
  anchor.appendChild(content);
  notification.appendChild(anchor);
  wrapper.appendChild(notification);

  const host = new MiniElement('ul', ['notification-list']);
  host.appendChild(wrapper);
  body.appendChild(host);

  observerRef.callback([{ type: 'childList', target: host, addedNodes: [wrapper] }], observerRef);
  await settle();

  assert.equal(node.data, '5 минут назад');
});

// ── Описания модов ──────────────────────────────────────────────────────
// Пользовательский текст не должен переводиться: внутри предложения есть
// даты и размеры, на которые срабатывают текстовые правила.

test('описание мода не переводится', async () => {
  const { body } = makeBody();
  // Реальная разметка со /skyrim/mods/1234:
  //   <div class="container mod_description_container condensed">
  const description = new MiniElement('div', ['container', 'mod_description_container', 'condensed']);
  description.appendChild(new MiniText('Released 12 Jan 2024, updated 3 months ago'));
  body.appendChild(description);

  const translator = new NRL.Translator();
  await translator.translateTree(body);

  assert.equal(
    description.childNodes[0].data,
    'Released 12 Jan 2024, updated 3 months ago',
    'текст правила бы изменился, если бы не игнорировался'
  );
});

test('описание мода не переводится при вставке в DOM', async () => {
  // Описание часто приходит AJAX-вкладкой уже после загрузки страницы.
  const { body } = makeBody();
  const translator = new NRL.Translator();
  await translator.translateTree(body);
  translator.observe(body);

  const description = new MiniElement('div', ['container', 'mod_description_container', 'condensed']);
  const node = new MiniText('Added 5 Jan 2020, requires 4 GB');
  description.appendChild(node);

  const target = new MiniElement('div', ['tabs']);
  target.appendChild(description);
  body.appendChild(target);

  observerRef.callback([{ type: 'childList', target, addedNodes: [description] }], observerRef);
  await settle();

  assert.equal(node.data, 'Added 5 Jan 2020, requires 4 GB');
});

test('правила действительно ломают описание без игнора', () => {
  // Контрольный тест: если он не сработал, проверка игнора выше ничего не значит.
  assert.equal(
    NRL.applyTextRules('Released 12 Jan 2024, updated 3 months ago'),
    'Released 12 янв 2024, updated 3 месяца назад'
  );
});

test('служебные тексты Nexus переводятся, а не игнорируются', () => {
  // permissions-desc встречается 7 раз на реальной странице мода и содержит
  // служебный текст («Some assets in this file belong to other authors…»).
  // Это интерфейс сайта, значит переводится, а не игнорируется.
  assert.equal(NRL.CONFIG.IGNORED_SELECTORS.includes('.permissions-desc'), false);
});

test('игнор-лист не содержит классов, которых нет на сайте', () => {
  // Каждый селектор обязан встречаться в разметке nexusmods.com.
  // Источник истины — сохранённые страницы, а не память.
  const verified = new Set(['.mod_description_container', 'i']);
  for (const selector of NRL.CONFIG.IGNORED_SELECTORS) {
    assert.equal(verified.has(selector), true, `непроверенный селектор: ${selector}`);
  }
});
