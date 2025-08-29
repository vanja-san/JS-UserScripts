// ==UserScript==
// @name            Booru Tags Hauler
// @name:ru         Booru Tags Hauler
// @namespace       https://github.com/vanja-san/JS-UserScripts/main/scripts/Booru Tags Hauler
// @version         1.0.3
// @description     Adds a 'Copy all tags' button to the thumbnail hover preview tooltip. Copy all of a tooltip tags instantly!
// @description:ru  Добавляет кнопку 'Скопировать все теги' во всплывающую подсказку при наведении на превью. Копируйте все теги картинки, не открывая её страницу! Существенная экономия времени.
// @author          vanja-san
// @license         MIT
// @match           https://danbooru.donmai.us/*
// @icon            https://www.google.com/s2/favicons?sz=64&domain=donmai.us
// @downloadURL     https://raw.githubusercontent.com/vanja-san/JS-UserScripts/main/scripts/DanbooruTACO/danbooruTaCo.user.js
// @updateURL       https://raw.githubusercontent.com/vanja-san/JS-UserScripts/main/scripts/DanbooruTACO/danbooruTaCo.user.js
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
      appearance: "Button Appearance",
      buttonOpacity: "Button opacity:",
      buttonSize: "Button size:",
      iconScale: "Icon scale:",
      buttonPosition: "Button position:",
      positionBottomRight: "Bottom right",
      positionTopRight: "Top right",
      positionBottomLeft: "Bottom left",
      positionTopLeft: "Top left",
      buttonColor: "Button color:",
      buttonHoverColor: "Hover color:",
      iconColor: "Icon color:",
      buttonShape: "Button shape:",
      shapeRounded: "Rounded square",
      shapeCircle: "Circle",
      shapeSquare: "Square",
      languageSettings: "Language Settings",
      language: "Language:",
      langAuto: "System default",
      langEn: "English",
      langRu: "Russian",
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
      appearance: "Внешний вид кнопки",
      buttonOpacity: "Прозрачность кнопки:",
      buttonSize: "Размер кнопки:",
      iconScale: "Масштаб иконки:",
      buttonPosition: "Позиция кнопки:",
      positionBottomRight: "Снизу справа",
      positionTopRight: "Сверху справа",
      positionBottomLeft: "Снизу слева",
      positionTopLeft: "Сверху слева",
      buttonColor: "Цвет кнопки:",
      buttonHoverColor: "Цвет при наведении:",
      iconColor: "Цвет иконки:",
      buttonShape: "Форма кнопки:",
      shapeRounded: "Скругленный квадрат",
      shapeCircle: "Круг",
      shapeSquare: "Квадрат",
      languageSettings: "Настройки языка",
      language: "Язык:",
      langAuto: "Как в системе",
      langEn: "Английский",
      langRu: "Русский",
      saveButton: "Сохранить",
      savedButton: "Сохранено!",
      cancelButton: "Закрыть",
      savedNotification: "Настройки сохранены!",
      reloadNotice: "ВНИМАНИЕ: Для смены языка требуется перезагрузка страницы",
    },
  };

  // ===== CORE SETTINGS =====
  const DEFAULT_SETTINGS = {
    addCommas: true,
    escapeParentheses: true,
    buttonOpacity: 0.3,
    buttonSize: 28,
    iconScale: 1.0,
    buttonPosition: "bottom-right",
    buttonColor: "#000000",
    buttonHoverColor: "#4CAF50",
    iconColor: "#FFFFFF",
    buttonShape: "rounded-square",
    language: "auto",
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
    const borderRadius =
      SETTINGS.buttonShape === "circle"
        ? "50%"
        : SETTINGS.buttonShape === "square"
        ? "0"
        : "4px";

    const baseIconSize = 20;
    const scaledIconSize = baseIconSize * SETTINGS.iconScale;

    const css = `
      .tag-copy-btn {
        position: absolute;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        z-index: 1000;
        border: none;
        transition: all 0.3s;
        border-radius: ${borderRadius};
        background: ${SETTINGS.buttonColor};
        opacity: ${SETTINGS.buttonOpacity};
        padding: 0;
        width: ${SETTINGS.buttonSize}px;
        height: ${SETTINGS.buttonSize}px;
      }

      .tag-copy-btn:hover { opacity: 0.9; transform: scale(1.15); background: ${SETTINGS.buttonHoverColor} !important; }

      .tag-copy-btn.copied { background: #2196F3 !important; }

      .tag-copy-btn svg {
        width: ${scaledIconSize}px;
        height: ${scaledIconSize}px;
        stroke: ${SETTINGS.iconColor};
        stroke-width: 2;
        flex-shrink: 0;
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
  let observer = null;
  let tooltipClickHandlers = new WeakMap();

  // ===== MAIN FUNCTIONALITY =====
  function addCopyButton() {
    document
      .querySelectorAll('.tippy-box[data-state="visible"]')
      .forEach((tooltip) => {
        if (
          tooltip.querySelector(".tag-copy-btn") ||
          !tooltip.querySelector(".post-tooltip-body")
        )
          return;

        const btn = document.createElement("button");
        btn.className = "tag-copy-btn";
        btn.title = t("title");
        btn.innerHTML = copyIcon;
        applyButtonPosition(btn);

        // Create a dedicated handler for this button
        const clickHandler = async (e) => {
          e.stopPropagation();
          const tags = Array.from(tooltip.querySelectorAll(".search-tag"))
            .map((tag) => {
              let text = tag.textContent.trim();
              if (SETTINGS.escapeParentheses) {
                text = text.replace(/\(/g, "\\(").replace(/\)/g, "\\)");
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

        tooltip.querySelector(".tippy-content").appendChild(btn);
      });
  }

  function applyButtonPosition(btn) {
    const offset = "5px";
    btn.style.top = "auto";
    btn.style.bottom = "auto";
    btn.style.left = "auto";
    btn.style.right = "auto";

    switch (SETTINGS.buttonPosition) {
      case "top-left":
        btn.style.top = offset;
        btn.style.left = offset;
        break;
      case "top-right":
        btn.style.top = offset;
        btn.style.right = offset;
        break;
      case "bottom-left":
        btn.style.bottom = offset;
        btn.style.left = offset;
        break;
      default:
        btn.style.bottom = offset;
        btn.style.right = offset;
    }
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
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px">
              <label style="color:${
                isDarkMode ? "var(--grey-2)" : "#333"
              }; margin-right:15px">${t("escapeParentheses")}</label>
              <input type="checkbox" id="escapeParentheses" ${
                SETTINGS.escapeParentheses ? "checked" : ""
              } style="transform: scale(1.3);">
            </div>
          </fieldset>

          <fieldset style="margin-bottom:25px; border:1px solid ${
            isDarkMode ? "var(--default-border-color)" : "#ddd"
          }; border-radius:6px; padding:15px">
            <legend style="color:${
              isDarkMode ? "var(--header-color)" : "#000"
            }; padding:0 8px"><strong>${t("appearance")}</strong></legend>

            <!-- Button Opacity -->
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px">
              <label style="color:${
                isDarkMode ? "var(--grey-2)" : "#333"
              }; margin-right:15px">
                ${t("buttonOpacity")}
              </label>
              <input type="range" id="buttonOpacity" min="0.1" max="1.0" step="0.1" value="${
                SETTINGS.buttonOpacity
              }" style="width:60%; min-width:150px">
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:15px">
              <div style="width:100%; text-align:right">
                <span>10%</span>
                <span id="opacityValue" style="margin:0 10px">${Math.round(
                  SETTINGS.buttonOpacity * 100
                )}%</span>
                <span>100%</span>
              </div>
            </div>

            <!-- Button Size -->
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px">
              <label style="color:${
                isDarkMode ? "var(--grey-2)" : "#333"
              }; margin-right:15px">
                ${t("buttonSize")}
              </label>
              <input type="range" id="buttonSize" min="16" max="50" step="2" value="${
                SETTINGS.buttonSize
              }" style="width:60%; min-width:150px">
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:15px">
              <div style="width:100%; text-align:right">
                <span>16px</span>
                <span id="sizeValue" style="margin:0 10px">${
                  SETTINGS.buttonSize
                }px</span>
                <span>50px</span>
              </div>
            </div>

            <!-- Icon Scale -->
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px">
              <label style="color:${
                isDarkMode ? "var(--grey-2)" : "#333"
              }; margin-right:15px">
                ${t("iconScale")}
              </label>
              <input type="range" id="iconScale" min="0.5" max="3.0" step="0.1" value="${
                SETTINGS.iconScale
              }" style="width:60%; min-width:150px">
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:15px">
              <div style="width:100%; text-align:right">
                <span>50%</span>
                <span id="iconScaleValue" style="margin:0 10px">${Math.round(
                  SETTINGS.iconScale * 100
                )}%</span>
                <span>300%</span>
              </div>
            </div>

            <!-- Button Position -->
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px">
              <label style="color:${
                isDarkMode ? "var(--grey-2)" : "#333"
              }; margin-right:15px">
                ${t("buttonPosition")}
              </label>
              <select id="buttonPosition" style="width:60%; min-width:150px; background:${
                isDarkMode ? "var(--grey-7)" : "white"
              }; color:${
        isDarkMode ? "#fff" : "#333"
      }; padding:5px; border-radius:4px;">
                <option value="top-left" ${
                  SETTINGS.buttonPosition === "top-left" ? "selected" : ""
                }>${t("positionTopLeft")}</option>
                <option value="top-right" ${
                  SETTINGS.buttonPosition === "top-right" ? "selected" : ""
                }>${t("positionTopRight")}</option>
                <option value="bottom-left" ${
                  SETTINGS.buttonPosition === "bottom-left" ? "selected" : ""
                }>${t("positionBottomLeft")}</option>
                <option value="bottom-right" ${
                  SETTINGS.buttonPosition === "bottom-right" ? "selected" : ""
                }>${t("positionBottomRight")}</option>
              </select>
            </div>

            <!-- Button Color -->
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px">
              <label style="color:${
                isDarkMode ? "var(--grey-2)" : "#333"
              }; margin-right:15px">
                ${t("buttonColor")}
              </label>
              <input type="color" id="buttonColor" value="${
                SETTINGS.buttonColor
              }" style="width:60px; height:30px; border-radius:4px">
            </div>

            <!-- Button Hover Color -->
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px">
              <label style="color:${
                isDarkMode ? "var(--grey-2)" : "#333"
              }; margin-right:15px">
                ${t("buttonHoverColor")}
              </label>
              <input type="color" id="buttonHoverColor" value="${
                SETTINGS.buttonHoverColor
              }" style="width:60px; height:30px; border-radius:4px">
            </div>

            <!-- Icon Color -->
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px">
              <label style="color:${
                isDarkMode ? "var(--grey-2)" : "#333"
              }; margin-right:15px">
                ${t("iconColor")}
              </label>
              <input type="color" id="iconColor" value="${
                SETTINGS.iconColor
              }" style="width:60px; height:30px; border-radius:4px">
            </div>

            <!-- Button Shape -->
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px">
              <label style="color:${
                isDarkMode ? "var(--grey-2)" : "#333"
              }; margin-right:15px">
                ${t("buttonShape")}
              </label>
              <select id="buttonShape" style="width:60%; min-width:150px; background:${
                isDarkMode ? "var(--grey-7)" : "white"
              }; color:${
        isDarkMode ? "#fff" : "#333"
      }; padding:5px; border-radius:4px;">
                <option value="rounded-square" ${
                  SETTINGS.buttonShape === "rounded-square" ? "selected" : ""
                }>${t("shapeRounded")}</option>
                <option value="circle" ${
                  SETTINGS.buttonShape === "circle" ? "selected" : ""
                }>${t("shapeCircle")}</option>
                <option value="square" ${
                  SETTINGS.buttonShape === "square" ? "selected" : ""
                }>${t("shapeSquare")}</option>
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
      editor.querySelector("#buttonOpacity")?.addEventListener("input", () => {
        editor.querySelector("#opacityValue").textContent =
          Math.round(editor.querySelector("#buttonOpacity").value * 100) + "%";
      });

      editor.querySelector("#buttonSize")?.addEventListener("input", () => {
        editor.querySelector("#sizeValue").textContent =
          editor.querySelector("#buttonSize").value + "px";
      });

      editor.querySelector("#iconScale")?.addEventListener("input", () => {
        editor.querySelector("#iconScaleValue").textContent =
          Math.round(editor.querySelector("#iconScale").value * 100) + "%";
      });

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
        buttonOpacity: getInputValue("buttonOpacity"),
        buttonSize: getInputValue("buttonSize"),
        iconScale: getInputValue("iconScale"),
        buttonPosition: getInputValue("buttonPosition"),
        buttonColor: getInputValue("buttonColor"),
        buttonHoverColor: getInputValue("buttonHoverColor"),
        iconColor: getInputValue("iconColor"),
        buttonShape: getInputValue("buttonShape"),
        language: getInputValue("language"),
      };

      // Update global settings
      Object.assign(SETTINGS, newSettings);
      GM_setValue("tagCopierSettings", SETTINGS);

      // Apply changes
      applyGlobalStyles();
      document.querySelectorAll(".tag-copy-btn").forEach((btn) => {
        btn.title = t("title");
        applyButtonPosition(btn);
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

  // Optimized observer with better performance
  function initObserver() {
    if (observer) {
      observer.disconnect();
    }

    observer = new MutationObserver(() => {
      // Use requestAnimationFrame to debounce rapid mutations
      requestAnimationFrame(() => {
        addCopyButton();
      });
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
  });
})();
