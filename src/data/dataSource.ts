// Single switch + same-shape API for facility data.
// When Databricks is enabled (toggle in /databricks), search & trust go through
// the edge functions backed by the connector gateway. Otherwise they use the
// precomputed JSON shipped from /public/data/.

import { supabase } from "@/integrations/supabase/client";
import { runAgent, AgentResult } from "@/data/agent";
import {
  FacilityDetail,
  FacilitySlim,
  loadDetails,
  loadFacilities,
} from "@/data/facilities";

const DATABRICKS_FLAG = "sehat.useDatabricks";

export type DataSource = "local" | "databricks";

export function getDataSource(): DataSource {
  if (typeof window === "undefined") return "local";
  return localStorage.getItem(DATABRICKS_FLAG) === "1" ? "databricks" : "local";
}

export function setDataSource(src: DataSource) {
  localStorage.setItem(DATABRICKS_FLAG, src === "databricks" ? "1" : "0");
  window.dispatchEvent(new CustomEvent("sehat:datasource"));
}

export interface SearchResult extends AgentResult {
  source: DataSource;
}

export async function searchFacilities(query: string): Promise<SearchResult> {
  const source = getDataSource();
  if (source === "databricks") {
    try {
      const { data, error } = await supabase.functions.invoke("databricks-search", {
        body: { query },
      });
      if (error) throw error;
      if (data?.result) return { ...(data.result as AgentResult), source: "databricks" };
    } catch (e) {
      console.warn("Databricks search failed, falling back to local index:", e);
    }
  }
  const facilities = await loadFacilities();
  return { ...runAgent(query, facilities), source: "local" };
}

export interface TrustListParams {
  search?: string;
  sortBy?: "trust" | "name" | "contraN" | "missN";
  asc?: boolean;
  limit?: number;
}

export interface TrustListResult {
  rows: FacilitySlim[];
  total: number;
  source: DataSource;
}

export async function listTrust(params: TrustListParams): Promise<TrustListResult> {
  const source = getDataSource();
  if (source === "databricks") {
    try {
      const { data, error } = await supabase.functions.invoke("databricks-trust", {
        body: params,
      });
      if (error) throw error;
      if (data?.rows) return { rows: data.rows, total: data.total, source: "databricks" };
    } catch (e) {
      console.warn("Databricks trust list failed, falling back to local index:", e);
    }
  }
  const facilities = await loadFacilities();
  const search = (params.search || "").toLowerCase();
  const filtered = search
    ? facilities.filter(
        (f) =>
          f.name.toLowerCase().includes(search) ||
          f.state.toLowerCase().includes(search) ||
          (f.district || "").toLowerCase().includes(search),
      )
    : facilities;
  const sortBy = params.sortBy ?? "contraN";
  const dir = params.asc ? 1 : -1;
  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case "name":
        return a.name.localeCompare(b.name) * dir;
      case "contraN":
        return (a.contraN - b.contraN) * dir;
      case "missN":
        return (a.missN - b.missN) * dir;
      default:
        return (a.trust - b.trust) * dir;
    }
  });
  return { rows: sorted.slice(0, params.limit ?? 100), total: sorted.length, source: "local" };
}

export async function getFacilityDetail(id: string): Promise<FacilityDetail | undefined> {
  const all = await loadDetails();
  return all[id];
}

// Reactive hook for components that want to re-render when the user flips the
// data-source toggle.
import { useEffect, useState } from "react";
export function useDataSource() {
  const [src, setSrc] = useState<DataSource>(() => getDataSource());
  useEffect(() => {
    const onChange = () => setSrc(getDataSource());
    window.addEventListener("sehat:datasource", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("sehat:datasource", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);
  return [src, setDataSource] as const;
}
