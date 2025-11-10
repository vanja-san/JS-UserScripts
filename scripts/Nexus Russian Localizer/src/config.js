// Конфигурация для NRL.user.js
window.CONFIG = {
  CACHE_VERSION: 'v1.0.1',
  DB_NAME: 'translationCache',
  DB_VERSION: 1,
  STORE_NAME: 'translations',
  COMPRESSION_THRESHOLD: 100,
  MEMORY_CACHE_LIMIT: 1000,
  BATCH_SIZE: 50,
  BATCH_DELAY: 0,
  PRIORITY_SELECTORS: ['h1', 'h2', 'h3', 'nav', 'button', 'a', '[data-translate-priority="high"]']
};