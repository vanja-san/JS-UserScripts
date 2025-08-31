// ==UserScript==
// @name         NexusMods RU
// @namespace    https://github.com/ваш_ник/nexusmods-russian
// @description  Русифицирует интерфейс NexusMods.
// @copyright    2025, Ваше Имя (https://ваш_блог_или_профиль)
// @icon         https://images.nexusmods.com/images/favicon.ico
// @version      0.0.2
// @author       user
// @license      GPL-3.0
// @match        https://*.nexusmods.com/*
// @require      https://raw.githubusercontent.com/vanja-san/JS-UserScripts/test-mode/gh-pages/locale.js?v0.0.2
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function (window, document, undefined) {
    'use strict';

    /****************** Глобальная область конфигурации ******************/
    const CONFIG = {
        // Язык интерфейса
        LANG: 'ru-RU',
        // Сопоставление доменов сайтов с типами страниц (пока не используется)
        PAGE_MAP: {},
        // Типы специальных страниц (если потребуется отдельная обработка)
        SPECIAL_SITES: [],
        // CSS-селекторы для описаний (пример, нужно будет адаптировать под NexusMods)
        DESC_SELECTORS: {
            // modpage: ".mod-description", // Пример
        },
        // Конфигурация MutationObserver для отслеживания изменений DOM
        OBSERVER_CONFIG: {
            childList: true,
            subtree: true,
            characterData: true,
            // Атрибуты, которые могут изменяться и требовать перевода
            attributeFilter: ['value', 'placeholder', 'aria-label', 'data-confirm', 'title']
        }
    };

    let pageConfig = {};

    // Инициализация
    init();

    // Обновить конфигурацию страницы
    function updatePageConfig(currentPageChangeTrigger) {
        const newType = detectPageType();
        if (newType && newType !== pageConfig.currentPageType) {
            pageConfig = buildPageConfig(newType);
        }
        console.log(`【Debug】Сработал триггер: ${currentPageChangeTrigger}, тип страницы: ${pageConfig.currentPageType}`);
    }

    // Построить конфигурацию для текущей страницы pageConfig
    function buildPageConfig(pageType = pageConfig.currentPageType) {
        return {
            // Текущий тип страницы
            currentPageType: pageType,
            // Статический словарь
            staticDict: {
                ...I18N[CONFIG.LANG].public.static,
                ...(I18N[CONFIG.LANG][pageType]?.static || {})
            },
            // Правила регулярных выражений
            regexpRules: [
                ...(I18N[CONFIG.LANG][pageType]?.regexp || []),
                ...I18N[CONFIG.LANG].public.regexp
            ],
            // Селекторы игнорируемых элементов при мутациях (строка)
            ignoreMutationSelectors: [
                ...I18N.conf.ignoreMutationSelectorPage['*'],
                ...(I18N.conf.ignoreMutationSelectorPage[pageType] || [])
            ].join(', '),
            // Селекторы полностью игнорируемых элементов (строка)
            ignoreSelectors: [
                ...I18N.conf.ignoreSelectorPage['*'],
                ...(I18N.conf.ignoreSelectorPage[pageType] || [])
            ].join(', '),
            // Включить ли отслеживание characterData (булево)
            characterData: I18N.conf.characterDataPage.includes(pageType),
            // CSS-селекторы для перевода по селекторам
            tranSelectors: [
                ...(I18N[CONFIG.LANG].public.selector || []),
                ...(I18N[CONFIG.LANG][pageType]?.selector || [])
            ],
        };
    }

    /**
     * watchUpdate Функция: наблюдать за изменениями страницы и переводить новые элементы.
     */
    function watchUpdate() {
        // Кэшировать текущий URL
        let previousURL = window.location.href;

        const handleUrlChange = () => {
            const currentURL = window.location.href;
            // Если URL страницы изменился
            if (currentURL !== previousURL) {
                previousURL = currentURL;
                updatePageConfig("Изменение DOM");
            }
        }

        const processMutations = mutations => {
            // Сгладить записи мутаций и отфильтровать узлы, требующие обработки
            mutations.flatMap(({ target, addedNodes, type }) => {
                // Обработка добавления дочерних узлов
                if (type === 'childList' && addedNodes.length > 0) {
                    return [...addedNodes];
                }
                // Обработка изменений атрибутов и текстового содержимого
                return (type === 'attributes' || (type === 'characterData' && pageConfig.characterData))
                    ? [target]
                    : [];
            })
            // Отфильтровать узлы мутаций, которые нужно игнорировать
            .filter(node =>
                !node.parentElement?.closest(pageConfig.ignoreMutationSelectors)
            )
            // Обработать каждое изменение
            .forEach(node =>
                traverseNode(node)
            );
        }

        // Наблюдение за изменениями DOM в document.body
        new MutationObserver(mutations => {
            handleUrlChange();
            if (pageConfig.currentPageType) processMutations(mutations);
        }).observe(document.body, CONFIG.OBSERVER_CONFIG);
    }

    /**
     * traverseNode Функция: обойти указанный узел и перевести его.
     * @param {Node} node - Узел, который нужно обойти.
     */
    function traverseNode(rootNode) {
        const start = performance.now();

        const handleTextNode = node => {
            // Ограничить длину текста для повышения производительности
            if (node.length > 500) return;
            transElement(node, 'data');
        }

        // Если rootNode является текстовым узлом, обработать его напрямую
        if (rootNode.nodeType === Node.TEXT_NODE) {
            handleTextNode(rootNode);
            return;
        }

        const treeWalker = document.createTreeWalker(
            rootNode,
            NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
            node =>
                node.matches?.(pageConfig.ignoreSelectors)
                ? NodeFilter.FILTER_REJECT
                : NodeFilter.FILTER_ACCEPT,
        );

        const handleElement = node => {
            // Обработать перевод атрибутов различных элементов
            switch (node.tagName) {
                case "INPUT":
                case "TEXTAREA":
                    if (['button', 'submit', 'reset'].includes(node.type)) {
                        transElement(node.dataset, 'confirm');
                        transElement(node, 'value');
                    } else {
                        transElement(node, 'placeholder');
                    }
                    break;

                case "OPTGROUP":
                    transElement(node, 'label');
                    break;

                case "BUTTON":
                    transElement(node, 'title');
                    transElement(node.dataset, 'confirm');
                    transElement(node.dataset, 'confirmText');
                    transElement(node.dataset, 'confirmCancelText');
                    transElement(node, 'cancelConfirmText');
                    transElement(node.dataset, 'disableWith');

                case "A":
                case "SPAN":
                    transElement(node, 'title');
                    transElement(node.dataset, 'visibleText');

                default:
                    // Только если у элемента есть стиль 'tooltipped'
                    if (/tooltipped/.test(node.className)) transElement(node, 'ariaLabel');
            }
        }

        // Предварительно привязать функции обработки
        const handlers = {
            [Node.ELEMENT_NODE]: handleElement,
            [Node.TEXT_NODE]: handleTextNode
        };

        let currentNode;
        while ((currentNode = treeWalker.nextNode())) {
            handlers[currentNode.nodeType]?.(currentNode);
        }

        const duration = performance.now() - start;
        if (duration > 10) {
            console.log(`Время обхода узла: ${duration.toFixed(2)}ms`);
        }
    }

    /**
     * detectPageType Функция: определить тип текущей страницы.
     * @returns {string|boolean} Тип страницы, например 'modpage', 'userprofile'. Если тип не определен, возвращает false.
     */
    function detectPageType() {
        const url = new URL(window.location.href);
        const { hostname, pathname } = url;

        const site = 'nexusmods';

        // Признаки страницы - Нужно адаптировать под структуру NexusMods!
        const isModPage = pathname.includes('/mods/');
        const isUserProfile = pathname.includes('/users/');
        const isGamePage = pathname.startsWith('/games/');
        const isFrontPage = pathname === '/' || pathname === '';

        let pageType;
        switch (true) {
            case isFrontPage:
                pageType = 'frontpage';
                break;
            case isModPage:
                pageType = 'modpage';
                break;
            case isUserProfile:
                pageType = 'userprofile';
                break;
            case isGamePage:
                pageType = 'gamepage';
                break;
            default:
                pageType = 'generic';
        }

        console.log(`【Debug】pathname = ${pathname}, site = ${site}, pageType = ${pageType}`);

        // Проверка словаря
        if (pageType === false || !I18N[CONFIG.LANG]?.[pageType]) {
            console.warn(`[i18n] Тип страницы не совпадает или отсутствует словарь: ${pageType}`);
        }

        return pageType;
    }

    /**
     * transTitle Функция: перевести заголовок страницы.
     */
    function transTitle() {
        const text = document.title;
        let translatedText = I18N[CONFIG.LANG]['title']['static'][text] || '';
        if (!translatedText) {
            const res = I18N[CONFIG.LANG]['title'].regexp || [];
            for (const [pattern, replacement] of res) {
                translatedText = text.replace(pattern, replacement);
                if (translatedText !== text) break;
            }
        }
        if (translatedText) {
            document.title = translatedText;
        }
    }

    /**
     * transElement Функция: перевести текстовое содержимое или атрибут указанного элемента.
     * @param {Element|DOMStringMap} el - Элемент или dataset.
     * @param {string} field - Имя атрибута или поле текстового содержимого.
     */
    function transElement(el, field) {
        const text = el[field];
        if (!text) return false;

        const translatedText = transText(text);
        if (translatedText) {
            el[field] = translatedText;
        }
    }

    /**
     * transText Функция: перевести текстовое содержимое.
     * @param {string} text - Текст, который нужно перевести.
     * @returns {string|boolean} Переведенное текстовое содержимое или false.
     */
    function transText(text) {
        // Определить, нужно ли пропустить перевод
        const shouldSkip = text => /^[\s0-9]*$/.test(text) || /^[\u0400-\u04FF\u0500-\u052F]+$/.test(text) || !/[a-zA-Z,.!?]/.test(text);
        if (shouldSkip(text)) return false;

        // Очистить текст
        const trimmedText = text.trim();
        const cleanedText = trimmedText.replace(/\xa0|[\s]+/g, ' ');

        // Попытаться получить перевод
        const translatedText = fetchTranslatedText(cleanedText);

        // Если перевод найден и отличается от оригинала
        if (translatedText && translatedText !== cleanedText) {
            return text.replace(trimmedText, translatedText);
        }

        return false;
    }

    /**
     * fetchTranslatedText Функция: получить перевод из словаря.
     * @param {string} text - Текст, который нужно перевести.
     * @returns {string|boolean} Переведенный текст или false.
     */
    function fetchTranslatedText(text) {
        // Статический перевод
        let translatedText = pageConfig.staticDict[text];
        if (typeof translatedText === 'string') return translatedText;

        // Перевод с помощью регулярных выражений
        for (const [pattern, replacement] of pageConfig.regexpRules) {
            translatedText = text.replace(pattern, replacement);
            if (translatedText !== text) return translatedText;
        }

        return false;
    }

    /**
     * transBySelector Функция: перевести элементы по CSS-селекторам.
     */
    function transBySelector() {
        pageConfig.tranSelectors?.forEach(([selector, translatedText]) => {
            const element = document.querySelector(selector);
            if (element) {
                element.textContent = translatedText;
            }
        })
    }

    /**
     * init Функция: инициализировать функцию перевода.
     */
    function init() {
        if (typeof I18N === 'undefined') {
            console.error('NexusMods Русификатор: Файл словаря locale.js не загружен, скрипт не может работать!');
            return;
        } else {
            console.log(`Файл словаря locale.js загружен`);
        }

        // Установить русскую локаль
        document.documentElement.lang = CONFIG.LANG;

        // Наблюдать за значением HTML Lang
        new MutationObserver(() => {
            if (document.documentElement.lang?.startsWith("en")) {
                document.documentElement.lang = CONFIG.LANG;
            }
        }).observe(document.documentElement, { attributeFilter: ['lang'] });

        // Слушать событие завершения загрузки страницы (если используется Turbo/SPA)
        document.addEventListener('turbo:load', () => {
            console.log("Событие turbo:load");
            if (!pageConfig.currentPageType) return;

            transTitle();
            transBySelector();
            // Перевод описаний через кнопку убран
        });

        // Первичный перевод страницы
        window.addEventListener('DOMContentLoaded', () => {
            console.log("DOMContentLoaded");
            updatePageConfig('Первая загрузка');
            if (pageConfig.currentPageType) {
                console.log("Запуск начального обхода страницы...");
                traverseNode(document.body);
            }
            watchUpdate(); // Начать отслеживание изменений
        });
    }

})(window, document);
