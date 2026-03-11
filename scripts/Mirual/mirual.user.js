// ==UserScript==
// @name         MiruAL
// @name:ru      MiruAL
// @namespace    http://tampermonkey.net/
// @version      8.8
// @description  Mirual — seamlessly embeds a video player into AniList pages. Watch anime directly from your lists without leaving the site. Simple, fast, and clean.
// @description:ru Mirual — встраивает видеоплеер прямо на страницы AniList. Смотри аниме из своих списков, не переключаясь между вкладками. Просто, быстро, удобно.
// @author       vanja-san
// @match        https://anilist.co/anime/*
// @match        https://anilist.co/settings
// @icon         https://www.google.com/s2/favicons?sz=64&domain=anilist.co
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @grant        GM_addStyle
// @connect      graphql.anilist.co
// @connect      shikimori.io
// @connect      kodik.info
// @run-at       document-start
// ==/UserScript==

(function () {
  "use strict";

  // ==================== КОНФИГУРАЦИЯ ====================
  const CONFIG = {
    KODIK_DOMAIN: "kodik.info",
    ANILIST_API: "https://graphql.anilist.co",
    SHIKIMORI_API: "https://shikimori.io/api/animes",
    STORAGE_KEY: "anilist_token",
    DEBOUNCE_DELAY: 3000,
    SYNC_WATCHED_PERCENT: 0.8,
    SYNC_CHECK_INTERVAL: 10000,
    CLIENT_ID: 37080,
  };

  // Подключаем Material Symbols Rounded и все стили
  GM_addStyle(`
    @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0,0');

    .material-symbols-rounded {
      font-family: 'Material Symbols Rounded';
      font-weight: normal;
      font-style: normal;
      font-size: 18px;
      line-height: 1;
      letter-spacing: normal;
      text-transform: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      white-space: nowrap;
      word-wrap: normal;
      direction: ltr;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      vertical-align: middle;
    }
    .material-symbols-rounded.success { color: #4caf50; }
    .material-symbols-rounded.error { color: #f44336; }

    /* Mirual Player Styles */
    #mirual-player {
      margin-bottom: 20px;
      border-radius: 3px;
      overflow: hidden;
    }
    #mirual-player-container {
      margin-bottom: 20px;
      border-radius: 3px;
      overflow: hidden;
    }
    #kodik-player-iframe {
      width: 100%;
      aspect-ratio: 16/9;
      border: none;
    }
    #mirual-sync-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      background: rgb(var(--color-foreground));
      border-radius: 3px 3px 0 0;
      margin-top: 0;
    }
    #mirual-sync-left {
      font-size: 13px;
      color: #fff;
      line-height: 1;
      display: inline-flex;
      align-items: center;
    }
    #mirual-sync-left.loading {
      color: #aaa;
    }
    #mirual-sync-right {
      font-size: 16px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      vertical-align: middle;
    }
    #mirual-sync-right.authorized {
      color: #4caf50;
    }
    #mirual-sync-right.unauthorized {
      color: #f44336;
    }
    #mirual-sync-btn {
      padding: 6px 12px;
      border: none;
      border-radius: 4px;
      background: #1976d2;
      color: white;
      cursor: pointer;
      font-size: 12px;
    }
    #mirual-loading {
      padding: 20px;
      text-align: center;
      color: #aaa;
    }
    #mirual-error {
      padding: 20px;
      text-align: center;
      color: #ff6b6b;
      background: #2a1a1a;
      border-radius: 3px;
    }
    #mirual-play-icon {
      margin-right: 6px;
    }
    #mirual-sync-text {
      line-height: 1;
    }
    #mirual-token-status {
      color: #4caf50;
      margin-left: 12px;
      font-weight: 600;
      line-height: 1;
    }

    /* Notification Styles */
    #mirual-notification {
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 8px;
      color: white;
      font-size: 14px;
      z-index: 999999;
      opacity: 1;
      transition: opacity 0.3s;
    }
    #mirual-notification-success { background: #4caf50; }
    #mirual-notification-error { background: #f44336; }
    #mirual-notification-info { background: #2196f3; }
    #mirual-notification-warning { background: #ff9800; }
    #mirual-notification.fade-out {
      opacity: 0;
      transition: opacity 0.3s;
    }

    /* Modal Styles */
    #mirual-token-modal {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 999999;
    }
    #mirual-token-modal > div {
      background: #1a1a1a;
      padding: 25px;
      border-radius: 12px;
      max-width: 500px;
      width: 90%;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
      border: 1px solid #333;
    }
    #mirual-modal-title {
      margin: 0 0 15px 0;
      color: #3db4f2;
      font-size: 22px;
      text-align: center;
    }
    #mirual-modal-info {
      background: rgba(61, 180, 242, 0.1);
      padding: 15px;
      border-radius: 8px;
      border-left: 3px solid #3db4f2;
      margin-bottom: 20px;
    }
    #mirual-modal-info-title {
      color: #ccc;
      margin: 0 0 10px 0;
      font-size: 14px;
    }
    #mirual-modal-info-list {
      color: #aaa;
      font-size: 13px;
      padding-left: 20px;
      margin: 0;
    }
    #mirual-modal-btn {
      display: block;
      text-align: center;
      background: #3db4f2;
      color: #fff;
      padding: 12px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: bold;
      margin-bottom: 20px;
    }
    #mirual-modal-btn:hover {
      background: #2a9be0;
    }
    #mirual-modal-label {
      display: block;
      color: #888;
      font-size: 13px;
      margin-bottom: 8px;
    }
    #mirual-modal-input {
      width: 100%;
      padding: 12px;
      border: 1px solid #333;
      border-radius: 8px;
      background: #0d0d0d;
      color: #fff;
      font-size: 14px;
      box-sizing: border-box;
      font-family: monospace;
    }
    #mirual-modal-buttons {
      display: flex;
      gap: 10px;
      justify-content: flex-end;
      margin-top: 20px;
    }
    #mirual-modal-btn-action {
      padding: 10px 20px;
      border: none;
      border-radius: 6px;
      color: #fff;
      cursor: pointer;
      font-weight: bold;
    }
    #mirual-modal-btn-save {
      background: #3db4f2;
    }
    #mirual-modal-btn-cancel {
      background: #444;
    }
    #mirual-modal-btn-delete {
      background: #d32f2f;
    }
  `);

  // ==================== УТИЛИТЫ ====================
  const $ = (selector) => document.querySelector(selector);

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function createEl(tag, id) {
    const el = document.createElement(tag);
    if (id) el.id = id;
    return el;
  }

  // ==================== СОСТОЯНИЕ ====================
  const state = {
    animeId: null,
    shikimoriId: null,
    currentEpisode: 1,
    totalEpisodes: null,
    isSyncing: false,
    lastSyncedEpisode: null,
    userId: null,
  };

  function getAnimeIdFromUrl() {
    return window.location.pathname.match(/\/anime\/(\d+)/)?.[1] ?? null;
  }

  function getToken() {
    return GM_getValue(CONFIG.STORAGE_KEY, null);
  }

  function setToken(token) {
    GM_setValue(CONFIG.STORAGE_KEY, token);
  }

  async function gmRequest(options) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        timeout: 10000,
        ...options,
        onload: (resp) => {
          if (resp.status >= 200 && resp.status < 400) {
            resolve({ text: resp.responseText, finalUrl: resp.finalUrl });
          } else {
            reject(new Error(`HTTP ${resp.status}`));
          }
        },
        onerror: () => reject(new Error("Сетевая ошибка")),
        ontimeout: () => reject(new Error("Таймаут")),
      });
    });
  }

  // ==================== ANILIST API ====================
  async function getAuthenticatedUser(token) {
    const query = `
            query {
                Viewer {
                    id
                    name
                    avatar { medium }
                }
            }
        `;
    const { text } = await gmRequest({
      method: "POST",
      url: CONFIG.ANILIST_API,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      data: JSON.stringify({ query }),
    });
    const data = JSON.parse(text);
    return data.data?.Viewer ?? null;
  }

  async function fetchAniListData(animeId, token) {
    const query = `
            query ($id: Int) {
                Media (id: $id, type: ANIME) {
                    id
                    title { romaji, english, native }
                    episodes
                    status
                }
            }
        `;
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const { text } = await gmRequest({
      method: "POST",
      url: CONFIG.ANILIST_API,
      headers,
      data: JSON.stringify({ query, variables: { id: parseInt(animeId) } }),
    });
    const data = JSON.parse(text);
    return data.data?.Media ?? null;
  }

  async function updateAniListProgress(animeId, episode, token) {
    const mutation = `
            mutation ($mediaId: Int, $progress: Int) {
                SaveMediaListEntry (mediaId: $mediaId, progress: $progress) {
                    id
                    progress
                    status
                    mediaId
                }
            }
        `;
    try {
      const variables = {
        mediaId: parseInt(animeId),
        progress: parseInt(episode),
      };

      const { text } = await gmRequest({
        method: "POST",
        url: CONFIG.ANILIST_API,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        data: JSON.stringify({
          query: mutation,
          variables,
        }),
      });

      const result = JSON.parse(text);

      if (result.errors) {
        throw new Error(result.errors[0]?.message || "API Error");
      }

      if (result.data?.SaveMediaListEntry) {
        return true;
      }
      return false;
    } catch (error) {
      throw error;
    }
  }

  // ==================== SHIKIMORI API ====================
  async function searchShikimoriId(title) {
    const queries = [
      title.romaji,
      title.english,
      title.native,
      ...[title.romaji, title.english].flatMap((t) =>
        t
          ? [
              t.split(":")[0].trim(),
              t.replace(/\s+2nd\s+Season|\s+Season\s+\d+/gi, "").trim(),
            ]
          : [],
      ),
    ]
      .filter(Boolean)
      .filter((v, i, a) => a.indexOf(v) === i);

    for (const query of queries) {
      try {
        const { text } = await gmRequest({
          url: `${CONFIG.SHIKIMORI_API}?search=${encodeURIComponent(query)}&limit=5`,
        });
        const results = JSON.parse(text);
        if (results?.length > 0) {
          const lowerQuery = query.toLowerCase();
          const bestMatch =
            results.find(
              (anime) =>
                anime.name.toLowerCase().includes(lowerQuery) ||
                anime.russian?.toLowerCase().includes(lowerQuery),
            ) ?? results[0];
          return bestMatch.id;
        }
      } catch (e) {
        // Игнорируем ошибки
      }
    }
    throw new Error("Shikimori ID не найден");
  }

  // ==================== KODIK PLAYER ====================
  function createPlayerContainer() {
    const container = createEl("div", "mirual-player-container");
    return container;
  }

  function createPlayerIframe(shikimoriId, episode = 1) {
    const iframe = createEl("iframe", "kodik-player-iframe");
    iframe.src = `https://${CONFIG.KODIK_DOMAIN}/find-player?shikimoriID=${shikimoriId}&episode=${episode}`;
    iframe.allow =
      "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
    iframe.allowFullscreen = true;
    return iframe;
  }

  function createLoadingElement(text = "Загрузка плеера Kodik...") {
    const div = createEl("div", "mirual-loading");
    div.innerHTML =
      '<span class="material-symbols-rounded" style="vertical-align: middle; margin-right: 6px;">search</span>' +
      text;
    return div;
  }

  function createErrorElement(message) {
    const div = createEl("div", "mirual-error");
    div.innerHTML =
      '<span class="material-symbols-rounded" style="vertical-align: middle; margin-right: 6px;">error</span>' +
      message;
    return div;
  }

  // ==================== УВЕДОМЛЕНИЯ ====================
  function showNotification(message, type = "info") {
    const notification = createEl("div", `mirual-notification-${type}`);
    notification.id = "mirual-notification";
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => {
      notification.classList.add("fade-out");
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  // ==================== СИНХРОНИЗАЦИЯ ====================
  let lastKnownEpisode = 1;
  let syncTimeout = null;

  // Отслеживание времени просмотра
  const episodeWatchTime = {}; // { episode: { watched: 0, total: 0, synced: false } }
  let currentEpisode = 1;
  let videoDuration = 0; // Длительность видео в секундах
  let videoCurrentTime = 0; // Текущее время в секундах

  async function syncProgress(episode, force = false) {
    const token = getToken();
    if (!token) {
      return;
    }

    if (episode === state.lastSyncedEpisode && !force) {
      return;
    }

    if (state.isSyncing || !state.animeId) {
      return;
    }

    state.isSyncing = true;

    if (syncTimeout) clearTimeout(syncTimeout);
    syncTimeout = setTimeout(async () => {
      try {
        const success = await updateAniListProgress(
          state.animeId,
          episode,
          token,
        );
        if (success) {
          state.lastSyncedEpisode = episode;
          if (episodeWatchTime[episode]) {
            episodeWatchTime[episode].synced = true;
          }
          // Обновляем текст в панели — добавляем информацию о просмотренной серии
          const syncLeftEl = $("#mirual-sync-left");
          if (syncLeftEl) {
            syncLeftEl.innerHTML = `<span class="material-symbols-rounded" id="mirual-play-icon">play_arrow</span> <span id="mirual-sync-text">Смотреть онлайн</span> <span id="mirual-token-status">Серия ${episode} просмотрена и синхронизирована</span>`;
            // Возвращаем исходный текст через 5 секунд
            setTimeout(() => {
              syncLeftEl.innerHTML =
                '<span class="material-symbols-rounded" id="mirual-play-icon">play_arrow</span> <span id="mirual-sync-text">Смотреть онлайн</span>';
            }, 5000);
          }
        }
      } catch (e) {
        console.error("[Sync] Ошибка синхронизации:", e.message);
      } finally {
        state.isSyncing = false;
      }
    }, CONFIG.DEBOUNCE_DELAY);
  }

  function initPlayerSync(iframe) {
    const token = getToken();
    if (!token) return;

    window.addEventListener("message", (event) => {
      if (event.origin !== `https://${CONFIG.KODIK_DOMAIN}`) return;

      const data = event.data;

      // Kodik отправляет события в формате: {key: "...", value: ...}
      if (!data?.key) return;

      // Событие: время воспроизведения (в секундах)
      if (data.key === "kodik_player_time_update") {
        videoCurrentTime = data.value;

        if (!episodeWatchTime[currentEpisode]) {
          episodeWatchTime[currentEpisode] = {
            watched: 0,
            total: videoDuration,
            synced: false,
          };
        }
        episodeWatchTime[currentEpisode].watched = videoCurrentTime;
        episodeWatchTime[currentEpisode].total = videoDuration;

        const percent =
          videoDuration > 0 ? videoCurrentTime / videoDuration : 0;

        if (
          percent >= CONFIG.SYNC_WATCHED_PERCENT &&
          !episodeWatchTime[currentEpisode].synced
        ) {
          syncProgress(currentEpisode);
        }
      }

      // Событие: перемотка — обновляем время
      if (data.key === "kodik_player_seek" && data.value?.time) {
        videoCurrentTime = data.value.time;
        if (episodeWatchTime[currentEpisode]) {
          episodeWatchTime[currentEpisode].watched = videoCurrentTime;
        }
      }

      // Событие: длительность видео (в секундах)
      if (data.key === "kodik_player_duration_update") {
        videoDuration = data.value;

        if (episodeWatchTime[currentEpisode]) {
          episodeWatchTime[currentEpisode].total = videoDuration;
        }
      }

      // Событие: текущая серия
      if (data.key === "kodik_player_current_episode" && data.value) {
        const episodeData = data.value;
        const episode =
          episodeData.episode || episodeData.number || currentEpisode;

        if (episode !== currentEpisode) {
          currentEpisode = episode;
        }

        if (!episodeWatchTime[currentEpisode]) {
          episodeWatchTime[currentEpisode] = {
            watched: videoCurrentTime,
            total: videoDuration,
            synced: false,
          };
        }
      }
    });

    window.addEventListener("beforeunload", () => {
      if (currentEpisode > state.lastSyncedEpisode) {
        syncProgress(currentEpisode, true);
      }
    });
  }

  // ==================== UI ДЛЯ ТОКЕНА ====================
  function createTokenModal() {
    const modal = createEl("div", "mirual-token-modal");

    const content = createEl("div");
    content.innerHTML = `
      <h2 id="mirual-modal-title"><span class="material-symbols-rounded" style="vertical-align: middle; margin-right: 6px;">lock</span>AniList Авторизация</h2>
      <div id="mirual-modal-info">
        <p id="mirual-modal-info-title"><strong><span class="material-symbols-rounded" style="vertical-align: middle; margin-right: 6px;">info</span>Как получить токен:</strong></p>
        <ol id="mirual-modal-info-list">
          <li>Нажмите кнопку "Получить токен" ниже</li>
          <li>Разрешите доступ к вашему аккаунту</li>
          <li>Скопируйте токен со страницы AniList</li>
          <li>Вставьте токен в поле ниже и нажмите "Сохранить"</li>
        </ol>
      </div>
      <a href="https://anilist.co/api/v2/oauth/authorize?client_id=${CONFIG.CLIENT_ID}&response_type=token"
         target="_blank"
         id="mirual-modal-btn">
         <span class="material-symbols-rounded" style="vertical-align: middle; margin-right: 6px;">link</span>Получить токен
      </a>
      <label id="mirual-modal-label" for="mirual-token-input">Ваш токен:</label>
      <input type="text" id="mirual-token-input" placeholder="Вставьте скопированный токен сюда"
          id="mirual-modal-input">
      <div id="mirual-modal-buttons">
        <button id="mirual-modal-btn-delete">
          <span class="material-symbols-rounded" style="vertical-align: middle; margin-right: 6px;">delete</span>Удалить
        </button>
        <button id="mirual-modal-btn-cancel">
          Отмена
        </button>
        <button id="mirual-modal-btn-save">
          <span class="material-symbols-rounded" style="vertical-align: middle; margin-right: 6px;">check</span>Сохранить
        </button>
      </div>
    `;

    modal.appendChild(content);
    return modal;
  }

  function showTokenModal() {
    const existing = $("#mirual-token-modal");
    if (existing) existing.remove();

    const modal = createTokenModal();
    document.body.appendChild(modal);

    const tokenInput = $("#mirual-token-input");
    const currentToken = getToken();
    if (currentToken) {
      tokenInput.value = currentToken;
    }
    tokenInput.focus();

    $("#mirual-modal-btn-save").onclick = () => {
      const token = tokenInput.value.trim();
      if (token) {
        setToken(token);
        showNotification("Токен сохранён!", "success");
        modal.remove();
        // Перезагружаем страницу для применения токена
        setTimeout(() => {
          window.location.reload();
        }, 500);
      }
    };

    $("#mirual-modal-btn-delete").onclick = () => {
      setToken(null);
      showNotification("Токен удалён", "info");
      modal.remove();
      state.userId = null;
      setTimeout(() => {
        const overview = $(".overview");
        if (overview) initPlayer(overview);
      }, 100);
    };

    $("#mirual-modal-btn-cancel").onclick = () => modal.remove();

    tokenInput.onkeydown = (e) => {
      if (e.key === "Enter") $("#mirual-modal-btn-save").click();
    };
  }

  async function checkTokenStatus() {
    const token = getToken();
    if (!token) return;

    try {
      const user = await getAuthenticatedUser(token);
      if (user) {
        state.userId = user.id;
        return user;
      }
    } catch (e) {
      setToken(null);
      state.userId = null;
    }
    return null;
  }

  // ==================== ОСНОВНАЯ ЛОГИКА ====================
  async function initPlayer(target) {
    if ($("#mirual-player-container")) {
      return;
    }

    // Сбрасываем переменные синхронизации для нового аниме
    lastKnownEpisode = 1;

    const token = getToken();
    const container = createPlayerContainer();

    if (target.firstChild) {
      target.insertBefore(container, target.firstChild);
    } else {
      target.appendChild(container);
    }

    // Добавляем статус синхронизации
    const syncBar = createEl("div", "mirual-sync-bar");

    // Левая часть: информация о серии (или загрузка)
    const syncLeft = createEl("span", "mirual-sync-left");
    syncLeft.innerHTML =
      '<span class="material-symbols-rounded" style="vertical-align: middle; margin-right: 6px;">hourglass_empty</span>Загрузка плеера...';
    syncLeft.classList.add("loading");

    // Правая часть: статус авторизации
    const syncRight = createEl("span");
    syncRight.id = "mirual-sync-right";
    syncRight.className = token ? "authorized" : "unauthorized";
    syncRight.innerHTML = token
      ? '<span class="material-symbols-rounded success">check_circle</span>'
      : '<span class="material-symbols-rounded error">cancel</span>';
    syncRight.title = token
      ? "Авторизован — нажмите для управления токеном"
      : "Не авторизован — нажмите для входа";

    // Клик по иконке открывает настройки токена
    syncRight.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      showTokenModal();
    };

    syncBar.appendChild(syncLeft);
    syncBar.appendChild(syncRight);
    container.appendChild(syncBar);

    try {
      const animeId = getAnimeIdFromUrl();
      if (!animeId) throw new Error("ID аниме не найден в URL");

      state.animeId = animeId;
      syncLeft.innerHTML =
        '<span class="material-symbols-rounded" style="vertical-align: middle; margin-right: 6px;">satellite</span>Получение данных AniList...';

      const aniListData = await fetchAniListData(animeId, token);
      state.totalEpisodes = aniListData.episodes;

      // Получаем прогресс пользователя
      let userProgress = 0;
      if (aniListData && token) {
        const viewerQuery = `
          query ($userId: Int, $mediaId: Int) {
            MediaList (userId: $userId, mediaId: $mediaId) {
              progress
            }
          }
        `;
        try {
          const { text } = await gmRequest({
            method: "POST",
            url: CONFIG.ANILIST_API,
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            data: JSON.stringify({
              query: viewerQuery,
              variables: { userId: state.userId, mediaId: parseInt(animeId) },
            }),
          });
          const result = JSON.parse(text);
          const progress = result.data?.MediaList?.progress;
          if (progress !== null && progress !== undefined) {
            userProgress = progress;
            state.lastSyncedEpisode = progress;
            lastKnownEpisode = progress;
          }
        } catch (e) {
          // Тихо пропускаем ошибку
        }
      }

      // Обновляем текст с номером серии
      syncLeft.innerHTML =
        '<span class="material-symbols-rounded" id="mirual-play-icon">play_arrow</span> <span id="mirual-sync-text">Смотреть онлайн</span>';
      syncLeft.classList.remove("loading");

      syncLeft.innerHTML =
        '<span class="material-symbols-rounded" style="vertical-align: middle; margin-right: 6px;">search</span> Поиск на Shikimori...';
      state.shikimoriId = await searchShikimoriId(aniListData.title);

      syncLeft.innerHTML =
        '<span class="material-symbols-rounded" style="vertical-align: middle; margin-right: 6px;">movie</span> Загрузка плеера...';

      // Определяем, с какой серии начать
      let startEpisode = 1;
      if (state.lastSyncedEpisode > 0) {
        startEpisode = state.lastSyncedEpisode + 1;
      }

      const iframe = createPlayerIframe(state.shikimoriId, startEpisode);
      container.appendChild(iframe);

      if (token) {
        initPlayerSync(iframe);
      }

      // Финальный текст
      syncLeft.innerHTML =
        '<span class="material-symbols-rounded" id="mirual-play-icon">play_arrow</span> <span id="mirual-sync-text">Смотреть онлайн</span>';
    } catch (error) {
      container.appendChild(createErrorElement(error.message));
      syncLeft.innerHTML =
        '<span class="material-symbols-rounded" style="vertical-align: middle; margin-right: 6px;">close</span>Ошибка загрузки';
    }
  }

  // ==================== SPA НАБЛЮДАТЕЛЬ ====================
  function initSPAObserver() {
    let lastPath = window.location.pathname;
    let playerInitialized = false;

    const checkPage = () => {
      if (!window.location.pathname.match(/\/anime\/\d+/)) {
        playerInitialized = false;
        return;
      }

      const overview = $(".overview");
      if (overview && !playerInitialized) {
        initPlayer(overview);
        playerInitialized = true;
      }
    };

    const observer = new MutationObserver(() => {
      const overview = $(".overview");
      if (overview && !playerInitialized) {
        initPlayer(overview);
        playerInitialized = true;
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    const urlObserver = new MutationObserver(() => {
      if (window.location.pathname !== lastPath) {
        lastPath = window.location.pathname;
        playerInitialized = false;
        setTimeout(checkPage, 500);
      }
    });
    urlObserver.observe(document, { subtree: true, childList: true });

    window.addEventListener("popstate", () => {
      playerInitialized = false;
      checkPage();
    });

    setTimeout(checkPage, 500);
    checkPage();
    setTimeout(checkPage, 1500);
    setTimeout(checkPage, 3000);
  }

  // ==================== ЗАПУСК ====================
  (async () => {
    await checkTokenStatus();
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initSPAObserver);
    } else {
      initSPAObserver();
    }
  })();
})();
