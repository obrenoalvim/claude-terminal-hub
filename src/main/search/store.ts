import { readdir, readFile, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import MiniSearch from "minisearch";
import { parseSession, type SessionSource } from "./parse";
import { fold, makeSnippet } from "../../shared/text";
import type {
  Role,
  SearchFilters,
  SearchHit,
  SearchResponse,
  SearchResult,
  Session,
  SessionSummary,
} from "./types";

const REFRESH_INTERVAL_MS = 5_000;
const DEFAULT_SESSION_LIMIT = 30;
const HITS_PER_SESSION = 3;

interface IndexedMessage {
  id: string;
  text: string;
  sessionId: string;
  messageIndex: number;
  role: Role;
  project: string;
  timestamp: string | null;
}

export function defaultRoot(): string {
  return process.env.RECALL_PROJECTS_DIR ?? path.join(os.homedir(), ".claude", "projects");
}

export function summarize(session: Session): SessionSummary {
  return {
    id: session.id,
    project: session.project,
    cwd: session.cwd,
    title: session.title,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    messageCount: session.messages.length,
  };
}

async function listSources(root: string): Promise<SessionSource[]> {
  let dirs;
  try {
    dirs = await readdir(root, { withFileTypes: true });
  } catch {
    return [];
  }
  const sources: SessionSource[] = [];
  for (const dir of dirs) {
    if (!dir.isDirectory()) continue;
    const dirPath = path.join(root, dir.name);
    for (const entry of await readdir(dirPath, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith(".jsonl")) continue;
      const file = path.join(dirPath, entry.name);
      sources.push({ file, dirName: dir.name, mtimeMs: (await stat(file)).mtimeMs });
    }
  }
  return sources;
}

function tokenize(text: string): string[] {
  return text.split(/[^\p{L}\p{N}_]+/u).filter(Boolean);
}

function createIndex(): MiniSearch<IndexedMessage> {
  return new MiniSearch<IndexedMessage>({
    fields: ["text"],
    storeFields: ["sessionId", "messageIndex", "role", "project", "timestamp"],
    tokenize,
    processTerm: (term) => fold(term),
  });
}

export class SessionStore {
  private sessions = new Map<string, Session>();
  private fileToSession = new Map<string, { id: string; mtimeMs: number }>();
  private index = createIndex();
  private refreshedAt = 0;
  private pending: Promise<void> | null = null;

  constructor(private readonly root: string) {}

  async refresh(force = false): Promise<void> {
    if (!force && Date.now() - this.refreshedAt < REFRESH_INTERVAL_MS) return;
    this.pending ??= this.sync().finally(() => {
      this.pending = null;
      this.refreshedAt = Date.now();
    });
    await this.pending;
  }

  private async sync(): Promise<void> {
    const sources = await listSources(this.root);
    const seen = new Set<string>();
    for (const source of sources) {
      seen.add(source.file);
      const known = this.fileToSession.get(source.file);
      if (known && known.mtimeMs === source.mtimeMs) continue;
      if (known) this.remove(known.id);
      const session = parseSession(await readFile(source.file, "utf8"), source);
      if (!session) continue;
      this.add(session);
      this.fileToSession.set(source.file, { id: session.id, mtimeMs: source.mtimeMs });
    }
    for (const [file, known] of this.fileToSession) {
      if (seen.has(file)) continue;
      this.remove(known.id);
      this.fileToSession.delete(file);
    }
  }

  private add(session: Session): void {
    this.sessions.set(session.id, session);
    this.index.addAll(
      session.messages.map((message) => ({
        id: `${session.id}:${message.index}`,
        text: message.text,
        sessionId: session.id,
        messageIndex: message.index,
        role: message.role,
        project: session.project,
        timestamp: message.timestamp,
      })),
    );
  }

  private remove(id: string): void {
    const session = this.sessions.get(id);
    if (!session) return;
    for (const message of session.messages) this.index.discard(`${id}:${message.index}`);
    this.sessions.delete(id);
  }

  async get(id: string): Promise<Session | undefined> {
    await this.refresh();
    return this.sessions.get(id);
  }

  async projects(): Promise<string[]> {
    await this.refresh();
    return [...new Set([...this.sessions.values()].map((s) => s.project))].sort((a, b) => a.localeCompare(b));
  }

  async search(query: string, filters: SearchFilters = {}): Promise<SearchResponse> {
    await this.refresh();
    const limit = filters.limit ?? DEFAULT_SESSION_LIMIT;
    const trimmed = query.trim();
    if (!trimmed) return { query: trimmed, terms: [], results: this.recent(filters, limit) };

    const raw = this.index.search(trimmed, {
      prefix: true,
      fuzzy: (term) => (term.length > 4 ? 0.2 : false),
      combineWith: "AND",
      filter: (hit) => matchesFilters(hit as unknown as IndexedMessage, filters),
    });

    const terms = new Set<string>();
    const grouped = new Map<string, SearchResult>();
    for (const hit of raw) {
      hit.terms.forEach((t) => terms.add(t));
      const sessionId = hit.sessionId as string;
      const session = this.sessions.get(sessionId);
      if (!session) continue;
      let result = grouped.get(sessionId);
      if (!result) {
        if (grouped.size >= limit) continue;
        result = { session: summarize(session), score: hit.score, totalHits: 0, hits: [] };
        grouped.set(sessionId, result);
      }
      result.totalHits += 1;
      if (result.hits.length < HITS_PER_SESSION) {
        const message = session.messages[hit.messageIndex as number];
        if (message) result.hits.push(toHit(message.index, message.role, message.timestamp, message.text, hit.terms));
      }
    }
    return { query: trimmed, terms: [...terms], results: [...grouped.values()] };
  }

  private recent(filters: SearchFilters, limit: number): SearchResult[] {
    return [...this.sessions.values()]
      .filter((s) => (!filters.project || s.project === filters.project) && inRange(s.endedAt, filters))
      .sort((a, b) => (b.endedAt ?? "").localeCompare(a.endedAt ?? ""))
      .slice(0, limit)
      .map((s) => ({ session: summarize(s), score: 0, totalHits: 0, hits: [] }));
  }
}

function toHit(index: number, role: Role, timestamp: string | null, text: string, matched: string[]): SearchHit {
  return { messageIndex: index, role, timestamp, snippet: makeSnippet(text, matched) };
}

function inRange(timestamp: string | null, filters: SearchFilters): boolean {
  if (!filters.from && !filters.to) return true;
  if (!timestamp) return false;
  if (filters.from && timestamp < filters.from) return false;
  if (filters.to && timestamp > `${filters.to}T23:59:59.999Z`) return false;
  return true;
}

function matchesFilters(hit: IndexedMessage, filters: SearchFilters): boolean {
  if (filters.project && hit.project !== filters.project) return false;
  if (filters.role && hit.role !== filters.role) return false;
  return inRange(hit.timestamp, filters);
}

const globalStores = globalThis as typeof globalThis & { __recallStores?: Map<string, SessionStore> };

export function getStore(root = defaultRoot()): SessionStore {
  const stores = (globalStores.__recallStores ??= new Map());
  let store = stores.get(root);
  if (!store) {
    store = new SessionStore(root);
    stores.set(root, store);
  }
  return store;
}
