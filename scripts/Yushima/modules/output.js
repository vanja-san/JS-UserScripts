/**
 * Output window management class
 */
class OutputWindow {
  static windowElement = null;
  static contentElement = null;
  static isDragging = false;
  static isResizing = false;
  static dragOffset = { x: 0, y: 0 };
  static resizeStart = { x: 0, y: 0, width: 0, height: 0 };
  static messageFilter = 'all'; // 'all', 'debug', 'error', 'info', 'success', 'warn'
  static messages = []; // Store all messages
  static lastTimeUpdateMessage = 0; // Track last time update message

  static init() {
    if (this.windowElement) return;

    const theme = getSiteTheme();
    const styles = getThemeStyles(theme);

    this.windowElement = document.createElement('div');
    this.windowElement.id = 'yushima-output-window';
    this.windowElement.innerHTML = `
      <div id="yushima-output-header" style="cursor: move; background: ${styles.headerBg}; color: ${styles.headerColor}; padding: 5px; font-size: 12px; display: flex; justify-content: space-between; align-items: center; height: 30px; flex-shrink: 0;">
        <div style="display: flex; align-items: center; gap: 5px;">
          <span>${Localization.get('outputWindowTitle')}</span>
          <select id="yushima-message-filter" style="font-size: 10px; padding: 2px; background: ${styles.settingsInputBg}; color: ${styles.settingsInputText}; border: 1px solid ${styles.settingsBorder}; border-radius: 3px;">
            <option value="all">${Localization.get('outputFilterAll')}</option>
            <option value="info">${Localization.get('outputFilterInfo')}</option>
            <option value="warn">${Localization.get('outputFilterWarnings')}</option>
            <option value="error">${Localization.get('outputFilterErrors')}</option>
            <option value="success">${Localization.get('outputFilterSuccess')}</option>
            <option value="debug">${Localization.get('outputFilterDebug')}</option>
          </select>
        </div>
        <div style="display: flex; align-items: center; gap: 5px;">
          <button id="yushima-output-clear" style="background: ${styles.buttonBg}; color: ${styles.buttonColor}; border: 1px solid ${styles.settingsBorder}; cursor: pointer; font-size: 10px; padding: 2px 5px; border-radius: 3px;">${Localization.get('outputClearButton')}</button>
          <button id="yushima-output-close" style="background: ${styles.buttonBg}; color: ${styles.buttonColor}; border: none; cursor: pointer; font-size: 16px; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">X</button>
        </div>
      </div>
      <div id="yushima-output-content" style="height: 365px; overflow-y: auto; padding: 5px; font-size: 12px; color: ${styles.contentColor}; max-height: 365px;"></div>
      <div id="yushima-output-resize" style="width: 15px; height: 15px; cursor: nwse-resize; position: absolute; bottom: 0; right: 0; background: ${styles.windowBorder}; z-index: 1;"></div>
    `;

    // Стили для окна
    Object.assign(this.windowElement.style, {
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      width: '380px',
      minHeight: '250px', // Increased to ensure buttons remain visible
      minWidth: '380px', // Fixed minimum width to 380px as requested
      maxHeight: '400px',
      zIndex: 99999,
      border: `1px solid ${styles.windowBorder}`,
      borderRadius: '5px',
      boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
      display: Settings.getSetting('showOutputWindow') ? 'block' : 'none',
      background: styles.windowBg,
      fontFamily: 'Arial, sans-serif',
      color: styles.contentColor,
      overflow: 'hidden',
      boxSizing: 'border-box',
      height: 'auto'
    });

    document.body.appendChild(this.windowElement);

    this.contentElement = document.getElementById('yushima-output-content');

    // Обработчики событий для перемещения и изменения размера
    const header = document.getElementById('yushima-output-header');
    const resizeHandle = document.getElementById('yushima-output-resize');
    const closeButton = document.getElementById('yushima-output-close');
    const clearButton = document.getElementById('yushima-output-clear');
    const filterSelect = document.getElementById('yushima-message-filter');

    // Перемещение окна
    header.addEventListener('mousedown', (e) => {
      if (e.target !== closeButton && e.target !== clearButton && e.target.tagName !== 'SELECT') {
        this.isDragging = true;
        this.dragOffset.x = e.clientX - this.windowElement.getBoundingClientRect().left;
        this.dragOffset.y = e.clientY - this.windowElement.getBoundingClientRect().top;
        e.preventDefault();
      }
    });

    // Изменение размера - теперь из правого нижнего угла
    resizeHandle.addEventListener('mousedown', (e) => {
      this.isResizing = true;
      this.resizeStart.x = e.clientX;
      this.resizeStart.y = e.clientY;
      this.resizeStart.width = parseInt(document.defaultView.getComputedStyle(this.windowElement).width);
      this.resizeStart.height = parseInt(document.defaultView.getComputedStyle(this.windowElement).height);
      e.preventDefault();
    });


    // Очистка окна
    clearButton.addEventListener('click', () => {
      this.clear();
    });

    // Фильтрация сообщений
    filterSelect.addEventListener('change', (e) => {
      this.messageFilter = e.target.value;
      this.renderMessages();
    });

    // Закрытие окна
    closeButton.addEventListener('click', () => {
      this.hide();
      Settings.setSetting('showOutputWindow', false);
    });

    // Обработчики перемещения и изменения размера
    document.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        const x = e.clientX - this.dragOffset.x;
        const y = e.clientY - this.dragOffset.y;
        this.windowElement.style.left = x + 'px';
        this.windowElement.style.top = y + 'px';
        this.windowElement.style.bottom = 'auto';
        this.windowElement.style.right = 'auto';
      } else if (this.isResizing) {
        const widthDiff = e.clientX - this.resizeStart.x;
        const heightDiff = e.clientY - this.resizeStart.y;
        const newWidth = Math.max(380, Math.min(600, this.resizeStart.width + widthDiff)); // Fixed minimum width to 380px
        const newHeight = Math.max(250, Math.min(600, this.resizeStart.height + heightDiff)); // Updated minimum height
        this.windowElement.style.width = newWidth + 'px';
        this.windowElement.style.height = newHeight + 'px';
      }
    });

    document.addEventListener('mouseup', () => {
      this.isDragging = false;
      this.isResizing = false;
    });
  }

  static show() {
    this.init();

    // Update theme when showing the window
    const theme = getSiteTheme();
    const styles = getThemeStyles(theme);

    // Apply theme styles
    this.windowElement.style.background = styles.windowBg;
    this.windowElement.style.borderColor = styles.windowBorder;
    this.windowElement.style.color = styles.contentColor;

    // Update header
    const header = document.getElementById('yushima-output-header');
    if (header) {
      header.style.background = styles.headerBg;
      header.style.color = styles.headerColor;
    }

    // Update content area - remove background to avoid filling unused space
    const content = document.getElementById('yushima-output-content');
    if (content) {
      content.style.color = styles.contentColor;
    }

    // Update resize handle
    const resizeHandle = document.getElementById('yushima-output-resize');
    if (resizeHandle) {
      resizeHandle.style.background = styles.windowBorder;
    }

    // Update buttons (only clear and close remain)
    const clearButton = document.getElementById('yushima-output-clear');
    if (clearButton) {
      clearButton.style.background = styles.buttonBg;
      clearButton.style.color = styles.buttonColor;
    }

    const closeButton = document.getElementById('yushima-output-close');
    if (closeButton) {
      closeButton.style.background = styles.buttonBg;
      closeButton.style.color = styles.buttonColor;
    }

    this.windowElement.style.display = 'block';

    // Force a reflow to ensure layout is calculated properly
    this.windowElement.offsetHeight;
  }

  static hide() {
    if (this.windowElement) {
      this.windowElement.style.display = 'none';
    }
  }

  static isVisible() {
    return this.windowElement && this.windowElement.style.display !== 'none';
  }

  static addMessage(message, type = 'info') {
    this.init();

    // Add message to internal storage
    const newMessage = {
      timestamp: new Date(),
      message: message,
      type: type
    };

    this.messages.push(newMessage);

    // Render messages based on current filter
    this.renderMessages();
  }

  static renderMessages() {
    if (!this.contentElement) return;

    // Clear the content
    this.contentElement.innerHTML = '';

    // Filter messages based on current filter
    let filteredMessages = this.messages;

    if (this.messageFilter !== 'all') {
      filteredMessages = this.messages.filter(msg => msg.type === this.messageFilter);
    }

    // Display only the last 100 messages for performance
    const messagesToShow = filteredMessages.slice(-100);

    // Create and append message elements
    for (let i = 0; i < messagesToShow.length; i++) {
      const msg = messagesToShow[i];
      const theme = getSiteTheme();
      const styles = getThemeStyles(theme);
      const timestamp = msg.timestamp.toLocaleTimeString();

      // Define icons for each message type
      const typeIcons = {
        info: 'ℹ️',
        warn: '⚠️',
        error: '❌',
        success: '✅',
        debug: '❓'
      };

      const messageElement = document.createElement('div');
      messageElement.style.padding = '2px 0';
      messageElement.style.color = this.getMessageColor(msg.type, theme);
      messageElement.style.fontFamily = 'Arial, sans-serif';
      const icon = typeIcons[msg.type] || '';
      messageElement.innerHTML = `<span style="color: ${theme === 'dark' ? '#888' : '#999'}; font-size: 10px;">[${timestamp}] ${icon}</span> ${msg.message}`;

      // Add a divider if this is not the first message and the previous message type was different
      if (i > 0) {
        const prevMsg = messagesToShow[i - 1];
        if (prevMsg.type === 'error' && msg.type !== 'error') {
          const divider = document.createElement('hr');
          divider.style.border = 'none';
          divider.style.height = '1px';
          divider.style.background = styles.windowBorder;
          divider.style.margin = '2px 0';
          this.contentElement.appendChild(divider);
        }
      }

      this.contentElement.appendChild(messageElement);
    }

    // Scroll to bottom after a small delay to ensure DOM is updated
    setTimeout(() => {
      if (this.contentElement) {
        this.contentElement.scrollTop = this.contentElement.scrollHeight;
      }
    }, 0);
  }

  static getMessageColor(type, theme) {
    const styles = getThemeStyles(theme);
    switch (type) {
      case 'error': return styles.errorColor;
      case 'warn': return styles.warnColor;
      case 'success': return styles.successColor;
      case 'debug': return theme === 'dark' ? '#8888FF' : '#4444AA'; // Light blue for debug
      default: return styles.infoColor;
    }
  }

  static clear() {
    this.messages = [];
    if (this.contentElement) {
      this.contentElement.innerHTML = '';
    }
  }
}

function logMessage(message, type = 'info') {
  // Only add message to output window if it's enabled
  if (Settings.getSetting('outputWindowEnabled')) {
    // Initialize output window if needed and add message
    OutputWindow.addMessage(message, type);
  }
}

// Debug logging function that can be used for more detailed logging
function debugMessage(message) {
  logMessage(message, 'debug');
}