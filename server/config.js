'use strict';

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Minimal .env loader (no external dependency). Real env vars take precedence.
// ---------------------------------------------------------------------------
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  try {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = value;
    }
  } catch (err) {
    /* no .env file present — fine */
  }
}
loadEnv();

const PORT = parseInt(process.env.PORT || '3000', 10);
const DATA_DIR = path.resolve(process.env.MOE_DATA_DIR || path.join(__dirname, 'data'));

// ---------------------------------------------------------------------------
// Supported providers
// ---------------------------------------------------------------------------
const PROVIDERS = {
  openai: {
    label: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1', 'gpt-4.1-mini', 'o3-mini'],
    envKey: 'OPENAI_API_KEY',
  },
  deepseek: {
    label: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com',
    models: ['deepseek-chat', 'deepseek-reasoner'],
    envKey: 'DEEPSEEK_API_KEY',
  },
  anthropic: {
    label: 'Anthropic',
    baseUrl: 'https://api.anthropic.com',
    models: ['claude-3-5-haiku-latest', 'claude-3-5-sonnet-latest', 'claude-sonnet-4-0', 'claude-opus-4-0'],
    envKey: 'ANTHROPIC_API_KEY',
  },
  'openai-compatible': {
    label: 'OpenAI-compatible',
    baseUrl: '',
    models: [],
    envKey: null,
  },
  demo: {
    label: 'Demo (local simulation)',
    baseUrl: null,
    models: ['demo-simulator'],
    envKey: null,
  },
};

// ---------------------------------------------------------------------------
// Default pricing — USD per 1M tokens (input / output).
// These are starting values only; they are fully editable in Settings.
// ---------------------------------------------------------------------------
const DEFAULT_PRICING = {
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'gpt-4o': { input: 2.5, output: 10 },
  'gpt-4.1': { input: 2.0, output: 8.0 },
  'gpt-4.1-mini': { input: 0.4, output: 1.6 },
  'o3-mini': { input: 1.1, output: 4.4 },
  'deepseek-chat': { input: 0.27, output: 1.1 },
  'deepseek-reasoner': { input: 0.55, output: 2.19 },
  'claude-3-5-haiku-latest': { input: 0.8, output: 4.0 },
  'claude-3-5-sonnet-latest': { input: 3.0, output: 15.0 },
  'claude-sonnet-4-0': { input: 3.0, output: 15.0 },
  'claude-opus-4-0': { input: 15.0, output: 75.0 },
  'demo-simulator': { input: 0, output: 0 },
};

// ---------------------------------------------------------------------------
// Default environmental assumptions (educational estimates, user-adjustable).
// ---------------------------------------------------------------------------
const DEFAULT_ENV_ASSUMPTIONS = {
  baselineEnergyWhPerQuery: 2.9,
  moeEnergyReduction: 0.45,
  waterIntensityLPerKwh: 2.0,
  carbonIntensityKgPerKwh: 0.4,
};

const DEFAULT_SETTINGS = {
  theme: 'light',
  provider: 'demo',
  model: 'demo-simulator',
  baseUrl: '',
  routerMode: 'automatic',
  confidenceThreshold: 0.35,
  environmentalAssumptions: DEFAULT_ENV_ASSUMPTIONS,
  pricing: DEFAULT_PRICING,
};

module.exports = {
  PORT,
  DATA_DIR,
  PROVIDERS,
  DEFAULT_PRICING,
  DEFAULT_ENV_ASSUMPTIONS,
  DEFAULT_SETTINGS,
  env: process.env,
};
