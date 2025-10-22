// ==UserScript==
// @name         Yushima
// @name:ru      Yushima
// @namespace    https://github.com/vanja-san/JS-UserScripts/main/scripts/Yushima
// @version      2.0.30
// @description  Optimized integration of player on Shikimori website with automatic browsing tracking
// @description:ru  Оптимизированная интеграция плеера на сайт Shikimori с автоматическим отслеживанием просмотра
// @author       vanja-san
// @match        https://shikimori.one/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=shikimori.one
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_registerMenuCommand
// @connect      shikimori.one
// @connect      kodik.info
// @connect      kodik.biz
// @run-at       document-idle
// @require      https://vanja-san.github.io/JS-UserScripts/scripts/Yushima/modules/constants.js
// @require      https://vanja-san.github.io/JS-UserScripts/scripts/Yushima/modules/localization.js
// @require      https://vanja-san.github.io/JS-UserScripts/scripts/Yushima/modules/settings.js
// @require      https://vanja-san.github.io/JS-UserScripts/scripts/Yushima/modules/helpers.js
// @require      https://vanja-san.github.io/JS-UserScripts/scripts/Yushima/modules/theme.js
// @require      https://vanja-san.github.io/JS-UserScripts/scripts/Yushima/modules/api.js
// @require      https://vanja-san.github.io/JS-UserScripts/scripts/Yushima/modules/oauth.js
// @require      https://vanja-san.github.io/JS-UserScripts/scripts/Yushima/modules/output.js
// @require      https://vanja-san.github.io/JS-UserScripts/scripts/Yushima/modules/player.js
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
    if (initializationInProgress || (currentTime - lastInitializationTime) < 1000) {
      return;
    }
    initializationInProgress = true;
    lastInitializationTime = currentTime;
    try {
      // Wait a bit more to ensure the page content is fully loaded
      await new Promise(resolve => setTimeout(resolve, 200));
      
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

  // Function to safely initialize the player with duplicate protection
  async function safeInitializePlayer() {
    if (initializationInProgress) {
      return;
    }
    await initializePlayer();
  }

  // Initial delay before initializing player to ensure DOM is ready
  setTimeout(async () => {
    await safeInitializePlayer();
    
    // Enhanced MutationObserver to detect changes in page content
    const observer = new MutationObserver(async (mutations) => {
      let pageChanged = false;
      let animePageDetected = false;
      
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          // Check if significant content elements have changed
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // If the main content area is updated, it likely means page change
              if (node.classList && 
                  (node.classList.contains('container') || 
                   node.classList.contains('l-page-content') ||
                   node.classList.contains('b-content'))) {
                pageChanged = true;
                
                // Check if anime content was added
                if (node.querySelector && 
                    (node.querySelector('.c-anime-show') || 
                     node.querySelector('.b-db_entry'))) {
                  animePageDetected = true;
                }
              }
              
              // Check for anime-specific elements that would indicate an anime page
              if (node.querySelector && 
                  (node.querySelector('.c-anime-show') || 
                   node.querySelector('.b-db_entry'))) {
                pageChanged = true;
                animePageDetected = true;
              }
            }
          }
          
          // Also check nodes that were removed (in case anime content was removed)
          for (const node of mutation.removedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              if (node.querySelector && 
                  (node.querySelector('.c-anime-show') || 
                   node.querySelector('.b-db_entry'))) {
                pageChanged = true;
              }
            }
          }
        }
      }
      
      if (pageChanged) {
        await new Promise(resolve => setTimeout(resolve, 400)); // Additional delay for page to load
        if (ShikimoriAPI.isAnimePage() || animePageDetected) {
          const currentAnimeId = ShikimoriAPI.getAnimeId();
          if (currentAnimeId) {
            if (!initializationInProgress) {
              await safeInitializePlayer();
            }
          }
        } else {
          // On non-anime pages, ensure player is removed
          cleanupExistingPlayer();
        }
        // Also reinitialize output window after navigation
        setTimeout(reinitializeOutputWindow, 100);
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    const originalPushState = history.pushState;
    history.pushState = function() {
      originalPushState.apply(this, arguments);
      setTimeout(async () => {
        if (ShikimoriAPI.isAnimePage()) {
          const currentAnimeId = ShikimoriAPI.getAnimeId();
          if (currentAnimeId) {
            if (!initializationInProgress) {
              await safeInitializePlayer();
            }
          }
        } else {
          // On non-anime pages, ensure player is removed
          cleanupExistingPlayer();
        }
        // Also reinitialize output window after navigation
        setTimeout(reinitializeOutputWindow, 100);
      }, 150);
    };
    
    // Also handle popstate events for browser back/forward navigation
    window.addEventListener('popstate', async () => {
      setTimeout(async () => {
        if (ShikimoriAPI.isAnimePage()) {
          const currentAnimeId = ShikimoriAPI.getAnimeId();
          if (currentAnimeId) {
            if (!initializationInProgress) {
              await safeInitializePlayer();
            }
          }
        } else {
          // On non-anime pages, ensure player is removed
          cleanupExistingPlayer();
        }
        // Also reinitialize output window after navigation
        setTimeout(reinitializeOutputWindow, 100);
      }, 150);
    });
  }, CONSTANTS.PLAYER_INIT_DELAY);

  // Register Tampermonkey menu commands
  if (typeof GM_registerMenuCommand !== 'undefined') {
    GM_registerMenuCommand(Localization.get('menuSettings'), () => {
      Settings.showSettingsDialog();
    });

    // Register the output window command regardless of setting initially
    // but check the setting when the command is executed
    GM_registerMenuCommand(Localization.get('menuShowOutput'), () => {
      // Check if output window is enabled before showing it
      if (Settings.getSetting('outputWindowEnabled')) {
        OutputWindow.show();
        Settings.setSetting('showOutputWindow', true);
        logMessage(Localization.get('menuOutputShown'), 'info');
      } else {
        alert(Localization.get('settingsOutputWindowEnabledLabel') + ' ' + Localization.get('settingsSavedRefresh'));
      }
    });
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
  
  // Reinitialize the output window after page navigation
  // The output window element might be removed during AJAX navigation
  function reinitializeOutputWindow() {
    if (Settings.getSetting('outputWindowEnabled') && 
        Settings.getSetting('showOutputWindow')) {
      // If the output window element no longer exists in the DOM, 
      // we need to recreate it
      if (!document.getElementById('yushima-output-window')) {
        OutputWindow.windowElement = null; // Reset reference
        OutputWindow.show(); // Recreate and show the window
      } else {
        // If element exists, just ensure it's displayed properly
        const windowElement = document.getElementById('yushima-output-window');
        if (windowElement) {
          windowElement.style.display = 'block';
        }
      }
    }
  }

  // Check and restore output window after navigation
  setTimeout(reinitializeOutputWindow, 1500);
})();
