/**
 * Kodik Player integration class
 */
class KodikPlayer {
  static logProgress(animeId, episode, currentTime, duration, progress) {
    // Optionally log progress updates if needed - currently silent to avoid spam
    // Uncomment the next line if detailed progress logging is needed:
    // logMessage(`Episode ${episode} progress: ${(progress * 100).toFixed(1)}%`, 'debug');
  }
  /**
   * Create and insert the Kodik player into the page
   * @param {string} animeId - The anime ID
   */
  static async createPlayer(animeId) {
    // Remove any existing players before creating a new one
    cleanupExistingPlayer();
    const result = await ShikimoriAPI.getWatchingEpisode(animeId);
    const episode = result.episode;
    const maxEpisodes = result.maxEpisodes;
    const playerElement = this.createPlayerElement(
      animeId,
      episode,
      maxEpisodes,
    );
    if (playerElement) {
      this.insertPlayer(playerElement);
      this.addPlayerEventListeners(
        playerElement,
        animeId,
        episode,
        maxEpisodes,
      );
    } else {
      logMessage(Localization.get("failedToCreatePlayer"), "error");
    }
  }
  /**
   * Create the player DOM element
   * @param {string} animeId - The anime ID
   * @param {number} episode - The episode number
   * @param {number} maxEpisodes - Maximum number of episodes for the anime (0 if unknown)
   * @returns {HTMLElement|null} The player wrapper element
   */
  static createPlayerElement(animeId, episode, maxEpisodes) {
    const headlineText = this.getHeadlineText();
    const headline = this.createElement("div", {
      className: "subheadline m5",
      style:
        "display: flex; justify-content: space-between; align-items: center;",
    });
    const headlineTextElement = this.createElement("div", {
      textContent: headlineText,
    });
    const authElement = this.createAuthElement();
    headline.appendChild(headlineTextElement);
    headline.appendChild(authElement);
    const container = this.createElement("div", {
      className: "block",
      style: "width: 100%; margin-right: 10px;",
    });
    const validatedAnimeId = String(animeId).replace(/[^a-zA-Z0-9-]/g, "");
    if (validatedAnimeId !== String(animeId)) {
      logMessage(
        Localization.get("invalidAnimeIdDetected", { animeId: animeId }),
        "error",
      );
      return null;
    }
    const validatedEpisode = Math.max(1, parseInt(episode) || 1);
    const iframe = this.createElement("iframe", {
      className: "iframe-player",
      src: `//kodik.info/find-player?shikimoriID=${validatedAnimeId}&episode=${validatedEpisode}`,
      allowFullscreen: true,
      loading: "lazy",
      style: "border: none;",
      width: "100%",
      height: "360",
    });
    setTimeout(() => {
      try {
        if (iframe.contentWindow) {
          iframe.contentWindow.postMessage(
            {
              type: "request_capabilities",
            },
            "https://kodik.info",
          );
        }
      } catch (e) {
        // Could not request player capabilities
      }
    }, 1000);

    // Additional request after a delay for players that take longer to load
    setTimeout(() => {
      try {
        if (iframe.contentWindow) {
          iframe.contentWindow.postMessage(
            {
              type: "request_progress_updates",
            },
            "https://kodik.info",
          );
        }
      } catch (e) {
        // Could not request progress updates from player
      }
    }, 5000);
    const resizeObserver = new ResizeObserver(() => {
      this.updateIframeHeight(iframe, container);
    });
    resizeObserver.observe(container);
    container.appendChild(iframe);
    const wrapper = this.createElement("div", {
      className: CONSTANTS.PLAYER_CLASS,
    });
    wrapper.append(headline, container);
    wrapper.resizeObserver = resizeObserver;

    // Store maxEpisodes for later use in marking episodes
    wrapper.maxEpisodes = maxEpisodes;

    return wrapper;
  }
  /**
   * Create authentication status element
   * @returns {HTMLElement} The auth status element
   */
  static createAuthElement() {
    const authContainer = this.createElement("div", {
      className: CONSTANTS.AUTH_STATUS_CLASS,
      style: "display: flex; align-items: center; gap: 8px;",
    });
    const statusText = this.createElement("span", {
      textContent: "...",
      style: "font-size: 0.9em;",
    });
    const authButton = this.createElement("button", {
      className: CONSTANTS.AUTH_BUTTON_CLASS,
      textContent: Localization.get("authButtonAuthenticate"),
      style:
        "background-color: #3498db; color: white; align-items: center; height: 24px; padding: 2px 4px; border: none; border-radius: 3px; cursor: pointer; font-size: 0.75em;",
    });

    authButton.addEventListener("click", () => {
      // Show the code input dialog (this will open the authentication page)
      OAuthHandler.showAuthCodeInput();
    });

    authContainer.appendChild(statusText);
    authContainer.appendChild(authButton);

    setTimeout(async () => {
      await this.updateAuthStatus(authContainer, statusText, authButton);
    }, 500);
    return authContainer;
  }
  /**
   * Update authentication status display
   * @param {HTMLElement} authStatus - The auth status container
   * @param {HTMLElement} statusText - The status text element
   * @param {HTMLElement} authButton - The auth button element
   */
  static async updateAuthStatus(authContainer, statusText, authButton) {
    const isAuthenticated = await OAuthHandler.isAuthenticated();
    if (isAuthenticated) {
      statusText.textContent = Localization.get("authStatusAuthenticated");
      statusText.style.color = "#2ecc71";
      statusText.style.fontWeight = "bold";
      authButton.style.display = "none";
      logMessage(Localization.get("authStatusUpdateAuthenticated"), "success");
    } else {
      statusText.textContent = Localization.get("authStatusAuthNeeded");
      statusText.style.color = "#e74c3c";
      statusText.style.fontWeight = "normal";
      authButton.style.display = "flex";
      authButton.textContent = Localization.get("authButtonAuthenticate");
      logMessage(Localization.get("authStatusUpdateNotAuthenticated"), "warn");
    }
  }
  /**
   * Add enhanced video progress tracking
   * @param {HTMLElement} playerElement - Player element
   * @param {string} animeId - Anime ID
   * @param {number} episode - Episode number
   * @param {number} maxEpisodes - Maximum number of episodes for the anime (0 if unknown)
   */
  static addPlayerEventListeners(playerElement, animeId, episode, maxEpisodes) {
    try {
      // --- ИНИЦИАЛИЗАЦИЯ ПЕРЕМЕННЫХ ---
      const iframe = playerElement.querySelector("iframe.iframe-player");
      let hasMarkedAsWatched = false;
      let lastProgressUpdate = 0;
      let videoDuration = 0;
      let videoCurrentTime = 0;
      let lastTimeUpdateMessage = 0;
      let watchedPositions = new Set();

      // Отслеживание времени просмотра для каждого эпизода (как в Mirual)
      const episodeWatchTime = {}; // { episode: { watched: 0, total: 0, synced: false } }
      let currentEpisode = episode;

      // Инициализируем отслеживание для текущего эпизода
      episodeWatchTime[currentEpisode] = {
        watched: 0,
        total: 0,
        synced: false,
      };

      // --- ОСНОВНЫЕ ФУНКЦИИ ---

      // Функция для пометки эпизода как просмотренного
      const markAsWatched = async (episodeToMark = currentEpisode) => {
        // Проверяем, не превышает ли текущая серия максимум для этого аниме
        if (maxEpisodes > 0 && episodeToMark > maxEpisodes) {
          logMessage(
            Localization.get("playerEpisodeExceedsMax", {
              episode: episodeToMark,
              maxEpisodes: maxEpisodes,
            }),
            "warn",
          );
          return false; // Не отмечаем серию как просмотренную
        }

        // Проверяем, не была ли уже отмечена эта серия
        if (episodeWatchTime[episodeToMark]?.synced) {
          return false;
        }

        if (hasMarkedAsWatched && episodeToMark === episode) return;
        const isAuthenticated = await OAuthHandler.isAuthenticated();
        if (isAuthenticated) {
          const animeTitle = await getAnimeTitle(animeId);
          const success = await ShikimoriAPI.updateEpisodeProgress(
            animeId,
            episodeToMark,
          );
          if (success) {
            // Reset auth cache since authentication state may have changed
            OAuthHandler.lastAuthCheck = 0;
            OAuthHandler.lastAuthResult = null;
            logMessage(
              Localization.get("playerMarkSuccess", {
                episode: episodeToMark,
                title: animeTitle,
              }),
              "success",
            );
            hasMarkedAsWatched = episodeToMark === episode;
            // Отмечаем эпизод как синхронизированный
            if (!episodeWatchTime[episodeToMark]) {
              episodeWatchTime[episodeToMark] = {
                watched: 0,
                total: videoDuration,
                synced: false,
              };
            }
            episodeWatchTime[episodeToMark].synced = true;
            // Не вызываем cleanup - это удаляет обработчики событий!
            // Очистка происходит только при удалении плеера со страницы
            return true;
          } else {
            logMessage(
              Localization.get("failedToUpdateProgress", {
                animeId: animeId,
                episode: episodeToMark,
              }),
              "warn",
            );
          }
        } else {
          logMessage(Localization.get("playerCannotMark"), "error");
        }
        return false;
      };

      // Более точная проверка прогресса
      const checkProgress = async (currentTime, duration) => {
        if (hasMarkedAsWatched || !duration) return;

        // Check if auto-marking is enabled
        if (!Settings.getSetting("autoMarkEnabled")) {
          return;
        }

        const progress = currentTime / duration;
        const progressPercentage = Math.round(progress * 100);
        KodikPlayer.logProgress(
          animeId,
          episode,
          currentTime,
          duration,
          progress,
        );

        // Initialize progress milestone tracking if not exists
        if (!KodikPlayer.progressMilestones) {
          KodikPlayer.progressMilestones = {};
        }

        // Create a unique key for this episode
        const episodeKey = `${animeId}-${episode}`;

        // Initialize milestone tracking for this episode if needed
        if (!KodikPlayer.progressMilestones[episodeKey]) {
          KodikPlayer.progressMilestones[episodeKey] = [];
        }

        // Show progress percentage message every 10% threshold
        const currentMilestone = Math.floor(progressPercentage / 10) * 10;
        const hasReachedMilestone =
          KodikPlayer.progressMilestones[episodeKey].includes(currentMilestone);

        if (
          progressPercentage > 0 &&
          currentMilestone > 0 &&
          !hasReachedMilestone &&
          currentMilestone % 10 === 0
        ) {
          // Mark this milestone as reached
          KodikPlayer.progressMilestones[episodeKey].push(currentMilestone);
          KodikPlayer.progressMilestones[episodeKey].sort((a, b) => a - b);

          logMessage(
            Localization.get("playerProgressMilestone", {
              episode: episode,
              milestone: currentMilestone,
            }),
            "info",
          );
        }

        // If we reach the threshold for marking as watched, log a specific message
        const progressThreshold = Settings.getSetting("progressThreshold");
        if (progress >= progressThreshold && !hasMarkedAsWatched) {
          const thresholdPercent = Math.round(progressThreshold * 100);
          if (
            progressPercentage >= thresholdPercent &&
            progressPercentage < thresholdPercent + 5
          ) {
            // Only log once
            logMessage(
              Localization.get("playerThresholdReached", {
                episode: episode,
                threshold: thresholdPercent,
              }),
              "info",
            );
          }
        }

        if (progress >= progressThreshold) {
          const roundedPosition = Math.round(currentTime / 10) * 10;
          if (!watchedPositions.has(roundedPosition)) {
            watchedPositions.add(roundedPosition);
            await markAsWatched();
          }
        }
      };

      // --- ОБРАБОТКА СООБЩЕНИЙ С ОПТИМИЗАЦИЕЙ ---

      // Оптимизированный обработчик сообщений с дебаунсингом для производительности
      let messageQueue = [];
      let messageHandlerTimeout = null;

      // Обработка очереди сообщений
      const processMessageQueue = async () => {
        if (messageQueue.length === 0) return;

        // Process multiple messages at once to reduce function call overhead
        const messagesToProcess = [...messageQueue];
        messageQueue = []; // Clear the queue

        // Process each message sequentially with await
        for (const event of messagesToProcess) {
          await processSingleMessage(event);
        }

        // Clear timeout reference
        messageHandlerTimeout = null;
      };

      // Обработка одного сообщения
      const processSingleMessage = async (event) => {
        if (event.origin !== "https://kodik.info") return;

        let data;
        try {
          // Пытаемся определить тип данных и безопасно распарсить
          if (typeof event.data === "string") {
            // Проверяем, похоже ли на JSON (начинается с { или [)
            const trimmed = event.data.trim();
            if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
              data = JSON.parse(event.data);
            } else {
              // Обрабатываем специфические строковые сообщения от Kodik
              switch (event.data) {
                case "flow_progress":
                  // Прогресс может означать обновление времени, проверим прогресс если знаем продолжительность
                  if (videoDuration > 0) {
                    // Мы не знаем точное текущее время, но можем периодически проверять
                    // Проверим текущий прогресс через backup проверки
                  }
                  break;
                case "flow_load":
                  logMessage(Localization.get("playerFlowLoad"), "debug");
                  break;
                case "flow_ready":
                  logMessage(Localization.get("playerFlowReady"), "debug");
                  break;
                case "flow_resume":
                  logMessage(Localization.get("playerFlowResume"), "debug");
                  break;
                case "flow_beforeseek":
                  logMessage(
                    Localization.get("playerFlowSeekStarted"),
                    "debug",
                  );
                  break;
                case "flow_seek":
                  logMessage(
                    Localization.get("playerFlowSeekCompleted"),
                    "debug",
                  );
                  break;
                case "flow_pause":
                  logMessage(Localization.get("playerFlowPause"), "debug");
                  break;
                default:
                  logMessage(
                    Localization.get("playerUnknownStringMessage", {
                      message: event.data,
                    }),
                    "debug",
                  );
              }
              return;
            }
          } else if (typeof event.data === "object" && event.data !== null) {
            data = event.data;
          } else {
            // Неизвестный формат данных
            return;
          }
          // Проверяем, что data является объектом и имеет тип
          if (!data || typeof data !== "object") {
            return;
          }

          // Обработка сообщений в формате Kodik плеера с ключами типа "kodik_player_..."
          if (data.key && typeof data.key === "string") {
            switch (data.key) {
              case "kodik_player_duration_update":
                if (typeof data.value === "number") {
                  videoDuration = data.value;
                  const { minutes, seconds } = formatTime(data.value);
                  logMessage(
                    Localization.get("playerDurationUpdated", {
                      minutes: minutes,
                      seconds: seconds,
                    }),
                    "info",
                  );
                  // Обновляем общую длительность для текущего эпизода
                  if (!episodeWatchTime[currentEpisode]) {
                    episodeWatchTime[currentEpisode] = {
                      watched: 0,
                      total: videoDuration,
                      synced: false,
                    };
                  }
                  episodeWatchTime[currentEpisode].total = videoDuration;
                  lastProgressUpdate = Date.now();
                }
                break;
              case "kodik_player_time_update":
                if (typeof data.value === "number") {
                  videoCurrentTime = data.value;
                  // Throttle time update messages to once every 10 minutes (600,000 ms)
                  const now = Date.now();
                  if (now - lastTimeUpdateMessage >= 600000) {
                    // 10 minutes = 600,000 ms
                    const { minutes, seconds } = formatTime(data.value);
                    logMessage(
                      Localization.get("playerTimeUpdated", {
                        minutes: minutes,
                        seconds: seconds,
                      }),
                      "debug",
                    );
                    lastTimeUpdateMessage = now;
                  }
                  // Обновляем время просмотра для текущего эпизода
                  if (!episodeWatchTime[currentEpisode]) {
                    episodeWatchTime[currentEpisode] = {
                      watched: 0,
                      total: videoDuration,
                      synced: false,
                    };
                  }
                  episodeWatchTime[currentEpisode].watched = videoCurrentTime;
                  episodeWatchTime[currentEpisode].total = videoDuration;

                  if (videoDuration > 0) {
                    const progress = Math.round(
                      (videoCurrentTime / videoDuration) * 100,
                    );
                    // Логируем прогресс каждые 10% для отладки
                    if (progress % 10 === 0 && progress > 0) {
                      logMessage(
                        `Эпизод ${currentEpisode}: прогресс ${progress}%`,
                        "debug",
                      );
                    }
                    checkProgress(data.value, videoDuration);
                    lastProgressUpdate = Date.now();
                  }
                }
                break;
              case "kodik_player_video_started":
                logMessage(Localization.get("playerVideoStarted"), "info");
                break;
              case "kodik_player_play":
                logMessage(Localization.get("playerVideoPlay"), "info");
                break;
              case "kodik_player_advert_ended":
                logMessage(Localization.get("playerAdvertEnded"), "info");
                break;
              case "kodik_player_current_episode":
                // data.value может быть числом, строкой или объектом {episode: N, number: N}
                let newEpisode = null;

                if (typeof data.value === "number") {
                  newEpisode = data.value;
                } else if (typeof data.value === "string") {
                  newEpisode = parseInt(data.value);
                } else if (
                  typeof data.value === "object" &&
                  data.value !== null
                ) {
                  // Пробуем получить номер эпизода из объекта
                  newEpisode = parseInt(
                    data.value.episode || data.value.number || 0,
                  );
                }

                if (
                  !isNaN(newEpisode) &&
                  newEpisode !== currentEpisode &&
                  newEpisode > 0
                ) {
                  logMessage(
                    Localization.get("playerCurrentEpisodeChange", {
                      newEpisode: newEpisode,
                    }),
                    "info",
                  );

                  // Обновляем переменную эпизода на новый
                  const oldEpisode = currentEpisode;
                  currentEpisode = newEpisode;

                  // Синхронизируем предыдущий эпизод перед переключением
                  if (oldEpisode !== newEpisode) {
                    // Проверяем, был ли предыдущий эпизод просмотрен достаточно для синхронизации
                    const progressThreshold =
                      Settings.getSetting("progressThreshold");
                    if (episodeWatchTime[oldEpisode]) {
                      const { watched, total, synced } =
                        episodeWatchTime[oldEpisode];
                      const progress = total > 0 ? watched / total : 0;
                      const progressPercent = Math.round(progress * 100);

                      logMessage(
                        `Эпизод ${oldEpisode}: прогресс ${progressPercent}% (порог: ${Math.round(progressThreshold * 100)}%)`,
                        "info",
                      );

                      if (progress >= progressThreshold && !synced) {
                        logMessage(
                          Localization.get("playerProgressReached", {
                            episode: oldEpisode,
                            progress: progressPercent,
                          }),
                          "info",
                        );
                        await markAsWatched(oldEpisode);
                      } else if (synced) {
                        logMessage(
                          `Эпизод ${oldEpisode} уже синхронизирован`,
                          "info",
                        );
                      } else {
                        logMessage(
                          `Эпизод ${oldEpisode} не достиг порога для синхронизации`,
                          "warn",
                        );
                      }
                    } else if (!hasMarkedAsWatched) {
                      // Если нет данных о времени просмотра, но эпизод не отмечен, пробуем отметить
                      logMessage(
                        `Синхронизация эпизода ${oldEpisode} без данных о времени`,
                        "info",
                      );
                      await markAsWatched(oldEpisode);
                    }
                  }

                  // Сбрасываем статус просмотра для нового эпизода
                  hasMarkedAsWatched = false;
                  // Инициализируем новый эпизод с нулевым временем просмотра
                  episodeWatchTime[newEpisode] = {
                    watched: 0,
                    total: 0,
                    synced: false,
                  };
                  // Сбрасываем текущее время и длительность для нового эпизода
                  videoCurrentTime = 0;
                  videoDuration = 0;
                  watchedPositions.clear();
                  lastProgressUpdate = Date.now();

                  // Запрашиваем обновления прогресса для нового эпизода
                  try {
                    if (iframe.contentWindow) {
                      iframe.contentWindow.postMessage(
                        {
                          type: "request_progress_updates",
                        },
                        "https://kodik.info",
                      );
                    }
                  } catch (e) {
                    logMessage(
                      `Не удалось запросить обновления для эпизода ${newEpisode}`,
                      "warn",
                    );
                  }

                  logMessage(`Начало просмотра эпизода ${newEpisode}`, "info");
                } else {
                  logMessage(Localization.get("playerCurrentEpisode"), "info");
                }
                break;

              case "kodik_player_seek":
                // Обработка перемотки (как в Mirual)
                if (data.value && typeof data.value.time === "number") {
                  videoCurrentTime = data.value.time;
                  // Обновляем время просмотра для текущего эпизода
                  if (!episodeWatchTime[currentEpisode]) {
                    episodeWatchTime[currentEpisode] = {
                      watched: 0,
                      total: videoDuration,
                      synced: false,
                    };
                  }
                  episodeWatchTime[currentEpisode].watched = videoCurrentTime;
                  lastProgressUpdate = Date.now();
                }
                break;
            }
          } // закрывает if (data.key)
          // Обработка сообщений в старом формате на случай обратной совместимости
          else if (
            data.type === "player_state" ||
            (data.event && data.event === "player_state")
          ) {
            logMessage(Localization.get("playerLegacyState"), "debug");
            const duration =
              data.duration ||
              (data.metadata && data.metadata.duration) ||
              data.videoDuration;
            const currentTime =
              data.currentTime || data.videoCurrentTime || data.position;

            if (
              typeof duration === "number" &&
              typeof currentTime === "number"
            ) {
              videoDuration = duration;
              checkProgress(currentTime, duration);
              lastProgressUpdate = Date.now();
            }
            if (
              (data.state === "ended" ||
                data.videoState === "ended" ||
                data.event === "ended") &&
              !hasMarkedAsWatched
            ) {
              logMessage(Localization.get("playerVideoEndedMark"), "info");
              await markAsWatched();
            }
          } else if (
            data.type === "video_progress" ||
            data.event === "video_progress" ||
            data.event === "progress"
          ) {
            logMessage(Localization.get("playerVideoProgress"), "debug");
            const progress =
              data.progress ||
              (data.percent && data.percent / 100) ||
              data.value;
            if (typeof progress === "number") {
              const normalizedProgress = Math.max(0, Math.min(1, progress));
              if (normalizedProgress >= 0.85 && !hasMarkedAsWatched) {
                await markAsWatched();
              }
            }
          } else if (
            data.type === "video_complete" ||
            data.event === "video_complete" ||
            data.event === "completed" ||
            data.event === "finish" ||
            (data.state && data.state === "ended")
          ) {
            logMessage(Localization.get("playerVideoCompletion"), "info");
            if (!hasMarkedAsWatched) {
              await markAsWatched();
            }
          } else if (
            data.event === "timeupdate" ||
            data.type === "timeupdate"
          ) {
            logMessage(Localization.get("playerTimeUpdate"), "debug");
            const currentTime = data.currentTime || data.position;
            const duration = data.duration || videoDuration;
            if (
              typeof currentTime === "number" &&
              typeof duration === "number"
            ) {
              checkProgress(currentTime, duration);
            }
          } else if (
            data.type === "request_capabilities" ||
            data.type === "request_progress_updates"
          ) {
            logMessage(Localization.get("playerCapabilitiesRequest"), "debug");
            try {
              if (iframe.contentWindow) {
                iframe.contentWindow.postMessage(
                  {
                    type: "capabilities_response",
                    capabilities: ["progress_tracking", "playback_events"],
                  },
                  "https://kodik.info",
                );
              }
            } catch (e) {
              logMessage(
                Localization.get("playerCapabilitiesError", {
                  message: e.message,
                }),
                "error",
              );
            }
          }
          // Additional message type support for different Kodik player versions
          else if (data.event && typeof data.event === "string") {
            logMessage(
              Localization.get("playerUnknownEvent", { event: data.event }),
              "debug",
            );
            // Some players might send different event names
            if (
              ["video_ended", "ended", "complete", "finished"].includes(
                data.event,
              )
            ) {
              logMessage(Localization.get("playerVideoEnded"), "info");
              if (!hasMarkedAsWatched) {
                await markAsWatched();
              }
            } else if (
              ["timeupdate", "progress", "playback"].includes(data.event) &&
              typeof data.currentTime === "number" &&
              typeof data.duration === "number"
            ) {
              checkProgress(data.currentTime, data.duration);
            }
          }
        } catch (e) {
          logMessage(
            Localization.get("playerErrorMessage", { message: e.message }),
            "error",
          );
        }
      };

      // Optimized message handler using debouncing
      const messageHandler = async (event) => {
        // Add message to the queue
        messageQueue.push(event);

        // Clear existing timeout if it exists
        if (messageHandlerTimeout) {
          clearTimeout(messageHandlerTimeout);
        }

        // Set a new timeout to process the queue after a short delay
        messageHandlerTimeout = setTimeout(processMessageQueue, 10); // 10ms delay to batch process messages
      };

      // Объявляем переменные для таймеров и observer
      let activityCheckInterval;
      let backupCheckInterval;
      let syncCheckInterval;
      let observer;

      // Функция очистки ресурсов
      let cleanup = () => {
        window.removeEventListener("message", messageHandler);
        if (activityCheckInterval) clearInterval(activityCheckInterval);
        if (backupCheckInterval) clearInterval(backupCheckInterval);
        if (syncCheckInterval) clearInterval(syncCheckInterval);
        if (observer) observer.disconnect();
      };

      // --- УСТАНОВКА ОБРАБОТЧИКОВ И ТАЙМЕРОВ ---

      // Add message handler
      window.addEventListener("message", messageHandler);

      // Timer to check viewing activity
      activityCheckInterval = setInterval(() => {
        if (hasMarkedAsWatched) {
          clearInterval(activityCheckInterval);
          return;
        }
        const activityTimeout = Settings.getSetting("playerActivityTimeout");
        if (
          lastProgressUpdate > 0 &&
          Date.now() - lastProgressUpdate > activityTimeout
        ) {
          lastProgressUpdate = 0;
          watchedPositions.clear();
        }
      }, 60000);

      // Backup check as fallback method for completion
      backupCheckInterval = setInterval(async () => {
        if (hasMarkedAsWatched) {
          clearInterval(backupCheckInterval);
          return;
        }
        if (videoDuration > 0) {
          const progressThreshold = Settings.getSetting("progressThreshold");
          const estimatedWatchedTime =
            Math.min(1200, videoDuration) * progressThreshold;
          if (watchedPositions.size > 0) {
            const totalWatched = Array.from(watchedPositions).length * 10;
            if (totalWatched >= estimatedWatchedTime) {
              await markAsWatched();
            }
          }
        }
      }, 120000);

      // Периодическая проверка прогресса для автосинхронизации (как в Mirual)
      syncCheckInterval = setInterval(async () => {
        const progressThreshold = Settings.getSetting("progressThreshold");

        // Проверяем текущий эпизод
        if (episodeWatchTime[currentEpisode]) {
          const { watched, total, synced } = episodeWatchTime[currentEpisode];

          if (total > 0 && !synced) {
            const progress = watched / total;
            if (progress >= progressThreshold) {
              logMessage(
                Localization.get("playerProgressReached", {
                  episode: currentEpisode,
                  progress: Math.round(progress * 100),
                }),
                "info",
              );
              await markAsWatched(currentEpisode);
            }
          }
        }
      }, CONSTANTS.SYNC_CHECK_INTERVAL || 60000); // Проверка каждые 60 секунд

      // Cleanup resources when player is removed
      observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.removedNodes.forEach((node) => {
            if (node === playerElement || node.contains(playerElement)) {
              cleanup();
            }
          });
        });
      });
      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
      // Request progress updates from iframe if available
      setTimeout(() => {
        try {
          if (iframe.contentWindow) {
            iframe.contentWindow.postMessage(
              {
                type: "request_progress_updates",
              },
              "https://kodik.info",
            );
          }
        } catch (e) {
          // Could not request progress updates from player
        }
      }, 3000);

      // Fallback timer-based progress tracking
      let lastTrackedTime = 0;
      const fallbackInterval = setInterval(() => {
        if (hasMarkedAsWatched) {
          clearInterval(fallbackInterval);
          return;
        }

        // Try to access iframe's content to get direct progress (though this might be restricted by CORS)
        // This is a fallback approach in case postMessage doesn't work
        if (videoDuration > 0 && lastTrackedTime > 0) {
          const estimatedProgress = lastTrackedTime / videoDuration;
          const progressThreshold = Settings.getSetting("progressThreshold");
          if (estimatedProgress >= progressThreshold && !hasMarkedAsWatched) {
            markAsWatched();
          }
        }
      }, 30000); // Check every 30 seconds

      // Additional fallback: mark as watched after a reasonable time if iframe is playing
      setTimeout(
        async () => {
          if (!hasMarkedAsWatched && videoDuration > 0) {
            await markAsWatched();
          }
        },
        Math.min(videoDuration * 1000 * 0.9, 600000),
      ); // Either 90% of video duration or max 10 minutes

      // Обработчик закрытия вкладки для синхронизации прогресса
      const beforeUnloadHandler = () => {
        // Проверяем, был ли просмотрен текущий эпизод достаточно для синхронизации
        const progressThreshold = Settings.getSetting("progressThreshold");
        if (episodeWatchTime[currentEpisode]) {
          const { watched, total, synced } = episodeWatchTime[currentEpisode];
          const progress = total > 0 ? watched / total : 0;
          if (progress >= progressThreshold && !synced) {
            // Синхронизируем текущий эпизод
            markAsWatched(currentEpisode);
          }
        }
      };
      window.addEventListener("beforeunload", beforeUnloadHandler);

      // Добавляем обработчик в функцию очистки
      const originalCleanup = cleanup;
      cleanup = () => {
        window.removeEventListener("beforeunload", beforeUnloadHandler);
        originalCleanup();
      };
    } catch (e) {
      logMessage(
        Localization.get("playerHandlerError", { message: e.message }),
        "error",
      );
    }
  }

  /**
   * Helper function to create DOM elements with properties
   * @param {string} tagName - The tag name of the element
   * @param {Object} properties - Properties to set on the element
   * @returns {HTMLElement} The created element
   */
  static createElement(tagName, properties) {
    const element = document.createElement(tagName);
    Object.entries(properties).forEach(([key, value]) => {
      if (key === "style" && typeof value === "string") {
        element.style.cssText = value;
      } else {
        element[key] = value;
      }
    });
    return element;
  }
  /**
   * Insert the player element into the appropriate location on the page
   * @param {HTMLElement} playerElement - The player wrapper element
   */
  static insertPlayer(playerElement) {
    cleanupExistingPlayer();
    // Find the main anime entry block
    let target = document.querySelector(".b-db_entry");

    if (target) {
      target.after(playerElement);
    } else {
      // As a fallback, insert at the beginning of main content
      const mainContent =
        document.querySelector(".l-page-content, .container, main") ||
        document.body;
      mainContent.insertBefore(playerElement, mainContent.firstChild);
    }
  }
  /**
   * Get the appropriate headline text based on the current page language
   * @returns {string} The headline text
   */
  static getHeadlineText() {
    return Localization.get("playerHeadline");
  }
  /**
   * Update the iframe height based on the container width to maintain aspect ratio
   * @param {HTMLElement} iframe - The iframe element
   * @param {HTMLElement} container - The container element
   */
  static updateIframeHeight(iframe, container) {
    if (container.clientWidth > 0) {
      const calculatedHeight = Math.round(
        container.clientWidth * CONSTANTS.IFRAME_ASPECT_RATIO,
      );
      // Use calculated height but ensure it's not smaller than minimum reasonable size
      iframe.height = Math.max(calculatedHeight, 360); // Minimum height of 360px
    }
  }
}
