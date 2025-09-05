// ==UserScript==
// @name            Booru Tags Hauler
// @name:ru         Booru Tags Hauler
// @namespace       https://github.com/vanja-san/JS-UserScripts/main/scripts/Booru%20Tags%20Hauler
// @version         1.1.6
// @description     Adds a 'Copy all tags' button to the thumbnail hover preview tooltip. Copy all of a tooltip tags instantly!
// @description:ru  Добавляет кнопку 'Скопировать все теги' во всплывающую подсказку при наведении на превью. Копируйте все теги картинки, не открывая её страницу! Существенная экономия времени.
// @author          vanja-san
// @license         MIT
// @match           https://danbooru.donmai.us/*
// @match           https://safebooru.donmai.us/*
// @match           https://hijiribe.donmai.us/*
// @icon            https://www.google.com/s2/favicons?sz=64&domain=donmai.us
// @downloadURL     https://raw.githubusercontent.com/vanja-san/JS-UserScripts/main/scripts/Booru%20Tags%20Hauler/Booru_Tags_Hauler.user.js
// @updateURL       https://raw.githubusercontent.com/vanja-san/JS-UserScripts/main/scripts/Booru%20Tags%20Hauler/Booru_Tags_Hauler.user.js
// @grant           GM_addStyle
// @grant           GM_registerMenuCommand
// @grant           GM_getValue
// @grant           GM_setValue
// ==/UserScript==

