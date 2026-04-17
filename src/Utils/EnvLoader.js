const fs = require('fs');

function loadEnv(filePath) {
  try {
    if (!fs.existsSync(filePath)) return;
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split(/\?\
/);
    for (const line of lines) {
      if (!line || line.startsWith('#')) continue;
      const idx = line.indexOf('=');
      if (idx === -1) continue;
      const key = line.substring(0, idx).trim();
      const val = line.substring(idx + 1).trim();
      if (key.length === 0) continue;
      let parsed = val;
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        parsed = val.slice(1, -1);
      }
      process.env[key] = parsed;
    }
  } catch (e) {
    console.error('EnvLoader error:', e);
  }
}

module.exports = { loadEnv };
