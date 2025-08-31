import { NextResponse } from "next/server";
import { client } from "@gradio/client";

const HF_SPACE = process.env.HF_SPACE!;
const HF_TOKEN = process.env.HF_TOKEN; // opciono (za public nije obavezno)

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const app = await client(HF_SPACE, HF_TOKEN ? { hf_token: HF_TOKEN } : undefined);
    const api: any = await app.view_api();

    const candidates: string[] = [];
    const ne = api?.named_endpoints;
    if (ne) {
      if (Array.isArray(ne)) ne.forEach((e: any) => e?.endpoint && candidates.push(e.endpoint));
      else Object.values(ne).forEach((e: any) => e?.endpoint && candidates.push(e.endpoint));
    }
    const eps = api?.endpoints;
    if (Array.isArray(eps)) eps.forEach((e: any) => e?.endpoint && candidates.push(e.endpoint));

    return NextResponse.json({
      candidates: [...new Set(candidates)], // lista jedinstvenih endpoint-a
      hint: "Postavi HF_ENDPOINT na jedan od 'candidates' i redeploy.",
      raw_sample: {
        // mali isečak radi orijentacije; kompletan 'api' je ogroman
        named_endpoints_type: Array.isArray(ne) ? "array" : typeof ne,
        endpoints_count: Array.isArray(eps) ? eps.length : 0,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "view_api failed" }, { status: 500 });
  }
}
