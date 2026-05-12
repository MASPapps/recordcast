import { WatchView } from "@/components/WatchView";
import type { Recording } from "@/lib/database.types";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { notFound } from "next/navigation";

type PageProps = { params: Promise<{ id: string }> };

export default async function WatchPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: recording, error } = await supabase
    .from("recordings")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !recording) {
    notFound();
  }

  const rec = recording as Recording;
  if (rec.status !== "ready" && rec.user_id !== user?.id) {
    notFound();
  }

  const isOwner = user?.id === rec.user_id;
  const appOrigin =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

  return <WatchView recording={rec} isOwner={isOwner} appOrigin={appOrigin} />;
}
