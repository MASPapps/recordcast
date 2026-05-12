import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export const runtime = 'edge';

const BUCKET = "recordings";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: rec, error: fetchError } = await supabase
    .from("recordings")
    .select("id, user_id, storage_path")
    .eq("id", id)
    .single();

  if (fetchError || !rec || rec.user_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const admin = createSupabaseServiceClient();
  if (rec.storage_path) {
    await admin.storage.from(BUCKET).remove([rec.storage_path]);
  }

  const { error: delError } = await admin.from("recordings").delete().eq("id", id);

  if (delError) {
    return NextResponse.json({ error: delError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}