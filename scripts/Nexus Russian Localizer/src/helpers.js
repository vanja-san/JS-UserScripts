// Вспомогательные функции
window.pluralize = (number, forms) => {
  if (!number || !forms || forms.length < 3) return forms[2] || '';
  const lastTwo = number % 100;
  if (lastTwo >= 11 && lastTwo <= 19) return forms[2];

  const lastDigit = number % 10;
  if (lastDigit === 1) return forms[0];
  if (lastDigit >= 2 && lastDigit <= 4) return forms[1];
  return forms[2];
};

window.createPluralizationTemplates = (units) => 
  units.map(({en, ru}) => ({
    pattern: new RegExp(`(\\d+)\\s*${en}`, 'gi'),
    replacer: (match, count) => {
      const num = parseInt(count);
      return `${num} ${window.pluralize(num, ru)}`;
    }
  }));

// Шаблоны для динамического перевода
window.DYNAMIC_TEMPLATES = [
  {
    pattern: /(\d{1,2})\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s*(\d{4})/gi,
    replacer: (match, day, month, year) =>
    `${day} ${window.NRL_TRANSLATIONS?.months[month] || month} ${year}`
},
  // Универсальный шаблон для всех временных интервалов с ago
  {
    pattern: /(\d+)[\s\u00A0]+(second|minute|hour|day|week|month|year)s?[\s\u00A0]+ago/gi,
    replacer: (match, count, unit) => {
      const num = parseInt(count);
      const units = {
        second: ['секунду', 'секунды', 'секунд'],
        minute: ['минуту', 'минуты', 'минут'],
        hour: ['час', 'часа', 'часов'],
        day: ['день', 'дня', 'дней'],
        week: ['неделю', 'недели', 'недель'],
        month: ['месяц', 'месяца', 'месяцев'],
        year: ['год', 'года', 'лет']
      };

      return `${num} ${window.pluralize(num, units[unit])} назад`;
    }
  },
  // Безопасные версии шаблонов с ограничениями на длину строк
  {
    pattern: /(\d+)\s*GB/gi,
    replacement: "$1 ГБ",
    maxLength: 20 // Ограничение длины строки для безопасности
  },
  {
    pattern: /(\d+)\s*MB/gi,
    replacement: "$1 МБ",
    maxLength: 20
  },
  {
    pattern: /(\d+)\s*KB/gi,
    replacement: "$1 КБ",
    maxLength: 20
  },

  // Шаблоны с плюрализацией (только для отдельных слов, без ago)
  ...window.createPluralizationTemplates([
    {en: 'mods', ru: ['мод', 'мода', 'модов']},
    {en: 'images?', ru: ['изображение', 'изображения', 'изображений']},
    {en: 'collections?', ru: ['коллекция', 'коллекции', 'коллекций']},
    {en: 'downloads?', ru: ['скачивание', 'скачивания', 'скачиваний']},
    {en: 'endorsements?', ru: ['одобрение', 'одобрения', 'одобрений']},
    {en: 'views?', ru: ['просмотр', 'просмотра', 'просмотров']},
    {en: 'replies?', ru: ['ответ', 'ответа', 'ответов']},
    {en: 'Members', ru: ['участник', 'участника', 'участников']},
    {en: 'Anonymous', ru: ['аноним', 'анонима', 'анонимов']},
    {en: 'Guests', ru: ['гость', 'гостя', 'гостей']},
    {en: 'members', ru: ['участник', 'участника', 'участников']},
    {en: 'results', ru: ['результат', 'результата', 'результатов']},
    {en: 'Comments', ru: ['комментарий', 'комментария', 'комментариев']},
    {en: 'mods in 1-click with Premium', ru: ['мод в один клик с премиум', 'мода в один клик с премиум', 'модов в один клик с премиум']}
  ]),

  // Статические шаблоны
  { pattern: /(\d+)\s*GB/gi, replacement: "$1 ГБ" },
  { pattern: /(\d+)\s*MB/gi, replacement: "$1 МБ" },
  { pattern: /(\d+)\s*KB/gi, replacement: "$1 КБ" },
  { pattern: /(\d+)\s*Collections/gi, replacement: "$1 коллекций" },
  { pattern: /(\d+)\s*files/gi, replacement: "$1 файлов" },
];