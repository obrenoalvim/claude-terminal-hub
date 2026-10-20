import path from "node:path";
import { collapse } from "../../shared/text";
import type { Message, Role, Session } from "./types";

const MAX_TEXT = 20_000;
const MAX_TITLE = 90;
const NOISE = /^<(local-command-|command-name|command-message|command-args|system-reminder|user-prompt-submit-hook)/;
const INPUT_KEYS = ["file_path", "command", "pattern", "path", "url", "description", "prompt", "query"];

interface Block {
  type?: string;
  text?: string;
  name?: string;
  input?: Record<string, unknown>;
}

interface RawRecord {
  type?: string;
  isMeta?: boolean;
  isSidechain?: boolean;
  cwd?: string;
  timestamp?: string;
  message?: { content?: string | Block[] };
}

export interface SessionSource {
  file: string;
  dirName: string;
  mtimeMs: number;
}

export function projectName(cwd: string | null, dirName: string): string {
  if (!cwd) return dirName;
  const parts = cwd.split(/[\\/]+/).filter(Boolean);
  return parts[parts.length - 1] ?? cwd;
}

export function summarizeInput(input: Record<string, unknown> | undefined): string {
  if (!input) return "";
  for (const key of INPUT_KEYS) {
    const value = input[key];
    if (typeof value === "string" && value) return collapse(value).slice(0, 300);
  }
  return collapse(JSON.stringify(input)).slice(0, 300);
}

function isNoise(text: string): boolean {
  return NOISE.test(text.trimStart());
}

function entriesFor(record: RawRecord): Array<{ role: Role; text: string }> {
  const role: Role | null = record.type === "user" ? "user" : record.type === "assistant" ? "assistant" : null;
  if (!role || record.isMeta || record.isSidechain) return [];
  const content = record.message?.content;
  if (typeof content === "string") {
    return content.trim() && !isNoise(content) ? [{ role, text: content.slice(0, MAX_TEXT) }] : [];
  }
  if (!Array.isArray(content)) return [];
  const out: Array<{ role: Role; text: string }> = [];
  const texts: string[] = [];
  for (const block of content) {
    if (block.type === "text" && block.text?.trim() && !isNoise(block.text)) texts.push(block.text);
    if (block.type === "tool_use" && block.name) {
      const summary = summarizeInput(block.input);
      out.push({ role: "tool", text: summary ? `${block.name} ${summary}` : block.name });
    }
  }
  if (texts.length) out.unshift({ role, text: texts.join("\n\n").slice(0, MAX_TEXT) });
  return out;
}

export function parseSession(raw: string, source: SessionSource): Session | null {
  const messages: Message[] = [];
  let cwd: string | null = null;
  let startedAt: string | null = null;
  let endedAt: string | null = null;

  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    let record: RawRecord;
    try {
      record = JSON.parse(line) as RawRecord;
    } catch {
      continue;
    }
    cwd ??= record.cwd ?? null;
    const timestamp = record.timestamp ?? null;
    for (const entry of entriesFor(record)) {
      messages.push({ index: messages.length, role: entry.role, text: entry.text, timestamp });
      startedAt ??= timestamp;
      endedAt = timestamp ?? endedAt;
    }
  }

  if (!messages.length) return null;
  const firstUser = messages.find((m) => m.role === "user");
  const title = collapse(firstUser?.text ?? messages[0]?.text ?? "").slice(0, MAX_TITLE) || "Untitled";
  return {
    id: path.basename(source.file, ".jsonl"),
    project: projectName(cwd, source.dirName),
    cwd,
    title,
    startedAt,
    endedAt,
    mtimeMs: source.mtimeMs,
    messages,
  };
}
