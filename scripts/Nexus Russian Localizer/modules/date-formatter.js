// Модуль для обработки строк с датами
class DateFormatter {
  constructor() {
    // Паттерны для различных форматов дат с префиксами
    this.datePatterns = [
      // Паттерн для 'Published {date}'
      {
        pattern: /Published\s+(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/gi,
        replacement: (match, day, month, year) => {
          const monthRu = window.NRL_TRANSLATIONS?.months[month] || month;
          return `Опубликовано ${day} ${monthRu} ${year}`;
        }
      },
      // Паттерн для 'Updated {date}'
      {
        pattern: /Updated\s+(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/gi,
        replacement: (match, day, month, year) => {
          const monthRu = window.NRL_TRANSLATIONS?.months[month] || month;
          return `Обновлено ${day} ${monthRu} ${year}`;
        }
      },
      // Паттерн для 'Last updated {date}'
      {
        pattern: /Last updated\s+(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/gi,
        replacement: (match, day, month, year) => {
          const monthRu = window.NRL_TRANSLATIONS?.months[month] || month;
          return `Последнее обновление ${day} ${monthRu} ${year}`;
        }
      },
      // Паттерн для 'Uploaded {date}'
      {
        pattern: /Uploaded\s+(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/gi,
        replacement: (match, day, month, year) => {
          const monthRu = window.NRL_TRANSLATIONS?.months[month] || month;
          return `Добавлено ${day} ${monthRu} ${year}`;
        }
      },
      // Паттерн для 'Created {date}'
      {
        pattern: /Created\s+(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/gi,
        replacement: (match, day, month, year) => {
          const monthRu = window.NRL_TRANSLATIONS?.months[month] || month;
          return `Создано ${day} ${monthRu} ${year}`;
        }
      },
      // Паттерн для 'Last modified {date}'
      {
        pattern: /Last modified\s+(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/gi,
        replacement: (match, day, month, year) => {
          const monthRu = window.NRL_TRANSLATIONS?.months[month] || month;
          return `Последнее изменение ${day} ${monthRu} ${year}`;
        }
      },
      // Паттерн для 'Added {date}'
      {
        pattern: /Added\s+(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/gi,
        replacement: (match, day, month, year) => {
          const monthRu = window.NRL_TRANSLATIONS?.months[month] || month;
          return `Добавлено ${day} ${monthRu} ${year}`;
        }
      },
      // Паттерн для '{date} ago'
      {
        pattern: /(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})\s+ago/gi,
        replacement: (match, day, month, year) => {
          const monthRu = window.NRL_TRANSLATIONS?.months[month] || month;
          return `${day} ${monthRu} ${year} назад`;
        }
      },
      // Более общий паттерн для дат в формате DD MMM YYYY где MMM может быть любым месяцем
      {
        pattern: /(\w+)\s+(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})/gi,
        replacement: (match, prefix, day, month, year) => {
          const monthRu = window.NRL_TRANSLATIONS?.months[month] || month;
          const prefixTranslation = window.NRL_TRANSLATIONS?.main[prefix] || prefix;
          return `${prefixTranslation} ${day} ${monthRu} ${year}`;
        }
      }
    ];
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