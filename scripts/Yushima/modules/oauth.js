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
      logMessage('Please authorize the application in the opened window. After authorizing, the window will automatically close and you will be back on this page.', 'info');
    } else {
      logMessage('Please authorize the application in the opened window. After authorizing, you will be redirected to a page with an authorization code. The code should appear in your browsers address bar. The script will automatically detect the code if you return to this page.', 'info');
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
   * Show authentication code input dialog
   */
  static async showAuthCodeInput() {
    // Check if there's already an authorization code in the current URL (in the path)
    const pathSegments = window.location.pathname.split('/');
    const authorizeIndex = pathSegments.indexOf('authorize');

    let code = null;
    if (authorizeIndex !== -1 && authorizeIndex + 1 < pathSegments.length) {
      code = pathSegments[authorizeIndex + 1]; // The code is the next segment after 'authorize'
      // Verify it looks like a valid code (alphanumeric, hyphens, underscores, and dots)
      if (code && !/^[a-zA-Z0-9._-]+$/.test(code)) {
        code = null; // Not a valid code format
      }
    }

    // Check also in query parameters (for fallback compatibility)
    if (!code) {
      const urlParams = new URLSearchParams(window.location.search);
      code = urlParams.get('code');
    }

    // Check also in hash
    if (!code && window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      code = hashParams.get('code');

      // Also try regex match for hash in format #code=... or &#code=...
      if (!code) {
        const match = window.location.hash.match(/[#&]code=([^&]*)/);
        if (match) {
          code = decodeURIComponent(match[1]);
        }
      }
    }

    // If we found a code in the URL, process it directly
    if (code) {
      // Remove the code from URL to prevent duplicate processing
      // For path-based codes, we need to reconstruct the URL
      const newPath = pathSegments.slice(0, authorizeIndex + 1).join('/') + '/';
      const currentUrl = new URL(window.location.href);
      currentUrl.pathname = newPath;
      currentUrl.searchParams.delete('code');
      currentUrl.hash = currentUrl.hash.replace(/[#&]code=[^&]*/, '');

      if (currentUrl.href !== window.location.href) {
        window.history.replaceState({}, document.title, currentUrl.href);
      }

      // Process the authorization code
      const success = await OAuthHandler.processAuthorizationCode(code);
      if (success) {
        logMessage(Localization.get('authSuccess'), 'success');
        window.location.reload();
      } else {
        logMessage(Localization.get('authFailed'), 'error');
        alert(Localization.get('authFailed') + ' ' + 'Please try again.');
      }
      return; // Exit early, no need to show the dialog
    }

    // Check if user is already authenticated (could happen if auth completed in another tab)
    const isAuth = await OAuthHandler.isAuthenticated();
    if (isAuth) {
      logMessage('User is already authenticated', 'info');
      alert('User is already authenticated. No need to enter an authorization code.');
      return; // Exit early, no need to show the dialog
    }

    // Open the authentication page in a new window
    const authUrl = createAuthUrl();
    window.open(authUrl, 'shikimori_auth_window', 'width=800,height=600,scrollbars=yes,resizable=yes');

    // Show the code input dialog
    const theme = getSiteTheme();
    const styles = getThemeStyles(theme);

    const codeEntryHtml = `
      <div id="yushima-code-entry" style="position: fixed; top: 30%; left: 36%; background: ${styles.settingsBg}; padding: 20px; border: 1px solid ${styles.settingsBorder}; z-index: 10002; color: ${styles.settingsText}; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
          <h3 style="margin: 0; color: ${styles.headerColor};">${Localization.get('authEnterCodeTitle')}</h3>
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
          <button id="apply-code-btn" style="padding: 8px 15px; background: #437b63; color: ${styles.headerColor}; border-radius: 3px; cursor: pointer;">${Localization.get('authEnterCodeButton')}</button>
          <button id="cancel-code-btn" style="padding: 8px 15px; background: ${styles.buttonBg}; color: ${styles.buttonColor}; border: 1px solid ${styles.settingsBorder}; border-radius: 3px; cursor: pointer;">${Localization.get('settingsCancelButton')}</button>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', codeEntryHtml);

    // Add event listeners
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

    // Allow Enter key to submit in code input
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
    return isEnglishPage() ? 'en' : 'ru';
  }
}
