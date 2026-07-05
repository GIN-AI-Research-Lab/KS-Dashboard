// Company-wide monthly Claude budget. Config-only (no DB / migration) — edit
// these values to change the budget and alert thresholds.
export const MONTHLY_BUDGET_USD = 5000;

// Show an amber warning at this fraction of budget consumed; red at/above 100%.
export const BUDGET_WARN_AT = 0.8;
