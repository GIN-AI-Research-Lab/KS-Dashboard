"use strict";

// Mirrors src/lib/pricing.ts on the dashboard side, but computed here (where
// the transcript's full cache_creation 1h/5m breakdown is available) so the
// plugin can send an accurate pre-computed costUsd per turn instead of
// making the dashboard guess a single cache-write multiplier.
const MODEL_PRICING = {
  "claude-fable-5": { input: 10, output: 50 },
  "claude-mythos-5": { input: 10, output: 50 },
  "claude-opus-4-8": { input: 5, output: 25 },
  "claude-opus-4-7": { input: 5, output: 25 },
  "claude-opus-4-6": { input: 5, output: 25 },
  "claude-opus-4-5": { input: 5, output: 25 },
  "claude-opus-4-1": { input: 5, output: 25 },
  "claude-opus-4-0": { input: 5, output: 25 },
  "claude-sonnet-5": { input: 2, output: 10 },
  "claude-sonnet-4-6": { input: 3, output: 15 },
  "claude-sonnet-4-5": { input: 3, output: 15 },
  "claude-sonnet-4-0": { input: 3, output: 15 },
  "claude-haiku-4-5": { input: 1, output: 5 },
  "claude-3-haiku-20240307": { input: 0.25, output: 1.25 },
};

const DEFAULT_PRICING = { input: 3, output: 15 };

function resolvePricing(model) {
  if (MODEL_PRICING[model]) return MODEL_PRICING[model];
  const match = Object.keys(MODEL_PRICING).find((key) => model.startsWith(key));
  return match ? MODEL_PRICING[match] : DEFAULT_PRICING;
}

function computeCostUsd(turn) {
  const price = resolvePricing(turn.model);
  const inputCost = (turn.inputTokens / 1_000_000) * price.input;
  const outputCost = (turn.outputTokens / 1_000_000) * price.output;
  const cache5mCost = ((turn.cacheCreation5mTokens || 0) / 1_000_000) * price.input * 1.25;
  const cache1hCost = ((turn.cacheCreation1hTokens || 0) / 1_000_000) * price.input * 2;
  const cacheReadCost = (turn.cacheReadTokens / 1_000_000) * price.input * 0.1;
  return inputCost + outputCost + cache5mCost + cache1hCost + cacheReadCost;
}

module.exports = { computeCostUsd };
