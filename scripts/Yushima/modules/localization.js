/**
 * Localization system
 */
const Localization = {
  currentLanguage: null,

  // Translation dictionary
  translations: {
    en: {
      // Output window
      outputWindowTitle: 'Output',
      outputFilterAll: 'All',
      outputFilterInfo: 'Info',
      outputFilterWarnings: 'Warnings',
      outputFilterErrors: 'Errors',
      outputFilterSuccess: 'Success',
      outputFilterDebug: 'Debug',
      outputClearButton: 'Clear',

      // Settings dialog
      settingsTitle: 'Settings',
      settingsProgressThresholdLabel: 'Progress threshold for marking as watched (0.01-1.0):',
      settingsAutoMarkLabel: 'Auto-mark episodes',
      settingsTimeoutLabel: 'Player activity timeout (ms):',
      settingsOutputWindowEnabledLabel: 'Enable output window',
      settingsSaveButton: 'Save',
      settingsCancelButton: 'Cancel',
      settingsSaved: 'Settings saved!',
      settingsSavedRefresh: 'Settings saved! Please refresh the page for menu changes to take effect.',

      // Player messages
      playerFlowLoad: 'Player: Flow load event received',
      playerFlowReady: 'Player: Flow ready event received',
      playerFlowResume: 'Player: Flow resume event received',
      playerFlowSeekStarted: 'Player: Seek started event received',
      playerFlowSeekCompleted: 'Player: Seek completed event received',
      playerFlowPause: 'Player: Pause event received',
      playerUnknownStringMessage: 'Player: Unknown string message received: {message}',
      playerDurationUpdated: 'Player: Duration updated to {minutes}m {seconds}s',
      playerTimeUpdated: 'Player: Current time updated to {minutes}m {seconds}s',
      playerVideoStarted: 'Player: Video started',
      playerVideoPlay: 'Player: Video play detected',
      playerAdvertEnded: 'Player: Advert ended, playback resumed',
      playerCurrentEpisode: 'Player: Current episode information received',
      playerLegacyState: 'Player: Legacy player_state message received',
      playerVideoProgress: 'Player: Video progress message received',
      playerVideoCompletion: 'Player: Video completion event received',
      playerTimeUpdate: 'Player: Time update event received',
      playerCapabilitiesRequest: 'Player: Capabilities/progress request received',
      playerUnknownEvent: 'Player: Unknown event type "{event}" received',
      playerVideoEnded: 'Player: Video ended event received',
      playerProgressReached: 'Episode {episode} reached {progress}% - marking as watched',
      playerProgressMilestone: 'Episode {episode} - Viewed {milestone}%',
      playerThresholdReached: 'Episode {episode} reached {threshold}% - threshold for marking as watched',
      playerMarkSuccess: 'Successfully marked episode {episode} for anime {title} as watched',
      playerCannotMark: 'Cannot mark episode as watched - not authenticated',
      playerEpisodeExceedsMax: 'Episode {episode} exceeds max episodes ({maxEpisodes}) for this anime, not marking as watched',
      playerVideoEndedMark: 'Player: Video ended - marking as watched',

      // Performance and statistics messages
      playerPerformanceMessage: 'Performance: {message}',

      // Error messages
      playerErrorMessage: 'Error processing player message: {message}',
      playerHandlerError: 'Error in message handler: {message}',
      playerCapabilitiesError: 'Player: Failed to respond to capability request: {message}',

      // Authentication
      authStatusAuthenticated: 'Authenticated',
      authStatusAuthNeeded: 'OAuth authentication required',
      authButtonAuthenticate: 'Authenticate',
      authSuccess: 'Authentication successful!',
      authFailed: 'Authentication failed!',
      authInstructionsStep1: '1. Click the "Authenticate" button',
      authInstructionsStep2: '2. Sign in to your Shikimori account in the opened window',
      authInstructionsStep3: '3. Authorize the application',
      authInstructionsStep4: '4. You will be redirected to a page with an authorization code',
      authInstructionsStep5: '5. Copy the authorization code',
      authEnterCodeTitle: 'Enter Authorization Code',
      authEnterCodeLabel: 'Authorization code:',
      authEnterCodeButton: 'Apply Code',
      authEnterCodePlaceholder: 'Paste code here...',
      authStatusUpdateAuthenticated: 'Authentication status updated: AUTHENTICATED',
      authStatusUpdateNotAuthenticated: 'Authentication status updated: NOT AUTHENTICATED',
      authRequiredMessage: 'Authentication required - Click authenticate button to enable auto-marking',
      authInstructions: 'Authorization code detected in URL. Processing authentication...',
      authUrlDetected: 'Please return to this page after authorizing, or paste the URL you were redirected to:',
      authUrlInputLabel: 'Paste full URL with authorization code:',
      authApplyCodeFromUrlButton: 'Apply code from URL',
      authAutoPasteButton: 'Auto Paste URL',

      // Menu commands
      menuSettings: 'Settings',
      menuShowOutput: 'Show Output Window',
      menuOutputShown: 'Output window shown',
      menuOutputHidden: 'Output window hidden',

      // Other messages
      animeNotFound: 'Could not fetch anime data, defaulting to episode 1',
      getWatchingEpisodeError: 'Error getting watching episode: {error}',
      apiRequestFailed: 'API request failed with status: {status}',
      apiError: 'API error: {endpoint}',
      userRateNotFound: 'No user rate data found',
      updateEpisodeProgressError: 'Failed to update episode progress. Status: {status}',
      createAnimeRateError: 'Failed to create anime rate. Status: {status}',
      getCurrentUserIdError: 'Error getting current user ID: {error}',
      getUserRateError: 'Error getting user rate: {error}',
      getAnimeDataError: 'Could not fetch anime data, defaulting to episode 1',
      invalidAnimeId: 'Invalid animeId provided to getWatchingEpisode: {animeId}',
      oauthClientSecretMissing: 'OAuth client_secret not configured.',
      refreshAccessTokenError: 'Error refreshing access token: {error}',
      exchangeCodeError: 'Error exchanging code for token: {error}',
      getCurrentUserIdNotAvailable: 'Could not get current user ID',
      noAccessToken: 'No access token available for authenticated request',
      noAccessTokenForUpdate: 'No access token available for updating episode progress',
      creatingAnimeRate: 'Creating new anime rate entry',
      failedToUpdateProgress: 'Failed to update episode progress for anime {animeId}, episode {episode}',
      defaultToEpisode1: 'Defaulting to episode 1 if no user rate or invalid data',
      failedToCreatePlayer: 'Failed to create player element',
      invalidAnimeIdDetected: 'Invalid animeId detected, possible injection attempt: {animeId}',
      playerElementsExistAfterCleanup: 'Warning: {count} player elements still exist after cleanup',

      // Anime page
      playerHeadline: 'player',

      // Default values
      defaultEpisode: 1
    },
    ru: {
      // Output window
      outputWindowTitle: 'Окно логов',
      outputFilterAll: 'Все',
      outputFilterInfo: 'Информация',
      outputFilterWarnings: 'Предупреждения',
      outputFilterErrors: 'Ошибки',
      outputFilterSuccess: 'Успех',
      outputFilterDebug: 'Отладка',
      outputClearButton: 'Очистить',

      // Settings dialog
      settingsTitle: 'Настройки',
      settingsProgressThresholdLabel: 'Порог прогресса для отметки как просмотренное (0.01-1.0):',
      settingsAutoMarkLabel: 'Автоотметка эпизодов',
      settingsTimeoutLabel: 'Таймаут активности плеера (мс):',
      settingsOutputWindowEnabledLabel: 'Включить окно вывода',
      settingsSaveButton: 'Сохранить',
      settingsCancelButton: 'Отмена',
      settingsSaved: 'Настройки сохранены!',
      settingsSavedRefresh: 'Настройки сохранены! Пожалуйста, обновите страницу, чтобы изменения в меню вступили в силу.',

      // Player messages
      playerFlowLoad: 'Плеер: Получено событие загрузки потока',
      playerFlowReady: 'Плеер: Получено событие готовности потока',
      playerFlowResume: 'Плеер: Получено событие возобновления потока',
      playerFlowSeekStarted: 'Плеер: Получено событие начала перемотки',
      playerFlowSeekCompleted: 'Плеер: Получено событие завершения перемотки',
      playerFlowPause: 'Плеер: Получено событие паузы',
      playerUnknownStringMessage: 'Плеер: Получено неизвестное строковое сообщение: {message}',
      playerDurationUpdated: 'Плеер: Продолжительность обновлена до {minutes}м {seconds}с',
      playerTimeUpdated: 'Плеер: Текущее время обновлено до {minutes}м {seconds}с',
      playerVideoStarted: 'Плеер: Видео запущено',
      playerVideoPlay: 'Плеер: Обнаружено воспроизведение видео',
      playerAdvertEnded: 'Плеер: Реклама завершена, воспроизведение возобновлено',
      playerCurrentEpisode: 'Плеер: Получена информация о текущем эпизоде',
      playerLegacyState: 'Плеер: Получено устаревшее сообщение состояния плеера',
      playerVideoProgress: 'Плеер: Получено сообщение о прогрессе видео',
      playerVideoCompletion: 'Плеер: Получено событие завершения видео',
      playerTimeUpdate: 'Плеер: Получено событие обновления времени',
      playerCapabilitiesRequest: 'Плеер: Получен запрос возможностей/прогресса',
      playerUnknownEvent: 'Плеер: Получено неизвестное событие "{event}"',
      playerVideoEnded: 'Плеер: Получено событие окончания видео',
      playerProgressReached: 'Эпизод {episode} достиг {progress}% для пометки как просмотренное',
      playerProgressMilestone: 'Эпизод {episode} - Просмотрено {milestone}%',
      playerThresholdReached: 'Эпизод {episode} достиг {threshold}% порога для пометки как просмотренное',
      playerMarkSuccess: 'Эпизод {episode} для аниме «{title}» успешно помечен как просмотренный',
      playerCannotMark: 'Без авторизации невозможно пометить эпизод как просмотренный',
      playerEpisodeExceedsMax: 'Эпизод {episode} превышает максимальное количество серий ({maxEpisodes}) для этого аниме, не отмечаем как просмотренный',
      playerVideoEndedMark: 'Плеер: Видео завершено и помечено как просмотренное',

      // Performance and statistics messages
      playerPerformanceMessage: 'Производительность: {message}',

      // Error messages
      playerErrorMessage: 'Ошибка обработки сообщения плеера: {message}',
      playerHandlerError: 'Ошибка обработчика сообщений: {message}',
      playerCapabilitiesError: 'Плеер: Не удалось ответить на запрос возможностей: {message}',

      // Authentication
      authStatusAuthenticated: 'Аутентифицирован',
      authStatusAuthNeeded: 'Требуется OAuth аутентификация',
      authButtonAuthenticate: 'Аутентифицироваться',
      authSuccess: 'Аутентификация успешна!',
      authFailed: 'Аутентификация не удалась!',
      authInstructionsStep1: '1. Нажмите кнопку "Аутентифицироваться"',
      authInstructionsStep2: '2. Войдите в свой аккаунт Shikimori в открывшемся окне',
      authInstructionsStep3: '3. Предоставьте разрешение, если запрашивает',
      authInstructionsStep4: '4. Вас перенапрявит на страницу с кодом авторизации',
      authInstructionsStep5: '5. Скопируйте код авторизации и вставьте в поле ниже',
      authEnterCodeTitle: 'Введите код авторизации',
      authEnterCodeLabel: 'Код авторизации:',
      authEnterCodeButton: 'Применить код',
      authEnterCodePlaceholder: 'Вставьте код сюда...',
      authStatusUpdateAuthenticated: 'Статус аутентификации обновлён: АВТОРИЗОВАН',
      authStatusUpdateNotAuthenticated: 'Статус: НЕ АВТОРИЗОВАН',
      authRequiredMessage: 'Требуется аутентификация - Нажмите кнопку аутентификации, чтобы включить автопометку',
      authInstructions: 'Код авторизации обнаружен в URL. Обработка аутентификации...',
      authUrlDetected: 'Пожалуйста, вернитесь на эту страницу после авторизации или вставьте URL, на который вас перенаправило:',
      authUrlInputLabel: 'Вставьте полный URL с кодом авторизации:',
      authApplyCodeFromUrlButton: 'Применить код из URL',
      authAutoPasteButton: 'Автоматически вставить URL',

      // Menu commands
      menuSettings: 'Настройки',
      menuShowOutput: 'Показать окно вывода',
      menuOutputShown: 'Окно вывода показано',
      menuOutputHidden: 'Окно вывода скрыто',

      // Other messages
      animeNotFound: 'Не удалось получить данные аниме, по умолчанию эпизод 1',
      getWatchingEpisodeError: 'Ошибка получения просматриваемого эпизода: {error}',
      apiRequestFailed: 'Запрос к API не удался со статусом: {status}',
      apiError: 'Ошибка API: {endpoint}',
      userRateNotFound: 'Данные пользовательского рейтинга не найдены',
      updateEpisodeProgressError: 'Не удалось обновить прогресс эпизода. Статус: {status}',
      createAnimeRateError: 'Не удалось создать запись рейтинга аниме. Статус: {status}',
      getCurrentUserIdError: 'Ошибка получения ID текущего пользователя: {error}',
      getUserRateError: 'Ошибка получения рейтинга пользователя: {error}',
      getAnimeDataError: 'Не удалось получить данные аниме, по умолчанию эпизод 1',
      invalidAnimeId: 'AnimeId для getWatchingEpisode предоставлен неверно: {animeId}',
      oauthClientSecretMissing: 'OAuth client_secret не настроен.',
      refreshAccessTokenError: 'Ошибка обновления токена доступа: {error}',
      exchangeCodeError: 'Ошибка обмена кода на токен: {error}',
      getCurrentUserIdNotAvailable: 'Не удалось получить ID текущего пользователя',
      noAccessToken: 'Токен доступа недоступен для аутентифицированного запроса',
      noAccessTokenForUpdate: 'Токен доступа недоступен для обновления прогресса эпизода',
      creatingAnimeRate: 'Создание новой записи рейтинга аниме',
      failedToUpdateProgress: 'Не удалось обновить прогресс эпизода для аниме {animeId}, эпизод {episode}',
      defaultToEpisode1: 'По умолчанию эпизод 1, если нет пользовательского рейтинга или неверные данные',
      failedToCreatePlayer: 'Не удалось создать элемент плеера',
      invalidAnimeIdDetected: 'Обнаружен недействительный ID аниме, возможная попытка инъекции: {animeId}',
      playerElementsExistAfterCleanup: 'Предупреждение: {count} элементов плеера все еще существуют после очистки',

      // Anime page
      playerHeadline: 'плеер',

      // Default values
      defaultEpisode: 1
    }
  },

  // Detect user's language preference
  detectLanguage() {
    // Check for stored language preference
    const storedLang = localStorage.getItem('yushima_language');
    if (storedLang && this.translations[storedLang]) {
      return storedLang;
    }

    // Check browser language
    const browserLang = navigator.language.toLowerCase().substring(0, 2);
    if (this.translations[browserLang]) {
      return browserLang;
    }

    // Default to English
    return 'en';
  },

  // Get translated string
  get(key, params = {}) {
    if (!this.currentLanguage) {
      this.currentLanguage = this.detectLanguage();
    }

    let text = this.translations[this.currentLanguage][key] ||
        this.translations['en'][key] ||
        key;  // Fallback to key if no translation exists

    // Replace placeholders in the format {paramName}
    Object.keys(params).forEach(param => {
      text = text.replace(new RegExp(`{${param}}`, 'g'), params[param]);
    });

    return text;
  },

  // Set language
  setLanguage(lang) {
    if (this.translations[lang]) {
      this.currentLanguage = lang;
      localStorage.setItem('yushima_language', lang);
      return true;
    }
    return false;
  },

  // Get available languages
  getAvailableLanguages() {
    return Object.keys(this.translations);
  }
};
