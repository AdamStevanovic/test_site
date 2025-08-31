"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";

type Stage = "idle" | "uploading" | "processing" | "done";
type RecState = "idle" | "recording";

function formatTime(s: number) {
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const ss = Math.floor(s % 60).toString().padStart(2, "0");
  return `${m}:${ss}`;
}

export default function Home() {
  const [stage, setStage] = useState<Stage>("idle");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // fajl upload
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string>("");

  // mikrofon
  const [recState, setRecState] = useState<RecState>("idle");
  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const [recBlob, setRecBlob] = useState<Blob | null>(null);
  const [recName, setRecName] = useState<string>("");
  const [sec, setSec] = useState(0);
  const timerRef = useRef<number | null>(null);

  const MAX_MB = 20;

  // === Upload ===
  const pickFile = () => fileRef.current?.click();

  const onFilePicked = (f?: File) => {
    if (!f) return;
    if (f.size > MAX_MB * 1024 * 1024) {
      setError(`Fajl je veći od ${MAX_MB}MB.`);
      return;
    }
    setError(null);
    setFileName(f.name);
    // ako je izabran fajl, brišemo eventualni snimak mikrofona
    setRecBlob(null);
    setRecName("");
    setSec(0);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    onFilePicked(f);
  }, []);

  const onDrag = (e: React.DragEvent) => e.preventDefault();

  // === Recording ===
  async function startRec() {
    try {
      // ako postoji aktivan stream, zatvori ga
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // pokušaj najkvalitetniji mimetype koji browser podržava
      const preferred =
        "audio/webm;codecs=opus" in (MediaRecorder as any)
          ? "audio/webm;codecs=opus"
          : undefined;

      const options: MediaRecorderOptions = {};
      if (preferred && MediaRecorder.isTypeSupported?.("audio/webm;codecs=opus")) {
        options.mimeType = "audio/webm;codecs=opus";
      } else if (MediaRecorder.isTypeSupported?.("audio/webm")) {
        options.mimeType = "audio/webm";
      }

      const mr = new MediaRecorder(stream, options);
      mediaRecRef.current = mr;
      chunksRef.current = [];
      setRecBlob(null);
      setRecName("");
      setSec(0);

      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        setRecBlob(blob);
        setRecName("snimak.webm");
        setStage("idle");
        // zaustavi stream
        stream.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      };

      mr.start();
      setRecState("recording");
      // timer
      timerRef.current = window.setInterval(() => setSec(s => s + 1), 1000);
    } catch (err: any) {
      setError(err?.message || "Nije moguće pokrenuti mikrofon.");
    }
  }

  function stopRec() {
    if (mediaRecRef.current && recState === "recording") {
      mediaRecRef.current.stop();
      mediaRecRef.current = null;
      setRecState("idle");
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }

  function clearRec() {
    stopRec();
    setRecBlob(null);
    setRecName("");
    setSec(0);
  }

  useEffect(() => {
    return () => {
      // cleanup stream/timer na unmount
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };
  }, []);

  // === Submit ===
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // preferiraj snimak mikrofona, pa uploadovani fajl
    let file: File | undefined;
    if (recBlob) {
      file = new File([recBlob], recName || "snimak.webm", { type: recBlob.type });
    } else {
      file = fileRef.current?.files?.[0];
    }

    if (!file) {
      setError("Izaberi audio fajl ili snimi glas.");
      return;
    }

    setError(null);
    setStage("uploading");
    setAudioUrl(null);

    try {
      const fd = new FormData();
      fd.append("audio", file);

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
          <h1 className="title">Pričaj kao papagaj</h1>
        </div>
        <p className="subtitle">
          Otpremi ili snimi glas!
        </p>
      </header>

      <section className="card">
        <form onSubmit={handleSubmit}>
          {/* DROPZONE / UPLOAD */}
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
                {recBlob ? (
                  <>
                    <strong>{recName || "snimak.webm"}</strong>
                    <span className="dz-sub">Snimak mikrofonom je spreman</span>
                  </>
                ) : fileName ? (
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

          {/* SNIMANJE MIKROFONOM */}
          <div className="rec-wrap">
            <button
              type="button"
              className={`rec-btn ${recState === "recording" ? "recording" : ""}`}
              onClick={recState === "recording" ? stopRec : startRec}
            >
              {recState === "recording" ? "Zaustavi snimanje" : "Snimaj mikrofonom"}
            </button>
            <div className="timer">
              {recState === "recording" ? "●" : "○"} {formatTime(sec)}
            </div>

            {(recBlob || recState === "recording") && (
              <button
                type="button"
                className="btn btn-link rec-clear"
                onClick={clearRec}
                disabled={recState === "recording" && !recBlob}
                title="Ukloni snimak"
              >
                Ukloni snimak
              </button>
            )}
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

      <footer className="footer">© {new Date().getFullYear()} — Tvoj brend</footer>
    </main>
  );
}
