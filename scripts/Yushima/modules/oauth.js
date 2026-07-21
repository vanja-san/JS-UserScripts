/**
 * OAuth Authentication Handler
 */
class OAuthHandler {
  static lastAuthCheck = 0;
  static lastAuthResult = null;

  /**
   * Check if user is authenticated
   * @returns {Promise<boolean>} Whether the user is authenticated
   */
  static async isAuthenticated() {
    // Cache authentication result for a short period to prevent multiple API calls
    const now = Date.now();
    if (now - OAuthHandler.lastAuthCheck < 2000) { // 2 second cache
      return OAuthHandler.lastAuthResult;
    }

    const token = await ShikimoriAPI.getAccessToken();
    const isAuthenticated = token !== null;

    OAuthHandler.lastAuthCheck = now;
    OAuthHandler.lastAuthResult = isAuthenticated;

    return isAuthenticated;
  }
  /**
   * Initiate OAuth authentication flow
   */
  static async initiateAuthFlow() {
    return OAuthHandler.showAuthCodeInput();
  }
  /**
   * Process authorization code from URL parameters
   * @param {string} code - The authorization code
   * @returns {Promise<boolean>} Whether authentication was successful
   */
  static async processAuthorizationCode(code) {
    const success = await ShikimoriAPI.exchangeCodeForToken(code);
    if (success) {
      // Reset auth cache since authentication state has changed
      OAuthHandler.lastAuthCheck = 0;
      OAuthHandler.lastAuthResult = null;
    }
    return success;
  }
  /**
   * Auto-authentication: opens auth window and waits for cross-tab signal.
   * The actual code detection happens in the popup's own userscript instance
   * (via pushState/popstate/MutationObserver hooks in yushima.user.js).
   * Falls back to manual code input via Settings if auto-detection fails.
   */
  static async showAuthCodeInput() {
    const authUrl = await createAuthUrl();
    window.open(authUrl, 'shikimori_auth_window', 'width=800,height=600,scrollbars=yes,resizable=yes');
    logMessage(Localization.get('oauthWindowOpened'), 'info');
  }

  /**
   * Get current language based on page content
   * @returns {string} Language code ('en' or 'ru')
   */
  static getCurrentLanguage() {
    return isEnglishPage() ? 'en' : 'ru';
  }
}
