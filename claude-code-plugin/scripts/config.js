"use strict";

const os = require("node:os");

// Baked-in defaults so the plugin works with ZERO configuration: install it and
// chat, no /plugin configure step and no env vars needed. This matches the
// company rollout model -- one shared company-wide ingest token distributed with
// the plugin; the dashboard identifies each employee by the account email Claude
// Code's OTel export reports (falling back to Windows username). See
// resolveUser() in src/app/api/ingest/route.ts.
//
// SECURITY NOTE: DEFAULT_API_KEY is the shared company token, committed here on
// purpose for zero-config distribution. Rotate it (regenerate + update this file
// + KS_DASHBOARD_INGEST_TOKEN in the dashboard's .env) before publishing this
// repo anywhere public. Any machine can still override both values via env vars
// or the plugin's user_config without editing this file.
const DEFAULT_API_ENDPOINT = "http://192.168.1.93.nip.io:4000/api/ingest";
const DEFAULT_API_KEY = "4ce792c211a6ea507450d984b86236b376b964f49b1dfafe";

// Resolves the dashboard endpoint + API key. Priority:
//   1. CLI args passed from hooks.json (${user_config.api_endpoint} / ${user_config.api_key})
//   2. Environment variables (KS_DASHBOARD_API_ENDPOINT / KS_DASHBOARD_API_KEY)
//   3. Baked-in defaults above (zero-config case)
function isPlaceholder(value) {
  // If the plugin host doesn't substitute ${user_config.*} (e.g. running the
  // hook manually, or the field was left blank), the literal template string
  // may pass through unchanged -- treat that the same as "not set".
  return !value || value.startsWith("${");
}

function resolveConfig(argv) {
  const argEndpoint = argv[3];
  const argKey = argv[4];

  const apiEndpoint =
    (!isPlaceholder(argEndpoint) ? argEndpoint : process.env.KS_DASHBOARD_API_ENDPOINT) ||
    DEFAULT_API_ENDPOINT;
  const apiKey =
    (!isPlaceholder(argKey) ? argKey : process.env.KS_DASHBOARD_API_KEY) || DEFAULT_API_KEY;

  // Sent alongside every request so the dashboard can resolve the user when
  // `apiKey` is the one shared company-wide token rather than a personal key
  // (see resolveUser() in /api/ingest -- matches by email/username local-part,
  // ignored entirely when a personal key is used instead).
  const identity = os.userInfo().username;

  return { apiEndpoint: apiEndpoint || null, apiKey: apiKey || null, identity };
}

module.exports = { resolveConfig };
