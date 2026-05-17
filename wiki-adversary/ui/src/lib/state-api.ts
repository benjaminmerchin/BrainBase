"use client";

import { useEffect, useRef, useState } from "react";

const POLL_MS = 1000;

export type ApiClaim = {
  id: string;
  text: string;
  truth: boolean;
  verdict: boolean | null;
  rationale?: string;
};

export type EventEntry = {
  ts: number;
  kind: string;
  level: "info" | "success" | "warn" | "error";
  message: string;
};

export type HistoryEntry = { index: number; scorePct: number };

export type ApiState = {
  available: boolean;
  status: string;
  round: {
    index: number;
    scorePct: number;
    status: string;
    claims: ApiClaim[];
  } | null;
  vulnerabilities: { claim: string; severity: number }[];
  additions: string[];
  events: EventEntry[];
  wiki: string[];
  history: HistoryEntry[];
};

const EMPTY: ApiState = {
  available: false,
  status: "offline",
  round: null,
  vulnerabilities: [],
  additions: [],
  events: [],
  wiki: [],
  history: [],
};

export function useLiveState(): ApiState | null {
  const [state, setState] = useState<ApiState | null>(null);
  const aborted = useRef(false);

  useEffect(() => {
    aborted.current = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      try {
        const res = await fetch("/api/state", { cache: "no-store" });
        const data: ApiState = await res.json();
        if (!aborted.current) setState(data);
      } catch {
        if (!aborted.current) setState((s) => s ?? EMPTY);
      } finally {
        if (!aborted.current) timer = setTimeout(tick, POLL_MS);
      }
    };
    tick();
    return () => {
      aborted.current = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  return state;
}
