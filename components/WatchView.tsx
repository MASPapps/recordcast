"use client";

import type { Recording } from "@/lib/database.types";
import { createClient } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ShareBar } from "@/components/ShareBar";
import { Transcript } from "@/components/Transcript";
import { ViewTracker } from "@/components/ViewTracker";

type WatchViewProps = {
  recording: Recording;
  isOwner: boolean;
  appOrigin: string;
};

export function WatchView({ recording, isOwner, appOrigin }: WatchViewProps) {
  const router = useRouter();
  const [title, setTitle] = useState(recording.title);
  const [savingTitle, setSavingTitle] = useState(false);
  const [mascastBusy, setMascastBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const watchUrl = `${appOrigin}/watch/${recording.id}`;

  async function saveTitle() {
    if (!isOwner || title.trim() === recording.title) return;
    setSavingTitle(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("recordings")
        .update({ title: title.trim().slice(0, 200) })
        .eq("id", recording.id);
      if (error) throw error;
      router.refresh();
    } catch {
      setTitle(recording.title);
    } finally {
      setSavingTitle(false);
    }
  }

  async function sendMascast() {
    setMascastBusy(true);
    try {
      const res = await fetch("/api/mascast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recordingId: recording.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      alert("Sent to MASCAST.");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed");
    } finally {
      setMascastBusy(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this recording? This cannot be undone.")) return;
    setDeleteBusy(true);
    try {
      const res = await fetch(`/api/recordings/${recording.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Delete failed");
      router.push("/dashboard");
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <>
      <ViewTracker recordingId={recording.id} />
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/dashboard"
            className="text-sm font-medium text-emerald-700 hover:text-emerald-600 dark:text-emerald-400"
          >
            ← Library
          </Link>
          {isOwner && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  alert("Trim is not available in this demo. Download and edit locally.")
                }
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-900"
              >
                Trim
              </button>
              <button
                type="button"
                onClick={sendMascast}
                disabled={mascastBusy}
                className="rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
              >
                {mascastBusy ? "Sending…" : "Send to MASCAST"}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteBusy}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50"
              >
                {deleteBusy ? "…" : "Delete"}
              </button>
            </div>
          )}
        </div>

        <div className="mb-4">
          {isOwner ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                className="flex-1 rounded-xl border border-zinc-300 bg-white px-4 py-2 text-2xl font-semibold text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={saveTitle}
                disabled={savingTitle}
              />
            </div>
          ) : (
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
              {recording.title}
            </h1>
          )}
          <p className="mt-2 text-sm text-zinc-500">
            {recording.view_count} views ·{" "}
            {recording.duration_seconds != null
              ? `${recording.duration_seconds}s`
              : "Duration unknown"}
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-black shadow-lg dark:border-zinc-800">
          {recording.public_url ? (
            <video
              src={recording.public_url}
              controls
              className="aspect-video w-full"
              preload="metadata"
            >
              Your browser does not support the video tag.
            </video>
          ) : (
            <div className="flex aspect-video items-center justify-center text-zinc-400">
              Video not available
            </div>
          )}
        </div>

        <div className="mt-6">
          <ShareBar watchUrl={watchUrl} recordingId={recording.id} />
        </div>

        <Transcript
          recordingId={recording.id}
          transcript={recording.transcript}
          canEdit={isOwner}
        />
      </div>
    </>
  );
}
