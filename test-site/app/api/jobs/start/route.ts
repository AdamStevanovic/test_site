import { NextRequest, NextResponse } from "next/server";
import { client } from "@gradio/client";

const HF_SPACE = process.env.HF_SPACE!;
const HF_TOKEN = process.env.HF_TOKEN!;

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const audio = form.get("audio");
    if (!(audio instanceof File)) {
      return NextResponse.json({ error: "Audio file is required" }, { status: 400 });
    }
    const pitch = Number(form.get("pitch") ?? 7);
    const speed = Number(form.get("speed") ?? 1.05);
    const remove_hiss = String(form.get("remove_hiss") ?? "true") === "true";

    const app = await client(HF_SPACE, { hf_token: HF_TOKEN });
    const job = await app.submit("/predict", [audio, pitch, speed, remove_hiss]);
    // @ts-ignore – verzije se razlikuju
    const jobId = job.id ?? job.hash;
    return NextResponse.json({ jobId });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
