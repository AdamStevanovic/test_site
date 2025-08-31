import { NextRequest, NextResponse } from "next/server";
import { client as gradioClient } from "@gradio/client";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("audio");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No audio file" }, { status: 400 });
    }
    const pitch = Number(form.get("pitch") ?? 7);
    const speed = Number(form.get("speed") ?? 1.05);
    const remove_hiss = String(form.get("remove_hiss")) === "true";

    const SPACE = process.env.HF_SPACE!;
    const TOKEN = process.env.HF_TOKEN || undefined;

    // 1) Konektuj se na Space
    const c = await gradioClient(SPACE, TOKEN ? { hf_token: TOKEN } : undefined);

    // 2) Pokušaj /predict; ako ne postoji, automatski pokupi prvi dostupni endpoint
    let endpoint = "/predict";
    try {
      const api: any = await c.view_api();
      const names: string[] = [];
      const ne = api?.named_endpoints;
      if (ne) {
        if (Array.isArray(ne)) ne.forEach((e: any) => e?.endpoint && names.push(e.endpoint));
        else Object.values(ne).forEach((e: any) => (e as any)?.endpoint && names.push((e as any).endpoint));
      }
      const eps = api?.endpoints;
      if (Array.isArray(eps)) eps.forEach((e: any) => e?.endpoint && names.push(e.endpoint));
      if (!names.includes("/predict") && names.length > 0) endpoint = names[0]; // fallback
    } catch {
      /* ako view_api ne uspe, ostavi /predict */
    }

    // 3) Sinhrono pozovi Space (nema fn_index, nema queue id)
    const result = await c.predict(endpoint, [file, pitch, speed, remove_hiss]);

    // 4) Izvuci WAV iz rezultata (može biti URL string ili Blob/objekat sa url-om)
    const out = (result as any)?.data?.[0] ?? (result as any);
    if (!out) {
      return NextResponse.json({ error: "No audio in response" }, { status: 500 });
    }

    // ako dobijemo URL
    if (typeof out === "string") {
      const resp = await fetch(out);
      const buf = await resp.arrayBuffer();
      return new NextResponse(buf, {
        status: 200,
        headers: { "Content-Type": "audio/wav", "Cache-Control": "no-store" },
      });
    }

    // ako dobijemo Blob
    if (out instanceof Blob) {
      const buf = Buffer.from(await out.arrayBuffer());
      return new NextResponse(buf, {
        status: 200,
        headers: { "Content-Type": "audio/wav", "Cache-Control": "no-store" },
      });
    }

    // ako dobijemo objekat sa url
    if (out?.url) {
      const resp = await fetch(out.url);
      const buf = await resp.arrayBuffer();
      return new NextResponse(buf, {
        status: 200,
        headers: { "Content-Type": "audio/wav", "Cache-Control": "no-store" },
      });
    }

    return NextResponse.json({ error: "Unknown audio format" }, { status: 500 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Convert error" }, { status: 500 });
  }
}
