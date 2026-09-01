/**
 * CF Utility Direct Download Module
 * Handles direct download functionality for CurseForge based on proven implementation
 */

(function() {
    'use strict';

    // Function to observe elements and apply callback to both existing and new elements
    const observeSelector = (selector, callback) => {
        // Apply to existing elements
        for (const el of document.querySelectorAll(selector)) {
            if (!el.classList.contains('cfutility-intercepted')) {
                callback(el);
            }
        }

        // Apply to new elements added to the DOM
        new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType !== Node.ELEMENT_NODE) {
                        continue;
                    }
                    if (node.matches?.(selector) && !node.classList.contains('cfutility-intercepted')) {
                        callback(node);
                    }
                    for (const el of node.querySelectorAll(selector)) {
                        if (!el.classList.contains('cfutility-intercepted')) {
                            callback(el);
                        }
                    }
                }
            }
        }).observe(document, { childList: true, subtree: true });
    };

    // Function to get direct download URL by extracting project ID from page content
    const getDirectDownloadUrlFromContent = async (href) => {
        try {
            const response = await fetch(href);
            const content = await response.text();

            // Extract project ID from page content using regex
            // Look for patterns like: \"project\":{\"id\":(\d+) or projectId: "12345"
            const projectIdMatch = content.match(/\\?"project\\?":\{\\?"id\\?":(\d+)/);
            if (!projectIdMatch) {
                // Alternative patterns that might be present
                const altProjectIdMatch = content.match(/projectId["']?\s*:\s*["']?(\d+)/);
                if (!altProjectIdMatch) {
                    window.cfUtilityErrorHandling?.warn('Could not extract project ID from page content', { href });
                    return href; // Return original URL if can't extract project ID
                }
                const projectId = altProjectIdMatch[1];
                const fileIdMatch = href.match(/\/download\/(\d+)/);

                if (!fileIdMatch) {
                    window.cfUtilityErrorHandling?.warn('Could not extract file ID from URL', { href });
                    return href; // Return original URL if can't extract file ID
                }

                const fileId = fileIdMatch[1];

                // Build the direct download URL
                return `${window.location.origin}/api/v1/mods/${projectId}/files/${fileId}/download`;
            }

            const projectId = projectIdMatch[1];
            const fileIdMatch = href.match(/\/download\/(\d+)/);

            if (!fileIdMatch) {
                window.cfUtilityErrorHandling?.warn('Could not extract file ID from URL', { href });
                return href; // Return original URL if can't extract file ID
            }

            const fileId = fileIdMatch[1];

            // Build the direct download URL
            return `${window.location.origin}/api/v1/mods/${projectId}/files/${fileId}/download`;
        } catch (e) {
            window.cfUtilityErrorHandling?.error('Error fetching page content to extract project ID', {
                href,
                error: e.message,
                stack: e.stack
            });
            return href; // Return original URL on error
        }
    };

    // Function to handle direct download with improved error handling
    const handleDirectDownload = async (href) => {
        try {
            if (window.cfUtilitySettings?.getSettings) {
                const settings = window.cfUtilitySettings.getSettings();
                if (!settings.downloadEnabled) {
                    // If disabled, allow normal navigation and show localized message if possible
                    if (window.cfUtilityLocalization) {
                        const message = window.cfUtilityLocalization.getText('directDownloadsDisabled');
                        if (window.cfUtilityNotifications) {
                            window.cfUtilityNotifications.warning(message);
                        } else {
                            alert(message);
                        }
                    }
                    window.location.href = href;
                    return;
                }
            }

            const directUrl = await getDirectDownloadUrlFromContent(href);
            window.location.href = directUrl;
        } catch (error) {
            window.cfUtilityErrorHandling?.error('Error in handleDirectDownload', {
                href,
                error: error.message,
                stack: error.stack
            });
            // Fallback to original URL if there's an error
            window.location.href = href;
        }
    };

    // Function to process download links (public API)
    const processDownloadLinks = () => {
        try {
            if (window.cfUtilitySettings?.getSettings) {
                const settings = window.cfUtilitySettings.getSettings();
                if (!settings.downloadEnabled) {
                    // If download feature is disabled, don't initialize
                    return;
                }
            }

            // Observe and handle download buttons with unique class to prevent double handling
            observeSelector('.download-cta', el => {
                if (!el.classList.contains('cfutility-intercepted')) {
                    el.classList.add('cfutility-intercepted');
                    el.addEventListener("click", e => {
                        e.preventDefault();
                        handleDirectDownload(el.href);
                    });
                }
            });

            observeSelector('.kebab-menu a', el => {
                if (!el.href.includes("/download/")) return;
                if (!el.classList.contains('cfutility-intercepted')) {
                    el.classList.add('cfutility-intercepted');
                    el.addEventListener("click", e => {
                        e.preventDefault();
                        handleDirectDownload(el.href);
                    });
                }
            });

            observeSelector('.project-download-modal .download-btn', el => {
                if (!el.classList.contains('cfutility-intercepted')) {
                    el.classList.add('cfutility-intercepted');
                    el.addEventListener("click", e => {
                        e.preventDefault();
                        handleDirectDownload(el.href);
                    });
                }
            });

            observeSelector('.download-button', el => {
                if (!el.classList.contains('cfutility-intercepted')) {
                    el.classList.add('cfutility-intercepted');
                    el.addEventListener("click", e => {
                        e.preventDefault();
                        handleDirectDownload(el.href);
                    });
                }
            });

            // Also handle general download links that match the pattern
            observeSelector("a", el => {
                if (!el.href.match(/\/download($|\/)/) || el.href.includes("?client=y")) return;
                if (!el.classList.contains('cfutility-intercepted')) {
                    el.classList.add('cfutility-intercepted');
                    el.addEventListener("click", e => {
                        e.preventDefault();
                        handleDirectDownload(el.href);
                    });
                }
            });
        } catch (error) {
            window.cfUtilityErrorHandling?.error('Error initializing download module', {
                error: error.message,
                stack: error.stack
            });
        }
    };

    // Initialize the module when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', processDownloadLinks);
    } else {
        processDownloadLinks();
    }

    // Expose functions globally so they can be used by the main script
    window.cfUtilityDirectDL = {
        handleDirectDownload,
        getDirectDownloadUrlFromContent,
        processDownloadLinks
    };
})();