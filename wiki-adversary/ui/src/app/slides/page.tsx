"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BookX,
  Check,
  Database,
  Eye,
  FileWarning,
  Home,
  Network,
  Pencil,
  Play,
  ScrollText,
  Sparkles,
  Sword,
  TrendingUp,
  X,
} from "lucide-react";

import { AuroraText } from "@/components/ui/aurora-text";
import { BorderBeam } from "@/components/ui/border-beam";
import { NumberTicker } from "@/components/ui/number-ticker";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useLiveState, type HistoryEntry } from "@/lib/state-api";

const TOTAL_SLIDES = 12;

export default function SlidesPage() {
  const [i, setI] = useState(0);
  const next = useCallback(() => setI((v) => Math.min(v + 1, TOTAL_SLIDES - 1)), []);
  const prev = useCallback(() => setI((v) => Math.max(v - 1, 0)), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev]);

  const live = useLiveState();

  return (
    <div className="relative min-h-dvh overflow-hidden bg-background text-foreground">
      {/* Background decoration shared by all slides */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-dot-grid opacity-40" />
      <div className="pointer-events-none absolute left-1/2 top-32 -z-10 h-[440px] w-[640px] -translate-x-1/2 bg-orb-violet blur-3xl" />
      <div className="pointer-events-none absolute right-1/4 top-64 -z-10 h-[300px] w-[300px] bg-orb-cyan blur-3xl" />

      {/* Top bar */}
      <header className="fixed top-0 z-50 flex w-full items-center justify-between border-b border-border/40 bg-background/60 px-6 py-3 backdrop-blur-xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <Home className="h-3.5 w-3.5" />
          Back to dashboard
        </Link>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="hidden text-[10px] sm:inline">
            ← → arrows to navigate
          </span>
          <span className="font-mono tabular-nums">
            {i + 1} / {TOTAL_SLIDES}
          </span>
        </div>
      </header>

      {/* Slide stage */}
      <main className="flex min-h-dvh items-center justify-center px-8 pb-24 pt-20 sm:px-16">
        <div className="w-full max-w-7xl">
          {i === 0 && <Slide1 />}
          {i === 1 && <Slide2 />}
          {i === 2 && <Slide3 />}
          {i === 3 && <Slide4 />}
          {i === 4 && <Slide5Live live={live} />}
          {i === 5 && <Slide6Wiki wiki={live?.wiki ?? []} />}
          {i === 6 && <Slide7Graph available={!!live?.available} roundIndex={live?.round?.index ?? 0} />}
          {i === 7 && <Slide8Trend history={live?.history ?? []} />}
          {i === 8 && <Slide9Numbers />}
          {i === 9 && <Slide10Redis />}
          {i === 10 && <Slide11Stack />}
          {i === 11 && <Slide12Thanks />}
        </div>
      </main>

      {/* Nav controls */}
      <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2">
        <button
          onClick={prev}
          disabled={i === 0}
          className="grid h-10 w-10 place-items-center rounded-full border border-border/60 bg-background/80 backdrop-blur transition-colors hover:bg-card disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-1.5 px-3">
          {Array.from({ length: TOTAL_SLIDES }).map((_, idx) => (
            <button
              key={idx}
              onClick={() => setI(idx)}
              className={cn(
                "h-1.5 rounded-full transition-all",
                idx === i ? "w-6 bg-foreground" : "w-1.5 bg-border hover:bg-muted-foreground",
              )}
              aria-label={`Slide ${idx + 1}`}
            />
          ))}
        </div>
        <button
          onClick={next}
          disabled={i === TOTAL_SLIDES - 1}
          className="grid h-10 w-10 place-items-center rounded-full border border-border/60 bg-background/80 backdrop-blur transition-colors hover:bg-card disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/* ---------- slides ---------- */

function Slide1() {
  return (
    <div className="text-center">
      <Badge variant="outline" className="mb-8 border-border/60 text-xs">
        Cognee × Redis · San Francisco · 2026-05-16
      </Badge>
      <h1 className="text-balance text-5xl font-semibold leading-[1.05] tracking-[-0.03em] sm:text-7xl lg:text-8xl">
        A wiki that gets smarter
        <br />
        by being{" "}
        <AuroraText
          className="font-semibold"
          colors={["#a78bfa", "#7c3aed", "#22d3ee", "#a78bfa"]}
        >
          lied to.
        </AuroraText>
      </h1>
      <p className="mx-auto mt-10 max-w-2xl text-pretty text-2xl text-muted-foreground">
        Wiki Adversary — an adversarial self-hardening LLM wiki.
      </p>
      <p className="mt-16 text-xs text-muted-foreground/70">
        Press <kbd className="rounded border border-border/60 bg-card px-1.5 py-0.5 font-mono">→</kbd> to begin
      </p>
    </div>
  );
}

function Slide2() {
  return (
    <div>
      <h2 className="mb-12 text-center text-5xl font-medium tracking-tight sm:text-7xl">
        Most wikis improve by being{" "}
        <span className="text-muted-foreground">told the truth.</span>
      </h2>
      <h2 className="text-center text-5xl font-semibold tracking-tight sm:text-7xl">
        Ours improves by being{" "}
        <AuroraText className="font-semibold" colors={["#fb7185", "#a78bfa", "#22d3ee", "#fb7185"]}>
          lied to.
        </AuroraText>
      </h2>
      <p className="mx-auto mt-16 max-w-3xl text-center text-xl text-muted-foreground">
        Inspired by Karpathy&apos;s LLM Wiki note — &ldquo;the LLM
        incrementally builds and maintains a persistent wiki.&rdquo;
      </p>
    </div>
  );
}

function Slide3() {
  return (
    <div>
      <h2 className="mb-3 text-center text-5xl font-semibold tracking-tight sm:text-6xl">
        Three agents.
      </h2>
      <p className="mb-12 text-center text-xl text-muted-foreground">
        Each one reads different things. That asymmetry is the whole game.
      </p>
      <div className="grid gap-4 lg:grid-cols-3">
        <AgentCard
          icon={<Sword className="h-5 w-5 text-rose-400" />}
          name="Attacker"
          reads="canonical truth source"
          outputs="5 claims · half true, half false"
          tone="rose"
        />
        <AgentCard
          icon={<Eye className="h-5 w-5 text-emerald-400" />}
          name="Defender"
          reads="the wiki (cognee graph)"
          outputs="TRUE / FALSE verdict"
          tone="emerald"
        />
        <AgentCard
          icon={<Sparkles className="h-5 w-5 text-violet-400" />}
          name="Oracle"
          reads="canonical truth · independent"
          outputs="ground truth (what we trust)"
          tone="violet"
          beam
        />
      </div>
      <p className="mt-10 text-center text-xl text-muted-foreground">
        Decisions compare <strong className="text-foreground">Defender vs Oracle</strong> — never the Attacker&apos;s own labels.
      </p>
    </div>
  );
}

function Slide4() {
  return (
    <div>
      <h2 className="mb-3 text-center text-5xl font-semibold tracking-tight sm:text-6xl">
        The wiki starts <span className="text-rose-400">wrong</span>.
      </h2>
      <p className="mb-12 text-center text-xl text-muted-foreground">
        Same topic, two files. Spot the difference.
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        <SourceCard
          icon={<FileWarning className="h-5 w-5 text-rose-400" />}
          title="data/sample_source.md"
          subtitle="What's loaded into the wiki"
          tone="rose"
          lines={[
            "exposes four operations: `store`, `query`, `delete`, ...",
            "version 1.2.0 (released March 2026)",
            "REDIS_HOST env var, IVF indexing, dims=768",
            "CLI is `cognee-bin`, UI on http://localhost:8080",
          ]}
        />
        <SourceCard
          icon={<Check className="h-5 w-5 text-emerald-400" />}
          title="data/source_truth.md"
          subtitle="What Attacker + Oracle read"
          tone="emerald"
          lines={[
            "exposes four operations: `remember`, `recall`, `forget`, ...",
            "version 1.1.0 (released April 2026)",
            "REDIS_URL env var, HNSW indexing, dims=1536",
            "CLI is `cognee-cli`, UI on http://localhost:3000",
          ]}
        />
      </div>
      <p className="mt-10 text-center text-xl text-muted-foreground">
        The wiki is intentionally seeded with errors. The attacker generates honest claims about the real source. The wiki fails. Then it heals.
      </p>
    </div>
  );
}

function Slide5Live({ live }: { live: ReturnType<typeof useLiveState> }) {
  const round = live?.round;
  return (
    <div>
      <h2 className="mb-3 text-center text-5xl font-semibold tracking-tight sm:text-6xl">
        Watch it run.
      </h2>
      <p className="mb-8 text-center text-xl text-muted-foreground">
        Live data — round {round?.index ?? "—"} · status: {live?.status ?? "—"}
      </p>
      <div className="rounded-xl border border-border/60 bg-card p-8">
        <div className="mb-6 flex items-center justify-between">
          <span className="text-base text-muted-foreground">Current round score</span>
          {round && (
            <span className="text-7xl font-semibold tracking-tight">
              <NumberTicker
                key={`slide5-${round.index}`}
                value={round.scorePct}
                className="text-foreground"
              />
              <span className="text-muted-foreground">%</span>
            </span>
          )}
        </div>
        {round && (
          <div className="grid gap-3 sm:grid-cols-2">
            {round.claims.map((c) => {
              const correct = c.verdict !== null && c.verdict === c.truth;
              const wrong = c.verdict !== null && c.verdict !== c.truth;
              return (
                <div
                  key={c.id}
                  className={cn(
                    "rounded-lg border px-4 py-3 text-base",
                    correct && "border-emerald-500/30 bg-emerald-500/5",
                    wrong && "border-rose-500/30 bg-rose-500/5",
                    !correct && !wrong && "border-border/60 bg-secondary/30",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="leading-snug">{c.text}</span>
                    {correct && <Check className="h-5 w-5 shrink-0 text-emerald-400" />}
                    {wrong && <X className="h-5 w-5 shrink-0 text-rose-400" />}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Slide6Wiki({ wiki }: { wiki: string[] }) {
  const corrections = wiki.filter((w) => w.startsWith("Correction"));
  return (
    <div>
      <h2 className="mb-3 text-center text-5xl font-semibold tracking-tight sm:text-6xl">
        The wiki self-heals.
      </h2>
      <p className="mb-8 text-center text-xl text-muted-foreground">
        Each miss writes a new entry into the cognee graph.
      </p>
      <div className="rounded-xl border border-border/60 bg-card">
        <div className="border-b border-border/60 px-6 py-4 text-base">
          <span className="font-medium">Wiki contents</span>
          <span className="ml-2 text-muted-foreground">
            {wiki.length} entries · {corrections.length} corrections
          </span>
        </div>
        <ScrollArea className="h-[480px] p-5">
          <div className="space-y-3">
            {wiki.map((fact, idx) => {
              const isCorrection = fact.startsWith("Correction");
              return (
                <pre
                  key={idx}
                  className={cn(
                    "overflow-x-auto whitespace-pre-wrap rounded-lg p-4 text-sm leading-relaxed",
                    isCorrection
                      ? "border border-emerald-500/30 bg-emerald-500/5 text-foreground/90"
                      : "border border-border/60 bg-secondary/30 text-muted-foreground",
                  )}
                >
                  {isCorrection && (
                    <span className="mb-2 mr-2 inline-block rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-emerald-300">
                      patched
                    </span>
                  )}
                  {fact}
                </pre>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

function Slide7Graph({ available, roundIndex }: { available: boolean; roundIndex: number }) {
  return (
    <div>
      <h2 className="mb-3 text-center text-5xl font-semibold tracking-tight sm:text-6xl">
        The knowledge graph.
      </h2>
      <p className="mb-8 text-center text-xl text-muted-foreground">
        Cognee&apos;s D3 force-directed view · refreshed every round
      </p>
      <div className="overflow-hidden rounded-xl border border-border/60 bg-white">
        {available ? (
          <iframe
            key={`slide-graph-${roundIndex}`}
            src={`/api/graph?r=${roundIndex}`}
            title="Cognee knowledge graph"
            className="block h-[520px] w-full border-0"
            sandbox="allow-scripts allow-same-origin"
          />
        ) : (
          <div className="grid h-[520px] place-items-center text-sm text-muted-foreground">
            Backend offline — start the Python loop to see the graph.
          </div>
        )}
      </div>
    </div>
  );
}

function Slide8Trend({ history }: { history: HistoryEntry[] }) {
  if (history.length === 0) {
    return (
      <div>
        <h2 className="mb-3 text-center text-5xl font-semibold tracking-tight sm:text-6xl">
          Improvement is empirical.
        </h2>
        <p className="text-center text-muted-foreground">
          No rounds yet — start the Python loop and refresh.
        </p>
      </div>
    );
  }
  const last = history[history.length - 1].scorePct;
  const first = history[0].scorePct;
  const delta = last - first;
  const avg = Math.round(history.reduce((a, h) => a + h.scorePct, 0) / history.length);

  return (
    <div>
      <h2 className="mb-3 text-center text-5xl font-semibold tracking-tight sm:text-6xl">
        Improvement is empirical.
      </h2>
      <p className="mb-12 text-center text-xl text-muted-foreground">
        Score across {history.length} round{history.length === 1 ? "" : "s"} — measured, not narrated.
      </p>
      <div className="grid grid-cols-3 gap-4">
        <BigStat label="Round 1" value={`${first}%`} />
        <BigStat label="Average" value={`${avg}%`} />
        <BigStat label="Latest" value={`${last}%`} tone="good" />
      </div>
      <div className="mt-8 rounded-xl border border-border/60 bg-card p-6">
        <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>Round-by-round defender accuracy</span>
          <span className={cn(delta >= 0 ? "text-emerald-400" : "text-rose-400")}>
            {delta >= 0 ? "+" : ""}{delta} pts vs round 1
          </span>
        </div>
        <div className="flex items-end gap-1.5">
          {history.map((h) => {
            const tone =
              h.scorePct >= 80
                ? "from-emerald-500/60 to-emerald-400"
                : h.scorePct >= 50
                  ? "from-amber-500/60 to-amber-400"
                  : "from-rose-500/60 to-rose-400";
            return (
              <div
                key={h.index}
                title={`Round ${h.index}: ${h.scorePct}%`}
                className="group flex flex-1 flex-col items-center"
              >
                <div
                  className="relative w-full overflow-hidden rounded-t"
                  style={{ height: `${Math.max(4, h.scorePct * 1.1)}px` }}
                >
                  <div className={cn("absolute inset-0 bg-gradient-to-t", tone)} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Slide9Numbers() {
  return (
    <div>
      <p className="text-center text-xs uppercase tracking-[0.25em] text-muted-foreground">
        Reproducible benchmark · same 10 claims
      </p>
      <div className="my-12 grid grid-cols-3 items-center gap-6">
        <div className="text-center">
          <div className="text-7xl font-semibold tracking-tight text-rose-400">30%</div>
          <div className="mt-2 text-xs uppercase tracking-wider text-muted-foreground">Baseline</div>
          <div className="mt-1 text-xs text-muted-foreground">corrupted wiki</div>
        </div>
        <ArrowRight className="mx-auto h-12 w-12 text-muted-foreground/60" />
        <div className="text-center">
          <div className="text-7xl font-semibold tracking-tight text-emerald-400">90%</div>
          <div className="mt-2 text-xs uppercase tracking-wider text-muted-foreground">Improved</div>
          <div className="mt-1 text-xs text-muted-foreground">one correction round</div>
        </div>
      </div>
      <div className="text-center">
        <div className="inline-flex items-center gap-3 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-6 py-3 text-xl font-medium text-emerald-300">
          <TrendingUp className="h-5 w-5" />
          +60 points · 7 claims flipped from wrong to right
        </div>
      </div>
      <p className="mx-auto mt-12 max-w-xl text-center text-sm text-muted-foreground">
        Same frozen test set, judged before and after corrections were injected.
        See <code>benchmark.py</code> + <code>bench_results.md</code>.
      </p>
    </div>
  );
}

function Slide10Redis() {
  const keys = [
    { name: "round:current", type: "string", desc: "JSON snapshot of the round in progress" },
    { name: "vulnerabilities", type: "zset", desc: "claims that fooled the Defender, severity-ranked" },
    { name: "wiki:contents", type: "list", desc: "live wiki snapshot, corrections at top" },
    { name: "events:log", type: "list", desc: "every backend action, streamed to the UI" },
    { name: "rounds:history", type: "list", desc: "score per round → drives the trend chart" },
    { name: "graph:html", type: "string", desc: "latest D3 visualization, served as iframe" },
  ];
  return (
    <div>
      <h2 className="mb-3 text-center text-5xl font-semibold tracking-tight sm:text-6xl">
        Built on{" "}
        <AuroraText className="font-semibold" colors={["#dc382d", "#a78bfa", "#22d3ee", "#dc382d"]}>
          Redis Cloud
        </AuroraText>
      </h2>
      <p className="mb-10 text-center text-xl text-muted-foreground">
        Not a cache. Six keys do all the state — no FastAPI sidecar.
      </p>
      <div className="rounded-xl border border-border/60 bg-card">
        <div className="divide-y divide-border/40">
          {keys.map((k) => (
            <div key={k.name} className="flex items-center gap-5 px-6 py-4">
              <Database className="h-5 w-5 shrink-0 text-muted-foreground/60" />
              <code className="w-56 shrink-0 text-lg text-foreground/90">{k.name}</code>
              <Badge variant="outline" className="shrink-0 border-border/60 text-xs uppercase">
                {k.type}
              </Badge>
              <span className="text-lg text-muted-foreground">{k.desc}</span>
            </div>
          ))}
        </div>
      </div>
      <p className="mt-10 text-center text-xl text-muted-foreground">
        Python loop writes · Next.js route reads · UI polls /api/state at 1 Hz.
      </p>
    </div>
  );
}

function Slide11Stack() {
  const stack = [
    {
      group: "Memory",
      items: [
        { name: "Cognee 1.1", desc: "knowledge graph + memory engine" },
        { name: "Redis Cloud", desc: "every key shapes the UI · no FastAPI" },
      ],
    },
    {
      group: "AI",
      items: [
        { name: "OpenAI gpt-5.4-nano", desc: "Attacker · Defender · Oracle" },
        { name: "D3 force graph", desc: "via cognee.visualize()" },
      ],
    },
    {
      group: "Frontend",
      items: [
        { name: "Next.js 16", desc: "App Router · Turbopack" },
        { name: "React 19 · Tailwind v4", desc: "shadcn/ui + MagicUI" },
      ],
    },
    {
      group: "Backend",
      items: [
        { name: "Python 3.12", desc: "asyncio loop · ~250 lines" },
        { name: "ioredis", desc: "single-key reads from the Next route" },
      ],
    },
  ];
  return (
    <div>
      <h2 className="mb-3 text-center text-5xl font-semibold tracking-tight sm:text-6xl">
        Built with.
      </h2>
      <p className="mb-12 text-center text-xl text-muted-foreground">
        Off-the-shelf parts. Three hours of code.
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        {stack.map((g) => (
          <div
            key={g.group}
            className="rounded-xl border border-border/60 bg-card p-6"
          >
            <div className="mb-4 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              {g.group}
            </div>
            <div className="space-y-3">
              {g.items.map((it) => (
                <div
                  key={it.name}
                  className="flex items-baseline justify-between gap-4 border-b border-border/40 pb-4 last:border-b-0 last:pb-0"
                >
                  <span className="text-xl font-medium tracking-tight">
                    {it.name}
                  </span>
                  <span className="text-right text-base text-muted-foreground">
                    {it.desc}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-10 text-center text-xs text-muted-foreground">
        Open source · MIT · github.com/benjaminmerchin/BrainBase
      </p>
    </div>
  );
}

function Slide12Thanks() {
  const repo = "https://github.com/benjaminmerchin/BrainBase";
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=0&color=ffffff&bgcolor=0a0a0a&format=svg&data=${encodeURIComponent(repo)}`;
  return (
    <div className="text-center">
      <h2 className="text-balance text-6xl font-semibold leading-[1.05] tracking-[-0.03em] sm:text-7xl">
        Thanks.
      </h2>
      <p className="mx-auto mt-8 max-w-2xl text-pretty text-2xl text-muted-foreground">
        Scan to open the repo · happy to take questions.
      </p>
      <div className="mx-auto mt-10 inline-block rounded-2xl border border-border/60 bg-card p-4">
        <img
          src={qr}
          alt={`QR code linking to ${repo}`}
          width={320}
          height={320}
          className="block h-[260px] w-[260px] sm:h-[320px] sm:w-[320px]"
        />
      </div>
      <div className="mt-8 inline-flex flex-col items-center gap-2 text-lg">
        <a
          href={repo}
          target="_blank"
          rel="noreferrer"
          className="font-mono text-xl text-foreground transition-colors hover:text-violet-400"
        >
          github.com/benjaminmerchin/BrainBase
        </a>
        <span className="text-base text-muted-foreground">
          Benjamin Merchin · Wiki Adversary · 2026-05-16
        </span>
      </div>
    </div>
  );
}

/* ---------- sub-components ---------- */

function AgentCard({
  icon,
  name,
  reads,
  outputs,
  tone,
  beam,
}: {
  icon: React.ReactNode;
  name: string;
  reads: string;
  outputs: string;
  tone: "rose" | "emerald" | "violet";
  beam?: boolean;
}) {
  const border = {
    rose: "border-rose-500/30",
    emerald: "border-emerald-500/30",
    violet: "border-violet-500/30",
  }[tone];
  return (
    <div className={cn("relative overflow-hidden rounded-xl border bg-card p-6", border)}>
      <div className="mb-5 flex items-center gap-2.5">
        {icon}
        <span className="text-2xl font-medium">{name}</span>
      </div>
      <div className="space-y-4 text-lg">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Reads</div>
          <div className="mt-1 text-foreground/90">{reads}</div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Outputs</div>
          <div className="mt-1 text-foreground/90">{outputs}</div>
        </div>
      </div>
      {beam && (
        <BorderBeam size={120} duration={8} colorFrom="#a78bfa" colorTo="#22d3ee" />
      )}
    </div>
  );
}

function SourceCard({
  icon,
  title,
  subtitle,
  tone,
  lines,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  tone: "rose" | "emerald";
  lines: string[];
}) {
  const border = tone === "rose" ? "border-rose-500/30" : "border-emerald-500/30";
  const bg = tone === "rose" ? "bg-rose-500/5" : "bg-emerald-500/5";
  return (
    <div className={cn("rounded-xl border bg-card", border)}>
      <div className="flex items-center gap-3 border-b border-border/60 px-6 py-4">
        {icon}
        <div>
          <div className="font-mono text-lg">{title}</div>
          <div className="text-sm text-muted-foreground">{subtitle}</div>
        </div>
      </div>
      <ul className={cn("space-y-3 p-6", bg)}>
        {lines.map((line) => (
          <li key={line} className="font-mono text-sm leading-relaxed text-foreground/90">
            <Pencil className="mr-2 inline h-3.5 w-3.5 text-muted-foreground/60" />
            {line}
          </li>
        ))}
      </ul>
    </div>
  );
}

function BigStat({ label, value, tone }: { label: string; value: string; tone?: "good" }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-6 text-center">
      <div
        className={cn(
          "text-5xl font-semibold tracking-tight",
          tone === "good" && "text-emerald-400",
        )}
      >
        {value}
      </div>
      <div className="mt-2 text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
    </div>
  );
}
