"use client";

import {
  ExternalLink,
  ArrowUpRight,
  ArrowDownLeft,
  Copy,
  Check,
} from "lucide-react";
import { useState } from "react";
import type { ChainNode } from "../lib/types";
import { TYPE_META } from "../lib/types";
import { shortAddr, fmtEth, fmtDate, etherscanUrl } from "../lib/format";

function CopyBtn({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1400);
      }}
      className="text-muted transition hover:text-primary"
      aria-label="Copy address"
    >
      {copied ? (
        <Check className="size-3.5 text-emerald-400" aria-hidden />
      ) : (
        <Copy className="size-3.5" aria-hidden />
      )}
    </button>
  );
}

export default function NodeDetail({ node }: { node: ChainNode }) {
  const meta = TYPE_META[node.type];
  const isSeed = node.hop === 0;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
              isSeed ? "bg-amber-400/15 text-amber-300" : "bg-primary/15 text-primary"
            }`}
          >
            {isSeed ? "Seed" : `Hop ${node.hop}`}
          </span>
          <span className={`text-xs font-medium ${meta.tint}`}>
            {meta.label}
          </span>
        </div>

        <div className="mt-2 flex items-center gap-2">
          <span className="break-all font-mono text-xs text-foreground/80">
            {node.address}
          </span>
          <CopyBtn value={node.address} />
        </div>

        <a
          href={etherscanUrl(node.address)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-accent transition hover:underline"
        >
          View on Etherscan
          <ExternalLink className="size-3" aria-hidden />
        </a>
      </div>

      {/* stats */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat label="Balance" value={`${fmtEth(node.balance)} ETH`} tone="emerald" />
        <Stat label="Nonce" value={String(node.txCount ?? "—")} />
        <Stat label="Txs (range)" value={String(node.txTotal)} />
      </div>

      {/* top recipients */}
      <Section
        title="Top recipients (ETH sent)"
        icon={<ArrowUpRight className="size-3.5 text-amber-300" aria-hidden />}
        empty="No outbound ETH transfers in range."
        rows={node.topSent}
        tone="amber"
      />

      {/* top senders */}
      <Section
        title="Top senders (ETH received)"
        icon={<ArrowDownLeft className="size-3.5 text-accent" aria-hidden />}
        empty="No inbound ETH transfers in range."
        rows={node.topReceived}
        tone="cyan"
      />
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "emerald";
}) {
  return (
    <div className="rounded-lg border border-[var(--panel-border)] bg-black/25 px-2 py-2">
      <p className="text-[10px] uppercase tracking-wide text-muted">{label}</p>
      <p
        className={`mt-0.5 font-mono text-sm font-semibold ${
          tone === "emerald" ? "text-emerald-300" : "text-foreground"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function Section({
  title,
  icon,
  empty,
  rows,
  tone,
}: {
  title: string;
  icon: React.ReactNode;
  empty: string;
  rows: { address: string; total: number; count: number; firstTx: string | null; lastTx: string | null }[];
  tone: "amber" | "cyan";
}) {
  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-foreground/90">
        {icon}
        {title}
      </p>
      {rows.length === 0 ? (
        <p className="text-xs italic text-muted">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {rows.map((r) => (
            <li
              key={r.address}
              className="flex items-center justify-between gap-2 rounded-md border border-[var(--panel-border)] bg-black/20 px-2.5 py-1.5"
            >
              <a
                href={etherscanUrl(r.address)}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs text-foreground/80 transition hover:text-primary"
              >
                {shortAddr(r.address, 8, 6)}
              </a>
              <div className="flex items-center gap-2 text-right">
                <span
                  className={`font-mono text-xs font-semibold ${
                    tone === "amber" ? "text-amber-300" : "text-accent"
                  }`}
                >
                  {fmtEth(r.total, 6)} ETH
                </span>
                <span className="text-[10px] text-muted">{r.count} tx</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
