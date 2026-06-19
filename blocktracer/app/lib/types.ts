export type AddressType = "contract" | "fresh" | "active" | "wallet" | "unknown";

export interface Counterparty {
  address: string;
  count: number;
  total: number;
  firstTx: string | null;
  lastTx: string | null;
}

export interface ChainNode {
  hop: number;
  address: string;
  balance: number | null;
  txCount: number | null;
  type: AddressType;
  txTotal: number; // total txs analysed for this address in range
  topSent: Counterparty[];
  topReceived: Counterparty[];
}

export interface ChainLink {
  from: string;
  to: string;
  count: number;
  totalETH: number;
  firstTx: string | null;
  lastTx: string | null;
}

export interface TraceResult {
  timestamp: string;
  seedAddress: string;
  maxHops: number;
  scannedBlocks: { start: number; end: number };
  endedEarly: boolean;
  chain: ChainNode[];
  links: ChainLink[];
}

export type BlockRange = "1week" | "2weeks" | "4months" | "all" | "custom";

export interface TraceRequest {
  address: string;
  maxHops: number;
  range: BlockRange;
  startBlock?: number;
  endBlock?: number;
}

export const RANGE_LABELS: Record<BlockRange, string> = {
  "1week": "~1 week (50,400 blocks)",
  "2weeks": "~2 weeks (100,000 blocks)",
  "4months": "~4 months (1,000,000 blocks)",
  all: "All time",
  custom: "Custom range",
};

export const TYPE_META: Record<
  AddressType,
  { label: string; tint: string; ring: string; glow: string }
> = {
  contract: {
    label: "Contract",
    tint: "text-cyan-300",
    ring: "ring-cyan-400/40",
    glow: "shadow-[0_0_30px_-8px_rgba(34,211,238,0.5)]",
  },
  fresh: {
    label: "Fresh",
    tint: "text-emerald-300",
    ring: "ring-emerald-400/40",
    glow: "shadow-[0_0_30px_-8px_rgba(52,211,153,0.5)]",
  },
  active: {
    label: "Active",
    tint: "text-amber-300",
    ring: "ring-amber-400/40",
    glow: "shadow-[0_0_30px_-8px_rgba(251,191,36,0.5)]",
  },
  wallet: {
    label: "Wallet",
    tint: "text-violet-300",
    ring: "ring-violet-400/40",
    glow: "shadow-[0_0_30px_-8px_rgba(167,139,250,0.5)]",
  },
  unknown: {
    label: "Unknown",
    tint: "text-zinc-400",
    ring: "ring-zinc-500/40",
    glow: "shadow-[0_0_30px_-8px_rgba(161,161,170,0.4)]",
  },
};
