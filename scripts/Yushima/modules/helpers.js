// ─── PKCE (Proof Key for Code Exchange) ───────────────────────────────────────
// Вместо client_secret используем PKCE — стандарт OAuth 2.0 для публичных клиентов.
// Это безопаснее: даже если код авторизации перехвачен, без code_verifier его
// нельзя обменять на токен.

/**
 * Generate a cryptographically random PKCE code verifier (43–128 chars)
 * @returns {string} Base64url-encoded random string
 */
function generatePKCEVerifier() {
  const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const array = new Uint8Array(43);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => charset[byte % charset.length]).join("");
}

/**
 * Compute PKCE code challenge = base64url(sha256(codeVerifier))
 * @param {string} verifier - The code verifier
 * @returns {Promise<string>} Base64url-encoded SHA-256 hash
 */
async function generatePKCEChallenge(verifier) {
  const encoder = new TextEncoder();
  const hash = await crypto.subtle.digest("SHA-256", encoder.encode(verifier));
  return base64urlEncode(new Uint8Array(hash));
}

/**
 * Base64url encode a byte array (no padding)
 * @param {Uint8Array} bytes
 * @returns {string}
 */
function base64urlEncode(bytes) {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Get or create the PKCE code verifier, stored in GM storage
 * @returns {Promise<{verifier: string, challenge: string}>}
 */
async function getOrCreatePKCEVerifier() {
  let verifier = GM_getValue("yushima_pkce_verifier");
  if (!verifier) {
    verifier = generatePKCEVerifier();
    GM_setValue("yushima_pkce_verifier", verifier);
  }
  const challenge = await generatePKCEChallenge(verifier);
  return { verifier, challenge };
}

/**
 * Clear the stored PKCE verifier (should be done after successful auth)
 */
function clearPKCEVerifier() {
  GM_deleteValue("yushima_pkce_verifier");
}

// ─── Client ID (публичный, безопасно хранить в коде) ─────────────────────────
const YUSHIMA_CLIENT_ID = "QGgOhZu0sah_CnzwgLKIWu6Nil8STVCirCYhlAq7tmo";

/**
 * Get the OAuth client ID
 * @returns {string} The client ID
 */
function getClientId() {
  return YUSHIMA_CLIENT_ID;
}

/**
 * Fetch OAuth client_secret from GM storage (for fallback / refresh scenarios)
 * @returns {Promise<string|null>} The client_secret or null if not configured
 */
async function fetchClientSecret() {
  const storedConfig = GM_getValue("yushima_config_auth");
  if (storedConfig) {
    try {
      const decodedConfig = atob(storedConfig);
      if (/^[a-zA-Z0-9_-]+$/.test(decodedConfig)) {
        return decodedConfig;
      }
    } catch (decodeError) {
      logMessage(Localization.get("errorDecodingConfigBackup"), "error");
    }
  }
  return null;
}

/**
 * Format time in seconds to minutes and seconds
 * @param {number} seconds - Time in seconds
 * @returns {Object} Object with minutes and seconds properties
 */
function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return { minutes, seconds: remainingSeconds };
}

/**
 * Get anime title by ID
 * @param {string} animeId - The anime ID
 * @returns {Promise<string>} Anime title or ID if title not found
 */
async function getAnimeTitle(animeId) {
  try {
    const animeData = await ShikimoriAPI.fetchApi(`/animes/${animeId}`);
    if (animeData) {
      // Check if the page language is in English context by checking for English text elements
      const isEnglish = isEnglishPage();

      // Prefer English name if English context, otherwise use Russian
      if (isEnglish && animeData.name) {
        return animeData.name; // English name
      } else if (animeData.russian) {
        return animeData.russian; // Russian name
      } else if (animeData.name) {
        return animeData.name; // Fallback to English name if Russian not available
      }
    }
  } catch (error) {
    console.error("Error fetching anime title:", error);
  }
  // If we couldn't fetch title, return the ID as fallback
  return animeId;
}

/**
 * Create OAuth authorization URL with PKCE code challenge
 * @returns {Promise<string>} Authorization URL
 */
async function createAuthUrl() {
  const clientId = getClientId();
  const { challenge } = await getOrCreatePKCEVerifier();

  return `${CONSTANTS.OAUTH.AUTH_URL}?client_id=${clientId}` +
    `&redirect_uri=${encodeURIComponent(CONSTANTS.OAUTH.REDIRECT_URI)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent(CONSTANTS.OAUTH.SCOPES)}` +
    `&code_challenge=${challenge}` +
    `&code_challenge_method=S256`;
}

