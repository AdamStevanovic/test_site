"use client";

import React, { useRef, useState } from "react";
import "./globals.css";

export default function Home() {
  const [busy, setBusy] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [pitch, setPitch] = useState(7);
  const [speed, setSpeed] = useState(1.05);
  const [removeHiss, setRemoveHiss] = useState(true);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) { alert("Izaberi audio fajl ili snimi."); return; }

    setBusy(true);
    setAudioUrl(null);

    try {
      const fd = new FormData();
      fd.append("audio", file);
      fd.append("pitch", String(pitch));
      fd.append("speed", String(speed));
      fd.append("remove_hiss", String(removeHiss));

      const start = await fetch("/api/jobs/start", { method: "POST", body: fd });
      if (!start.ok) {
        let msg = `Start error (HTTP ${start.status})`;
        try {
          const ct = start.headers.get("content-type") || "";
          if (ct.includes("application/json")) {
            const j = await start.json();
            msg = j?.error || msg;
          } else {
            const t = await start.text();
            msg = t || msg;
          }
        } catch {}
        throw new Error(msg);
      }
      const { jobId } = await start.json();

      let tries = 0;
      const MAX_TRIES = 120;
      const INTERVAL_MS = 2000;

      while (tries < MAX_TRIES) {
        const res = await fetch(`/api/jobs/status?id=${encodeURIComponent(jobId)}`);
        const ct = res.headers.get("content-type") || "";

        if (ct.startsWith("audio/")) {
          const blob = await res.blob();
          setAudioUrl(URL.createObjectURL(blob));
          setBusy(false);
          return;
        }
        await new Promise((r) => setTimeout(r, INTERVAL_MS));
        tries++;
      }
      throw new Error("Isteklo čekanje. Pokušaj kraći snimak ili probaj ponovo.");
    } catch (err: any) {
      alert("Greška: " + (err?.message || "nepoznata"));
      setBusy(false);
    }
  }

  return (
    <main className="container">
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>🦜 Papagaj glas — profesionalni demo</h1>
      <p style={{ opacity: 0.8, marginBottom: 24 }}>
        Upload ili snimi glas → sajt poziva tvoj privatni Hugging Face Space → dobijaš papagaj verziju.
      </p>

      <form onSubmit={handleSubmit} className="card">
        <div className="row">
          <input ref={fileRef} type="file" accept="audio/*" disabled={busy} />
          <label>Pitch (semitoni): {pitch}
            <input className="range" type="range" min={-4} max={12} step={1}
                   value={pitch} onChange={(e) => setPitch(Number(e.target.value))} disabled={busy} />
          </label>
          <label>Brzina: {speed.toFixed(2)}
            <input className="range" type="range" min={0.9} max={1.2} step={0.01}
                   value={speed} onChange={(e) => setSpeed(Number(e.target.value))} disabled={busy} />
          </label>
          <label>
            <input type="checkbox" checked={removeHiss}
                   onChange={(e) => setRemoveHiss(e.target.checked)} disabled={busy} />
            {" "}Ukloni pištanje (notch)
          </label>
          <button type="submit" disabled={busy}>{busy ? "Obrada..." : "Pretvori"}</button>
        </div>
      </form>

      {audioUrl && (
        <section style={{ marginTop: 24 }} className="card">
          <h3>Rezultat</h3>
          <audio src={audioUrl} controls />
          <div style={{ marginTop: 8 }}>
            <a href={audioUrl} download="parrot.wav">Preuzmi WAV</a>
          </div>
        </section>
      )}

      <footer>© {new Date().getFullYear()} — Tvoj brend</footer>
    </main>
  );
}
