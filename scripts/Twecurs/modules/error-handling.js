/**
 * CF Utility Error Handling Module
 * Provides error handling and logging utilities for CF Utility
 */

(function() {
    'use strict';

    // Error levels
    const ERROR_LEVELS = {
        DEBUG: 0,
        INFO: 1,
        WARN: 2,
        ERROR: 3
    };

    // Current log level (can be set via settings)
    let currentLogLevel = ERROR_LEVELS.WARN;

    // Set log level
    const setLogLevel = (level) => {
        if (Object.values(ERROR_LEVELS).includes(level)) {
            currentLogLevel = level;
        }
    };

    // Format log message
    const formatLogMessage = (level, message, context = {}) => {
        const timestamp = new Date().toISOString();
        const formattedMessage = `[CF Utility] [${level}] ${message}`;
        
        if (Object.keys(context).length > 0) {
            return `${formattedMessage} | Context: ${JSON.stringify(context)}`;
        }
        
        return formattedMessage;
    };

    // Log message if level is appropriate
    const logMessage = (level, levelNum, message, context = {}) => {
        if (levelNum >= currentLogLevel) {
            const formattedMessage = formatLogMessage(level, message, context);
            
            switch (levelNum) {
                case ERROR_LEVELS.ERROR:
                    console.error(formattedMessage);
                    break;
                case ERROR_LEVELS.WARN:
                    console.warn(formattedMessage);
                    break;
                case ERROR_LEVELS.INFO:
                    console.info(formattedMessage);
                    break;
                case ERROR_LEVELS.DEBUG:
                    console.debug(formattedMessage);
                    break;
                default:
                    console.log(formattedMessage);
            }
        }
    };

    // Error handler with optional fallback
    const handleAndReportError = (error, context = {}, fallbackMessage = null) => {
        const errorMessage = fallbackMessage || error.message || 'An unknown error occurred';
        const errorContext = {
            ...context,
            errorName: error.name,
            stack: error.stack,
            timestamp: new Date().toISOString()
        };

        logMessage('ERROR', ERROR_LEVELS.ERROR, errorMessage, errorContext);

        // Return error info for potential UI display
        return {
            message: errorMessage,
            context: errorContext,
            handled: true
        };
    };

    // Safe execution wrapper
    const safeExecute = (fn, context = {}, fallbackValue = null) => {
        try {
            return fn();
        } catch (error) {
            handleAndReportError(error, context, `Error in safeExecute: ${fn.name || 'anonymous function'}`);
            return fallbackValue;
        }
    };

    // Public API
    window.cfUtilityErrorHandling = {
        ERROR_LEVELS,
        setLogLevel,
        logMessage,
        handleAndReportError,
        safeExecute,
        debug: (message, context) => logMessage('DEBUG', ERROR_LEVELS.DEBUG, message, context),
        info: (message, context) => logMessage('INFO', ERROR_LEVELS.INFO, message, context),
        warn: (message, context) => logMessage('WARN', ERROR_LEVELS.WARN, message, context),
        error: (message, context) => logMessage('ERROR', ERROR_LEVELS.ERROR, message, context)
    };

})();