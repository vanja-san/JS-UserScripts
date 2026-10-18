// ==UserScript==
// @name            Nexus Russian Localizer
// @name:ru         Nexus Russian Localizer
// @namespace       http://tampermonkey.net/
// @description     Add Russian localization for Nexus Mods.
// @description:ru  Добавляет русскую локализацию для сайта Nexus Mods.
// @version         3.1.0-20261018-1704
// @author          vanja-san
// @match           https://*.nexusmods.com/*
// @run-at          document-start
// @noframes
// @icon            https://www.google.com/s2/favicons?sz=64&domain=nexusmods.com
// @downloadURL     https://vanja-san.github.io/JS-UserScripts/scripts/Nexus%20Russian%20Localizer/NRL.user.js
// @updateURL       https://vanja-san.github.io/JS-UserScripts/scripts/Nexus%20Russian%20Localizer/NRL.user.js
// @require         https://vanja-san.github.io/JS-UserScripts/scripts/Nexus%20Russian%20Localizer/translations.js?v=3.1.0-20261018-1704
// @require         https://vanja-san.github.io/JS-UserScripts/scripts/Nexus%20Russian%20Localizer/modules/core.js?v=3.1.0-20261018-1704
// @grant           GM_registerMenuCommand
// @grant           GM_unregisterMenuCommand
// @grant           GM_getValue
// @grant           GM_setValue
// @grant           GM_deleteValue
// @license         MIT
// ==/UserScript==

(function () {
  'use strict';

  // Включение и выключение скрипта делает сам менеджер скриптов,
  // поэтому своей настройки состояния здесь нет.

  const PENDING_CLASS = 'nrl-pending';
  const STYLE_ID = 'nrl-fouc-style';
  const FOUC_FAILSAFE_MS = 3000;

  const api = () => window.NRL;

  // ── FOUC ──────────────────────────────────────────────────────────────

  function hidePage() {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `html.${PENDING_CLASS} body{visibility:hidden!important}`;
    (document.head || document.documentElement).appendChild(style);
    document.documentElement.classList.add(PENDING_CLASS);
  }

  function revealPage() {
    document.documentElement.classList.remove(PENDING_CLASS);
    const style = document.getElementById(STYLE_ID);
    if (style) style.remove();
  }

  function whenDomReady() {
    if (document.readyState !== 'loading') return Promise.resolve();
    return new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve, { once: true }));
  }

  // ── Меню ──────────────────────────────────────────────────────────────

  const dynamicMenus = [];

  function refreshDynamicMenus() {
    while (dynamicMenus.length) {
      const id = dynamicMenus.pop();
      try { GM_unregisterMenuCommand(id); } catch { /* менеджер без поддержки */ }
    }

    const nrl = api();
    if (!nrl) return;
    const add = (label, handler) => {
      try { dynamicMenus.push(GM_registerMenuCommand(label, handler)); } catch { /* игнорируем */ }
    };

    const missed = nrl.Missed;
    const enabled = nrl.dict.missedTerms.enabled;
    add(`NRL: ${enabled ? 'Отключить' : 'Включить'} учёт непереведённых`, () => {
      const next = !enabled;
      nrl.setMissedTerms(next);
      console.log('[NRL] Учёт непереведённых', next ? 'включён' : 'выключен');
      refreshDynamicMenus();
    });

    if (!enabled) return;
    const stats = missed.stats();
    if (!stats.terms) return;

    add(`NRL: Экспорт непереведённых (${stats.terms})`, () => missed.exportFile());
    add(`NRL: Очистить непереведённые`, () => {
      if (!confirm(`Удалить ${stats.terms} записей?`)) return;
      missed.clearAll();
      refreshDynamicMenus();
    });
  }

  function registerMenu() {
    if (typeof GM_registerMenuCommand !== 'function') return;

    try {
      GM_registerMenuCommand('NRL: Перевести страницу заново', () => {
        const nrl = api();
        if (!nrl) return;
        nrl.translateAll('menu');
      });
      GM_registerMenuCommand('NRL: Вернуть английский оригинал', () => api()?.restoreAll());
      GM_registerMenuCommand('NRL: Статистика перевода', () => api()?.report());
      GM_registerMenuCommand('NRL: Включить отладку', () => api()?.debug.enable());
      GM_registerMenuCommand('NRL: Выключить отладку', () => api()?.debug.disable());
      refreshDynamicMenus();
    } catch (error) {
      console.error('[NRL] Ошибка регистрации меню:', error);
    }
  }

  // ── Запуск ────────────────────────────────────────────────────────────

  async function boot() {
    const nrl = api();
    if (!nrl) {
      console.error('[NRL] Ядро (modules/core.js) не загрузилось — скрипт не работает.\n'
        + 'Проверьте @require в настройках скрипта и обновите страницу.');
      return;
    }

    // Хуки навигации ставятся сразу: Next.js может вызвать pushState
    // раньше, чем появится document.body. Отсутствие метода не должно
    // мешать переводу — поэтому вызываем через try/catch.
    try {
      nrl.installRouter?.();
    } catch (error) {
      console.error('[NRL] Не удалось установить хуки навигации:', error);
    }

    hidePage();
    const failsafe = setTimeout(revealPage, FOUC_FAILSAFE_MS);

    try {
      await whenDomReady();
      await nrl.start();
      refreshDynamicMenus();
    } catch (error) {
      console.error('[NRL] Ошибка инициализации:', error);
    } finally {
      clearTimeout(failsafe);
      revealPage();
    }
  }

  registerMenu();
  boot();
})();
