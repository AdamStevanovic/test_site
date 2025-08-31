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
    if (!file) {
      alert("Izaberi audio fajl ili snimi.");
      return;
    }

    setBusy(true);
    setAudioUrl(null);

    try {
      const fd = new FormData();
      fd.append("audio", file);
      fd.append("pitch", String(pitch));
      fd.append("speed", String(speed));
      fd.append("remove_hiss", String(removeHiss));

      const res = await fetch("/api/convert", { method: "POST", body: fd });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || `HTTP ${res.status}`);
      }

      const blob = await res.blob();
      setAudioUrl(URL.createObjectURL(blob));
    } catch (err: any) {
      alert("Greška: " + (err?.message || "nepoznata"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="container">
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>🦜 Papagaj glas — profesionalni demo</h1>
      <p style={{ opacity: 0.8, marginBottom: 24 }}>
        Upload ili snimi glas → server poziva tvoj Hugging Face Space → dobijaš papagaj verziju (WAV).
      </p>

      <form onSubmit={handleSubmit} className="card">
        <div className="row">
          <label>
            Izaberi audio fajl:
            <input ref={fileRef} type="file" accept="audio/*" disabled={busy} />
          </label>

          <label>Pitch (semitoni): {pitch}
            <input
              className="range"
              type="range"
              min={-4}
              max={12}
              step={1}
              value={pitch}
              onChange={(e) => setPitch(Number(e.target.value))}
              disabled={busy}
            />
          </label>

          <label>Brzina: {speed.toFixed(2)}
            <input
              className="range"
              type="range"
              min={0.9}
              max={1.2}
              step={0.01}
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              disabled={busy}
            />
          </label>

          <label>
            <input
              type="checkbox"
              checked={removeHiss}
              onChange={(e) => setRemoveHiss(e.target.checked)}
              disabled={busy}
            />{" "}
            Ukloni pištanje (notch)
          </label>

          <button type="submit" disabled={busy}>
            {busy ? "Obrada..." : "Pretvori"}
          </button>
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
