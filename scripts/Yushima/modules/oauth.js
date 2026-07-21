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
    // Use the out-of-band flow as originally designed
    const authUrl = await createAuthUrl();
    // Use a named window so we can potentially reference it later
    window.open(authUrl, 'shikimori_auth_window', 'width=800,height=600,scrollbars=yes,resizable=yes');

    logMessage(Localization.get('oauthWindowOpened'), 'info');
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
   * Opens auth window and prompts user to paste the authorization code
   */
  static async showAuthCodeInput() {
    // Open the authentication page in a new window
    const authUrl = await createAuthUrl();
    window.open(authUrl, 'shikimori_auth_window', 'width=800,height=600,scrollbars=yes,resizable=yes');

    logMessage(Localization.get('oauthWindowOpened'), 'info');

    // Create a simple dialog for pasting the authorization code
    const theme = getSiteTheme();
    const styles = getThemeStyles(theme);

    const existingDialog = document.getElementById('yushima-auth-code-dialog');
    if (existingDialog) existingDialog.remove();

    const dialog = document.createElement('div');
    dialog.id = 'yushima-auth-code-dialog';
    Object.assign(dialog.style, {
      position: 'fixed',
      top: '20%',
      left: '30%',
      width: '40%',
      background: styles.settingsBg,
      padding: '20px',
      border: '1px solid ' + styles.settingsBorder,
      zIndex: 10001,
      fontFamily: 'Arial, sans-serif',
      color: styles.settingsText,
      borderRadius: '8px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
    });

    dialog.innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">' +
        '<h3 style="margin:0;font-size:15px">' + Localization.get('authEnterCodeTitle') + '</h3>' +
        '<span id="yushima-auth-close" style="cursor:pointer;font-size:20px;line-height:1">&times;</span>' +
      '</div>' +
      '<div style="font-size:12px;margin-bottom:12px;line-height:1.6">' +
        '<p style="margin:0 0 4px">' + Localization.get('authInstructionsStep1') + '</p>' +
        '<p style="margin:0 0 4px">' + Localization.get('authInstructionsStep2') + '</p>' +
        '<p style="margin:0 0 4px">' + Localization.get('authInstructionsStep3') + '</p>' +
        '<p style="margin:0 0 4px">' + Localization.get('authInstructionsStep4') + '</p>' +
        '<p style="margin:0">' + Localization.get('authInstructionsStep5') + '</p>' +
      '</div>' +
      '<div style="display:flex;gap:8px">' +
        '<input id="yushima-auth-code-input" type="text" placeholder="' + Localization.get('authEnterCodePlaceholder') + '" ' +
          'style="flex:1;padding:8px;font-size:13px;background:' + styles.settingsInputBg + ';color:' + styles.settingsInputText + ';border:1px solid ' + styles.settingsBorder + ';border-radius:4px">' +
        '<button id="yushima-auth-apply-code" style="padding:8px 16px;background:#3498db;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:13px">' + Localization.get('authEnterCodeButton') + '</button>' +
      '</div>';

    document.body.appendChild(dialog);

    document.getElementById('yushima-auth-close').onclick = () => dialog.remove();
    document.getElementById('yushima-auth-apply-code').onclick = async () => {
      const code = document.getElementById('yushima-auth-code-input').value.trim();
      if (!code) return;
      dialog.remove();
      const success = await OAuthHandler.processAuthorizationCode(code);
      if (success) {
        logMessage(Localization.get('authSuccess'), 'success');
        localStorage.setItem('yushima_auth_timestamp', Date.now().toString());
        setTimeout(() => window.location.reload(), 1000);
      } else {
        alert(Localization.get('authFailed') + ' ' + Localization.get('pleaseTryAgain'));
      }
    };
    // Allow pressing Enter to submit
    document.getElementById('yushima-auth-code-input').onkeydown = (e) => {
      if (e.key === 'Enter') document.getElementById('yushima-auth-apply-code').click();
    };
    setTimeout(() => document.getElementById('yushima-auth-code-input').focus(), 100);
  }

  /**
   * Get current language based on page content
   * @returns {string} Language code ('en' or 'ru')
   */
  static getCurrentLanguage() {
    return isEnglishPage() ? 'en' : 'ru';
  }
}
