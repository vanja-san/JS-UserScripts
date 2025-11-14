async function fetchSecretsFromGist() {
  try {
    const response = await fetch('https://api.github.com/gists/38004606679e706b40b4090d115407ad');
    if (response.status === 200) {
      const gistData = await response.json();
      const content = Object.values(gistData.files)[0].content;

      // Декодируем содержимое как Base64 (предполагаем, что в Gist хранится Base64-кодированый JSON)
      try {
        const decodedContent = atob(content.trim());
        const secrets = JSON.parse(decodedContent);

        // Проверяем, что полученные данные соответствуют ожидаемому формату
        if (secrets.client_id && secrets.client_secret &&
            secrets.client_id.length === 43 &&
            /^[a-zA-Z0-9_-]+$/.test(secrets.client_id) &&
            /^[a-zA-Z0-9_-]+$/.test(secrets.client_secret)) {
          return {
            client_id: secrets.client_id,
            client_secret: secrets.client_secret
          };
        } else {
          logMessage('Invalid secrets format in Gist (incorrect structure). Using fallback secrets.', 'warn');
          return fetchEncodedSecretsBackup();
        }
      } catch (decodeError) {
        // Если декодирование Base64 или парсинг JSON не удался
        logMessage('Invalid secrets format in Gist (not Base64-encoded JSON). Using fallback secrets.', 'warn');
        return fetchEncodedSecretsBackup();
      }
    } else {
      logMessage(`Failed to fetch secrets from Gist: ${response.status}. This might be due to GitHub API rate limits or network issues. Using fallback secrets.`, 'error');
      return fetchEncodedSecretsBackup();
    }
  } catch (error) {
    logMessage(`Error fetching secrets from Gist: ${error.message}. This might be due to GitHub API rate limits or network issues. Using fallback secrets.`, 'error');
    return fetchEncodedSecretsBackup();
  }
}

/**
 * Backup function with encoded secrets (fallback if Gist unavailable)
 * @returns {Object|null} Object containing client_id, client_secret
 */
function fetchEncodedSecretsBackup() {
  try {
    // This uses an encoded form of the default secrets to avoid plaintext in source
    const encodedSecrets = "eyJjbGllbnRfaWQiOiJRUGdPaFp1MHNhaF9Dbnp3Z0xLSVVXdTZObWlsOFNUVkNpclNZaGxBcTd0bW8iLCJjbGllbnRfc2VjcmV0Ijoidk1JUXE3YXg5WGthcXhsaUZ6c0daTGpfOHJLQUxrcHFzcXFFbjhBMkVaayJ9";
    const decodedSecrets = atob(encodedSecrets);
    const secrets = JSON.parse(decodedSecrets);
    return {
      client_id: secrets.client_id,
      client_secret: secrets.client_secret
    };
  } catch (error) {
    logMessage('Error decoding fallback secrets: ' + error.message, 'error');
    return null;
  }
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
 * @returns {Promise<string>} Authorization URL (asynchronously fetches client_id)
 */
async function createAuthUrl() {
  let clientId = 'QGgOhZu0sah_CnzwgLKIWu6Nil8STVCirCYhlAq7tmo'; // fallback default

  // Fetch secrets from gist to get the correct client_id
  const remoteSecrets = await fetchSecretsFromGist();
  if (remoteSecrets && remoteSecrets.client_id) {
    clientId = remoteSecrets.client_id;
  }

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