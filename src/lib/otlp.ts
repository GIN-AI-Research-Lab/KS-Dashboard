// Shared helpers for parsing OTLP/HTTP JSON (attributes live on each record's
// `attributes`, values are wrapped in stringValue/intValue/doubleValue/boolValue).

export interface OtlpAttribute {
  key: string;
  value?: {
    stringValue?: string;
    intValue?: string | number;
    doubleValue?: number;
    boolValue?: boolean;
  };
}

export function attrsToMap(attrs: OtlpAttribute[] | undefined): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const a of attrs ?? []) {
    const v = a.value;
    if (!v) continue;
    if (v.stringValue !== undefined) out[a.key] = v.stringValue;
    else if (v.intValue !== undefined) out[a.key] = typeof v.intValue === "string" ? Number(v.intValue) : v.intValue;
    else if (v.doubleValue !== undefined) out[a.key] = v.doubleValue;
    else if (v.boolValue !== undefined) out[a.key] = v.boolValue;
  }
  return out;
}

export function otlpNum(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function otlpStr(v: unknown): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}
