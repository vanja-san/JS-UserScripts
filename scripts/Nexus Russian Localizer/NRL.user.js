// ==UserScript==
// @name            Nexus Russian Localizer
// @name:ru         Nexus Russian Localizer
// @namespace       http://tampermonkey.net/
// @description     Add Russian localization for Nexus Mods.
// @description:ru  Добавляет русскую локализацию для сайта Nexus Mods.
// @version         3.1.0-20261018-1608
// @author          vanja-san
// @match           https://*.nexusmods.com/*
// @run-at          document-start
// @noframes
// @icon            https://www.google.com/s2/favicons?sz=64&domain=nexusmods.com
// @downloadURL     https://vanja-san.github.io/JS-UserScripts/scripts/Nexus%20Russian%20Localizer/NRL.user.js
// @updateURL       https://vanja-san.github.io/JS-UserScripts/scripts/Nexus%20Russian%20Localizer/NRL.user.js
// @require         https://vanja-san.github.io/JS-UserScripts/scripts/Nexus%20Russian%20Localizer/translations.js?v=3.1.0-20261018-1608
// @require         https://vanja-san.github.io/JS-UserScripts/scripts/Nexus%20Russian%20Localizer/modules/core.js?v=3.1.0-20261018-1608
// @grant           GM_registerMenuCommand
// @grant           GM_unregisterMenuCommand
// @grant           GM_getValue
// @grant           GM_setValue
// @grant           GM_deleteValue
// @license         MIT
// ==/UserScript==

(function () {
  'use strict';

  // ── Хранилище настроек ────────────────────────────────────────────────
  // Дублирует NRL.Storage намеренно: включение/выключение должно работать
  // даже если ядро не загрузилось. Потеря настройки здесь недопустима.

  const has = name => typeof GM !== 'undefined' && typeof GM[name] === 'function';

  const store = {
    get(key) {
      try {
        if (has('getValue')) {
          const v = GM_getValue(key, undefined);
          if (v !== undefined) return v;
        }
      } catch { /* нет доступа */ }
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    set(key, value) {
      let ok = false;
      if (has('setValue')) {
        try { GM_setValue(key, value); ok = true; } catch { ok = false; }
      }
      try { localStorage.setItem(key, value); } catch { /* приватный режим */ }
      return ok || this.get(key) === value;
    }
  };

  const ENABLED_KEY = 'NRL_ENABLED';
  const ENABLE_HASH = '#nrl-enable';
  const PENDING_CLASS = 'nrl-pending';
  const STYLE_ID = 'nrl-fouc-style';
  const FOUC_FAILSAFE_MS = 3000;
  const EMERGENCY_SHORTCUT = 'Alt+Shift+N';

  const api = () => window.NRL;

  // ── Включение / выключение ────────────────────────────────────────────

  function isEnabled() {
    const value = store.get(ENABLED_KEY);
    if (value === null || value === undefined) return true;
    return value !== 'false' && value !== false;
  }

  /**
   * Переключение без перезагрузки страницы: движок умеет вернуть
   * английский оригинал и включиться обратно. Если что-то пошло не так —
   * откатываемся на перезагрузку.
   */
  function toggle() {
    const next = !isEnabled();

    if (!store.set(ENABLED_KEY, String(next))) {
      alert('[NRL] Не удалось сохранить настройку.\n'
        + 'Хранилище скриптов недоступно — настройка не сохранится.\n\n'
        + `Аварийное включение: добавьте ${ENABLE_HASH} к адресу страницы `
        + `или нажмите ${EMERGENCY_SHORTCUT}.`);
      return;
    }

    // Проверяем, что значение действительно зафиксировалось.
    if (isEnabled() !== next) {
      alert('[NRL] Настройка не сохранилась — переключение не сработает.\n'
        + `Аварийное включение: ${ENABLE_HASH} в адресе или ${EMERGENCY_SHORTCUT}.`);
      return;
    }

    const nrl = api();
    if (nrl) {
      try {
        if (next) nrl.enable();
        else nrl.restoreAll();
      } catch (error) {
        console.error('[NRL] Не удалось применить переключение, перезагружаю:', error);
        location.reload();
      }
    }
    console.log(`[NRL] Перевод ${next ? 'включён' : 'выключен'}.`);
  }

  function enableForce() {
    if (store.set(ENABLED_KEY, 'true') && isEnabled()) location.reload();
  }

  // ── Аварийные пути включения ──────────────────────────────────────────
  // Скрипт не должен уметь запереть пользователя в выключенном состоянии.

  function installEmergencyEnable() {
    if (location.hash === ENABLE_HASH) {
      store.set(ENABLED_KEY, 'true');
      history.replaceState(history.state, '', location.href.replace(ENABLE_HASH, ''));
    }

    document.addEventListener('keydown', (event) => {
      const matches = event.altKey && event.shiftKey &&
        (event.key === 'N' || event.key === 'н' || event.code === 'KeyN');
      if (matches) {
        event.preventDefault();
        if (!isEnabled()) enableForce();
        else console.log('[NRL] Перевод уже включён.');
      }
    }, true);
  }

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
      // Регистрируется первым и всегда: это единственный способ
      // включить скрипт обратно, если он выключен.
      GM_registerMenuCommand('NRL: Включить / выключить перевод', toggle);
    } catch (error) {
      console.error('[NRL] Не удалось зарегистрировать меню:', error);
    }

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
    // раньше, чем появится document.body.
    nrl.installRouter();

    if (!isEnabled()) {
      console.log('[NRL] Перевод выключен. Включить: меню скрипта, '
        + `${EMERGENCY_SHORTCUT} или ${ENABLE_HASH} в адресе.`);
      return;
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

  installEmergencyEnable();
  registerMenu();
  boot();
})();
