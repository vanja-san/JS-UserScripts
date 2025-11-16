/**
 * CF Utility Download Module
 * Handles direct download functionality for CurseForge
 */

(function() {
    'use strict';

    // Helper function to apply styles to elements
    function setStyles(element, styles) {
        Object.assign(element.style, styles);
        return element;
    }

    // Create CSS styles for the download UI
    function createDownloadStyles() {
        return `
            .cfutility-download-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.7);
                z-index: 10000;
                display: flex;
                justify-content: center;
                align-items: center;
            }

            .cfutility-download-container {
                background-color: #fff;
                padding: 20px;
                border-radius: 8px;
                width: 400px;
                max-height: 80vh;
                overflow-y: auto;
                font-family: Arial, sans-serif;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }

            @media (prefers-color-scheme: dark) {
                .cfutility-download-container {
                    background-color: #2d2d2d;
                    color: #e0e0e0;
                }
            }

            @media (prefers-color-scheme: light) {
                .cfutility-download-container {
                    background-color: #ffffff;
                    color: #000;
                }
            }

            .cfutility-download-header {
                margin-top: 0;
                margin-bottom: 15px;
            }

            .cfutility-download-content {
                margin-bottom: 15px;
            }

            .cfutility-download-progress {
                width: 100%;
                height: 20px;
                background-color: #e0e0e0;
                border-radius: 10px;
                overflow: hidden;
                margin: 10px 0;
            }

            .cfutility-download-progress-bar {
                height: 100%;
                background-color: #007cba;
                width: 0%;
                transition: width 0.3s ease;
            }

            .cfutility-download-buttons {
                display: flex;
                gap: 10px;
                justify-content: flex-end;
            }

            .cfutility-download-btn {
                padding: 8px 16px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
            }

            .cfutility-download-btn-primary {
                background-color: #007cba;
                color: white;
            }

            .cfutility-download-btn-secondary {
                background-color: #f0f0f0;
                color: #333;
            }

            @media (prefers-color-scheme: dark) {
                .cfutility-download-btn-secondary {
                    background-color: #404040;
                    color: #e0e0e0;
                }
            }
        `;
    }

    // Apply download styles
    if (typeof GM_addStyle !== 'undefined') {
        GM_addStyle(createDownloadStyles());
    }

    // Function to get direct download URL by appending '/file' to the page URL
    function getDirectDownloadUrl(projectUrl) {
        // Normalize the URL by removing trailing slashes
        let normalizedUrl = projectUrl.replace(/\/$/, '');
        
        // Check if it already ends with '/file' or contains a file ID
        if (normalizedUrl.match(/\/download$/) || normalizedUrl.match(/\/files\/\d+.*$/)) {
            // If it's already a direct download link, return as is
            return normalizedUrl;
        }
        
        // Append '/download' to get the direct download link
        return normalizedUrl + '/download';
    }

    // Function to intercept download clicks and redirect to direct download
    function interceptDownloadClicks() {
        if (window.cfUtilitySettings && window.cfUtilitySettings.getSettings) {
            const settings = window.cfUtilitySettings.getSettings();
            if (!settings.downloadEnabled) {
                // If download feature is disabled, remove any existing modifications
                return;
            }
        }

        // Select all download links that match the pattern
        const downloadLinks = document.querySelectorAll('a[href*="/download/"]');

        downloadLinks.forEach(link => {
            if (!link.classList.contains('cfutility-intercepted')) {
                // Add a class to track that we've already processed this link
                link.classList.add('cfutility-intercepted');

                // Store the original click listener
                const originalHref = link.href;

                // Modify the link to point directly to the file download
                const modifiedHref = getDirectDownloadUrl(originalHref);

                // Update the href attribute to point to the direct download
                link.href = modifiedHref;

                // Add a click event listener to handle the download
                link.addEventListener('click', function(e) {
                    if (window.cfUtilitySettings && window.cfUtilitySettings.getSettings) {
                        const settings = window.cfUtilitySettings.getSettings();
                        if (!settings.downloadEnabled) {
                            e.preventDefault();
                            alert('Direct downloads are disabled in settings.');
                            return false;
                        }
                    }

                    // Allow the download to proceed
                    // The link now points to the direct download URL
                });
            }
        });
    }

    // Function to scan and modify download links on the page
    function processDownloadLinks() {
        if (window.cfUtilitySettings && window.cfUtilitySettings.getSettings) {
            const settings = window.cfUtilitySettings.getSettings();
            if (!settings.downloadEnabled) {
                // If download feature is disabled, remove any intercept classes
                const interceptedLinks = document.querySelectorAll('.cfutility-intercepted');
                interceptedLinks.forEach(link => {
                    link.classList.remove('cfutility-intercepted');
                    // Reset original functionality if needed
                });
                return;
            }
        }

        // Intercept download clicks
        interceptDownloadClicks();
    }

    // Function to initialize the download module
    function initDownloadModule() {
        // Process download links immediately
        processDownloadLinks();
        
        // Set up a MutationObserver to handle dynamic content loading
        const observer = new MutationObserver(function(mutations) {
            let shouldProcess = false;
            
            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === 1) { // Element node
                            const hasDownloadRelatedClass = 
                                node.classList && 
                                (node.classList.contains('file') || 
                                 node.classList.contains('download') ||
                                 node.classList.contains('project-file') ||
                                 (node.tagName && 
                                  (node.tagName.toLowerCase() === 'tr' && node.classList.contains('file') ||
                                   node.querySelector && 
                                   (node.querySelector('[href*="/files/"]') || 
                                    node.querySelector('[href*="/download"]')))));
                            
                            if (hasDownloadRelatedClass) {
                                shouldProcess = true;
                                break;
                            }
                        }
                    }
                }
            }
            
            if (shouldProcess) {
                processDownloadLinks();
            }
        });

        // Start observing
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        // Also periodically check for new download links (as a fallback)
        setInterval(processDownloadLinks, 2000);
    }

    // Initialize the module when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initDownloadModule);
    } else {
        initDownloadModule();
    }

    // Expose functions globally so they can be used by the main script
    window.cfUtilityDirectDL = {
        processDownloadLinks,
        createDirectDownloadLink,
        getDirectDownloadUrl
    };

})();