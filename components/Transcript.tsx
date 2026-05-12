"use client";

import { useEffect, useState } from "react";

type TranscriptProps = {
  recordingId: string;
  transcript: string | null;
  canEdit: boolean;
};

export function Transcript({ recordingId, transcript, canEdit }: TranscriptProps) {
  const [text, setText] = useState(transcript ?? "");

  useEffect(() => {
    setText(transcript ?? "");
  }, [transcript]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recordingId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Transcription failed");
      }
      setText(data.transcript ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Transcript
        </h2>
        {canEdit && (
          <button
            type="button"
            onClick={generate}
            disabled={loading}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {loading ? "Transcribing…" : text ? "Regenerate" : "Generate transcript"}
          </button>
        )}
      </div>
      {error && (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
          {error}
        </p>
      )}
      {text ? (
        <div className="prose prose-zinc dark:prose-invert max-w-none whitespace-pre-wrap text-sm leading-relaxed">
          {text}
        </div>
      ) : (
        <p className="text-sm text-zinc-500">
          {canEdit
            ? "No transcript yet. Generate one with Whisper (OpenAI)."
            : "No transcript for this recording."}
        </p>
      )}
    </section>
  );
}
