// ==UserScript==
// @name         Plasheek (Modular)
// @namespace    http://tampermonkey.net/
// @version      2.0.21
// @description  Оптимизированная интеграция плеера Kodik на сайт Shikimori с автоматическим отслеживанием просмотра
// @author       You
// @match        https://shikimori.one/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_registerMenuCommand
// @connect      shikimori.one
// @connect      kodik.info
// @connect      kodik.biz
// @run-at       document-idle
// @require      file://Z:\\User\\.dev\\Shiplaco\\modules\\constants.js
// @require      file://Z:\\User\\.dev\\Shiplaco\\modules\\localization.js
// @require      file://Z:\\User\\.dev\\Shiplaco\\modules\\settings.js
// @require      file://Z:\\User\\.dev\\Shiplaco\\modules\\theme.js
// @require      file://Z:\\User\\.dev\\Shiplaco\\modules\\helpers.js
// @require      file://Z:\\User\\.dev\\Shiplaco\\modules\\api.js
// @require      file://Z:\\User\\.dev\\Shiplaco\\modules\\oauth.js
// @require      file://Z:\\User\\.dev\\Shiplaco\\modules\\output.js
// @require      file://Z:\\User\\.dev\\Shiplaco\\modules\\player.js
// ==/UserScript==

(function() {
  'use strict';
  // Prevent multiple executions of the script by checking if it's already running
  if (window.plasheekScriptRunning) {
    return;
  }
  window.plasheekScriptRunning = true;

  /** 
   * Update the auth handler to reset flag after successful authentication
   */
  const originalProcessAuthorizationCode = OAuthHandler.processAuthorizationCode;
  OAuthHandler.processAuthorizationCode = async function(code) {
    const success = await originalProcessAuthorizationCode.call(this, code);
    if (success) {
      GM_setValue('shikimori_auth_initiated', false);
    }
    return success;
  };

  // Check for authorization code in URL (for OAuth callback)
  checkForAuthorizationCode();

  // Flag to prevent duplicate initialization
  let initializationInProgress = false;
  let lastInitializationTime = 0;

  /**
   * Initialize the player integration
   */
  async function initializePlayer() {
    const currentTime = Date.now();
    if (initializationInProgress || (currentTime - lastInitializationTime) < 1500) {
      return;
    }
    initializationInProgress = true;
    lastInitializationTime = currentTime;
    try {
      if (!ShikimoriAPI.isAnimePage()) {
        return;
      }
      cleanupExistingPlayer();
      const animeId = ShikimoriAPI.getAnimeId();
      if (!animeId) {
        return;
      }
      await KodikPlayer.createPlayer(animeId);
    } catch (error) {
      logMessage(Localization.get('playerHandlerError', { message: error.message }), 'error');
    } finally {
      initializationInProgress = false;
    }
  }

  // Log authentication status on script load
  setTimeout(async () => {
    const isAuthenticated = await OAuthHandler.isAuthenticated();
    if (!isAuthenticated) {
      logMessage(Localization.get('authRequiredMessage'), 'warn');
    }
  }, 1000);

  let playerAlreadyInitialized = false;

  // Function to safely initialize the player with duplicate protection
  async function safeInitializePlayer() {
    if (document.querySelector(`.${CONSTANTS.PLAYER_CLASS}`)) {
      return;
    }
    if (initializationInProgress) {
      return;
    }
    await initializePlayer();
  }

  // Initial delay before initializing player to ensure DOM is ready
  setTimeout(async () => {
    if (!playerAlreadyInitialized) {
      await safeInitializePlayer();
      playerAlreadyInitialized = true;
    }
    const observer = new MutationObserver(async (mutations) => {
      if (ShikimoriAPI.isAnimePage()) {
        const currentAnimeId = ShikimoriAPI.getAnimeId();
        if (currentAnimeId) {
          setTimeout(async () => {
            if (!document.querySelector(`.${CONSTANTS.PLAYER_CLASS}`)) {
              if (!initializationInProgress) {
                await safeInitializePlayer();
              }
            } else {
              const allPlayers = document.querySelectorAll(`.${CONSTANTS.PLAYER_CLASS}`);
              if (allPlayers.length > 1) {
                for (let i = 1; i < allPlayers.length; i++) {
                  allPlayers[i].remove();
                }
              }
            }
          }, CONSTANTS.PLAYER_INIT_DELAY);
        }
      }
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    const originalPushState = history.pushState;
    history.pushState = function() {
      originalPushState.apply(this, arguments);
      setTimeout(() => {
        if (ShikimoriAPI.isAnimePage()) {
          const currentAnimeId = ShikimoriAPI.getAnimeId();
          if (currentAnimeId) {
            setTimeout(async () => {
              if (!document.querySelector(`.${CONSTANTS.PLAYER_CLASS}`)) {
                if (!initializationInProgress) {
                  await safeInitializePlayer();
                }
              } else {
                const allPlayers = document.querySelectorAll(`.${CONSTANTS.PLAYER_CLASS}`);
                if (allPlayers.length > 1) {
                  for (let i = 1; i < allPlayers.length; i++) {
                    allPlayers[i].remove();
                  }
                }
              }
            }, CONSTANTS.PLAYER_INIT_DELAY);
          }
        }
      }, 100);
    };
  }, CONSTANTS.PLAYER_INIT_DELAY);

  // Register Tampermonkey menu commands
  if (typeof GM_registerMenuCommand !== 'undefined') {
    GM_registerMenuCommand(Localization.get('menuSettings'), () => {
      Settings.showSettingsDialog();
    });

    // Only register the output window command if it's enabled
    if (Settings.getSetting('outputWindowEnabled')) {
      GM_registerMenuCommand(Localization.get('menuShowOutput'), () => {
        OutputWindow.show();
        Settings.setSetting('showOutputWindow', true);
        logMessage(Localization.get('menuOutputShown'), 'info');
      });
    }
  }

  // Initialize the output window with the correct visibility state
  setTimeout(() => {
    // Only initialize output window if it's enabled
    if (Settings.getSetting('outputWindowEnabled')) {
      if (Settings.getSetting('showOutputWindow')) {
        OutputWindow.show();
      }
    }
  }, 1000);
})();