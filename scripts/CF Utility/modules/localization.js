/**
 * CF Utility Localization Module
 * Handles localization for CF Utility (Russian/English)
 */

(function() {
    'use strict';

    // Dictionary with translations
    const translations = {
        'en': {
            'settingsTitle': 'Settings',
            'enableUtility': 'Enable CF Utility',
            'enableDirectDownloads': 'Enable Direct Downloads',
            'enableRoundedCorners': 'Enable Rounded Corners',
            'language': 'Language',
            'saveSettings': 'Save',
            'cancel': 'Cancel',
            'settingsSaved': 'Settings saved successfully!',
            'directDownloadsDisabled': 'Direct downloads are disabled in settings.',
            'close': 'Close'
        },
        'ru': {
            'settingsTitle': 'Настройки',
            'enableUtility': 'Включить CF Utility',
            'enableDirectDownloads': 'Включить прямое скачивание',
            'enableRoundedCorners': 'Включить скругление углов',
            'language': 'Язык',
            'saveSettings': 'Сохранить',
            'cancel': 'Отмена',
            'settingsSaved': 'Настройки успешно сохранены!',
            'directDownloadsDisabled': 'Прямое скачивание отключено в настройках.',
            'close': 'Закрыть'
        }
    };

    // Function to detect system language
    const getSystemLanguage = () => {
        // Check browser language
        const browserLang = navigator.language || navigator.userLanguage || 'en';
        // Support English and Russian
        return browserLang.startsWith('ru') ? 'ru' : 'en'; // Default to English
    };

    // Get user's preferred language (system default or previously saved)
    const getPreferredLanguage = () => {
        // Try to get saved language from storage
        const savedLang = GM_getValue('cfutility_language', null);
        return (savedLang && translations[savedLang]) ? savedLang : getSystemLanguage();
    };

    // Function to get text in current language
    const getText = (key) => {
        const currentLang = getPreferredLanguage();
        return (translations[currentLang] && translations[currentLang][key])
            ? translations[currentLang][key]
            : translations['en'][key] || key; // Fallback to English or key itself
    };

    // Function to set language
    const setLanguage = (lang) => {
        const isValidLang = translations[lang] !== undefined;
        if (isValidLang) {
            GM_setValue('cfutility_language', lang);
        }
        return isValidLang;
    };

    // Function to get available languages
    const getAvailableLanguages = () => Object.keys(translations);

    // Expose functions globally so they can be used by the main script
    window.cfUtilityLocalization = {
        getText,
        setLanguage,
        getPreferredLanguage,
        getAvailableLanguages
    };

})();