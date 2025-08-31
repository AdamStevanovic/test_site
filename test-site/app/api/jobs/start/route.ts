import { NextRequest, NextResponse } from "next/server";
import { client } from "@gradio/client";

const HF_SPACE = process.env.HF_SPACE!;
const HF_TOKEN = process.env.HF_TOKEN;           // opciono (public Space ne traži)
const HF_ENDPOINT = process.env.HF_ENDPOINT;     // opciono (npr. "/run", "/predict_1"...)

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

    const app = await client(HF_SPACE, HF_TOKEN ? { hf_token: HF_TOKEN } : undefined);

    // 1) sastavi listu kandidata za endpoint
    const candidates: string[] = [];
    if (HF_ENDPOINT) candidates.push(HF_ENDPOINT); // eksplicitno zadat
    try {
      const api: any = await app.view_api();
      // named_endpoints može biti objekat ili niz
      const ne = api?.named_endpoints;
      if (ne) {
        if (Array.isArray(ne)) {
          ne.forEach((e: any) => e?.endpoint && candidates.push(e.endpoint));
        } else {
          Object.values(ne).forEach((e: any) => e?.endpoint && candidates.push(e.endpoint));
        }
      }
      const eps = api?.endpoints;
      if (Array.isArray(eps)) {
        eps.forEach((e: any) => e?.endpoint && candidates.push(e.endpoint));
      }
    } catch {
      /* ignore */
    }
    // uobičajeni fallback
    candidates.push("/predict");

    // jedinstvena lista
    const uniq = [...new Set(candidates)];

    // 2) pokušaj više oblika payload-a na svakom kandidatu
    const payloadVariants: any[][] = [
      [audio, pitch, speed, remove_hiss],
      [audio, pitch, speed],
      [audio, pitch],
      [audio],
    ];

    let lastErr: any = null;
    for (const ep of uniq) {
      for (const payload of payloadVariants) {
        try {
          const job = await app.submit(ep, payload);
          // @ts-ignore — verzije klijenta umeju da vraćaju .id ili .hash
          const jobId = job?.id ?? job?.hash;
          if (jobId) {
            return NextResponse.json({ jobId, endpoint: ep, usedPayload: payload.length }, { status: 200 });
          }
          lastErr = new Error("Job created but id/hash missing");
        } catch (e: any) {
          lastErr = e;
          // probaj sledeću varijantu
        }
      }
    }

    // ako ništa nije prošlo — prijavi korisniku šta smo našli
    return NextResponse.json(
      {
        error:
          `Nijedan endpoint nije prihvatio payload. ` +
          `Pokušana su: ${uniq.join(", ") || "(nema pronađenih)"}. ` +
          `Postavi env HF_ENDPOINT na onaj koji tvoj Space koristi.`,
        details: String(lastErr?.message ?? lastErr ?? "no details"),
        tried: { endpoints: uniq, payloadLengths: payloadVariants.map(v => v.length) },
      },
      { status: 400 },
    );
  } catch (e: any) {
    console.error("START ROUTE ERROR:", e);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
