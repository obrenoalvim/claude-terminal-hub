import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { SessionStore } from "../../src/main/search/store";
import { ALPHA, BETA, jsonl, makeRoot } from "./helpers";

let cleanup: () => Promise<void>;
let root: string;
let store: SessionStore;

beforeEach(async () => {
  const made = await makeRoot({
    "-alpha/alpha-1.jsonl": ALPHA,
    "-beta/beta-1.jsonl": BETA,
    "-beta/notes.txt": "ignored",
    "stray.json": "{}",
  });
  root = made.root;
  cleanup = made.cleanup;
  store = new SessionStore(root);
});

afterEach(async () => {
  await cleanup();
});

describe("SessionStore", () => {
  it("lists projects sorted", async () => {
    expect(await store.projects()).toEqual(["alpha", "beta"]);
  });

  it("finds messages and groups them by session", async () => {
    const { results, terms } = await store.search("aiodns");
    expect(results).toHaveLength(1);
    expect(results[0]?.session.id).toBe("alpha-1");
    expect(results[0]?.totalHits).toBeGreaterThanOrEqual(2);
    expect(results[0]?.hits.length).toBeLessThanOrEqual(3);
    expect(terms).toContain("aiodns");
  });

  it("matches prefixes and ignores accents", async () => {
    expect((await store.search("configur")).results[0]?.session.id).toBe("beta-1");
    expect((await store.search("expressao")).results[0]?.session.id).toBe("beta-1");
  });

  it("requires every term", async () => {
    expect((await store.search("aiodns cron")).results).toHaveLength(0);
  });

  it("searches tool calls by file path", async () => {
    const { results } = await store.search("main.py", { role: "tool" });
    expect(results[0]?.hits[0]?.role).toBe("tool");
  });

  it("filters by project, role and date", async () => {
    expect((await store.search("cron", { project: "alpha" })).results).toHaveLength(0);
    expect((await store.search("cron", { role: "user" })).results[0]?.hits.every((h) => h.role === "user")).toBe(true);
    expect((await store.search("cron", { from: "2026-10-11" })).results).toHaveLength(0);
    expect((await store.search("cron", { to: "2026-10-10" })).results).toHaveLength(1);
  });

  it("lists recent sessions first when the query is empty", async () => {
    const { results } = await store.search("");
    expect(results.map((r) => r.session.id)).toEqual(["beta-1", "alpha-1"]);
    expect(results[0]?.hits).toEqual([]);
  });

  it("respects the session limit", async () => {
    expect((await store.search("", { limit: 1 })).results).toHaveLength(1);
  });

  it("returns a session by id and undefined for unknown ids", async () => {
    expect((await store.get("beta-1"))?.messages).toHaveLength(2);
    expect(await store.get("nope")).toBeUndefined();
  });

  it("picks up new, changed and removed files on refresh", async () => {
    await store.refresh(true);
    await writeFile(path.join(root, "-beta", "gamma.jsonl"), jsonl("gamma", "F:\\g", [
      { role: "user", content: "brand new zebra topic", timestamp: "2026-10-12T00:00:00.000Z" },
    ]));
    await store.refresh(true);
    expect((await store.search("zebra")).results[0]?.session.id).toBe("gamma");

    await writeFile(path.join(root, "-beta", "gamma.jsonl"), jsonl("gamma", "F:\\g", [
      { role: "user", content: "now about giraffes", timestamp: "2026-10-12T00:00:00.000Z" },
    ]));
    await store.refresh(true);
    expect((await store.search("zebra")).results).toHaveLength(0);
    expect((await store.search("giraffes")).results).toHaveLength(1);

    await (await import("node:fs/promises")).rm(path.join(root, "-beta", "gamma.jsonl"));
    await store.refresh(true);
    expect((await store.search("giraffes")).results).toHaveLength(0);
  });

  it("returns nothing when the root does not exist", async () => {
    const missing = new SessionStore(path.join(root, "missing"));
    expect((await missing.search("")).results).toEqual([]);
  });
});
