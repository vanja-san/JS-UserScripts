// Конфигурация для NRL.user.js
window.CONFIG = {
  CACHE_VERSION: 'v1.0.2', // Updated version to trigger cache cleanup
  DB_NAME: 'translationCache',
  DB_VERSION: 1,
  STORE_NAME: 'translations',
  COMPRESSION_THRESHOLD: 100,
  MEMORY_CACHE_LIMIT: 1500, // Increased from 1000 to 1500
  BATCH_SIZE: 30, // Reduced from 50 to 30 for better performance
  BATCH_DELAY: 10, // Added small delay to prevent blocking
  PRIORITY_SELECTORS: ['h1', 'h2', 'h3', 'nav', 'button', 'a', '[data-translate-priority="high"]', '.title', '.header', '.nav-link'],
  MUTATION_OBSERVER_OPTIONS: {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['title', 'placeholder', 'alt', 'data-tooltip', 'aria-label', 'value', 'data-text', 'label'],
    characterData: true,
    characterDataOldValue: true
  }
};