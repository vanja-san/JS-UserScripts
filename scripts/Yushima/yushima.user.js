// ==UserScript==
// @name         Yushima
// @name:ru      Yushima
// @namespace    https://github.com/vanja-san/JS-UserScripts/main/scripts/Yushima
// @version      2.8.6
// @description  Integration of player on Shikimori website with automatic browsing tracking
// @description:ru  Интеграция плеера на сайт Shikimori с автоматическим отслеживанием просмотра
// @author       vanja-san
// @match        https://shikimori.io/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=shikimori.io
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_registerMenuCommand
// @connect      shikimori.io
// @connect      kodikplayer.com
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

(function () {
  "use strict";

  // Prevent multiple executions of the script by checking if it's already running
  if (window.yushimaScriptRunning) {
    return;
  }
  window.yushimaScriptRunning = true;

  /**
   * Update the auth handler to reset flag after successful authentication
   */
  const originalProcessAuthorizationCode =
    OAuthHandler.processAuthorizationCode;
  OAuthHandler.processAuthorizationCode = async function (code) {
    const success = await originalProcessAuthorizationCode.call(this, code);
    if (success) {
      GM_setValue("yushima_auth_initiated", false);
    }
    return success;
  };

  // Check for authorization code in URL (for OAuth callback)
  // This now includes checking for codes in the path (like /oauth/authorize/CODE)
  checkForAuthorizationCode();

  // Check if another tab has completed authentication successfully
  const authTimestamp = localStorage.getItem("yushima_auth_timestamp");
  if (authTimestamp) {
    const timestamp = parseInt(authTimestamp);
    const now = Date.now();
    // Only consider it fresh if it's within the last 30 seconds
    if (now - timestamp < 30000) {
      // Authentication was successful in another tab
      logMessage(Localization.get("authSuccess"), "success");
      // Refresh the page to update the UI based on new authentication state
      window.location.reload();
    }
    // Clear the stored timestamp so we don't keep refreshing
    localStorage.removeItem("yushima_auth_timestamp");
  }

  // Listen for authentication success from other tabs via localStorage changes
  window.addEventListener("storage", (event) => {
    if (event.key === "yushima_auth_timestamp" && event.newValue) {
      const timestamp = parseInt(event.newValue);
      const now = Date.now();
      // Only consider it fresh if it's within the last 30 seconds
      if (now - timestamp < 30000) {
        logMessage(Localization.get("authSuccess"), "success");
        window.location.reload();
      }
    }
  });

  // Flag to prevent duplicate auth code processing
  window.yushimaAuthProcessed = false;

  /**
   * Attempt to process an authorization code found in the current URL.
   * Called after every navigation (pushState, popstate, MutationObserver).
   */
  async function tryProcessAuthCode() {
    if (window.yushimaAuthProcessed) return;
    const code = extractAuthorizationCode();
    if (!code) return;
    window.yushimaAuthProcessed = true;
    cleanAuthorizationCodeFromUrl();
    const success = await OAuthHandler.processAuthorizationCode(code);
    if (success) {
      logMessage(Localization.get("authSuccess"), "success");
      localStorage.setItem("yushima_auth_timestamp", Date.now().toString());
      try { window.close(); } catch (e) { /* main tab, can't close */ }
    } else {
      window.yushimaAuthProcessed = false;
      logMessage(Localization.get("authFailed"), "error");
    }
  }

  // Debounce utility to throttle frequent events (e.g. MutationObserver)
  function debounce(fn, delay) {
    let timer = null;
    return function (...args) {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        fn.apply(this, args);
        timer = null;
      }, delay);
    };
  }

  // Flag to prevent duplicate initialization
  let initializationInProgress = false;
  let lastInitializationTime = 0;

  /**
   * Initialize the player integration
   */
  async function initializePlayer() {
    const currentTime = Date.now();
    if (
      initializationInProgress ||
      currentTime - lastInitializationTime < 1000
    ) {
      return;
    }
    initializationInProgress = true;
    lastInitializationTime = currentTime;
    try {
      // Wait a bit more to ensure the page content is fully loaded
      await new Promise((resolve) => setTimeout(resolve, 200));

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
      logMessage(
        Localization.get("playerHandlerError", { message: error.message }),
        "error",
      );
    } finally {
      initializationInProgress = false;
    }
  }

  // Log authentication status on script load
  setTimeout(async () => {
    const isAuthenticated = await OAuthHandler.isAuthenticated();
    if (!isAuthenticated) {
      logMessage(Localization.get("authRequiredMessage"), "warn");
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

    // Debounced MutationObserver to detect changes in page content
    // Debounce at 300ms to avoid excessive processing on rapid DOM changes
    const handlePageChange = debounce(async (mutations) => {
      let pageChanged = false;
      let animePageDetected = false;

      for (const mutation of mutations) {
        if (mutation.type === "childList") {
          // Check if significant content elements have changed
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // If the main content area is updated, it likely means page change
              if (
                node.classList &&
                (node.classList.contains("container") ||
                  node.classList.contains("l-page-content") ||
                  node.classList.contains("b-content"))
              ) {
                pageChanged = true;

                // Check if anime content was added
                if (
                  node.querySelector &&
                  (node.querySelector(".c-anime-show") ||
                    node.querySelector(".b-db_entry"))
                ) {
                  animePageDetected = true;
                }
              }

              // Check for anime-specific elements that would indicate an anime page
              if (
                node.querySelector &&
                (node.querySelector(".c-anime-show") ||
                  node.querySelector(".b-db_entry"))
              ) {
                pageChanged = true;
                animePageDetected = true;
              }
            }
          }

          // Also check nodes that were removed (in case anime content was removed)
          for (const node of mutation.removedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              if (
                node.querySelector &&
                (node.querySelector(".c-anime-show") ||
                  node.querySelector(".b-db_entry"))
              ) {
                pageChanged = true;
              }
            }
          }
        }
      }

      if (pageChanged) {
        // Check for auth code on SPA navigation (Turbolinks OAuth callback)
        tryProcessAuthCode();

        await new Promise((resolve) => setTimeout(resolve, 400)); // Additional delay for page to load
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
    }, 300);

    const observer = new MutationObserver(handlePageChange);

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    const originalPushState = history.pushState;
    history.pushState = function () {
      originalPushState.apply(this, arguments);
      setTimeout(async () => {
        // Check for auth code on SPA navigation (Turbolinks OAuth callback)
        tryProcessAuthCode();

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
    window.addEventListener("popstate", async () => {
      setTimeout(async () => {
        // Check for auth code on history navigation
        tryProcessAuthCode();

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
  if (typeof GM_registerMenuCommand !== "undefined") {
    GM_registerMenuCommand(
      Localization.get("menuSettings"),
      Settings.showSettingsDialog,
    );
    GM_registerMenuCommand(Localization.get("menuShowOutput"), () => {
      if (OutputWindow && !OutputWindow.isVisible()) {
        OutputWindow.show();
        Settings.setSetting('showOutputWindow', true);
      } else if (OutputWindow && OutputWindow.isVisible()) {
        OutputWindow.hide();
        Settings.setSetting('showOutputWindow', false);
      }
    });
  }

  // Initialize the output window based on saved setting
  setTimeout(() => {
    if (Settings.getSetting('showOutputWindow')) {
      OutputWindow.show();
    }
  }, 1000);

  // Reinitialize the output window after page navigation
  function reinitializeOutputWindow() {
    if (!Settings.getSetting('showOutputWindow')) return;
    if (ShikimoriAPI.isAnimePage()) {
      if (!document.getElementById("yushima-output-window")) {
        OutputWindow.windowElement = null;
        OutputWindow.show();
      } else {
        const windowElement = document.getElementById("yushima-output-window");
        if (windowElement) {
          windowElement.style.display = "block";
        }
      }
    }
  }

  // Check and restore output window after navigation
  setTimeout(() => {
    if (Settings.getSetting('showOutputWindow') && ShikimoriAPI.isAnimePage()) {
      reinitializeOutputWindow();
    }
  }, 1500);
})();
