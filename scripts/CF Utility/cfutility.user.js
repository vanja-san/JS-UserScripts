// ==UserScript==
// @name         CF Utility
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  A utility script for Codeforces with customizable settings
// @author       You
// @match        https://codeforces.com/*
// @match        https://*.codeforces.com/*
// @require      ./modules/settings.js
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