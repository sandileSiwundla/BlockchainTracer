"use client";

import {
  FileCode2,
  Sparkles,
  Zap,
  Wallet,
  HelpCircle,
  Wallet2,
} from "lucide-react";
import type { ChainNode, AddressType } from "../lib/types";
import { TYPE_META } from "../lib/types";
import { shortAddr, fmtEth } from "../lib/format";

const TYPE_ICON: Record<AddressType, typeof Wallet> = {
  contract: FileCode2,
  fresh: Sparkles,
  active: Zap,
  wallet: Wallet,
  unknown: HelpCircle,
};

interface Props {
  node: ChainNode;
  selected: boolean;
  onSelect: () => void;
}

export default function NodeCard({ node, selected, onSelect }: Props) {
  const meta = TYPE_META[node.type];
  const Icon = TYPE_ICON[node.type];
  const isSeed = node.hop === 0;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`group relative w-full max-w-md rounded-xl border bg-[var(--panel)] p-4 text-left backdrop-blur-md transition-all duration-300 ${
        selected
          ? `border-primary/70 ring-2 ${meta.ring} ${meta.glow}`
          : "border-[var(--panel-border)] hover:border-primary/50"
      }`}
    >
      {/* hop tag */}
      <div className="mb-3 flex items-center justify-between">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
            isSeed
              ? "bg-amber-400/15 text-amber-300"
              : "bg-primary/15 text-primary"
          }`}
        >
          {isSeed ? "◉ Seed" : `◉ Hop ${node.hop}`}
        </span>
        <span
          className={`inline-flex items-center gap-1 rounded-full bg-black/30 px-2 py-0.5 text-[11px] font-medium ${meta.tint}`}
        >
          <Wallet2 className="size-3" aria-hidden />
          {meta.label}
        </span>
      </div>

      <div className="flex items-start gap-3">
        <span
          className={`flex size-10 shrink-0 items-center justify-center rounded-lg bg-black/40 ${meta.tint}`}
        >
          <Icon className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-sm font-semibold text-foreground">
            {shortAddr(node.address, 10, 8)}
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-md bg-black/25 px-2 py-1.5">
              <p className="text-[10px] uppercase tracking-wide text-muted">
                Balance
              </p>
              <p className="font-mono font-medium text-emerald-300">
                {fmtEth(node.balance)} ETH
              </p>
            </div>
            <div className="rounded-md bg-black/25 px-2 py-1.5">
              <p className="text-[10px] uppercase tracking-wide text-muted">
                Nonce
              </p>
              <p className="font-mono font-medium text-foreground">
                {node.txCount ?? "—"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}
