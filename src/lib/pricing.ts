// USD price per 1M tokens, by model id. Used to compute cost for turns that
// don't arrive with a pre-computed cost from the plugin.
export const MODEL_PRICING: Record<string, { input: number; output: number }> = {
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

function resolvePricing(model: string) {
  if (MODEL_PRICING[model]) return MODEL_PRICING[model];
  // fall back to a prefix match for dated/suffixed model ids
  const match = Object.keys(MODEL_PRICING).find((key) => model.startsWith(key));
  return match ? MODEL_PRICING[match] : DEFAULT_PRICING;
}

// USD saved on cache-read tokens vs. paying the full input price for them.
// Cache reads bill at ~0.1x input, so the saving is ~0.9x the input price.
export function cacheReadSavingsUsd(model: string, cacheReadTokens: number) {
  const price = resolvePricing(model);
  return (cacheReadTokens / 1_000_000) * price.input * 0.9;
}

// Coarse capability tier for a model id, for "spend by tier" analysis.
export function modelTier(model: string): "Opus" | "Sonnet" | "Haiku" | "Khác" {
  if (model.includes("opus") || model.includes("fable") || model.includes("mythos")) return "Opus";
  if (model.includes("sonnet")) return "Sonnet";
  if (model.includes("haiku")) return "Haiku";
  return "Khác";
}

export function computeCostUsd(
  model: string,
  inputTokens: number,
  outputTokens: number,
  cacheCreationTokens = 0,
  cacheReadTokens = 0,
) {
  const price = resolvePricing(model);
  const inputCost = (inputTokens / 1_000_000) * price.input;
  const outputCost = (outputTokens / 1_000_000) * price.output;
  // cache writes ~1.25x input price, cache reads ~0.1x input price
  const cacheCreationCost = (cacheCreationTokens / 1_000_000) * price.input * 1.25;
  const cacheReadCost = (cacheReadTokens / 1_000_000) * price.input * 0.1;
  return inputCost + outputCost + cacheCreationCost + cacheReadCost;
}
