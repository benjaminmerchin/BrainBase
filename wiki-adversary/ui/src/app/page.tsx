"use client";

import { useState } from "react";
import { Play, Shield, Sword, Zap } from "lucide-react";

import { AnimatedList } from "@/components/ui/animated-list";
import { AuroraText } from "@/components/ui/aurora-text";
import { NumberTicker } from "@/components/ui/number-ticker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ClaimCard } from "@/components/claim-card";
import {
  ROUND_1,
  ROUND_2,
  SKILL_DIFF,
  VULNERABILITIES,
} from "@/lib/demo-data";

export default function Home() {
  const [roundKey, setRoundKey] = useState(0);
  const [showImproved, setShowImproved] = useState(false);
  const round = showImproved ? ROUND_2 : ROUND_1;

  const trigger = () => {
    setShowImproved((v) => !v);
    setRoundKey((k) => k + 1);
  };

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="border-b border-border/60 bg-background/60 px-6 py-5 backdrop-blur sm:px-10">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Shield className="h-5 w-5 text-primary" />
            <span>Wiki Adversary</span>
            <Badge variant="secondary" className="ml-2 hidden sm:inline-flex">
              Cognee × Redis · 2026-05-16
            </Badge>
          </div>
          <Button onClick={trigger} size="sm" className="gap-2">
            <Play className="h-4 w-4" />
            {showImproved ? "Replay Round 1" : "Run Round 2"}
          </Button>
        </div>
      </header>

      <section className="px-6 py-16 sm:px-10 sm:py-24">
        <div className="mx-auto max-w-4xl text-center">
          <Badge variant="outline" className="mb-6">
            Adversarial self-hardening LLM wiki
          </Badge>
          <h1 className="text-balance text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
            A wiki that gets smarter by being{" "}
            <AuroraText className="font-bold">lied to.</AuroraText>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">
            Most agents improve when users tell them the truth. Wiki Adversary
            improves when an attacker tries to fool it. Each surviving lie
            rewrites the Defender&apos;s skill and reinforces the graph.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3 text-xs uppercase tracking-wider text-muted-foreground">
            <span>Ingest</span>
            <Separator orientation="vertical" className="h-3" />
            <span>Query + Self-improve</span>
            <Separator orientation="vertical" className="h-3" />
            <span>Lint</span>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-6 pb-24 sm:px-10">
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sword className="h-4 w-4 text-rose-500" />
                Attacker
              </CardTitle>
              <CardDescription>
                Generates plausible-but-false claims from the source.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[420px] pr-3">
                <AnimatedList key={`atk-${roundKey}`} delay={650}>
                  {round.claims.map((c) => (
                    <div
                      key={c.id}
                      className="w-full rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-sm"
                    >
                      <p className="leading-snug">{c.text}</p>
                      <div className="mt-2">
                        <Badge variant="outline" className="text-[10px]">
                          actually {c.truth ? "TRUE" : "FALSE"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </AnimatedList>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="h-4 w-4 text-emerald-500" />
                Defender
              </CardTitle>
              <CardDescription>
                Judges TRUE/FALSE against the Cognee knowledge graph.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[420px] pr-3">
                <AnimatedList key={`def-${roundKey}`} delay={650}>
                  {round.claims.map((c) => (
                    <ClaimCard key={c.id} claim={c} />
                  ))}
                </AnimatedList>
              </ScrollArea>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Zap className="h-4 w-4 text-amber-500" />
                  Score
                </CardTitle>
                <CardDescription>
                  Correct verdicts / total claims, round {round.index}.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-5xl font-semibold tracking-tight">
                  <NumberTicker
                    key={`tick-${roundKey}`}
                    value={round.scorePct}
                    className="text-foreground"
                  />
                  <span className="text-muted-foreground">%</span>
                </div>
                <Progress
                  value={round.scorePct}
                  className="mt-4"
                />
                <p className="mt-3 text-xs text-muted-foreground">
                  Round 1 baseline: 40% &nbsp;→&nbsp; after self-improve: 90%
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Top vulnerabilities
                </CardTitle>
                <CardDescription>
                  Redis ZSET <code>vulnerabilities</code> · descending severity.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {VULNERABILITIES.map((v) => (
                  <div
                    key={v.claim}
                    className="flex items-center justify-between gap-3 rounded-md border border-border/60 bg-card px-3 py-2 text-xs"
                  >
                    <span className="truncate">{v.claim}</span>
                    <Badge variant="destructive" className="shrink-0">
                      {v.severity.toFixed(2)}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">
              Defender skill — auto-rewritten between rounds
            </CardTitle>
            <CardDescription>
              <code>my_skills/defender/SKILL.md</code> · diff produced by
              <code className="mx-1">improve_skill(apply=True)</code>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <div className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
                  Before (round 1)
                </div>
                <pre className="overflow-x-auto rounded-lg border border-border bg-muted/30 p-3 text-xs leading-relaxed">
                  {SKILL_DIFF.before}
                </pre>
              </div>
              <div>
                <div className="mb-2 text-xs uppercase tracking-wider text-emerald-500">
                  After (round 2)
                </div>
                <pre className="overflow-x-auto rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-3 text-xs leading-relaxed">
                  {SKILL_DIFF.after}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      <footer className="border-t border-border/60 px-6 py-6 text-center text-xs text-muted-foreground sm:px-10">
        Built for the AI-Memory Hackathon · Cognee × Redis · San Francisco
      </footer>
    </div>
  );
}
