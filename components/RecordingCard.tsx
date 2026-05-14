"use client";

import type { Recording } from "@/lib/database.types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type RecordingCardProps = {
  recording: Recording;
  appOrigin: string;
};

function formatDuration(seconds: number | null) {
  if (seconds == null || seconds < 0) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("en-GB", {    
        dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function RecordingCard({ recording, appOrigin }: RecordingCardProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const watchUrl = `${appOrigin}/watch/${recording.id}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(watchUrl);
    } catch {
      /* ignore */
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this recording permanently?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/recordings/${recording.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error ?? "Delete failed");
      }
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950">
      <Link
        href={`/watch/${recording.id}`}
        className="block aspect-video bg-zinc-100 dark:bg-zinc-900"
      >
        {recording.public_url && recording.status === "ready" ? (
          <video
            src={recording.public_url}
            className="h-full w-full object-cover"
            muted
            playsInline
            preload="metadata"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-zinc-500">
            {recording.status === "uploading" ? "Uploading…" : "No preview"}
          </div>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <Link href={`/watch/${recording.id}`}>
          <h3 className="line-clamp-2 font-semibold text-zinc-900 dark:text-zinc-50">
            {recording.title}
          </h3>
        </Link>
        <dl className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs text-zinc-600 dark:text-zinc-400">
          <dt className="font-medium">Duration</dt>
          <dd>{formatDuration(recording.duration_seconds)}</dd>
          <dt className="font-medium">Recorded</dt>
          <dd>{formatDate(recording.created_at)}</dd>
          <dt className="font-medium">Views</dt>
          <dd>{recording.view_count}</dd>
        </dl>
        <div className="mt-auto flex flex-wrap gap-2 pt-2">
          <button
            type="button"
            onClick={copyLink}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-900"
          >
            Copy link
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-500 disabled:opacity-50"
          >
            {deleting ? "…" : "Delete"}
          </button>
        </div>
      </div>
    </article>
  );
}
