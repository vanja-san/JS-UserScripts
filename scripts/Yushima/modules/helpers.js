async function fetchSecretsFromGist() {
  try {
    const response = await fetch('https://api.github.com/gists/38004606679e706b40b4090d115407ad');
    if (response.status === 200) {
      const gistData = await response.json();
      const content = Object.values(gistData.files)[0].content;
      const decodedSecrets = atob(content.trim());
      const secrets = JSON.parse(decodedSecrets);
      return {
        client_id: secrets.client_id,
        client_secret: secrets.client_secret
      };
    } else {
      logMessage('Failed to fetch secrets from Gist: ' + response.status, 'error');
      return fetchEncodedSecretsBackup();
    }
  } catch (error) {
    logMessage('Error fetching secrets from Gist: ' + error.message, 'error');
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
    const encodedSecrets = "";
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
      const currentHeadline = document.querySelector('.subheadline');
      const isEnglish = currentHeadline && currentHeadline.textContent.includes('Information');

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
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  if (code) {
    const success = await OAuthHandler.processAuthorizationCode(code);
    if (success) {
      logMessage(Localization.get('authSuccess'), 'success');
      window.location.reload();
    } else {
      logMessage(Localization.get('authFailed'), 'error');
      alert(Localization.get('authFailed') + ' ' + 'Please try again.');
    }
  }
}