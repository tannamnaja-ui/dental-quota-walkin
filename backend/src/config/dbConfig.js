const fs   = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '../../db_config.json');

function readConfig() {
  if (!fs.existsSync(CONFIG_PATH)) return null;
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch {
    return null;
  }
}

function writeConfig(config) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
}

module.exports = { readConfig, writeConfig };
