// ==UserScript==
// @name            Booru Tags Hauler
// @name:ru         Booru Tags Hauler
// @namespace       https://github.com/vanja-san/JS-UserScripts/main/scripts/Booru%20Tags%20Hauler
// @version         1.5.8
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
  function createSettingsEditor() {
    const isDarkMode = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const editor = document.createElement("div");
    editor.id = "tag-copier-editor";

    // Create editor content using DOM methods
    const editorContainer = document.createElement("div");
    editorContainer.style.position = "fixed";
    editorContainer.style.top = "50%";
    editorContainer.style.left = "50%";
    editorContainer.style.transform = "translate(-50%, -50%)";
    editorContainer.style.padding = "10px";
    editorContainer.style.border = `1px solid ${isDarkMode ? "var(--default-border-color)" : "#ddd"}`;
    editorContainer.style.borderRadius = "8px";
    editorContainer.style.boxShadow = "rgba(0, 0, 0, 0.1) 0px 10px 15px -3px, rgba(0, 0, 0, 0.05) 0px 4px 6px -2px";
    editorContainer.style.zIndex = "9999";
    editorContainer.style.fontFamily = "Arial,sans-serif";
    editorContainer.style.width = "500px";
    editorContainer.style.maxWidth = "90vw";
    editorContainer.style.maxHeight = "90vh";
    editorContainer.style.overflowY = "auto";
    editorContainer.style.color = isDarkMode ? "#e0e0e0" : "#333";
    editorContainer.style.background = isDarkMode ? "var(--post-tooltip-background-color)" : "white";

    const heading = document.createElement("h2");
    heading.style.margin = "0 0 20px 0";
    heading.style.textAlign = "center";
    heading.style.color = isDarkMode ? "var(--header-color)" : "#000";
    heading.textContent = t("settings");
    editorContainer.appendChild(heading);

    // Formatting fieldset
    const formattingFieldset = document.createElement("fieldset");
    formattingFieldset.style.marginBottom = "10px";
    formattingFieldset.style.border = `1px solid ${isDarkMode ? "var(--default-border-color)" : "#ddd"}`;
    formattingFieldset.style.borderRadius = "6px";
    formattingFieldset.style.padding = "20px 15px";

    const formattingLegend = document.createElement("legend");
    formattingLegend.style.color = isDarkMode ? "var(--header-color)" : "#000";
    formattingLegend.style.padding = "0 8px";
    const formattingLegendStrong = document.createElement("strong");
    formattingLegendStrong.textContent = t("formatting");
    formattingLegend.appendChild(formattingLegendStrong);
    formattingFieldset.appendChild(formattingLegend);

    // Add commas checkbox
    const addCommasContainer = document.createElement("div");
    addCommasContainer.style.display = "flex";
    addCommasContainer.style.justifyContent = "space-between";
    addCommasContainer.style.alignItems = "center";
    addCommasContainer.style.marginBottom = "15px";

    const addCommasLabel = document.createElement("label");
    addCommasLabel.style.color = isDarkMode ? "var(--grey-2)" : "#333";
    addCommasLabel.style.marginRight = "15px";
    addCommasLabel.textContent = t("addCommas");
    addCommasContainer.appendChild(addCommasLabel);

    const addCommasInput = document.createElement("input");
    addCommasInput.type = "checkbox";
    addCommasInput.id = "addCommas";
    if (SETTINGS.addCommas) addCommasInput.checked = true;
    addCommasInput.style.transform = "scale(1.3)";
    addCommasContainer.appendChild(addCommasInput);

    formattingFieldset.appendChild(addCommasContainer);

    // Escape parentheses checkbox
    const escapeParenthesesContainer = document.createElement("div");
    escapeParenthesesContainer.style.display = "flex";
    escapeParenthesesContainer.style.justifyContent = "space-between";
    escapeParenthesesContainer.style.alignItems = "center";
    escapeParenthesesContainer.style.marginBottom = "15px";

    const escapeParenthesesLabel = document.createElement("label");
    escapeParenthesesLabel.style.color = isDarkMode ? "var(--grey-2)" : "#333";
    escapeParenthesesLabel.style.marginRight = "15px";
    escapeParenthesesLabel.textContent = t("escapeParentheses");
    escapeParenthesesContainer.appendChild(escapeParenthesesLabel);

    const escapeParenthesesInput = document.createElement("input");
    escapeParenthesesInput.type = "checkbox";
    escapeParenthesesInput.id = "escapeParentheses";
    if (SETTINGS.escapeParentheses) escapeParenthesesInput.checked = true;
    escapeParenthesesInput.style.transform = "scale(1.3)";
    escapeParenthesesContainer.appendChild(escapeParenthesesInput);

    formattingFieldset.appendChild(escapeParenthesesContainer);

    // Escape colons checkbox
    const escapeColonsContainer = document.createElement("div");
    escapeColonsContainer.style.display = "flex";
    escapeColonsContainer.style.justifyContent = "space-between";
    escapeColonsContainer.style.alignItems = "center";
    escapeColonsContainer.style.marginBottom = "15px";

    const escapeColonsLabel = document.createElement("label");
    escapeColonsLabel.style.color = isDarkMode ? "var(--grey-2)" : "#333";
    escapeColonsLabel.style.marginRight = "15px";
    escapeColonsLabel.textContent = t("escapeColons");
    escapeColonsContainer.appendChild(escapeColonsLabel);

    const escapeColonsInput = document.createElement("input");
    escapeColonsInput.type = "checkbox";
    escapeColonsInput.id = "escapeColons";
    if (SETTINGS.escapeColons) escapeColonsInput.checked = true;
    escapeColonsInput.style.transform = "scale(1.3)";
    escapeColonsContainer.appendChild(escapeColonsInput);

    formattingFieldset.appendChild(escapeColonsContainer);

    // Replace underscores checkbox
    const replaceUnderscoresContainer = document.createElement("div");
    replaceUnderscoresContainer.style.display = "flex";
    replaceUnderscoresContainer.style.justifyContent = "space-between";
    replaceUnderscoresContainer.style.alignItems = "center";

    const replaceUnderscoresLabel = document.createElement("label");
    replaceUnderscoresLabel.style.color = isDarkMode ? "var(--grey-2)" : "#333";
    replaceUnderscoresLabel.style.marginRight = "15px";
    replaceUnderscoresLabel.textContent = t("replaceUnderscores");
    replaceUnderscoresContainer.appendChild(replaceUnderscoresLabel);

    const replaceUnderscoresInput = document.createElement("input");
    replaceUnderscoresInput.type = "checkbox";
    replaceUnderscoresInput.id = "replaceUnderscores";
    if (SETTINGS.replaceUnderscores) replaceUnderscoresInput.checked = true;
    replaceUnderscoresInput.style.transform = "scale(1.3)";
    replaceUnderscoresContainer.appendChild(replaceUnderscoresInput);

    formattingFieldset.appendChild(replaceUnderscoresContainer);

    editorContainer.appendChild(formattingFieldset);

    // Language settings fieldset
    const languageFieldset = document.createElement("fieldset");
    languageFieldset.style.marginBottom = "10px";
    languageFieldset.style.border = `1px solid ${isDarkMode ? "var(--default-border-color)" : "#ddd"}`;
    languageFieldset.style.borderRadius = "6px";
    languageFieldset.style.padding = "20px 15px";
    languageFieldset.style.position = "relative";

    const languageLegend = document.createElement("legend");
    languageLegend.style.color = isDarkMode ? "var(--header-color)" : "#000";
    languageLegend.style.padding = "0 8px";
    const languageLegendStrong = document.createElement("strong");
    languageLegendStrong.textContent = t("languageSettings");
    languageLegend.appendChild(languageLegendStrong);
    languageFieldset.appendChild(languageLegend);

    const languageContainer = document.createElement("div");
    languageContainer.style.display = "flex";
    languageContainer.style.justifyContent = "space-between";
    languageContainer.style.alignItems = "center";
    languageContainer.style.marginBottom = "10px";

    const languageLabel = document.createElement("label");
    languageLabel.style.color = isDarkMode ? "var(--grey-2)" : "#333";
    languageLabel.style.marginRight = "15px";
    languageLabel.textContent = t("language");
    languageContainer.appendChild(languageLabel);

    const languageSelect = document.createElement("select");
    languageSelect.id = "language";
    languageSelect.style.width = "60%";
    languageSelect.style.minWidth = "150px";
    languageSelect.style.background = isDarkMode ? "var(--grey-7)" : "white";
    languageSelect.style.color = isDarkMode ? "#fff" : "#333";
    languageSelect.style.padding = "5px";
    languageSelect.style.borderRadius = "4px";

    const autoOption = document.createElement("option");
    autoOption.value = "auto";
    autoOption.textContent = t("langAuto");
    if (SETTINGS.language === "auto") autoOption.selected = true;
    languageSelect.appendChild(autoOption);

    const enOption = document.createElement("option");
    enOption.value = "en";
    enOption.textContent = t("langEn");
    if (SETTINGS.language === "en") enOption.selected = true;
    languageSelect.appendChild(enOption);

    const ruOption = document.createElement("option");
    ruOption.value = "ru";
    ruOption.textContent = t("langRu");
    if (SETTINGS.language === "ru") ruOption.selected = true;
    languageSelect.appendChild(ruOption);

    languageContainer.appendChild(languageSelect);
    languageFieldset.appendChild(languageContainer);

    const languageNotice = document.createElement("div");
    languageNotice.id = "languageNotice";
    languageNotice.className = "language-notice";
    const noticeBg = isDarkMode ? "#4a3c00" : "#fff3cd";
    const noticeBorder = isDarkMode ? "#ffd700" : "#ffc107";
    const noticeText = isDarkMode ? "#ffd700" : "#856404";
    languageNotice.style.background = noticeBg;
    languageNotice.style.borderLeft = `4px solid ${noticeBorder}`;
    languageNotice.style.color = noticeText;
    
    const noticeStrong = document.createElement("strong");
    noticeStrong.textContent = t("reloadNotice");
    languageNotice.appendChild(noticeStrong);
    languageNotice.style.display = "none";
    
    languageFieldset.appendChild(languageNotice);
    editorContainer.appendChild(languageFieldset);

    // Buttons container
    const buttonsContainer = document.createElement("div");
    buttonsContainer.style.display = "flex";
    buttonsContainer.style.justifyContent = "end";
    buttonsContainer.style.marginTop = "15px";

    const saveButton = document.createElement("button");
    saveButton.id = "saveSettings";
    saveButton.style.padding = "10px 20px";
    saveButton.style.background = "#4CAF50";
    saveButton.style.color = "white";
    saveButton.style.border = "none";
    saveButton.style.borderRadius = "5px";
    saveButton.style.cursor = "pointer";
    saveButton.style.fontWeight = "bold";
    saveButton.textContent = t("saveButton");
    buttonsContainer.appendChild(saveButton);

    const closeButton = document.createElement("button");
    closeButton.id = "closeEditor";
    closeButton.style.marginLeft = "15px";
    closeButton.style.padding = "10px 20px";
    closeButton.style.background = "#f44336";
    closeButton.style.color = "white";
    closeButton.style.border = "none";
    closeButton.style.borderRadius = "5px";
    closeButton.style.cursor = "pointer";
    closeButton.textContent = t("cancelButton");
    buttonsContainer.appendChild(closeButton);

    editorContainer.appendChild(buttonsContainer);
    editor.appendChild(editorContainer);

    // Add event handlers
    languageSelect.addEventListener("change", (e) => {
      languageNotice.style.display = "block";
    });

    closeButton.addEventListener("click", () => {
      document.body.removeChild(editor);
    });

    const getInputValue = (id) => {
      const el = document.getElementById(id);
      if (!el) return null;
      if (el.type === "checkbox") return el.checked;
      if (el.type === "range" || el.type === "number")
        return parseFloat(el.value);
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