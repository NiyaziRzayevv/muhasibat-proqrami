const fs = require('fs');
const path = require('path');

let logDir = null;
let logFile = null;
const MAX_LOG_BYTES = 5 * 1024 * 1024; // 5 MB rotate

function init(userDataPath) {
  logDir = path.join(userDataPath, 'logs');
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
  logFile = path.join(logDir, 'app.log');
  rotateIfNeeded();
}

function rotateIfNeeded() {
  try {
    if (logFile && fs.existsSync(logFile)) {
      const stat = fs.statSync(logFile);
      if (stat.size > MAX_LOG_BYTES) {
        const arch = logFile.replace('.log', `-${Date.now()}.log`);
        fs.renameSync(logFile, arch);
      }
    }
  } catch (_) {}
}

function write(level, category, message, data) {
  const ts = new Date().toISOString();
  const line = JSON.stringify({ ts, level, category, message, ...(data ? { data } : {}) });
  // Always print to console
  const consoleFn = level === 'ERROR' ? console.error : level === 'WARN' ? console.warn : console.log;
  consoleFn(`[${ts}] [${level}] [${category}] ${message}`, data !== undefined ? data : '');
  // Write to file if initialized
  if (logFile) {
    try { fs.appendFileSync(logFile, line + '\n', 'utf8'); } catch (_) {}
  }
}

const logger = {
  init,
  info:  (cat, msg, data) => write('INFO',  cat, msg, data),
  warn:  (cat, msg, data) => write('WARN',  cat, msg, data),
  error: (cat, msg, data) => write('ERROR', cat, msg, data),
  debug: (cat, msg, data) => write('DEBUG', cat, msg, data),

  // Semantic helpers
  rawInput:    (text)    => write('INFO',  'RAW_INPUT',          text),
  parsed:      (result)  => write('INFO',  'PARSED_RESULT',      JSON.stringify(result)),
  dbInsert:    (table, id) => write('INFO', 'DB_INSERT',         `${table} id=${id}`),
  dbQuery:     (table, filter) => write('DEBUG', 'DB_QUERY',     `${table} ${JSON.stringify(filter)}`),
  totalCalc:   (label, val)  => write('INFO',  'TOTAL_RECALCULATED', `${label} = ${val}`),
  errorLog:    (source, err) => write('ERROR', 'ERROR_LOG',      `[${source}] ${err?.message || err}`, err?.stack),

  getLogPath: () => logFile,
  getLogDir:  () => logDir,
};

module.exports = logger;
