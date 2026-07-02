"use strict";

// Resolves the dashboard endpoint + API key. Priority:
//   1. CLI args passed from hooks.json (${user_config.api_endpoint} / ${user_config.api_key})
//   2. Environment variables (KS_DASHBOARD_API_ENDPOINT / KS_DASHBOARD_API_KEY),
//      typically set once in ~/.claude/settings.json under "env".
function isPlaceholder(value) {
  // If the plugin host doesn't substitute ${user_config.*} (e.g. running the
  // hook manually, or the field was left blank), the literal template string
  // may pass through unchanged -- treat that the same as "not set".
  return !value || value.startsWith("${");
}

function resolveConfig(argv) {
  const argEndpoint = argv[3];
  const argKey = argv[4];

  const apiEndpoint = !isPlaceholder(argEndpoint) ? argEndpoint : process.env.KS_DASHBOARD_API_ENDPOINT;
  const apiKey = !isPlaceholder(argKey) ? argKey : process.env.KS_DASHBOARD_API_KEY;

  return { apiEndpoint: apiEndpoint || null, apiKey: apiKey || null };
}

module.exports = { resolveConfig };
