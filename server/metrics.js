'use strict';

/**
 * Metrics engine.
 *
 * ACTUAL       — measured directly by this application (token counts from the
 *                local tokenizer, response time).
 * ESTIMATED    — derived from assumptions (cost from token counts × price,
 *                environmental figures from energy/water/carbon assumptions).
 * HYPOTHETICAL — comparison against a simulated dense architecture where every
 *                expert processes the question.
 */

function computeTokenMetrics({ inputTokens, outputTokens, denseInputTokens }) {
  const totalTokens = inputTokens + outputTokens;
  const denseEquivalentTokens = denseInputTokens + outputTokens;
  const tokensSaved = Math.max(0, denseEquivalentTokens - totalTokens);
  const tokenReductionPct =
    denseEquivalentTokens > 0 ? (tokensSaved / denseEquivalentTokens) * 100 : 0;
  return {
    inputTokens,
    outputTokens,
    totalTokens,
    denseEquivalentTokens,
    tokensSaved,
    tokenReductionPct: Number(tokenReductionPct.toFixed(2)),
  };
}

function computeCostMetrics({ inputTokens, outputTokens, denseInputTokens, pricing, model }) {
  const p = (pricing && pricing[model]) || { input: 0, output: 0 };
  const inputPrice = Number(p.input) || 0;
  const outputPrice = Number(p.output) || 0;
  const cost = (inputTokens * inputPrice + outputTokens * outputPrice) / 1e6;
  const denseCost = (denseInputTokens * inputPrice + outputTokens * outputPrice) / 1e6;
  const costSaved = Math.max(0, denseCost - cost);
  return {
    cost: Number(cost.toFixed(8)),
    denseCost: Number(denseCost.toFixed(8)),
    costSaved: Number(costSaved.toFixed(8)),
    inputPrice,
    outputPrice,
  };
}

/**
 * Environmental model. All figures are ESTIMATES built from user-adjustable
 * assumptions; this application cannot measure a provider's real data-centre
 * resources.
 *
 *   energy = queries × energyPerQuery            (baseline or MoE scenario)
 *   water  = energy[kWh] × waterIntensityLPerKwh
 *   co2    = energy[kWh] × carbonIntensityKgPerKwh
 *
 * Savings are the difference between the configured dense baseline and the
 * modelled sparse-MoE scenario.
 */
function computeEnvironmentalMetrics({ assumptions }) {
  const a = assumptions;
  const baselineWh = Number(a.baselineEnergyWhPerQuery) || 0;
  const reduction = Math.min(0.95, Math.max(0, Number(a.moeEnergyReduction) || 0));
  const moeWh = baselineWh * (1 - reduction);
  return {
    energyPerQuery: Number(moeWh.toFixed(4)),
    energyPerQueryBaseline: Number(baselineWh.toFixed(4)),
    energyPerQuerySaved: Number((baselineWh - moeWh).toFixed(4)),
    waterIntensity: Number(a.waterIntensityLPerKwh) || 0,
    carbonIntensity: Number(a.carbonIntensityKgPerKwh) || 0,
    moeEnergyReduction: reduction,
  };
}

function applyEnvironmentalToRecord(record, env) {
  const energyKwh = env.energyPerQuery / 1000;
  const savedKwh = env.energyPerQuerySaved / 1000;
  record.energyEstimate = Number(env.energyPerQuery.toFixed(6)); // Wh, this query
  record.energySaved = Number(env.energyPerQuerySaved.toFixed(6)); // Wh, this query
  record.waterEstimate = Number((energyKwh * env.waterIntensity).toFixed(8)); // L
  record.waterSaved = Number((savedKwh * env.waterIntensity).toFixed(8)); // L
  record.co2Estimate = Number((energyKwh * env.carbonIntensity).toFixed(10)); // kg CO2e
  record.co2Saved = Number((savedKwh * env.carbonIntensity).toFixed(10)); // kg CO2e
  record.energyPerQuery = Number(env.energyPerQuery.toFixed(4));
  record.environmentalAssumptions = env;
  return record;
}

module.exports = {
  computeTokenMetrics,
  computeCostMetrics,
  computeEnvironmentalMetrics,
  applyEnvironmentalToRecord,
};
