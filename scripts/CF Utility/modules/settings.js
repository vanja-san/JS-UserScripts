// ==UserScript==
// @name         CF Utility Settings Module
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  Settings module for CF Utility
// @author       You
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
// ==/UserScript==

/**
 * CF Utility Settings Module
 * Handles settings management for CF Utility
 */

(function() {
    'use strict';

    // Default settings
    const defaultSettings = {
        enabled: true,
        theme: 'default',
        // Add more settings as needed
    };

    // Load settings from storage
    function loadSettings() {
        const savedSettings = GM_getValue('cfutility_settings');
        if (savedSettings) {
            return { ...defaultSettings, ...savedSettings };
        }
        return defaultSettings;
    }

    // Save settings to storage
    function saveSettings(settings) {
        GM_setValue('cfutility_settings', settings);
    }

    // Get current settings
    function getSettings() {
        return loadSettings();
    }

    // Update settings
    function updateSettings(newSettings) {
        const currentSettings = getSettings();
        const updatedSettings = { ...currentSettings, ...newSettings };
        saveSettings(updatedSettings);
        return updatedSettings;
    }

    // Function to create settings UI
    function showSettings() {
        const settings = loadSettings();

        // Create overlay
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        overlay.style.zIndex = '9999';
        overlay.style.display = 'flex';
        overlay.style.justifyContent = 'center';
        overlay.style.alignItems = 'center';

        // Create settings container
        const container = document.createElement('div');
        container.style.backgroundColor = '#fff';
        container.style.padding = '20px';
        container.style.borderRadius = '8px';
        container.style.width = '400px';
        container.style.maxHeight = '80vh';
        container.style.overflowY = 'auto';

        // Title
        const title = document.createElement('h2');
        title.textContent = 'CF Utility Settings';
        title.style.marginTop = '0';
        container.appendChild(title);

        // Create form
        const form = document.createElement('form');

        // Enabled checkbox
        const enabledLabel = document.createElement('label');
        enabledLabel.style.display = 'block';
        enabledLabel.style.marginBottom = '15px';
        enabledLabel.innerHTML = `
            <input type="checkbox" id="cfutility_enabled" ${settings.enabled ? 'checked' : ''}>
            <span>Enable CF Utility</span>
        `;
        form.appendChild(enabledLabel);

        // Theme selection
        const themeLabel = document.createElement('label');
        themeLabel.style.display = 'block';
        themeLabel.style.marginBottom = '15px';
        themeLabel.innerHTML = `
            <span>Theme:</span>
            <select id="cfutility_theme" style="margin-left: 10px;">
                <option value="default" ${settings.theme === 'default' ? 'selected' : ''}>Default</option>
                <option value="dark" ${settings.theme === 'dark' ? 'selected' : ''}>Dark</option>
                <option value="light" ${settings.theme === 'light' ? 'selected' : ''}>Light</option>
            </select>
        `;
        form.appendChild(themeLabel);

        // Save button
        const saveButton = document.createElement('button');
        saveButton.type = 'button';
        saveButton.textContent = 'Save Settings';
        saveButton.style.marginRight = '10px';
        saveButton.addEventListener('click', function() {
            const newSettings = {
                enabled: document.getElementById('cfutility_enabled').checked,
                theme: document.getElementById('cfutility_theme').value
            };
            updateSettings(newSettings);

            // Close settings and update UI based on new settings
            document.body.removeChild(overlay);

            // Apply theme if needed
            applyTheme(newSettings.theme);

            alert('Settings saved successfully!');
        });
        form.appendChild(saveButton);

        // Cancel button
        const cancelButton = document.createElement('button');
        cancelButton.type = 'button';
        cancelButton.textContent = 'Cancel';
        cancelButton.addEventListener('click', function() {
            document.body.removeChild(overlay);
        });
        form.appendChild(cancelButton);

        container.appendChild(form);
        overlay.appendChild(container);
        document.body.appendChild(overlay);
    }

    // Function to apply theme
    function applyTheme(themeName) {
        // Remove existing theme classes
        document.body.classList.remove('cfutility-theme-default', 'cfutility-theme-dark', 'cfutility-theme-light');

        // Apply new theme class
        document.body.classList.add(`cfutility-theme-${themeName}`);

        // Add custom styles based on theme if needed
        switch(themeName) {
            case 'dark':
                GM_addStyle(`
                    .cfutility-theme-dark {
                        background-color: #2d2d2d !important;
                        color: #ffffff !important;
                    }
                    .cfutility-theme-dark * {
                        background-color: #2d2d2d !important;
                        color: #ffffff !important;
                    }
                `);
                break;
            case 'light':
                GM_addStyle(`
                    .cfutility-theme-light {
                        background-color: #ffffff !important;
                        color: #000000 !important;
                    }
                    .cfutility-theme-light * {
                        background-color: #ffffff !important;
                        color: #000000 !important;
                    }
                `);
                break;
        }
    }

    // Menu ID for the settings command (to allow unregistering)
    let settingsMenuId = null;

    // Function to register the settings menu command
    function registerSettingsMenu() {
        if (settingsMenuId !== null) {
            GM_unregisterMenuCommand(settingsMenuId);
        }
        settingsMenuId = GM_registerMenuCommand('CF Utility Settings', showSettings);
        
        // Apply the current theme
        const settings = loadSettings();
        applyTheme(settings.theme);
    }

    // Expose functions globally so they can be used by the main script
    window.cfUtilitySettings = {
        loadSettings,
        saveSettings,
        getSettings,
        updateSettings,
        showSettings,
        registerSettingsMenu,
        applyTheme
    };

})();