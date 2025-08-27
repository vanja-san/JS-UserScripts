// ==UserScript==
// @name         Safebooru Tags Hauler
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  Copy tags from Safebooru images with modern UI and settings
// @author       vanja-san
// @match        https://safebooru.org/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=safebooru.org
// @grant        GM_registerMenuCommand
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    // Конфигурация
    const CONFIG = {
        defaultSettings: {
            addCommas: false,
            escapeBrackets: false,
            buttonSize: 100,
            animationDuration: 3000
        },
        selectors: {
            images: 'img.preview',
            imageContainer: 'a'
        },
        classes: {
            copyButton: 'sthauler-copy-btn',
            modal: 'sthauler-modal',
            overlay: 'sthauler-overlay'
        }
    };

    // Современные SVG иконки
    const ICONS = {
        copy: `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
        `,
        check: `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `,
        settings: `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 极速加速器 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-极速加速器 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.极速加速器.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
        `
    };

    // Добавляем стили через GM_addStyle
    GM_addStyle(`
        .${CONFIG.classes.copyButton} {
            position: absolute;
            bottom: 8px;
            right: 8px;
            padding: 6px;
            background: rgba(0, 0, 0, 0.75);
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            opacity: 0;
            transition: all 0.3s ease;
            z-index: 1000;
            display: flex;
            align-items: center;
            justify-content: center;
            transform-origin: bottom right;
        }

        .${CONFIG.classes.copyButton}:hover {
            background: rgba(0, 0, 0, 0.9);
            transform: scale(1.05);
        }

        .${CONFIG.classes.copyButton}.success {
            background: rgba(76, 175, 80, 0.9) !important;
        }

        .${CONFIG.classes.overlay} {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.6);
            z-index: 9998;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: fadeIn 0.3s ease;
        }

        .${CONFIG.classes.modal} {
            background: white;
            padding: 28px;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
            min-width: 380px;
            max-width: 90vw;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            color: #2d3748;
            animation: scaleIn 0.3s ease;
        }

        .${CONFIG.classes.modal} h3 {
            margin: 0 0 24px 0;
            padding-bottom: 16px;
            border-bottom: 1px solid #e2e8f0;
            font-size: 20px;
            font-weight: 600;
            color: #1a202c;
        }

        .${CONFIG.classes.modal} .setting-item {
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .${CONFIG.classes.modal} .setting-label {
            display: flex;
            align-items: center;
            flex: 1;
            cursor: pointer;
            font-size: 15px;
        }

        .${CONFIG.classes.modal} .checkbox {
            width: 20px;
            height: 20px;
            margin-right: 12px;
            cursor: pointer;
            accent-color: #4CAF50;
        }

        .${CONFIG.classes.modal} .slider-container {
            margin-bottom: 24px;
        }

        .${CONFIG.classes.modal} .slider-label {
            display: block;
            margin-bottom: 8px;
            font-size: 15px;
            font-weight: 500;
        }

        .${CONFIG.classes.modal} .slider-wrapper {
            display: flex;
            align-items: center;
            gap: 16px;
        }

        .${CONFIG.classes.modal} .slider {
            flex: 1;
            height: 6px;
            -webkit-appearance: none;
            appearance: none;
            background: #e2e8f0;
            outline: none;
            border-radius: 3px;
            cursor: pointer;
        }

        .${CONFIG.classes.modal} .slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: #4CAF50;
            cursor: pointer;
            transition: all 0.2s;
        }

        .${CONFIG.classes.modal} .slider::-moz-range-thumb {
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: #4CAF50;
            cursor: pointer;
            border: none;
            transition: all 0.2s;
        }

        .${CONFIG.classes.modal} .slider-value {
            min-width: 45px;
            text-align: center;
            font-size: 14px;
            font-weight: 600;
            color: #4CAF50;
        }

        .${CONFIG.classes.modal} .buttons {
            display: flex;
            justify-content: flex-end;
            gap: 12px;
            margin-top: 16px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
        }

        .${CONFIG.classes.modal} button {
            padding: 10px 20px;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
        }

        .${CONFIG.classes.modal} .cancel-btn {
            background: #f7fafc;
            color: #4a5568;
            border: 1px solid #e2e8f0;
        }

        .${CONFIG.classes.modal} .cancel-btn:hover {
            background: #edf2f7;
        }

        .${CONFIG.classes.modal} .save-btn {
            background: #4CAF50;
            color: white;
            border: none;
            font-weight: 600;
        }

        .${CONFIG.classes.modal} .save-btn:hover {
            background: #45a049;
            transform: translateY(-1px);
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        @keyframes scaleIn {
            from { transform: scale(0.95); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
        }
    `);

    // Утилиты
    const Utils = {
        debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        },

        async copyToClipboard(text) {
            try {
                await navigator.clipboard.writeText(text);
                return true;
            } catch (err) {
                // Fallback для старых браузеров
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.opacity = '0';
                document.body.appendChild(textArea);
                textArea.select();

                try {
                    const successful = document.execCommand('copy');
                    document.body.removeChild(textArea);
                    return successful;
                } catch (fallbackErr) {
                    document.body.removeChild(textArea);
                    return false;
                }
            }
        }
    };

    // Менеджер настроек
    const SettingsManager = {
        load() {
            const savedSettings = GM_getValue('settings');
            return savedSettings ? {...CONFIG.defaultSettings, ...savedSettings} : {...CONFIG.defaultSettings};
        },

        save(settings) {
            GM_setValue('settings', settings);
        },

        processTags(tags, settings) {
            let processedTags = tags;

            if (settings.escapeBrackets) {
                processedTags = processedTags.replace(/\(/g, '\\(').replace(/\)/g, '\\)');
            }

            if (settings.addCommas) {
                processedTags = processedTags.split(' ').filter(tag => tag.trim() !== '').join(', ');
            }

            return processedTags;
        }
    };

    // Модальное окно настроек
    class SettingsModal {
        constructor() {
            this.settings = SettingsManager.load();
            this.modal = null;
            this.overlay = null;
        }

        create() {
            this.overlay = document.createElement('div');
            this.overlay.className = CONFIG.classes.overlay;

            this.modal = document.createElement('div');
            this.modal.className = CONFIG.classes.modal;

            this.modal.innerHTML = this.getModalHTML();
            this.bindEvents();

            this.overlay.appendChild(this.modal);
            document.body.appendChild(this.overlay);

            // Добавляем обработчик для закрытия по ESC
            this.escHandler = (e) => {
                if (e.key === 'Escape') this.close();
            };
            document.addEventListener('keydown', this.escHandler);
        }

        getModalHTML() {
            return `
                <h3>Настройки копирования тегов</h3>

                <div class="setting-item">
                    <label class="setting-label">
                        <input type="checkbox" class="checkbox" id="add-commas" ${this.settings.addCommas ? 'checked' : ''}>
                        Добавлять запятые между тегами
                    </label>
                </div>

                <div class="setting-item">
                    <label class="setting-label">
                        <input type="checkbox" class="checkbox" id="escape-brackets" ${this.settings.escapeBrackets ? 'checked' : ''}>
                        Экранировать скобки
                    </label>
                </div>

                <div class="slider-container">
                    <label class="slider-label">Размер кнопки</label>
                    <div class="slider-wrapper">
                        <input type="range" min="100" max="200" step="10" value="${this.settings.buttonSize}" class="slider" id="button-size">
                        <span class="slider-value" id="size-value">${this.settings.buttonSize}%</span>
                    </div>
                </div>

                <div class="buttons">
                    <button class="cancel-btn">Отмена</button>
                    <button class="save-btn">Сохранить</button>
                </div>
            `;
        }

        bindEvents() {
            const slider = this.modal.querySelector('#button-size');
            const valueDisplay = this.modal.querySelector('#size-value');

            // Обновление значения ползунка
            slider.addEventListener('input', Utils.debounce(() => {
                valueDisplay.textContent = `${slider.value}%`;
            }, 50));

            // Кнопки действий
            this.modal.querySelector('.cancel-btn').addEventListener('click', () => this.close());
            this.modal.querySelector('.save-btn').addEventListener('click', () => this.saveSettings());

            // Закрытие по клику на оверлей
            this.overlay.addEventListener('click', (e) => {
                if (e.target === this.overlay) this.close();
            });
        }

        saveSettings() {
            const newSettings = {
                addCommas: this.modal.querySelector('#add-commas').checked,
                escapeBrackets: this.modal.querySelector('#escape-brackets').checked,
                buttonSize: parseInt(this.modal.querySelector('#button-size').value, 10)
            };

            SettingsManager.save(newSettings);
            this.close();

            // Перезагружаем страницу для применения изменений
            window.location.reload();
        }

        close() {
            if (this.overlay && this.modal) {
                document.body.removeChild(this.overlay);
                document.removeEventListener('keydown', this.escHandler);
            }
        }
    }

    // Класс для кнопки копирования
    class CopyButton {
        constructor(imgElement) {
            this.img = imgElement;
            this.button = null;
            this.settings = SettingsManager.load();
            this.create();
        }

        create() {
            this.button = document.createElement('button');
            this.button.className = CONFIG.classes.copyButton;
            this.button.innerHTML = ICONS.copy;
            this.button.title = "Копировать теги";

            // Применяем настройку размера
            const buttonSize = this.settings.buttonSize / 100;
            this.button.style.transform = `scale(${buttonSize})`;

            this.bindEvents();
            return this.button;
        }

        bindEvents() {
            this.button.addEventListener('click', async (e) => {
                e.stopPropagation();
                e.preventDefault();

                const processedTags = SettingsManager.processTags(this.img.alt, this.settings);
                const success = await Utils.copyToClipboard(processedTags);

                if (success) {
                    this.showSuccess();
                }
            });
        }

        showSuccess() {
            this.button.innerHTML = ICONS.check;
            this.button.classList.add('success');

            setTimeout(() => {
                this.button.innerHTML = ICONS.copy;
                this.button.classList.remove('success');
            }, this.settings.animationDuration);
        }
    }

    // Основной класс приложения
    class SafebooruTagsHauler {
        constructor() {
            this.settings = SettingsManager.load();
            this.init();
        }

        init() {
            this.registerMenuCommand();
            this.processImages();
            this.addGlobalStyles();
        }

        registerMenuCommand() {
            GM_registerMenuCommand('Настройки копирования тегов', () => {
                const modal = new SettingsModal();
                modal.create();
            }, 's');
        }

        processImages() {
            const images = document.querySelectorAll(CONFIG.selectors.images);

            images.forEach(img => {
                const container = img.closest(CONFIG.selectors.imageContainer);
                if (!container) return;

                container.style.position = 'relative';
                container.style.display = 'inline-block';

                const copyButton = new CopyButton(img).button;
                container.appendChild(copyButton);

                this.addHoverEffects(container, copyButton);
            });
        }

        addHoverEffects(container, button) {
            container.addEventListener('mouseenter', () => {
                button.style.opacity = '1';
            });

            container.addEventListener('mouseleave', () => {
                // Не скрываем кнопку, если она в состоянии успеха
                if (!button.classList.contains('success')) {
                    button.style.opacity = '0';
                }
            });
        }

        addGlobalStyles() {
            // Добавляем стили для предотвращения всплытия событий
            GM_addStyle(`
                .${CONFIG.classes.copyButton} {
                    pointer-events: auto;
                }

                .${CONFIG.selectors.imageContainer}:hover .${CONFIG.classes.copyButton} {
                    opacity: 1 !important;
                }
            `);
        }
    }

    // Инициализация приложения после загрузки DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => new SafebooruTagsHauler());
    } else {
        new SafebooruTagsHauler();
    }
})();