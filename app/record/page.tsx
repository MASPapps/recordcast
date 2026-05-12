import Recorder from "@/components/Recorder";
import Link from "next/link";

export default function RecordPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Link href="/dashboard" className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400">
            ← Back to library
          </Link>
          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">RecordCast</span>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="mb-2 text-center text-3xl font-bold text-zinc-900 dark:text-zinc-50">
          New recording
        </h1>
        <p className="mb-10 text-center text-zinc-600 dark:text-zinc-400">
          Capture your screen, microphone, and optional camera bubble.
        </p>
        <Recorder />
      </main>
    </div>
  );
}
