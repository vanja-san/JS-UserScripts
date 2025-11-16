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
            backgroundColor: 'var(--bg-color, #fff)',
            color: 'var(--text-color, #000)',
            padding: '20px',
            borderRadius: '8px',
            width: '400px',
            maxHeight: '80vh',
            overflowY: 'auto',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            fontFamily: 'Arial, sans-serif'
        });

        // Title
        const title = setStyles(document.createElement('h2'), {
            marginTop: '0',
            marginBottom: '20px',
            color: 'var(--text-color, #000)'
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
            <select id="cfutility_theme" style="padding: 5px; border-radius: 4px; border: 1px solid #ccc; background-color: var(--input-bg, #fff); color: var(--text-color, #000);">
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
            border: 'none',
            borderRadius: '4px',
            backgroundColor: '#007cba',
            color: 'white',
            cursor: 'pointer'
        });
        saveButton.textContent = 'Save Settings';
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

        // Cancel button with event listener
        const cancelButton = setStyles(document.createElement('button'), {
            type: 'button',
            padding: '8px 16px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            backgroundColor: 'transparent',
            color: 'var(--text-color, #000)',
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

    // Helper function to apply styles to elements
    function setStyles(element, styles) {
        Object.assign(element.style, styles);
        return element;
    }

    // Function to create CSS styles
    function createThemeStyles(themeName) {
        const styles = {
            dark: `
                .cfutility-theme-dark {
                    color: #e0e0e0 !important;
                    background-color: #2d2d2d !important;
                }
                .cfutility-theme-dark * {
                    color: #e0e0e0 !important;
                    background-color: #2d2d2d !important;
                }
            `,
            light: `
                .cfutility-theme-light {
                    color: #000 !important;
                    background-color: #fff !important;
                }
                .cfutility-theme-light * {
                    color: #000 !important;
                    background-color: #fff !important;
                }
            `,
            system: `
                .cfutility-theme-system {
                    color: initial;
                    background-color: initial;
                }

                @media (prefers-color-scheme: dark) {
                    .cfutility-theme-system {
                        color: #e0e0e0;
                        background-color: #2d2d2d;
                    }
                    .cfutility-theme-system * {
                        color: #e0e0e0;
                        background-color: #2d2d2d;
                    }
                }

                @media (prefers-color-scheme: light) {
                    .cfutility-theme-system {
                        color: #000;
                        background-color: #fff;
                    }
                    .cfutility-theme-system * {
                        color: #000;
                        background-color: #fff;
                    }
                }
            `
        };

        return styles[themeName] || '';
    }

    // Function to apply theme
    function applyTheme(themeName) {
        // Remove existing theme classes
        document.body.classList.remove('cfutility-theme-default', 'cfutility-theme-dark', 'cfutility-theme-light', 'cfutility-theme-system');

        // Apply new theme class
        if (themeName === 'default') {
            // System theme - use prefers-color-scheme media query
            document.body.classList.add('cfutility-theme-system');
            GM_addStyle(createThemeStyles('system'));
        } else {
            document.body.classList.add(`cfutility-theme-${themeName}`);

            // Add custom styles based on theme if needed
            const themeStyles = createThemeStyles(themeName);
            if (themeStyles) {
                GM_addStyle(themeStyles);
            }
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