import type { ReactNode } from "react";

// Minimal, dependency-free Markdown renderer. Builds React nodes directly (no
// dangerouslySetInnerHTML) so there is no HTML-injection surface. Supports the
// common blog subset: headings, paragraphs, lists, blockquotes, code fences,
// images, links, bold/italic/inline-code.

function safeUrl(url: string): string | null {
  const u = url.trim();
  if (/^(https?:)?\/\//i.test(u) || u.startsWith("/") || u.startsWith("data:image/")) return u;
  return null; // reject javascript: and other schemes
}

const INLINE = /(!\[[^\]]*\]\([^)]+\)|\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const parts = text.split(INLINE);
  return parts.map((part, i) => {
    const key = `${keyPrefix}-${i}`;
    if (!part) return null;
    let m: RegExpMatchArray | null;
    if ((m = part.match(/^!\[([^\]]*)\]\(([^)]+)\)$/))) {
      const url = safeUrl(m[2]);
      if (!url) return null;
      // eslint-disable-next-line @next/next/no-img-element
      return <img key={key} src={url} alt={m[1]} className="my-2 max-h-[480px] max-w-full rounded-lg" />;
    }
    if ((m = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/))) {
      const url = safeUrl(m[2]);
      return url ? (
        <a key={key} href={url} target="_blank" rel="noopener noreferrer" className="text-[#2a78d6] hover:underline">
          {m[1]}
        </a>
      ) : (
        m[1]
      );
    }
    if ((m = part.match(/^\*\*([^*]+)\*\*$/))) return <strong key={key}>{m[1]}</strong>;
    if ((m = part.match(/^`([^`]+)`$/)))
      return (
        <code key={key} className="rounded bg-black/[0.06] px-1 py-0.5 font-mono text-[0.85em] dark:bg-white/10">
          {m[1]}
        </code>
      );
    if ((m = part.match(/^\*([^*]+)\*$/))) return <em key={key}>{m[1]}</em>;
    return <span key={key}>{part}</span>;
  });
}

export function renderMarkdown(md: string): ReactNode {
  const lines = (md ?? "").replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code fence
    if (line.trim().startsWith("```")) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) buf.push(lines[i++]);
      i++; // closing fence
      blocks.push(
        <pre key={key++} className="my-3 overflow-auto rounded-lg bg-black/[0.04] p-3 font-mono text-sm dark:bg-white/5">
          <code>{buf.join("\n")}</code>
        </pre>,
      );
      continue;
    }

    // Heading
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      const content = renderInline(h[2], `h${key}`);
      const cls = level === 1 ? "mt-4 text-2xl font-bold" : level === 2 ? "mt-4 text-xl font-semibold" : "mt-3 text-lg font-semibold";
      blocks.push(
        level === 1 ? <h1 key={key++} className={cls}>{content}</h1> : level === 2 ? <h2 key={key++} className={cls}>{content}</h2> : <h3 key={key++} className={cls}>{content}</h3>,
      );
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith(">")) {
      const buf: string[] = [];
      while (i < lines.length && lines[i].startsWith(">")) buf.push(lines[i++].replace(/^>\s?/, ""));
      blocks.push(
        <blockquote key={key++} className="my-3 border-l-2 border-[var(--border)] pl-3 text-[var(--text-secondary)]">
          {renderInline(buf.join(" "), `bq${key}`)}
        </blockquote>,
      );
      continue;
    }

    // List
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*[-*]\s+/, ""));
      blocks.push(
        <ul key={key++} className="my-2 list-disc pl-5">
          {items.map((it, j) => (
            <li key={j}>{renderInline(it, `li${key}-${j}`)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    // Blank line
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Paragraph (consume consecutive non-blank, non-special lines)
    const buf: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].trim().startsWith("```") &&
      !/^(#{1,3})\s+/.test(lines[i]) &&
      !lines[i].startsWith(">") &&
      !/^\s*[-*]\s+/.test(lines[i])
    ) {
      buf.push(lines[i++]);
    }
    blocks.push(
      <p key={key++} className="my-2 leading-relaxed">
        {buf.map((b, j) => (
          <span key={j}>
            {renderInline(b, `p${key}-${j}`)}
            {j < buf.length - 1 && <br />}
          </span>
        ))}
      </p>,
    );
  }

  return <div className="text-sm">{blocks}</div>;
}

// Plain-text excerpt for feed cards (strips markdown syntax).
export function markdownExcerpt(md: string, max = 200): string {
  const text = (md ?? "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[#>*`_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? text.slice(0, max) + "…" : text;
}

// First image URL in the markdown, for a card thumbnail.
export function firstImage(md: string): string | null {
  const m = (md ?? "").match(/!\[[^\]]*\]\(([^)]+)\)/);
  return m ? safeUrl(m[1]) : null;
}
