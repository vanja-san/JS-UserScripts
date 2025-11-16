// ==UserScript==
// @name         CF Utility - Rounded Corners Module
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Module for adding rounded corners to elements
// @author       You
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // Wait for both the settings and localization modules to be available
    function waitForModules() {
        return new Promise((resolve) => {
            const checkModules = () => {
                if (window.cfUtilitySettings && window.cfUtilityLocalization) {
                    resolve({
                        settings: window.cfUtilitySettings,
                        localization: window.cfUtilityLocalization
                    });
                } else {
                    setTimeout(checkModules, 100);
                }
            };
            checkModules();
        });
    }

    // Check if rounded corners are enabled in settings
    async function isRoundedCornersEnabled() {
        try {
            const modules = await waitForModules();
            const settings = modules.settings.getSettings();
            return settings.roundedCornersEnabled !== false; // Default to true if not set
        } catch (error) {
            // If there's an error accessing settings, default to enabled
            return true;
        }
    }

    // Create and inject the CSS for rounded corners
    async function injectRoundedStyles() {
        if (!(await isRoundedCornersEnabled())) {
            return; // Don't inject styles if rounded corners are disabled
        }

        const modules = await waitForModules();
        const currentLang = modules.localization.getPreferredLanguage();

        const style = document.createElement('style');
        style.type = 'text/css';
        style.id = 'cf-utility-rounded-styles';

        // Default CSS for rounded corners
        let css = `
            .rounded-corner {
                border-radius: 10px !important;
            }

            .rounded-corner-medium {
                border-radius: 15px !important;
            }

            .rounded-corner-large {
                border-radius: 20px !important;
            }

            .rounded-corner-small {
                border-radius: 5px !important;
            }

            .rounded-circle {
                border-radius: 50% !important;
            }
        `;

        // Add any language-specific styles if needed
        if (currentLang === 'ru') {
            // Add Russian-specific styles if needed
            css += `
                /* Russian language specific rounded styles if needed */
            `;
        }

        style.appendChild(document.createTextNode(css));
        (document.head || document.documentElement).appendChild(style);
    }

    // Apply rounded corners to existing elements
    function applyRoundedCorners() {
        // Apply to elements with rounded-corner class
        const elementsToRound = document.querySelectorAll('.rounded-corner, .rounded-corner-medium, .rounded-corner-large, .rounded-corner-small, .rounded-circle');
        elementsToRound.forEach(el => {
            // Already handled by CSS, but we can add additional processing if needed
        });
    }

    // Initialize the rounded corners functionality
    async function initRoundedCorners() {
        if (await isRoundedCornersEnabled()) {
            await injectRoundedStyles();
            applyRoundedCorners();
        }
    }

    // Handle dynamic content using MutationObserver
    function setupMutationObserver() {
        const observer = new MutationObserver(function(mutations) {
            let shouldUpdate = false;

            mutations.forEach(function(mutation) {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(function(node) {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            // Check if the added node or its children have rounded classes
                            if (node.classList &&
                                (node.classList.contains('rounded-corner') ||
                                 node.classList.contains('rounded-corner-medium') ||
                                 node.classList.contains('rounded-corner-large') ||
                                 node.classList.contains('rounded-corner-small') ||
                                 node.classList.contains('rounded-circle'))) {
                                shouldUpdate = true;
                            }

                            // Also check any children of the added node
                            const roundedChildren = node.querySelectorAll && node.querySelectorAll(
                                '.rounded-corner, .rounded-corner-medium, .rounded-corner-large, .rounded-corner-small, .rounded-circle'
                            );
                            if (roundedChildren && roundedChildren.length > 0) {
                                shouldUpdate = true;
                            }
                        }
                    });
                }
            });

            if (shouldUpdate && isRoundedCornersEnabled()) {
                // Apply rounded corners to any new elements that match
                setTimeout(applyRoundedCorners, 0); // Use setTimeout to ensure DOM is fully updated
            }
        });

        // Start observing
        observer.observe(document, {
            childList: true,
            subtree: true
        });

        return observer;
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', async function() {
            await initRoundedCorners();
            if (await isRoundedCornersEnabled()) {
                setupMutationObserver();
            }
        });
    } else {
        initRoundedCorners();
        if (await isRoundedCornersEnabled()) {
            setupMutationObserver();
        }
    }

})();