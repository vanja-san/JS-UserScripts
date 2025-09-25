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
    const clientId = 'QGgOhZu0sah_CnzwgLKIWu6Nil8STVCirCYhlAq7tmo'; // Use the known client ID
    const authUrl = `${CONSTANTS.OAUTH.AUTH_URL}?client_id=${clientId}&redirect_uri=${encodeURIComponent(CONSTANTS.OAUTH.REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(CONSTANTS.OAUTH.SCOPES)}`;
    window.open(authUrl, '_blank');
    logMessage('Please authorize the application in the opened window. After authorizing, you will be redirected to a page with an authorization code. The code should appear in your browsers address bar. The script will automatically detect the code if you return to this page.', 'info');
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
   * Show authentication code input dialog
   */
  static async showAuthCodeInput() {
    // Open the authentication page in a new window
    const clientId = 'QGgOhZu0sah_CnzwgLKIWu6Nil8STVCirCYhlAq7tmo';
    const authUrl = `${CONSTANTS.OAUTH.AUTH_URL}?client_id=${clientId}&redirect_uri=${encodeURIComponent(CONSTANTS.OAUTH.REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(CONSTANTS.OAUTH.SCOPES)}`;
    window.open(authUrl, '_blank');

    // Show the code input dialog
    const theme = getSiteTheme();
    const styles = getThemeStyles(theme);

    const codeEntryHtml = `
      <div id="yushima-code-entry" style="position: fixed; top: 30%; left: 30%; width: 40%; background: ${styles.settingsBg}; padding: 20px; border: 1px solid ${styles.settingsBorder}; z-index: 10002; font-family: Arial, sans-serif; color: ${styles.settingsText}; border-radius: 5px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
          <h3 style="margin: 0; color: ${styles.headerColor};">${Localization.get('authEnterCodeTitle')}</h3>
          <button id="close-code-entry" style="background: ${styles.buttonBg}; color: ${styles.buttonColor}; border: none; cursor: pointer; font-size: 16px; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">×</button>
        </div>
        <div style="margin-bottom: 15px;">
          <p style="margin: 0 0 10px 0;">${Localization.get('authInstructionsStep1')}</p>
          <p style="margin: 0 0 10px 0;">${Localization.get('authInstructionsStep2')}</p>
          <p style="margin: 0 0 10px 0;">${Localization.get('authInstructionsStep3')}</p>
          <p style="margin: 0 0 10px 0;">${Localization.get('authInstructionsStep4')}</p>
          <p style="margin: 0 0 15px 0;">${Localization.get('authInstructionsStep5')}</p>
          <label style="display: block; margin-bottom: 5px;">${Localization.get('authEnterCodeLabel')}</label>
          <input type="text" id="auth-code-input" placeholder="${Localization.get('authEnterCodePlaceholder')}" style="width: 100%; padding: 8px; background: ${styles.settingsInputBg}; color: ${styles.settingsInputText}; border: 1px solid ${styles.settingsBorder}; border-radius: 3px; box-sizing: border-box;">
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 10px;">
          <button id="apply-code-btn" style="padding: 8px 15px; background: ${styles.headerBg}; color: ${styles.headerColor}; border: 1px solid ${styles.settingsBorder}; border-radius: 3px; cursor: pointer;">${Localization.get('authEnterCodeButton')}</button>
          <button id="cancel-code-btn" style="padding: 8px 15px; background: ${styles.buttonBg}; color: ${styles.buttonColor}; border: 1px solid ${styles.settingsBorder}; border-radius: 3px; cursor: pointer;">${Localization.get('settingsCancelButton')}</button>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', codeEntryHtml);

    // Add event listeners
    document.getElementById('close-code-entry').addEventListener('click', () => {
      document.getElementById('yushima-code-entry').remove();
    });

    document.getElementById('cancel-code-btn').addEventListener('click', () => {
      document.getElementById('yushima-code-entry').remove();
    });

    document.getElementById('apply-code-btn').addEventListener('click', async () => {
      const codeInput = document.getElementById('auth-code-input');
      const code = codeInput.value.trim();

      if (code) {
        document.getElementById('yushima-code-entry').remove();
        const success = await OAuthHandler.processAuthorizationCode(code);
        if (success) {
          logMessage(Localization.get('authSuccess'), 'success');
          // Refresh the page to update the UI
          window.location.reload();
        } else {
          logMessage(Localization.get('authFailed'), 'error');
          alert(Localization.get('authFailed') + ' ' + 'Please try again.');
        }
      } else {
        alert('Please enter an authorization code.');
      }
    });

    // Allow Enter key to submit
    document.getElementById('auth-code-input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        document.getElementById('apply-code-btn').click();
      }
    });
  }

  /**
   * Get current language based on page content
   * @returns {string} Language code ('en' or 'ru')
   */
  static getCurrentLanguage() {
    const currentHeadline = document.querySelector('.subheadline');
    if (currentHeadline) {
      const isEnglish = currentHeadline.textContent.includes('Information');
      return isEnglish ? 'en' : 'ru';
    }
    return 'ru';
  }
}