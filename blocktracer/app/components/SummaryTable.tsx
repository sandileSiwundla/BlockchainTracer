"use client";

import type { TraceResult } from "../lib/types";
import { TYPE_META } from "../lib/types";
import { shortAddr, fmtEth, etherscanUrl } from "../lib/format";

export default function SummaryTable({ result }: { result: TraceResult }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] backdrop-blur-md">
      <table className="w-full min-w-[520px] text-left text-sm">
        <thead>
          <tr className="border-b border-[var(--panel-border)] text-[11px] uppercase tracking-wider text-muted">
            <th className="px-4 py-3 font-semibold">Hop</th>
            <th className="px-4 py-3 font-semibold">Address</th>
            <th className="px-4 py-3 font-semibold">Balance</th>
            <th className="px-4 py-3 font-semibold">Nonce</th>
            <th className="px-4 py-3 font-semibold">Type</th>
            <th className="px-4 py-3 text-right font-semibold">Sent ETH</th>
          </tr>
        </thead>
        <tbody>
          {result.chain.map((n) => {
            const meta = TYPE_META[n.type];
            const sent = n.topSent.reduce((s, c) => s + c.total, 0);
            return (
              <tr
                key={n.address + n.hop}
                className="border-b border-white/5 transition last:border-0 hover:bg-white/[0.03]"
              >
                <td className="px-4 py-2.5 font-mono text-primary">
                  {n.hop === 0 ? "Seed" : n.hop}
                </td>
                <td className="px-4 py-2.5">
                  <a
                    href={etherscanUrl(n.address)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-foreground/80 transition hover:text-primary"
                  >
                    {shortAddr(n.address, 8, 6)}
                  </a>
                </td>
                <td className="px-4 py-2.5 font-mono text-emerald-300">
                  {fmtEth(n.balance)}
                </td>
                <td className="px-4 py-2.5 font-mono text-foreground/80">
                  {n.txCount ?? "—"}
                </td>
                <td className={`px-4 py-2.5 ${meta.tint}`}>{meta.label}</td>
                <td className="px-4 py-2.5 text-right font-mono text-amber-300">
                  {fmtEth(sent)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
