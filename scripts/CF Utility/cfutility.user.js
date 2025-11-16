// ==UserScript==
// @name         CF Utility
// @namespace    http://tampermonkey.net/
// @version      0.0.25-dev
// @description  A utility script for Curseforge with customizable settings
// @author       vanja-san
// @match        https://curseforge.com/*
// @match        https://*.curseforge.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=curseforge.com
// @require      https://vanja-san.github.io/JS-UserScripts/scripts/CF%20Utility/modules/settings.js
// @require      https://vanja-san.github.io/JS-UserScripts/scripts/CF%20Utility/modules/direct-dl.js
// @require      https://vanja-san.github.io/JS-UserScripts/scripts/CF%20Utility/modules/localization.js
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

            // If the direct download module is available, process download links based on settings
            if (window.cfUtilityDirectDL) {
                // Process download links immediately
                window.cfUtilityDirectDL.processDownloadLinks();

                // Set up a mechanism to react to settings changes
                // For now, we'll just re-process the links when settings might have changed
                // This could be enhanced with a proper event system in the future
            }
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