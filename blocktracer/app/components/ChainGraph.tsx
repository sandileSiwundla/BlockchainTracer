"use client";

import { ArrowDown, Coins, ArrowRightLeft } from "lucide-react";
import type { TraceResult, ChainLink } from "../lib/types";
import { fmtEth, fmtDate } from "../lib/format";
import NodeCard from "./NodeCard";

interface Props {
  result: TraceResult;
  selectedHop: number;
  onSelectHop: (hop: number) => void;
}

function Connector({ link }: { link: ChainLink | undefined }) {
  return (
    <div className="flex flex-col items-center py-1">
      <svg width="2" height="20" className="overflow-visible" aria-hidden>
        <line
          x1="1"
          y1="0"
          x2="1"
          y2="20"
          stroke="var(--primary)"
          strokeWidth="2"
          className="animate-flow"
          opacity="0.7"
        />
      </svg>

      {link ? (
        <div className="flex flex-col items-center gap-1 rounded-lg border border-[var(--panel-border)] bg-black/40 px-3 py-1.5 backdrop-blur-sm">
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1 font-mono font-semibold text-amber-300">
              <Coins className="size-3" aria-hidden />
              {fmtEth(link.totalETH, 6)} ETH
            </span>
            <span className="flex items-center gap-1 font-medium text-emerald-300">
              <ArrowRightLeft className="size-3" aria-hidden />
              {link.count} tx
            </span>
          </div>
          <span className="font-mono text-[10px] text-muted">
            {fmtDate(link.firstTx)} → {fmtDate(link.lastTx)}
          </span>
        </div>
      ) : (
        <span className="rounded-md bg-black/30 px-2 py-0.5 text-[10px] italic text-muted">
          indirect / inferred link
        </span>
      )}

      <svg width="2" height="20" className="overflow-visible" aria-hidden>
        <line
          x1="1"
          y1="0"
          x2="1"
          y2="14"
          stroke="var(--primary)"
          strokeWidth="2"
          className="animate-flow"
          opacity="0.7"
        />
      </svg>
      <ArrowDown className="-mt-1 size-4 text-primary" aria-hidden />
    </div>
  );
}

export default function ChainGraph({ result, selectedHop, onSelectHop }: Props) {
  const linkFor = (fromAddr: string, toAddr: string) =>
    result.links.find(
      (l) =>
        l.from.toLowerCase() === fromAddr.toLowerCase() &&
        l.to.toLowerCase() === toAddr.toLowerCase()
    );

  return (
    <div className="flex flex-col items-center">
      {result.chain.map((node, i) => {
        const next = result.chain[i + 1];
        const link = next ? linkFor(node.address, next.address) : undefined;
        return (
          <div
            key={node.address + i}
            className="flex w-full flex-col items-center animate-rise"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <NodeCard
              node={node}
              selected={selectedHop === node.hop}
              onSelect={() => onSelectHop(node.hop)}
            />
            {next && <Connector link={link} />}
          </div>
        );
      })}

      {result.endedEarly && (
        <p className="mt-4 rounded-lg border border-[var(--panel-border)] bg-black/30 px-4 py-2 text-center text-xs text-muted">
          Chain ended early — no unvisited outbound counterparty found at the
          last hop.
        </p>
      )}
    </div>
  );
}
