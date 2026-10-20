import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export interface FakeTurn {
  role: "user" | "assistant";
  content: string | Array<Record<string, unknown>>;
  timestamp: string;
  extra?: Record<string, unknown>;
}

export function jsonl(sessionId: string, cwd: string, turns: FakeTurn[]): string {
  const lines = [
    JSON.stringify({ type: "permission-mode", permissionMode: "default", sessionId }),
    ...turns.map((turn) =>
      JSON.stringify({
        type: turn.role,
        sessionId,
        cwd,
        timestamp: turn.timestamp,
        message: { role: turn.role, content: turn.content },
        ...turn.extra,
      }),
    ),
  ];
  return `${lines.join("\n")}\n`;
}

export async function makeRoot(files: Record<string, string>): Promise<{ root: string; cleanup: () => Promise<void> }> {
  const root = await mkdtemp(path.join(os.tmpdir(), "recall-"));
  for (const [relative, content] of Object.entries(files)) {
    const target = path.join(root, relative);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, content);
  }
  return { root, cleanup: () => rm(root, { recursive: true, force: true }) };
}

export const ALPHA = jsonl("alpha-1", "F:\\GitHub\\alpha", [
  { role: "user", content: "How do I fix the aiodns error on Windows?", timestamp: "2026-10-01T10:00:00.000Z" },
  {
    role: "assistant",
    content: [
      { type: "thinking", thinking: "", signature: "abc" },
      { type: "text", text: "Install aiodns with the SelectorEventLoop policy." },
      { type: "tool_use", name: "Edit", input: { file_path: "F:\\GitHub\\alpha\\main.py", old_string: "x" } },
    ],
    timestamp: "2026-10-01T10:00:05.000Z",
  },
  {
    role: "user",
    content: [{ type: "tool_result", tool_use_id: "t1", content: "ok" }],
    timestamp: "2026-10-01T10:00:06.000Z",
  },
  {
    role: "user",
    content: "<system-reminder>ignore me</system-reminder>",
    timestamp: "2026-10-01T10:00:07.000Z",
  },
  {
    role: "user",
    content: "meta only",
    timestamp: "2026-10-01T10:00:08.000Z",
    extra: { isMeta: true },
  },
  {
    role: "assistant",
    content: "Sidechain chatter",
    timestamp: "2026-10-01T10:00:09.000Z",
    extra: { isSidechain: true },
  },
]);

export const BETA = jsonl("beta-1", "F:\\GitHub\\beta", [
  { role: "user", content: "Configurar o cron do GitHub Actions para o robô", timestamp: "2026-10-10T08:00:00.000Z" },
  { role: "assistant", content: "Use o schedule com expressão cron às 11:47.", timestamp: "2026-10-10T08:00:10.000Z" },
]);
