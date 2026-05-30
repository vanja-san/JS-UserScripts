// ============================================
// Helper functions - Optimized and security enhanced
// ============================================

// Pluralization function
window.pluralize = (number, forms) => {
if (!number || !forms || forms.length < 3) return forms[2] || '';
const num = typeof number === 'number' ? number : parseFloat(number);
const integerPart = Math.floor(Math.abs(num));
const lastTwo = integerPart % 100;
if (lastTwo >= 11 && lastTwo <= 19) return forms[2];
const lastDigit = integerPart % 10;
if (lastDigit === 1) return forms[0];
if (lastDigit >= 2 && lastDigit <= 4) return forms[1];
return forms[2];
};

// Build pluralization patterns with non-global regex
window.createPluralizationTemplates = (units) => {
if (!window.PLURAL_MAP) window.PLURAL_MAP = {};
units.forEach(({en, ru}) => {
let normalizedEn = en.toLowerCase().replace(/.∗?.*?.∗??/g, '').replace(/s?$/g, 's').replace(/?/g, '');
window.PLURAL_MAP[normalizedEn] = ru;
});

return units.map(({en, ru}) => {
// Non-global regex (no 'g' flag) to avoid lastIndex issues
const pattern = new RegExp(`(.*?)(\\d+\\.?\\d*)([kmbt]?)\\s*${en}`, 'i');
return {
pattern,
replacer: (match, leading, count, suffix) => {
const numStr = count.toString();
if (numStr.length > 15 || !/^\d+.?\d*/.test(numStr))returnmatch;constnum=parseFloat(numStr);if(isNaN(num)∣∣num<0∣∣num>1000000000)returnmatch;constsuffixStr=suffix?suffix.toLowerCase():′′;return‘/.test(numStr)) return match;
        const num = parseFloat(numStr);
        if (isNaN(num) || num < 0 || num > 1000000000) return match;
        const suffixStr = suffix ? suffix.toLowerCase() : '';
        return `/.test(numStr))returnmatch;constnum=parseFloat(numStr);if(isNaN(num)∣∣num<0∣∣num>1000000000)returnmatch;constsuffixStr=suffix?suffix.toLowerCase():′′;return‘{leading}numStr{numStr}numStr{suffixStr} ${window.pluralize(num, ru)}`;
}
};
});
};

// Dynamic templates - all patterns without global flag to prevent state issues
window.DYNAMIC_TEMPLATES = [
...window.createPluralizationTemplates([
{en: 'mods?', ru: ['мод', 'моды', 'модов']},
{en: 'image[s]?', ru: ['изображение', 'изображения', 'изображений']},
{en: 'collection[s]?', ru: ['коллекция', 'коллекции', 'коллекций']},
{en: 'download[s]?', ru: ['скачивание', 'скачивания', 'скачиваний']},
{en: 'endorsement[s]?', ru: ['одобрение', 'одобрения', 'одобрений']},
{en: 'view[s]?', ru: ['просмотр', 'просмотры', 'просмотров']},
{en: 'reply[ies]?', ru: ['ответ', 'ответы', 'ответов']},
{en: 'Member[s]?', ru: ['участник', 'участники', 'участников']},
{en: 'Guest[s]?', ru: ['гость', 'гости', 'гостей']},
{en: 'result[s]?', ru: ['результат', 'результаты', 'результатов']},
{en: 'Comment[s]?', ru: ['комментарий', 'комментарии', 'комментариев']},
{en: 'file[s]?', ru: ['файл', 'файлы', 'файлов']},
{en: 'item[s]?', ru: ['элемент', 'элементы', 'элементов']},
{en: 'user[s]?', ru: ['пользователь', 'пользователи', 'пользователей']},
{en: 'like[s]?', ru: ['лайк', 'лайки', 'лайков']},
{en: 'vote[s]?', ru: ['голос', 'голоса', 'голосов']},
{en: 'time[s]?', ru: ['раз', 'раза', 'раз']}
]),
{
// Date pattern (non-global)
pattern: /(\d{1,2})\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s*(\d{4})/i,
replacer: (match, day, month, year) => {
const dayNum = parseInt(day);
const yearNum = parseInt(year);
if (isNaN(dayNum) || dayNum < 1 || dayNum > 31 || isNaN(yearNum) || yearNum < 1000 || yearNum > 9999) return match;
return `${dayNum} ${window.NRL_TRANSLATIONS?.months[month] || month} ${yearNum}`;
}
},
{
// Time ago pattern (non-global)
pattern: /(\d+)[\s\u00A0]+(second|minute|hour|day|week|month|year)s?[\s\u00A0]+ago/i,
replacer: (match, count, unit) => {
const num = parseInt(count);
if (isNaN(num) || num < 0 || num > 1000000) return match;
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
// Simple replacements
{ pattern: /(\d+)\s*GB/i, replacement: "1 ГБ" },
  { pattern: /(\d+)\s*MB/i, replacement: "1 МБ" },
{ pattern: /(\d+)\s*KB/i, replacement: "1 КБ" },
  { pattern: /(\d+)\s*TB/i, replacement: "1 ТБ" }
];

// Helper: check if text is already in Russian (Cyrillic dominant)
window.isCyrillic = (text) => {
if (!text || typeof text !== 'string') return false;
const cyrillicPattern = /[\u0400-\u04FF]/;
const latinPattern = /[a-zA-Z]/;
return cyrillicPattern.test(text) && !latinPattern.test(text);
};