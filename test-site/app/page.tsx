"use client";

import React, { useCallback, useRef, useState } from "react";

type Stage = "idle" | "uploading" | "processing" | "done";

export default function Home() {
  const [stage, setStage] = useState<Stage>("idle");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  // ograniči upload (npr. 20 MB)
  const MAX_MB = 20;

  const pickFile = () => fileRef.current?.click();

  const onFilePicked = (f: File | undefined) => {
    if (!f) return;
    if (f.size > MAX_MB * 1024 * 1024) {
      setError(`Fajl je veći od ${MAX_MB}MB.`);
      return;
    }
    setError(null);
    setFileName(f.name);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    onFilePicked(f);
  }, []);

  const onDrag = (e: React.DragEvent) => {
    e.preventDefault();
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Izaberi audio fajl ili prevuci u polje.");
      return;
    }

    setError(null);
    setStage("uploading");
    setAudioUrl(null);

    try {
      const fd = new FormData();
      fd.append("audio", file);

      // backend ima svoje default vrednosti (pitch/speed/notch),
      // pa ništa od toga ne šaljemo sa fronta.
      const res = await fetch("/api/convert", { method: "POST", body: fd });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || `HTTP ${res.status}`);
      }

      setStage("processing");
      const blob = await res.blob();
      setAudioUrl(URL.createObjectURL(blob));
      setStage("done");
    } catch (err: any) {
      setStage("idle");
      setError(err?.message || "Greška pri obradi. Pokušaj ponovo.");
    }
  }

  return (
    <main className="shell">
      <header className="hero">
        <div className="brand">
          <span className="logo">🦜</span>
          <h1 className="title">Papagaj glas — profesionalni demo</h1>
        </div>
        <p className="subtitle">
          Otpremi ili prevuci snimak — server će pozvati tvoj Hugging Face Space i vratiti papagaj verziju (WAV).
        </p>
      </header>

      <section className="card">
        <form onSubmit={handleSubmit}>
          <input
            ref={fileRef}
            type="file"
            accept="audio/*"
            hidden
            onChange={(e) => onFilePicked(e.target.files?.[0])}
          />

          <div
            className="dropzone"
            onDragEnter={onDrag}
            onDragOver={onDrag}
            onDrop={onDrop}
            onClick={pickFile}
            role="button"
            aria-label="Prevuci audio fajl ili klikni za izbor"
          >
            <div className="dz-inner">
              <div className="dz-icon">🎵</div>
              <div className="dz-text">
                {fileName ? (
                  <>
                    <strong>{fileName}</strong>
                    <span className="dz-sub">Klikni da promeniš fajl</span>
                  </>
                ) : (
                  <>
                    <strong>Prevuci audio ovde</strong>
                    <span className="dz-sub">…ili klikni da izabereš fajl</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {error && <div className="alert">{error}</div>}

          <button
            className="btn btn-primary"
            disabled={stage === "uploading" || stage === "processing"}
          >
            {stage === "uploading" && "Otpremanje…"}
            {stage === "processing" && "Obrada…"}
            {stage === "idle" || stage === "done" ? "Pretvori" : null}
          </button>
        </form>
      </section>

      {audioUrl && (
        <section className="card result">
          <h3>Rezultat</h3>
          <audio className="player" src={audioUrl} controls />
          <a className="btn btn-link" href={audioUrl} download="parrot.wav">
            Preuzmi WAV
          </a>
        </section>
      )}

      <footer className="footer">
        © {new Date().getFullYear()} — Tvoj brend
      </footer>
    </main>
  );
}
