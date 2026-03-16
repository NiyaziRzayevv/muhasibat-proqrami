// PNG -> ICO converter (no dependencies) + apply to exe files
const fs = require('fs');
const path = require('path');

const pngPath = path.join(__dirname, 'assets', 'logo.png');
const icoPath = path.join(__dirname, 'assets', 'logo.ico');
const buildIcoPath = path.join(__dirname, 'build', 'icon.ico');

// Modern ICO format: embed PNG data directly (supported Win Vista+)
function pngToIco(pngBuffer) {
  const width = 0;   // 0 = 256
  const height = 0;  // 0 = 256
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);  // reserved
  header.writeUInt16LE(1, 2);  // type: 1 = ICO
  header.writeUInt16LE(1, 4);  // count: 1 image

  const entry = Buffer.alloc(16);
  entry.writeUInt8(width, 0);
  entry.writeUInt8(height, 1);
  entry.writeUInt8(0, 2);   // color count
  entry.writeUInt8(0, 3);   // reserved
  entry.writeUInt16LE(1, 4);  // planes
  entry.writeUInt16LE(32, 6); // bit count
  entry.writeUInt32LE(pngBuffer.length, 8);  // bytes in resource
  entry.writeUInt32LE(22, 12); // offset: header(6) + entry(16) = 22

  return Buffer.concat([header, entry, pngBuffer]);
}

// Read PNG and create ICO
const pngBuffer = fs.readFileSync(pngPath);
const icoBuffer = pngToIco(pngBuffer);

// Ensure build folder exists
fs.mkdirSync(path.join(__dirname, 'build'), { recursive: true });

fs.writeFileSync(icoPath, icoBuffer);
fs.writeFileSync(buildIcoPath, icoBuffer);
console.log('ICO created:', icoPath);

// Apply icon to exe files using rcedit
const { execSync } = require('child_process');

// Find latest rcedit-x64.exe
const cacheDir = path.join(process.env.LOCALAPPDATA || '', 'electron-builder', 'Cache', 'winCodeSign');
let rcedit = null;
if (fs.existsSync(cacheDir)) {
  const dirs = fs.readdirSync(cacheDir).sort().reverse();
  for (const d of dirs) {
    const r = path.join(cacheDir, d, 'rcedit-x64.exe');
    if (fs.existsSync(r)) { rcedit = r; break; }
  }
}

if (!rcedit) {
  console.log('rcedit not found, skipping exe icon patch');
  process.exit(0);
}
console.log('Using rcedit:', rcedit);

const exeFiles = [
  path.join(__dirname, 'dist-electron', 'win-unpacked', 'Servis \u0130dar\u0259etm\u0259.exe'),
  path.join(__dirname, 'dist-electron', 'Servis-Idareetme-win32-x64', 'Servis-Idareetme.exe'),
  path.join(__dirname, 'dist-electron', 'SmartQeyd-win32-x64', 'SmartQeyd.exe'),
];

for (const exeFile of exeFiles) {
  if (!fs.existsSync(exeFile)) {
    console.log('Not found, skipping:', exeFile);
    continue;
  }
  try {
    execSync(`"${rcedit}" "${exeFile}" --set-icon "${icoPath}"`, { stdio: 'inherit' });
    console.log('Icon set for:', path.basename(exeFile));
  } catch (e) {
    console.error('Failed for', path.basename(exeFile), ':', e.message);
  }
}

console.log('Done!');
