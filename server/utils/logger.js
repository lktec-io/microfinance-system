const levels = { info: '💬', warn: '⚠️ ', error: '❌', success: '✅' };

function stamp() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

const logger = {
  info:    (msg) => console.log(`[${stamp()}] ${levels.info}  ${msg}`),
  warn:    (msg) => console.warn(`[${stamp()}] ${levels.warn} ${msg}`),
  error:   (msg, err) => console.error(`[${stamp()}] ${levels.error} ${msg}`, err?.message || ''),
  success: (msg) => console.log(`[${stamp()}] ${levels.success} ${msg}`),
};

module.exports = logger;
