async function fetchSecretsFromGist() {
  // Получаем client_secret из GM-хранилища (устаревшее название функции для обратной совместимости)
  const storedSecret = GM_getValue('yushima_client_secret');
  if (storedSecret) {
    try {
      // Декодируем Base64-закодированный client_secret
      const decodedSecret = atob(storedSecret);
      if (/^[a-zA-Z0-9_-]+$/.test(decodedSecret)) {
        return {
          client_id: 'QGgOhZu0sah_CnzwgLKIWu6Nil8STVCirCYhlAq7tmo', // фиксированный client_id
          client_secret: decodedSecret
        };
      }
    } catch (decodeError) {
      logMessage('Error decoding stored client_secret. Using fallback secrets.', 'error');
    }
  }

  // Если не удалось получить из хранилища, используем резервные значения
  return fetchEncodedSecretsBackup();
}

/**
 * Backup function with encoded secrets (fallback if Gist unavailable)
 * @returns {Object|null} Object containing client_id, client_secret
 */
function fetchEncodedSecretsBackup() {
  // Используем фиксированный client_id и Base64-закодированный client_secret
  const clientId = 'QGgOhZu0sah_CnzwgLKIWu6Nil8STVCirCYhlAq7tmo';
  const encodedSecret = 'dk1JUXE3YXg5WGthcXhsaUZ6c0daTGpfOHJLQUxrcHFzcXFFbjhBMkVaaw==';

  try {
    const decodedSecret = atob(encodedSecret);
    return {
      client_id: clientId,
      client_secret: decodedSecret
    };
  } catch (error) {
    logMessage('Error decoding fallback secrets: ' + error.message, 'error');
    return null;
  }
}

/**
 * Set client_secret in GM storage (Base64 encoded)
 * @param {string} secret - The client_secret to store
 */
function setClientSecret(secret) {
  try {
    // Проверяем, что secret имеет правильный формат
    if (/^[a-zA-Z0-9_-]+$/.test(secret)) {
      // Кодируем secret в Base64 для хранения
      const encodedSecret = btoa(secret);
      GM_setValue('yushima_client_secret', encodedSecret);
      logMessage('Client secret successfully stored in GM storage', 'success');
      return true;
    } else {
      logMessage('Invalid client_secret format', 'error');
      return false;
    }
  } catch (error) {
    logMessage('Error storing client_secret: ' + error.message, 'error');
    return false;
  }
}

/**
 * Get client_secret from GM storage
 * @returns {string|null} The decoded client_secret or null if not found
 */
function getClientSecret() {
  const storedSecret = GM_getValue('yushima_client_secret');
  if (storedSecret) {
    try {
      return atob(storedSecret);
    } catch (error) {
      logMessage('Error decoding stored client_secret: ' + error.message, 'error');
      return null;
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
    console.error('Error fetching anime title:', error);
  }
  // If we couldn't fetch title, return the ID as fallback
  return animeId;
}

/**
 * Create OAuth authorization URL
 * @returns {string} Authorization URL
 */
function createAuthUrl() {
  // Используем фиксированный client_id
  const clientId = 'QGgOhZu0sah_CnzwgLKIWu6Nil8STVCirCYhlAq7tmo';

  return `${CONSTANTS.OAUTH.AUTH_URL}?client_id=${clientId}&redirect_uri=${encodeURIComponent(CONSTANTS.OAUTH.REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(CONSTANTS.OAUTH.SCOPES)}`;
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
      onerror: reject
    });
  });
}

/**
 * Determine if current page is in English based on headline content
 * @returns {boolean} Whether the page is in English
 */
function isEnglishPage() {
  const currentHeadline = document.querySelector('.subheadline');
  return currentHeadline && currentHeadline.textContent.includes('Information');
}

/** 
 * Clean up ALL existing players and their resources to prevent memory leaks
 */
function cleanupExistingPlayer() {
  const existingPlayers = document.querySelectorAll(`.${CONSTANTS.PLAYER_CLASS}`);
  existingPlayers.forEach(player => {
    if (player.resizeObserver) {
      player.resizeObserver.disconnect();
      player.resizeObserver = null;
    }
    player.remove();
  });
  const remainingPlayers = document.querySelectorAll(`.${CONSTANTS.PLAYER_CLASS}`);
  if (remainingPlayers.length > 0) {
    logMessage(Localization.get('playerElementsExistAfterCleanup', { count: remainingPlayers.length }), 'warn');
    remainingPlayers.forEach(player => {
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
 */
async function checkForAuthorizationCode() {
  // Проверяем параметр code в URL
  const urlParams = new URLSearchParams(window.location.search);
  let code = urlParams.get('code');

  // Проверяем также, может быть, это URL, который был скопирован с кодом авторизации
  if (!code) {
    // Ищем код авторизации в хеше URL (на случай, если он есть в #fragment)
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    code = hashParams.get('code');
  }

  // А также проверяем хеш в формате #code=... как альтернативу
  if (!code && window.location.hash) {
    const match = window.location.hash.match(/[#&]code=([^&]*)/);
    if (match) {
      code = decodeURIComponent(match[1]);
    }
  }

  if (code) {
    // Удаляем параметр code из URL, чтобы избежать повторной обработки
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.delete('code');
    currentUrl.hash = currentUrl.hash.replace(/[#&]code=[^&]*/, '');
    if (currentUrl.href !== window.location.href) {
      window.history.replaceState({}, document.title, currentUrl.href);
    }

    const success = await OAuthHandler.processAuthorizationCode(code);
    if (success) {
      logMessage(Localization.get('authSuccess'), 'success');
      // Добавляем небольшую задержку перед перезагрузкой для отображения сообщения
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } else {
      logMessage(Localization.get('authFailed'), 'error');
      alert(Localization.get('authFailed') + ' ' + 'Please try again.');
    }
  } else {
    // Дополнительно проверяем, может быть, пользователь скопировал URL с кодом вручную
    const currentUrl = window.location.href;
    if (currentUrl.includes('code=')) {
      const manualCodeMatch = currentUrl.match(/[?&]code=([^&]*)/);
      if (manualCodeMatch) {
        const manualCode = decodeURIComponent(manualCodeMatch[1]);
        if (manualCode) {
          const success = await OAuthHandler.processAuthorizationCode(manualCode);
          if (success) {
            logMessage(Localization.get('authSuccess'), 'success');
            setTimeout(() => {
              window.location.reload();
            }, 1000);
          } else {
            logMessage(Localization.get('authFailed'), 'error');
            alert(Localization.get('authFailed') + ' ' + 'Please try again.');
          }
        }
      }
    }
  }
}