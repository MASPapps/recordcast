export const runtime = 'edge';
import { SignInGoogle } from "@/components/SignInGoogle";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import Link from "next/link";
import { redirect } from "next/navigation";

type SearchParams = { redirect?: string };

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const q = await searchParams;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const dest = typeof q.redirect === "string" && q.redirect.startsWith("/") ? q.redirect : "/dashboard";
    redirect(dest);
  }

  const nextAfterLogin = typeof q.redirect === "string" && q.redirect.startsWith("/") ? q.redirect : "/dashboard";

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-zinc-900">
      <header className="mx-auto flex max-w-5xl items-center justify-center px-4 py-6 sm:justify-start">
        <span className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          RecordCast
        </span>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-24 pt-12 text-center sm:pt-20">
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900 sm:text-6xl dark:text-zinc-50">
          Record. Share. Done.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-600 dark:text-zinc-400">
          The fastest way to capture your screen, narrate with your voice, and share a link—like
          Loom, built on open web tech and your own Supabase backend.
        </p>
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <SignInGoogle redirectTo={nextAfterLogin} />
          <Link
            href="/dashboard"
            className="rounded-xl px-6 py-3 text-sm font-semibold text-emerald-700 hover:text-emerald-600 dark:text-emerald-400"
          >
            Go to library (sign in required) →
          </Link>
        </div>

        <ul className="mx-auto mt-24 grid max-w-4xl gap-8 text-left sm:grid-cols-3">
          <li className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">Crystal-clear capture</h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Screen, tab audio, microphone, and an optional webcam bubble—encoded as WebM with VP9
              when your browser allows it.
            </p>
          </li>
          <li className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">Instant sharing</h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Every recording gets a public watch page with copy-link, embed code, and view
              analytics powered by Supabase.
            </p>
          </li>
          <li className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">Transcripts and webhooks</h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Generate transcripts with Whisper, then push metadata to your stack through the MASCAST
              webhook integration.
            </p>
          </li>
        </ul>
      </main>
    </div>
  );
}
