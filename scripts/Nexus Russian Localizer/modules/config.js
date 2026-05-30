// ============================================
// Nexus Russian Localizer - Configuration
// Optimized version with improved defaults
// ============================================
window.CONFIG = {
  CACHE_VERSION: "v2.0.0", // New version for cache reset
  DB_NAME: "translationCache",
  DB_VERSION: 2, // Incremented for schema change (removed compression)
  STORE_NAME: "translations",
  MEMORY_CACHE_LIMIT: 800, // Reduced from 1500
  BATCH_SIZE: 30, // Optimal for performance
  BATCH_DELAY: 8, // ms between batches
  MAX_NODES_PER_WALK: 5000, // Limit for tree walker
  MAX_ELEMENTS_PER_BATCH: 2000, // Limit for element processing
  PRIORITY_SELECTORS: [
    "h1",
    "h2",
    "h3",
    "nav",
    "button",
    "a",
    '[data-translate-priority="high"]',
    ".title",
    ".header",
    ".nav-link",
  ],
  MUTATION_OBSERVER_OPTIONS: {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: [
      "title",
      "placeholder",
      "alt",
      "data-tooltip",
      "aria-label",
      "value",
      "data-text",
      "label",
    ],
    characterData: true,
    characterDataOldValue: false, // Set to false to reduce overhead
  },
  // New: throttle for mutation observer (ms)
  MUTATION_DEBOUNCE: 50,
  // New: enable incremental rendering (no page hide)
  INCREMENTAL_RENDERING: true,
  // New: log performance only in debug mode
  DEBUG: false,
};
