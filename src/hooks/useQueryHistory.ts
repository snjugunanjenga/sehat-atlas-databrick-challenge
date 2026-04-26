// localStorage-backed history of natural-language searches.
import { useEffect, useState } from "react";
import type { SearchResult } from "@/data/dataSource";

const KEY = "sehat.history.v1";
const MAX = 20;

export interface HistoryEntry {
  id: string;
  query: string;
  ts: number;
  resultCount: number;
  topFacilityName?: string;
  source: "local" | "databricks";
  snapshot: SearchResult;
}

function read(): HistoryEntry[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

function write(entries: HistoryEntry[]) {
  localStorage.setItem(KEY, JSON.stringify(entries.slice(0, MAX)));
  window.dispatchEvent(new CustomEvent("sehat:history"));
}

export function pushHistory(result: SearchResult): HistoryEntry {
  const entry: HistoryEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    query: result.query,
    ts: Date.now(),
    resultCount: result.matches.length,
    topFacilityName: result.matches[0]?.facility.name,
    source: result.source,
    snapshot: result,
  };
  const existing = read().filter((h) => h.query.toLowerCase() !== result.query.toLowerCase());
  write([entry, ...existing]);
  return entry;
}

export function removeHistory(id: string) {
  write(read().filter((h) => h.id !== id));
}

export function clearHistory() {
  write([]);
}

export function useQueryHistory() {
  const [items, setItems] = useState<HistoryEntry[]>(() => read());
  useEffect(() => {
    const onChange = () => setItems(read());
    window.addEventListener("sehat:history", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("sehat:history", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);
  return items;
}
