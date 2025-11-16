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

        const style = document.createElement('style');
        style.id = 'cf-utility-rounded-styles';

        // Default CSS for rounded corners
        const css = `
            .rounded {
                border-radius: 6px !important;
            }

            .rounded-md {
                border-radius: 8px !important;
            }

            .rounded-lg {
                border-radius: 10px !important;
            }

            .rounded-sm {
                border-radius: 4px !important;
            }

            .rounded-circle {
                border-radius: 50% !important;
            }
        `;

        style.appendChild(document.createTextNode(css));
        (document.head || document.documentElement).appendChild(style);
    }

    // Target elements configuration - specify selectors for elements that should have rounded corners
    // Format: ['selector', 'cornerClass']
    const targetElements = [
        ['button', 'rounded-sm']
        // Add more selectors as needed
    ];

    // Apply rounded corners to target elements based on configuration
    async function applyRoundedCornersToTargets() {
        if (!(await isRoundedCornersEnabled())) {
            return;
        }

        targetElements.forEach(([selector, cornerClass]) => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                if (!el.classList.contains(cornerClass)) {
                    el.classList.add(cornerClass);
                }
            });
        });
    }

    // Apply rounded corners to existing elements that already have rounded classes
    function applyRoundedCorners() {
        // Apply to elements with rounded-corner class
        const elementsToRound = document.querySelectorAll('.rounded, .rounded-md, .rounded-lg, .rounded-sm, .rounded-circle');
        elementsToRound.forEach(el => {
            // Already handled by CSS, but we can add additional processing if needed
        });
    }

    // Initialize the rounded corners functionality
    async function initRoundedCorners() {
        if (await isRoundedCornersEnabled()) {
            await injectRoundedStyles();
            applyRoundedCorners();
            await applyRoundedCornersToTargets();
        }
    }

    // Handle dynamic content using MutationObserver
    function setupMutationObserver() {
        const observer = new MutationObserver(async function(mutations) {
            let shouldUpdate = false;
            let shouldApplyTargets = false;

            mutations.forEach(function(mutation) {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(function(node) {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            // Check if the added node or its children have rounded classes
                            if (node.classList &&
                                (node.classList.contains('rounded') ||
                                 node.classList.contains('rounded-md') ||
                                 node.classList.contains('rounded-lg') ||
                                 node.classList.contains('rounded-sm') ||
                                 node.classList.contains('rounded-circle'))) {
                                shouldUpdate = true;
                            }

                            // Check if the added node matches any target selectors
                            targetElements.forEach(([selector, cornerClass]) => {
                                if (node.matches && node.matches(selector)) {
                                    shouldApplyTargets = true;
                                }
                            });

                            // Also check any children of the added node
                            const roundedChildren = node.querySelectorAll && node.querySelectorAll(
                                '.rounded, .rounded-md, .rounded-lg, .rounded-sm, .rounded-circle'
                            );
                            if (roundedChildren && roundedChildren.length > 0) {
                                shouldUpdate = true;
                            }

                            // Check children for target selectors
                            targetElements.forEach(([selector, cornerClass]) => {
                                const matchingChildren = node.querySelectorAll && node.querySelectorAll(selector);
                                if (matchingChildren && matchingChildren.length > 0) {
                                    shouldApplyTargets = true;
                                }
                            });
                        }
                    });
                }
            });

            if (shouldUpdate && await isRoundedCornersEnabled()) {
                // Apply rounded corners to any new elements that match
                setTimeout(applyRoundedCorners, 0); // Use setTimeout to ensure DOM is fully updated
            }

            if (shouldApplyTargets && await isRoundedCornersEnabled()) {
                // Apply target rounded corners to matching elements
                setTimeout(async () => {
                    await applyRoundedCornersToTargets();
                }, 0);
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
        (async () => {
            await initRoundedCorners();
            if (await isRoundedCornersEnabled()) {
                setupMutationObserver();
            }
        })();
    }

})();