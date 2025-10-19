/**
 * Constants used throughout the script
 * @enum {string|number|RegExp}
 */
const CONSTANTS = {
  PLAYER_CLASS: 'c-player-yushima', /** CSS class name for the player wrapper */
  AUTH_BUTTON_CLASS: 'shikimori-auth-button', /** CSS class name for the authentication button */
  AUTH_STATUS_CLASS: 'shikimori-auth-status', /** CSS class name for the auth status indicator */
  ANIME_PATH_REGEX: /^\/animes\/[a-z]?\d+-([a-z0-9]+-?)+$/, /** Regex to identify anime pages */
  ANIME_ID_REGEX: /\/animes\/[a-z]?(\d+)-/, /** Regex to extract anime ID from URL */
  IFRAME_ASPECT_RATIO: 0.5625, /** Aspect ratio multiplier for 16:9 (9/16 = 0.5625) */
  PLAYER_INIT_DELAY: 100, /** Delay before initializing player to ensure DOM is ready */
  /** OAuth application details */
  OAUTH: {
    REDIRECT_URI: 'urn:ietf:wg:oauth:2.0:oob',
    AUTH_URL: 'https://shikimori.one/oauth/authorize',
    TOKEN_URL: 'https://shikimori.one/oauth/token',
    SCOPES: 'user_rates'
  },
};