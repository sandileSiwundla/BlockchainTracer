import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import type {
  AddressType,
  ChainLink,
  ChainNode,
  Counterparty,
  TraceRequest,
  TraceResult,
} from "@/app/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

// ── Config ──────────────────────────────────────────────────────────────────
const RPC_URL = process.env.ETH_RPC_URL || "https://ethereum-rpc.publicnode.com";
const ETHERSCAN_KEY = process.env.ETHERSCAN_API_KEY || "";
const ETHERSCAN_API = "https://api.etherscan.io/v2/api";
const CHAIN_ID = 1;
const HARD_MAX_HOPS = 5;
const TOP_N = 3;
const MAX_PAGES = 8; // guard against runaway pagination in serverless

const provider = new ethers.JsonRpcProvider(RPC_URL);

interface TxEntry {
  hash: string;
  value: number;
  ts: Date | null;
  block: number;
}

interface CounterpartyAgg {
  count: number;
  total: number;
  txs: TxEntry[];
}

// ── Etherscan helpers ─────────────────────────────────────────────────────────
async function fetchAllPages(params: Record<string, string | number>) {
  const results: Record<string, string>[] = [];
  let page = 1;
  let rateLimitRetries = 0;

  while (page <= MAX_PAGES) {
    const url = new URL(ETHERSCAN_API);
    const query = {
      ...params,
      page,
      offset: 200,
      chainid: CHAIN_ID,
      apikey: ETHERSCAN_KEY,
    };
    for (const [k, v] of Object.entries(query)) {
      url.searchParams.set(k, String(v));
    }

    let data: { status?: string; result?: unknown };
    try {
      const res = await fetch(url.toString(), {
        signal: AbortSignal.timeout(20000),
      });
      data = await res.json();
    } catch {
      break;
    }

    if (data.status === "0") {
      const r = (data.result as string) || "";
      if (typeof r === "string" && r.includes("Max rate limit")) {
        if (rateLimitRetries++ > 3) break;
        await new Promise((x) => setTimeout(x, 2500));
        continue;
      }
      break; // "No transactions found" or other terminal status
    }

    const txs = Array.isArray(data.result)
      ? (data.result as Record<string, string>[])
      : [];
    results.push(...txs);
    if (txs.length < 200) break;
    page++;
    await new Promise((x) => setTimeout(x, 250));
  }
  return results;
}

function fetchTxs(address: string, startBlock: number, endBlock: number) {
  return fetchAllPages({
    module: "account",
    action: "txlist",
    address,
    startblock: startBlock,
    endblock: endBlock,
    sort: "asc",
  });
}

async function getBalance(address: string): Promise<number | null> {
  try {
    const bal = await provider.getBalance(address);
    return parseFloat(ethers.formatEther(bal));
  } catch {
    return null;
  }
}

async function getTxCount(address: string): Promise<number | null> {
  try {
    return await provider.getTransactionCount(address);
  } catch {
    return null;
  }
}

async function classifyAddress(address: string): Promise<AddressType> {
  try {
    const code = await provider.getCode(address);
    if (code !== "0x") return "contract";
    const count = await provider.getTransactionCount(address);
    if (count === 0) return "fresh";
    if (count > 500) return "active";
    return "wallet";
  } catch {
    return "unknown";
  }
}

// ── Core analysis ─────────────────────────────────────────────────────────────
async function analyseWallet(
  address: string,
  startBlock: number,
  endBlock: number
) {
  const txs = await fetchTxs(address, startBlock, endBlock);
  const addr = address.toLowerCase();

  const sent = new Map<string, CounterpartyAgg>();
  const received = new Map<string, CounterpartyAgg>();

  for (const tx of txs) {
    if (tx.isError === "1") continue;
    const from = (tx.from || "").toLowerCase();
    const to = (tx.to || "").toLowerCase();
    const value = parseFloat(ethers.formatEther(tx.value || "0"));
    const ts = tx.timeStamp ? new Date(parseInt(tx.timeStamp) * 1000) : null;
    const entry: TxEntry = {
      hash: tx.hash,
      value,
      ts,
      block: parseInt(tx.blockNumber),
    };

    if (from === addr && to) {
      if (!sent.has(to)) sent.set(to, { count: 0, total: 0, txs: [] });
      const s = sent.get(to)!;
      s.count++;
      s.total += value;
      s.txs.push(entry);
    }
    if (to === addr && from) {
      if (!received.has(from))
        received.set(from, { count: 0, total: 0, txs: [] });
      const r = received.get(from)!;
      r.count++;
      r.total += value;
      r.txs.push(entry);
    }
  }
  return { sent, received, txTotal: txs.length };
}

