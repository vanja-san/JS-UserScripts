/**
 * CF Utility Notifications Module
 * Provides notification UI for CF Utility
 */

(function() {
    'use strict';

    // Create notification container
    const createNotificationContainer = () => {
        const container = document.createElement('div');
        container.id = 'cfutility-notifications';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 100000;
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 10px;
            max-width: 300px;
            width: 100%;
        `;
        document.body.appendChild(container);
        return container;
    };

    // Get or create notification container
    const getNotificationContainer = () => {
        let container = document.getElementById('cfutility-notifications');
        if (!container) {
            container = createNotificationContainer();
        }
        return container;
    };

    // Notification types configuration
    const notificationStyles = {
        success: {
            backgroundColor: '#4CAF50',
            color: 'white'
        },
        error: {
            backgroundColor: '#f44336',
            color: 'white'
        },
        warning: {
            backgroundColor: '#ff9800',
            color: 'white'
        },
        info: {
            backgroundColor: '#2196F3',
            color: 'white'
        }
    };

    // Create notification element
    const createNotification = (message, type = 'info', duration = 5000) => {
        const notification = document.createElement('div');
        notification.className = 'cfutility-notification';
        notification.style.cssText = `
            padding: 12px 16px;
            border-radius: 4px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            font-family: Arial, sans-serif;
            font-size: 14px;
            line-height: 1.4;
            opacity: 0;
            transform: translateX(100%);
            transition: opacity 0.3s ease, transform 0.3s ease;
            max-width: 100%;
            word-wrap: break-word;
            ${notificationStyles[type]?.backgroundColor ? `background-color: ${notificationStyles[type].backgroundColor};` : ''}
            ${notificationStyles[type]?.color ? `color: ${notificationStyles[type].color};` : ''}
        `;
        
        notification.textContent = message;
        
        // Add close button
        const closeButton = document.createElement('span');
        closeButton.textContent = '×';
        closeButton.style.cssText = `
            float: right;
            cursor: pointer;
            font-size: 20px;
            font-weight: bold;
            line-height: 1;
            margin-left: 10px;
        `;
        closeButton.addEventListener('click', () => {
            closeNotification(notification);
        });
        
        notification.insertBefore(closeButton, notification.firstChild);
        
        return notification;
    };

    // Show notification
    const showNotification = (message, type = 'info', duration = 5000) => {
        const container = getNotificationContainer();
        const notification = createNotification(message, type, duration);
        
        container.appendChild(notification);
        
        // Trigger animation
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(0)';
        }, 10);
        
        // Auto-remove after duration
        if (duration > 0) {
            setTimeout(() => {
                closeNotification(notification);
            }, duration);
        }
        
        return notification;
    };

    // Close notification
    const closeNotification = (notification) => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    };

    // Expose functions globally
    window.cfUtilityNotifications = {
        showNotification,
        success: (message, duration) => showNotification(message, 'success', duration),
        error: (message, duration) => showNotification(message, 'error', duration),
        warning: (message, duration) => showNotification(message, 'warning', duration),
        info: (message, duration) => showNotification(message, 'info', duration)
    };

})();