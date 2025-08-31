import { NextRequest, NextResponse } from "next/server";
import { client } from "@gradio/client";

const HF_SPACE = process.env.HF_SPACE;
const HF_TOKEN = process.env.HF_TOKEN; // opcionalno

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    if (!HF_SPACE) {
      return NextResponse.json({ error: "HF_SPACE is missing" }, { status: 500 });
    }

    const form = await req.formData();
    const audio = form.get("audio");
    if (!(audio instanceof File)) {
      return NextResponse.json({ error: "Audio file is required" }, { status: 400 });
    }

    const pitch = Number(form.get("pitch") ?? 7);
    const speed = Number(form.get("speed") ?? 1.05);
    const remove_hiss = String(form.get("remove_hiss") ?? "true") === "true";

    // token koristimo samo ako postoji (za public Space nije neophodan)
    const app = await client(HF_SPACE, HF_TOKEN ? { hf_token: HF_TOKEN } : undefined);

    // pronađi endpoint
    let endpoint = "/predict";
    try {
      // @ts-ignore
      const api = await app.view_api();
      // @ts-ignore
      endpoint = api?.named_endpoints?.[0]?.endpoint ?? api?.endpoints?.[0]?.endpoint ?? "/predict";
    } catch {}

    const job = await app.submit(endpoint, [audio, pitch, speed, remove_hiss]);
    // @ts-ignore
    const jobId = job?.id ?? job?.hash;
    if (!jobId) return NextResponse.json({ error: "Cannot get job id" }, { status: 500 });

    return NextResponse.json({ jobId }, { status: 200 });
  } catch (e: any) {
    console.error("START ROUTE ERROR:", e);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
