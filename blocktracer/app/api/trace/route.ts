import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 120;

const BACKEND_URL = process.env.BACKEND_URL;

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  let response: Response;
  try {
    response = await fetch(`${BACKEND_URL}/api/trace`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(115_000),
    });
  } catch {
    return NextResponse.json(
      { error: "Could not connect to backend service. Make sure the backend server is running." },
      { status: 502 }
    );
  }

  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
