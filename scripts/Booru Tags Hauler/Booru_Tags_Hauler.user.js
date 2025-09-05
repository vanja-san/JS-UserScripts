// ==UserScript==
// @name            Booru Tags Hauler
// @name:ru         Booru Tags Hauler
// @namespace       https://github.com/vanja-san/JS-UserScripts/main/scripts/Booru%20Tags%20Hauler
// @version         1.9.5
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
      escapeColons: "Escape colons (\\:)",
      replaceUnderscores: "Replace Underscores",
      languageSettings: "Language Settings",
      language: "Language:",
      langAuto: "System default",
      langEn: "English",
      langRu: "Russian",
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
      escapeColons: "Экранировать двоеточия (\\:)",
      replaceUnderscores: "Заменять нижнии подчеркивания пробелами",
      languageSettings: "Настройки языка",
      language: "Язык:",
      langAuto: "Как в системе",
      langEn: "Английский",
      langRu: "Русский",
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
    escapeColons: false,
    replaceUnderscores: true,
    language: "auto"
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
  function applyGlobalStyles() {
    GM_addStyle(`
      .tag-copy-btn {
        display: flex;
        background: rgba(0, 0, 0, 0.7) !important;
        color: var(--muted-text-color);
        align-items: center;
        justify-content: center;
        cursor: pointer;
        z-index: 10000;
        border: none !important;
        border-radius: 4px;
        padding: 0;
        width: 28px;
        height: 28px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3) !important;
        gap: .2rem;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.2s ease-in-out, background 0.2s ease-in-out, color 0.2s ease-in-out;
        will-change: opacity;
      }

      .tag-copy-btn.visible {
        opacity: 1;
        pointer-events: auto;
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
        background: rgba(0, 0, 0, 0.9) !important;
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

      /* Save button feedback */
      #saveSettings.saved { background: #2196F3 !important; }
    `);
  }

  applyGlobalStyles();

  // ===== UI COMPONENTS =====
  const copyIcon = createCopyIcon();
  const checkIcon = createCheckIcon();

  function createCopyIcon() {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");

    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", "9");
    rect.setAttribute("y", "9");
    rect.setAttribute("width", "13");
    rect.setAttribute("height", "13");
    rect.setAttribute("rx", "2");

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", "M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1");

    svg.appendChild(rect);
    svg.appendChild(path);

    return svg;
  }

  function createCheckIcon() {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", "M20 6L9 17l-5-5");

    svg.appendChild(path);

    return svg;
  }

  // ===== MEMORY LEAK PREVENTION =====
  let currentPreview = null;
  let copyButton = null;
  let hideTimeout = null;
  let isMouseOverPreview = false;
  let isMouseOverButton = false;
  let currentPreviewLink = null;

  // ===== MAIN FUNCTIONALITY =====
  function initCopyButton() {
    // Create a single global copy button
    copyButton = document.createElement("button");
    copyButton.className = "tag-copy-btn";
    copyButton.title = t("title");

    // Clone the copy icon and append it to the button
    const iconClone = copyIcon.cloneNode(true);
    copyButton.appendChild(iconClone);

    // Add click handler
    copyButton.addEventListener("click", async (e) => {
      e.stopPropagation();
      e.preventDefault();

      if (!currentPreview) return;

      // Get the post ID and tags from the current preview's parent article
      const article = currentPreview.closest('article');
      if (!article) return;

      const tagsString = article.dataset.tags;
      if (!tagsString) return;

      // Format tags according to settings
      let formattedTags = tagsString;

      // Apply transformations in correct order
      if (SETTINGS.escapeParentheses) {
        formattedTags = formattedTags.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
      }

      if (SETTINGS.escapeColons) {
        formattedTags = formattedTags.replace(/:/g, "\\:");
      }

      // Split tags by space, process each tag, then join back
      if (SETTINGS.replaceUnderscores || SETTINGS.addCommas) {
        const tags = formattedTags.split(' ');
        const processedTags = tags.map(tag => {
          // Replace underscores with spaces within each tag
          if (SETTINGS.replaceUnderscores) {
            tag = tag.replace(/_/g, ' ');
          }
          return tag;
        });

        // Join tags with comma+space if needed, otherwise with space
        if (SETTINGS.addCommas) {
          formattedTags = processedTags.join(', ');
        } else {
          formattedTags = processedTags.join(' ');
        }
      }

      try {
        await navigator.clipboard.writeText(formattedTags);
        showFeedback(copyButton);
      } catch (err) {
        console.error("Copy error:", err);
      }
    });

    // Add mouse events to the button itself
    copyButton.addEventListener('mouseenter', () => {
      // Clear any pending hide timeout when mouse enters the button
      isMouseOverButton = true;
      clearHideTimeout();
    });

    copyButton.addEventListener('mouseleave', (e) => {
      isMouseOverButton = false;
      // Only hide if mouse is not over preview
      if (!isMouseOverPreview) {
        scheduleHideButton();
      }
    });
  }

  function showFeedback(btn) {
    // Store the original content
    const originalContent = btn.cloneNode(true);

    // Clear the button and add check icon
    btn.innerHTML = '';
    const checkClone = checkIcon.cloneNode(true);
    btn.appendChild(checkClone);
    btn.classList.add("copied");

    // Change background to indicate successful copy
    const originalBg = btn.style.background;
    btn.style.background = "rgba(33, 150, 243, 0.9)"; // Blue color for success

    setTimeout(() => {
      // Restore original content
      btn.innerHTML = '';
      const originalIcon = originalContent.firstChild.cloneNode(true);
      btn.appendChild(originalIcon);
      btn.classList.remove("copied");
      // Restore original background
      btn.style.background = originalBg || "rgba(0, 0, 0, 0.7)";
    }, 2000);
  }

  function positionButton(previewElement) {
    if (!copyButton || !previewElement) return;

    // Find the post-preview-link element
    const previewLink = previewElement.querySelector('.post-preview-link');
    if (!previewLink) return;

    // Append button directly to the preview link
    previewLink.style.position = 'relative';
    previewLink.appendChild(copyButton);

    // Position button in the bottom-right corner of the link
    copyButton.style.position = 'absolute';
    copyButton.style.bottom = '5px';
    copyButton.style.right = '5px';
    copyButton.style.zIndex = '10';
  }

  function showButton(previewElement) {
    if (!copyButton) return;

    // Clear any pending hide timeout
    clearHideTimeout();

    currentPreview = previewElement;
    positionButton(previewElement);

    // Add a small delay before showing to prevent flickering
    hideTimeout = setTimeout(() => {
      copyButton.classList.add('visible');
    }, 50);
  }

  function scheduleHideButton() {
    // Clear any pending hide timeout
    clearHideTimeout();

    // Schedule hiding with delay
    hideTimeout = setTimeout(() => {
      if (!isMouseOverPreview && !isMouseOverButton) {
        hideButton();
      }
    }, 200);
  }

  function clearHideTimeout() {
    if (hideTimeout) {
      clearTimeout(hideTimeout);
      hideTimeout = null;
    }
  }

  function hideButton() {
    if (!copyButton) return;

    clearHideTimeout();
    copyButton.classList.remove('visible');
    currentPreview = null;
  }

  function attachHoverHandlers() {
    // Attach hover handlers to all post previews
    const postPreviews = document.querySelectorAll('article > .post-preview-container');

    postPreviews.forEach(preview => {
      preview.addEventListener('mouseenter', () => {
        isMouseOverPreview = true;
        showButton(preview);
      });

      preview.addEventListener('mouseleave', (e) => {
        isMouseOverPreview = false;
        // Only schedule hide if mouse is not over button
        if (!isMouseOverButton) {
          scheduleHideButton();
        }
      });
    });
  }

  function addCopyButton() {
    // Attach hover handlers to existing previews
    attachHoverHandlers();
  }

  // ===== SETTINGS EDITOR =====
  // Helper function to create DOM elements with properties and styles
  function createElement(tag, props = {}, styles = {}) {
    const element = document.createElement(tag);

    // Set properties/attributes
    Object.keys(props).forEach(key => {
      if (key === 'textContent' || key === 'innerHTML') {
        element[key] = props[key];
      } else {
        element.setAttribute(key, props[key]);
      }
    });

    // Set styles
    Object.keys(styles).forEach(key => {
      element.style[key] = styles[key];
    });

    return element;
  }

  function createSettingsEditor() {
    const isDarkMode = window.matchMedia("(prefers-color-scheme: dark)").matches;

    // Create editor content using helper function
    const editor = createElement("div", { id: "tag-copier-editor" });

    const editorContainer = createElement("div", {}, {
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      padding: "5px 10px 10px 10px",
      border: `1px solid ${isDarkMode ? "var(--default-border-color)" : "#ddd"}`,
      borderRadius: "4px",
      boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1), 0 1px 4px rgba(0, 0, 0, 0.08)",
      zIndex: "9999",
      fontFamily: "Tahoma, Verdana, Helvetica, sans-serif",
      width: "300px",
      maxWidth: "90vw",
      maxHeight: "90vh",
      overflowY: "auto",
      background: isDarkMode ? "var(--post-tooltip-background-color)" : "white",
      userSelect: "none"
    });

    const heading = createElement("h2", { textContent: t("settings") }, {
      margin: "0 0 12px 0",
      textAlign: "center",
      color: isDarkMode ? "var(--header-color)" : "#000"
    });
    editorContainer.appendChild(heading);

    // Create settings container
    const settingsContainer = createElement("div", {}, {
      display: "flex",
      flexDirection: "column",
      gap: "10px",
      marginBottom: "20px"
    });

    // Add commas checkbox
    const addCommasContainer = createElement("div", {}, {
      display: "flex",
      alignItems: "center",
      padding: "8px",
      border: `1px solid ${isDarkMode ? "var(--default-border-color)" : "#ddd"}`,
      borderRadius: "3px",
      background: isDarkMode ? "var(--grey-7)" : "#f9f9f9",
      cursor: "pointer",
      marginBottom: "0"
    });

    const addCommasInput = createElement("input", {
      type: "checkbox",
      id: "addCommas"
    }, {
      marginRight: "6px",
      transform: "scale(1.1)"
    });
    if (SETTINGS.addCommas) {
      addCommasInput.checked = true;
    }
    addCommasContainer.appendChild(addCommasInput);

    const addCommasLabel = createElement("label", {
      textContent: t("addCommas"),
      htmlFor: "addCommas"
    }, {
      color: isDarkMode ? "var(--text-color)" : "#333",
      cursor: "pointer",
      flex: "1"
    });
    addCommasContainer.appendChild(addCommasLabel);

    // Add click handler to container
    addCommasContainer.addEventListener("click", (e) => {
      // Don't trigger if clicking on the checkbox itself
      if (e.target !== addCommasInput) {
        addCommasInput.checked = !addCommasInput.checked;
      }
    });

    settingsContainer.appendChild(addCommasContainer);

    // Escape parentheses checkbox
    const escapeParenthesesContainer = createElement("div", {}, {
      display: "flex",
      alignItems: "center",
      padding: "8px",
      border: `1px solid ${isDarkMode ? "var(--default-border-color)" : "#ddd"}`,
      borderRadius: "3px",
      background: isDarkMode ? "var(--grey-7)" : "#f9f9f9",
      cursor: "pointer",
      marginBottom: "0"
    });

    const escapeParenthesesInput = createElement("input", {
      type: "checkbox",
      id: "escapeParentheses"
    }, {
      marginRight: "6px",
      transform: "scale(1.1)"
    });
    if (SETTINGS.escapeParentheses) {
      escapeParenthesesInput.checked = true;
    }
    escapeParenthesesContainer.appendChild(escapeParenthesesInput);

    const escapeParenthesesLabel = createElement("label", {
      textContent: t("escapeParentheses"),
      htmlFor: "escapeParentheses"
    }, {
      color: isDarkMode ? "var(--text-color)" : "#333",
      cursor: "pointer",
      flex: "1"
    });
    escapeParenthesesContainer.appendChild(escapeParenthesesLabel);

    // Add click handler to container
    escapeParenthesesContainer.addEventListener("click", (e) => {
      // Don't trigger if clicking on the checkbox itself
      if (e.target !== escapeParenthesesInput) {
        escapeParenthesesInput.checked = !escapeParenthesesInput.checked;
      }
    });

    settingsContainer.appendChild(escapeParenthesesContainer);

    // Escape colons checkbox
    const escapeColonsContainer = createElement("div", {}, {
      display: "flex",
      alignItems: "center",
      padding: "8px",
      border: `1px solid ${isDarkMode ? "var(--default-border-color)" : "#ddd"}`,
      borderRadius: "3px",
      background: isDarkMode ? "var(--grey-7)" : "#f9f9f9",
      cursor: "pointer",
      marginBottom: "0"
    });

    const escapeColonsInput = createElement("input", {
      type: "checkbox",
      id: "escapeColons"
    }, {
      marginRight: "6px",
      transform: "scale(1.1)"
    });
    if (SETTINGS.escapeColons) {
      escapeColonsInput.checked = true;
    }
    escapeColonsContainer.appendChild(escapeColonsInput);

    const escapeColonsLabel = createElement("label", {
      textContent: t("escapeColons"),
      htmlFor: "escapeColons"
    }, {
      color: isDarkMode ? "var(--text-color)" : "#333",
      cursor: "pointer",
      flex: "1"
    });
    escapeColonsContainer.appendChild(escapeColonsLabel);

    // Add click handler to container
    escapeColonsContainer.addEventListener("click", (e) => {
      // Don't trigger if clicking on the checkbox itself
      if (e.target !== escapeColonsInput) {
        escapeColonsInput.checked = !escapeColonsInput.checked;
      }
    });

    settingsContainer.appendChild(escapeColonsContainer);

    // Replace underscores checkbox
    const replaceUnderscoresContainer = createElement("div", {}, {
      display: "flex",
      alignItems: "center",
      padding: "8px",
      border: `1px solid ${isDarkMode ? "var(--default-border-color)" : "#ddd"}`,
      borderRadius: "3px",
      background: isDarkMode ? "var(--grey-7)" : "#f9f9f9",
      cursor: "pointer",
      marginBottom: "0"
    });

    const replaceUnderscoresInput = createElement("input", {
      type: "checkbox",
      id: "replaceUnderscores"
    }, {
      marginRight: "6px",
      transform: "scale(1.1)"
    });
    if (SETTINGS.replaceUnderscores) {
      replaceUnderscoresInput.checked = true;
    }
    replaceUnderscoresContainer.appendChild(replaceUnderscoresInput);

    const replaceUnderscoresLabel = createElement("label", {
      textContent: t("replaceUnderscores"),
      htmlFor: "replaceUnderscores"
    }, {
      color: isDarkMode ? "var(--text-color)" : "#333",
      cursor: "pointer",
      flex: "1"
    });
    replaceUnderscoresContainer.appendChild(replaceUnderscoresLabel);

    // Add click handler to container
    replaceUnderscoresContainer.addEventListener("click", (e) => {
      // Don't trigger if clicking on the checkbox itself
      if (e.target !== replaceUnderscoresInput) {
        replaceUnderscoresInput.checked = !replaceUnderscoresInput.checked;
      }
    });

    settingsContainer.appendChild(replaceUnderscoresContainer);

    // Language settings
    const languageContainer = createElement("div", {}, {
      display: "flex",
      alignItems: "center",
      padding: "8px",
      border: `1px solid ${isDarkMode ? "var(--default-border-color)" : "#ddd"}`,
      borderRadius: "3px",
      background: isDarkMode ? "var(--grey-7)" : "#f9f9f9",
      marginBottom: "0",
      cursor: "default"
    });

    const languageLabel = createElement("label", {
      textContent: t("language"),
      htmlFor: "language"
    }, {
      color: isDarkMode ? "var(--text-color)" : "#333",
      marginRight: "10px",
      cursor: "default"
    });
    languageContainer.appendChild(languageLabel);

    const languageSelect = createElement("select", { id: "language" }, {
      background: isDarkMode ? "var(--grey-6)" : "#ffffff",
      color: isDarkMode ? "#fff" : "#333",
      padding: "6px",
      borderRadius: "3px",
      border: `2px solid ${isDarkMode ? "#4a90e2" : "#007bff"}`,
      flex: "1",
      boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
    });

    const autoOption = createElement("option", {
      value: "auto",
      textContent: t("langAuto")
    });
    if (SETTINGS.language === "auto") {
      autoOption.selected = true;
    }
    languageSelect.appendChild(autoOption);

    const enOption = createElement("option", {
      value: "en",
      textContent: t("langEn")
    });
    if (SETTINGS.language === "en") {
      enOption.selected = true;
    }
    languageSelect.appendChild(enOption);

    const ruOption = createElement("option", {
      value: "ru",
      textContent: t("langRu")
    });
    if (SETTINGS.language === "ru") {
      ruOption.selected = true;
    }
    languageSelect.appendChild(ruOption);

    languageContainer.appendChild(languageSelect);
    settingsContainer.appendChild(languageContainer);

    editorContainer.appendChild(settingsContainer);

    // Buttons container
    const buttonsContainer = createElement("div", {}, {
      display: "flex",
      justifyContent: "end"
    });

    const saveButton = createElement("button", {
      id: "saveSettings",
      textContent: t("saveButton")
    }, {
      padding: "6px 12px",
      background: "#4CAF50",
      color: "white",
      border: "none",
      borderRadius: "2px",
      cursor: "pointer",
      fontWeight: "bold"
    });
    buttonsContainer.appendChild(saveButton);

    const closeButton = createElement("button", {
      id: "closeEditor",
      textContent: t("cancelButton")
    }, {
      marginLeft: "10px",
      padding: "6px 12px",
      background: "#f44336",
      color: "white",
      border: "none",
      borderRadius: "2px",
      cursor: "pointer"
    });
    buttonsContainer.appendChild(closeButton);

    editorContainer.appendChild(buttonsContainer);
    editor.appendChild(editorContainer);

    // Add event handlers
    closeButton.addEventListener("click", () => {
      document.body.removeChild(editor);
    });

    const getInputValue = (id) => {
      const el = document.getElementById(id);
      if (!el) return null;
      if (el.type === "checkbox") return el.checked;
      if (el.type === "range" || el.type === "number") {
        return parseFloat(el.value);
      }
      return el.value;
    };

    const saveSettings = () => {
      const newSettings = {
        addCommas: getInputValue("addCommas"),
        escapeParentheses: getInputValue("escapeParentheses"),
        escapeColons: getInputValue("escapeColons"),
        replaceUnderscores: getInputValue("replaceUnderscores"),
        language: getInputValue("language"),
      };

      // Update global settings
      Object.assign(SETTINGS, newSettings);
      GM_setValue("tagCopierSettings", SETTINGS);

      // Apply changes
      document.querySelectorAll(".tag-copy-btn").forEach((btn) => {
        btn.title = t("title");
        // Update button content (only icon)
        btn.innerHTML = '';
        const iconClone = copyIcon.cloneNode(true);
        btn.appendChild(iconClone);
      });

      // Update button text
      const originalText = saveButton.textContent;
      saveButton.textContent = t("savedButton");
      saveButton.classList.add("saved");

      // Revert after 3 seconds
      setTimeout(() => {
        saveButton.textContent = t("saveButton");
        saveButton.classList.remove("saved");
      }, 3000);
    };

    saveButton.addEventListener("click", saveSettings);

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
  let throttleTimer = null;

  // Optimized observer with throttling
  function initObserver() {
    if (observer) {
      observer.disconnect();
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
    });
  }

  // Initialize with optimized observer
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initCopyButton(); // Initialize the single copy button
      initObserver();
      addCopyButton();
    });
  } else {
    initCopyButton(); // Initialize the single copy button
    initObserver();
    addCopyButton();
  }

  // Handle PJAX navigation (used by Danbooru)
  document.addEventListener('pjax:end', function() {
    // Reattach hover handlers to new previews
    attachHoverHandlers();
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
    // Remove the copy button from the DOM
    if (copyButton && copyButton.parentNode) {
      copyButton.parentNode.removeChild(copyButton);
    }
  });
})()