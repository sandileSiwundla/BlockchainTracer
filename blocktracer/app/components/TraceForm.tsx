"use client";

import { useState } from "react";
import { Search, Loader2, ChevronDown } from "lucide-react";
import type { BlockRange, TraceRequest } from "../lib/types";
import { RANGE_LABELS } from "../lib/types";

interface Props {
  loading: boolean;
  onSubmit: (req: TraceRequest) => void;
}

const RANGE_OPTIONS: BlockRange[] = ["1week", "2weeks", "4months", "all"];

export default function TraceForm({ loading, onSubmit }: Props) {
  const [address, setAddress] = useState("");
  const [maxHops, setMaxHops] = useState(3);
  const [range, setRange] = useState<BlockRange>("4months");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const addr = address.trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(addr)) {
      setError("Enter a valid 0x… Ethereum address (40 hex chars).");
      return;
    }
    setError(null);
    onSubmit({ address: addr, maxHops, range });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
            aria-hidden
          />
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Seed wallet address  (0x…)"
            spellCheck={false}
            aria-label="Seed wallet address"
            className="w-full rounded-lg border border-[var(--panel-border)] bg-black/40 py-2.5 pl-9 pr-3 font-mono text-sm text-foreground outline-none transition placeholder:text-muted focus:border-primary/60 focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-[#10071f] transition hover:bg-[#b9a3ff] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Tracing
            </>
          ) : (
            <>Trace chain</>
          )}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        {/* Hops */}
        <div className="flex items-center gap-3">
          <label
            htmlFor="hops"
            className="text-xs font-medium uppercase tracking-wider text-muted"
          >
            Hops
          </label>
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setMaxHops(n)}
                aria-pressed={maxHops === n}
                className={`size-7 rounded-md border text-xs font-semibold transition ${
                  maxHops === n
                    ? "border-primary bg-primary/20 text-primary"
                    : "border-[var(--panel-border)] text-muted hover:border-primary/50 hover:text-foreground"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Range */}
        <div className="flex items-center gap-3">
          <label
            htmlFor="range"
            className="text-xs font-medium uppercase tracking-wider text-muted"
          >
            Range
          </label>
          <div className="relative">
            <select
              id="range"
              value={range}
              onChange={(e) => setRange(e.target.value as BlockRange)}
              className="appearance-none rounded-md border border-[var(--panel-border)] bg-black/40 py-1.5 pl-3 pr-8 text-xs text-foreground outline-none transition focus:border-primary/60"
            >
              {RANGE_OPTIONS.map((r) => (
                <option key={r} value={r} className="bg-[#16121f]">
                  {RANGE_LABELS[r]}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-muted"
              aria-hidden
            />
          </div>
        </div>
      </div>

      {error && (
        <p className="text-xs font-medium text-red-400" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
