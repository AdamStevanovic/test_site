import { NextRequest, NextResponse } from "next/server";
import { client } from "@gradio/client";

const HF_SPACE = process.env.HF_SPACE!;
const HF_TOKEN = process.env.HF_TOKEN;           // opciono (public Space ne traži)
const HF_ENDPOINT = process.env.HF_ENDPOINT;     // opciono, npr. "/predict" ili "fn:7"

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

type Cand = { kind: "path" | "fn"; value: string | number };

function parseExplicitEndpoint(v?: string | null): Cand[] {
  if (!v) return [];
  // Dozvoli format "fn:7" za direktan indeks
  if (v.startsWith("fn:")) {
    const n = Number(v.slice(3));
    if (!Number.isNaN(n)) return [{ kind: "fn", value: n }];
  }
  return [{ kind: "path", value: v }];
}

export async function POST(req: NextRequest) {
  try {
    if (!HF_SPACE) return NextResponse.json({ error: "HF_SPACE is missing" }, { status: 500 });

    const form = await req.formData();
    const audio = form.get("audio");
    if (!(audio instanceof File)) return NextResponse.json({ error: "Audio file is required" }, { status: 400 });

    const pitch = Number(form.get("pitch") ?? 7);
    const speed = Number(form.get("speed") ?? 1.05);
    const remove_hiss = String(form.get("remove_hiss") ?? "true") === "true";

    const app = await client(HF_SPACE, HF_TOKEN ? { hf_token: HF_TOKEN } : undefined);

    // 1) kandidati: eksplicitno preko ENV + nekoliko tipičnih path-ova + fn_index 0..30
    const candidates: Cand[] = [
      ...parseExplicitEndpoint(HF_ENDPOINT),
      { kind: "path", value: "/predict" },
      { kind: "path", value: "/run" },
      { kind: "path", value: "/predict_1" },
      // probaj fn_index 0..30
      ...Array.from({ length: 31 }, (_, i) => ({ kind: "fn" as const, value: i })),
    ];

    // 2) payload varijante (ne znamo koliko ulaza Space očekuje)
    const payloads: any[][] = [
      [audio, pitch, speed, remove_hiss],
      [audio, pitch, speed],
      [audio, pitch],
      [audio],
    ];

    let lastErr: any = null;

    for (const cand of candidates) {
      for (const p of payloads) {
        try {
          const job =
            cand.kind === "fn"
              ? // @ts-ignore — submit dozvoljava i broj fn_index
                await app.submit(cand.value as number, p)
              : await app.submit(cand.value as string, p);

          // @ts-ignore — različite verzije vraćaju id/hash
          const jobId = job?.id ?? job?.hash;
          if (jobId) {
            return NextResponse.json(
              { jobId, used: cand, payloadLen: p.length },
              { status: 200 }
            );
          }
          lastErr = new Error("Job created but id/hash missing");
        } catch (e: any) {
          lastErr = e;
          // probaj sledeći payload / sledećeg kandidata
        }
      }
    }

    return NextResponse.json(
      {
        error:
          "Nijedan endpoint/fn_index nije prihvatio payload. " +
          "Ako znaš tačan handler, postavi ENV var 'HF_ENDPOINT' na '/predict' ili 'fn:7' itd.",
        details: String(lastErr?.message ?? lastErr ?? "no details"),
      },
      { status: 400 }
    );
  } catch (e: any) {
    console.error("START ROUTE ERROR:", e);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
