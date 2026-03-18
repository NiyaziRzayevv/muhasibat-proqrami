#!/usr/bin/env node
/**
 * SmartQeyd License Generator - Admin Tool
 * 
 * Usage:
 *   node license-generator.js --deviceId=ABCD1234 --type=lifetime
 *   node license-generator.js --deviceId=ABCD1234 --type=timed --days=365
 *   node license-generator.js --deviceId=ABCD1234 --type=trial --days=14
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// ─── RSA PRIVATE KEY ───────────────────────────────────────────────────────
const PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDHVEsI8k4GyQBT
8QFsMA8GC1LWL4j+Dwigq95IaNzSuorhtklH1SmyXG6N0k2PUdbgCEqak4e/52fE
LccjpxEbGZokVGKHQ8ILRjs5LzBoGzygXd6B2iyk9KcRexXrQTbm9kJg5X2RHVSL
nkSDazYOkF8os4fpSwwr/FSifsD2MLDGC7rHWL0PzHYjTlGaumjx89wQc+77nUT6
qp1v2mfVIx8n1wtS5KQfBNzUEdQ8A+cRHXPh7hqKj+ocdoOpEV7YcG2Agf2zSl5z
ZVfGtvvyM14dGGyEXxBr8IUWZECAuraYYdkp30enFA6gQsVXFC2PyTv8mm9zfjV/
8e65hO6JAgMBAAECggEAAwHbzvL+593M9jc+3v+7nkr58TbO4YxfBDOLmzqPyFMd
qMmcAewuoJ0B4vxfBLBGpmMhowLiS6wlVeGd7UUGPkss1ur6AJHuYcapupNibtOo
XsADzSA6R7PUOHCLtFyrxCDHgBg+RHv1jFSzMmth6abWdLH+tS+Xa6t3KGtypFQx
aXYQycH8+6NJggxJKYyEusLYeBQnWDD/LLwo+U2es3lInVHQKKrsOXFiaWk+11Zt
iv+i7WW1YMleORZUjsg3MbSHxBMssngnV9YRR0aHN33KqpIJe/h2RnK3UWkLYnwc
ScpIbzArGiJLMtfyzol80rdrNhM7jqzKXv7dGhOGjQKBgQDk6DMLn2+IIZOuzKRh
9HICuJ7NkKF7Wmw1bNH+pDM7b5eRRLup/ACDdhICreYDzormAtwqVugBAfG3ONWi
OkmUzJqkn8I26zxqQc3RVkGiBc2wrKwzfObxNxpY7kasoOT7OJnqDt7Q7md2fKkN
ymhnyUJNdx/N3/aDVOInfnua7QKBgQDe6+X0Ix1AKR6Gpyyh9CszFL3Kv5y/RbUC
79KceY2rXn5kPXx6ZOp/tzmz0XdJYhNY2J0XTiTnXt6JP4dXFFlefQ0if80794n0
+Rt57DQ8mLORxWxF+Qx64oEuIWteh97aRnQurREWprTsQArz0LBW+QRkyAi9bu7s
7pwE3g3CjQKBgB8e6oG0BWfOmNN1AwxGPZHdI8ny1eF9Y6THzK0ACe8UttiLLbBo
kHFPBhfTKKhv1jZ7QQ+IjTZF22T7lx/dKM/QGV40UiVBSg9wLtk9DuNGQra4YxkE
7CjzQuPAUV966Ga3RUWrC+P/5ZUYUauMTzF9DUSW434L6unkCnMwIQHpAoGBAIIR
hE/puSR5mY0Zt+obTKV2YbMOEEhuRMqc4fdY2Td3YCne0mWbwlOYtftcqcxQhFdf
tHEnsFKrwQ612aMOhYKjVmmdxkNKEN22B7kg/+2nb4cLeTxur0B4LsWazEoQ3w/e
8eVWJ9VemcwLJhjS2EE29MBVEvxs4M2v/6q7Ya31AoGBAMDEofEXDiNBD6zF2hdn
q7jlRo9TJcboV776QxyfJLutfDAW6g7jfcLzzKYJslHJWMqBdOxJPYtWEKEfXdrI
E/SHbNnnP2+NCNNtiMx96aSzOVacDSQBoPaMzK9JyE8kGhRARKYo6TEUD9A5B0Pk
ZAKoq0RdNrwisxik1w59h3V9
-----END PRIVATE KEY-----`;

function signLicense(licenseJson) {
  const sign = crypto.createSign('SHA256');
  sign.update(JSON.stringify(licenseJson));
  sign.end();
  return sign.sign(PRIVATE_KEY, 'base64');
}

function generateLicense(deviceId, type, days) {
  const license = {
    licenseId: crypto.randomUUID(),
    product: 'SmartQeyd',
    deviceId: deviceId.toUpperCase(),
    type: type, // 'trial' | 'timed' | 'lifetime'
    expiresAt: type === 'lifetime' ? null : new Date(Date.now() + days * 86400000).toISOString(),
    maxRuns: null,
    issuedAt: new Date().toISOString(),
  };

  const signature = signLicense(license);
  const licenseKey = Buffer.from(JSON.stringify(license)).toString('base64') + '.' + signature;

  return { license, signature, licenseKey };
}

// ─── Interactive CLI ───────────────────────────────────────────────────────
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
function ask(q) { return new Promise(r => rl.question(q, r)); }

async function main() {
  // Check CLI args first
  const args = {};
  process.argv.slice(2).forEach(a => {
    const [k, v] = a.replace(/^--/, '').split('=');
    args[k] = v;
  });

  let deviceId = args.deviceId;
  let type = args.type;
  let days = parseInt(args.days) || 365;

  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║   SmartQeyd License Generator v1.0       ║');
  console.log('╚══════════════════════════════════════════╝\n');

  if (!deviceId) {
    deviceId = await ask('Device ID: ');
  }
  if (!type) {
    console.log('  1) lifetime - Ömürlük');
    console.log('  2) timed    - Müddətli');
    console.log('  3) trial    - Sınaq');
    const choice = await ask('\nTip seçin (1/2/3): ');
    type = { '1': 'lifetime', '2': 'timed', '3': 'trial' }[choice] || 'timed';
  }
  if (type !== 'lifetime' && !args.days) {
    const d = await ask('Müddət (gün) [365]: ');
    days = parseInt(d) || 365;
  }

  console.log('\n─── Parametrlər ───');
  console.log(`  Device ID: ${deviceId}`);
  console.log(`  Tip:       ${type}`);
  if (type !== 'lifetime') console.log(`  Müddət:    ${days} gün`);

  const result = generateLicense(deviceId, type, days);

  console.log('\n─── Lisenziya ───');
  console.log(JSON.stringify(result.license, null, 2));

  console.log('\n─── Lisenziya Açarı (bunu istifadəçiyə verin) ───');
  console.log(result.licenseKey);

  // Save to file
  const filename = `license_${deviceId.substring(0, 8)}_${type}.lic`;
  fs.writeFileSync(filename, result.licenseKey, 'utf8');
  console.log(`\n✓ Fayla yazıldı: ${filename}`);

  rl.close();
}

// Also export for programmatic use
module.exports = { generateLicense, signLicense };

// Run if called directly
if (require.main === module) {
  main().catch(e => { console.error(e); process.exit(1); });
}
