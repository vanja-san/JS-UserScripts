// ==UserScript==
// @name         CF Utility
// @namespace    http://tampermonkey.net/
// @version      0.0.9-dev
// @description  A utility script for Curseforge with customizable settings
// @author       vanja-san
// @match        https://curseforge.com/*
// @match        https://*.curseforge.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=curseforge.com
// @require      https://raw.githubusercontent.com/vanja-san/JS-UserScripts/main/scripts/CF Utility/modules/settings.js
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // Initialize the script after the settings module is loaded
    function initialize() {
        // Check if the settings module is available
        if (window.cfUtilitySettings) {
            // Register the settings menu command
            window.cfUtilitySettings.registerSettingsMenu();
        } else {
            console.error('CF Utility Settings module not loaded');
        }
    }

    // Run initialization when document is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

})();