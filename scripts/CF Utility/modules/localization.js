/**
 * CF Utility Localization Module
 * Handles localization for CF Utility (Russian/English)
 */

(function() {
    'use strict';

    // Dictionary with translations
    const translations = {
        'en': {
            'settingsTitle': 'CF Utility Settings',
            'enableUtility': 'Enable CF Utility',
            'enableDirectDownloads': 'Enable Direct Downloads',
            'saveSettings': 'Save Settings',
            'cancel': 'Cancel',
            'settingsSaved': 'Settings saved successfully!',
            'directDownloadsDisabled': 'Direct downloads are disabled in settings.'
        },
        'ru': {
            'settingsTitle': 'Настройки CF Utility',
            'enableUtility': 'Включить CF Utility',
            'enableDirectDownloads': 'Включить прямое скачивание',
            'saveSettings': 'Сохранить настройки',
            'cancel': 'Отмена',
            'settingsSaved': 'Настройки успешно сохранены!',
            'directDownloadsDisabled': 'Прямое скачивание отключено в настройках.'
        }
    };

    // Function to detect system language
    function getSystemLanguage() {
        // Check browser language
        const browserLang = navigator.language || navigator.userLanguage || 'en';
        // Support English and Russian
        if (browserLang.startsWith('ru')) {
            return 'ru';
        }
        return 'en'; // Default to English
    }

    // Get user's preferred language (system default or previously saved)
    function getPreferredLanguage() {
        // Try to get saved language from storage
        const savedLang = GM_getValue('cfutility_language', null);
        if (savedLang && translations[savedLang]) {
            return savedLang;
        }
        
        // If not saved, use system language
        return getSystemLanguage();
    }

    // Function to get text in current language
    function getText(key) {
        const currentLang = getPreferredLanguage();
        if (translations[currentLang] && translations[currentLang][key]) {
            return translations[currentLang][key];
        } else if (translations['en'][key]) {
            // Fallback to English if key not found in current language
            return translations['en'][key];
        } else {
            // Return the key itself if no translation found
            return key;
        }
    }

    // Function to set language
    function setLanguage(lang) {
        if (translations[lang]) {
            GM_setValue('cfutility_language', lang);
            return true;
        }
        return false;
    }

    // Function to get available languages
    function getAvailableLanguages() {
        return Object.keys(translations);
    }

    // Expose functions globally so they can be used by the main script
    window.cfUtilityLocalization = {
        getText,
        setLanguage,
        getPreferredLanguage,
        getAvailableLanguages
    };

})();