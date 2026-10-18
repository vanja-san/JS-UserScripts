// ==UserScript==
// @name            Nexus Russian Localizer
// @name:ru         Nexus Russian Localizer
// @namespace       http://tampermonkey.net/
// @description     Add Russian localization for Nexus Mods.
// @description:ru  Добавляет русскую локализацию для сайта Nexus Mods.
// @version         3.0.0
// @author          vanja-san
// @match           https://*.nexusmods.com/*
// @run-at          document-start
// @noframes
// @icon            https://www.google.com/s2/favicons?sz=64&domain=nexusmods.com
// @downloadURL     https://vanja-san.github.io/JS-UserScripts/scripts/Nexus%20Russian%20Localizer/NRL.user.js
// @updateURL       https://vanja-san.github.io/JS-UserScripts/scripts/Nexus%20Russian%20Localizer/NRL.user.js
// @require         https://vanja-san.github.io/JS-UserScripts/scripts/Nexus%20Russian%20Localizer/translations.js
// @require         https://vanja-san.github.io/JS-UserScripts/scripts/Nexus%20Russian%20Localizer/modules/core.js
// @grant           GM_registerMenuCommand
// @license         MIT
// ==/UserScript==

(function () {
  'use strict';

  const ENABLED_KEY = 'NRL_ENABLED';
  const PENDING_CLASS = 'nrl-pending';
  const STYLE_ID = 'nrl-fouc-style';
  const FOUC_FAILSAFE_MS = 3000;

  function readEnabled() {
    try { return localStorage.getItem(ENABLED_KEY) !== 'false'; } catch { return true; }
  }

  function writeEnabled(value) {
    try { localStorage.setItem(ENABLED_KEY, String(value)); } catch { /* приватный режим */ }
  }

  /**
   * Прячем страницу до первого перевода, иначе пользователь видит
   * английский текст, который тут же сменится русским.
   */
  function hidePage() {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `html.${PENDING_CLASS} body{visibility:hidden!important}`;
    (document.head || document.documentElement).appendChild(style);
    document.documentElement.classList.add(PENDING_CLASS);
  }

  function revealPage() {
    document.documentElement.classList.remove(PENDING_CLASS);
    document.getElementById(STYLE_ID)?.remove();
  }

  function whenDomReady() {
    if (document.readyState !== 'loading') return Promise.resolve();
    return new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve, { once: true }));
  }

  async function boot() {
    if (!window.NRL) {
      console.warn('[NRL] Ядро не загрузилось — проверьте @require в менеджере скриптов.');
      return;
    }

    // Хуки навигации ставятся сразу: Next.js может вызвать pushState
    // раньше, чем появится document.body.
    window.NRL.installRouter();

    if (!readEnabled()) {
      window.NRL.debug.log('Скрипт выключен через меню.');
      return;
    }

    hidePage();
    const failsafe = setTimeout(revealPage, FOUC_FAILSAFE_MS);

    try {
      await whenDomReady();
      await window.NRL.start();
    } catch (error) {
      console.error('[NRL] Ошибка инициализации:', error);
    } finally {
      clearTimeout(failsafe);
      revealPage();
    }
  }

  // ── Меню Tampermonkey / Violentmonkey ─────────────────────────────────

  function registerMenu() {
    if (typeof GM_registerMenuCommand !== 'function') return;

    GM_registerMenuCommand('NRL: Включить / выключить', () => {
      const next = !readEnabled();
      writeEnabled(next);
      window.NRL?.debug.log('Скрипт', next ? 'включён' : 'выключен', '- перезагрузка страницы.');
      location.reload();
    });

    GM_registerMenuCommand('NRL: Перевести страницу заново', () => {
      if (!window.NRL) return;
      window.NRL.translator?.disconnect();
      window.NRL.translateAll('menu').finally(() => window.NRL.translator?.observe(document.body));
    });

    GM_registerMenuCommand('NRL: Статистика перевода', () => window.NRL?.report());

    GM_registerMenuCommand('NRL: Включить отладку', () => window.NRL?.debug.enable());
    GM_registerMenuCommand('NRL: Выключить отладку', () => window.NRL?.debug.disable());
  }

  registerMenu();
  boot();
})();
