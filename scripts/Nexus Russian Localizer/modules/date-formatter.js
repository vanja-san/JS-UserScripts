// ============================================
// Date Formatter - Optimized with non-global regex and prevention of double formatting
// ============================================
class DateFormatter {
constructor() {
// Patterns without 'g' flag to avoid state issues
this.datePatterns = [
{
pattern: /Published\s+(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/i,
replacement: (match, day, month, year) => {
const dayNum = parseInt(day);
const yearNum = parseInt(year);
if (isNaN(dayNum) || dayNum < 1 || dayNum > 31 || isNaN(yearNum) || yearNum < 1000 || yearNum > 9999) return match;
const monthRu = window.NRL_TRANSLATIONS?.months[month] || month;
return `Опубликовано ${dayNum} ${monthRu} ${yearNum}`;
}
},
{
pattern: /Updated\s+(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/i,
replacement: (match, day, month, year) => {
const dayNum = parseInt(day);
const yearNum = parseInt(year);
if (isNaN(dayNum) || dayNum < 1 || dayNum > 31 || isNaN(yearNum) || yearNum < 1000 || yearNum > 9999) return match;
const monthRu = window.NRL_TRANSLATIONS?.months[month] || month;
return `Обновлено ${dayNum} ${monthRu} ${yearNum}`;
}
},
{
pattern: /Last updated\s+(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/i,
replacement: (match, day, month, year) => {
const dayNum = parseInt(day);
const yearNum = parseInt(year);
if (isNaN(dayNum) || dayNum < 1 || dayNum > 31 || isNaN(yearNum) || yearNum < 1000 || yearNum > 9999) return match;
const monthRu = window.NRL_TRANSLATIONS?.months[month] || month;
return `Последнее обновление ${dayNum} ${monthRu} ${yearNum}`;
}
},
{
pattern: /Uploaded\s+(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/i,
replacement: (match, day, month, year) => {
const dayNum = parseInt(day);
const yearNum = parseInt(year);
if (isNaN(dayNum) || dayNum < 1 || dayNum > 31 || isNaN(yearNum) || yearNum < 1000 || yearNum > 9999) return match;
const monthRu = window.NRL_TRANSLATIONS?.months[month] || month;
return `Добавлено ${dayNum} ${monthRu} ${yearNum}`;
}
},
{
pattern: /Created\s+(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/i,
replacement: (match, day, month, year) => {
const dayNum = parseInt(day);
const yearNum = parseInt(year);
if (isNaN(dayNum) || dayNum < 1 || dayNum > 31 || isNaN(yearNum) || yearNum < 1000 || yearNum > 9999) return match;
const monthRu = window.NRL_TRANSLATIONS?.months[month] || month;
return `Создано ${dayNum} ${monthRu} ${yearNum}`;
}
}
];
}

format(text) {
if (!text || typeof text !== 'string') return text;
// Skip if already formatted (contains Russian month names or cyrillic with no Latin)
if (window.isCyrillic(text) && !/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/i.test(text)) {
return text;
}
let result = text;
for (const patternConfig of this.datePatterns) {
if (patternConfig.pattern.test(result)) {
result = result.replace(patternConfig.pattern, patternConfig.replacement);
}
}
return result;
}
}

window.dateFormatter = new DateFormatter();