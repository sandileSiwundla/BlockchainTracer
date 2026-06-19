"use client";

import { useState } from "react";
import {
  Activity,
  Boxes,
  GitBranch,
  Layers,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import type { TraceRequest, TraceResult } from "../lib/types";
import { RANGE_LABELS } from "../lib/types";
import TraceForm from "./TraceForm";
import ChainGraph from "./ChainGraph";
import NodeDetail from "./NodeDetail";
import SummaryTable from "./SummaryTable";

const EXAMPLE = "0xd8da6bf26964af9d7eed9e03e53415d37aa96045"; // vitalik.eth

export default function TracerApp() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TraceResult | null>(null);
  const [selectedHop, setSelectedHop] = useState(0);
  const [activeReq, setActiveReq] = useState<TraceRequest | null>(null);

  async function runTrace(req: TraceRequest) {
    setLoading(true);
    setError(null);
    setActiveReq(req);
    try {
      const res = await fetch("/api/trace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Trace failed.");
      setResult(data as TraceResult);
      setSelectedHop(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  const selectedNode = result?.chain.find((n) => n.hop === selectedHop);
  const totalEth =
    result?.links.reduce((s, l) => s + l.totalETH, 0) ?? 0;

  return (
    <div className="pointer-events-none relative z-10 mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-8 px-4 py-12 sm:px-6 sm:py-16">
      {/* ── Hero ─────────────────────────────────────────── */}
      <header className="pointer-events-none flex flex-col items-center text-center">
        <span className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-[var(--panel-border)] bg-[var(--panel)] px-3 py-1 text-xs font-medium text-primary backdrop-blur-md">
          <GitBranch className="size-3.5" aria-hidden />
          Ethereum Mainnet · On-chain money trail
        </span>
        <h1 className="mt-4 text-balance text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
          Block<span className="text-primary">Tracer</span>
        </h1>
        <p className="mt-3 max-w-xl text-pretty text-sm leading-relaxed text-foreground/70 sm:text-base">
          Drop in a wallet address and follow the ETH. BlockTracer walks the
          chain hop-by-hop, following the largest recipient at each step, and
          maps the flow as an interactive graph.
        </p>
      </header>

      {/* ── Form panel ──────────────────────────────────── */}
      <section className="pointer-events-auto mx-auto w-full max-w-2xl rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] p-5 backdrop-blur-md sm:p-6">
        <TraceForm loading={loading} onSubmit={runTrace} />
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted">
          <span>Try:</span>
          <button
            type="button"
            onClick={() =>
              runTrace({ address: EXAMPLE, maxHops: 3, range: "4months" })
            }
            disabled={loading}
            className="rounded-md border border-[var(--panel-border)] bg-black/30 px-2 py-1 font-mono text-foreground/80 transition hover:border-primary/50 hover:text-primary disabled:opacity-50"
          >
            vitalik.eth
          </button>
        </div>
      </section>

      {/* ── Error ────────────────────────────────────────── */}
      {error && (
        <div className="pointer-events-auto mx-auto flex w-full max-w-2xl items-start gap-3 rounded-xl border border-red-500/30 bg-red-950/30 p-4 text-sm text-red-300 backdrop-blur-md">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>{error}</p>
        </div>
      )}

      {/* ── Loading ──────────────────────────────────────── */}
      {loading && (
        <div className="pointer-events-auto mx-auto flex w-full max-w-2xl flex-col items-center gap-3 rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-8 text-center backdrop-blur-md">
          <Loader2 className="size-7 animate-spin text-primary" aria-hidden />
          <p className="text-sm text-foreground/70">
            Walking the chain across hops — fetching balances, classifying
            addresses, and ranking counterparties…
          </p>
        </div>
      )}

      {/* ── Results ──────────────────────────────────────── */}
      {result && !loading && (
        <section className="pointer-events-auto flex flex-col gap-6">
          {/* meta strip */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetaStat
              icon={<Layers className="size-4" aria-hidden />}
              label="Hops traced"
              value={`${result.chain.length - 1}`}
            />
            <MetaStat
              icon={<Boxes className="size-4" aria-hidden />}
              label="Links found"
              value={`${result.links.length}`}
            />
            <MetaStat
              icon={<Activity className="size-4" aria-hidden />}
              label="ETH flowed"
              value={`${totalEth.toLocaleString(undefined, {
                maximumFractionDigits: 4,
              })}`}
            />
            <MetaStat
              icon={<GitBranch className="size-4" aria-hidden />}
              label="Range"
              value={activeReq ? RANGE_LABELS[activeReq.range].split(" ")[0] : "—"}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            {/* graph */}
            <div className="rounded-2xl border border-[var(--panel-border)] bg-black/20 p-5 backdrop-blur-sm sm:p-8">
              <h2 className="mb-6 text-center text-sm font-semibold uppercase tracking-wider text-muted">
                Transaction Chain Map
              </h2>
              <ChainGraph
                result={result}
                selectedHop={selectedHop}
                onSelectHop={setSelectedHop}
              />
            </div>

            {/* detail */}
            <aside className="lg:sticky lg:top-6 lg:self-start">
              <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] p-5 backdrop-blur-md">
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">
                  Node Detail
                </h2>
                {selectedNode ? (
                  <NodeDetail node={selectedNode} />
                ) : (
                  <p className="text-sm text-muted">Select a node.</p>
                )}
              </div>
            </aside>
          </div>

          {/* summary table */}
          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">
              Chain Summary
            </h2>
            <SummaryTable result={result} />
          </div>

          <p className="text-center font-mono text-[11px] text-muted">
            seed {result.seedAddress.slice(0, 10)}… · blocks{" "}
            {result.scannedBlocks.start.toLocaleString()} →{" "}
            {result.scannedBlocks.end.toLocaleString()} ·{" "}
            {new Date(result.timestamp).toLocaleString()}
          </p>
        </section>
      )}
    </div>
  );
}

function MetaStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] px-4 py-3 backdrop-blur-md">
      <span className="flex size-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
        {icon}
      </span>
      <div>
        <p className="text-[10px] uppercase tracking-wide text-muted">
          {label}
        </p>
        <p className="font-mono text-lg font-semibold text-foreground">
          {value}
        </p>
      </div>
    </div>
  );
}
