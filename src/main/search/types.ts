export type Role = "user" | "assistant" | "tool";

export interface Message {
  index: number;
  role: Role;
  text: string;
  timestamp: string | null;
}

export interface Session {
  id: string;
  project: string;
  cwd: string | null;
  title: string;
  startedAt: string | null;
  endedAt: string | null;
  mtimeMs: number;
  messages: Message[];
}

export interface SessionSummary {
  id: string;
  project: string;
  cwd: string | null;
  title: string;
  startedAt: string | null;
  endedAt: string | null;
  messageCount: number;
}

export interface SearchFilters {
  project?: string;
  role?: Role;
  from?: string;
  to?: string;
  limit?: number;
}

export interface SearchHit {
  messageIndex: number;
  role: Role;
  timestamp: string | null;
  snippet: string;
}

export interface SearchResult {
  session: SessionSummary;
  score: number;
  totalHits: number;
  hits: SearchHit[];
}

export interface SearchResponse {
  query: string;
  terms: string[];
  results: SearchResult[];
}
