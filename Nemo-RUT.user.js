// ==UserScript==
// @name         Nemo-RUT
// @name:ru      Nemo-RUT
// @namespace    http://tampermonkey.net/
// @description  Add Russian localization for Nexus Mods.
// @description:ru  Добавляет русскую локализацию для сайта Nexus Mods.
// @version      1.5
// @author       vanja-san
// @match        https://*.nexusmods.com/*
// @grant        none
// @license      MIT
// ==/UserScript==

(function() {
  'use strict';

  // Константы
  const CACHE_VERSION = 'v1.0.50';
  const DB_NAME = 'translationCache';
  const DB_VERSION = 1;
  const STORE_NAME = 'translations';
  const COMPRESSION_THRESHOLD = 100;

  // УСЛОВНЫЙ СЛОВАРЬ: Ключ = 'текст::контекст' (селектор или описание)
  const dictionary = {
    "Home":                        "Главная",
    "Games":                       "Игры",
    "Mods":                        "Моды",
    "All mods":                    "Все моды",
    "Trending mods":               "Популярные моды",
    "New":                         "Новые",
    "Images":                      "Изображения",
    "Videos":                      "Видео",
    "Articles":                    "Статьи",
    "Forums":                      "Форумы",
    "Downloads":                   "Скачиваний",
    "Collections":                 "Коллекции",
    "All collections":             "Все коллекции",
    "Highest rated":               "Высокооценённые",
    "Collections tutorials":       "Обучение коллекций",
    "Media":                       "Медиа",
    "Latest":                      "Последние",
    "Supporter images":            "Изображения поддержки",
    "Upgrade":                     "Улучшить",
    "Community":                   "Сообщество",
    "Wiki":                        "Вики",
    "Support authors":             "Поддержка авторов",
    "News":                        "Новости",
    "All news":                    "Все новости",
    "Site news":                   "Новости сайта",
    "Competitions":                "Конкурсы",
    "Interviews":                  "Интервью",
    "Site News":                   "Новости сайта",
    "Mod News":                    "Новости модов",
    "Support":                     "Поддержка",
    "Help":                        "Справка",
    "Contact":                     "Контакт",
    "FAQ":                         "ЧаВо",
    "Game guides":                 "Игровые руководства",
    "Tutorial":                    "Обучение",
    "Tools":                       "Инструменты",
    "Vortex help":                 "Справка по Vortex",
    "API documentation":           "Документация к API",
    "Install Vortex":              "Установить Vortex",
    "Give feedback":               "Обратная связь",
    "Give Feedback":               "Дать обратную связь",
    "Search":                      "Поиск",
    "Log in":                      "Войти",
    "Register":                    "Регистрация",
    "Download":                    "Скачать",
    "Endorse":                     "Одобрить",
    "Subscribe":                   "Подписаться",
    "Posts":                       "Сообщения",
    "Description":                 "Описание",
    "Requirements":                "Зависимости",
    "Permissions":                 "Условия использования",
    "Log in to":                   "Вход на ",
    "You need to":                 "Вам нужно ",
    "log in":                      "войти",
    "before continuing.":          " перед тем как продолжить.",
    "Email or Username":           "Эл. почта или имя пользователя",
    "Password":                    "Пароль",
    "Forgot your":                 "Забыли свой ",
    "Need an account?":            "Требуется учётная запись? ",
    "Register here":               "Зарегестрируйтесь здесь",
    "Comments":                    "Комментарии",
    "Files":                       "Файлы",
    "Recently updated":            "Обновлены недавно",
    "Recently added":              "Добавлены недавно",
    "Most endorsed":               "Больше одобреных",
    "What's new":                  "Что нового",
    "Categories":                  "Категории",
    "Welcome back,":               "С возвращением,",
    "All games":                   "Все игры",
    "My games":                    "Мои игры",
    "Trending":                    "В тренде",
    "Mod updates":                 "Обновления модов",
    "Tracked mods":                "Отслеживание модов",
    "My stuff":                    "Мои вещи",
    "My mods":                     "Мои моды",
    "Mod rewards":                 "Награды мода",
    "Download history":            "История скачиваний",
    "Upload mod":                  "Добавить мод",
    "Modding tutorials":           "Обучение моддингу",
    "Explore":                     "Изучить",
    "Vortex mod manager":          "Менеджер модов Vortex",
    "Members":                     "Участники",
    "Creator rewards":             "Вознаграждений",
    "Modding made easy":           "Модинг — это просто",
    "Browse all mods":             "Просмотреть все моды",
    "Mods and collections for":    "Моды и коллекции для ",
    "games.":                      " игр.",
    "View all":                    "Смотреть все",
    "View more":                   "Смотреть все",
    "Get started":                 "Начать",
    "Next level graphics":         "Графика следующего уровня",
    "Auto-install 100s of mods":   "Автоматическая установка сотен модов",
    "Epic new content":            "Эпический новый контент",
    "Infinite replayability":      "Бесконечная реиграбельность",
    "Updated":                     "Обновлённые",
    "Popular":                     "Популярные",
    "Surprise":                    "Сюрприз",
    "All time":                    "За всё время",
    "24 Hours":                    "За 24 часа",
    "7 Days":                      "За 7 дней",
    "14 Days":                     "За 14 дней",
    "28 Days":                     "За 28 дней",
    "1 Year":                      "За год",
    "Get fast downloads with":     "Получите быстрое скачивание с ",
    "Upgrade to Premium to":       "Улучшение до премиума даст ",
    "auto-install collections,":   "автоустановку коллекций, ",
    "get":                         "получение ",
    "uncapped download speeds":    "неограниченной скорости скачивания ",
    "and":                         "и",
    "browse ad-free.":             "отключение рекламы.",
    "Go Premium":                  "Получить Premium",
    "Our creators earned over $":  "Наши создатели заработали более $",
    "Share your creations on the": "Поделитесь своими творениями на",
    "Get":                         " Получите",
    "exclusive premium perks,":    " эксклюзивные премиальные льготы,",
    "cash out reward points or":   " обналичьте бонусные баллы или",
    "trade them for new games.":   " обменяйте их на новые игры.",
    "Learn more":                  "Подробнее",
    "Earn mod rewards":            "Зарабатывайте награды за моды",
    "Get free premium":            "Получите бесплатный премиум",
    "Connect with creators":       "Связывайтесь с создателями",
    "Get free game keys":          "Получайте бесплатные ключи игр",
    "Latest news":                 "Последние новости",
    "A community of":              "Сообщество",
    "passionate gamers and creators": " страстных геймеров и создателей",
    "Come and chat with our":      "Приходите поболтать с нашим сообществом в ",
    "community.":                  ".",
    "Join the conversation on our": "Присоединяйтесь к нашему ",
    "today.":                      " сегодня.",
    "Follow us on":                "Следите за нами на ",
    "for fresh video content.":    " для свежего видео-контента",
    "Statistics":                  "Статистики",
    "Careers":                     "Карьера",
    "About us":                    "О нас",
    "Premium features":            "Премиум возможности",
    "Discover":                    "Откройте для себя",
    "New mods":                    "Новые моды",
    "Popular mods":                "Популярные моды",
    "All images":                  "Все изображения",
    "API reference":               "Ссылки API",
    "Feedback":                    "Обратная связь",
    "Report a bug":                "Сообщить об ошибке",
    "Unban requests":              "Запросить снятия бана",
    "DMCA":                        "Закон об авторском праве",
    "Manage cookie settings":      "Настройки куки",
    "Contact us":                  "Связаться с нами",
    "Support Nexus Mods":          "Поддержать Nexus Mods",
    "Network stats":               "Статистика сети",
    "Server info":                 "Информ. сервера",
    "Copyright ©":                 "Авторские права © ",
    "Terms of Service":            "Условия использования",
    "Privacy Policy":              "Политика конфиденциальности",
    "Choose from":                 "Выберите из ",
    "games":                       "игр ",
    "to mod":                      "с модами",
    "Download count":              "Кол-во скачиваний",
    "Mods count":                  "Кол-во модов",
    "Collections count":           "Кол-во коллекций",
    "Name":                        "Название",
    "Date added":                  "Дата добавления",
    "20 Items":                    "20 элементов",
    "40 Items":                    "40 элементов",
    "60 Items":                    "60 элементов",
    "80 Items":                    "80 элементов",
    "Get more":                    "Получите больше",
    "with Premium":                "с премиумом",
    "View more results for mods,": "Больше результатов для модов, ",
    "collections and media everywhere.": "коллекций и медиа везде.",
    "Hide filters":                "Скрыть фильтры",
    "Show filters":                "Показать фильтры",
    "Game":                        "Игра",
    "Search game":                 "Искать игру",
    "Apply":                       "Применить",
    "Game genre":                  "Жанр игры",
    "Vortex Support":              "Поддержка Vortex",
    "Supported by Vortex":         "Поддерживаются Vortex",
    "Show games with Collections": "Показать игры с коллекциями",
    "Page":                        "Страница",
    "Go":                          "Перейти",
    "Browse the internet's best mods": "Просмотр лучших модов в интернете",
    "Hide adult content":          "Скрыть контент для взрослых",
    "Show only adult content":     "Показать контент для взрослых",
    "Tags":                        "Теги",
    "Includes":                    "Включить",
    "Excludes":                    "Исключить",
    "Search parameters":           "Параметры поиска",
    "Language support":            "Поддерживаемые языки",
    "Hide translations":           "Скрыть переводы",
    "Content options":             "Параметры контента",
    "Show only updated mods":      "Показать только обновленные моды",
    "File size":                   "Размер файла",
    "Endorsements":                "Одобрений",
    "Make mods.":                  "Делай моды.",
    "Earn rewards.":               "Получай награды.",
    "Learn More":                  "Подробнее",
    "From":                        "С",
    "To":                          "До",
    "Date Published":              "Дата публикации",
    "Unique Downloads":            "Уникальных скачиваний",
    "Last Updated":                "Последнее обновление",
    "Mod Name":                    "Название",
    "File Size":                   "Размер файла",
    "Last Comment":                "Последний комментарий",
    "Desc":                        "▼",
    "Asc":                         "▲",
    "Standard":                    "По умолчанию",
    "Compact":                     "Компактно",
    "List":                        "Список",
    "Customise your":              "Кастомизируй свои ",
    "preference":                  "настройки",
    "Time range: 24 Hours":        "Диапазон времени: 24 часа",
    "Time range: 7 Days":          "Диапазон времени: 7 дней",
    "Time range: 14 Days":         "Диапазон времени: 14 дней",
    "Time range: 28 Days":         "Диапазон времени: 28 дней",
    "Time range: 1 Year":          "Диапазон времени: Год",
    "Clear all":                   "Очистить все",
    "Install hundreds of mods with the click of a button.": "Устанавливайте сотни модов одним нажатием кнопки. ",
    "Learn more about collections": "Подробнее о коллекциях",
    "Most downloaded":             "Самые скачиваемые",
    "Recently listed":             "Недавно перечисленные",
    "Mod manager for installing collections": "Менеджер модов для установки коллекций",
    "Download Vortex":             "Скачать Vortex",
    "Game Version":                "Версия игры",
    "Views": "Просмотров",
    "No. of mods": "Кол. модов",
    "No. of collections": "Кол. коллекций",
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
    "Trending Mods": "Топ модов",
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
    "Donations": "Донаты",
    "Changelogs": "Список изменений",
    "The powerful open-source mod manager from Nexus Mods.": "Мощный менеджер модов с открытым исходным кодом от Nexus Mods.",
    "Main files": "Основные файлы",
    "Archived files": "Архив файлов",
    "Nexus requirements": "Требования сайта",
    "Mod name": "Название мода",
    "Notes": "Примечание",
    "Credits and distribution permission": "Участники и разрешение на распространение",
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
    "Premium Member": "Премиум-участником",
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
    "Total number of downloads, updates every 15 minutes": "Общее количество скачиваний. Обновляется каждые 15 минут",
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
    "Online User List": "Список пользователей в сети",
    "Find out more about modding with our": "Узнайте больше о моддинге в нашем ",
    "Use mods to power up your game": "Используйте моды для повышения мощи своей игры",
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
    "Announcements that affect all sites and/or the forums.": "Объявления, которые затрагивают весь сайт и/или форумы.",
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

  };

  // СЛОВАРЬ ДЛЯ ПЕРЕВОДА ПО HREF
  const hrefDictionary = {
    // Формат: "URL-путь или его часть": "Перевод"
  };

  // КОНТЕКСТНЫЙ СЛОВАРЬ: Ключ = 'текст::структурный_селектор'
  const contextualDictionary = {
    "Mods::div > p": "Модов",
    "Mods::li > p": "Моды",
    "Download::h2": "Загрузки",
    "Download::button": "Скачать",
    "Forums::span":"Форум",
    "Forums::li > a.link":"Форум",
    "Forums::p > a.link": "форуму",
    "log in::p>a": "войдите",
    "Size::option": "Размеру",
    "Size::span > span": "Размеру",
    "Date::option": "Дате",
    "Date::span > span": "Дате",
    "Status::option": "Статусу",
    "Status::span > span": "Статусу",
    "Last reply::option": "Последнему ответу",
    "Priority::option": "Важности",
    "info::i": "info",
    "Terms of Service::form > p > a": "условия использования ",
    "Privacy Policy::form > p > a":  " политику конфиденциальности",
    "Premium Member::p > span": "Премиум-участник",
    "Premium Member::span > span": "Премиум-участник",
    "Members::p > span": "Участник"
  };

  // Глобальные переменные
  let translationWorker;
  let db;
  let observer;
  const pendingCompressions = new Map();
  const pendingDecompressions = new Map();
  const memoryCache = new Map();
  const processedNodes = new WeakSet();
  const processedAttrs = new WeakMap();

  // Функция проверки контекста
  function checkContextBySelector(element, selector) {
    if (!selector || !element) return false;

    try {
      if (selector.includes('>')) {
        const parts = selector.split('>').map(part => part.trim());
        let currentElement = element;

        for (let i = parts.length - 1; i >= 0; i--) {
          if (!currentElement || !currentElement.matches(parts[i])) {
            return false;
          }
          currentElement = currentElement.parentElement;
        }
        return true;
      } else {
        return element.closest(selector) !== null;
      }
    } catch (e) {
      console.warn('Ошибка проверки контекста:', e, selector);
      return false;
    }
  }

  // Инициализация Web Worker
  function initWorker() {
    const workerCode = `
      const COMPRESSION_THRESHOLD = ${COMPRESSION_THRESHOLD};

      function compressText(text) {
        if (text.length < COMPRESSION_THRESHOLD) return text;
        try {
          const encoder = new TextEncoder();
          return encoder.encode(text);
        } catch (e) {
          return text;
        }
      }

      function decompressText(compressed) {
        if (typeof compressed === 'string') return compressed;
        try {
          const decoder = new TextDecoder();
          return decoder.decode(compressed);
        } catch (e) {
          return '';
        }
      }

      self.onmessage = function(e) {
        const { type, data } = e.data;
        switch (type) {
          case 'compress':
            const compressed = compressText(data.text);
            self.postMessage({ type: 'compressed', id: data.id, result: compressed });
            break;
          case 'decompress':
            const decompressed = decompressText(data.compressed);
            self.postMessage({ type: 'decompressed', id: data.id, result: decompressed });
            break;
        }
      };
    `;

    const blob = new Blob([workerCode], { type: 'application/javascript' });
    translationWorker = new Worker(URL.createObjectURL(blob));

    translationWorker.onmessage = function(e) {
      const { type, id, result } = e.data;
      if (type === 'compressed') {
        const data = pendingCompressions.get(id);
        if (data) {
          saveToIndexedDB(data.key, result, true);
          pendingCompressions.delete(id);
        }
      } else if (type === 'decompressed') {
        useDecompressedTranslation(id, result);
      }
    };
  }

  // Инициализация IndexedDB
  function initIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        db = request.result;
        resolve(db);
      };
      request.onupgradeneeded = (event) => {
        const database = event.target.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          const store = database.createObjectStore(STORE_NAME, { keyPath: 'key' });
          store.createIndex('version', 'version', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  // Сохранение в IndexedDB
  function saveToIndexedDB(key, value, isCompressed = false) {
    if (!db) return;
    try {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const item = {
        key: `${CACHE_VERSION}:${key}`,
        value: value,
        compressed: isCompressed,
        timestamp: Date.now(),
        version: CACHE_VERSION
      };
      store.put(item);
    } catch (e) {
      console.warn('Ошибка сохранения в IndexedDB:', e);
    }
  }

  // Получение из IndexedDB
  function getFromIndexedDB(key) {
    return new Promise((resolve) => {
      if (!db) {
        resolve(null);
        return;
      }
      try {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(`${CACHE_VERSION}:${key}`);
        request.onerror = () => resolve(null);
        request.onsuccess = () => {
          resolve(request.result ? request.result : null);
        };
      } catch (e) {
        console.warn('Ошибка чтения из IndexedDB:', e);
        resolve(null);
      }
    });
  }

  // Кэширование перевода
  async function cacheTranslation(text, context, translation) {
    const key = context ? `${text}::${context}` : text;

    // Сохраняем в памяти для быстрого доступа
    memoryCache.set(key, translation);

    // Ограничиваем размер memoryCache
    if (memoryCache.size > 1000) {
      const firstKey = memoryCache.keys().next().value;
      memoryCache.delete(firstKey);
    }

    // Для длинных текстов используем сжатие в Web Worker
    if (translation.length >= COMPRESSION_THRESHOLD) {
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      pendingCompressions.set(id, { key, translation });
      translationWorker.postMessage({ type: 'compress', data: { id, text: translation } });
    } else {
      // Короткие тексты сохраняем без сжатия
      saveToIndexedDB(key, translation, false);
    }
  }

  // Получение перевода из кэша
  async function getCachedTranslation(text, context = '') {
    const key = context ? `${text}::${context}` : text;

    // Сначала проверяем кэш в памяти
    if (memoryCache.has(key)) {
      return memoryCache.get(key);
    }

    // Затем проверяем IndexedDB
    const cached = await getFromIndexedDB(key);
    if (!cached) return null;

    // Если данные сжаты, распаковываем их
    if (cached.compressed && cached.value instanceof Uint8Array) {
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      return new Promise((resolve) => {
        pendingDecompressions.set(id, resolve);
        translationWorker.postMessage({ type: 'decompress', data: { id, compressed: cached.value } });
      });
    }

    // Сохраняем в памяти для будущего использования
    memoryCache.set(key, cached.value);
    return cached.value;
  }

  // Использование распакованного перевода
  function useDecompressedTranslation(id, translation) {
    const resolve = pendingDecompressions.get(id);
    if (resolve) {
      resolve(translation);
      pendingDecompressions.delete(id);
    }
  }

  // Предварительное кэширование
  async function preCacheTranslations() {
    console.log('Начинаем предварительное кэширование переводов...');

    // Кэшируем общий словарь
    for (const [text, translation] of Object.entries(dictionary)) {
      await cacheTranslation(text, '', translation);
    }

    // Кэшируем контекстный словарь
    for (const [key, translation] of Object.entries(contextualDictionary)) {
      const [text, context] = key.split('::');
      if (text && context) {
        await cacheTranslation(text, context, translation);
      }
    }

    console.log('Предварительное кэширование завершено');
  }

  // Функция перевода атрибутов
  async function translateAttributes(element) {
    if (!element || !element.attributes) return;

    const attributesToTranslate = ['title', 'placeholder', 'alt', 'data-tooltip', 'aria-label', 'value'];
    let processedAttrsForElement = processedAttrs.get(element);

    if (!processedAttrsForElement) {
      processedAttrsForElement = new Set();
      processedAttrs.set(element, processedAttrsForElement);
    }

    for (const attr of attributesToTranslate) {
      if (processedAttrsForElement.has(attr)) continue;

      const value = element.getAttribute(attr);
      if (!value) continue;

      // Проверяем контекстные правила для атрибутов
      let translated = null;
      for (const [key, translation] of Object.entries(contextualDictionary)) {
        const [contextText, contextSelector] = key.split('::');
        if (value === contextText && checkContextBySelector(element, contextSelector)) {
          translated = await getCachedTranslation(value, contextSelector);
          if (!translated) {
            translated = translation;
            await cacheTranslation(value, contextSelector, translation);
          }
          break;
        }
      }

      // Если не нашли контекстный перевод, используем общий словарь
      if (!translated) {
        translated = await getCachedTranslation(value);
        if (!translated && dictionary[value]) {
          translated = dictionary[value];
          await cacheTranslation(value, '', translated);
        }
      }

      if (translated) {
        element.setAttribute(attr, translated);
        processedAttrsForElement.add(attr);
      }
    }
  }

  // ОСНОВНАЯ ФУНКЦИЯ ЗАМЕНЫ ТЕКСТА - ОПТИМИЗИРОВАННАЯ
  async function replaceText(node) {
    if (processedNodes.has(node)) return;

    if (node.nodeType === Node.TEXT_NODE) {
      let text = node.textContent.trim();
      if (!text) return;

      const element = node.parentNode;

      // 1. Сначала проверяем контекстные правила
      for (const [key, translation] of Object.entries(contextualDictionary)) {
        const [contextText, contextSelector] = key.split('::');

        if (text === contextText && checkContextBySelector(element, contextSelector)) {
          // Проверяем кеш для этого контекста
          const cachedTranslation = await getCachedTranslation(text, contextSelector);
          if (cachedTranslation) {
            node.textContent = cachedTranslation;
          } else {
            node.textContent = translation;
            await cacheTranslation(text, contextSelector, translation);
          }
          processedNodes.add(node);
          return;
        }
      }

      // 2. Проверяем кэш для этого текста без контекста
      const cachedTranslation = await getCachedTranslation(text);
      if (cachedTranslation) {
        node.textContent = cachedTranslation;
        processedNodes.add(node);
        return;
      }

      // 3. Проверяем общий словарь
      if (dictionary[text]) {
        node.textContent = dictionary[text];
        await cacheTranslation(text, '', dictionary[text]);
        processedNodes.add(node);
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      // Переводим атрибуты элемента
      await translateAttributes(node);

      // Рекурсивно обходим дочерние элементы
      for (let i = 0; i < node.childNodes.length; i++) {
        await replaceText(node.childNodes[i]);
      }
      processedNodes.add(node);
    }
  }

  // Наблюдение за изменениями DOM
  function observeMutations() {
    observer = new MutationObserver(async function(mutations) {
      const processNode = async (node) => {
        if (node.nodeType === Node.ELEMENT_NODE && node.isConnected) {
          await replaceText(node);
        }
      };

      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          await processNode(node);
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  // Очистка ресурсов
  function cleanup() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }

    if (translationWorker) {
      translationWorker.terminate();
      translationWorker = null;
    }

    pendingCompressions.clear();
    pendingDecompressions.clear();
    memoryCache.clear();
  }

  // Инициализация
  async function init() {
    try {
      // Скрываем контент до завершения перевода
      document.documentElement.style.visibility = 'hidden';

      initWorker();
      await initIndexedDB();

      // Предварительное кэширование при первом запуске
      const isInitialized = await getFromIndexedDB('initialized');
      if (!isInitialized) {
        await preCacheTranslations();
        saveToIndexedDB('initialized', 'true');
      }

      // Обрабатываем видимые элементы в первую очередь
      const visibleElements = document.querySelectorAll('body *:not([style*="display:none"]):not([style*="display: none"])');
      for (const element of visibleElements) {
        await replaceText(element);
      }

      // Затем обрабатываем весь документ
      await replaceText(document.body);

      // Показываем контент после завершения перевода
      document.documentElement.style.visibility = '';

      observeMutations();

      // Очистка при выгрузке страницы
      window.addEventListener('beforeunload', cleanup);

    } catch (error) {
      console.error('Ошибка инициализации:', error);
      // Всегда показываем контент, даже при ошибке
      document.documentElement.style.visibility = '';

      // Fallback: используем простую обработку
      const simpleReplace = (node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent.trim();
          if (!text) return;
          const element = node.parentElement;

          // Сначала проверяем контекстные правила
          for (const [key, translation] of Object.entries(contextualDictionary)) {
            const [contextText, contextSelector] = key.split('::');
            if (text === contextText && checkContextBySelector(element, contextSelector)) {
              node.textContent = translation;
              return;
            }
          }

          // Затем общий словарь
          if (dictionary[text]) {
            node.textContent = dictionary[text];
          }
        } else {
          for (let i = 0; i < node.childNodes.length; i++) {
            simpleReplace(node.childNodes[i]);
          }
        }
      };
      simpleReplace(document.body);
      observeMutations();
    }
  }

  // Запуск
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();