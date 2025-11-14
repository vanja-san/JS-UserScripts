/**
 * Shikimori API interaction class
 */
class ShikimoriAPI {
  /** 
   * Check if current page is an anime page
   * @param {Location} url - The URL object to check
   * @returns {boolean} Whether the page is an anime page
   */
  static isAnimePage(url = window.location) {
    return CONSTANTS.ANIME_PATH_REGEX.test(url.pathname) || 
           document.querySelector('.c-anime-show') !== null ||
           document.querySelector('.b-db_entry') !== null;
  }
  
  /** 
   * Extract anime ID from current URL
   * @returns {string|null} Anime ID or null if not found
   */
  static getAnimeId() {
    const match = window.location.pathname.match(CONSTANTS.ANIME_ID_REGEX);
    if (match) {
      return match[1];
    }
    
    // Also check for anime ID in page elements as a fallback
    const animeShowElement = document.querySelector('.c-anime-show');
    if (animeShowElement && animeShowElement.dataset && animeShowElement.dataset.animeId) {
      return animeShowElement.dataset.animeId;
    }
    
    return null;
  }
  
  /**
   * Fetch data from Shikimori API
   * @param {string} endpoint - API endpoint to fetch
   * @param {boolean} useAuth - Whether to use OAuth authentication
   * @returns {Promise<Object|null>} API response or null if error
   */
  static async fetchApi(endpoint, useAuth = false) {
    try {
      const options = {
        method: 'GET',
        url: `//${window.location.hostname}/api${endpoint}`,
        headers: {
          'User-Agent': 'Yushima'
        }
      };
      if (useAuth) {
        const token = await this.getAccessToken();
        if (token) {
          options.headers['Authorization'] = `Bearer ${token}`;
        } else {
          logMessage(Localization.get('noAccessToken'), 'error');
          return null;
        }
      }
      const response = await makeHttpRequest(options);
      if (response.status === 200) {
        return JSON.parse(response.responseText);
      } else {
        logMessage(Localization.get('apiRequestFailed', { status: response.status }), 'error');
        return null;
      }
    } catch (error) {
      logMessage(Localization.get('apiError', { endpoint: endpoint }), 'error');
      return null;
    }
  }
  
  /**
   * Get the episode number the user is currently watching and max episodes for anime
   * @param {string} animeId - The anime ID
   * @returns {Promise<Object>} Object containing episode number and max episodes
   */
  static async getWatchingEpisode(animeId) {
    if (!animeId || typeof animeId !== 'string' || !/^\d+$/.test(animeId)) {
      logMessage(Localization.get('invalidAnimeId', { animeId: animeId }), 'error');
      return { episode: 1, maxEpisodes: 0 }; // Default to episode 1 with unknown max
    }
    try {
      const data = await this.fetchApi(`/animes/${animeId}`);
      if (!data) {
        logMessage(Localization.get('animeNotFound'), 'warn');
        return { episode: 1, maxEpisodes: 0 }; // Default to episode 1 with unknown max
      }
      
      // Get the max episodes from the anime data
      // The field might be called 'episodes' in the API response
      const maxEpisodes = data.episodes || 0;
      
      // Try multiple possible data structures for user rate
      let userRate = data.user_rate || data.userRate;
      if (!userRate && data.rates && Array.isArray(data.rates) && data.rates.length > 0) {
        userRate = data.rates[0];
      }

      if (userRate && typeof userRate.episodes === 'number' && userRate.episodes >= 0) {
        return { episode: userRate.episodes + 1, maxEpisodes };
      }
      // Try alternative field names
      if (userRate && (typeof userRate.episode === 'number' || typeof userRate.watched_episodes === 'number')) {
        const episodeValue = userRate.episode || userRate.watched_episodes || 0;
        return { episode: episodeValue + 1, maxEpisodes };
      }
      return { episode: 1, maxEpisodes }; // Default to episode 1 if no user rate or invalid data
    } catch (error) {
      logMessage(Localization.get('getWatchingEpisodeError', { error: error.message }), 'error');
      return { episode: 1, maxEpisodes: 0 };
    }
  }
  
  /**
   * Get access token from storage or refresh it if needed
   * @returns {Promise<string|null>} Access token or null if not available
   */
  static async getAccessToken() {
    const tokenData = GM_getValue('shikimori_oauth_token');
    if (!tokenData) {
      return null;
    }
    const { accessToken, refreshToken, expiresAt } = tokenData;
    // Check if token is expired
    if (Date.now() > expiresAt) {
      return await this.refreshAccessToken(refreshToken);
    }
    return accessToken;
  }
  
