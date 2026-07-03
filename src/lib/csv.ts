// Minimal, dependency-free CSV builder. Quotes fields that contain a comma,
// quote or newline (doubling internal quotes) and prepends a UTF-8 BOM so
// Excel renders Vietnamese text correctly.

type Cell = string | number | null | undefined;

const BOM = String.fromCharCode(0xfeff);

function escapeField(v: Cell): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(headers: string[], rows: Cell[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(escapeField).join(","));
  return BOM + lines.join("\r\n") + "\r\n";
}

export function csvResponse(filename: string, csv: string): Response {
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
