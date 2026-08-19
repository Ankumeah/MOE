'use strict';

const { EXPERTS } = require('./experts');

/**
 * Offline keyword router.
 *
 * Each question is scored against every expert using weighted keyword matches.
 * The raw score is converted to a confidence in [0, 1) via 1 - exp(-raw), so a
 * few strong signals yield high confidence and weak/no signals stay low.
 *
 * If the best expert's confidence is below the configured threshold the question
 * is routed to the General expert (per the spec: "route to General or ask for
 * clarification" — we route to General and say so in the routing reason).
 */

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasArithmeticExpression(q) {
  // Detect arithmetic expressions: numbers joined by +, -, *, /, ^, =, or
  // words like "plus", "times", "divided by", "squared".
  const patterns = [
    /\d\s*[+\-*/÷×^=]\s*\d/,            // e.g. 7*11, 3+5, 10/2, 2^3, x=4
    /\d\s*(plus|minus|times|divided|multiplied|mod)\b/i,  // e.g. 7 times 11
    /\b(what\s+is|calculate|compute|evaluate|solve|find|how\s+(much|many|far))\b.*\d/,
    /\d\s*[+\-*/÷×^]\s*\d\s*[+\-*/÷×^=]\s*\d/, // chained: 2+3*4
    /\bsquare\s+root\b/i,
    /\b(sqrt|Math\.|pow)\b/,
    /[∫∑√π∞≈≠≤≥]/,                      // common math symbols
  ];
  return patterns.some((re) => re.test(q));
}

function classify(question) {
  const q = String(question).toLowerCase();
  const matchKey = (kw) => {
    // Word-boundary match (phrase-safe): not preceded/followed by an
    // alphanumeric, so "ion" no longer matches inside "function".
    const re = new RegExp(`(?<![a-z0-9])${escapeRegExp(kw)}(?![a-z0-9])`);
    return re.test(q);
  };
  const arithmeticBoost = hasArithmeticExpression(q);
  return EXPERTS.map((expert) => {
    let raw = 0;
    const matched = [];
    for (const [keyword, weight] of Object.entries(expert.keywords)) {
      if (matchKey(keyword)) {
        raw += weight;
        matched.push({ keyword, weight });
      }
    }
    // Boost math expert when an arithmetic expression is detected
    if (arithmeticBoost && expert.id === 'mathematics') {
      const boost = 4;
      raw += boost;
      matched.push({ keyword: '[arithmetic expression detected]', weight: boost });
    }
    const confidence = 1 - Math.exp(-raw);
    return { expertId: expert.id, raw, confidence, matched };
  }).sort((a, b) => b.raw - a.raw);
}

function route(question, threshold) {
  const ranked = classify(question);
  const top = ranked[0];
  const second = ranked[1];
  const expert = EXPERTS.find((e) => e.id === top.expertId);
  const thresholdNum = Number(threshold);

  // If the top expert only matched weak keywords (weight <= 1), it's likely
  // a false positive from generic phrasing. Route to General instead.
  const hasStrongMatch = top.matched.some((m) => m.weight >= 2);

  let routedToGeneral = top.expertId === 'general' || top.confidence < thresholdNum || !hasStrongMatch;
  let selectedExpert = routedToGeneral ? EXPERTS.find((e) => e.id === 'general') : expert;
  let routingReason;

  if (top.expertId === 'general') {
    routingReason = 'No subject-specific indicators were found; routed directly to the General expert.';
  } else if (!hasStrongMatch) {
    routingReason =
      `Only weak/generic indicators matched (${top.matched.map((m) => m.keyword).join(', ')}). ` +
      `No domain-specific expert was confident enough. Routed to the General expert.`;
  } else if (top.confidence < thresholdNum) {
    routingReason =
      `No single expert was confident enough: best guess was ${expert.name} at ` +
      `${(top.confidence * 100).toFixed(0)}%, below the threshold of ` +
      `${(thresholdNum * 100).toFixed(0)}%. Routed to the General expert.`;
  } else {
    const indicators = top.matched.slice(0, 4).map((m) => `${m.keyword} (×${m.weight})`).join(', ');
    let reason = `Matched indicators: ${indicators || 'general phrasing'}. `;
    reason += `Highest score: ${expert.name} with confidence ${(top.confidence * 100).toFixed(1)}%. `;
    if (second && second.expertId !== top.expertId && second.confidence > 0.2 && top.raw - second.raw < 2) {
      reason += `Also considered: ${second.expertId} (${(second.confidence * 100).toFixed(0)}%).`;
    } else {
      reason += 'No other expert scored close.';
    }
    routingReason = reason;
  }

  return {
    subject: selectedExpert.subject,
    expertId: selectedExpert.id,
    expert: {
      id: selectedExpert.id,
      name: selectedExpert.name,
      description: selectedExpert.description,
      systemPrompt: selectedExpert.systemPrompt,
      color: selectedExpert.color,
    },
    confidence: Number(top.confidence.toFixed(4)),
    routingReason,
    routedToGeneral,
    candidates: ranked
      .slice(0, 4)
      .map((r) => ({
        expertId: r.expertId,
        confidence: Number(r.confidence.toFixed(4)),
        matched: r.matched.slice(0, 4).map((m) => m.keyword),
      })),
  };
}

function routeManual(question, expertId, threshold) {
  const expert = EXPERTS.find((e) => e.id === expertId);
  if (!expert) return route(question, threshold);
  return {
    subject: expert.subject,
    expertId: expert.id,
    expert: {
      id: expert.id,
      name: expert.name,
      description: expert.description,
      systemPrompt: expert.systemPrompt,
      color: expert.color,
    },
    confidence: 1,
    routingReason: 'Manual routing: this expert was selected explicitly by the user.',
    routedToGeneral: false,
    candidates: [{ expertId: expert.id, confidence: 1, matched: ['manual selection'] }],
  };
}

module.exports = { classify, route, routeManual };
