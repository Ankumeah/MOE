'use strict';

const path = require('path');
const express = require('express');

const { PORT, PROVIDERS, DEFAULT_ENV_ASSUMPTIONS, DEFAULT_PRICING } = require('./config');
const store = require('./store');
const { EXPERTS } = require('./experts');
const { route, routeManual } = require('./router');
const { countTokens } = require('./tokenizer');
const metrics = require('./metrics');
const providers = require('./providers');
const { demoAnswer } = require('./demo');

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, '..', 'public')), {
  setHeaders: (res, path) => {
    if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
  }
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const uid = () => `q_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
const maskKey = (key) => (key ? `••••${String(key).slice(-4)}` : '');

// ---------------------------------------------------------------------------
// Chat pipeline
// ---------------------------------------------------------------------------
app.post('/api/chat', async (req, res) => {
  try {
    const { question, expertId } = req.body || {};
    if (!question || !String(question).trim()) {
      return res.status(400).json({ error: 'A question is required.' });
    }
    const questionText = String(question).trim().slice(0, 4000);

    const settings = store.getSettings();
    const { routerMode, confidenceThreshold } = settings;

    const routed =
      routerMode === 'manual' && expertId
        ? routeManual(questionText, expertId, confidenceThreshold)
        : route(questionText, confidenceThreshold);

    const systemPrompt = routed.expert.systemPrompt;
    const inputText = `${systemPrompt}\n\nUser question: ${questionText}`;
    const inputTokens = countTokens(inputText);

    const model = settings.model;
    const provider = settings.provider;
    const apiKey = store.getApiKey(provider);

    let useDemo = provider === 'demo' || routerMode === 'demo' || !apiKey;
    let demoReason = '';
    if (useDemo) {
      demoReason =
        provider === 'demo' || routerMode === 'demo'
          ? 'Demo mode is selected in Settings.'
          : 'No API key is configured for this provider; fell back to Demo Mode.';
    }

    const start = Date.now();
    let answer;
    let source;
    if (useDemo) {
      await sleep(400 + Math.random() * 400);
      answer = demoAnswer(routed.expertId, questionText);
      source = 'demo';
    } else {
      try {
        answer = await providers.complete({
          provider,
          apiKey,
          model,
          baseUrl: settings.baseUrl,
          systemPrompt,
          question: questionText,
        });
        source = 'api';
      } catch (err) {
        return res.status(502).json({ error: `API error: ${err.message}` });
      }
    }
    const responseTimeMs = Date.now() - start;
    const outputTokens = countTokens(answer);

    const denseInputTokens = EXPERTS.reduce(
      (sum, e) => sum + countTokens(`${e.systemPrompt}\n\nUser question: ${questionText}`),
      0
    );

    const tokenMetrics = metrics.computeTokenMetrics({ inputTokens, outputTokens, denseInputTokens });
    const costMetrics = metrics.computeCostMetrics({
      inputTokens,
      outputTokens,
      denseInputTokens,
      pricing: settings.pricing,
      model,
    });
    const env = metrics.computeEnvironmentalMetrics({ assumptions: settings.environmentalAssumptions });

    const record = {
      id: uid(),
      timestamp: new Date().toISOString(),
      question: questionText,
      subject: routed.subject,
      confidence: Number(routed.confidence.toFixed(4)),
      expert: routed.expertId,
      expertName: routed.expert.name,
      routingReason: routed.routingReason,
      routedToGeneral: routed.routedToGeneral,
      promptSent: inputText,
      answer,
      source,
      demo: useDemo,
      demoReason,
      model,
      provider,
      responseTimeMs,
      routerMode,
      ...tokenMetrics,
      ...costMetrics,
    };
    metrics.applyEnvironmentalToRecord(record, env);

    store.addHistory(record);

    res.json({
      record,
      candidateExperts: routed.candidates,
      expertsActivated: 1,
      expertsAvailable: EXPERTS.length,
      systemInfo: {
        demo: useDemo,
        reason: demoReason || 'Live provider',
        source,
        router: routed.routedToGeneral ? 'general' : routed.expertId,
        threshold: confidenceThreshold,
      },
    });
  } catch (err) {
    console.error('[chat]', err);
    res.status(500).json({ error: 'Unexpected server error: ' + err.message });
  }
});

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------
app.get('/api/settings', (req, res) => {
  const s = store.getSettings();
  const configured = store.apiKeyConfigured(s.provider);
  res.json({
    settings: s,
    providers: PROVIDERS,
    apiKeyConfigured: configured,
    apiKeyMasked: maskKey(store.getApiKey(s.provider)),
    defaults: {
      pricing: DEFAULT_PRICING,
      environmentalAssumptions: DEFAULT_ENV_ASSUMPTIONS,
      confidenceThreshold: 0.35,
    },
  });
});

app.put('/api/settings', (req, res) => {
  const body = req.body || {};
  const patch = body.settings || body;
  const updated = store.updateSettings(patch);

  // API keys are handled server-side only. The browser sends an apiKey value
  // only when the user actually typed a new one (never sent back to the client).
  if (body.apiKey !== undefined && body.provider && body.provider !== 'demo') {
    const key = String(body.apiKey || '').trim();
    if (!key.startsWith('••')) store.setApiKey(body.provider, key);
  }

  res.json({
    ok: true,
    settings: store.getSettings(),
    apiKeyConfigured: store.apiKeyConfigured(updated.provider),
    apiKeyMasked: maskKey(store.getApiKey(updated.provider)),
  });
});

app.post('/api/providers/test', async (req, res) => {
  try {
    const { provider, model, apiKey, baseUrl } = req.body || {};
    if (!provider) return res.status(400).json({ ok: false, message: 'Provider is required.' });
    const candidate =
      apiKey && !String(apiKey).startsWith('••') ? String(apiKey).trim() : store.getApiKey(provider);
    const result = await providers.testConnection({
      provider,
      apiKey: candidate,
      model,
      baseUrl,
    });
    res.json(result);
  } catch (err) {
    res.status(502).json({ ok: false, message: err.message });
  }
});

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------
app.get('/api/history', (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase();
  let rows = store.getHistory();
  if (q) {
    rows = rows.filter(
      (r) =>
        (r.question || '').toLowerCase().includes(q) ||
        (r.subject || '').toLowerCase().includes(q) ||
        (r.expertName || r.expert || '').toLowerCase().includes(q)
    );
  }
  const offset = Math.max(0, parseInt(req.query.offset || '0', 10));
  const limit = Math.min(200, Math.max(1, parseInt(req.query.limit || '50', 10)));
  let stripped = rows.slice(offset, offset + limit);
  if (req.query.full !== '1') {
    stripped = stripped.map((r) => {
      const { promptSent, answer, ...rest } = r;
      return rest;
    });
  }
  res.json({ total: rows.length, offset, limit, records: stripped });
});

app.get('/api/history/:id', (req, res) => {
  const record = store.getHistory().find((r) => r.id === req.params.id);
  if (!record) return res.status(404).json({ error: 'Record not found.' });
  res.json({ record });
});

app.delete('/api/history/:id', (req, res) => {
  const removed = store.deleteHistory(req.params.id);
  res.json({ ok: true, removed });
});

app.delete('/api/history', (req, res) => {
  store.clearHistory();
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Statistics / aggregates
// ---------------------------------------------------------------------------
app.get('/api/stats', (req, res) => {
  const history = store.getHistory();
  const total = history.length;
  const sum = (k) => history.reduce((a, r) => a + (r[k] || 0), 0);
  const totalTokens = sum('totalTokens');

  const perExpert = {};
  for (const r of history) {
    perExpert[r.expert] = perExpert[r.expert] || {
      queries: 0,
      totalTokens: 0,
      energyEstimate: 0,
      responseMs: 0,
    };
    perExpert[r.expert].queries += 1;
    perExpert[r.expert].totalTokens += r.totalTokens || 0;
    perExpert[r.expert].energyEstimate += r.energyEstimate || 0;
    perExpert[r.expert].responseMs += r.responseTimeMs || 0;
  }
  for (const k of Object.keys(perExpert)) {
    perExpert[k].avgResponseMs = perExpert[k].queries
      ? Math.round(perExpert[k].responseMs / perExpert[k].queries)
      : 0;
    perExpert[k].name = (EXPERTS.find((e) => e.id === k) || {}).name || k;
    perExpert[k].color = (EXPERTS.find((e) => e.id === k) || {}).color || '#64748b';
  }

  const mostUsedExpert = total
    ? Object.entries(perExpert).sort((a, b) => b[1].queries - a[1].queries)[0][0]
    : null;
  const avgConfidence = total ? history.reduce((a, r) => a + (r.confidence || 0), 0) / total : 0;
  const avgResponseTime = total ? history.reduce((a, r) => a + (r.responseTimeMs || 0), 0) / total : 0;
  const denseEquivalentTokens = sum('denseEquivalentTokens');
  const tokensSaved = sum('tokensSaved');

  res.json({
    totalQueries: total,
    inputTokens: sum('inputTokens'),
    outputTokens: sum('outputTokens'),
    totalTokens,
    denseEquivalentTokens,
    tokensSaved,
    tokenReductionPct: denseEquivalentTokens
      ? Number(((tokensSaved / denseEquivalentTokens) * 100).toFixed(2))
      : 0,
    cost: sum('cost'),
    denseCost: sum('denseCost'),
    costSaved: sum('costSaved'),
    energyEstimate: sum('energyEstimate'),
    energySaved: sum('energySaved'),
    waterEstimate: sum('waterEstimate'),
    waterSaved: sum('waterSaved'),
    co2Estimate: sum('co2Estimate'),
    co2Saved: sum('co2Saved'),
    perExpert,
    mostUsedExpert,
    mostUsedExpertName: mostUsedExpert
      ? (EXPERTS.find((e) => e.id === mostUsedExpert) || {}).name
      : null,
    avgConfidence: Number(avgConfidence.toFixed(4)),
    avgResponseTime: Math.round(avgResponseTime),
    expertsAvailable: EXPERTS.length,
    expertsActivated: new Set(history.map((r) => r.expert)).size,
    activeExpert: total ? history[0].expert : null,
  });
});

app.get('/api/experts', (req, res) => {
  const history = store.getHistory();
  const activeExpert = history.length ? history[0].expert : null;
  const experts = EXPERTS.map((e) => {
    const rows = history.filter((r) => r.expert === e.id);
    const totalTokens = rows.reduce((a, r) => a + (r.totalTokens || 0), 0);
    const avgResponse = rows.length
      ? rows.reduce((a, r) => a + (r.responseTimeMs || 0), 0) / rows.length
      : 0;
    const energy = rows.reduce((a, r) => a + (r.energyEstimate || 0), 0);
    return {
      id: e.id,
      name: e.name,
      subject: e.subject,
      description: e.description,
      color: e.color,
      icon: e.icon,
      status: e.id === activeExpert ? 'active' : 'idle',
      queries: rows.length,
      totalTokens,
      avgResponseMs: Math.round(avgResponse),
      energyEstimateWh: Number(energy.toFixed(2)),
    };
  });
  res.json({ experts, activeExpert });
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'moe-ai', time: new Date().toISOString() });
});

// JSON error handler
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  res.status(500).json({ error: err.message || 'Server error' });
});

app.listen(PORT, () => {
  console.log(`MoE AI running at http://localhost:${PORT}`);
});
