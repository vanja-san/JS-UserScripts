// ==UserScript==
// @name         Twecurs
// @namespace    http://tampermonkey.net/
// @version      0.0.30-dev
// @description  A utility script for Curseforge with customizable settings
// @author       vanja-san
// @match        https://curseforge.com/*
// @match        https://*.curseforge.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=curseforge.com
// @require      https://vanja-san.github.io/JS-UserScripts/scripts/CF%20Utility/modules/error-handling.js
// @require      https://vanja-san.github.io/JS-UserScripts/scripts/CF%20Utility/modules/notifications.js
// @require      https://vanja-san.github.io/JS-UserScripts/scripts/CF%20Utility/modules/settings.js
// @require      https://vanja-san.github.io/JS-UserScripts/scripts/CF%20Utility/modules/direct-dl.js
// @require      https://vanja-san.github.io/JS-UserScripts/scripts/CF%20Utility/modules/localization.js
// @require      https://vanja-san.github.io/JS-UserScripts/scripts/CF%20Utility/modules/rounded.js
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
// @run-at       document-start
// ==/UserScript==

(function () {
  "use strict";

  // Initialize the script after the settings module is loaded
  const initialize = () => {
    // Check if the error handling module is available
    if (window.cfUtilityErrorHandling) {
      // Set logging level based on development vs production
      const isDevelopment = GM_info.script.version.includes("-dev");
      window.cfUtilityErrorHandling.setLogLevel(
        isDevelopment
          ? window.cfUtilityErrorHandling.ERROR_LEVELS.DEBUG
          : window.cfUtilityErrorHandling.ERROR_LEVELS.WARN,
      );
    }

    // Check if the settings module is available
    if (window.cfUtilitySettings) {
      // Register the settings menu command
      window.cfUtilitySettings.registerSettingsMenu();
    } else {
      console.error("CF Utility Settings module not loaded");
    }

    // Log initialization for debugging
    console.log("CF Utility initialized");
  };

  // Run initialization when document is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize);
  } else {
    initialize();
  }
})();
