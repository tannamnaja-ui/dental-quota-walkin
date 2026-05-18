const fs   = require('fs');
const path = require('path');

// When packaged with pkg, write config to ProgramData (writable by all users).
// In dev mode, keep it next to backend root.
const CONFIG_PATH = process.pkg
  ? path.join(process.env.ProgramData || 'C:\\ProgramData', 'DentalQuotaWalkin', 'db_config.json')
  : path.join(__dirname, '../../db_config.json');

function readConfig() {
  if (!fs.existsSync(CONFIG_PATH)) return null;
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch {
    return null;
  }
}

function writeConfig(config) {
  const dir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
}

module.exports = { readConfig, writeConfig };
