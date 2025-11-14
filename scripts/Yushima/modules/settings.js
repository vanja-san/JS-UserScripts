/**
 * Settings management class
 */
class Settings {
  static DEFAULTS = {
    progressThreshold: 0.85, // Порог прогресса для отметки эпизода как просмотренного (85%)
    autoMarkEnabled: true, // Включить/выключить автозаметку
    playerActivityTimeout: 300000, // Таймаут активности плеера (5 минут)
    outputWindowEnabled: true, // Включить/выключить окно вывода
    showOutputWindow: false // Показывать окно вывода (по умолчанию скрыто)
  };

  static getSetting(key) {
    const value = GM_getValue(key, this.DEFAULTS[key]);
    return value !== undefined ? value : this.DEFAULTS[key];
  }

  static setSetting(key, value) {
    GM_setValue(key, value);
    
    // If output window setting changed, we might need to update UI elements
    // Although menu commands can't be unregistered, we ensure UI is in sync
    if (key === 'outputWindowEnabled') {
      // If disabling output window, hide it
      if (!value && typeof OutputWindow !== 'undefined') {
        OutputWindow.hide();
        Settings.setSetting('showOutputWindow', false);
      }
    }
  }

  static getAllSettings() {
    const settings = {};
    for (const [key, defaultValue] of Object.entries(this.DEFAULTS)) {
      settings[key] = this.getSetting(key);
    }
    return settings;
  }

  static showSettingsDialog() {
    const settings = this.getAllSettings();
    const theme = getSiteTheme();
    const styles = getThemeStyles(theme);

    const html = `
      <div id="yushima-settings-dialog" style="position: fixed; top: 30%; left: 35%; width: 30%; background: ${styles.settingsBg}; padding: 15px; border: 1px solid ${styles.settingsBorder}; z-index: 10000; font-family: Arial, sans-serif; color: ${styles.settingsText}; border-radius: 5px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
          <h3 style="margin: 0; color: ${styles.headerColor}; font-size: 16px;">${Localization.get('settingsTitle')}</h3>
          <span id="closeSettings" style="cursor: pointer; font-size: 18px;">&times;</span>
        </div>
        <div style="margin-bottom: 12px;">
          <label style="display: flex; justify-content: space-between; align-items: center;">
            <span style="margin-right: 10px;">${Localization.get('settingsAutoMarkLabel')}</span>
            <input type="checkbox" id="autoMarkEnabled" ${settings.autoMarkEnabled ? 'checked' : ''} style="width: 16px; height: 16px;">
          </label>
        </div>
        <div style="margin-bottom: 12px;">
          <label style="display: flex; justify-content: space-between; align-items: center;">
            <span style="margin-right: 10px;">${Localization.get('settingsProgressThresholdLabel')}</span>
            <input type="number" id="progressThreshold" min="0.01" max="1.0" step="0.01" value="${settings.progressThreshold}" style="width: 80px; padding: 4px; background: ${styles.settingsInputBg}; color: ${styles.settingsInputText}; border: 1px solid ${styles.settingsBorder}; border-radius: 3px; text-align: center;">
          </label>
        </div>
        <div style="margin-bottom: 12px;">
          <label style="display: flex; justify-content: space-between; align-items: center;">
            <span style="margin-right: 10px;">${Localization.get('settingsTimeoutLabel')}</span>
            <input type="number" id="playerActivityTimeout" min="60000" value="${settings.playerActivityTimeout}" style="width: 100px; padding: 4px; background: ${styles.settingsInputBg}; color: ${styles.settingsInputText}; border: 1px solid ${styles.settingsBorder}; border-radius: 3px; text-align: center;">
          </label>
        </div>
        <div style="margin-bottom: 15px;">
          <label style="display: flex; justify-content: space-between; align-items: center;">
            <span style="margin-right: 10px;">${Localization.get('settingsOutputWindowEnabledLabel')}</span>
            <input type="checkbox" id="outputWindowEnabled" ${settings.outputWindowEnabled ? 'checked' : ''} style="width: 16px; height: 16px;">
          </label>
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 8px;">
          <button id="saveSettings" style="padding: 6px 12px; background: ${styles.headerBg}; color: ${styles.headerColor}; border: 1px solid ${styles.settingsBorder}; border-radius: 3px; cursor: pointer; font-size: 14px;">${Localization.get('settingsSaveButton')}</button>
          <button id="cancelSettings" style="padding: 6px 12px; background: ${styles.buttonBg}; color: ${styles.buttonColor}; border: 1px solid ${styles.settingsBorder}; border-radius: 3px; cursor: pointer; font-size: 14px;">${Localization.get('settingsCancelButton')}</button>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', html);

    document.getElementById('saveSettings').addEventListener('click', () => {
      const newSettings = {
        progressThreshold: parseFloat(document.getElementById('progressThreshold').value),
        autoMarkEnabled: document.getElementById('autoMarkEnabled').checked,
        playerActivityTimeout: parseInt(document.getElementById('playerActivityTimeout').value),
        outputWindowEnabled: document.getElementById('outputWindowEnabled').checked
      };

      const oldOutputWindowEnabled = Settings.getSetting('outputWindowEnabled');
      for (const [key, value] of Object.entries(newSettings)) {
        this.setSetting(key, value);
      }

      document.getElementById('yushima-settings-dialog').remove();

      // If output window setting was changed, inform user that page reload might be needed
      const newOutputWindowEnabled = Settings.getSetting('outputWindowEnabled');
      if (oldOutputWindowEnabled !== newOutputWindowEnabled) {
        alert(Localization.get('settingsSavedRefresh'));
      } else {
        alert(Localization.get('settingsSaved'));
      }
    });

    document.getElementById('cancelSettings').addEventListener('click', () => {
      document.getElementById('yushima-settings-dialog').remove();
    });

    document.getElementById('closeSettings').addEventListener('click', () => {
      document.getElementById('yushima-settings-dialog').remove();
    });
  }
}