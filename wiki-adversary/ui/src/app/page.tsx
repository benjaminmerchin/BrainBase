"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Check,
  Code2,
  Play,
  Shield,
  Sparkles,
  Sword,
  X,
  Zap,
} from "lucide-react";

import { AnimatedList } from "@/components/ui/animated-list";
import { AuroraText } from "@/components/ui/aurora-text";
import { BorderBeam } from "@/components/ui/border-beam";
import { NumberTicker } from "@/components/ui/number-ticker";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  ROUND_1,
  ROUND_2,
  SKILL_DIFF,
  VULNERABILITIES,
  type Round,
  type Vulnerability,
} from "@/lib/demo-data";

const MOCK_CYCLE_MS = 6000;
const POLL_MS = 1000;

type ApiClaim = {
  id: string;
  text: string;
  truth: boolean;
  verdict: boolean | null;
  rationale?: string;
};
type EventEntry = {
  ts: number;
  kind: string;
  level: "info" | "success" | "warn" | "error";
  message: string;
};
type ApiState = {
  available: boolean;
  status: string;
  round: { index: number; scorePct: number; status: string; claims: ApiClaim[] } | null;
  vulnerabilities: { claim: string; severity: number }[];
  additions: string[];
  events: EventEntry[];
};

function useLiveState(): ApiState | null {
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
        if (!aborted.current) setState((s) => s ?? { available: false, status: "offline", round: null, vulnerabilities: [], additions: [], events: [] });
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

export default function Home() {
  const live = useLiveState();
  const isLive = !!(live?.available && live.round);

  // Mock fallback — only runs when live data is unavailable.
  const [mockKey, setMockKey] = useState(0);
  const [showImproved, setShowImproved] = useState(false);
  const advance = useCallback(() => {
    setShowImproved((v) => !v);
    setMockKey((k) => k + 1);
  }, []);
  useEffect(() => {
    if (isLive) return;
    const t = setTimeout(advance, MOCK_CYCLE_MS);
    return () => clearTimeout(t);
  }, [mockKey, advance, isLive]);

  const round: Round = isLive
    ? {
        index: live!.round!.index,
        scorePct: live!.round!.scorePct,
        claims: live!.round!.claims.map((c) => ({
          id: c.id,
          text: c.text,
          truth: c.truth,
          verdict: c.verdict,
        })),
      }
    : showImproved
      ? ROUND_2
      : ROUND_1;

  const vulnerabilities: Vulnerability[] = isLive
    ? live!.vulnerabilities.map((v) => ({ claim: v.claim, severity: v.severity }))
    : VULNERABILITIES;

  const additions: string[] | null = isLive ? live!.additions : null;
  const events: EventEntry[] = isLive ? live!.events : [];
  const roundKey = isLive ? `live-${round.index}` : `mock-${mockKey}`;

  return (
    <div className="relative min-h-dvh overflow-x-clip bg-background text-foreground">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/60 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6 sm:px-10">
          <div className="flex items-center gap-2.5">
            <div className="grid h-7 w-7 place-items-center rounded-md bg-foreground/95 text-background">
              <Shield className="h-4 w-4" />
            </div>
            <span className="text-sm font-medium tracking-tight">
              Wiki Adversary
            </span>
            {isLive && (
              <span className="ml-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                </span>
                Live · {live?.status}
              </span>
            )}
          </div>
          <nav className="flex items-center gap-1">
            <a
              href="#how"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "text-muted-foreground hover:text-foreground",
              )}
            >
              How it works
            </a>
            <a
              href="#demo"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "text-muted-foreground hover:text-foreground",
              )}
            >
              Demo
            </a>
            <a
              href="https://github.com/benjaminmerchin/BrainBase"
              target="_blank"
              rel="noreferrer"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "gap-1.5",
              )}
            >
              <Code2 className="h-3.5 w-3.5" />
              GitHub
            </a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative isolate overflow-hidden border-b border-border/40 px-6 pb-28 pt-24 sm:px-10 sm:pt-32">
        <div className="absolute inset-0 -z-10 bg-dot-grid mask-radial" />
        <div className="absolute left-1/2 top-32 -z-10 h-[440px] w-[640px] -translate-x-1/2 bg-orb-violet blur-3xl" />
        <div className="absolute right-1/4 top-48 -z-10 h-[300px] w-[300px] bg-orb-cyan blur-3xl" />

        <div className="mx-auto max-w-4xl text-center">
          <a
            href="https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f"
            target="_blank"
            rel="noreferrer"
            className="group mb-7 inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/40 px-3 py-1 text-xs text-muted-foreground backdrop-blur transition-colors hover:border-border hover:text-foreground"
          >
            <Sparkles className="h-3 w-3 text-violet-400" />
            Inspired by Karpathy&apos;s LLM Wiki
            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </a>
          <h1 className="text-balance text-5xl font-semibold leading-[1.05] tracking-[-0.03em] sm:text-6xl lg:text-7xl">
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
          <p className="mx-auto mt-7 max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">
            Most agents improve when users tell them the truth. Wiki Adversary
            improves when an attacker tries to fool it. Each surviving lie
            rewrites the Defender skill and reinforces the graph.
          </p>
          <div className="mt-9 flex items-center justify-center gap-3">
            <a
              href="#demo"
              className={cn(
                buttonVariants({ size: "lg" }),
                "h-11 gap-2 px-5",
              )}
            >
              <Play className="h-4 w-4" />
              See it live
            </a>
            <a
              href="#how"
              className={cn(
                buttonVariants({ size: "lg", variant: "outline" }),
                "h-11 gap-2 px-5",
              )}
            >
              <BookOpen className="h-4 w-4" />
              How it works
            </a>
          </div>

          <div className="mt-16 flex flex-col items-center gap-4">
            <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground/70">
              Built on
            </span>
            <div className="flex items-center gap-8 text-sm text-muted-foreground">
              <span className="font-medium tracking-tight">cognee</span>
              <span className="h-3 w-px bg-border" />
              <span className="font-medium tracking-tight">Redis</span>
              <span className="h-3 w-px bg-border" />
              <span className="font-medium tracking-tight">Next.js 16</span>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section
        id="how"
        className="border-b border-border/40 px-6 py-24 sm:px-10"
      >
        <div className="mx-auto max-w-7xl">
          <div className="mb-14 max-w-2xl">
            <Badge variant="outline" className="mb-3 border-border/60 text-xs">
              The loop
            </Badge>
            <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              Three operations.{" "}
              <span className="text-muted-foreground">One closed loop.</span>
            </h2>
            <p className="mt-3 text-muted-foreground">
              The wiki is not improved by humans labeling correct answers. It is
              improved by surviving plausible falsehoods generated from the same
              source.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <StepCard
              index="01"
              icon={<BookOpen className="h-4 w-4" />}
              title="Ingest"
              code={`cognee.remember(source,\n  content_type="documents")`}
            >
              The source document is parsed into a Cognee knowledge graph —
              entities, relationships, summaries.
            </StepCard>
            <StepCard
              index="02"
              icon={<Sword className="h-4 w-4 text-rose-400" />}
              title="Attack & Defend"
              code={`XADD attacks:pending {claim}\nsearch(skills=["defender"],\n  session_id=round)`}
            >
              An Attacker emits true and false claims into a Redis stream. The
              Defender answers from the graph. Redis is the session memory.
            </StepCard>
            <StepCard
              index="03"
              icon={<Sparkles className="h-4 w-4 text-violet-400" />}
              title="Self-improve"
              code={`SkillRunEntry(score=0)\nimprove_skill(apply=True)`}
              accent
            >
              Missed claims become a SkillRunEntry. Cognee proposes a rewrite of
              the Defender skill; <code>improve_skill</code> applies it.
            </StepCard>
          </div>
        </div>
      </section>

      {/* Demo */}
      <section id="demo" className="relative px-6 py-24 sm:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
            <div className="max-w-2xl">
              <Badge
                variant="outline"
                className="mb-3 border-border/60 text-xs"
              >
                Live demo
              </Badge>
              <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                Watch the wiki harden, round by round.
              </h2>
              <p className="mt-3 text-muted-foreground">
                Run a round of 5 claims. The Defender starts at 40% accuracy
                and reaches 90% once the skill is auto-rewritten.
              </p>
            </div>
            <Button onClick={advance} size="lg" className="h-11 gap-2 px-5">
              <Play className="h-4 w-4" />
              Skip to next round
            </Button>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <DashCard
              icon={<Sword className="h-4 w-4 text-rose-400" />}
              title="Attacker"
              subtitle="Generates plausible-but-false claims from the source."
            >
              <ScrollArea className="h-[420px] pr-3">
                <AnimatedList key={`atk-${roundKey}`} delay={650}>
                  {round.claims.map((c) => (
                    <div
                      key={c.id}
                      className="w-full rounded-xl border border-rose-500/15 bg-rose-500/5 px-4 py-3 text-sm"
                    >
                      <p className="leading-snug">{c.text}</p>
                      <div className="mt-2">
                        <Badge
                          variant="outline"
                          className="border-rose-500/30 text-[10px] text-rose-300/90"
                        >
                          actually {c.truth ? "TRUE" : "FALSE"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </AnimatedList>
              </ScrollArea>
            </DashCard>

            <DashCard
              icon={<Shield className="h-4 w-4 text-emerald-400" />}
              title="Defender"
              subtitle="Judges TRUE/FALSE against the Cognee knowledge graph."
            >
              <ScrollArea className="h-[420px] pr-3">
                <AnimatedList key={`def-${roundKey}`} delay={650}>
                  {round.claims.map((c) => {
                    const correct = c.verdict === c.truth;
                    return (
                      <div
                        key={c.id}
                        className={cn(
                          "w-full rounded-xl border bg-card px-4 py-3 text-sm transition-colors",
                          correct
                            ? "border-emerald-500/30 bg-emerald-500/5"
                            : "border-rose-500/30 bg-rose-500/5",
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <p className="leading-snug">{c.text}</p>
                          {correct ? (
                            <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                          ) : (
                            <X className="h-4 w-4 shrink-0 text-rose-400" />
                          )}
                        </div>
                        <div className="mt-2 flex items-center gap-2 text-[10px]">
                          <Badge
                            variant="outline"
                            className="border-border/60 text-muted-foreground"
                          >
                            truth: {c.truth ? "TRUE" : "FALSE"}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={cn(
                              correct
                                ? "border-emerald-500/30 text-emerald-300"
                                : "border-rose-500/30 text-rose-300",
                            )}
                          >
                            verdict: {c.verdict ? "TRUE" : "FALSE"}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </AnimatedList>
              </ScrollArea>
            </DashCard>

            <div className="flex flex-col gap-4">
              <DashCard
                icon={<Zap className="h-4 w-4 text-amber-400" />}
                title="Score"
                subtitle={`Correct verdicts · round ${round.index}`}
                beam={showImproved}
              >
                <div className="text-5xl font-semibold tracking-tight">
                  <NumberTicker
                    key={`tick-${roundKey}`}
                    value={round.scorePct}
                    className="text-foreground"
                  />
                  <span className="text-muted-foreground">%</span>
                </div>
                <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full transition-[width] duration-700 ease-out",
                      showImproved
                        ? "bg-gradient-to-r from-emerald-400 to-emerald-500"
                        : "bg-gradient-to-r from-rose-400 to-rose-500",
                    )}
                    style={{ width: `${round.scorePct}%` }}
                  />
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  Round 1 baseline: 40% &nbsp;→&nbsp; after self-improve: 90%
                </p>
              </DashCard>

              <DashCard
                title="Top vulnerabilities"
                subtitle={
                  <span>
                    Redis ZSET <code>vulnerabilities</code> · severity desc
                  </span>
                }
              >
                <div className="space-y-2">
                  {vulnerabilities.map((v) => (
                    <div
                      key={v.claim}
                      className="flex items-center justify-between gap-3 rounded-md border border-border/60 bg-secondary/40 px-3 py-2 text-xs"
                    >
                      <span className="truncate text-muted-foreground">
                        {v.claim}
                      </span>
                      <Badge variant="destructive" className="shrink-0">
                        {v.severity.toFixed(2)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </DashCard>
            </div>
          </div>

          {/* Wiki growth — live: corrections injected; mock: skill diff */}
          {additions && additions.length > 0 ? (
            <DashCard
              className="mt-6"
              title="Wiki additions — facts injected after misses"
              subtitle={
                <>
                  Each missed claim is appended to the graph via{" "}
                  <code>cognee.remember(...)</code>. The wiki literally grows.
                </>
              }
            >
              <div className="space-y-2">
                {additions.map((fact, i) => (
                  <pre
                    key={i}
                    className="overflow-x-auto whitespace-pre-wrap rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs leading-relaxed text-foreground/90"
                  >
                    {fact}
                  </pre>
                ))}
              </div>
            </DashCard>
          ) : (
            <DashCard
              className="mt-6"
              title="Defender skill — auto-rewritten between rounds"
              subtitle={
                <>
                  <code>my_skills/defender/SKILL.md</code> · diff produced by{" "}
                  <code>improve_skill(apply=True)</code>
                </>
              }
            >
              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <div className="mb-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    Before · round 1
                  </div>
                  <pre className="overflow-x-auto rounded-lg border border-border/60 bg-secondary/40 p-3 text-xs leading-relaxed">
                    {SKILL_DIFF.before}
                  </pre>
                </div>
                <div>
                  <div className="mb-2 text-[10px] uppercase tracking-[0.2em] text-emerald-400">
                    After · round 2
                  </div>
                  <pre className="overflow-x-auto rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs leading-relaxed">
                    {SKILL_DIFF.after}
                  </pre>
                </div>
              </div>
            </DashCard>
          )}

          {events.length > 0 && (
            <DashCard
              className="mt-6"
              title="Pipeline log"
              subtitle="Every action the backend takes — newest first."
            >
              <ScrollArea className="h-[280px] pr-3">
                <div className="space-y-1.5 font-mono text-xs">
                  {events.map((e, i) => (
                    <EventRow key={`${e.ts}-${i}`} event={e} />
                  ))}
                </div>
              </ScrollArea>
            </DashCard>
          )}
        </div>
      </section>

      <footer className="border-t border-border/40 px-6 py-8 text-center text-xs text-muted-foreground sm:px-10">
        AI-Memory Hackathon · Cognee × Redis · San Francisco · 2026-05-16
      </footer>
    </div>
  );
}

/* ---------- internal components ---------- */

function EventRow({ event }: { event: EventEntry }) {
  const date = new Date(event.ts * 1000);
  const time = date.toLocaleTimeString("en-GB", { hour12: false });
  const ms = String(date.getMilliseconds()).padStart(3, "0");

  const tint = {
    info: "text-muted-foreground",
    success: "text-emerald-400",
    warn: "text-amber-400",
    error: "text-rose-400",
  }[event.level];

  const dot = {
    info: "bg-muted-foreground/60",
    success: "bg-emerald-400",
    warn: "bg-amber-400",
    error: "bg-rose-400",
  }[event.level];

  return (
    <div className="flex items-start gap-2.5 rounded-md px-2 py-1 transition-colors hover:bg-secondary/30">
      <span className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", dot)} />
      <span className="shrink-0 text-muted-foreground/70 tabular-nums">
        {time}.{ms}
      </span>
      <span className="shrink-0 rounded border border-border/60 bg-secondary/40 px-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        {event.kind}
      </span>
      <span className={cn("min-w-0 break-words", tint)}>{event.message}</span>
    </div>
  );
}

function StepCard({
  index,
  icon,
  title,
  children,
  code,
  accent,
}: {
  index: string;
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  code: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border border-border/60 bg-card p-6 transition-colors hover:border-border",
        accent && "border-violet-500/30",
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-mono">{index}</span>
          <span className="h-3 w-px bg-border" />
          {icon}
        </div>
      </div>
      <h3 className="mt-4 text-lg font-medium tracking-tight">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{children}</p>
      <pre className="mt-5 overflow-x-auto rounded-md border border-border/60 bg-secondary/40 p-3 text-[11px] leading-relaxed text-foreground/90">
        {code}
      </pre>
      {accent && (
        <BorderBeam
          size={120}
          duration={8}
          colorFrom="#a78bfa"
          colorTo="#22d3ee"
        />
      )}
    </div>
  );
}

function DashCard({
  title,
  subtitle,
  icon,
  children,
  className,
  beam,
}: {
  title: string;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  beam?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-border/60 bg-card",
        className,
      )}
    >
      <div className="border-b border-border/60 px-5 py-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          {icon}
          <span>{title}</span>
        </div>
        {subtitle && (
          <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>
      <div className="p-5">{children}</div>
      {beam && (
        <BorderBeam
          size={140}
          duration={6}
          colorFrom="#fbbf24"
          colorTo="#22d3ee"
        />
      )}
    </div>
  );
}
