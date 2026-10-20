import { describe, expect, it } from "vitest";
import { collapse, fold, highlight, makeSnippet } from "../../src/shared/text";

describe("fold", () => {
  it("lowercases and strips accents without changing length", () => {
    expect(fold("Ação CRÔNICA")).toBe("acao cronica");
    expect(fold("Ação").length).toBe("Ação".length);
  });
});

describe("collapse", () => {
  it("squeezes whitespace", () => {
    expect(collapse("  a \n\n b\t c ")).toBe("a b c");
  });
});

describe("makeSnippet", () => {
  const long = `${"x ".repeat(100)}needle ${"y ".repeat(100)}`;

  it("centers on the first match and adds ellipses", () => {
    const snippet = makeSnippet(long, ["needle"], 20);
    expect(snippet.startsWith("…")).toBe(true);
    expect(snippet.endsWith("…")).toBe(true);
    expect(snippet).toContain("needle");
    expect(snippet.length).toBeLessThan(60);
  });

  it("matches accent-insensitively", () => {
    expect(makeSnippet("Configurar a AÇÃO agora", ["acao"], 5)).toContain("AÇÃO");
  });

  it("falls back to the start when nothing matches", () => {
    expect(makeSnippet("short text", ["nope"])).toBe("short text");
  });
});

describe("highlight", () => {
  it("marks every occurrence", () => {
    expect(highlight("cron e Cron", ["cron"])).toEqual([
      { text: "cron", match: true },
      { text: " e ", match: false },
      { text: "Cron", match: true },
    ]);
  });

  it("matches across accents and keeps the original text", () => {
    const joined = highlight("Ação rápida", ["acao"])
      .map((s) => s.text)
      .join("");
    expect(joined).toBe("Ação rápida");
    expect(highlight("Ação rápida", ["acao"])[0]).toEqual({ text: "Ação", match: true });
  });

  it("returns one plain segment without terms", () => {
    expect(highlight("hello", [])).toEqual([{ text: "hello", match: false }]);
  });
});
