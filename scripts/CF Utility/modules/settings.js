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

    // Helper function to apply styles to elements
    function setStyles(element, styles) {
        Object.assign(element.style, styles);
        return element;
    }

    // Function to create settings UI
    function showSettings() {
        const settings = loadSettings();

        // Create overlay
        const overlay = setStyles(document.createElement('div'), {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            zIndex: '9999',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
        });

        // Create settings container
        const container = setStyles(document.createElement('div'), {
            padding: '20px',
            borderRadius: '8px',
            width: '400px',
            maxHeight: '80vh',
            overflowY: 'auto',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            fontFamily: 'Arial, sans-serif',
            border: '1px solid #ccc'
        });
        container.className = 'cfutility-settings-dialog'; // Add class for theme CSS

        // Title
        const title = setStyles(document.createElement('h2'), {
            marginTop: '0',
            marginBottom: '20px'
        });
        title.textContent = 'CF Utility Settings';
        container.appendChild(title);

        // Create form
        const form = document.createElement('form');

        // Enabled checkbox
        const enabledLabel = setStyles(document.createElement('label'), {
            display: 'flex',
            alignItems: 'center',
            marginBottom: '15px',
            gap: '8px'
        });
        enabledLabel.innerHTML = `
            <input type="checkbox" id="cfutility_enabled" style="width: auto; height: auto; transform: scale(1); margin: 0;" ${settings.enabled ? 'checked' : ''}>
            <span>Enable CF Utility</span>
        `;
        form.appendChild(enabledLabel);

        // Theme selection
        const themeLabel = setStyles(document.createElement('label'), {
            display: 'flex',
            alignItems: 'center',
            marginBottom: '15px',
            gap: '8px'
        });
        themeLabel.innerHTML = `
            <span>Theme:</span>
            <select id="cfutility_theme">
                <option value="default" ${settings.theme === 'default' ? 'selected' : ''}>System</option>
                <option value="dark" ${settings.theme === 'dark' ? 'selected' : ''}>Dark</option>
                <option value="light" ${settings.theme === 'light' ? 'selected' : ''}>Light</option>
            </select>
        `;
        form.appendChild(themeLabel);

        // Save button with event listener
        const saveButton = setStyles(document.createElement('button'), {
            type: 'button',
            marginRight: '10px',
            padding: '8px 16px',
            cursor: 'pointer'
        });
        saveButton.textContent = 'Save Settings';
        saveButton.addEventListener('click', function() {
            const newSettings = {
                enabled: document.getElementById('cfutility_enabled').checked,
                theme: document.getElementById('cfutility_theme').value
            };
            updateSettings(newSettings);

            // Close settings
            document.body.removeChild(overlay);

            alert('Settings saved successfully!');
        });
        form.appendChild(saveButton);

        // Cancel button with event listener
        const cancelButton = setStyles(document.createElement('button'), {
            type: 'button',
            padding: '8px 16px',
            cursor: 'pointer'
        });
        cancelButton.textContent = 'Cancel';
        cancelButton.addEventListener('click', function() {
            document.body.removeChild(overlay);
        });
        form.appendChild(cancelButton);

        container.appendChild(form);
        overlay.appendChild(container);
        document.body.appendChild(overlay);
    }

    // Function to create CSS styles for settings dialog
    function createSettingsStyles() {
        return `
            .cfutility-settings-dialog {
                background-color: #fff;
                color: #000;
            }

            @media (prefers-color-scheme: dark) {
                .cfutility-settings-dialog {
                    background-color: #2d2d2d;
                    color: #e0e0e0;
                }

                .cfutility-settings-dialog input,
                .cfutility-settings-dialog select,
                .cfutility-settings-dialog button {
                    background-color: #404040;
                    color: #e0e0e0;
                    border: 1px solid #555;
                }
            }

            @media (prefers-color-scheme: light) {
                .cfutility-settings-dialog {
                    background-color: #ffffff;
                    color: #000;
                }

                .cfutility-settings-dialog input,
                .cfutility-settings-dialog select,
                .cfutility-settings-dialog button {
                    background-color: #ffffff;
                    color: #000;
                    border: 1px solid #ccc;
                }
            }
        `;
    }

    // Apply the settings dialog styles when the module loads
    GM_addStyle(createSettingsStyles());

    // Menu ID for the settings command (to allow unregistering)
    let settingsMenuId = null;

    // Function to register the settings menu command
    function registerSettingsMenu() {
        if (settingsMenuId !== null) {
            GM_unregisterMenuCommand(settingsMenuId);
        }
        settingsMenuId = GM_registerMenuCommand('CF Utility Settings', showSettings);
    }

    // Expose functions globally so they can be used by the main script
    window.cfUtilitySettings = {
        loadSettings,
        saveSettings,
        getSettings,
        updateSettings,
        showSettings,
        registerSettingsMenu
    };

})();