export const runtime = 'edge';
import { RecordingCard } from "@/components/RecordingCard";
import type { Recording } from "@/lib/database.types";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/?redirect=/dashboard");
  }

  const { data: rows } = await supabase
    .from("recordings")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const recordings = (rows ?? []) as Recording[];
  const appOrigin =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <Link href="/" className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
            RecordCast
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-zinc-600 sm:inline dark:text-zinc-400">
              {user.email}
            </span>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-900"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">Your library</h1>
            <p className="mt-1 text-zinc-600 dark:text-zinc-400">
              Recordings you have created with RecordCast.
            </p>
          </div>
          <Link
            href="/record"
            className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-emerald-500"
          >
            New recording
          </Link>
        </div>

        {recordings.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center dark:border-zinc-700 dark:bg-zinc-900">
            <p className="text-zinc-600 dark:text-zinc-400">No recordings yet.</p>
            <Link
              href="/record"
              className="mt-4 inline-block font-medium text-emerald-600 hover:text-emerald-500"
            >
              Create your first recording →
            </Link>
          </div>
        ) : (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {recordings.map((r) => (
              <li key={r.id}>
                <RecordingCard recording={r} appOrigin={appOrigin} />
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
