#!/usr/bin/env node
/**
 * Приводит @version и ?v= в @require к дате последнего коммита словаря.
 *
 * Формат версии: <движок>-<YYYY-MM-DD-HHMM словаря>, например 3.1.0-20261018-1432.
 * Движок меняется вручную, метка словаря — автоматически, поэтому Tampermonkey
 * видит новый @require и не берёт старый из кэша.
 *
 * Метка включает время, а не только дату: две правки словаря в один день иначе
 * дали бы одну версию, и вторая правка не доехала бы до пользователей.
 */
'use strict';

const { execFileSync } = require('node:child_process');
const path = require('node:path');

const SCRIPT_PATH = 'scripts/Nexus Russian Localizer/NRL.user.js';
const DICTIONARY_PATH = 'scripts/Nexus Russian Localizer/translations.js';

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

function readFile(file) {
  return require('node:fs').readFileSync(path.join(process.cwd(), file), 'utf8');
}

function writeFile(file, content) {
  require('node:fs').writeFileSync(path.join(process.cwd(), file), content, 'utf8');
}

const timestamp = Number(git(['log', '-1', '--format=%at', '--', DICTIONARY_PATH]));
if (!Number.isFinite(timestamp) || timestamp === 0) {
  console.error(`Не удалось определить дату коммита ${DICTIONARY_PATH}`);
  process.exit(1);
}

const stamp = new Date(timestamp * 1000);
const year = stamp.getUTCFullYear();
const month = String(stamp.getUTCMonth() + 1).padStart(2, '0');
const day = String(stamp.getUTCDate()).padStart(2, '0');
const hours = String(stamp.getUTCHours()).padStart(2, '0');
const minutes = String(stamp.getUTCMinutes()).padStart(2, '0');
// Метка строится из идущих подряд цифр, чтобы менеджер скриптов
// сравнивал её как число и новая всегда была больше предыдущей.
const label = `${year}${month}${day}-${hours}${minutes}`;

let content = readFile(SCRIPT_PATH);

const versionMatch = content.match(/^(\/\/ @version\s+)(\S+)$/m);
if (!versionMatch) {
  console.error('Не найдена строка @version в ' + SCRIPT_PATH);
  process.exit(1);
}

// Всё до первого дефиса — версия движка, её не трогаем.
const engineVersion = versionMatch[2].split('-')[0];
const nextVersion = `${engineVersion}-${label}`;

content = content.replace(/^(\/\/ @version\s+)\S+$/m, `$1${nextVersion}`);
content = content.replace(/(\?v=)[\w.\-]+/g, `$1${nextVersion}`);

writeFile(SCRIPT_PATH, content);
console.log(`Версия словаря: ${versionMatch[2]} -> ${nextVersion}`);
