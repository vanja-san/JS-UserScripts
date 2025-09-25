/**
 * Theme detection utility
 */
function getSiteTheme() {
  // Check for browser's preferred color scheme using CSS media query
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }

  // Fallback: check for site dark theme indicators
  const body = document.body;
  const html = document.documentElement;

  // Check CSS classes that might indicate dark theme
  if (body.classList.contains('dark-theme') ||
      html.classList.contains('dark-theme')) {
    return 'dark';
  }

  // Check computed styles for dark theme indicators
  const computedStyle = window.getComputedStyle(body);
  const bgColor = computedStyle.backgroundColor;

  if (bgColor) {
    const rgbMatch = bgColor.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
    if (rgbMatch) {
      const r = parseInt(rgbMatch[1]);
      const g = parseInt(rgbMatch[2]);
      const b = parseInt(rgbMatch[3]);

      // If average RGB value is below threshold, it's likely dark theme
      const avg = (r + g + b) / 3;
      if (avg < 100) {
        return 'dark';
      }
    }
  }

  // Default to light theme
  return 'light';
}

// Add event listener to detect browser theme changes
if (window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    // Refresh the output window theme if it's visible
    if (OutputWindow && OutputWindow.isVisible()) {
      OutputWindow.hide();
      OutputWindow.show();
    }
  });
}

/**
 * Get theme styles
 */
function getThemeStyles(theme) {
  if (theme === 'dark') {
    return {
      // Темная тема
      windowBg: '#2d2d2d',
      windowBorder: '#444',
      headerBg: '#3a3a3a',
      headerColor: '#e0e0e0',
      contentBg: '#1e1e1e',
      contentColor: '#d4d4d4',
      buttonBg: '#444',
      buttonColor: '#e0e0e0',
      infoColor: '#9cdcfe',
      warnColor: '#dcdcaa',
      errorColor: '#f44747',
      successColor: '#4ec9b0',
      settingsBg: '#2d2d2d',
      settingsText: '#e0e0e0',
      settingsBorder: '#444',
      settingsInputBg: '#3c3c3c',
      settingsInputText: '#e0e0e0'
    };
  } else {
    // Светлая тема
    return {
      windowBg: '#ffffff',
      windowBorder: '#ccc',
      headerBg: '#3498db',
      headerColor: '#ffffff',
      contentBg: '#f9f9f9',
      contentColor: '#333333',
      buttonBg: '#e74c3c',
      buttonColor: '#ffffff',
      infoColor: '#333333',
      warnColor: '#f39c12',
      errorColor: '#e74c3c',
      successColor: '#2ecc71',
      settingsBg: '#ffffff',
      settingsText: '#333333',
      settingsBorder: '#ccc',
      settingsInputBg: '#ffffff',
      settingsInputText: '#333333'
    };
  }
}