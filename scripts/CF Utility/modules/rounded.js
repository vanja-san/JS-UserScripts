(function () {
    'use strict';

    // Check if rounded corners are enabled in settings
    const isRoundedCornersEnabled = () => {
        try {
            return window.cfUtilitySettings?.getSettings?.()?.roundedCornersEnabled !== false; // Default to true if not set
        } catch (error) {
            // If there's an error accessing settings, default to enabled
            return true;
        }
    };

    // Create and inject the CSS for rounded corners
    const injectRoundedStyles = () => {
        if (!isRoundedCornersEnabled()) return; // Don't inject styles if rounded corners are disabled

        const style = document.createElement('style');
        style.id = 'cf-utility-rounded-styles';

        // Default CSS for rounded corners
        const css = `
            .rounded-corner {
                border-radius: 10px !important;
            }

            .rounded-corner-small {
                border-radius: 4px !important;
            }

            .rounded-corner-medium {
                border-radius: 6px !important;
            }

            .rounded-corner-large {
                border-radius: 8px !important;
            }

            .rounded-circle {
                border-radius: 50% !important;
            }
        `;

        style.textContent = css;
        (document.head || document.documentElement).appendChild(style);
    };

    // Target elements configuration - specify corner type and selectors for elements that should have rounded corners
    // Format: ['cornerClass', ['selector1', 'selector2', ...]]
    const targetElements = [
        ['rounded-corner-small', [
            'button',
            '.btn-cta',
            '.btn-secondary',
            '.btn-primary',
            '.download-button',
            '.download-btn',
            'input',
            '.file-card',
            '.related-project-card',
            '.class-category-item',
            '.dropdown-selected-item',
            '.dropdown-list-wrapper',
            'img',
            'ul.menu'
        ]],
        ['rounded-corner-medium', [
            '.project-tile > .tile',
            '.project-card',
            '.author',
            '.sub-nav-inner',
            '.discovery-carousel-slide',
            '.dropdown-actions-content',
            '.project-download-modal'
        ]]
    ];

    // Apply rounded corners to target elements based on configuration
    const applyRoundedCornersToTargets = () => {
        if (!isRoundedCornersEnabled()) return;

        targetElements.forEach(([cornerClass, selectors]) => {
            selectors.forEach(selector => {
                // Check if selector is a simple class selector (e.g., ".project-tile") for whitespace handling
                if (/^\.[\w-]+$/.test(selector)) { // Matches simple class selectors like .class-name
                    const targetClassName = selector.substring(1).trim();
                    // Find all elements and manually check for the class to handle whitespace issues
                    const allElements = Array.from(document.querySelectorAll('*'));
                    const elements = allElements.filter(el => {
                        const classList = el.getAttribute('class');
                        if (classList) {
                            // Split by any whitespace and check if our target class is present
                            const classes = classList.split(/\s+/);
                            return classes.includes(targetClassName);
                        }
                        return false;
                    });
                    elements.forEach(el => {
                        // Add class only if it's not already present
                        if (!el.classList.contains(cornerClass)) {
                            el.classList.add(cornerClass);
                        }
                    });
                } else {
                    // For complex selectors (like .class > .class-inner, #id, etc.), use standard querySelectorAll
                    try {
                        const elements = document.querySelectorAll(selector);
                        elements.forEach(el => {
                            // Add class only if it's not already present
                            if (!el.classList.contains(cornerClass)) {
                                el.classList.add(cornerClass);
                            }
                        });
                    } catch (e) {
                        // If selector is invalid, skip it
                        console.warn(`Invalid CSS selector: ${selector}`, e);
                    }
                }
            });
        });
    };

    // Apply rounded corners to existing elements that already have rounded classes
    const applyRoundedCorners = () => {
        // Apply to elements with rounded-corner class
        const elementsToRound = document.querySelectorAll('.rounded-corner, .rounded-corner-medium, .rounded-corner-large, .rounded-corner-small, .rounded-circle');
        elementsToRound.forEach(el => {
            // Already handled by CSS, but we can add additional processing if needed
        });
    };

    // Initialize the rounded corners functionality
    const initRoundedCorners = () => {
        if (isRoundedCornersEnabled()) {
            injectRoundedStyles();
            applyRoundedCorners();
            applyRoundedCornersToTargets();
        }
    };

    // Handle dynamic content using MutationObserver
    const setupMutationObserver = () => {
        const observer = new MutationObserver(mutations => {
            let shouldUpdate = false;
            let shouldApplyTargets = false;

            mutations.forEach(mutation => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            // Check if the added node or its children have rounded classes
                            if (node.classList) {
                                const roundedClasses = ['rounded-corner', 'rounded-corner-medium', 'rounded-corner-large', 'rounded-corner-small', 'rounded-circle'];
                                shouldUpdate = roundedClasses.some(roundedClass => node.classList.contains(roundedClass));
                            }

                            // Check if the added node matches any target selectors
                            targetElements.forEach(([cornerClass, selectors]) => {
                                selectors.forEach(selector => {
                                    // Check if selector is a simple class selector for whitespace handling
                                    if (/^\.[\w-]+$/.test(selector)) { // Matches simple class selectors like .class-name
                                        const targetClassName = selector.substring(1).trim();
                                        const classList = node.getAttribute('class');
                                        if (classList) {
                                            const classes = classList.split(/\s+/);
                                            if (classes.includes(targetClassName)) {
                                                shouldApplyTargets = true;
                                            }
                                        }
                                    } else {
                                        // For complex selectors, use standard matches
                                        try {
                                            if (node.matches?.(selector)) {
                                                shouldApplyTargets = true;
                                            }
                                        } catch (e) {
                                            // If selector is invalid, skip it
                                            console.warn(`Invalid CSS selector: ${selector}`, e);
                                        }
                                    }
                                });
                            });

                            // Also check any children of the added node
                            const roundedChildren = node.querySelectorAll?.('.rounded-corner, .rounded-corner-medium, .rounded-corner-large, .rounded-corner-small, .rounded-circle');
                            if (roundedChildren?.length > 0) {
                                shouldUpdate = true;
                            }

                            // Check children for target selectors
                            targetElements.forEach(([cornerClass, selectors]) => {
                                selectors.forEach(selector => {
                                    if (/^\.[\w-]+$/.test(selector)) {
                                        // For simple class selectors, check manually to handle whitespace issues
                                        const targetClassName = selector.substring(1).trim();
                                        const matchingChildren = node.querySelectorAll?.('*');
                                        if (matchingChildren) {
                                            for (const child of matchingChildren) {
                                                const classList = child.getAttribute('class');
                                                if (classList) {
                                                    const classes = classList.split(/\s+/);
                                                    if (classes.includes(targetClassName)) {
                                                        shouldApplyTargets = true;
                                                        break;
                                                    }
                                                }
                                            }
                                        }
                                    } else {
                                        // For complex selectors, use standard querySelectorAll
                                        try {
                                            const matchingChildren = node.querySelectorAll?.(selector);
                                            if (matchingChildren?.length > 0) {
                                                shouldApplyTargets = true;
                                            }
                                        } catch (e) {
                                            // If selector is invalid, skip it
                                            console.warn(`Invalid CSS selector: ${selector}`, e);
                                        }
                                    }
                                });
                            });
                        }
                    });
                } else if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    // Check if an existing element's class attribute has changed
                    const targetElement = mutation.target;
                    targetElements.forEach(([cornerClass, selectors]) => {
                        selectors.forEach(selector => {
                            if (/^\.[\w-]+$/.test(selector)) {
                                // For simple class selectors, check manually to handle whitespace issues
                                const targetClassName = selector.substring(1).trim();
                                const classList = targetElement.getAttribute('class');
                                if (classList) {
                                    const classes = classList.split(/\s+/);
                                    if (classes.includes(targetClassName) && !targetElement.classList.contains(cornerClass)) {
                                        // If the target class is present but our corner class is not, add it back
                                        setTimeout(() => {
                                            if (targetElement && !targetElement.classList.contains(cornerClass)) {
                                                targetElement.classList.add(cornerClass);
                                            }
                                        }, 0);
                                    }
                                }
                            } else {
                                // For complex selectors, check with matches
                                try {
                                    if (targetElement.matches?.(selector) && !targetElement.classList.contains(cornerClass)) {
                                        setTimeout(() => {
                                            if (targetElement && !targetElement.classList.contains(cornerClass)) {
                                                targetElement.classList.add(cornerClass);
                                            }
                                        }, 0);
                                    }
                                } catch (e) {
                                    // If selector is invalid, skip it
                                    console.warn(`Invalid CSS selector: ${selector}`, e);
                                }
                            }
                        });
                    });
                }
            });

            if (shouldUpdate && isRoundedCornersEnabled()) {
                // Apply rounded corners to any new elements that match
                setTimeout(applyRoundedCorners, 0); // Use setTimeout to ensure DOM is fully updated
            }

            if (shouldApplyTargets && isRoundedCornersEnabled()) {
                // Apply target rounded corners to matching elements
                setTimeout(applyRoundedCornersToTargets, 0);
            }
        });

        // Start observing
        observer.observe(document, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class']
        });

        return observer;
    };

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            initRoundedCorners();
            if (isRoundedCornersEnabled()) {
                setupMutationObserver();
            }
        });
    } else {
        initRoundedCorners();
        if (isRoundedCornersEnabled()) {
            setupMutationObserver();
        }
    }

    // Periodically check and restore rounded corner classes in case they were removed by site scripts
    setInterval(() => {
        if (isRoundedCornersEnabled()) {
            applyRoundedCornersToTargets();
        }
    }, 2000); // Check every 2 seconds

})();