/**
 * Make HTTP request using GM_xmlhttpRequest with promise wrapper
 * @param {Object} options - Request options
 * @returns {Promise<Object>} Promise that resolves with response data
 */
function makeHttpRequest(options) {
  return new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      ...options,
      onload: resolve,
      onerror: reject,
    });
  });
}

/**
 * Determine if current page is in English
 * Checks <html lang> attribute first, falls back to headline content
 * @returns {boolean} Whether the page is in English
 */
function isEnglishPage() {
  // Primary: check <html lang="..."> attribute (most reliable)
  const htmlLang = document.documentElement.getAttribute("lang");
  if (htmlLang) {
    return htmlLang.startsWith("en");
  }

  // Fallback: check headline content (for SPA pages that may not set lang)
  const currentHeadline = document.querySelector(".subheadline");
  return currentHeadline && currentHeadline.textContent.includes("Information");
}

/**
 * Clean up ALL existing players and their resources to prevent memory leaks
 */
function cleanupExistingPlayer() {
  const existingPlayers = document.querySelectorAll(
    `.${CONSTANTS.PLAYER_CLASS}`,
  );
  existingPlayers.forEach((player) => {
    // Вызываем cleanup для удаления обработчиков событий
    if (player.cleanup) {
      player.cleanup();
    }
    if (player.resizeObserver) {
      player.resizeObserver.disconnect();
      player.resizeObserver = null;
    }
    player.remove();
  });
  const remainingPlayers = document.querySelectorAll(
    `.${CONSTANTS.PLAYER_CLASS}`,
  );
  if (remainingPlayers.length > 0) {
    logMessage(
      Localization.get("playerElementsExistAfterCleanup", {
        count: remainingPlayers.length,
      }),
      "warn",
    );
    remainingPlayers.forEach((player) => {
      if (player.cleanup) {
        player.cleanup();
      }
      if (player.resizeObserver) {
        player.resizeObserver.disconnect();
        player.resizeObserver = null;
      }
      player.remove();
    });
  }
}

/**
 * Check URL for authorization code and process it if present
 * Searches in: query params, hash fragment, path segments (e.g. /authorize/CODE), and inline code=
 */
async function checkForAuthorizationCode() {
  let code = extractAuthorizationCode();

  if (code) {
    // Очищаем URL от кода авторизации
    cleanAuthorizationCodeFromUrl();

    const success = await OAuthHandler.processAuthorizationCode(code);
    if (success) {
      logMessage(Localization.get("authSuccess"), "success");
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } else {
      logMessage(Localization.get("authFailed"), "error");
      alert(
        Localization.get("authFailed") + " " + Localization.get("pleaseTryAgain"),
      );
    }
  }
}

/**
 * Extract authorization code from various URL locations
 * @returns {string|null} The authorization code or null
 */
function extractAuthorizationCode() {
  // 1. Check query parameter "code"
  const urlParams = new URLSearchParams(window.location.search);
  let code = urlParams.get("code");
  if (code) return code;

  // 2. Check hash fragment "code"
  const hashParams = new URLSearchParams(window.location.hash.substring(1));
  code = hashParams.get("code");
  if (code) return code;

  // 3. Check hash in format #code=...
  if (window.location.hash) {
    const match = window.location.hash.match(/[#&]code=([^&]*)/);
    if (match) {
      return decodeURIComponent(match[1]);
    }
  }

  // 4. Check path segments: /authorize/CODE
  const pathSegments = window.location.pathname.split("/");
  const authorizeIndex = pathSegments.indexOf("authorize");
  if (authorizeIndex !== -1 && authorizeIndex + 1 < pathSegments.length) {
    const pathCode = pathSegments[authorizeIndex + 1];
    if (pathCode && /^[a-zA-Z0-9._-]+$/.test(pathCode)) {
      return pathCode;
    }
  }

  // 5. Fallback: inline code= in full URL
  const fullUrl = window.location.href;
  if (fullUrl.includes("code=")) {
    const manualMatch = fullUrl.match(/[?&]code=([^&]*)/);
    if (manualMatch) {
      return decodeURIComponent(manualMatch[1]);
    }
  }

  return null;
}

/**
 * Clean authorization code from URL to prevent re-processing
 */
function cleanAuthorizationCodeFromUrl() {
  const currentUrl = new URL(window.location.href);
  currentUrl.searchParams.delete("code");
  currentUrl.hash = currentUrl.hash.replace(/[#&]code=[^&]*/, "");
  if (currentUrl.href !== window.location.href) {
    window.history.replaceState({}, document.title, currentUrl.href);
  }
}
