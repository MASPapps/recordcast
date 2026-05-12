"use client";

import { useState } from "react";

type ShareBarProps = {
  watchUrl: string;
  recordingId: string;
};

export function ShareBar({ watchUrl, recordingId }: ShareBarProps) {
  const [copied, setCopied] = useState<"link" | "embed" | null>(null);

  const embedCode = `<iframe src="${watchUrl}" width="960" height="540" style="border:0;border-radius:12px;max-width:100%" allow="autoplay; fullscreen" title="RecordCast video"></iframe>`;

  async function copy(text: string, kind: "link" | "embed") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied(null);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Share
        </span>
        <code className="max-w-full truncate rounded-md bg-white px-2 py-1 text-xs text-zinc-600 dark:bg-zinc-950 dark:text-zinc-400">
          {watchUrl}
        </code>
        <button
          type="button"
          onClick={() => copy(watchUrl, "link")}
          className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          {copied === "link" ? "Copied!" : "Copy link"}
        </button>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Embed
        </span>
        <textarea
          readOnly
          className="min-h-[72px] w-full resize-y rounded-lg border border-zinc-200 bg-white p-2 font-mono text-xs text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300"
          value={embedCode}
        />
        <button
          type="button"
          onClick={() => copy(embedCode, "embed")}
          className="self-start rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          {copied === "embed" ? "Embed copied!" : "Copy embed code"}
        </button>
      </div>
      <p className="text-xs text-zinc-500">Recording ID: {recordingId}</p>
    </div>
  );
}
