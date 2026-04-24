// Вспомогательные функции
window.pluralize = (number, forms) => {
  if (!number || !forms || forms.length < 3) return forms[2] || '';

  // Handle decimal numbers - use the integer part before decimal point
  const num = typeof number === 'number' ? number : parseFloat(number);
  const integerPart = Math.floor(Math.abs(num));
  const lastTwo = integerPart % 100;
  if (lastTwo >= 11 && lastTwo <= 19) return forms[2];

  const lastDigit = integerPart % 10;
  if (lastDigit === 1) return forms[0];
  if (lastDigit >= 2 && lastDigit <= 4) return forms[1];
  return forms[2];
};

window.createPluralizationTemplates = (units) => {
  // Build a map of English plural nouns to their Russian forms for parent-based pluralization
  if (!window.PLURAL_MAP) window.PLURAL_MAP = {};
  units.forEach(({en, ru}) => {
    // Normalize the English key: remove optional [s]? or [ies]? and convert to lowercase
    // Handle cases like 'mods?', 'image[s]?', 'reply[ies]?'
    let normalizedEn = en.toLowerCase();
    // Remove optional parts like [s]? or [ies]?
    normalizedEn = normalizedEn.replace(/\[.*?\]\?/g, '');
    // Remove any remaining ? or s at the end (for cases like 'mods?')
    normalizedEn = normalizedEn.replace(/s\?$/g, 's').replace(/\?/g, '');
    window.PLURAL_MAP[normalizedEn] = ru;
  });

  return units.map(({en, ru}) => ({
    // .*? captures any leading characters (currency symbols, etc.)
    pattern: new RegExp(`(.*?)(\\d+\\.?\\d*)([kmbt]?)\\s*${en}`, 'gi'),
    replacer: (match, leading, count, suffix) => {
      // Validate inputs to prevent injection
      const numStr = count.toString();
      if (numStr.length > 15 || !/^\d+\.?\d*$/.test(numStr)) {
        return match; // Return original if invalid
      }
      const num = parseFloat(numStr);
      if (isNaN(num) || num < 0 || num > 1000000000) {
        return match; // Return original if number is out of range
      }
      const suffixStr = suffix ? suffix.toLowerCase() : '';
      // Preserve leading characters (like $) and suffix
      return `${leading}${numStr}${suffixStr} ${window.pluralize(num, ru)}`;
    }
  }));
};

// Шаблоны для динамического перевода
window.DYNAMIC_TEMPLATES = [
  // Шаблоны с плюрализацией (только для отдельных слов, без ago) - размещаем в начале для приоритета
  ...window.createPluralizationTemplates([
    {en: 'mods?', ru: ['мод', 'моды', 'модов']},
    {en: 'image[s]?', ru: ['изображение', 'изображения', 'изображений']},
    {en: 'collection[s]?', ru: ['коллекция', 'коллекции', 'коллекций']},
    {en: 'download[s]?', ru: ['скачивание', 'скачивания', 'скачиваний']},
    {en: 'endorsement[s]?', ru: ['одобрение', 'одобрения', 'одобрений']},
    {en: 'view[s]?', ru: ['просмотр', 'просмотры', 'просмотров']},
    {en: 'reply[ies]?', ru: ['ответ', 'ответы', 'ответов']},
    {en: 'Member[s]?', ru: ['участник', 'участники', 'участников']},
    {en: 'Anonymous', ru: ['аноним', 'анонимы', 'анонимов']},
    {en: 'Guest[s]?', ru: ['гость', 'гости', 'гостей']},
    {en: 'member[s]?', ru: ['участник', 'участники', 'участников']},
    {en: 'result[s]?', ru: ['результат', 'результаты', 'результатов']},
    {en: 'Comment[s]?', ru: ['комментарий', 'комментарии', 'комментариев']},
    {en: 'file[s]?', ru: ['файл', 'файлы', 'файлов']},
    {en: 'item[s]?', ru: ['элемент', 'элементы', 'элементов']},
    {en: 'user[s]?', ru: ['пользователь', 'пользователи', 'пользователей']},
    {en: 'post[s]?', ru: ['пост', 'посты', 'постов']},
    {en: 'topic[s]?', ru: ['тема', 'темы', 'тем']},
    {en: 'like[s]?', ru: ['лайк', 'лайки', 'лайков']},
    {en: 'star[s]?', ru: ['звезда', 'звезды', 'звезд']},
    {en: 'vote[s]?', ru: ['голос', 'голоса', 'голосов']},
    {en: 'time[s]?', ru: ['раз', 'раза', 'раз']},
    {en: 'mods in 1-click with Premium', ru: ['мод в один клик с премиум', 'мода в один клик с премиум', 'модов в один клик с премиум']}
  ]),
  {
    pattern: /(\d{1,2})\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s*(\d{4})/gi,
    replacer: (match, day, month, year) => {
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
      return `${dayNum} ${window.NRL_TRANSLATIONS?.months[month] || month} ${yearNum}`;
    }
  },
  // Универсальный шаблон для всех временных интервалов с ago
  {
    pattern: /(\d+)[\s\u00A0]+(second|minute|hour|day|week|month|year)s?[\s\u00A0]+ago/gi,
    replacer: (match, count, unit) => {
      // Validate inputs to prevent injection
      const countStr = count.toString();
      if (countStr.length > 10 || !/^\d+$/.test(countStr)) {
        return match; // Return original if invalid
      }
      const num = parseInt(countStr);
      if (isNaN(num) || num < 0 || num > 1000000) {
        return match; // Return original if number is out of range
      }
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
  // Шаблоны для времени до (до/through)
  {
    pattern: /(\d+)[\s\u00A0]+(second|minute|hour|day|week|month|year)s?[\s\u00A0]+(to|through|before)/gi,
    replacer: (match, count, unit, prep) => {
      // Validate inputs to prevent injection
      const countStr = count.toString();
      if (countStr.length > 10 || !/^\d+$/.test(countStr)) {
        return match; // Return original if invalid
      }
      const num = parseInt(countStr);
      if (isNaN(num) || num < 0 || num > 1000000) {
        return match; // Return original if number is out of range
      }
      const units = {
        second: ['секунду', 'секунды', 'секунд'],
        minute: ['минуту', 'минуты', 'минут'],
        hour: ['час', 'часа', 'часов'],
        day: ['день', 'дня', 'дней'],
        week: ['неделю', 'недели', 'недель'],
        month: ['месяц', 'месяца', 'месяцев'],
        year: ['год', 'года', 'лет']
      };

      const prepMap = {
        'to': 'до',
        'through': 'до',
        'before': 'до'
      };

      return `${num} ${window.pluralize(num, units[unit])} ${prepMap[prep] || prep}`;
    }
  },

  // Безопасные версии шаблонов с ограничениями на длину строк
  { pattern: /(\d+)\s*GB/gi, replacement: "$1 ГБ", maxLength: 20 },
  { pattern: /(\d+)\s*MB/gi, replacement: "$1 МБ", maxLength: 20 },
  { pattern: /(\d+)\s*KB/gi, replacement: "$1 КБ", maxLength: 20 },
  { pattern: /(\d+)\s*TB/gi, replacement: "$1 ТБ", maxLength: 20 },


];