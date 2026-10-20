export function foldChar(char: string): string {
  const stripped = char.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  return stripped.length === char.length ? stripped : char;
}

export function fold(text: string): string {
  let out = "";
  for (const char of text) out += foldChar(char);
  return out;
}

export function collapse(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function makeSnippet(text: string, terms: string[], radius = 90): string {
  const flat = collapse(text);
  const folded = fold(flat);
  let first = -1;
  for (const term of terms) {
    const at = folded.indexOf(fold(term));
    if (at !== -1 && (first === -1 || at < first)) first = at;
  }
  if (first === -1) return flat.length > radius * 2 ? `${flat.slice(0, radius * 2)}…` : flat;
  const start = Math.max(0, first - radius);
  const end = Math.min(flat.length, first + radius);
  return `${start > 0 ? "…" : ""}${flat.slice(start, end)}${end < flat.length ? "…" : ""}`;
}

export interface Segment {
  text: string;
  match: boolean;
}

export function highlight(text: string, terms: string[]): Segment[] {
  const folded = fold(text);
  const marked = new Array<boolean>(text.length).fill(false);
  for (const term of terms) {
    const needle = fold(term);
    if (!needle) continue;
    let from = 0;
    for (;;) {
      const at = folded.indexOf(needle, from);
      if (at === -1) break;
      marked.fill(true, at, at + needle.length);
      from = at + needle.length;
    }
  }
  const segments: Segment[] = [];
  for (let i = 0; i < text.length; i++) {
    const match = marked[i] === true;
    const last = segments[segments.length - 1];
    if (last && last.match === match) last.text += text[i];
    else segments.push({ text: text[i] ?? "", match });
  }
  return segments;
}
