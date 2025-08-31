export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";


import { client as gradioClient } from "@gradio/client";

export const runtime = "edge"; // ili bez ovoga, ako koristiš node runtimе

export async function POST(req: Request) {
  try {
    const form = await req.formData();

    const file = form.get("audio") as File;
    const pitch = Number(form.get("pitch") ?? 7);
    const speed = Number(form.get("speed") ?? 1.05);
    const remove_hiss = String(form.get("remove_hiss")) === "true";

    if (!file) {
      return new Response(JSON.stringify({ error: "No audio file" }), { status: 400 });
    }

    const SPACE = process.env.HF_SPACE!;
    const ENDPOINT = process.env.HF_ENDPOINT || "/predict";
    const TOKEN = process.env.HF_TOKEN || undefined;

    // Konektuj se na Space
    const c = await gradioClient(SPACE, { hf_token: TOKEN });

    // Pozovi imenovani endpoint – nema fn_index
    const result = await c.predict(ENDPOINT, [file, pitch, speed, remove_hiss]);

    // Gradio zvuk uglavnom vraća URL (privremenu putanju) – preuzmi binarno
    // result.data[0] može biti string ili objekat; proverimo najlakše:
    const out = Array.isArray(result?.data) ? result.data[0] : result;
    const url =
      typeof out === "string"
        ? out
        : out?.url || out?.path || out?.name;

    if (!url) {
      return new Response(JSON.stringify({ error: "No audio URL in response" }), { status: 500 });
    }

    const audioResp = await fetch(url);
    if (!audioResp.ok) {
      return new Response(JSON.stringify({ error: "Download failed" }), { status: 500 });
    }

    const buf = await audioResp.arrayBuffer();
    return new Response(buf, {
      headers: { "Content-Type": "audio/wav" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "Start error" }), { status: 500 });
  }
}