function topN(map: Map<string, CounterpartyAgg>, n: number) {
  return [...map.entries()].sort((a, b) => b[1].total - a[1].total).slice(0, n);
}

function toCounterparty(addr: string, agg: CounterpartyAgg): Counterparty {
  return {
    address: addr,
    count: agg.count,
    total: agg.total,
    firstTx: agg.txs[0]?.ts?.toISOString() ?? null,
    lastTx: agg.txs.at(-1)?.ts?.toISOString() ?? null,
  };
}

// ── Route ─────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  let body: TraceRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const seed = (body.address || "").trim().toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(seed)) {
    return NextResponse.json(
      { error: "Invalid Ethereum address." },
      { status: 400 }
    );
  }

  const maxHops = Math.min(Math.max(Number(body.maxHops) || 3, 1), HARD_MAX_HOPS);

  let currentBlock: number;
  try {
    currentBlock = await provider.getBlockNumber();
  } catch {
    return NextResponse.json(
      { error: "Could not reach Ethereum RPC node." },
      { status: 502 }
    );
  }

  let startBlock = 0;
  let endBlock = currentBlock;
  switch (body.range) {
    case "1week":
      startBlock = Math.max(0, currentBlock - 50_400);
      break;
    case "2weeks":
      startBlock = Math.max(0, currentBlock - 100_000);
      break;
    case "4months":
      startBlock = Math.max(0, currentBlock - 1_000_000);
      break;
    case "custom":
      startBlock = Math.max(0, Number(body.startBlock) || 0);
      endBlock = Number(body.endBlock) || currentBlock;
      break;
    case "all":
    default:
      startBlock = 0;
  }

  // ── BFS chain trace ─────────────────────────────────────────────────────────
  const chain: ChainNode[] = [];
  const links: ChainLink[] = [];
  const visited = new Set<string>();

  let currentAddr = seed;
  let endedEarly = false;
  visited.add(currentAddr);

  for (let hop = 0; hop <= maxHops; hop++) {
    const [balance, txCount, type, analysis] = await Promise.all([
      getBalance(currentAddr),
      getTxCount(currentAddr),
      classifyAddress(currentAddr),
      analyseWallet(currentAddr, startBlock, endBlock),
    ]);

    const tSent = topN(analysis.sent, TOP_N);
    const tReceived = topN(analysis.received, TOP_N);

    chain.push({
      hop,
      address: currentAddr,
      balance,
      txCount,
      type,
      txTotal: analysis.txTotal,
      topSent: tSent.map(([a, s]) => toCounterparty(a, s)),
      topReceived: tReceived.map(([a, r]) => toCounterparty(a, r)),
    });

    if (hop === maxHops) break;

    // Next hop = top ETH recipient not yet visited
    let nextAddr: string | null = null;
    for (const [addr] of tSent) {
      if (!visited.has(addr.toLowerCase())) {
        nextAddr = addr.toLowerCase();
        break;
      }
    }

    if (!nextAddr) {
      endedEarly = true;
      break;
    }

    const linkData = analysis.sent.get(nextAddr);
    if (linkData) {
      links.push({
        from: currentAddr,
        to: nextAddr,
        count: linkData.count,
        totalETH: linkData.total,
        firstTx: linkData.txs[0]?.ts?.toISOString() ?? null,
        lastTx: linkData.txs.at(-1)?.ts?.toISOString() ?? null,
      });
    }

    visited.add(nextAddr);
    currentAddr = nextAddr;
  }

  const result: TraceResult = {
    timestamp: new Date().toISOString(),
    seedAddress: seed,
    maxHops,
    scannedBlocks: { start: startBlock, end: endBlock },
    endedEarly,
    chain,
    links,
  };

  return NextResponse.json(result);
}
