// Конфигурация для NRL.user.js
window.CONFIG = {
  CACHE_VERSION: 'v1.0.4', // Updated version to invalidate cache after pluralization fixes
  DB_NAME: 'translationCache',
  DB_VERSION: 1,
  STORE_NAME: 'translations',
  COMPRESSION_THRESHOLD: 100,
  MEMORY_CACHE_LIMIT: 1500, // Increased from 1000 to 1500
  BATCH_SIZE: 50, // Increased for faster processing
  BATCH_DELAY: 5, // Reduced delay for faster processing
  MAX_NODES_PER_WALK: 10000, // Added for performance control
  MAX_ELEMENTS_PER_BATCH: 5000, // Added for performance control
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