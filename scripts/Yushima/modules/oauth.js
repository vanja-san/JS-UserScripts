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
  static initiateAuthFlow() {
    // Use the out-of-band flow as originally designed
    const authUrl = createAuthUrl();
    // Use a named window so we can potentially reference it later
    const authWindow = window.open(authUrl, 'shikimori_auth_window', 'width=800,height=600,scrollbars=yes,resizable=yes');

    if (authWindow) {
      logMessage('Authentication window opened. Please authorize the application and return to this page. The page will automatically refresh after successful authentication.', 'info');
    } else {
      logMessage('Authentication window opened. Please authorize the application and return to this page. The page will automatically refresh after successful authentication.', 'info');
    }
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
   * Show authentication code input dialog - REMOVED in favor of fully automated authentication
   * This function is kept for backwards compatibility but simply opens auth window
   */
  static showAuthCodeInput() {
    // Open the authentication page in a new window
    const authUrl = createAuthUrl();
    window.open(authUrl, 'shikimori_auth_window', 'width=800,height=600,scrollbars=yes,resizable=yes');

    logMessage('Authentication window opened. Please authorize the application and return to this page. The page will automatically refresh after successful authentication.', 'info');
  }

  /**
   * Get current language based on page content
   * @returns {string} Language code ('en' or 'ru')
   */
  static getCurrentLanguage() {
    return isEnglishPage() ? 'en' : 'ru';
  }
}
