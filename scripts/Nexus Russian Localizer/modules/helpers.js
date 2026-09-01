// Helper functions — backward-compatible wrappers around PluralizationEngine

/**
 * @deprecated Use window.pluralizationEngine.pluralize() instead
 */
window.pluralize = (number, forms) => {
  return window.pluralizationEngine?.pluralize(number, forms) || '';
};

/**
 * @deprecated Use window.pluralizationEngine.pluralMap instead
 */
window.PLURAL_MAP = {};

/**
 * @deprecated Suffix translations removed — suffixes kept as-is (k, m, b, t)
 */
window.SUFFIX_TRANSLATIONS = {};

// Initialize backward-compatible globals from the engine
window.addEventListener('DOMContentLoaded', () => {
  if (window.pluralizationEngine) {
    window.PLURAL_MAP = Object.fromEntries(window.pluralizationEngine.pluralMap);
  }
});

// Dynamic templates — populated from PluralizationEngine
// These are used by TranslationEngine.applyDynamicTemplates()
window.DYNAMIC_TEMPLATES = [];

// Initialize templates when engine is ready
if (window.pluralizationEngine) {
  window.DYNAMIC_TEMPLATES = window.pluralizationEngine.getTemplates();
}