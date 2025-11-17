/**
 * CF Utility Settings Module
 * Handles settings management for CF Utility
 */

(function() {
    'use strict';

    // Default settings
    const defaultSettings = {
        enabled: true,
        downloadEnabled: true,
        roundedCornersEnabled: true, // Enable rounded corners by default
        language: null, // Use system default if not set
        // Add more settings as needed
    };

    // Load settings from storage
    const loadSettings = () => {
        const savedSettings = GM_getValue('cfutility_settings');
        return savedSettings ? { ...defaultSettings, ...savedSettings } : defaultSettings;
    };

    // Save settings to storage
    const saveSettings = (settings) => GM_setValue('cfutility_settings', settings);

    // Get current settings
    const getSettings = loadSettings;

    // Update settings
    const updateSettings = (newSettings) => {
        const currentSettings = getSettings();
        // Only update the fields that are in newSettings, don't override theme
        const updatedSettings = { ...currentSettings, ...newSettings };
        saveSettings(updatedSettings);
        return updatedSettings;
    };

    // Backup settings to localStorage as additional safety
    const backupSettings = (settings) => {
        try {
            const settingsToBackup = { ...settings, backupTimestamp: new Date().toISOString() };
            localStorage.setItem('cfutility_settings_backup', JSON.stringify(settingsToBackup));
            return true;
        } catch (error) {
            window.cfUtilityErrorHandling?.error('Failed to backup settings', { error: error.message });
            return false;
        }
    };

    // Restore settings from backup
    const restoreFromBackup = () => {
        try {
            const backupData = localStorage.getItem('cfutility_settings_backup');
            if (backupData) {
                const backupSettings = JSON.parse(backupData);
                // Only restore settings keys that exist in default settings
                const restoredSettings = {};
                for (const [key, value] of Object.entries(backupSettings)) {
                    if (key !== 'backupTimestamp') {
                        restoredSettings[key] = value;
                    }
                }

                if (Object.keys(restoredSettings).length > 0) {
                    saveSettings(restoredSettings);
                    return restoredSettings;
                }
            }
            return null;
        } catch (error) {
            window.cfUtilityErrorHandling?.error('Failed to restore settings from backup', { error: error.message });
            return null;
        }
    };

    // Export settings as JSON string
    const exportSettings = () => {
        try {
            const settings = loadSettings();
            const exportData = {
                version: '1.0',
                timestamp: new Date().toISOString(),
                settings: settings
            };
            return JSON.stringify(exportData, null, 2);
        } catch (error) {
            window.cfUtilityErrorHandling?.error('Failed to export settings', { error: error.message });
            return null;
        }
    };

    // Import settings from JSON string
    const importSettings = (importString) => {
        try {
            const importData = JSON.parse(importString);
            if (importData && importData.settings) {
                // Validate that we're importing settings and not arbitrary data
                const importedSettings = importData.settings;

                // Only update with valid settings keys
                const validatedSettings = {};
                for (const [key, value] of Object.entries(importedSettings)) {
                    if (key in defaultSettings || key === 'language') {
                        validatedSettings[key] = value;
                    }
                }

                if (Object.keys(validatedSettings).length > 0) {
                    saveSettings(validatedSettings);
                    return validatedSettings;
                }
            }
            return null;
        } catch (error) {
            window.cfUtilityErrorHandling?.error('Failed to import settings', { error: error.message });
            return null;
        }
    };

    // Helper function to apply styles to elements
    const setStyles = (element, styles) => Object.assign(element.style, styles) && element;

    // Function to create settings UI
    const showSettings = () => {
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
            width: '500px',
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
        title.textContent = window.cfUtilityLocalization?.getText('settingsTitle') || 'CF Utility Settings';
        container.appendChild(title);

        // Create form
        const form = document.createElement('form');

        // Define settings configuration
        const settingConfigs = [
            { id: 'cfutility_enabled', key: 'enabled', textKey: 'enableUtility' },
            { id: 'cfutility_download_enabled', key: 'downloadEnabled', textKey: 'enableDirectDownloads' },
            { id: 'cfutility_rounded_corners_enabled', key: 'roundedCornersEnabled', textKey: 'enableRoundedCorners' }
        ];

        // Create checkboxes for settings
        settingConfigs.forEach(config => {
            const label = setStyles(document.createElement('label'), {
                display: 'flex',
                alignItems: 'center',
                marginBottom: '15px',
                gap: '8px'
            });
            label.innerHTML = `
                <input type="checkbox" id="${config.id}" style="width: auto; height: auto; transform: scale(1); margin: 0;" ${settings[config.key] ? 'checked' : ''}>
                <span>${window.cfUtilityLocalization?.getText(config.textKey) || config.textKey}</span>
            `;
            form.appendChild(label);
        });

        // Language selection
        const langLabel = setStyles(document.createElement('label'), {
            display: 'flex',
            alignItems: 'center',
            marginBottom: '15px',
            gap: '8px'
        });

        const availableLangs = window.cfUtilityLocalization?.getAvailableLanguages() || ['en', 'ru']; // Default languages

        const langOptions = availableLangs.map(lang => {
            const langName = lang === 'en' ? 'English' : lang === 'ru' ? 'Русский' : lang;
            const selected = (settings.language || window.cfUtilityLocalization?.getPreferredLanguage() || 'en') === lang ? 'selected' : '';
            return `<option value="${lang}" ${selected}>${langName}</option>`;
        }).join('');

        langLabel.innerHTML = `
            <span>${window.cfUtilityLocalization?.getText('language') || 'Language'}:</span>
            <select id="cfutility_language" style="padding: 5px; border-radius: 4px; border: 1px solid #ccc;">
                ${langOptions}
            </select>
        `;
        form.appendChild(langLabel);

        // Backup/Import section
        const backupSection = setStyles(document.createElement('div'), {
            marginTop: '20px',
            paddingTop: '15px',
            borderTop: '1px solid #ccc',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
        });

        const backupLabel = setStyles(document.createElement('label'), {
            fontWeight: 'bold'
        });
        backupLabel.textContent = window.cfUtilityLocalization?.getText('backupSectionTitle') || 'Settings Backup & Import';
        backupSection.appendChild(backupLabel);

        // Export button
        const exportButton = setStyles(document.createElement('button'), {
            type: 'button',
            padding: '8px 16px',
            cursor: 'pointer',
            marginBottom: '10px'
        });
        exportButton.textContent = window.cfUtilityLocalization?.getText('exportSettings') || 'Export Settings';
        exportButton.addEventListener('click', () => {
            const exportData = exportSettings();
            if (exportData) {
                // Create a temporary textarea to copy the settings
                const textArea = document.createElement('textarea');
                textArea.value = exportData;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);

                const message = window.cfUtilityLocalization?.getText('settingsExported') || 'Settings copied to clipboard!';
                if (window.cfUtilityNotifications) {
                    window.cfUtilityNotifications.success(message);
                } else {
                    alert(message);
                }
            } else {
                const message = window.cfUtilityLocalization?.getText('exportFailed') || 'Failed to export settings.';
                if (window.cfUtilityNotifications) {
                    window.cfUtilityNotifications.error(message);
                } else {
                    alert(message);
                }
            }
        });
        backupSection.appendChild(exportButton);

        // Import area
        const importLabel = setStyles(document.createElement('label'), {
            display: 'block',
            marginBottom: '5px'
        });
        importLabel.textContent = window.cfUtilityLocalization?.getText('importSettingsLabel') || 'Import Settings:';
        backupSection.appendChild(importLabel);

        const importTextarea = setStyles(document.createElement('textarea'), {
            width: '100%',
            height: '80px',
            padding: '5px',
            marginBottom: '10px',
            resize: 'vertical'
        });
        importTextarea.placeholder = window.cfUtilityLocalization?.getText('importPlaceholder') || 'Paste exported settings here...';
        backupSection.appendChild(importTextarea);

        const importButton = setStyles(document.createElement('button'), {
            type: 'button',
            padding: '8px 16px',
            cursor: 'pointer',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px'
        });
        importButton.textContent = window.cfUtilityLocalization?.getText('importSettings') || 'Import Settings';
        importButton.addEventListener('click', () => {
            if (importTextarea.value.trim()) {
                const imported = importSettings(importTextarea.value);
                if (imported) {
                    const message = window.cfUtilityLocalization?.getText('settingsImported') || 'Settings imported successfully! Reload the page to see changes.';
                    if (window.cfUtilityNotifications) {
                        window.cfUtilityNotifications.success(message);
                    } else {
                        alert(message);
                    }
                    // Close the settings dialog after import
                    document.body.removeChild(overlay);
                } else {
                    const message = window.cfUtilityLocalization?.getText('importFailed') || 'Failed to import settings. Please check the format.';
                    if (window.cfUtilityNotifications) {
                        window.cfUtilityNotifications.error(message);
                    } else {
                        alert(message);
                    }
                }
            } else {
                const message = window.cfUtilityLocalization?.getText('importEmpty') || 'Please paste settings to import.';
                if (window.cfUtilityNotifications) {
                    window.cfUtilityNotifications.warning(message);
                } else {
                    alert(message);
                }
            }
        });
        backupSection.appendChild(importButton);

        form.appendChild(backupSection);

        // Save button with event listener
        const saveButton = setStyles(document.createElement('button'), {
            type: 'button',
            marginRight: '10px',
            padding: '8px 16px',
            cursor: 'pointer'
        });
        saveButton.textContent = window.cfUtilityLocalization?.getText('saveSettings') || 'Save Settings';

        saveButton.addEventListener('click', () => {
            const newSettings = {
                language: document.getElementById('cfutility_language').value,
                ...Object.fromEntries(
                    settingConfigs.map(config => [config.key, document.getElementById(config.id).checked])
                )
            };

            const updatedSettings = updateSettings(newSettings);

            // Create backup of settings
            backupSettings(updatedSettings);

            // Update language if changed
            if (window.cfUtilityLocalization && newSettings.language) {
                window.cfUtilityLocalization.setLanguage(newSettings.language);
            }

            // Close settings
            document.body.removeChild(overlay);

            // Use notifications instead of alert
            if (window.cfUtilityNotifications) {
                window.cfUtilityNotifications.success(
                    window.cfUtilityLocalization?.getText('settingsSaved') || 'Settings saved successfully!'
                );
            } else {
                alert(window.cfUtilityLocalization?.getText('settingsSaved') || 'Settings saved successfully!');
            }
        });
        form.appendChild(saveButton);

        // Cancel button with event listener
        const cancelButton = setStyles(document.createElement('button'), {
            type: 'button',
            padding: '8px 16px',
            cursor: 'pointer'
        });
        cancelButton.textContent = window.cfUtilityLocalization?.getText('cancel') || 'Cancel';
        cancelButton.addEventListener('click', () => document.body.removeChild(overlay));
        form.appendChild(cancelButton);

        container.appendChild(form);
        overlay.appendChild(container);
        document.body.appendChild(overlay);
    };

    // Function to create CSS styles for settings dialog
    const createSettingsStyles = () => `
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
            .cfutility-settings-dialog button,
            .cfutility-settings-dialog textarea {
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
            .cfutility-settings-dialog button,
            .cfutility-settings-dialog textarea {
                background-color: #ffffff;
                color: #000;
                border: 1px solid #ccc;
            }
        }
    `;

    // Apply the settings dialog styles when the module loads
    GM_addStyle(createSettingsStyles());

    // Menu ID for the settings command (to allow unregistering)
    let settingsMenuId = null;

    // Function to register the settings menu command
    const registerSettingsMenu = () => {
        if (settingsMenuId !== null) {
            GM_unregisterMenuCommand(settingsMenuId);
        }
        const menuTitle = window.cfUtilityLocalization?.getText('settingsTitle') || 'CF Utility Settings';
        settingsMenuId = GM_registerMenuCommand(menuTitle, showSettings);
    };

    // Expose functions globally so they can be used by the main script
    window.cfUtilitySettings = {
        loadSettings,
        saveSettings,
        getSettings,
        updateSettings,
        backupSettings,
        restoreFromBackup,
        exportSettings,
        importSettings,
        showSettings,
        registerSettingsMenu
    };

})();