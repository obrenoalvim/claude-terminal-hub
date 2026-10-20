import { describe, expect, it } from "vitest";
import { parseSession, projectName, summarizeInput } from "../../src/main/search/parse";
import { ALPHA } from "./helpers";

const source = { file: "F:\\x\\alpha-1.jsonl", dirName: "-x", mtimeMs: 1 };

describe("projectName", () => {
  it("uses the last segment of the working directory", () => {
    expect(projectName("F:\\GitHub\\alpha", "dir")).toBe("alpha");
    expect(projectName("/home/me/beta/", "dir")).toBe("beta");
  });

  it("falls back to the directory name", () => {
    expect(projectName(null, "C--Users-me")).toBe("C--Users-me");
  });
});

describe("summarizeInput", () => {
  it("prefers well-known keys", () => {
    expect(summarizeInput({ file_path: "a.ts", command: "ls" })).toBe("a.ts");
    expect(summarizeInput({ command: "npm  test" })).toBe("npm test");
  });

  it("serializes unknown shapes and handles undefined", () => {
    expect(summarizeInput({ foo: 1 })).toBe('{"foo":1}');
    expect(summarizeInput(undefined)).toBe("");
  });
});

describe("parseSession", () => {
  const session = parseSession(ALPHA, source);

  it("extracts identity, project and time range", () => {
    expect(session).not.toBeNull();
    expect(session?.id).toBe("alpha-1");
    expect(session?.project).toBe("alpha");
    expect(session?.startedAt).toBe("2026-10-01T10:00:00.000Z");
    expect(session?.endedAt).toBe("2026-10-01T10:00:05.000Z");
  });

  it("keeps user text, assistant text and tool calls only", () => {
    expect(session?.messages.map((m) => m.role)).toEqual(["user", "assistant", "tool"]);
    expect(session?.messages[2]?.text).toContain("Edit F:\\GitHub\\alpha\\main.py");
  });

  it("drops thinking, tool results, reminders, meta and sidechain records", () => {
    const texts = session?.messages.map((m) => m.text).join(" ") ?? "";
    expect(texts).not.toContain("ignore me");
    expect(texts).not.toContain("meta only");
    expect(texts).not.toContain("Sidechain");
  });

  it("titles the session with the first user message", () => {
    expect(session?.title).toBe("How do I fix the aiodns error on Windows?");
  });

  it("skips malformed lines and returns null for empty sessions", () => {
    expect(parseSession("not json\n{broken", source)).toBeNull();
    expect(parseSession("", source)).toBeNull();
  });

  it("uses the transcript file name as the session id", () => {
    const raw = JSON.stringify({ type: "user", sessionId: "other", message: { content: "hi" }, timestamp: "2026-01-01T00:00:00.000Z" });
    expect(parseSession(raw, source)?.id).toBe("alpha-1");
  });
});