(function () {
  "use strict";

  // ===== MODERN LOCALIZATION SYSTEM =====
  const localization = {
    en: {
      title: "Copy all tags",
      notification: "Tags copied to clipboard!",
      settings: "Settings",
      formatting: "Tag Formatting",
      addCommas: "Add commas between tags",
      escapeParentheses: "Escape parentheses (\\( \\))",
      replaceUnderscores: "Replace Underscores",
      appearance: "Button Appearance",
      
      positionLeft: "Left",
      positionCenter: "Center",
      positionRight: "Right",
      languageSettings: "Language Settings",
      language: "Language:",
      langAuto: "System default",
      langEn: "English",
      langRu: "Russian",
      buttonStyle: "Button style:",
      styleIconOnly: "Icon only",
      styleIconAndText: "Icon and text",
      styleTextOnly: "Text only",
      buttonText: "Copy tags",
      saveButton: "Save",
      savedButton: "Saved!",
      cancelButton: "Close",
      savedNotification: "Settings saved!",
      reloadNotice: "PLEASE NOTE: Page reload required for language change",
    },
    ru: {
      title: "Скопировать все теги",
      notification: "Теги скопированы в буфер!",
      settings: "Настройки",
      formatting: "Форматирование тегов",
      addCommas: "Добавлять запятые между тегами",
      escapeParentheses: "Экранировать скобки (\\( \\))",
      replaceUnderscores: "Заменять нижнии подчеркивания пробелами",
      appearance: "Внешний вид кнопки",
      
      positionLeft: "Слева",
      positionCenter: "По центру",
      positionRight: "Справа",
      languageSettings: "Настройки языка",
      language: "Язык:",
      langAuto: "Как в системе",
      langEn: "Английский",
      langRu: "Русский",
      buttonStyle: "Стиль кнопки:",
      styleIconOnly: "Только иконка",
      styleIconAndText: "Иконка и текст",
      styleTextOnly: "Только текст",
      buttonText: "Скопировать теги",
      saveButton: "Сохранить",
      savedButton: "Сохранено!",
      cancelButton: "Закрыть",
      savedNotification: "Настройки сохранены!",
      reloadNotice: "ВНИМАНИЕ: Для смены языка требуется перезагрузка страницы",
    }
  };

  // ===== CORE SETTINGS =====
  const DEFAULT_SETTINGS = {
    addCommas: true,
    escapeParentheses: true,
    replaceUnderscores: true,
    language: "auto",
    buttonStyle: "icon-only"
  };

  const SETTINGS = {
    ...DEFAULT_SETTINGS,
    ...GM_getValue("tagCopierSettings", {}),
  };

  // ===== DYNAMIC LANGUAGE MANAGEMENT =====
  let currentLang = "en";

  function updateLanguage() {
    if (SETTINGS.language === "auto") {
      const systemLang = navigator.language.toLowerCase();
      currentLang = systemLang.startsWith("ru") ? "ru" : "en";
    } else {
      currentLang = SETTINGS.language;
    }
    return currentLang;
  }

  function t(key) {
    const lang = updateLanguage();
    return localization[lang]?.[key] || localization.en[key] || key;
  }

  // Initialize language
  updateLanguage();

  // ===== STYLE MANAGEMENT =====
  let styleElement = null;

  function applyGlobalStyles() {
    const css = `
      .tippy-box[data-theme~="post-tooltip"] .tippy-content .post-tooltip-body {
        max-height: 80px;
      }
      .tag-copy-btn {
        position: absolute;
        display: flex;
        background: unset !important;
        color: var(--muted-text-color);
        align-items: center;
        justify-content: center;
        cursor: pointer;
        z-index: 1000;
        border: none !important;
        transition: all 0.3s;
        border-radius: 4px;
        padding: 0;
        width: 28px;
        height: 28px;
        box-shadow: unset !important;
        gap: .2rem;
        bottom: 5px;
        right: 5px;
      }

      .tag-copy-btn.with-text {
        width: auto;
      }

      .tag-copy-btn.with-text-left {
        justify-content: flex-start;
      }

      .tag-copy-btn.with-text-right {
        justify-content: flex-end;
      }

      .tag-copy-btn:hover {
        color: #4CAF50 !important;
      }

      .tag-copy-btn.copied {
        color: #2196F3 !important;
      }

      .tag-copy-btn svg {
        height: .75rem;
        stroke-width: 2;
        flex-shrink: 0;
      }

      .tag-copy-btn .btn-text {
        white-space: nowrap;
      }

      .fs-10 {
        font-size: 10px
      }

      /* Fixed width notice */
      .language-notice {
        display: none;
        margin-top: 10px;
        padding: 10px;
        border-radius: 4px;
        font-size: 14px;
        line-height: 1.4;
        width: 100%;
        box-sizing: border-box;
        white-space: normal;
        word-break: break-word;
        text-align: left;
      }

      /* Save button feedback */
      #saveSettings.saved { background: #2196F3 !important; }
    `;

    if (styleElement) styleElement.remove();

    styleElement = document.createElement("style");
    styleElement.id = "tag-copier-styles";
    styleElement.textContent = css;
    document.head.appendChild(styleElement);
  }

  applyGlobalStyles();

  // ===== UI COMPONENTS =====
  const copyIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
  const checkIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20 6L9 17l-5-5"/></svg>`;

  // ===== MEMORY LEAK PREVENTION =====
  // Переменные объявлены в секции инициализации

  // ===== MAIN FUNCTIONALITY =====
  function addCopyButton() {
    // Find all post preview images
    const postPreviews = document.querySelectorAll('article > .post-preview-container .post-preview-image');
    
    for (let i = 0; i < postPreviews.length; i++) {
      const preview = postPreviews[i];
      
      // Skip if button already exists
      if (preview.querySelector(".tag-copy-btn")) continue;
      
      // Get the post ID from the parent article
      const article = preview.closest('article');
      if (!article) continue;
      
      const postId = article.dataset.id;
      if (!postId) continue;
      
      const btn = document.createElement("button");
      btn.className = "tag-copy-btn";
      btn.title = t("title");
      btn.dataset.postId = postId; // Store post ID for later use
      
      // Устанавливаем содержимое кнопки в зависимости от настроек
      switch (SETTINGS.buttonStyle) {
        case "icon-and-text":
          btn.innerHTML = copyIcon + `<span class="btn-text">${t("buttonText")}</span>`;
          btn.classList.add("with-text");
          break;
        case "text-only":
          btn.innerHTML = `<span class="btn-text">${t("buttonText")}</span>`;
          btn.classList.add("with-text");
          break;
        default: // "icon-only"
          btn.innerHTML = copyIcon;
      }
      
      // Position button absolutely within the preview container
      btn.style.position = "absolute";
      btn.style.bottom = "5px";
      btn.style.right = "5px";
      btn.style.zIndex = "10";
      
      // Create a dedicated handler for this button
      const clickHandler = async (e) => {
        e.stopPropagation();
        const postId = btn.dataset.postId;
        
        // Find the post tooltip for this ID
        const tooltip = document.querySelector(`.tippy-box[data-state="visible"] .post-tooltip-body[data-post-id="${postId}"]`);
        if (!tooltip) {
          // Alternative: try to find any visible tooltip
          const tooltips = document.querySelectorAll('.tippy-box[data-state="visible"] .post-tooltip-body');
          if (tooltips.length === 0) return;
          tooltipBody = tooltips[0];
        } else {
          tooltipBody = tooltip;
        }
        
        const tags = Array.from(tooltipBody.querySelectorAll(".search-tag"))
        .map((tag) => {
          let text = tag.textContent.trim();
          // Замена нижних подчеркиваний на пробелы
          if (SETTINGS.replaceUnderscores) {
            text = text.replace(/_/g, ' ');
          }
          if (SETTINGS.escapeParentheses) {
            text = text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
          }
          return text;
        })
        .join(SETTINGS.addCommas ? ", " : " ");

        try {
          await navigator.clipboard.writeText(tags);
          showFeedback(btn);
        } catch (err) {
          console.error("Copy error:", err);
        }
      };

      // Store handler in WeakMap for potential future cleanup
      tooltipClickHandlers.set(btn, clickHandler);
      btn.addEventListener("click", clickHandler);
      
      // Add button to the preview container
      preview.style.position = "relative"; // Ensure container is positioned for absolute button
      preview.appendChild(btn);
    }
  }

  // Функция для очистки обработчиков событий
  function cleanupEventHandlers() {
    // Очищаем все обработчики событий для кнопок
    for (const [btn, handler] of tooltipClickHandlers) {
      btn.removeEventListener("click", handler);
    }
    // Очищаем WeakMap
    tooltipClickHandlers = new WeakMap();
  }

  // Button positioning is now handled via CSS when adding to preview container
  function applyButtonPosition(btn) {
    // No longer needed as we position buttons absolutely in the preview container
  }

  function showFeedback(btn) {
    const originalIcon = btn.innerHTML;
    btn.innerHTML = checkIcon;
    btn.classList.add("copied");

    setTimeout(() => {
      btn.innerHTML = originalIcon;
      btn.classList.remove("copied");
    }, 2000);
  }

  // ===== SETTINGS EDITOR =====
  function createSettingsEditor() {
    const isDarkMode = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    const editor = document.createElement("div");
    editor.id = "tag-copier-editor";

    const getInputValue = (id) => {
      const el = editor.querySelector(`#${id}`);
      if (!el) return null;
      if (el.type === "checkbox") return el.checked;
      if (el.type === "range" || el.type === "number")
        return parseFloat(el.value);
      return el.value;
    };

    const renderEditor = () => {
      const noticeBg = isDarkMode ? "#4a3c00" : "#fff3cd";
      const noticeBorder = isDarkMode ? "#ffd700" : "#ffc107";
      const noticeText = isDarkMode ? "#ffd700" : "#856404";

      editor.innerHTML = `
        <div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%); padding:20px;padding-top: 15px;border:1px solid ${
          isDarkMode ? "var(--default-border-color)" : "#ddd"
        };
          border-radius:8px;box-shadow: rgba(0, 0, 0, 0.1) 0px 10px 15px -3px, rgba(0, 0, 0, 0.05) 0px 4px 6px -2px;z-index:9999; font-family:Arial,sans-serif;width:500px;max-width:90vw;max-height:90vh;
          overflow-y:auto;color:${
            isDarkMode ? "#e0e0e0" : "#333"
        }; background:${
        isDarkMode ? "var(--post-tooltip-background-color)" : "white"
        }">

          <h2 style="margin:0 0 20px 0;text-align:center;color:${
            isDarkMode ? "var(--header-color)" : "#000"
        }">${t("settings")}</h2>

          <fieldset style="margin-bottom:25px; border:1px solid ${
            isDarkMode ? "var(--default-border-color)" : "#ddd"
        }; border-radius:6px; padding:15px">
            <legend style="color:${
              isDarkMode ? "var(--header-color)" : "#000"
        }; padding:0 8px"><strong>${t("formatting")}</strong></legend>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px">
              <label style="color:${
                isDarkMode ? "var(--grey-2)" : "#333"
        }; margin-right:15px">${t("addCommas")}</label>
              <input type="checkbox" id="addCommas" ${
                SETTINGS.addCommas ? "checked" : ""
        } style="transform: scale(1.3);">
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px">
              <label style="color:${
                isDarkMode ? "var(--grey-2)" : "#333"
        }; margin-right:15px">${t("escapeParentheses")}</label>
              <input type="checkbox" id="escapeParentheses" ${
                SETTINGS.escapeParentheses ? "checked" : ""
        } style="transform: scale(1.3);">
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px">
              <label style="color:${
                isDarkMode ? "var(--grey-2)" : "#333"
        }; margin-right:15px">${t("replaceUnderscores")}</label>
              <input type="checkbox" id="replaceUnderscores" ${
                SETTINGS.replaceUnderscores ? "checked" : ""
        } style="transform: scale(1.3);">
            </div>
          </fieldset>

          <fieldset style="margin-bottom:25px; border:1px solid ${
            isDarkMode ? "var(--default-border-color)" : "#ddd"
        }; border-radius:6px; padding:15px">
            <legend style="color:${
              isDarkMode ? "var(--header-color)" : "#000"
        }; padding:0 8px"><strong>${t("appearance")}</strong></legend>

            <!-- Button Style -->
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px">
              <label style="color:${
                isDarkMode ? "var(--grey-2)" : "#333"
        }; margin-right:15px">
                ${t("buttonStyle")}
              </label>
              <select id="buttonStyle" style="width:60%; min-width:150px; background:${
                isDarkMode ? "var(--grey-7)" : "white"
        }; color:${
        isDarkMode ? "#fff" : "#333"
        }; padding:5px; border-radius:4px;">
                <option value="icon-only" ${
                  SETTINGS.buttonStyle === "icon-only" ? "selected" : ""
        }>${t("styleIconOnly")}</option>
                <option value="icon-and-text" ${
                  SETTINGS.buttonStyle === "icon-and-text" ? "selected" : ""
        }>${t("styleIconAndText")}</option>
                <option value="text-only" ${
                  SETTINGS.buttonStyle === "text-only" ? "selected" : ""
        }>${t("styleTextOnly")}</option>
              </select>
            </div>
          </fieldset>

          <fieldset style="margin-bottom:25px; border:1px solid ${
            isDarkMode ? "var(--default-border-color)" : "#ddd"
        }; border-radius:6px; padding:15px; position: relative;">
            <legend style="color:${
              isDarkMode ? "var(--header-color)" : "#000"
        }; padding:0 8px"><strong>${t("languageSettings")}</strong></legend>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px">
              <label style="color:${
                isDarkMode ? "var(--grey-2)" : "#333"
        }; margin-right:15px">
                ${t("language")}
              </label>
              <select id="language" style="width:60%; min-width:150px; background:${
                isDarkMode ? "var(--grey-7)" : "white"
        }; color:${
        isDarkMode ? "#fff" : "#333"
        }; padding:5px; border-radius:4px">
                <option value="auto" ${
                  SETTINGS.language === "auto" ? "selected" : ""
        }>${t("langAuto")}</option>
                <option value="en" ${
                  SETTINGS.language === "en" ? "selected" : ""
        }>${t("langEn")}</option>
                <option value="ru" ${
                  SETTINGS.language === "ru" ? "selected" : ""
        }>${t("langRu")}</option>
              </select>
            </div>
            <div id="languageNotice" class="language-notice"
                 style="background:${noticeBg}; border-left: 4px solid ${noticeBorder}; color: ${noticeText};">
              <strong>${t("reloadNotice")}</strong>
            </div>
          </fieldset>

          <div style="display:flex; justify-content:end; margin-top:15px">
            <button id="saveSettings" style="padding:10px 20px; background:#4CAF50; color:white; border:none; border-radius:5px; cursor:pointer; font-weight:bold">
              ${t("saveButton")}
            </button>
            <button id="closeEditor" style="margin-left: 15px;padding:10px 20px; background:#f44336; color:white; border:none; border-radius:5px; cursor:pointer">
              ${t("cancelButton")}
            </button>
          </div>
        </div>
      `;

      // Update handlers

      // Show notice when language is changed
      editor.querySelector("#language")?.addEventListener("change", (e) => {
        const notice = editor.querySelector("#languageNotice");
        notice.style.display = "block";
      });

      editor.querySelector("#closeEditor")?.addEventListener("click", () => {
        document.body.removeChild(editor);
      });
    };

    const saveSettings = () => {
      const newSettings = {
        addCommas: getInputValue("addCommas"),
        escapeParentheses: getInputValue("escapeParentheses"),
        replaceUnderscores: getInputValue("replaceUnderscores"),
        language: getInputValue("language"),
        buttonStyle: getInputValue("buttonStyle"),
      };

      // Update global settings
      Object.assign(SETTINGS, newSettings);
      GM_setValue("tagCopierSettings", SETTINGS);

      // Apply changes
      applyGlobalStyles();
      document.querySelectorAll(".tag-copy-btn").forEach((btn) => {
        btn.title = t("title");
        // Update button content based on new style
        switch (SETTINGS.buttonStyle) {
          case "icon-and-text":
            btn.innerHTML = copyIcon + `<span class="btn-text">${t("buttonText")}</span>`;
            btn.classList.add("with-text");
            btn.classList.remove("with-text-left", "with-text-right");
            break;
          case "text-only":
            btn.innerHTML = `<span class="btn-text">${t("buttonText")}</span>`;
            btn.classList.add("with-text");
            btn.classList.remove("with-text-left", "with-text-right");
            break;
          default: // "icon-only"
            btn.innerHTML = copyIcon;
            btn.classList.remove("with-text", "with-text-left", "with-text-right");
        }
      });

      // Update button text
      const saveButton = editor.querySelector("#saveSettings");
      const originalText = saveButton.textContent;
      saveButton.textContent = t("savedButton");
      saveButton.classList.add("saved");

      // Revert after 3 seconds
      setTimeout(() => {
        saveButton.textContent = t("saveButton");
        saveButton.classList.remove("saved");
      }, 3000);
    };

    // Initial render
    renderEditor();

    // Add save handler AFTER rendering
    editor
      .querySelector("#saveSettings")
      ?.addEventListener("click", saveSettings);

    return editor;
  }

  function openSettingsEditor() {
    const existingEditor = document.getElementById("tag-copier-editor");
    if (existingEditor) return;

    const editor = createSettingsEditor();
    document.body.appendChild(editor);
  }

  // ===== INITIALIZATION =====
  GM_registerMenuCommand(t("settings"), openSettingsEditor);

  // Global variables for observer and event handlers
  let observer = null;
  let tooltipClickHandlers = new WeakMap();
  let throttleTimer = null;

  // Optimized observer with throttling
  function initObserver() {
    if (observer) {
      observer.disconnect();
      // Очищаем обработчики событий при повторной инициализации
      cleanupEventHandlers();
    }

    observer = new MutationObserver(() => {
      // Throttling to reduce frequency of calls
      if (throttleTimer) return;

      throttleTimer = setTimeout(() => {
        addCopyButton();
        throttleTimer = null;
      }, 100); // Ограничиваем частоту вызовов до 10 раз в секунду
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-state"],
    });
  }

  // Initialize with optimized observer
  initObserver();
  addCopyButton();

  // Handle PJAX navigation (used by Danbooru)
  document.addEventListener('pjax:end', function() {
    // Reinitialize observer after page content changes
    initObserver();
    // Add buttons to any existing tooltips
    addCopyButton();
  });

  // Cleanup function for potential script re-initialization
  window.addEventListener('beforeunload', () => {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    if (throttleTimer) {
      clearTimeout(throttleTimer);
      throttleTimer = null;
    }
    // Очищаем обработчики событий
    cleanupEventHandlers();
  });
})()