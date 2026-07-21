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
   * Auto-authentication: opens auth window and polls for the authorization code.
   * Falls back to manual code input via Settings if auto-detection fails.
   */
  static async showAuthCodeInput() {
    const authUrl = await createAuthUrl();
    const authWindow = window.open(authUrl, 'shikimori_auth_window', 'width=800,height=600,scrollbars=yes,resizable=yes');
    logMessage(Localization.get('oauthWindowOpened'), 'info');

    // Try to auto-detect the code in the opened window
    let attempts = 0;
    const maxAttempts = 180; // 3 minutes (180 * 1s)

    const pollInterval = setInterval(async () => {
      attempts++;
      try {
        // Check if the window is still open
        if (!authWindow || authWindow.closed) {
          clearInterval(pollInterval);
          return;
        }

        let code = null;

        // 1. Try to get code from URL — query param, hash, or path segment (/authorize/CODE)
        try {
          const url = authWindow.location.href;

          // 1a. Query param ?code=
          let urlCode = new URL(url).searchParams.get('code');
          if (urlCode) code = urlCode;

          // 1b. Path segment: /authorize/CODE (Shikimori OOB)
          if (!code) {
            const pathSegments = new URL(url).pathname.split('/');
            const authorizeIndex = pathSegments.indexOf('authorize');
            if (authorizeIndex !== -1 && authorizeIndex + 1 < pathSegments.length) {
              const pathCode = pathSegments[authorizeIndex + 1];
              if (pathCode && /^[a-zA-Z0-9._-]+$/.test(pathCode)) {
                code = pathCode;
              }
            }
          }
        } catch (e) {
          // Cross-origin or other error - silently continue
        }

        // 2. Try to extract code from page content (for OOB flow)
        if (!code) {
          try {
            const doc = authWindow.document;
            if (doc && doc.body) {
              // 2a. Look for <code id="authorization_code"> (Shikimori OOB exact element)
              const codeEl = doc.querySelector('#authorization_code, code.b-code');
              if (codeEl) {
                const trimmed = codeEl.textContent.trim();
                if (trimmed && /^[a-zA-Z0-9_-]{20,}$/.test(trimmed)) {
                  code = trimmed;
                }
              }

              // 2b. Any <code> element with long content
              if (!code) {
                const codeEl = doc.querySelector('code');
                if (codeEl) {
                  const trimmed = codeEl.textContent.trim();
                  if (trimmed && /^[a-zA-Z0-9_-]{20,}$/.test(trimmed)) {
                    code = trimmed;
                  }
                }
              }

              // 2c. Look for text after known labels
              if (!code) {
                const text = doc.body.textContent || '';
                const labelMatch = text.match(/(?:код\s*авторизации|authorization\s*code|code)\s*:?\s*([a-zA-Z0-9_-]{20,})/i);
                if (labelMatch) {
                  code = labelMatch[1];
                }
              }

              // 2d. Fallback: any long alphanumeric string
              if (!code) {
                const text = doc.body.textContent || '';
                const fallbackMatch = text.match(/([a-zA-Z0-9_-]{20,})/);
                if (fallbackMatch) {
                  code = fallbackMatch[1];
                }
              }
            }
          } catch (e) {
            // Cross-origin or body not ready
          }
        }

        if (code) {
          clearInterval(pollInterval);
          authWindow.close();

          const success = await OAuthHandler.processAuthorizationCode(code);
          if (success) {
            logMessage(Localization.get('authSuccess'), 'success');
            localStorage.setItem('yushima_auth_timestamp', Date.now().toString());
            setTimeout(() => window.location.reload(), 1000);
          } else {
            logMessage(Localization.get('authFailed'), 'error');
            alert(Localization.get('authFailed') + ' ' + Localization.get('pleaseTryAgain') + '\n\n' +
              Localization.get('authEnterCodeTitle') + ': ' + Localization.get('authInstructionsStep5'));
          }
        }
      } catch (e) {
        // Ignore polling errors
      }

      if (attempts >= maxAttempts) {
        clearInterval(pollInterval);
        logMessage(Localization.get('authFailed') + ' ' + Localization.get('pleaseTryAgain'), 'error');
      }
    }, 1000);
  }

  /**
   * Get current language based on page content
   * @returns {string} Language code ('en' or 'ru')
   */
  static getCurrentLanguage() {
    return isEnglishPage() ? 'en' : 'ru';
  }
}
