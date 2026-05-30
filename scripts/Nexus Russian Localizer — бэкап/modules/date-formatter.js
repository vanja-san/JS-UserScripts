// Модуль для обработки строк с датами
class DateFormatter {
  constructor() {
    // Паттерны для различных форматов дат с префиксами
    this.datePatterns = [
      // Паттерн для 'Published {date}'
      {
        pattern: /Published\s+(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/gi,
        replacement: (match, day, month, year) => {
          // Validate inputs to prevent injection
          const dayStr = day.toString();
          const yearStr = year.toString();
          if (dayStr.length > 2 || yearStr.length > 4 || !/^\d+$/.test(dayStr) || !/^\d+$/.test(yearStr)) {
            return match; // Return original if invalid
          }
          const dayNum = parseInt(dayStr);
          const yearNum = parseInt(yearStr);
          if (isNaN(dayNum) || dayNum < 1 || dayNum > 31 || isNaN(yearNum) || yearNum < 1000 || yearNum > 9999) {
            return match; // Return original if number is out of range
          }

          const monthRu = window.NRL_TRANSLATIONS?.months[month] || month;
          if (!this.isValidMonth(month, monthRu)) {
            return match; // Return original if month is invalid
          }
          return `Опубликовано ${dayNum} ${monthRu} ${yearNum}`;
        }
      },
      // Паттерн для 'Updated {date}'
      {
        pattern: /Updated\s+(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/gi,
        replacement: (match, day, month, year) => {
          // Validate inputs to prevent injection
          const dayStr = day.toString();
          const yearStr = year.toString();
          if (dayStr.length > 2 || yearStr.length > 4 || !/^\d+$/.test(dayStr) || !/^\d+$/.test(yearStr)) {
            return match; // Return original if invalid
          }
          const dayNum = parseInt(dayStr);
          const yearNum = parseInt(yearStr);
          if (isNaN(dayNum) || dayNum < 1 || dayNum > 31 || isNaN(yearNum) || yearNum < 1000 || yearNum > 9999) {
            return match; // Return original if number is out of range
          }

          const monthRu = window.NRL_TRANSLATIONS?.months[month] || month;
          if (!this.isValidMonth(month, monthRu)) {
            return match; // Return original if month is invalid
          }
          return `Обновлено ${dayNum} ${monthRu} ${yearNum}`;
        }
      },
      // Паттерн для 'Last updated {date}'
      {
        pattern: /Last updated\s+(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/gi,
        replacement: (match, day, month, year) => {
          // Validate inputs to prevent injection
          const dayStr = day.toString();
          const yearStr = year.toString();
          if (dayStr.length > 2 || yearStr.length > 4 || !/^\d+$/.test(dayStr) || !/^\d+$/.test(yearStr)) {
            return match; // Return original if invalid
          }
          const dayNum = parseInt(dayStr);
          const yearNum = parseInt(yearStr);
          if (isNaN(dayNum) || dayNum < 1 || dayNum > 31 || isNaN(yearNum) || yearNum < 1000 || yearNum > 9999) {
            return match; // Return original if number is out of range
          }

          const monthRu = window.NRL_TRANSLATIONS?.months[month] || month;
          if (!this.isValidMonth(month, monthRu)) {
            return match; // Return original if month is invalid
          }
          return `Последнее обновление ${dayNum} ${monthRu} ${yearNum}`;
        }
      },
      // Паттерн для 'Uploaded {date}'
      {
        pattern: /Uploaded\s+(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/gi,
        replacement: (match, day, month, year) => {
          // Validate inputs to prevent injection
          const dayStr = day.toString();
          const yearStr = year.toString();
          if (dayStr.length > 2 || yearStr.length > 4 || !/^\d+$/.test(dayStr) || !/^\d+$/.test(yearStr)) {
            return match; // Return original if invalid
          }
          const dayNum = parseInt(dayStr);
          const yearNum = parseInt(yearStr);
          if (isNaN(dayNum) || dayNum < 1 || dayNum > 31 || isNaN(yearNum) || yearNum < 1000 || yearNum > 9999) {
            return match; // Return original if number is out of range
          }

          const monthRu = window.NRL_TRANSLATIONS?.months[month] || month;
          if (!this.isValidMonth(month, monthRu)) {
            return match; // Return original if month is invalid
          }
          return `Добавлено ${dayNum} ${monthRu} ${yearNum}`;
        }
      },
      // Паттерн для 'Created {date}'
      {
        pattern: /Created\s+(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/gi,
        replacement: (match, day, month, year) => {
          // Validate inputs to prevent injection
          const dayStr = day.toString();
          const yearStr = year.toString();
          if (dayStr.length > 2 || yearStr.length > 4 || !/^\d+$/.test(dayStr) || !/^\d+$/.test(yearStr)) {
            return match; // Return original if invalid
          }
          const dayNum = parseInt(dayStr);
          const yearNum = parseInt(yearStr);
          if (isNaN(dayNum) || dayNum < 1 || dayNum > 31 || isNaN(yearNum) || yearNum < 1000 || yearNum > 9999) {
            return match; // Return original if number is out of range
          }

          const monthRu = window.NRL_TRANSLATIONS?.months[month] || month;
          if (!this.isValidMonth(month, monthRu)) {
            return match; // Return original if month is invalid
          }
          return `Создано ${dayNum} ${monthRu} ${yearNum}`;
        }
      },
      // Паттерн для 'Last modified {date}'
      {
        pattern: /Last modified\s+(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/gi,
        replacement: (match, day, month, year) => {
          // Validate inputs to prevent injection
          const dayStr = day.toString();
          const yearStr = year.toString();
          if (dayStr.length > 2 || yearStr.length > 4 || !/^\d+$/.test(dayStr) || !/^\d+$/.test(yearStr)) {
            return match; // Return original if invalid
          }
          const dayNum = parseInt(dayStr);
          const yearNum = parseInt(yearStr);
          if (isNaN(dayNum) || dayNum < 1 || dayNum > 31 || isNaN(yearNum) || yearNum < 1000 || yearNum > 9999) {
            return match; // Return original if number is out of range
          }

          const monthRu = window.NRL_TRANSLATIONS?.months[month] || month;
          if (!this.isValidMonth(month, monthRu)) {
            return match; // Return original if month is invalid
          }
          return `Последнее изменение ${dayNum} ${monthRu} ${yearNum}`;
        }
      },
      // Паттерн для 'Added {date}'
      {
        pattern: /Added\s+(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/gi,
        replacement: (match, day, month, year) => {
          // Validate inputs to prevent injection
          const dayStr = day.toString();
          const yearStr = year.toString();
          if (dayStr.length > 2 || yearStr.length > 4 || !/^\d+$/.test(dayStr) || !/^\d+$/.test(yearStr)) {
            return match; // Return original if invalid
          }
          const dayNum = parseInt(dayStr);
          const yearNum = parseInt(yearStr);
          if (isNaN(dayNum) || dayNum < 1 || dayNum > 31 || isNaN(yearNum) || yearNum < 1000 || yearNum > 9999) {
            return match; // Return original if number is out of range
          }

          const monthRu = window.NRL_TRANSLATIONS?.months[month] || month;
          if (!this.isValidMonth(month, monthRu)) {
            return match; // Return original if month is invalid
          }
          return `Добавлено ${dayNum} ${monthRu} ${yearNum}`;
        }
      },
      // Паттерн для '{date} ago'
      {
        pattern: /(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})\s+ago/gi,
        replacement: (match, day, month, year) => {
          // Validate inputs to prevent injection
          const dayStr = day.toString();
          const yearStr = year.toString();
          if (dayStr.length > 2 || yearStr.length > 4 || !/^\d+$/.test(dayStr) || !/^\d+$/.test(yearStr)) {
            return match; // Return original if invalid
          }
          const dayNum = parseInt(dayStr);
          const yearNum = parseInt(yearStr);
          if (isNaN(dayNum) || dayNum < 1 || dayNum > 31 || isNaN(yearNum) || yearNum < 1000 || yearNum > 9999) {
            return match; // Return original if number is out of range
          }

          const monthRu = window.NRL_TRANSLATIONS?.months[month] || month;
          if (!this.isValidMonth(month, monthRu)) {
            return match; // Return original if month is invalid
          }
          return `${dayNum} ${monthRu} ${yearNum} назад`;
        }
      },
      // Более общий паттерн для дат в формате DD MMM YYYY где MMM может быть любым месяцем
      {
        pattern: /(\w+)\s+(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})/gi,
        replacement: (match, prefix, day, month, year) => {
          // Validate inputs to prevent injection
          const dayStr = day.toString();
          const yearStr = year.toString();
          if (dayStr.length > 2 || yearStr.length > 4 || !/^\d+$/.test(dayStr) || !/^\d+$/.test(yearStr)) {
            return match; // Return original if invalid
          }
          const dayNum = parseInt(dayStr);
          const yearNum = parseInt(yearStr);
          if (isNaN(dayNum) || dayNum < 1 || dayNum > 31 || isNaN(yearNum) || yearNum < 1000 || yearNum > 9999) {
            return match; // Return original if number is out of range
          }

          const monthRu = window.NRL_TRANSLATIONS?.months[month] || month;
          if (!this.isValidMonth(month, monthRu)) {
            return match; // Return original if month is invalid
          }
          const prefixTranslation = window.NRL_TRANSLATIONS?.main[prefix] || prefix;
          return `${prefixTranslation} ${dayNum} ${monthRu} ${yearNum}`;
        }
      }
    ];
  }

  /**
   * Проверяет, является ли месяц действительным
   * @param {string} month - месяц в английском формате
   * @param {string} monthRu - месяц в русском формате
   * @returns {boolean} - true, если месяц действительный
   */
  isValidMonth(month, monthRu) {
    if (typeof month !== 'string' || typeof monthRu !== 'string') return false;

    // Проверяем, не содержит ли месяц потенциально вредоносный код
    if (/[<>'"\\]/.test(month) || /[<>'"\\]/.test(monthRu)) return false;

    // Проверяем, является ли месяц допустимым
    const validMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return validMonths.includes(month);
  }

  format(text) {
    if (!text || typeof text !== 'string') return text;

    let result = text;
    
    // Применяем все паттерны
    for (const patternConfig of this.datePatterns) {
      result = result.replace(patternConfig.pattern, patternConfig.replacement);
    }

    return result;
  }
}

// Создаем глобальный экземпляр для использования
window.dateFormatter = new DateFormatter();