  /**
   * Refresh access token using refresh token
   * @param {string} refreshToken - The refresh token
   * @returns {Promise<string|null>} New access token or null if refresh failed
   */
  static async refreshAccessToken(refreshToken) {
    try {
      const params = new URLSearchParams();
      params.append('grant_type', 'refresh_token');
      let clientId = 'QGgOhZu0sah_CnzwgLIWu6Nil8STVCirCYhlAq7tmo'; // Use the known client ID
      let clientSecret = ''; // Will be fetched from gist

      // Fetch secrets from gist
      const remoteSecrets = await fetchSecretsFromGist();
      if (remoteSecrets && remoteSecrets.client_secret) {
        clientId = remoteSecrets.client_id;
        clientSecret = remoteSecrets.client_secret;
      }

      if (!clientSecret) {
        logMessage(Localization.get('oauthClientSecretMissing'), 'error');
        return null;
      }
      params.append('client_id', clientId);
      params.append('client_secret', clientSecret);
      params.append('refresh_token', refreshToken);
      const response = await makeHttpRequest({
        method: 'POST',
        url: CONSTANTS.OAUTH.TOKEN_URL,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Yushima'
        },
        data: params.toString()
      });
      if (response.status === 200) {
        const tokenData = JSON.parse(response.responseText);
        const newTokenData = {
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          expiresAt: Date.now() + (tokenData.expires_in * 1000) - 60000
        };
        GM_setValue('shikimori_oauth_token', newTokenData);
        // Reset auth cache since authentication state has changed
        if (typeof OAuthHandler !== 'undefined' && OAuthHandler.lastAuthCheck !== undefined) {
          OAuthHandler.lastAuthCheck = 0;
          OAuthHandler.lastAuthResult = null;
        }
        return tokenData.access_token;
      } else {
        logMessage(Localization.get('refreshAccessTokenError', { error: `Status ${response.status}` }), 'error');
        GM_deleteValue('shikimori_oauth_token');
        return null;
      }
    } catch (error) {
      logMessage(Localization.get('refreshAccessTokenError', { error: error.message }), 'error');
      return null;
    }
  }
  
  /**
   * Exchange authorization code for access token
   * @param {string} code - The authorization code
   * @returns {Promise<boolean>} Whether the exchange was successful
   */
  static async exchangeCodeForToken(code) {
    try {
      const params = new URLSearchParams();
      params.append('grant_type', 'authorization_code');
      let clientId = 'QGgOhZu0sah_CnzwgLIWu6Nil8STVCirCYhlAq7tmo';
      let clientSecret = '';

      // Fetch secrets from gist
      const remoteSecrets = await fetchSecretsFromGist();
      if (remoteSecrets && remoteSecrets.client_secret) {
        clientId = remoteSecrets.client_id;
        clientSecret = remoteSecrets.client_secret;
      }

      if (!clientSecret) {
        logMessage(Localization.get('oauthClientSecretMissing'), 'error');
        return false;
      }
      params.append('client_id', clientId);
      params.append('client_secret', clientSecret);
      params.append('code', code);
      params.append('redirect_uri', CONSTANTS.OAUTH.REDIRECT_URI);
      const response = await makeHttpRequest({
        method: 'POST',
        url: CONSTANTS.OAUTH.TOKEN_URL,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Yushima'
        },
        data: params.toString()
      });
      if (response.status === 200) {
        const tokenData = JSON.parse(response.responseText);
        const newTokenData = {
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          expiresAt: Date.now() + (tokenData.expires_in * 1000) - 60000
        };
        GM_setValue('shikimori_oauth_token', newTokenData);
        // Reset auth cache since authentication state has changed
        if (typeof OAuthHandler !== 'undefined' && OAuthHandler.lastAuthCheck !== undefined) {
          OAuthHandler.lastAuthCheck = 0;
          OAuthHandler.lastAuthResult = null;
        }
        return true;
      } else {
        logMessage(Localization.get('exchangeCodeError', { error: `Status ${response.status}` }), 'error');
        return false;
      }
    } catch (error) {
      logMessage(Localization.get('exchangeCodeError', { error: error.message }), 'error');
      return false;
    }
  }
  
  /**
   * Update user's episode progress for an anime
   * @param {string} animeId - The anime ID
   * @param {number} episode - The episode number to set
   * @returns {Promise<boolean>} Whether the update was successful
   */
  static async updateEpisodeProgress(animeId, episode) {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) {
        logMessage(Localization.get('getCurrentUserIdNotAvailable'), 'error');
        return false;
      }
      const userRate = await this.getUserRate(animeId, userId);
      let rateId;
      let method;
      let endpoint;
      if (userRate) {
        rateId = userRate.id;
        method = 'PATCH';
        endpoint = `/v2/user_rates/${rateId}`;
      } else {
        method = 'POST';
        endpoint = '/v2/user_rates';
      }
      const params = {
        user_id: userId,
        target_id: parseInt(animeId),
        target_type: 'Anime',
        episodes: episode,
        status: 'watching'
      };
      if (rateId) {
        params.id = rateId;
      }
      const token = await this.getAccessToken();
      if (!token) {
        logMessage(Localization.get('noAccessTokenForUpdate'), 'error');
        return false;
      }
      const response = await makeHttpRequest({
        method: method,
        url: `https://shikimori.one/api${endpoint}`,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Yushima',
          'Authorization': `Bearer ${token}`
        },
        data: JSON.stringify(params)
      });
      if ([200, 201].includes(response.status)) {
        return true;
      } else {
        logMessage(Localization.get('updateEpisodeProgressError', { status: response.status }), 'error');
        if (response.status === 404 || response.status === 422) {
          return await this.createAnimeRate(animeId, episode);
        }
        return false;
      }
    } catch (error) {
      logMessage(Localization.get('failedToUpdateProgress', { animeId: animeId, episode: episode }), 'error');
      return false;
    }
  }
  
  /**
   * Create a new anime rate entry for the user
   * @param {string} animeId - The anime ID
   * @param {number} episode - The episode number to set
   * @returns {Promise<boolean>} Whether the creation was successful
   */
  static async createAnimeRate(animeId, episode) {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) {
        logMessage(Localization.get('getCurrentUserIdNotAvailable'), 'error');
        return false;
      }
      const params = {
        user_id: userId,
        target_id: parseInt(animeId),
        target_type: 'Anime',
        episodes: episode,
        status: 'watching'
      };
      const token = await this.getAccessToken();
      if (!token) {
        logMessage(Localization.get('noAccessTokenForUpdate'), 'error');
        return false;
      }
      const response = await makeHttpRequest({
        method: 'POST',
        url: 'https://shikimori.one/api/v2/user_rates',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Yushima',
          'Authorization': `Bearer ${token}`
        },
        data: JSON.stringify(params)
      });
      if (response.status === 201) {
        return true;
      } else {
        logMessage(Localization.get('createAnimeRateError', { status: response.status }), 'warn');
        return false;
      }
    } catch (error) {
      logMessage(Localization.get('createAnimeRateError', { status: error.message }), 'error');
      return false;
    }
  }
  
  /**
   * Get the current user's ID
   * @returns {Promise<string|null>} User ID or null if not available
   */
  static async getCurrentUserId() {
    try {
      const token = await this.getAccessToken();
      if (!token) {
        return null;
      }
      const response = await makeHttpRequest({
        method: 'GET',
        url: 'https://shikimori.one/api/users/whoami',
        headers: {
          'User-Agent': 'Yushima',
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.status === 200) {
        const userData = JSON.parse(response.responseText);
        return userData.id.toString();
      } else {
        logMessage(Localization.get('getCurrentUserIdError', { error: `Status ${response.status}` }), 'warn');
        return null;
      }
    } catch (error) {
      logMessage(Localization.get('getCurrentUserIdError', { error: error.message }), 'error');
      return null;
    }
  }
  
  /**
   * Get user rate for a specific anime
   * @param {string} animeId - The anime ID
   * @param {string} userId - The user ID
   * @returns {Promise<Object|null>} User rate object or null if not found
   */
  static async getUserRate(animeId, userId) {
    try {
      const token = await this.getAccessToken();
      if (!token) {
        return null;
      }
      const params = new URLSearchParams({
        user_id: userId,
        target_id: animeId,
        target_type: 'Anime'
      });
      const response = await makeHttpRequest({
        method: 'GET',
        url: `https://shikimori.one/api/v2/user_rates?${params}`,
        headers: {
          'User-Agent': 'Yushima',
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.status === 200) {
        const rates = JSON.parse(response.responseText);
        return rates && rates.length > 0 ? rates[0] : null;
      } else if (response.status === 404) {
        return null;
      } else {
        logMessage(Localization.get('getUserRateError', { error: `Status ${response.status}` }), 'warn');
        return null;
      }
    } catch (error) {
      logMessage(Localization.get('getUserRateError', { error: error.message }), 'error');
      return null;
    }
  }
}