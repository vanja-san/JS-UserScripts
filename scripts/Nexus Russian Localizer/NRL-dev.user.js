// ==UserScript==
// @name            Nexus Russian Localizer
// @name:ru         Nexus Russian Localizer
// @namespace       http://tampermonkey.net/
// @description     Add Russian localization for Nexus Mods.
// @description:ru  Добавляет русскую локализацию для сайта Nexus Mods.
// @version         2.2.0-dev
// @author          vanja-san
// @match           https://*.nexusmods.com/*
// @icon            https://www.google.com/s2/favicons?sz=64&domain=nexusmods.com
// @downloadURL     https://raw.githubusercontent.com/vanja-san/JS-UserScripts/main/scripts/Nexus Russian Localizer/NRL-dev.user.js
// @updateURL       https://raw.githubusercontent.com/vanja-san/JS-UserScripts/main/scripts/Nexus Russian Localizer/NRL-dev.user.js
// @require         https://raw.githubusercontent.com/vanja-san/JS-UserScripts/main/scripts/Nexus Russian Localizer/translations.js
// @grant           none
// @license         MIT
// ==/UserScript==

(function() {
  'use strict';

  // Константы
  const CONFIG = {
    CACHE_VERSION: 'v1.0.1',
    DB_NAME: 'translationCache',
    DB_VERSION: 1,
    STORE_NAME: 'translations',
    COMPRESSION_THRESHOLD: 100,
    MEMORY_CACHE_LIMIT: 1000,
    BATCH_SIZE: 50,
    BATCH_DELAY: 0,
    PRIORITY_SELECTORS: ['h1', 'h2', 'h3', 'nav', 'button', 'a', '[data-translate-priority="high"]']
  };

  // LRU кэш для памяти
  class LRUCache {
    constructor(limit = CONFIG.MEMORY_CACHE_LIMIT) {
      this.cache = new Map();
      this.limit = limit;
    }

    get(key) {
      if (!this.cache.has(key)) return null;
      const value = this.cache.get(key);
      this.cache.delete(key);
      this.cache.set(key, value);
      return value;
    }

    set(key, value) {
      if (this.cache.size >= this.limit) {
        this.cache.delete(this.cache.keys().next().value);
      }
      this.cache.set(key, value);
    }

    has(key) {
      return this.cache.has(key);
    }

    delete(key) {
      return this.cache.delete(key);
    }

    clear() {
      this.cache.clear();
    }

    get size() {
      return this.cache.size;
    }
  }

  const contextCheckCache = new Map();
  const headingElementsCache = new Set();
  const IGNORED_CLASSES = new Set(['no-translate', 'ignore-translation', 'code', 'pre']);
  const templateCache = new LRUCache(500);

  // Импортируем словари переводов из отдельного файла
  // Словари вынесены в отдельные константы для лучшей организации
  const DICTIONARIES = window.NRL_TRANSLATIONS || {
    main: {}
  };

      "Competitions": "Конкурсы",
      "Interviews": "Интервью",
      "Site News": "Новости сайта",
      "Mod News": "Новости модов",
      "Support": "Поддержка",
      "Help": "Справка",
      "Contact": "Контакты",
      "FAQ": "ЧаВо",
      "Game guides": "Игровые руководства",
      "Tutorial": "Обучение",
      "Tools": "Инструменты",
      "Vortex help": "Справка по Vortex",
      "API documentation": "Документация к API",
      "Install Vortex": "Установить Vortex",
      "Give feedback": "Обратная связь",
      "Give Feedback": "Дать обратную связь",
      "Search": "Поиск",
      "Log in": "Войти",
      "Register": "Регистрация",
      "Download": "Скачать ",
      "Endorse": "Одобрить",
      "Subscribe": "Подписаться",
      "Posts": "Сообщения",
      "Description": "Описание",
      "Requirements": "Зависимости",
      "Permissions": "Условия использования",
      "Log in to": "Вход на ",
      "You need to": "Необходимо",
      "log in": " войти ",
      "before continuing.": "перед тем как продолжить.",
      "Email or Username": "Эл. почта или имя пользователя",
      "Password": "Пароль",
      "Forgot your": "Забыли свой ",
      "Need an account?": "Требуется учётная запись? ",
      "Register here": "Зарегестрируйтесь здесь",
      "Comments": "Комментарии",
      "Files": "Файлы",
      "Speed up your": "Ускорьте свой",
      "modding with": "моддиг с",
      "PREMIUM": "ПРЕМИУМ",
      "One-click collections": "Колекции в один клик",
      "Ad-free experience": "Опыт без рекламы",
      "No-risk cancel anytime": "Отмена в любое время без риска",
      "Fast access to over 450,000 mods on the world’s biggest modding site.": "Быстрый доступ к более чем 450,000 модов на крупнейшем в мире сайте моддинга.",
      "Play your modded games. Faster.": "Играйте в игры с модами. Быстрее.",
      "Save your time with uncapped speeds and instant downloads. Time better spent playing your favourite modded games.": "Экономьте свое время с неограниченной скоростью и мгновенным скачиванием. Лучше время, чтобы играть в ваши любимые игры с модами.",
      "One click to change the game: collections.": "Один клик — и игра меняется: коллекции.",
      "Unlock the shortcut to changing your game with new graphics and gameplay. Instead of downloading each mod in a collection separately, enjoy a cup of coffee while we handle the process!": "Откройте ярлык к изменению вашей игры с новыми графикой и геймплеем. Вместо того чтобы скачивать каждый мод из коллекции по отдельности, наслаждайтесь чашкой кофе, пока мы всё сделаем за вас!",
      "No more Ads. Ever.": "Больше никакой рекламы. Никогда.",
      "Go Premium and never see ads on our site again. The best part? You get to keep this perk, even after your subscription ends!": "Оформите премиум и больше никогда не увидите рекламу на нашем сайте. Лучшая часть? Вы сохраняете это преимущество даже после окончания подписки!",
      "Support mod creators.": "Подержите создателей модов.",
      "We’ve now donated over": "Мы уже пожертвовали более ",
      "to mod authors. As a Premium member, you’re actively supporting the community by helping us maintain and even increase mod rewards for creators.": " авторам модов. Будучи премиум-участником, вы активно поддерживаете сообщество, помогая нам поддерживать и даже увеличивать вознаграждения для создателей модов.",
      "Here’s what the community is saying": "Вот что говорит сообщество",
      "Collection curator": "Куратор коллекции",
      "Modder": "Моддер",
      "Skyrim gamer": "Игрок в Skyrim",
      "Collection Modder": "Моддер коллекций",
      "Frequently Asked Questions": "Часто задаваемые вопросы",
      "What’s included in Premium membership?": "Что входит в премиум-членство?",
      "Premium members enjoy several perks that help to unlock the full potential of modding:": "Премиум-участники получают ряд преимуществ, которые помогают раскрыть весь потенциал моддинга:",
      "Uncapped downloads speeds": "Высокоскоростное скачивание без ограничений",
      "Instant downloads (no delay/countdown)": "Мгновенное скачивание (без задержек/обратного отсчёта)",
      "Multi-threaded downloads": "Многопоточное скачивание",
      "Ad free browsing (forever - even after the Premium membership expires!)": "Просмотр без рекламы (навсегда — даже после истечения срока действия премиум-членства!)",
      "Access to the (exclusive) Supporter Image share": "Доступ к (эксклюзивному) разделу изображений для подписчиков (Supporter Image Share)",
      "The ability to choose a preferred download server": "Возможность выбрать предпочитаемый сервер для скачивания",
      "Viewing more mods per page": "Просмотр большего количества модов на странице",
      "Additional space for personal messages": "Увеличенное место для личных сообщений",
      "What does “one-click collections” mean?": "Что такое «Коллекции в один клик»?",
      "Collections are entire lists of mods that can be downloaded and installed in one go using our mod manager Vortex, which is available for free. While free users can access collections, they will need to trigger the download of every mod in a collection separately. As a Premium user, however, you can start the download and installation of an entire collection with one action, sit back and completely transform your game with ease.": "Коллекции — это целые списки модов, которые можно загрузить и установить одним действием с помощью нашего менеджера модов Vortex, доступного бесплатно. В то время как бесплатные пользователи могут получить доступ к коллекциям, им нужно будет запускать загрузку каждого мода в коллекции отдельно. Однако будучи премиум-участником, вы можете начать загрузку и установку всей коллекции одним действием, после чего останется лишь расслабиться и с лёгкостью полностью преобразовать свою игру.",
      "Do I get to keep any perks once my Premium membership expires?": "Сохранятся ли какие-либо преимущества после истечения срока действия премиум-членства?",
      "Yes! When your Premium membership expires, your account status will be marked as “Supporter” to honour you for giving back to our site and community. As a Supporter, you will never see ads on our site again and you will retain access to the Supporter image share.": "Да! Когда срок вашего премиум-членства истечет, статус вашего аккаунта будет помечен как «Supporter» в знак признательности за ваш вклад в развитие нашего сайта и сообщества. Со статусом «Supporter» вы больше никогда не будете видеть рекламу на нашем сайте, и у вас сохранится доступ к эксклюзивному разделу изображений для подписчиков.",
      "You will, however, lose access to uncapped download speeds and one-click collections, unless you choose to re-subscribe and become a Premium member again.": "Однако вы потеряете доступ к таким функциям, как высокая скорость скачивания без ограничений и коллекции в один клик, если только вы не решите продлить подписку и снова стать премиум-участником.",
      "Do I get to keep my (installed) mods when my Premium membership expires?": "Сохраняю ли я свои (установленные) моды после истечения срока действия премиум-членства?",
      "Yes, absolutely. Any mods you install, whether as a free user or a Premium user, are installed locally on your PC/console. Whether your Premium membership expires or whether you lose access to your account - in any event you get to keep the mods you installed on your computer.": "Да, абсолютно. Любые моды, которые вы установили, будь вы бесплатным или премиум-участником, устанавливаются локально на ваш ПК/консоль. Независимо от того, истечёт ли срок вашего премиум-членства или вы потеряете доступ к своей учётной записи — в любом случае вы сохраните все моды, установленные на вашем компьютере.",
      "Can I get a refund?": "Могу ли я получить возврат средств?",
      "Absolutely, going Premium is risk free as we will refund you, should you so desire, based on the amount of mods you have downloaded in the meantime, provided that you send a refund request to support@nexusmods.com within 14 days of purchase.": "Безусловно. Премиум-подписка не сопряжена с рисками, так как мы вернем вам деньги по вашему запросу. Сумма возврата будет рассчитываться исходя из количества модов, которые вы успели скачать за это время. Для этого необходимо отправить запрос на возврат по адресу support@nexusmods.com в течение 14 дней с момента покупки. ",
      "Please refer to our": "Для ознакомления с деталями нашей ",
      "terms of service": "политики возвратов",
      "to view details regarding our refund policy.": ", пожалуйста, обратитесь к нашим условиям обслуживания.",
      "Network statistics": "Статистика сети",
      "Site Stats": "Стат-ка сайта",
      "Can't see the stats?": "Не видите статистику?",
      "Recently updated": "Недавно обновлены",
      "Recently added": "Недавно добавлены",
      "Most endorsed": "Самые одобренные",
      "What's new": "Что нового",
      "Categories": "Категории",
      "New Release": "Новый релиз",
      "Browse mods": "Посмотреть моды",
      "Welcome back,": "С возвращением,",
      "All games": "Все игры",
      "My games": "Мои игры",
      "Trending": "Популярные",
      "Mod updates": "Обновления модов",
      "Tracked mods": "Отслеживание модов",
      "My stuff": "Мои вещи",
      "My mods": "Мои моды",
      "Mod rewards": "Награды мода",
      "Download history": "История скачиваний",
      "Upload mod": "Добавить мод",
      "Modding tutorials": "Обучение моддингу",
      "Explore": "Изучить",
      "Vortex mod manager": "Менеджер модов Vortex",
      "Members": "Участники",
      "starter mods": " стартовые моды",
      "Start with the essential starter mods and helpful tools to begin your journey.": "Начните с основных стартовых модов и полезных инструментов, чтобы начать своё путешествие.",
      "Install a ready-made set of mods to get started fast": "Установите готовый набор модов, чтобы начать быстро.",
      "Premium users": "Пользователи с премиум ",
      "install complete setups in one click.": "устанавливают готовые сборки в один клик.",
      "Unlock 1-click install": "Разблокируйте установку в один клик.",
      "Free users": "Бесплатным пользователям ",
      "follow a few extra guided steps.": "доступно пошаговое руководство для установки.",
      "Creator rewards": "Вознаграждений",
      "Modding made easy": "Моддинг — это просто",
      "Browse all mods": "Просмотреть все моды",
      "Mods and collections for": "Моды и коллекции для ",
      "You’ve already voted. Thanks for your feedback!": "Вы уже проголосовали. Спасибо за вашу обратную связь!",
      "My Content": "Мой контент",
      "Manage Mod Rewards": "Управление наградами модов",
      "Add a file": "Добавить файл",
      "Blocked users": "Заблокированные пользователи",
      "Analytics": "Аналитика",
      "My profile": "Мой профиль",
      "games.": " игр.",
      "My Files": "Мои файлы",
      "Invitations": "Приглашения",
      "My Nexus Files": "Мои файлы Nexus",
      "Mod details": "Детали мода",
      "Mod status": "Состояние мода",
      "Requirements and mirrors": "Требования и зеркала",
      "Manage files": "Управление файлами",
      "Manage articles": "Управление статьями",
      "Other Files": "Другие файлы",
      "Visible": "Видимый",
      "Hidden": "Скрытый",
      "Manage mod": "Управление модом",
      "Other": "Другое",
      "Delete this mod": "Удалить этот мод",
      "downloads (unique/total)": "Скачиваний (уник./всего)",
      "endorsements": "Одобрений",
      "My Nexus images": "Мои изображения на Nexus",
      "My Nexus videos": "Мои видео на Nexus",
      "My download history": "Моя история скачиваний",
      "Please allow up to 10 minutes for new downloads to appear in this list.": "Пожалуйста, предоставьте до 10 минут для новых загрузок в этом списке.",
      "Download history tracks up to 30,000 files. Fewer than 30,000 mods may appear below, as mods often include multiple files.": "История загрузок отслеживает до 30,000 файлов. Ниже может отображаться меньше 30,000 модов, так как один мод часто включает в себя несколько файлов.",
      "The following users have invited you to edit their mods.": "Следующие пользователи предложили вам изменить свои моды.",
      "Below is a list of mods that you have yet to rate. Give the ones you like a thumbs up. You can change how often you see this reminder in your": "Ниже приведен список модов, которые вам еще предстоит оценить. Дайте тем, кто вам нравится, большой палец вверх. Вы можете изменить, как часто вы видите это напоминание в своих ",
      "preferences": "настройках",
      "Endorse this mod": "Одобрить мод",
      "Abstain from endorsing this mod": "Воздержитесь от одобрения этого мода",
      "Endorsement reminder": "Напоминание об одобрении",
      "Are you enjoying the mods you've downloaded? Endorsing a mod shows your support for the author who created it and helps other users discover quality content. It only takes a few seconds.": "Вам нравятся моды, которые вы загрузили? Одобрение мода показывает вашу поддержку автору, который его создал, и помогает другим пользователям находить качественный контент. Это займет всего несколько секунд.",
      "User": "Пользователь",
      "Mod": "Мод",
      "Date": "Дата",
      "View all": "Смотреть все",
      "View more": "Смотреть все",
      "Get started": "Начать",
      "Next level graphics": "Графика следующего уровня",
      "Auto-install 100s of mods": "Автоматическая установка сотен модов",
      "Epic new content": "Эпический новый контент",
      "Infinite replayability": "Бесконечная реиграбельность",
      "Updated": "Обновлённые",
      "Popular": "Самые популярные",
      "Surprise": "Сюрприз",
      "All time": "За всё время",
      "24 Hours": "За 24 часа",
      "7 Days": "За 7 дней",
      "14 Days": "За 14 дней",
      "28 Days": "За 28 дней",
      "1 Year": "За год",
      "Error": "Ошибка",
      "Premium membership": "Премиум-членство",
      "2 months free": "2 месяца бесплатно",
      "Yearly": "Ежегодно",
      "Billed monthly": "Ежемесячная оплата",
      "billed yearly": " в год",
      "/ month": " / месяц",
      "Alchemy and Crafting": "Алхимия и создание",
      "Balancing": "Баланс",
      "Camera": "Камера",
      "Combat": "Бой",
      "Controller Button Layout": "Макет кнопок контроллера",
      "Debug Console": "Консоль отладки",
      "Gameplay Changes": "Изменение игрового процесса",
      "Gwent": "Гвинт",
      "Hair and Face": "Волосы и лицо",
      "Inventory": "Инвентарь",
      "Overhaul": "Капитальный ремонт",
      "ReShade Preset": "Пресеты для ReShade",
      "Save Games": "Сохранения игры",
      "Signs": "Знаки",
      "Tweaks": "Твики",
      "No thanks": "Нет спасибо ",
      "(Basic membership).": "(Базовое членство).",
      "No. of downloads": "Кол-во скачиваний",
      "Or get started manually": "Или начните вручную",
      "Stage 1": "1 этап",
      "Stage 2": "2 этап",
      "Stage 3": "3 этап",
      "Core mods": "Моды-ядра",
      "Core mods are required foundation mods that enable other mods to work properly. Install these first to ensure your game is ready for modding.": "Моды-ядра — это обязательные фундаментальные моды, которые обеспечивают работу других модов. Установите их в первую очередь, чтобы ваша игра была готова к моддингу.",
      "Beginner mods": "Моды для начинающих",
      "Beginner mods are fun and useful mods that enhance your experience. These are great first picks to see what modding can do.": "Моды для начинающих — это интересные и полезные моды, которые улучшают ваш игровой опыт. Они отлично подходят для первого знакомства с возможностями моддинга.",
      "Power-up with": "Улучши свои",
      "Modding guides & resources": "Руководства и ресурсы по моддингу",
      "How to mod": "Как установить моды",
      "Everything you need to start modding": "Всё необходимое для начала моддинга в ",
      ". Whether you want to use a mod manager or go hands-on.": ". Независимо от того, хотите ли вы использовать менеджер модов или предпочитаете ручную установку.",
      "Learn & discover": "Узнать и открыть",
      "Video tutorials & showcases": "Видеоуроки и витрины",
      "Helpful video guides and showcases to get you started with modding": "Полезные видео-руководства и витрины для начала моддинга в ",
      "Connect & discuss": "Связь и обсуждение",
      "Was this page helpful?": "Была ли эта страница полезной?",
      "Let us know if this page made modding easier, or if something was missing.": "Дайте нам знать, если эта страница облегчила моддинг, или если чего-то не хватало.",
      "Send feedback": "Отправить отзыв",
      "Starter Mods": "Начальные моды",
      "Community spaces & support": "Пространства сообщества и поддержка",
      "Find help and connect with other modders in community spaces such as forums, Discord servers, and social channels. These are great places to ask questions, share tips, and learn from others.": "Найдите помощь и общайтесь с другими модмейкерами на форумах, Discord-серверах и в социальных сетях. Это отличные места, чтобы задавать вопросы, делиться советами и учиться у других.",
      "Cyberpunk 2077 Modding Discord": "Discord сервер по моддингу в Cyberpunk 2077",
      "The biggest Cyberpunk 2077 modding server. Discuss modding tool development, mod creation and more!": "Самый большой сервер по моддингу в Cyberpunk 2077. Обсудите разработку инструмента моддинга, создание модов и многое другое!",
      "The easiest way to start modding.": "Самый простой способ начать моддинг.",
      "Install and manage mods with just a few clicks. No setup needed.": "Устанавливайте моды и управляйте ими всего в несколько кликов. Настройка не требуется.",
      "Want to understand how it works?": "Хотите понять, как это работает?",
      "A brief introduction of how mods work and how to install them.": "Краткое описание того, как работают моды и как их устанавливать.",
      "Written guides & articles": "Письменные руководства и статьи",
      "Mod with the Nexus Mods App (Preview)": "Модифицируйте игру с помощью приложения Nexus Mods (предварительная версия).",
      "Cyberpunk 2077 Modding Guide": "Руководства по моддингу в Cyberpunk 2077",
      "Everything you need to start modding Cyberpunk 2077. Whether you want to use a mod manager or go hands-on.": "Всё, что нужно для начала моддинга Cyberpunk 2077. Независимо от того, хотите ли вы использовать менеджер модов или предпочитаете ручную установку.",
      "Unlock max download speeds": "Разблокировка максимальной скорости скачивания",
      "Download your mods faster without any speed limits.": "Скачивайте свои моды быстрее без каких-либо ограничений скорости.",
      "Get mod collections in one click": "Получение коллекций модов в один клик",
      "Download and install an entire collection of mods in one click.": "Скачайте и установите целую коллекцию модов в один клик.",
      "Get rid of Ads — forever": "Избавьтесь от рекламы — навсегда",
      "This still applies after your premium subscription ends!": "Это все ещё происходит после окончания вашей премиум-подписки!",
      "You need to sign in or sign up before continuing.": "Необходимо войти или зарегистрироваться, прежде чем продолжить.",
      "Plus more:": "Плюс ещё:",
      "Instant, multi-threaded downloads": "Мгновенные, многопоточные загрузки",
      "4x more mod results": "В 4 раза больше результатов",
      "5x larger inbox": "В 5 раз больше почтового ящика",
      "Cancel anytime.": "Отмена в любое время.",
      "See refund policy": " Смотрите политику возврата",
      "Accelerate all your mod downloads for over 3,800 games.": "Ускорение всех ваших скачиваний модов для более чем 3,800 игр.",
      "Unlock the full potential of modding and support the community with a Premium membership.": "Раскройте весь потенциал модов и поддержите сообщество с премиум-членством.",
      "Support mod creators": "Поддержка создателей модов",
      "We've donated": "На сегодняшний день мы пожертвовали ",
      "$13 million": "13 миллионов",
      "to our creators to date.": " долларов нашим создателям.",
      "Get fast downloads with": "Получите быстрое скачивание с ",
      "Upgrade to Premium to": "Улучшение до премиума даст ",
      "auto-install collections,": "автоустановку коллекций, ",
      "get": "получение ",
      "uncapped download speeds": "неограниченной скорости скачивания ",
      "and": "и",
      "browse ad-free.": "отключение рекламы.",
      "Go Premium": "Получить премиум",
      "Our creators earned over $": "Наши создатели заработали более $",
      "Share your creations on the": "Поделитесь своими творениями на",
      "Get": " Получите",
      "exclusive premium perks,": " эксклюзивные премиальные льготы,",
      "cash out reward points or": " обналичьте бонусные баллы или",
      "trade them for new games.": " обменяйте их на новые игры.",
      "Learn more": "Подробнее",
      "Earn mod rewards": "Зарабатывайте награды за моды",
      "Get free premium": "Получите бесплатный премиум",
      "Connect with creators": "Связывайтесь с создателями",
      "Get free game keys": "Получайте бесплатные ключи игр",
      "Latest news": "Последние новости",
      "A community of": "Сообщество",
      "passionate gamers and creators": " страстных геймеров и создателей",
      "Come and chat with our": "Приходите поболтать с нашим сообществом в ",
      "community.": ".",
      "Join the conversation on our": "Присоединяйтесь к нашему ",
      "today.": " прямо сейчас.",
      "Follow us on": "Следите за нами на ",
      "for fresh video content.": " для свежего видео-контента",
      "Statistics": "Статистики",
      "Careers": "Карьера",
      "About us": "О нас",
      "Premium features": "Возможности с премиум",
      "Discover": "Откройте для себя",
      "New mods": "Новые моды",
      "Popular mods": "Популярные моды",
      "All images": "Все изображения",
      "API reference": "Ссылки API",
      "Feedback": "Обратная связь",
      "Report a bug": "Сообщить об ошибке",
      "Unban requests": "Запросить снятия бана",
      "DMCA": "Закон об авторском праве",
      "Manage cookie settings": "Настройки куки",
      "Contact us": "Связаться с нами",
      "Support Nexus Mods": "Поддержать Nexus Mods",
      "Network stats": "Статистика сети",
      "Server info": "Информ. сервера",
      "Copyright ©": "Авторские права © ",
      "Terms of Service": "Условия использования",
      "Privacy Policy": "Политика конфиденциальности",
      "Tracking centre": "Центр отслеживания",
      "Adult": "18+",
      "My content": "Мой контент",
      "My Games": "Мои игры",
      "All Games": "Все игры",
      "Choose from": "Выберите из ",
      "You have no pending invitations": "У вас нет ожидающих приглашений",
      "Search:": "Поиск:",
      "Previous": "Предыдущая",
      "Last DL": "Скачен",
      "Uploader": "Загрузил",
      "Endorsement": "Одобрить",
      "games": "игр ",
      "to mod": "с модами",
      "For questions about billing, contact:": "По вопросам об оплате обращайтесь на: ",
      "Cancel your subscription at anytime, plus a": "Отмените подписку в любое время, а также имеется ",
      "refund policy": "политика возврата",
      "based on how many mods you download.": ", основанная на том, сколько модов вы скачиваете.",
      "Download count": "Кол-во скачиваний",
      "Mods count": "Кол-во модов",
      "Collections count": "Кол-во коллекций",
      "Name": "Название",
      "Date added": "Дата добавления",
      "20 Items": "20 элементов",
      "40 Items": "40 элементов",
      "60 Items": "60 элементов",
      "80 Items": "80 элементов",
      "Get more": "Получите больше",
      "with Premium": "с премиумом",
      "View more results for mods,": "Больше результатов для модов, ",
      "collections and media everywhere.": "коллекций и медиа везде.",
      "Hide filters": "Скрыть фильтры",
      "Show filters": "Показать фильтры",
      "Game": "Игра",
      "Search game": "Искать игру",
      "Apply": "Применить",
      "Game genre": "Жанр игры",
      "Vortex Support": "Поддержка Vortex",
      "Supported by Vortex": "Поддерживаются Vortex",
      "Show games with Collections": "Игры с коллекциями",
      "Page": "Страница",
      "Go": "Перейти",
      "Browse the internet's best mods": "Просмотр лучших модов в интернете",
      "Hide adult content": "Скрывать контент для взрослых",
      "Show only adult content": "Показывать контент для взрослых",
      "Tags": "Теги",
      "Includes": "Включить",
      "Excludes": "Исключить",
      "Search parameters": "Параметры поиска",
      "Language support": "Поддерживаемые языки",
      "Hide translations": "Скрыть переводы",
      "Content options": "Параметры контента",
      "Show only updated mods": "Показывать только обновлённые моды",
      "File size": "Размер файла",
      "Endorsements": "Одобрений",
      "Make mods.": "Делай моды. ",
      "Notifications": "Уведомления",
      "Mark all as read (": "Пометить все прочитаным (",
      "Settings": "Настройки",
      "Preferences": "Предпочтения",
      "Content blocking": "Блокировка контента",
      "Profile": "Профиль",
      "Authors": "Авторы",
      "Upload": " Добавить мод",
      "Comments on your files": "Комментарии к вашим файлам",
      "The comment tracking centre lists all the comment and discussion threads related to all your uploaded files on this site. It is listed in the order of the time of the last post, with the most recent post at the top. You have 3 comment topics across all your files.": "В центре отслеживания комментариев перечислены все темы комментариев и обсуждения, связанные со всеми вашими загруженными файлами на этом сайте. Они указаны в порядке времени последней отправки, с самой последней отправки сверху. У вас есть 3 темы комментариев во всех ваших файлах.",
      "Author": "Автор",
      "Last upload": "Последний добавленный",
      "Last download": "Последний скачанный",
      "Log": "Журнал",
      "Tracking": "Отслеживание",
      "Tracked content updates": "Отслеживание обновлений контента",
      "Mods you're tracking": "Моды, которые вы отслеживаете",
      "Customise": "Настроить",
      "Customise 'My Home'": "Настроить 'Мой дом'",
      "We’re exploring the idea of letting you personalise your home page! If we added this feature, you could:": "Мы исследуем идею, чтобы вы могли персонализировать свою домашнюю страницу! Когда мы добавим эту функцию, вы сможете:",
      "Turn sections on/off (e.g. ‘Latest News’)": "Включать/выключать секции (например, «Последние новости»)",
      "Reorder sections to prioritise what matters to you": "Изменять порядок разделов, чтобы расставить приоритеты того, что для вас важно",
      "Let us know if you’d find this useful by voting below.": "Дайте нам знать, если вы найдёте это полезным, проголосовав ниже.",
      "Not interested": "Не интересует",
      "I'd use this!": "Я бы этим пользовался!",
      "Earn rewards.": "Получай награды.",
      "Cash payouts": "Денежные выплаты",
      "Free Premium": "Бесплатный премиум",
      "Learn More": "Подробнее",
      "From": "С",
      "To": "До",
      "more new": "новых ",
      "Date Published": "Дата публикации",
      "Unique Downloads": "Уникальных скачиваний",
      "Last Updated": "Последнее обновление",
      "Mod Name":  "Название",
      "File Size": "Размер файла",
      "Last Comment": "Последний комментарий",
      "Desc": "▼",
      "Asc": "▲",
      "Standard": "По умолчанию",
      "Compact": "Компактно",
      "List": "Список",
      "Customise your": "Кастомизируй свои ",
      "preference": "настройки",
      "Time range: 24 Hours": "Диапазон времени: 24 часа",
      "Time range: 7 Days": "Диапазон времени: 7 дней",
      "Time range: 14 Days": "Диапазон времени: 14 дней",
      "Time range: 28 Days": "Диапазон времени: 28 дней",
      "Time range: 1 Year": "Диапазон времени: Год",
      "Clear all": "Очистить все",
      "Install hundreds of mods with the click of a button.": "Устанавливайте сотни модов одним нажатием кнопки. ",
      "Learn more about collections": "Подробнее о коллекциях",
      "Most downloaded": "Самые скачиваемые",
      "Recently listed": "Недавно перечисленные",
      "Mod manager for installing collections": "Менеджер модов для установки коллекций",
      "Download Vortex": "Скачать Vortex",
      "Success rating": "Рейтинг успеха",
      "Percentage of successful installations": "Процент успешных установок",
      "Game Version": "Версия игры",
      "Top files": "Файлы в топе",
      "Mod categories": "Категории модов",
      "Recent activity": "Последняя активность",
      "Mods of the month": "Моды месяца",
      "Explore this month’s nominated mods.": "Исследуйте номинированные моды этого месяца.",
      "Views": "Просмотров",
      "No. of mods": "Кол-во модов",
      "No. of collections": "Кол-во коллекций",
      "No. of endorsements": "Кол-во одобрений",
      "Category": "Категории",
      "Some manually verified files": " Некоторые файлы проверены вручную",
      "Rating": "Рейтинг",
      "High (75% - 100%)": "Высокий (75% - 100%)",
      "Low (0 - 49%)": "Низкий (0 - 49%)",
      "Medium (50% - 74%)": "Средний (50% - 74%)",
      "Included Mods": "Включённые моды",
      "Browse Mods": "Обзор модов",
      "Adult Content": "Контент для взрослых",
      "Hide Adult Content": "Скрыть контент для взрослых",
      "New to modding": "Новичок в моддинге ",
      "Start with the": "Начните с ",
      "essential starter mods": "основных стартовых модов",
      "and helpful tools to begin your journey.": " и полезных инструментов, чтобы начать свое путешествие.",
      "Dismiss": "Понятно",
      "Explore starter mods": "Исследовать стартовые моды",
      "Trending Mods": "Набирающие популярность",
      "Get hundreds of curated mods the easy way and": "Получите сотни кураторских модов простым способом, а с ",
      "make it one click with premium":"премиумом вы сделаете это одним щелчком мыши",
      "More time playing": "Болше времени игры",
      "Unlock 1-click automated collections": "Разблокировка автоматизированных коллекций в 1 клик",
      "The fastest way to mod": "Самый быстрый путь к модам",
      "No manual steps required": "Не требуются шаги вручную",
      "More time playing your games": "Играйте в свои игры больше времени",
      "Go premium": "Получить премиум",
      "Unique DLs": "Уник. скачиваний",
      "Total DLs": "Скачиваний",
      "Total views": "Просмотров",
      "Track": "Отслеживать",
      "Version": "Версия",
      "Download:":"Скачать: ",
      "Manual": "Вручную",
      "Last updated": "Последнее обновление",
      "Original upload": "Добавлен",
      "Created by": "Создатель",
      "Uploaded by":"Добавил",
      "Virus scan": "Скан. на вирусы",
      "Safe to use": "Безопасно для использования",
      "Tags for this mod": "Теги для этого мода",
      "Tag this mod": " Добавить тег",
      "Bugs": "Ошибки",
      "Logs": "Журналы",
      "Stats": "Статистика",
      "About this mod": "Об этом моде",
      "Share": "Поделиться",
      "Permissions and credits": "Разрешения и участники",
      "Translations": "Локализация",
      "Donations": "Пожертвования",
      "API Keys": "API-ключи",
      "Member": "Участник",
      "Your changes have successfully saved.": "Изменения успешно сохранены.",
      "Set the preferences you want when using Nexus Mods.": "Установите предпочтения, которые нужны, при использовании Nexus Mods.",
      "Global": "Общие",
      "Remind me about file ratings": "Напоминать о рейтингах файлов",
      "Images added by the author in the image description": "Изображения, добавленные автором в описании",
      "Replies to posts bump the original post": "Ответы поднимают оригинальный пост",
      "File downloads open in a pop-up box": "Скачивание файлов открывается во всплывающем окне",
      "Default quick search": "Быстрый поиск по умолчанию",
      "Default mod sorting": "Сортировка модов по умолчанию",
      "Default mod view": "Вид модов по умолчанию",
      "Never": "Никогда",
      "1 days": "1 день",
      "3 days": "3 дня",
      "7 days": "7 дней",
      "14 days": "14 дней",
      "28 days": "28 дней",
      "Search:": "Поиск: ",
      "Homepage": "Главная страница",
      "Set your default tabs for the ‘homepage’ and ‘game homepages’.": "Установите вкладки по умолчанию для «домашняя страница» и «домашние страницы игры».",
      "Default Mods Tab": "Вкладка модов по умолчанию",
      "Default Media Tab": "Вкладка медиа по умолчанию",
      "Tracked Content Updates": "Отслеживание обновлений контента",
      "Show user comments about your files, images and videos": "Показывать комментарии пользователей о ваших файлах, изображениях и видео",
      "Show user activity on your files, images and videos": "Показывать активность пользователей в ваших файлах, изображениях и видео",
      "Show user activity on the files you track": "Показывать активность пользователей в файлах, которые вы отслеживаете",
      "Show user comments on the files you track": "Показывать комментарии пользователей к файлам, которые вы отслеживаете",
      "Show author activity on the files you track": "Показывать активность автора в файлах, которые вы отслеживаете",
      "All Time": "За всё время",
      "Content blocking": " Блокировка контента",
      "Control what content you see on Nexus Mods.": "Управляйте тем, какой контент вы хотели бы видить на Nexus Mods.",
      "Adult content": "Контент для взрослых",
      "Show adult content with blur": "Отображать контент для взрослых с размытием",
      "Blurred content can be revealed on click": "Размытый контент может быть раскрыт при клике",
      "Show adult content": "Отображать контент для взрослых",
      "Specify what type(s) of adult content you’d like to see": "Укажите, какой тип (типы) контента для взрослых вы хотите видеть",
      "Extreme violence": "Сцены насилия",
      "Sexualised": "Сексуализированный контент",
      "Swearing/Profanity": "Ненормативная лексика",
      "Pornographic": "Порнографический контент",
      "Suicide": "Суицид",
      "Self-harm": "Самоповреждение",
      "Depression": "Депрессия",
      "Body stigma": "Стигматизация внешности",
      "Eating disorder": "Расстройства пищевого поведения",
      "Harmful substances": "Вредные вещества",
      "Blocked content": "Заблокированный контент",
      "Use tags to block content you don’t want to see on Nexus Mods.": "Используйте теги для блокировки контента, который вы не хотите видеть на Nexus Mods.",
      "blocked tags": "Заблокированные теги",
      "No tags blocked": "Нет заблокированных тегов",
      "Select tags to block. They can be global or game specific.": "Выберите теги для блокировки. Они могут быть общими или игровыми.",
      "Global tags": "Общие теги",
      "Attributes": "Атрибуты",
      "Balance": "Баланс",
      "Game genre search": "Поиск жанра игры",
      "Compatibility": "Совместимость",
      "Components": "Компоненты",
      "Content and realism": "Контент и реализм",
      "Resources": "Ресурсы",
      "Nexus Mods Events": "События Nexus Mods",
      "Landscape and Environment": "Ландшафт и окружающая среда",
      "Ignored users": "Пользователи в игноре",
      "Ignoring a user hides their content and activity form you, including mods, images, videos, collections, comments, bug reports, and notifications.": "Игнорирование пользователя скрывает его контент и форму активности, включая моды, изображения, видео, коллекции, комментарии, отчеты об ошибках и уведомления.",
      "Ignored users can still view and interact with your content. They won't be notified, and you can still access their profile.": "Игнорированные пользователи могут по-прежнему просматривать и взаимодействовать с вашим контентом. Они не будут уведомлены, и вы все еще сможете получать доступ к их профилю.",
      "Ignored users": "Пользователи в игноре",
      "No ignored users": "Нет пользователей в игноре",
      "Add a user you want to ignore": "Добавить пользователя, которого вы хотите игнорировать",
      "Search users": "Поиск пользователей",
      "Username": "Имя пользователя",
      "Profile": "Профиль",
      "Profile picture": "Картинка профиля",
      "Add, remove and change your profile picture": "Добавьте, удалите или измените изображение своего профиля",
      "A profile picture adds a personal touch to your account and helps others recognise you.": "Изображение профиля добавляет личный отпечаток к вашей учётной записи и помогает другим узнать вас.",
      "Change": "Сменить",
      "Remove": "Удалить",
      "Change username": "Сменить имя пользователя",
      "Donations": "Пожертвования",
      "If you are a particularly helpful or productive user on the Nexus sites then other users might wish to show their appreciation to you by donating to you. Donations are completely opt-in and optional.": "Если вы являетесь особенно полезным или продуктивным пользователем на сайтах Nexus, другие пользователи могут пожелать показать вам свою признательность, пожертвовав вам. Пожертвования полностью являются опционными и необязательными.",
      "You should": "Вы ",
      "never, ever": "никогда не должны ",
      "charge for access to any files, additional content or perks on Nexus Mods. This includes providing a file for free and then requiring users to donate to receive additional features, support or special perks. It is against the rules of this site to incentivise the donation system or ask users to donate to you for additional support or content.": "взимать плату за доступ к любым файлам, дополнительному контенту или льготам на модах Nexus. Это включает в себя предоставление файла бесплатно, а затем требование к пользователям пожертвовать, чтобы получить дополнительные функции, поддержку или специальные льготы. Это противоречит правилам этого сайта, чтобы стимулировать систему пожертвований или просить пользователей пожертвовать вам для дополнительной поддержки или контента.",
      "Accept Direct Donations on my mods": "Принимать прямые пожертвования на мои моды",
      "You will need to enable donations on each of your mod pages.": "Вам нужно будет включить пожертвования на каждой из ваших страниц мод.",
      "Your PayPal e-mail address": "Ваш адрес электронной почты PayPal",
      "Enter your PayPal email address": "Введите свой адрес электронной почты PayPal",
      "Show a donate button on my profile page": "Показывать кнопку пожертвования на странице моего профиля",
      "Participate in donation points program": "Участвовать в программе баллов пожертвования",
      "API Keys": "API-ключи",
      "Manage the API keys for all your third-party apps.": "Управляйте ключами API для всех сторонних приложений.",
      "Integrations": "Интеграции",
      "Request Api Key": "Запросить API-ключ",
      "Personal API Key": "Личный API-ключ",
      "Notifications": "Уведомления",
      "Choose what types of notifications you want to receive from us.": "Выберите, какие типы уведомлений вы хотите получать от нас.",
      "Display notifications": "Отображение уведомлений",
      "Game specific notifications": "Уведомления об играх",
      "When viewing a game-specific page, you'll only see notifications for that game": "При просмотре страницы, специфической для игры, вы увидите только уведомления для этой игры",
      "New games added": "Добавление новой игры",
      "Receive a weekly roundup of new games added to Nexus Mods, we may also send one-off notifications for new games": "Получайте еженедельную сводку о новых играх, добавленных в Nexus Mods. Мы также можем отправлять разовые уведомления о новых играх.",
      "News articles from Nexus Mods": "Статьи новостей от Nexus Mods",
      "Receive a notification every time we post a new article to Nexus Mods": "Получайте уведомление каждый раз, когда мы публикуем новую статью на Nexus Mods.",
      "Donation Points payout": "Выплата баллов пожертвования",
      "Receive a notification when you receive Donation Points from a payout": "Получайте уведомление, когда вы получаете баллы пожертвований в результате выплаты.",
      "Donation Points sent to me": "Баллы пожертвования отправленые мне",
      "Receive a notification when another user sends you Donation Points": "Получайте уведомление, когда другой пользователь отправляет вам баллы пожертвования.",
      "Donation Points monthly reports": "Ежемесячные отчеты по баллам пожертвования",
      "Receive a notification when a new Donation Points monthly report has been added": "Получайте уведомление, когда добавляется новый ежемесячный отчет по баллам пожертвования.",
      "New files": "Новые файлы",
      "Receive a notification for your tracked mods when a Mod Author updates their mod with a new file": "Получайте уведомления об обновлениях отслеживаемых модов, когда автор добавляет новый файл.",
      "New articles": "Новые статьи",
      "Receive a notification for your tracked mods when a new article is added": "Получайте уведомления для отслеживаемых модов при публикации новых статей.",
      "Tracked users": "Отслеживаемые пользователи",
      "Receive a notification for your tracked users when they upload a new mod": "Получайте уведомление, когда пользователи за которыми вы следите загружают новый мод.",
      "New images": "Новые изображения",
      "Receive a notification for your tracked users when they add a new image to the media share": "Получайте уведомление, когда пользователи за которыми вы следите добавляют новое изображение в медиа-раздел.",
      "New videos": "Новые видео",
      "Receive a notification for your tracked users when they add a new video to the media share": "Получайте уведомление, когда пользователи за которыми вы следите добавляют новое видео в медиа-раздел.",
      "My Comments": "Мои комментарии",
      "Mod comment replies": "Ответы на комментарии к модам",
      "Receive a notification when someone replies to one of your comments on a mod": "Получать уведомление, когда кто-то отвечает на ваш комментарий к моде",
      "Collection comment replies": "Ответы на комментарии к коллекциям",
      "Receive a notification when someone replies to one of your comments on a collection": "Получать уведомление, когда кто-то отвечает на ваш комментарий к коллекции",
      "My Bug Reports": "Мои отчеты об ошибках",
      "Collection bug report closed": "Отчет об ошибке в коллекции закрыт",
      "Receive a notification when the Curator closes your bug report on a collection": "Получать уведомление, когда Куратор закрывает ваш отчет об ошибке в коллекции",
      "Collection bug report reopened": "Отчет об ошибке в коллекции reopened",
      "Receive a notification when the Curator reopens your bug report on a collection": "Получать уведомление, когда Куратор открывает ваш отчет об ошибке в коллекции повторно",
      "Collection bug report replies": "Ответы на отчеты об ошибках в коллекциях",
      "Receive a notification when someone replies to one of your bug reports on a collection": "Получать уведомление, когда кто-то отвечает на ваш отчет об ошибке в коллекции",
      "My Mods": "Мои моды",
      "New comments": "Новые комментарии",
      "Receive a notification when a user comments on one of your mods": "Получать уведомление, когда пользователь комментирует один из ваших модов",
      "New bug reports": "Новые отчеты об ошибках",
      "Receive a notification when a user submits a new bug report on one of your mods": "Получать уведомление, когда пользователь отправляет новый отчет об ошибке для одного из ваших модов",
      "New bug report replies": "Ответы на отчеты об ошибках",
      "Receive a notification when a user leaves a comment reply on one of your mod's bug reports": "Получать уведомление, когда пользователь оставляет ответ на комментарий в отчете об ошибке вашего мода",
      "Pending images": "Изображения на утверждении",
      "Receive a notification when a user adds a new image that needs approval, on one of your mods": "Получать уведомление, когда пользователь добавляет новое изображение, требующее утверждения, для одного из ваших модов",
      "Pending videos": "Видео на утверждении",
      "Receive a notification when a user adds a new video that needs approval, on one of your mods": "Получать уведомление, когда пользователь добавляет новое видео, требующее утверждения, для одного из ваших модов",
      "Receive a notification when anyone adds a new image on one of your mods": "Получать уведомление, когда кто-либо добавляет новое изображение для одного из ваших модов",
      "Deleted image": "Изображение удалено",
      "Receive a notification when a Team Member deletes an image on one of your mods": "Получать уведомление, когда участник команды удаляет изображение у одного из ваших модов",
      "Deleted video": "Видео удалено",
      "Receive a notification when a Team Member deletes a video on one of your mods": "Получать уведомление, когда участник команды удаляет видео у одного из ваших модов",
      "Mod description edits": "Изменения в описании мода",
      "Receive a notification when a Team Member edits the description on one of your mods": "Получать уведомление, когда участник команды редактирует описание одного из ваших модов",
      "Mod published": "Мод опубликован",
      "Receive a notification when a Team Member publishes one of your mods": "Получать уведомление, когда участник команды публикует один из ваших модов",
      "Mod hidden": "Мод скрыт",
      "Receive a notification when a Team Member hides one of your mods": "Получать уведомление, когда участник команды скрывает один из ваших модов",
      "Mod unhidden": "Мод показан",
      "Receive a notification when a Team Member unhides one of your mods": "Получать уведомление, когда участник команды делает один из ваших модов видимым",
      "New mod files": "Новые файлы мода",
      "Receive a notification when a Team Member adds new files to one of your mods": "Получать уведомление, когда участник команды добавляет новые файлы к одному из ваших модов",
      "Mod files edited": "Файлы мода отредактированы",
      "Receive a notification when a Team Member edits existing files on one of your mods": "Получать уведомление, когда участник команды редактирует существующие файлы одного из ваших модов",
      "Mod files archived": "Файлы мода архивированы",
      "Receive a notification when a Team Member archives existing files on one of your mods": "Получать уведомление, когда участник команды архивирует существующие файлы одного из ваших модов",
      "New articles": "Новые статьи",
      "Receive a notification when a Team Member adds a new article to one of your mods": "Получать уведомление, когда участник команды добавляет новую статью к одному из ваших модов",
      "Updated articles": "Статьи обновлены",
      "Receive a notification when a Team Member updates an existing article on one of your mods": "Получать уведомление, когда участник команды обновляет существующую статью у одного из ваших модов",
      "Deleted articles": "Статьи удалены",
      "Receive a notification when a Team Member deletes an article on one of your mods": "Получать уведомление, когда участник команды удаляет статью у одного из ваших модов",
      "Readme added": "Readme добавлен",
      "Receive a notification when a Team Member adds a readme to one of your mods": "Получать уведомление, когда участник команды добавляет файл readme к одному из ваших модов",
      "Readme removed": "Readme удален",
      "Receive a notification when a Team Member removes a readme from one of your mods": "Получать уведомление, когда участник команды удаляет файл readme у одного из ваших модов",
      "My Collections": "Мои коллекции",
      "New comments": "Новые комментарии",
      "Receive a notification when a user comments on one of your collections": "Получать уведомление, когда пользователь комментирует одну из ваших коллекций",
      "Bug reports created": "Созданы отчеты об ошибках",
      "Receive a notification when a user creates a new bug report on one of your collections": "Получать уведомление, когда пользователь создает новый отчет об ошибке для одной из ваших коллекций",
      "Bug report comments": "Комментарии к отчетам об ошибках",
      "Receive a notification when a user comments on one of your collection bug reports": "Получать уведомление, когда пользователь комментирует один из отчетов об ошибках вашей коллекции",
      "My Media": "Мои медиафайлы",
      "New comments on images": "Новые комментарии к изображениям",
      "Receive a notification when a user comments on one of your images": "Получать уведомление, когда пользователь комментирует одно из ваших изображений",
      "New comments on supporter images": "Новые комментарии к изображениям сторонников",
      "Receive a notification when a user comments on one of your supporter images": "Получать уведомление, когда пользователь комментирует одно из ваших изображений для сторонников",
      "New comments on videos": "Новые комментарии к видео",
      "Receive a notification when a user comments on one of your videos": "Получать уведомление, когда пользователь комментирует одно из ваших видео",
      "Controls whether you see notifications, disable this to stop getting alerted to new notifications": "Управление уведомлениями. Отключите эту функцию, чтобы прекратить получение оповещений о новых уведомлениях.",
      "If you are developing a new application, you can also access the API using your personal API key. Please see our": "Если вы разрабатываете новое приложение, вы также можете получить доступ к API, используя свой личный ключ API. Пожалуйста, ознакомьтесь с нашей ",
      "Acceptable Use Policy": "политикой допустимого использования ",
      "for details on how to register your application for public use.": "для получения подробной информации о том, как зарегистрировать заявку для публичного использования.",
      "Warning: Do not enter your personal API key into an application you do not trust. If an unregistered application asks for your personal API key it may be malicious. Your API key grants the application limited access to your Nexus Mods account and personal information.": "Предупреждение: не вводите свой личный ключ API в приложение, которому вы не доверяете. Если незарегистрированное приложение запрашивает ваш личный ключ API, оно может быть вредоносным. Ваш ключ API предоставляет приложению ограниченный доступ к вашей учетной записи Nexus Mods и личной информации.",
      "About Me": "О себе",
      "See all": "Смотреть все",
      "Mark all as read": "Пометить все прочитанными",
      "Site News:": "Новости сайта: ",
      "Mods are now available for": "Моды теперь доступны для ",
      "Craft your story in the 'About Me' section and share more about yourself.": "Составьте свою историю в разделе «О себе» и поделитесь больше о себе.",
      "Moderation": "Модерация",
      "View your raised reports.": "Просмотр ваших отправленных жалоб.",
      "View reports": "Просмотр жалоб",
      "Any moderation or warnings relating to this account will be shown here.": "Все действия модерации или предупреждения, связанные с этой учетной записью, будут показаны здесь.",
      "Warnings and Restrictions": "Предупреждения и ограничения",
      "You have not received any warnings or restrictions on your account.": "Вы не получали никаких предупреждений или ограничений для своей учетной записи.",
      "Edit": "Изменить",
      "Save": "Сохранить",
      "Published": "Опубликовано",
      "Uploaded": "Загружено",
      "Updated": "Обновлено",
      "My images": "Мои изображения",
      "My videos": "Мои видео",
      "Upload image": "Добавить изображения ",
      "Upload video": "Добавить видео ",
      "Display when you were last active": "Отображать вашу активность",
      "Enter the exact username": "Введите точное имя пользователя",
      "Choose on a per image basis": "Выбирать на основе изображения",
      "Turn off images": "Отключить изображения",
      "Turn on images": "Включить изображения",
      "Changelogs": "Список изменений",
      "The powerful open-source mod manager from Nexus Mods.": "Мощный менеджер модов с открытым исходным кодом от Nexus Mods.",
      "Main files": "Основные файлы",
      "Archived files": "Архив файлов",
      "Nexus requirements": "Требования сайта",
      "Mod name": "Название мода",
      "Notes": "Примечание",
      "Credits and distribution permission": "Участники и разрешение на распространение",
      "Your favourited games will be displayed here": "Ваши любимые игры будут отображаться здесь",
      "Explore this month's nominated mods.": "Исследуйте номинированные моды этого месяца.",
      "Other user's assets": "Ассеты другого пользователя",
      "All the assets in this file belong to the author, or are from free-to-use modder's resources": "Все ассеты в этом файле принадлежат автору или из ресурсов бесплатного моддера",
      "This author has not specified whether they have used assets from other authors or not": "Этот автор не уточнил, использовал ли он ассеты других авторов или нет.",
      "Upload permission": "Разрешение на загрузку",
      "You are not allowed to upload this file to other sites under any circumstances": "Вы не можете загружать этот файл на другие сайты ни при каких обстоятельствах",
      "Modification permission": "Разрешение на изменение",
      "You must get permission from me before you are allowed to modify my files to improve it": "Вы должны получить разрешение от меня, прежде чем вам будет разрешено изменять мои файлы для улучшения",
      "Conversion permission": "Разрешение на преобразование",
      "You are not allowed to convert this file to work on other games under any circumstances": "Вы не можете конвертировать этот файл для работы в других играх ни при каких обстоятельствах",
      "Asset use permission": "Разрешение на использование ассетов",
      "You must get permission from me before you are allowed to use any of the assets in this file": "Вы должны получить разрешение от меня, прежде чем вам будет разрешено использовать любой из ассетов в этом файле",
      "You are allowed to use the assets in this file without permission as long as you credit me": "Вы можете использовать ассеты в этом файле без разрешения, если укажите меня",
      "Asset use permission in mods/files that are being sold": "Разрешение на использование ассетов в модах/файлах, которые продаются",
      "You are not allowed to use assets from this file in any mods/files that are being sold, for money, on Steam Workshop or other platforms": "Вам не разрешается использовать ассеты из этого файла в любых модах/файлах, которые продаются, за деньги, в Steam Workshop или других платформах",
      "Asset use permission in mods/files that earn donation points": "Разрешение на использование ассетов в модах/файлах, которые зарабатывают баллы пожертвования",
      "You are allowed to earn Donation Points for your mods if they use my assets": "Вы можете зарабатывать баллы пожертвования для своих модов, если они используют мои ассеты",
      "Console modding permission": "Разрешение на моддинг под консоли",
      "The author did not upload this mod to Bethesda.net for console users yet, but he or she will at some point": "Автор ещё не загрузил этот мод на Bethesda.net для пользователей консолей, но он/она планирует это сделать",
      "This mod will not be available on Bethesda.net for console users": "Этот мод не будет доступен на Bethesda.net для пользователей консолей",
      "Author notes": "Примечание от автора",
      "This author has not provided any additional notes regarding file permissions": "Этот автор не предоставил никаких дополнительных заметок относительно разрешений файлов",
      "File credits": "Участники файла",
      "This author has not credited anyone else in this file": "Этот автор не указал каких-либо соучастников для этого файла",
      "Donation Points system": "Система баллов пожертвования",
      "Please": "Пожалуйста ",
      "to find out whether this mod is receiving Donation Points": " чтобы узнать, получает ли этот мод баллы пожертвований",
      "No translation available on the Nexus": "Нет доступных переводов",
      "Mod manager download": "Скачать чере менеджер модов",
      "Manual download": "Скачать вручную",
      "Preview file contents": "Предпросмотр содержимого файла",
      "FILE CONTENTS": "СОДЕРЖИМОЕ ФАЙЛА",
      "File archive": "Архив файлов",
      "Date uploaded": "Дата загрузки",
      "Sort by": "Сортировать по",
      "Changelog": "Список изменений",
      "Author images": "Изображения автора",
      "Author's instructions": "Инструкции от автора",
      "Off-site requirements": "Внешние зависимости",
      "Pages": "Страницы",
      "User images": "Изображения пользователей",
      "No results": "Ничего нет",
      "Author videos": "Видео автора",
      "User videos": "Видео пользователей",
      "Log in to search comments": "Войдите, для поиска комментариев",
      "member": "участник",
      "Bug reports": "Сообщения об ошибках",
      "No issues reported at this time.": "Ещё нет сообщений о проблемах.",
      "Status": "Статус",
      "Priority": "Важность",
      "Order": "Порядок",
      "All issues": "Все проблемы",
      "New issues": "Новые проблемы",
      "Being looked at": "В работе",
      "Fixed": "Исправлено",
      "Known issues": "Известные проблемы",
      "Duplicates": "Дубликаты",
      "Not a bug": "Не ошибка",
      "Won't fix": "Не исправить",
      "Need more info": "Нужно больше информации",
      "All priorities": "Любая",
      "Not set": "Ничего",
      "Low": "Низкая",
      "Medium": "Средняя",
      "High": "Высокая",
      "Activity logs": "Журналы активности",
      "Author's activity": "Активность автора",
      "Mod page activity": "Активность на странице мода",
      "Load more items": "Загрузить ещё",
      "Mod statistics": "Статистика мода",
      "Zoom": "Масштаб",
      "All": "Все",
      "Mod Download History": "История скачивания мода",
      "Page Views": "Посетивших страницу",
      "Totals": "Всего",
      "Total Endorsements": "Всего одобрений",
      "Downloads:": "Скачиваний:",
      "Endorsements:": "Одобрений:",
      "Page Views:": "Посетителей:",
      "DATA GROUPING:": "ГРУППИРОВКА ДАННЫХ:",
      "Auto": "Авто",
      "Daily": "Ежедневно",
      "Weekly": "Еженедельно",
      "Monthly": "Ежемесячно",
      "All content": "Весь контент",
      "Users": "Пользователи",
      "Popular games": "Популярные игры",
      "Close": "Закрыть",
      "Select": "Выбор",
      "Move": "Перемещение",
      "search preferences": "настройки поиска",
      "Step 1 of 3": "Шаг 1 из 3",
      "Step 2 of 3": "Шаг 2 из 3",
      "Step 3 of 3": "Шаг 3 из 3",
      "Join": "Присоединяйся к ",
      "66 Million": "66 миллионам ",
      "players": "игроков",
      "Already have an account?": "Уже есть уч. запись? ",
      "Sign in": "Войти",
      "Register for free now or upgrade your experience with extra perks and support Nexus Mods by becoming a": "Зарегистрируйтесь бесплатно или улучшите свой опыт с дополнительными льготами и поддержкой Nexus Mods, став ",
      "Premium Member": "премиум-участником",
      "Email": "Электронная почта",
      "Please see our": "Пожалуйста, изучите наши ",
      "Warning": "Внимание",
      "Our spam check tools are being blocked by your browser settings.": "Наши инструменты проверки спама блокируются настройками вашего браузера. ",
      "See possible reasons here.": "Смотри возможные причины здесь.",
      "Manage your": "Управляйте своей",
      "info": " информацией",
      "privacy": " приватностью ",
      "security": " безопасностью",
      "Security": "Безопасность",
      "Billing": "Оплата",
      "Sign out": "Выйти",
      "Two-factor authentication": "Двухфакторная аутентификация",
      "NOT ACTIVE": "ОТКЛЮЧЕНА",
      "Two-factor authentication is an extra layer of security for your Nexus Mods account.": "Двухфакторная аутентификация - это дополнительный уровень безопасности для вашей учётной записи Nexus Mods.",
      "Setup 2FA": "Настроить 2FA",
      "Change email": "Сменить эл. почту",
      "Change password": "Сменить пароль",
      "Account Recovery (temporarily disabled)": "Восстановление уч. записи (временно отключено) ",
      "SMS account recovery is no longer available.": "Восстановление уч. записи по SMS больше не доступно. ",
      "Read more about account recovery": "Читать подробнее о восстановлении уч. записи",
      "Delete account": "Удалить уч. запись",
      "Your current plan": "Ваш текущий план",
      "Go premium": "Получить премиум",
      "Free": "Бесплатный",
      "Unlock amazing features with": "Разблокируйте невероятные возможности с ",
      "premium": "премиумом",
      "Uncapped download speeds": "Неограниченная скорость скачивания",
      "Download with no speed limits and get access to exclusive servers around the world.": "Скачивайте без ограничений скорости и получите доступ к эксклюзивным серверам по всему миру.",
      "One-click downloads": "Скачивайте в один клик",
      "Start the download and installation of an entire collection of mods in just one click.": "Начните скачивание и установку целой коллекции модов всего за один клик.",
      "Instant & multi-threaded downloads": "Мгновенное и многопоточное скачивание",
      "Get mods faster with the one-click and multi-threaded download capabilities.": "Получайте моды ещё быстрее с возможностью скачивания одним щелчком мыши и многопоточностью.",
      "Supporting mod authors": "Поддержите авторов модов",
      "We donate monthly to our mod authors to support and thank them for all the work they do.": "Мы ежемесячно жертвуем нашим авторам модов, чтобы поддержать и поблагодарить их за всю работу, которую они делают.",
      "Mods requiring this file": "Моды, требующие этот файл",
      "Translations available on the Nexus": "Переводы, доступные на сайте",
      "Language": "Язык",
      "Author:": "Автор: ",
      "Animations": "Анимации",
      "Appearance": "Внешний вид",
      "Armour and Clothing": "Броня и одежда",
      "Audio": "Аудио",
      "Characters": "Персонажи",
      "Crafting": "Создание",
      "Gameplay": "Игровой процесс",
      "Locations": "Локации",
      "Miscellaneous": "Разное",
      "Modders Resources": "Ресурсы моддеров",
      "Scripts": "Скрипты",
      "User Interface": "Интерфейс",
      "Utilities": "Утилиты",
      "Vehicles": "Транспорт",
      "Visuals and Graphics": "Визуал и графика",
      "Weapons": "Оружие",
      "Ammo": "Пули",
      "Animation": "Анимация",
      "Armour": "Броня",
      "Audio - Misc": "Аудио (Разное)",
      "Audio - Music": "Аудио (Музыка)",
      "Audio - SFX": "Аудио (Звуковые эффекты)",
      "Audio - Voice": "Аудио (Голос)",
      "Body, Face, and Hair": "Тело, лицо и волосы",
      "Bug Fixes": "Исправление багов",
      "Buildings": "Постройки",
      "Character Presets": "Пресеты персонажа",
      "Cheats and God items": "Читы",
      "Clothing": "Одежда",
      "Collectibles, Treasure Hunts, and Puzzles": "Коллекционки, сокровищами и головоломки",
      "Companions": "Компаньоны",
      "Crafting - Equipment": "Создание (Снаряжение)",
      "Crafting - Home/Settlement": "Создание (Дом/Поселение)",
      "Crafting - Other": "Создание (Другое)",
      "Creatures": "Существа",
      "ENB Presets": "Пресеты ENB",
      "Environment": "Окржающая среда",
      "Factions": "Фракции",
      "Immersion": "Погружение",
      "Items (Food, Drinks, Chems, etc)": "Предметы (Еда, напитки, медпрепораты и т.д.)",
      "Locations - New": "Локации (Новые)",
      "Locations - Vanilla": "Локации (Игровые)",
      "Modders Resources and Tutorials": "Ресурсы для моддеров и руководства",
      "Models and Textures": "Модели и текстуры",
      "New Lands": "Новые земли",
      "NPC": "НИПы",
      "NPC - Vendors": "НИПы (Торговцы)",
      "Overhauls": "Капитальный ремонт",
      "Patches": "Патчи",
      "Performance": "Производительность",
      "Perks": "Способности",
      "Pip-Boy": "Пип-бой",
      "Player Homes": "Дома игрока",
      "Player Settlement": "Поселения игрока",
      "Poses": "Позы",
      "Power Armour": "Силовая броня",
      "Quests and Adventures": "Квесты и приключение",
      "Radio": "Радио",
      "ReShade Presets": "Пресеты для ReShade",
      "Saved Games": "Игровые сохранения",
      "Skills and Leveling": "Навыки и повышение уровня",
      "Tattoos": "Татуировки",
      "Transfer Settlement Blueprints": "Чертежи переноса поселений",
      "Videos and Trailers": "Видео и трейлеры",
      "Weapons and Armour": "Оружие и броня",
      "Weather and Lighting": "Погода и освещение",
      "Addons": "Дополнения",
      "Community Tools": "Инструменты сообщества",
      "Extensions": "Расширения",
      "Mod Managers": "Менеджеры модов",
      "Mod Organizer 2 Plugins": "Плагины для Mod Organizer 2",
      "Official": "Офицальное",
      "Shaders": "Шейдеры",
      "Universal Tools": "Универсальные инструменты",
      "Vortex Extensions": "Расширения для Vortex",
      "Vortex Themes": "Темы для Vortex",
      "Vortex Translations": "Переводы для Vortex",
      "Website": "Сайт",
      "Game Mechanics": "Игровые механики",
      "Items": "Предметы",
      "Vehicle Parts": "Автозапчасти",
      "Cheats and God Items": "Читы",
      "Gameplay Effects and Changes": "Эффекты и изменения геймплея",
      "General": "Общее",
      "Guilds/Factions": "Гильдии/Фракции",
      "Hair and Face Models": "Модели волос и лица",
      "Items - Food/Drinks/Chems/etc": "Предметы (еда, питьё, медицина и т.п.)",
      "Modders resources and tutorials": "Ресурсы и учебные пособия для мододелов",
      "User Interfaces": "Интерфейс",
      "Sounds and Music": "Звуки и музыка",
      "Radio stations": "Радиостанции",
      "SweetFX Presets": "Пресеты SweetFX",
      "New Lands and Locations": "Новые земли и локации",
      "Collectibles": "Коллекционные материалы",
      "ENB presets": "Пресеты ENB",
      "Saved Games/Characters": "Сохр. игры/Персонажи",
      "Preview our new app": "Предварительная версия нашего нового приложения",
      "All new app for collections and mods": "Все новые приложения для коллекций и модов",
      "Beta now available →": "Доступна Бета →",
      "Preview": "Предварительная версия",
      "The Official Nexus Mods App": "Официальное приложение Nexus Mods",
      "Install and organise mods effortlessly with our all-in-one powerful mod manager.": "Устанавливайте и систематизируйте моды с лёгкостью с помощью нашего мощного и универсального менеджера модов.",
      "Proudly open source": "С гордостью представляем открытый код",
      "Free to use": "Бесплатно",
      "built with the community": "Создано вместе с сообществом",
      "Ready": "Готово",
      "Coming soon": "Скоро",
      "More to follow...": "Скоро больше!",
      "Integrate seamlessly with Nexus Mods": "Беспрепятственная интеграция с Nexus Mods. ",
      "with direct access to the world’s largest modding platform. Stay updated with automatic version checks and enjoy unmatched compatibility.": "Получите прямой доступ к крупнейшей в мире платформе для моддинга. Будьте в курсе обновлений с помощью автоматической проверки версий и наслаждайтесь непревзойдённой совместимостью.",
      "Perfect your mod list with Health Check.": "Доведите свой список модов до идеала с «Проверкой целостности». ",
      "Scan to uncover any issues and get simple solutions to keep everything running smoothly.": "Выявите возможные проблемы и получите простые решения для бесперебойной работы всего и вся.",
      "Auto-install 100s of mods with Collections.": "Автоматическая установка сотен модов с «Коллекциями». ",
      "Easily install curated mod groups or create your own to share with friends or the world.": "Легко устанавливайте готовые наборы модов или создавайте собственные, чтобы делиться ими с друзьями или со всем миром.",
      "Collection creation coming soon": "Создание коллекций скоро будет доступно",
      "Rewind and restore changes with ease.": "Отменяйте и возвращайте изменения с лёгкостью. ",
      "Safely experiment with mods and quickly return to a stable setup whenever needed. Enjoy peace of mind with a version history that tracks every change.": "Безопасно экспериментируйте с модами и быстро возвращайтесь к стабильной конфигурации, когда это необходимо. Получите душевное спокойствие с историей изменений, которая отслеживает каждую правку.",
      "And the best part? You can do it all in one space": "И лучшее? Всё это — в одном месте",
      "View and use every feature side by side with Panels": "Просматривайте и используйте каждую функцию бок о бок с «Панелями»",
      "Multitasking, On Demand": "Многозадачность по требованию",
      "Open up to 4 panels side-by-side for seamless multitasking. No more switching back and forth.": "Открывайте до 4 панелей бок о бок для беспрепятственной многозадачности. Больше не нужно постоянно переключаться между окнами.",
      "Cross-Reference with Ease": "Связывайте данные без труда",
      "Quickly compare information across pages, manage mods, and check details without losing your flow.": "Быстро сравнивайте информацию по страницам, управляйте модами и проверяйте детали, не теряя потока.",
      "Save Your Perfect Space": "Сохраняйте свой идеальный макет",
      "Customise multiple layouts then save them for easy access. Your ideal setup is always just a single click away.": "Настройте несколько макетов и сохраните их для быстрого доступа. Ваша идеальная конфигурация всегда в одном клике.",
      "Streamline Your Modding": "Оптимизируйте свое моддинг",
      "Spend less time navigating and more time creating by removing the barriers between your tools.": "Потратьте меньше времени на навигацию и больше времени на создание, устраняя барьеры между инструментами.",
      "Even more game changing features": "Ещё больше игровых функций, меняющих всё",
      "Keep your mods safe from game updates": "Держите свои моды в безопасности от игровых обновлений",
      "Updated game files are backed up letting you choose exactly which game version to run.": "Обновлённые игровые файлы резервируются, позволяя вам точно выбирать, какую версию игры запускать.",
      "Skip the complexity with effortless Load orders": "Забудьте о сложностях: управляйте порядком загрузки легко",
      "Mod on the go withSteam Deck support": "Моды на ходу с поддержкой Steam Deck",
      "What the community are saying...": "Вот что говорят в сообществе...",
      "best out the box experience I’ve ever had with a mod manager": "Это самый удобный менеджер модов из всех, что я видел. Заработал сразу, прямо из коробки!",
      "Makes my Stardew Valley more fun and customisable": "С ним мой Stardew Valley стал ещё веселее, а возможностей для настройки — просто море!",
      "Using it for the first time feels like being at home, Very easy to use": "С первого запуска чувствуешь себя как дома. Очень интуитивно и просто!",
      "I love the UI so far and the ease of use is amazing": "Интерфейс просто прекрасный, и пользоваться им невероятно удобно!",
      "We want to hear from you!": "Нам важно ваше мнение!",
      "This app is for YOU, and we want it to be exactly what you need. What do you love? What’s missing? Let us know so we can build the best app for our amazing community. Your input matters!": "Это приложение создано для вас, и мы хотим, чтобы оно идеально вам подходило. Что вам нравится? Чего не хватает? Расскажите нам — и мы вместе создадим лучшее приложение для нашего невероятного сообщества. Ваш голос важен!",
      "When will Skyrim, Fallout, and other games be available?": "Когда появятся Skyrim, Fallout и другие игры?",
      "We appreciate your excitement! While we're still in early development, we're focusing on a solid foundation before adding more games to ensure a smooth, reliable experience.": "Мы ценим ваш интерес! Пока мы находимся на ранней стадии разработки и сосредоточены на создании надёжной основы, прежде чем добавлять новые игры. Это нужно, чтобы обеспечить стабильную и плавную работу.",
      "Check our roadmap": "Следите за нашим дорожной картой, ",
      "to see what's next.": "чтобы быть в курсе планов!",
      "Can I replace Vortex with the app?": "Можно ли заменить Vortex этим приложением?",
      "If you're a mod author or collection curator who uses advanced Vortex features, it's best to wait. But for typical modders, all the tools you need to mod your game are available.": "Если вы автор модов или куратор коллекций, который использует расширенные функции Vortex, пока лучше подождать. Но для большинства пользователей в приложении уже есть все необходимые инструменты для моддинга.",
      "Can I import my existing mods into the app?": "Можно ли импортировать свои существующие моды в приложение?",
      "Yes, but you will need a clean game install before you add the game to the app.": "Да, но перед добавлением игры в приложение вам потребуется чистая установка игры (без модов).",
      "For further details": "Подробнее см. в нашем ",
      "see our guide.": "руководстве.",
      "Can I use this mod manager at the same time as my other mod manager?": "Можно ли использовать этот менеджер модов вместе с другим?",
      "No, if you are using the app you will need to refrain from using other mod managers at the same time at this stage.": "Нет, на данном этапе мы не рекомендуем использовать другие менеджеры модов одновременно с нашим приложением.",
      "Will the app be available on Mac and Linux?": "Будет ли приложение доступно на Mac и Linux?",
      "Yes, the app is currently available on Linux (including Steamdeck) and Mac support is planned for the future.": "Да, приложение уже доступно для Linux (включая Steam Deck)! Поддержка Mac запланирована на будущее. ",
      "Linux/Steam Deck download.": "Скачать для Linux/Steam Deck",
      "Log in to view adult content": "Войдите, что бы видеть контент для взрослых",
      "News & Updates": "Новости и обновления",
      "Read full article": "Читать статью",
      "Features": "Особенности",
      "Competition news": "Новости конкуренции",
      "Game news": "Новости игр",
      "Mod news": "Новости модов",
      "Time": "Время",
      "Show": "Показать",
      "Total number of downloads": "Количество скачиваний",
      "Total number of downloads, updates every 15 minutes": "Количество скачиваний, которое обновляется каждые 15 мин.",
      "Total members who liked this content": "Всего участников, которым понравился этот контент",
      "Modding Tools mods": "Инструменты для моддинга",
      "Modding Tools": "Инструменты для моддинга",
      "Title contains": "Содержание заголовка",
      "Description contains": "Содержание описание",
      "Author contains": "Содержание автора",
      "Uploader contains": "Содержание загрузки",
      "Search mods, games, collections, images & videos": "Поиск модов, игр, коллекций, изображений и видео",
      "Log in": "Войти",
      "Verify email": "Проверить эл. почту",
      "Popular Game Communities": "Популярные игровые сообщества",
      "Active Topics": "Активные темы",
      "Tell a friend": "Расскажи другу",
      "Love Nexus Mods Forums? Tell a friend!": "Любите форум Nexus Mods? - Расскажи об этом другу!",
      "Game Directory": "Каталог игр",
      "Popular Games": "Популярные игры",
      "Next": "Делее",
      "Next page": "Следующая страница",
      "Sort By": "Сортировать по",
      "Latest Activity": "Последней активности",
      "Most Members": "Количеству участников",
      "Most Content": "Количеству контента",
      "Latest Created": "Последнему созданному",
      "Discussion": "Обсуждение",
      "Overview": "Обзор",
      "Jump": "Перейти",
      "Feature": "Особенность",
      "By": "От ",
      "Competition": "Конкуренция",
      "Game News": "Новости игр",
      "The best screen archery on the internet": "Лучшая стрельба из лука на экране в интернете",
      "Back to top": "Вернуться на верх",
      "Some files not scanned": "Некоторые файлы не просканированны",
      "View more...": "Показать ещё...",
      "View less": "Свернуть",
      "Mirrors": "Зеркала",
      "DLC name": "Название DLC",
      "Miscellaneous files": "Разные файлы",
      "Old files": "Старые файлы",
      "Optional files": "Необязательные файлы",
      "Forum": "Форум",
      "Docs": "Документация",
      "Uploaded:": "Добавлен: ",
      "Last Update:": "Обновлён: ",
      "View mod page": "Перейти на страницу мода",
      "View image gallery": "Посмотреть изображения",
      "for": " для ",
      "Search": "Поиск",
      "Top 30 Files in past two weeks:": "Топ-30 файлов за последние две недели: ",
      "Top Lists": "Топ списков",
      "Most endorsed files in the last two weeks": "Самые одобренные файлы за последние две недели",
      "Most endorsed recently added files": "Самые одобренные недавно добавленные файлы",
      "Most endorsed files of all-time (non-adult)": "Самые одобренные файлы за всё время (без контента для взрослых)",
      "Online User List": "Список пользователей в сети",
      "Find out more about modding with our": "Узнайте больше о моддинге в нашем ",
      "Use mods to power up your game": "Используйте моды, чтобы улучшить свою игру",
      "biggest modding platform in the world.": " самой большой платформе моддинга в мире.",
      "Black Tree Gaming Ltd. All rights reserved.": " Black Tree Gaming Ltd. Все права защищены.",
      "Games that you favourite will be displayed here": "Игры, которые вам нравятся, будут показаны здесь",
      "Learn from the community with tutorials and guides.": "Учитесь у сообщества с помощью учебных пособий и руководств.",
      "The elegant, powerful and open-source mod manager.": "Элегантный, мощный и с открытым исходным кодом менеджер модов.",
      "Upgrade your account to unlock all media content.": "Улучшите свою учётную запись, чтобы разблокировать весь медиаконтент.",
      "Copyright © 2025 Black Tree Gaming Ltd. All rights reserved.": "Авторские права © 2025 Black Tree Gaming Ltd. Все права защищены.",
      "Get massively improved graphics for classics and even brand new games.": "Получите массово улучшенную графику для классических и даже для новых игр.",
      "Browse our mod collections to install 100s of mods without any hassle.": "Просматривайте наши подборки модов, чтобы установить сотни модов без лишних хлопот.",
      "Explore our collections and auto-install hundreds of mods with one click": "Исследуйте наши коллекции и автоматически установавливайте сотни модов одним щелчком мыши",
      "Get free, quality content for your games: new weapons, stories, and more!": "Получите бесплатный, качественный контент для своих игр: новое оружие, истории и многое другое!",
      "Mods expand the lifespan of any game - never run out of things to do again!": "Моды расширяют продолжительность жизни любой игры - никогда не заканчиваются вещи, которые нужно сделать снова!",
      "Share your ideas, discuss them with the community, and cast your vote on feedback provided.": "Поделитесь своими идеями, обсудите их с сообществом и отдайте свой голос за предоставленную обратную связь.",
      "Auto-install hundreds of mods to get next-level graphics, new gameplay and endless amounts of new content.": "Автоустановка сотен модов для получения графики следующего уровня, нового геймплея и бесконечного количества нового контента.",

      /* Forum page */
      "Toggle this category": "Свернуть/развернуть категорию",
      "Existing user? Sign In": "Зарегестрированы? Войти",
      "Sign Up": "Регистрация",
      "Search...": "Поиск...",
      "This Forum": "Этот форум",
      "Everywhere": "Везде",
      "Topics": "Темы",
      "Browse": "Обзор",
      "Activity": "Активность",
      "Game Communities": "Игровые сообщества",
      "Online Users": "Пользователи в сети",
      "Guidelines": "Руководящие принципы",
      "Staff": "Персонал",
      "Events": "События",
      "Community Activity": "Активность сообщества",
      "My Activity Streams": "Мои потоки активности",
      "All Activity": "Вся активность",
      "Leaderboard": "Таблица лидеров",
      "Site Updates": "Обновления сайта",
      "Announcements that affect all sites and/or the forums.": "Объявления, которые затрагивают весь сайт и/или форум.",
      "Site Support": "Поддержка сайта",
      "Frequently Asked Questions (F.A.Q.)": "Часто задаваемые вопросы (ЧаВо)",
      "Suggestion Board": "Доска предложений",
      "Website Bug Report": "Сообщения об ошибках сайта",
      "Report bad ads": "Сообщения о плохой рекламе",
      "Talk to our team about issues with our website and services. ": "Поговорите с нашей командой о проблемах с нашим сайтом и услугах.",
      "Account Support": "Поддержка уч. записи",
      "Download Speed Troubleshooting": "Устранение неполадок со скоростью скачивания",
      "Submit a ticket": "Отправить билет",
      "Learn how to get help with issues related to your Nexus Mods account.": "Узнайте, как получить помощь в вопросах, связанных с вашей учётной записью на Nexus Mods.",
      "Documentation": "Документация",
      "This is the place to ask for help with Vortex, mod installation(s), and troubleshoot issues.": "Это место, чтобы попросить помощи с Vortex, установкой модов и устранением неполадок.",
      "Nexus Mods app": "Приложение Nexus Mods",
      "The hub for information about the Nexus Mods app.": "Центр информации о приложении Nexus Mods.",
      "Preview available now.": "Предварительная версия уже доступна.",
      "posts": "постов",
      "No posts here yet": "Нет постов",
      "Modding Discussion": "Обсуждение моддинга",
      "Mod Troubleshooting": "Устранение неполадок с модами",
      "Post your modding-related questions here and get answers from helpful members of the community.": "Разместите свои вопросы, связанные с моддингом, здесь и получите ответы от полезных членов сообщества.",
      "Mod Ideas": "Идеи для модов",
      "Got a good idea for a mod? Post it here and see if any of the mod authors would be willing to make it for you. Please keep our": "Есть идея для мода? Разместите её здесь и посмотрите, захочет ли кто-нибудь из авторов мода реализовать её для вас. Пожалуйста, помните о наших",
      "Non-solicitation Rules": " правилах нежелания ",
      "in mind when posting.": "при публикации.",
      "Modding Academy": "Академия моддинга",
      "Are you learning to make mods? Share advice and best practices with other authors here.": "Учитесь создавать моды? Поделитесь советами и лучшими практиками с другими авторами здесь.",
      "Articles and Guides": "Статьи и руководства",
      "Guides and articles written by the community.": "Наставления и статьи, написанные обществом.",
      "The Lounge": "Лаундж",
      "Newbies": "Новичкам",
      "New to the Nexus? Tell us about yourself!": "Новичок на Nexus'е? Расскажите нам о себе!",
      "General Chat": "Общий чат",
      "Debates": "Дебаты",
      "Dive into our chat forum, where we're vibing on everything from tech to the latest trends. It's a laid-back zone where everyone's welcome to drop their thoughts and join the banter.": "Погрузитесь в наш чат форума, где у нас вайб во всём, от технологий до последних трендов. Это непринуждённая область, где каждый может отказаться от своих мыслей и присоединиться к подкалываниям.",
      "Gaming": "Гейминг",
      "PC Gaming": "ПК Гейминг",
      "Other Systems": "Другие системы",
      "Classic Games": "Классические игры",
      "Software Programs": "Программное обеспечение",
      "Discuss all aspects of gaming on PC, Console, Mobile and any other platform.": "Обсудите все аспекты игр на ПК, консоли, мобильных устройствах и любой другой платформе.",
      "Hardware and software discussion": "Обсуждение аппаратного и программного обеспечения",
      "Talk about the latest hardware and software innovations or ask for technical support and advice here.": "Общайтесь о последних аппаратных и программных инновациях или спросите здесь о технической поддержке и советах.",
      "Off-Topic": "Флудилка",
      "Druid's Garden": "Сад Друида",
      "Roleplaying": "Ролевые игры",
      "Forum Games": "Форумные игры",
      "Kick back and discuss whatever takes your fancy.": "Расслабься и обсуди всё, что придёт в голову.",
      "Moderation": "Модерация",
      "Formal Warnings, Bans and Takedowns": "Официальные предупреждения, блокировки и удаления контента",
      "Closed accounts": "Заблокированные аккаунты",
      "Takedown Requests": "Запросы на удаление контента",
      "This forum contains a public record of all formal warnings, bans and content takedowns carried out by the Nexus Mods moderators.": "В этом разделе ведётся публичный архив всех официальных предупреждений, блокировок и случаев удаления контента, выполненных модераторами Nexus Mods.",
      "Who's Online": "Кто в сети ",
      "(See full list)": "(Посмотреть весь список)",
      "Contact Us": "Связь с нами",
      "Cookies": "Куки",
      "Powered by Invision Community": "Работает на Invision Community",
      "Joined": "Зарегистрирован ",
      "Last visited": "Последний раз был ",
      "Days Won": "Дни Победы",
      "Online now": " В сети",
      "Reputation": "Репутация",
      "Badges": "Значки",
      "Recent Badges": "Последние значки",
      "Dedicated": "Преданный",
      "Week One Done": "Первая неделя позади!",
      "One Month Later": "Месяц с нами",
      "One Year In": "Год с нами",
      "Posting Machine": "Генератор контента",
      "Conversation Starter": "Заводила",
      "Problem Solver": "Решала проблем",
      "Reacting Well": "Мастер реакций",
      "First Post": "Первое сообщение",
      "Helpful for": "Ценный",
      "a post in a topic": " совет в теме",
      "Very Popular": "Очень популярный",
      "Solved 10 topics": "Решено 10 тем",
      "Got 100 reactions": "Получено 100 реакций",
      "Visited daily for a week": "Посещал форум каждый день в течение недели",
      "Making your 500th post": "Создано 500-е сообщение",
      "Making your first post": "Создано первое сообщение",
      "Making your 10th post": "Создано 10-е сообщение",
      "Started a discussion": "Начал обсуждение",
      "A week since joining": "Неделя с момента регистрации",
      "A month since joining": "Месяц с момента регистрации",
      "A year since joining": "Год с момента регистрации",
      "Rank Progress": "Прогресс ранга",
      "Newbie": "Салага",
      "Newbie (1/14)": "Салага (1/14)",
      "Rookie": "Новичок",
      "Rookie (2/14)": "Новичок (2/14)",
      "Apprentice": "Ученик",
      "Apprentice (3/14)": "Ученик (3/14)",
      "Explorer": "Исследователь",
      "Explorer (4/14)": "Исследователь (4/14)",
      "Contributor": "Контрибьютор",
      "Contributor (5/14)": "Контрибьютор (5/14)",
      "Enthusiast": "Энтузиаст",
      "Enthusiast (6/14)": "Энтузиаст (6/14)",
      "Collaborator": "Командный игрок",
      "Collaborator (7/14)": "Командный игрок (7/14)",
      "Community Regular": "Постоянный участник",
      "Community Regular (8/14)": "Постоянный участник (8/14)",
      "Rising Star": "Восходящая звезда",
      "Rising Star (9/14)": "Восходящая звезда (9/14)",
      "Proficient": "Знаток",
      "Proficient (10/14)": "Знаток (10/14)",
      "Experienced": "Опытный",
      "Experienced (11/14)": "Опытный (11/14)",
      "Mentor": "Наставник",
      "Mentor (12/14)": "Наставник (12/14)",
      "Veteran": "Ветеран",
      "Veteran (13/14)": "Ветеран (13/14)",
      "Grand Master": "Великий мастер",
      "Grand Master (14/14)": "Великий мастер (14/14)",
      "Not yet earned": "Не получен",
      "Find Content": "Найти контент",
      "See their activity": "Посмотреть его активность",
      "Nexus Mods Profile": "Профиль Nexus Mods",
      "About": "Об участнике",
      "Profile Fields": "Поля профиля",
      "Country": "Страна",
      "Currently Playing": "Текущая игра",
      "Favourite Game": "Любимая игра",
      "Recent Profile Visitors": "Последние посетители профиля",
      "View Profile": "Посетить профиль",
      "Leaders & Moderators": "Лидеры и модераторы",
      "Owner": "Владелец",
      "All Members": "Все участники",
      "Post your ideas and suggestions for new mods.": "Публикуйте свои идеи и предложения для новых модов.",
      "Recently Updated": "Последнему обновлению",
      "Title": "Заголовку",
      "Start Date": "Дате создания",
      "Most Viewed": "▼ Кол-ву просмотров",
      "Most Replies": "▼ Кол-ву ответов",
      "Custom": "Настроить",
      "Custom Sort": "Настройка сортировки",
      "Filter": "Фильтр",
      "Sort Direction": "Направление",
      "Last Reply": "Последний ответ",
      "Unlocked": "Разблокировано",
      "Popular now": "Сейчас популярно",
      "Poll": "Опрос",
      "Locked": "Заблокированно",
      "Moved": "Перемещено",
      "Last post date": "Дате последнего поста",
      "Replies": "Ответам",
      "Name of last poster": "Имени последнего отправителя",
      "Name of topic starter": "Имени начинателя темы",
      "Ascending (oldest first/alphabetically)": "По возрастанию (сначало старое/в алфавитном порядке)",
      "Descending (newest first)": "По убыванию (сначало новое)",
      "Anytime": "За всё время",
      "Today": "Сегодня",
      "Last 5 Days": "За последние 5 дней",
      "Last 7 Days": "За последние 7 дней",
      "Last 10 Days": "За последние 10 дней",
      "Last 15 Days": "За последние 15 дней",
      "Last 20 Days": "За последние 20 дней",
      "Last 25 Days": "За последние 25 дней",
      "Last 30 Days": "За последние 30 дней",
      "Last 60 Days": "За последние 60 дней",
      "Last 90 Days": "За последние 90 дней",
      "Followers": "Отслеживающие",
      "Top Games": "Топ игр",
      "Recently Browsing": "Недавно просматривали ",
      "No registered users viewing this page.": "Нет зарегистрированных пользователей, просматривающих эту страницу.",
      "in": " в ",
      "Community Manager": "Менеджер сообщества",
      "Currently Playing:": "Текущая игра: ",
      "Favourite Game:": "Любимая игра: ",
      "Posted": "Отправлено ",
      "Edited": "Изменено ",
      "(edited)": "(изменено)",
      "Like": "Нравится",
      "Rank: Newbie (1/14)": "Ранг: Салага (1/14)",
      "Rank: Rookie (2/14)": "Ранг: Новичок (2/14)",
      "Rank: Apprentice (3/14)": "Ранг: Ученик (3/14)",
      "Rank: Explorer (4/14)": "Ранг: Исследователь (4/14)",
      "Rank: Contributor (5/14)": "Ранг: Контрибьютор (5/14)",
      "Rank: Enthusiast (6/14)": "Ранг: Энтузиаст (6/14)",
      "Rank: Collaborator (7/14)": "Ранг: Командный игрок (7/14)",
      "Rank: Community Regular (8/14)": "Ранг: Постоянный участник (8/14)",
      "Rank: Rising Star (9/14)": "Ранг: Восходящая звезда (9/14)",
      "Rank: Proficient (10/14)": "Ранг: Знаток (10/14)",
      "Rank: Experienced (11/14)": "Ранг: Опытный (11/14)",
      "Rank: Mentor (12/14)": "Ранг: Наставник (12/14)",
      "Rank: Veteran (13/14)": "Ранг: Ветеран (13/14)",
      "Rank: Grand Master (14/14)": "Ранг: Великий мастер (14/14)",
      "Create an account or sign in to comment": "Создайте учётную запись или войдите в систему для комментирования",
      "You need to be a member in order to leave a comment": "Вы должны быть участником, чтобы оставлять комментарии",
      "Create an account": "Создать аккаунт",
      "Sign up for a new account in our community. It's easy!": "Зарегистрируйте новую уч. запись в нашем сообществе. Это просто!",
      "Already have an account? Sign in here.": "Уже есть аккаунт? Войдите здесь.",
      "Register a new account": "Зарегестрироваться",
      "Sign In Now": "Войти",
      "Go to topic listing": "Перейти к списку тем",
      "Created": "Создано",
      "Top Posters In This Topic": "Самые активные",
      "Popular Days": "Популярные дни",
      "Popular Posts": "Популярные посты",
      "Customer Support": "Поддержка клиентов",
      "Specialist": "Специалист",
      "This topic is now closed to further replies.": " В настоящее время эта тема закрыта для дальнейших ответов.",
      "Thanks": "Спасибо",
      "Talk to our team about issues with our website and services.": "Поговорите с нашей командой о проблемах с нашим сайтом и сервисами.",
      "Talk to our team about issues with our website and services.": "Поговорите с нашей командой о проблемах с нашим сайтом и сервисами.",
      "Subforums": "Подфорумы",
      "Visit out help site to find answers to the most commonly asked questions.": "Посетите сайт помощи, чтобы найти ответы на наиболее часто задаваемые вопросы.",
      "Have a great idea for a new feature on Nexus Mods? Share your suggestions here and help shape the future of the site! You can also browse and upvote ideas from other users to show your support.": "Есть отличная идея для новой функции на Nexus Mods? Поделитесь своими предложениями здесь и помогите сформировать будущее сайта! Вы также можете просматривать и продвигать идеи других пользователей, чтобы показать свою поддержку.",
      "My Reported Issues": "Мои сообщения о проблемах",
      "Archived Issues": "Архив проблем",
      "Help us to squash pesky website bugs by reporting them or view the status of a known issue.": "Помогите нам раздавить досадные ошибки сайта, сообщив о них или проведя статус известной проблемы.",
      "A forum to report ads on the site that are bad, malicious or not allowed.": "Форум для сообщений о рекламе на сайте, которая является плохой, вредоносной или не разрешённой.",
      "Report issues with your download speed here.": "Сообщайте о проблемах со скоростью скачивания сюда.",
      "Get in touch with our team via email for account-related concerns.": "Свяжитесь с нашей командой по электронной почте для проблем, связанных с учётной записью.",
      "An important forum containing all the latest updates to the Gaming Source network, the forums and the rules and regulations which all members are meant to abide by.": "Важный форум, содержащий все последние обновления сети игровых источников, форумов, а также правил и положений, которые должны соблюдать все участники.",
      "Before you start": "Для начала",
      "Please be aware of the following points before using the app. If you skip over this information as it may negatively impact your experience.": "Пожалуйста, имейте в виду следующие моменты перед использованием приложения. Если вы пропустите эту информацию, это может негативно повлиять на ваш опыт.",
      "This is alpha software, meaning it's still very early in development and may have bugs or issues that could break your mod setup. We've done our best to patch up any major problems, but there will always be a few \"gotchas\" we haven't accounted for.": "Эта программа альфа-версии, что означает, что она ещё очень в ранней разработке и может иметь ошибки или проблемы, которые могут сломать вашу настройку модов. Мы делали всё возможное, чтобы исправить любые серьёзные проблемы, но всегда будет несколько «подводные камни», которые мы упустили.",
      "The app only works on Windows (10+) or Linux. MacOS support is coming later!": "Приложение работает только на Windows (10+) или Linux. Поддержка MacOS будет добавлена позже!",
      "The current build only supports a limited number of games - more games are planned to be added soon, so don't worry if you don't see your favourites yet!": "Текущая сборка поддерживает только ограниченное количество игр - в ближайшее время планируется добавить больше игр, поэтому не волнуйтесь, если вы ещё не видите своих любимых!",
      "We strongly recommend starting with a clean, un-modded instance of any game installation. This means removing any mods you have installed before managing it with the app.": "Мы настоятельно рекомендуем начать с чистого, не модифицированного экземпляра любой игровой установки. Это означает удаление любых модов, которые вы установили, прежде чем управлять ими с помощью приложения.",
      "As we release new versions you may be required to reset your loadout and start over. However, we'll do our best to avoid this and it won't be a requirement in the final release!": "Когда мы выпускаем новые версии, вам может потребоваться сбросить загрузку и начать все сначала. Тем не менее, мы сделаем всё возможное, чтобы избежать этого, и это не будет требованием в финальном релизе!",
      "The app will work on Steam Deck but the experience isn't optimised yet, let us know how you get on!": "Приложение будет работать на Steam Deck, но опыт ещё не оптимизирован, сообщите нам, как у вас обстоят дела!",
      "You can share your feedback and get support in this forum or check out": "Вы можете поделиться своими отзывами и получить поддержку на этом форуме или посетить ",
      "Helpful guides for users and documentation for developers looking to contribute to the app.": "Полезные руководства для пользователей и документация для разработчиков, желающих внести свой вклад в приложение.",
      "Filter By": "Фильтровать по ",
      "Solved Topics": "Решённым темам",
      "Unsolved Topics": "Нерешённым темам",
      "Sign in to follow this": "Войдите, чтобы отслеживать",
      "views": " просмотров",
      "reply": " ответ",

      /* Wiki Page */
      "Knowledge Base": "Основа знаний",
      "Game Wikis": "Вики игр",
      "General modding": "Вики игр",
      "Tutorials": "Обучение",
      "Graphics": "Графика",
      "Texturing": "Текстурирование",
      "Modelling": "Моделлинг",
      "What links here": "Какие ссылки здесь",
      "Related changes": "Связанные изменения",
      "Special pages": "Специальные страницы",
      "Printable version": "Версия для печати",
      "Permanent link": "Постоянная ссылка",
      "Page information": "Информация о странице",
      "Main page": "Главная страница",
      "View": "Посмотреть",
      "View source": "Посмотреть исходники",
      "History": "История",
      "Search Nexus Mods Wiki": "Поиск на Nexus Mods Wiki",
      "Search Nexus Mods Wiki [Alt+Shift+f]": "Поиск на Nexus Mods Wiki [Alt+Shift+f]",
      "Guest": "Гость",
      "Login with Nexus Mods": "Войти через Nexus Mods",
      "Welcome to the Nexus Mods Wiki": "Добро пожаловать на Nexus Mods Wiki",
      "This Wiki is here to provide useful articles and tutorials on the use of the Nexus sites and the games that they are related to. No need to make a new account, just use your Nexus username and password! Use the quick category list in the left nav to find what you're looking for or use the game box art below to find articles and tutorials related to specific games.": "Эта Wiki здесь, чтобы предоставить полезные статьи и учебные пособия по использованию сайтов Nexus и игр, с которыми они связаны. Не нужно создавать новую учётную запись, просто используйте имя пользователя и пароль Nexus! Используйте быстрый список категорий в левой навигационной системе, чтобы найти то, что вы ищете, или использовать арт игрового ящика ниже, чтобы найти статьи и учебные пособия, связанные с конкретными играми.",
      "Quick links": "Быстрые ссылки",
      "The rules for this Wiki": "Правила для этого Wiki",
      "Posting guidelines and template": "Рекомендации и шаблон публикации",
      "How to create a new wiki page": "Как создать новую страницу Wiki",
      "Help and FAQs on using the Nexus sites": "Помощь и ЧаВо по использованию сайтов Nexus",
      "Create a new page": "Создать новую страницу",
      "Recent Changes": "Последние изменения",
      "No changes during the given period match these criteria.": "Никакие изменения в течение данного периода не соответствуют этим критериям.",
      "(Article title)": "(Заголовок статьи)",
      "Create new article": "Создать новую статью"
    },

    // Контекстный словарь: более компактный формат
    contextual: {
      "Mods": {
        "div > p": "Модов",
        "li > p": "Моды"
      },
      "Download": {
        "h2": "Загрузки",
        "button": "Скачать"
      },
      "Forums": {
        "span": "Форум",
        "li > a.link": "Форум",
        "p > a.link": "форуму"
      },
      "log in": {
        "p > a": "войдите"
      },
      "Size": {
        "option": "Размеру",
        "span > span": "Размеру"
      },
      "Date": {
        "option": "Дате",
        "span > span": "Дате"
      },
      "Status": {
        "option": "Статусу",
        "span > span": "Статусу"
      },
      "Last reply": {
        "option": "Последнему ответу"
      },
      "Priority": {
        "option": "Важности"
      },
      "info": {
        "i": "info"
      },
      "Terms of Service": {
        "form > p > a": "условия использования"
      },
      "Privacy Policy": {
        "form > p > a": "политику конфиденциальности"
      },
      "Premium Member": {
        "p > span": "Премиум-участник",
        "span > span": "Премиум-участник"
      },
      "Members": {
        "p > span": "Участник",
        "div > p": "Участников"
      },
      "and": {
        "p > span > span": "и ещё"
      }
    },

    // Словарь месяцев
    months: {
      "Jan": "янв", "Feb": "фев", "Mar": "мар", "Apr": "апр",
      "May": "мая", "Jun": "июн", "Jul": "июл", "Aug": "авг",
      "Sep": "сен", "Oct": "окт", "Nov": "ноя", "Dec": "дек",
      "January": "января", "February": "февраля", "March": "марта",
      "April": "апреля", "May": "мая", "June": "июня", "July": "июля",
      "August": "августа", "September": "сентября", "October": "октября",
      "November": "ноября", "December": "декабря"
    },

    // Атрибуты для перевода
    translatableAttributes: ['title', 'placeholder', 'alt', 'data-tooltip', 'aria-label', 'value']
  };

  // Класс для компиляции и сопоставления контекстных правил
  class ContextMatcher {
    constructor() {
      this.rulesCache = new Map();
      this.buildRulesCache();
    }

    buildRulesCache() {
      for (const [text, contexts] of Object.entries(DICTIONARIES.contextual)) {
        const rules = Object.entries(contexts).map(([context, translation]) => ({
          context,
          translation,
          compiledSelector: this.compileSelector(context)
        }));
        this.rulesCache.set(text, rules);
      }
    }

    compileSelector(selector) {
      return selector.split('>').map(part => {
        const [tag, cls] = part.split('.');
        return { tag: tag.trim(), class: cls ? cls.trim() : null };
      });
    }

    match(element, compiledSelector) {
      const cacheKey = `${element.tagName}_${Array.from(element.classList).join('_')}_${compiledSelector.map(s => s.tag + (s.class ? '.' + s.class : '')).join('>')}`;

      if (contextCheckCache.has(cacheKey)) {
        return contextCheckCache.get(cacheKey);
      }

      let currentElement = element;
      let result = true;

      for (let i = compiledSelector.length - 1; i >= 0; i--) {
        if (!currentElement) {
          result = false;
          break;
        }

        const { tag, class: cls } = compiledSelector[i];

        if (currentElement.tagName.toLowerCase() !== tag) {
          result = false;
          break;
        }

        if (cls && !currentElement.classList.contains(cls)) {
          result = false;
          break;
        }

        currentElement = currentElement.parentElement;
      }

      contextCheckCache.set(cacheKey, result);
      return result;
    }

    findTranslation(text, element) {
      const rules = this.rulesCache.get(text);
      if (!rules) return null;

      for (const rule of rules) {
        if (this.match(element, rule.compiledSelector)) {
          return {
            translation: rule.translation,
            context: rule.context
          };
        }
      }

      return null;
    }
  }

  // Шаблоны для динамического перевода
  const DYNAMIC_TEMPLATES = [
    {
      pattern: /(\d{1,2})\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s*(\d{4})/gi,
      replacer: (match, day, month, year) =>
      `${day} ${DICTIONARIES.months[month] || month} ${year}`
  },
    // Универсальный шаблон для всех временных интервалов с ago
    {
      pattern: /(\d+)[\s\u00A0]+(second|minute|hour|day|week|month|year)s?[\s\u00A0]+ago/gi,
      replacer: (match, count, unit) => {
        const num = parseInt(count);
        const units = {
          second: ['секунду', 'секунды', 'секунд'],
          minute: ['минуту', 'минуты', 'минут'],
          hour: ['час', 'часа', 'часов'],
          day: ['день', 'дня', 'дней'],
          week: ['неделю', 'недели', 'недель'],
          month: ['месяц', 'месяца', 'месяцев'],
          year: ['год', 'года', 'лет']
        };

        return `${num} ${pluralize(num, units[unit])} назад`;
      }
    },

    // Шаблоны с плюрализацией (только для отдельных слов, без ago)
    ...createPluralizationTemplates([
      {en: 'mods', ru: ['мод', 'мода', 'модов']},
      {en: 'images?', ru: ['изображение', 'изображения', 'изображений']},
      {en: 'collections?', ru: ['коллекция', 'коллекции', 'коллекций']},
      {en: 'downloads?', ru: ['скачивание', 'скачивания', 'скачиваний']},
      {en: 'endorsements?', ru: ['одобрение', 'одобрения', 'одобрений']},
      {en: 'views?', ru: ['просмотр', 'просмотра', 'просмотров']},
      {en: 'replies?', ru: ['ответ', 'ответа', 'ответов']},
      {en: 'Members', ru: ['участник', 'участника', 'участников']},
      {en: 'Anonymous', ru: ['аноним', 'анонима', 'анонимов']},
      {en: 'Guests', ru: ['гость', 'гостя', 'гостей']},
      {en: 'members', ru: ['участник', 'участника', 'участников']},
      {en: 'results', ru: ['результат', 'результата', 'результатов']},
      {en: 'Comments', ru: ['комментарий', 'комментария', 'комментариев']},
      {en: 'mods in 1-click with Premium', ru: ['мод в один клик с премиум', 'мода в один клик с премиум', 'модов в один клик с премиум']}
    ]),

    // Статические шаблоны
    { pattern: /(\d+)\s*GB/gi, replacement: "$1 ГБ" },
    { pattern: /(\d+)\s*MB/gi, replacement: "$1 МБ" },
    { pattern: /(\d+)\s*KB/gi, replacement: "$1 КБ" },
    { pattern: /(\d+)\s*Collections/gi, replacement: "$1 коллекций" },
    { pattern: /(\d+)\s*files/gi, replacement: "$1 файлов" },
  ];

  // Вспомогательные функции
  function pluralize(number, forms) {
    if (!number || !forms || forms.length < 3) return forms[2] || '';
    const lastTwo = number % 100;
    if (lastTwo >= 11 && lastTwo <= 19) return forms[2];

    const lastDigit = number % 10;
    if (lastDigit === 1) return forms[0];
    if (lastDigit >= 2 && lastDigit <= 4) return forms[1];
    return forms[2];
  }

  function createPluralizationTemplates(units) {
    return units.map(({en, ru}) => ({
      pattern: new RegExp(`(\\d+)\\s*${en}`, 'gi'),
      replacer: (match, count) => {
        const num = parseInt(count);
        return `${num} ${pluralize(num, ru)}`;
      }
    }));
  }

  // Класс для управления кэшированием
  class TranslationCache {
    constructor() {
      this.memoryCache = new LRUCache();
      this.pendingCompressions = new Map();
      this.pendingDecompressions = new Map();
      this.db = null;
      this.worker = null;
      this.initWorker();
    }

    initWorker() {
      const workerCode = `
        const COMPRESSION_THRESHOLD = ${CONFIG.COMPRESSION_THRESHOLD};

        function compressText(text) {
          if (text.length < COMPRESSION_THRESHOLD) return text;
          try {
            return new TextEncoder().encode(text);
          } catch (e) {
            return text;
          }
        }

        function decompressText(compressed) {
          if (typeof compressed === 'string') return compressed;
          try {
            return new TextDecoder().decode(compressed);
          } catch (e) {
            return '';
          }
        }

        self.onmessage = function(e) {
          const { type, data } = e.data;
          switch (type) {
            case 'compress':
              self.postMessage({
                type: 'compressed',
                id: data.id,
                result: compressText(data.text)
              });
              break;
            case 'decompress':
              self.postMessage({
                type: 'decompressed',
                id: data.id,
                result: decompressText(data.compressed)
              });
              break;
          }
        };
      `;

      const blob = new Blob([workerCode], { type: 'application/javascript' });
      this.worker = new Worker(URL.createObjectURL(blob));

      this.worker.onmessage = (e) => {
        const { type, id, result } = e.data;
        if (type === 'compressed') {
          this.handleCompressed(id, result);
        } else if (type === 'decompressed') {
          this.handleDecompressed(id, result);
        }
      };
    }

    async initDB() {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(CONFIG.DB_NAME, CONFIG.DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          this.db = request.result;
          resolve(this.db);
        };

        request.onupgradeneeded = (event) => {
          const database = event.target.result;
          if (!database.objectStoreNames.contains(CONFIG.STORE_NAME)) {
            const store = database.createObjectStore(CONFIG.STORE_NAME, { keyPath: 'key' });
            store.createIndex('version', 'version', { unique: false });
            store.createIndex('timestamp', 'timestamp', { unique: false });
          }
        };
      });
    }

    async save(key, value, isCompressed = false) {
      if (!this.db) return;

      try {
        const transaction = this.db.transaction([CONFIG.STORE_NAME], 'readwrite');
        const store = transaction.objectStore(CONFIG.STORE_NAME);
        const item = {
          key: `${CONFIG.CACHE_VERSION}:${key}`,
          value: value,
          compressed: isCompressed,
          timestamp: Date.now(),
          version: CONFIG.CACHE_VERSION
        };
        store.put(item);
      } catch (e) {
        console.warn('Ошибка сохранения в IndexedDB:', e);
      }
    }

    async bulkSaveTranslations(translations) {
      if (!this.db || !translations.length) return;

      try {
        const transaction = this.db.transaction([CONFIG.STORE_NAME], 'readwrite');
        const store = transaction.objectStore(CONFIG.STORE_NAME);

        translations.forEach(([key, value, isCompressed = false]) => {
          store.put({
            key: `${CONFIG.CACHE_VERSION}:${key}`,
            value,
            compressed: isCompressed,
            timestamp: Date.now(),
            version: CONFIG.CACHE_VERSION
          });
        });

        return new Promise(resolve => transaction.oncomplete = resolve);
      } catch (e) {
        console.warn('Ошибка массового сохранения в IndexedDB:', e);
      }
    }

    async get(key) {
      if (!this.db) return null;

      try {
        const transaction = this.db.transaction([CONFIG.STORE_NAME], 'readonly');
        const store = transaction.objectStore(CONFIG.STORE_NAME);
        const request = store.get(`${CONFIG.CACHE_VERSION}:${key}`);

        return new Promise((resolve) => {
          request.onerror = () => resolve(null);
          request.onsuccess = () => resolve(request.result || null);
        });
      } catch (e) {
        console.warn('Ошибка чтения из IndexedDB:', e);
        return null;
      }
    }

    async cacheTranslation(text, context, translation) {
      const key = context ? `${text}::${context}` : text;

      // Сохраняем в памяти
      this.memoryCache.set(key, translation);

      // Для длинных текстов используем сжатие
      if (translation.length >= CONFIG.COMPRESSION_THRESHOLD) {
        const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        this.pendingCompressions.set(id, { key, translation });
        this.worker.postMessage({
          type: 'compress',
          data: { id, text: translation }
        });
      } else {
        // Короткие тексты сохраняем без сжатия
        await this.save(key, translation, false);
      }
    }

    async getCachedTranslation(text, context = '') {
      const key = context ? `${text}::${context}` : text;

      // Сначала проверяем кэш в памяти
      const memoryCached = this.memoryCache.get(key);
      if (memoryCached) {
        return memoryCached;
      }

      // Затем проверяем IndexedDB
      const cached = await this.get(key);
      if (!cached) {
        return null;
      }

      // Если данные сжаты, распаковываем их
      if (cached.compressed && cached.value instanceof Uint8Array) {
        return new Promise((resolve) => {
          const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          this.pendingDecompressions.set(id, resolve);
          this.worker.postMessage({
            type: 'decompress',
            data: { id, compressed: cached.value }
          });
        });
      }

      // Сохраняем в памяти для будущего использования
      this.memoryCache.set(key, cached.value);
      return cached.value;
    }

    handleCompressed(id, result) {
      const data = this.pendingCompressions.get(id);
      if (data) {
        this.save(data.key, result, true);
        this.pendingCompressions.delete(id);
      }
    }

    handleDecompressed(id, result) {
      const resolve = this.pendingDecompressions.get(id);
      if (resolve) {
        resolve(result);
        this.pendingDecompressions.delete(id);
      }
    }

    async preCacheTranslations() {
      const bulkData = [];

      // Кэшируем общий словарь
      for (const [text, translation] of Object.entries(DICTIONARIES.main)) {
        this.memoryCache.set(text, translation);
        bulkData.push([text, translation, false]);
      }

      // Кэшируем контекстный словарь
      for (const [text, contexts] of Object.entries(DICTIONARIES.contextual)) {
        for (const [context, translation] of Object.entries(contexts)) {
          const cacheKey = `${text}::${context}`;
          this.memoryCache.set(cacheKey, translation);
          bulkData.push([cacheKey, translation, false]);
        }
      }

      // Массовое сохранение в IndexedDB
      await this.bulkSaveTranslations(bulkData);
    }
  }

  // Класс для управления переводом
  class TranslationEngine {
    constructor(cache) {
      this.cache = cache;
      this.contextMatcher = new ContextMatcher();
      this.processedNodes = new WeakSet();
      this.processedAttrs = new WeakMap();
      this.observer = null;
    }

    async translateAttributes(element) {
      if (!element || !element.attributes) return;

      let processedAttrsForElement = this.processedAttrs.get(element);
      if (!processedAttrsForElement) {
        processedAttrsForElement = new Set();
        this.processedAttrs.set(element, processedAttrsForElement);
      }

      for (const attr of DICTIONARIES.translatableAttributes) {
        if (processedAttrsForElement.has(attr)) continue;

        const value = element.getAttribute(attr);
        if (!value) continue;

        // Проверяем контекстные правила для атрибутов
        const contextualResult = this.contextMatcher.findTranslation(value, element);
        let translated = contextualResult ? contextualResult.translation : null;

        // Если не нашли контекстный перевод, используем общий словарь
        if (!translated) {
          translated = await this.cache.getCachedTranslation(value);
          if (!translated && DICTIONARIES.main[value]) {
            translated = DICTIONARIES.main[value];
            await this.cache.cacheTranslation(value, '', translated);
          }
        }

        if (translated) {
          element.setAttribute(attr, translated);
          processedAttrsForElement.add(attr);

          // Кэшируем контекстный перевод
          if (contextualResult) {
            await this.cache.cacheTranslation(value, contextualResult.context, translated);
          }
        }
      }
    }

    async applyDynamicTemplates(text, element) {
      // Быстрая проверка: пропускаем чисто числовые значения
      if (/^[\d\s\.\,\-\+\:\%]+$/.test(text)) {
        return { text, replaced: false };
      }

      // Быстрая проверка: если текст не содержит цифр и английских букв, пропускаем
      if (!/\d|[a-zA-Z]/.test(text)) {
        return { text, replaced: false };
      }

      // Проверим кэш шаблонов
      const cacheKey = `template_${text}`;
      const cached = templateCache.get(cacheKey);
      if (cached) {
        return cached;
      }

      let newText = text;
      let replaced = false;

      for (const template of DYNAMIC_TEMPLATES) {
        // Сбрасываем lastIndex для глобальных регулярных выражений
        template.pattern.lastIndex = 0;

        // Быстрая проверка перед применением regex
        if (template.pattern.test(newText)) {
          template.pattern.lastIndex = 0; // Сбрасываем снова после проверки

          if (template.replacer) {
            newText = newText.replace(template.pattern, (...args) => {
              replaced = true;
              return template.replacer(...args);
            });
          } else if (template.replacement) {
            newText = newText.replace(template.pattern, template.replacement);
            replaced = true;
          }
        }
      }

      const result = { text: newText, replaced };

      // Кэшируем результат
      if (replaced && text.length < 100) {
        templateCache.set(cacheKey, result);
      }

      return result;
    }

    async translateTextNode(node) {
      if (this.processedNodes.has(node)) return false;

      const originalText = node.textContent;
      let text = originalText.trim();
      if (!text) return false;

      // Быстрая проверка: пропускаем чисто числовые значения
      if (/^\d+$/.test(text)) {
        this.processedNodes.add(node);
        return false;
      }

      // Быстрая проверка: пропускаем комбинации чисел и специальных символов
      if (/^[\d\s\.\,\-\+\:\%]+$/.test(text)) {
        this.processedNodes.add(node);
        return false;
      }

      // Быстрая проверка: если текст уже на кириллице, пропускаем
      if (/[а-яёА-ЯЁ]/.test(text) && !/[a-zA-Z]/.test(text)) {
        this.processedNodes.add(node);
        return false;
      }

      const element = node.parentNode;

      // 0. Сначала проверяем контекстные правила (самые специфичные)
      const contextualResult = this.contextMatcher.findTranslation(text, element);
      if (contextualResult) {
        node.textContent = contextualResult.translation;
        await this.cache.cacheTranslation(text, contextualResult.context, contextualResult.translation);
        this.processedNodes.add(node);
        return true;
      }

      // 1. Затем проверяем общий словарь
      if (DICTIONARIES.main[text]) {
        node.textContent = DICTIONARIES.main[text];
        await this.cache.cacheTranslation(text, '', DICTIONARIES.main[text]);
        this.processedNodes.add(node);
        return true;
      }

      // 2. Затем проверяем кэш
      const cachedTranslation = await this.cache.getCachedTranslation(text);
      if (cachedTranslation) {
        node.textContent = cachedTranslation;
        this.processedNodes.add(node);
        return true;
      }

      // 3. Пробуем применить все динамические шаблоны
      const dynamicResult = await this.applyDynamicTemplates(originalText, element);
      if (dynamicResult.replaced) {
        node.textContent = dynamicResult.text;
        this.processedNodes.add(node);
        return true;
      }

      this.processedNodes.add(node);
      return false;
    }

    async translateElement(element) {
      if (!element || this.processedNodes.has(element)) return;

      // Пропускаем элементы с определенными классами
      if (Array.from(element.classList).some(cls => IGNORED_CLASSES.has(cls))) {
        this.processedNodes.add(element);
        return;
      }

      // Специальная обработка заголовков
      const tagName = element.tagName.toLowerCase();
      if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
        if (headingElementsCache.has(element)) return;
        headingElementsCache.add(element);

        // Для заголовков используем упрощенную логику
        const text = element.textContent.trim();
        if (text && DICTIONARIES.main[text]) {
          element.textContent = DICTIONARIES.main[text];
          await this.cache.cacheTranslation(text, '', DICTIONARIES.main[text]);
          this.processedNodes.add(element);
          return;
        }
      }

      // Переводим атрибуты элемента
      await this.translateAttributes(element);

      // Рекурсивно обходим дочерние элементы
      for (const child of element.childNodes) {
        await this.translateNode(child);
      }

      this.processedNodes.add(element);
    }

    async translateNode(node) {
      if (this.processedNodes.has(node)) return;

      if (node.nodeType === Node.TEXT_NODE) {
        await this.translateTextNode(node);
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        await this.translateElement(node);
      }
    }

    async translateElementBatch(elements) {
      for (let i = 0; i < elements.length; i += CONFIG.BATCH_SIZE) {
        const batch = Array.from(elements).slice(i, i + CONFIG.BATCH_SIZE);
        await Promise.all(batch.map(el => this.translateNode(el)));

        // Даем браузеру возможность обработать другие события
        if (CONFIG.BATCH_DELAY > 0) {
          await new Promise(resolve => setTimeout(resolve, CONFIG.BATCH_DELAY));
        }
      }
    }

    observeMutations() {
      this.observer = new MutationObserver(async (mutations) => {
        const addedNodes = mutations.flatMap(m => Array.from(m.addedNodes));
        const visibleNodes = addedNodes.filter(node =>
                                               node.nodeType === Node.ELEMENT_NODE &&
                                               node.isConnected &&
                                               node.offsetParent !== null
                                              );

        for (const node of visibleNodes) {
          await this.translateNode(node);
        }
      });

      this.observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    }

    cleanup() {
      if (this.observer) {
        this.observer.disconnect();
        this.observer = null;
      }

      this.processedAttrs = new WeakMap();
    }
  }

  // Функция для получения приоритетных элементов
  function getPriorityElements() {
    return CONFIG.PRIORITY_SELECTORS.flatMap(selector =>
                                             Array.from(document.querySelectorAll(selector))
                                            ).filter(el => el.offsetParent !== null); // Только видимые элементы
  }

  // Предзагрузка ключевых переводов
  async function preloadCriticalTranslations(cache) {
    const criticalTerms = ['Download', 'Mods', 'Games', 'Collections', 'Media', 'Community', 'Support', 'Home', 'Search', 'Login', 'Register'];
    await Promise.all(criticalTerms.map(term =>
                                        cache.getCachedTranslation(term)
                                       ));
  }

  // Основная функция инициализации
  async function init() {
    try {
      // Скрываем контент до завершения перевода
      document.documentElement.style.visibility = 'hidden';

      const cache = new TranslationCache();
      await cache.initDB();

      const translator = new TranslationEngine(cache);

      // Предварительное кэширование при первом запуске
      const isInitialized = await cache.get('initialized');
      if (!isInitialized) {
        await cache.preCacheTranslations();
        await cache.save('initialized', 'true');
      }

      // Предзагрузка ключевых переводов
      await preloadCriticalTranslations(cache);

      // Обрабатываем приоритетные элементы в первую очередь
      const priorityElements = getPriorityElements();

      // Обрабатываем все остальные элементы батчами
      const allElements = document.querySelectorAll('body *');
      await translator.translateElementBatch(allElements);

      // Показываем контент после завершения перевода
      document.documentElement.style.visibility = '';

      // Начинаем наблюдение за изменениями DOM
      translator.observeMutations();

      // Очистка при выгрузке страницы
      window.addEventListener('beforeunload', () => {
        if (cache.worker) {
          cache.worker.terminate();
        }
        translator.cleanup();
      });

    } catch (error) {
      console.error('Ошибка инициализации:', error);
      // Всегда показываем контент, даже при ошибке
      document.documentElement.style.visibility = '';

      // Fallback: простая обработка без кэширования
      const simpleTranslate = (node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent.trim();
          if (!text) return;
          const element = node.parentElement;

          // Сначала проверяем контекстные правила
          const contextualResult = translator.contextMatcher.findTranslation(text, element);
          if (contextualResult) {
            node.textContent = contextualResult.translation;
            return;
          }

          // Затем общий словарь
          if (DICTIONARIES.main[text]) {
            node.textContent = DICTIONARIES.main[text];
          }
        } else {
          for (const child of node.childNodes) {
            simpleTranslate(child);
          }
        }
      };

      simpleTranslate(document.body);
    }
  }

  // Запуск
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
