import { NextRequest, NextResponse } from "next/server";
import { client } from "@gradio/client";

const HF_SPACE = process.env.HF_SPACE!;
const HF_TOKEN = process.env.HF_TOKEN!;

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get("id");
    if (!jobId) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const app = await client(HF_SPACE, { hf_token: HF_TOKEN });
    // @ts-ignore – nova API ima app.job()
    const job = (app as any).job ? (app as any).job(jobId) : null;

    if (job && job.status) {
      const s = await job.status();
      if (s.status === "COMPLETED" || s.code === "COMPLETE") {
        const res = await job.result();
        const out = (res as any)?.data?.[0];
        if (!out) return NextResponse.json({ status: "DONE", error: "No audio" });
        const buf = Buffer.from(await (out as Blob).arrayBuffer());
        return new NextResponse(buf, {
          status: 200,
          headers: { "Content-Type": "audio/wav", "Cache-Control": "no-store" },
        });
      }
      return NextResponse.json({ status: s.status || s.code || "PENDING" });
    }

    return NextResponse.json({ status: "PENDING" });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
