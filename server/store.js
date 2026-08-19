'use strict';

const fs = require('fs');
const path = require('path');
const { DATA_DIR, DEFAULT_SETTINGS, PROVIDERS } = require('./config');

function num(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Persistence layer.
 *  - db.json        -> settings + chat history (append-heavy, human readable)
 *  - secrets.json   -> API keys, written with 0600 permissions. Never served to
 *                      the browser; environment variables take precedence.
 */
class Store {
  constructor() {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    this.dbPath = path.join(DATA_DIR, 'db.json');
    this.keysPath = path.join("/etc", "secrets", 'secrets.json');
    this.db = { settings: null, history: [] };
    this.keys = {};
    this._load();
  }

  _load() {
    try {
      const raw = JSON.parse(fs.readFileSync(this.dbPath, 'utf8'));
      this.db.settings = { ...structuredClone(DEFAULT_SETTINGS), ...(raw.settings || {}) };
      this.db.history = Array.isArray(raw.history) ? raw.history : [];
    } catch (err) {
      this.db.settings = structuredClone(DEFAULT_SETTINGS);
      this.db.history = [];
    }
    try {
      this.keys = JSON.parse(fs.readFileSync(this.keysPath, 'utf8'));
    } catch (err) {
      this.keys = {};
    }
    this._flush();
  }

  _flush() {
    try {
      fs.writeFileSync(this.dbPath, JSON.stringify(this.db, null, 2));
    } catch (err) {
      console.error('[store] failed to persist db:', err.message);
    }
  }

  _persistKeys() {
    try {
      fs.writeFileSync(this.keysPath, JSON.stringify(this.keys, null, 2), { mode: 0o600 });
    } catch (err) {
      console.error('[store] failed to persist secrets:', err.message);
    }
  }

  // ---- settings ----------------------------------------------------------
  getSettings() {
    return this.db.settings;
  }

  updateSettings(patch) {
    const s = this.db.settings;
    if (patch.theme !== undefined && ['light', 'dark', 'system'].includes(patch.theme)) {
      s.theme = patch.theme;
    }
    if (patch.provider !== undefined) s.provider = patch.provider;
    if (patch.model !== undefined && patch.model !== null) s.model = String(patch.model).trim() || s.model;
    if (patch.baseUrl !== undefined) s.baseUrl = String(patch.baseUrl || '').trim();
    if (patch.routerMode !== undefined && ['automatic', 'manual', 'demo'].includes(patch.routerMode)) {
      s.routerMode = patch.routerMode;
    }
    if (patch.confidenceThreshold !== undefined) {
      s.confidenceThreshold = Math.min(1, Math.max(0, num(patch.confidenceThreshold, s.confidenceThreshold)));
    }
    if (patch.environmentalAssumptions) {
      const a = s.environmentalAssumptions;
      const d = DEFAULT_SETTINGS.environmentalAssumptions;
      for (const key of Object.keys(d)) {
        if (patch.environmentalAssumptions[key] !== undefined) {
          a[key] = Math.max(0, num(patch.environmentalAssumptions[key], d[key]));
        }
      }
    }
    if (patch.pricing) {
      for (const [model, p] of Object.entries(patch.pricing)) {
        if (p && p.input !== undefined && p.output !== undefined) {
          s.pricing[model] = {
            input: Math.max(0, num(p.input, 0)),
            output: Math.max(0, num(p.output, 0)),
          };
        }
      }
    }
    this._flush();
    return s;
  }

  // ---- API keys (server-side only) ----------------------------------------
  getApiKey(provider) {
    if (!provider || provider === 'demo') return '';
    const envName = PROVIDERS[provider] && PROVIDERS[provider].envKey;
    if (envName && process.env[envName]) return process.env[envName];
    return this.keys[provider] || '';
  }

  setApiKey(provider, key) {
    if (!provider || provider === 'demo') return;
    this.keys[provider] = String(key || '').trim();
    this._persistKeys();
  }

  apiKeyConfigured(provider) {
    return Boolean(this.getApiKey(provider));
  }

  // ---- history -------------------------------------------------------------
  addHistory(record) {
    this.db.history.unshift(record);
    if (this.db.history.length > 5000) this.db.history.length = 5000;
    this._flush();
    return record;
  }

  getHistory() {
    return this.db.history;
  }

  deleteHistory(id) {
    const before = this.db.history.length;
    this.db.history = this.db.history.filter((r) => r.id !== id);
    if (this.db.history.length !== before) this._flush();
    return before !== this.db.history.length;
  }

  clearHistory() {
    this.db.history = [];
    this._flush();
  }
}

module.exports = new Store();
