/**
 * SmartQeyd — Lisenziya Açarı Yaratma Aləti
 * 
 * İstifadə:
 *   node generate-key.js 30     →  Aylıq açar (30 gün)
 *   node generate-key.js 90     →  3 aylıq açar (90 gün)
 *   node generate-key.js 365    →  İllik açar (365 gün)
 *   node generate-key.js 30 5   →  5 ədəd aylıq açar
 */

const crypto = require('crypto');

function generateKey(duration = 365) {
  let prefix;
  if (duration <= 30) prefix = 'M30';
  else if (duration <= 90) prefix = 'M90';
  else prefix = 'Y1000';

  const part1 = prefix.padEnd(5, '0').substring(0, 5).toUpperCase();
  const part2 = crypto.randomBytes(3).toString('hex').toUpperCase().substring(0, 5);
  const part3 = crypto.randomBytes(3).toString('hex').toUpperCase().substring(0, 5);
  const checksum = crypto
    .createHash('md5')
    .update(part1 + part2 + part3 + 'bms_2024')
    .digest('hex')
    .substring(0, 5)
    .toUpperCase();
  return `${part1}-${part2}-${part3}-${checksum}`;
}

const duration = parseInt(process.argv[2]) || 30;
const count = parseInt(process.argv[3]) || 1;

const labels = { 30: 'Aylıq (30 gün)', 90: '3 Aylıq (90 gün)', 365: 'İllik (365 gün)' };
const label = labels[duration] || `${duration} gün`;

console.log(`\n  SmartQeyd Lisenziya Açarı — ${label}\n`);
console.log('  ' + '─'.repeat(40));

for (let i = 0; i < count; i++) {
  const key = generateKey(duration);
  console.log(`  ${i + 1}.  ${key}`);
}

console.log('  ' + '─'.repeat(40));
console.log(`\n  Müştəriyə bu açarı göndərin.`);
console.log(`  Proqramda: Lisenziya → Açarı yapışdırın → Aktivasiya et\n`);
