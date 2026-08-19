'use strict';

const { PROVIDERS } = require('./config');

const DEFAULT_BASE = {
  openai: 'https://api.openai.com/v1',
  deepseek: 'https://api.deepseek.com',
  anthropic: 'https://api.anthropic.com',
  'openai-compatible': 'https://api.openai.com/v1',
};

function resolveBaseUrl(provider, configured) {
  if (configured && String(configured).trim()) {
    return String(configured).trim().replace(/\/+$/, '');
  }
  return DEFAULT_BASE[provider] || '';
}

function providerError(res, provider) {
  let message = `Provider returned HTTP ${res.status}`;
  try {
    const raw = res.body;
    if (raw && typeof raw === 'string') {
      const data = JSON.parse(raw);
      message = (data.error && (data.error.message || data.error)) || raw.slice(0, 300);
    }
  } catch (err) {
    /* ignore */
  }
  return new Error(String(message));
}

async function completeOpenAICompatible({ provider, apiKey, model, baseUrl, systemPrompt, question }) {
  const base = resolveBaseUrl(provider, baseUrl);
  if (!apiKey) throw new Error('No API key configured for this provider.');
  if (!base) throw new Error('A Base URL is required for this provider.');

  let res;
  try {
    res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question },
        ],
        temperature: 0.4,
        max_tokens: 1024,
      }),
    });
  } catch (err) {
    throw new Error(`Network error talking to ${base}: ${err.message}`);
  }
  if (!res.ok) throw providerError(res, provider);
  const data = await res.json();
  const text = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  if (!text) throw new Error('Provider returned an empty response.');
  return String(text);
}

async function completeAnthropic({ apiKey, model, baseUrl, systemPrompt, question }) {
  const base = resolveBaseUrl('anthropic', baseUrl);
  if (!apiKey) throw new Error('No API key configured for this provider.');

  let res;
  try {
    res = await fetch(`${base}/v1/messages`, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        system: systemPrompt,
        messages: [{ role: 'user', content: question }],
        max_tokens: 1024,
        temperature: 0.4,
      }),
    });
  } catch (err) {
    throw new Error(`Network error talking to ${base}: ${err.message}`);
  }
  if (!res.ok) throw providerError(res, provider);
  const data = await res.json();
  const text = data && data.content && data.content[0] && data.content[0].text;
  if (!text) throw new Error('Provider returned an empty response.');
  return String(text);
}

async function complete({ provider, apiKey, model, baseUrl, systemPrompt, question }) {
  if (provider === 'anthropic') {
    return completeAnthropic({ apiKey, model, baseUrl, systemPrompt, question });
  }
  return completeOpenAICompatible({ provider, apiKey, model, baseUrl, systemPrompt, question });
}

async function testConnection({ provider, apiKey, model, baseUrl }) {
  const providerMeta = PROVIDERS[provider];
  if (!providerMeta) throw new Error(`Unknown provider: ${provider}`);
  if (provider === 'demo') {
    return { ok: true, mode: 'demo', message: 'Demo mode — no external API required.' };
  }
  if (!apiKey) throw new Error('No API key configured. Add one in Settings, or use Demo Mode.');
  const start = Date.now();
  try {
    await complete({
      provider,
      apiKey,
      model: model || (providerMeta.models && providerMeta.models[0]),
      baseUrl,
      systemPrompt: 'You are a connectivity test. Reply with exactly: OK',
      question: 'Reply with exactly: OK',
    });
    return { ok: true, mode: 'api', message: `Connected to ${providerMeta.label} successfully.`, latencyMs: Date.now() - start };
  } catch (err) {
    throw new Error(`Connection failed: ${err.message}`);
  }
}

module.exports = { complete, testConnection, resolveBaseUrl };
