import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

const BUCKET = "recordings";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let title = "Untitled recording";
  try {
    const body = await request.json();
    if (typeof body?.title === "string" && body.title.trim()) {
      title = body.title.trim().slice(0, 200);
    }
  } catch {
    /* no body */
  }

  const { data: row, error: insertError } = await supabase
    .from("recordings")
    .insert({
      user_id: user.id,
      title,
      status: "uploading",
    })
    .select("id")
    .single();

  if (insertError || !row) {
    return NextResponse.json(
      { error: insertError?.message ?? "Failed to create recording" },
      { status: 500 }
    );
  }

  const path = `${user.id}/${row.id}.webm`;

  const { error: pathError } = await supabase
    .from("recordings")
    .update({ storage_path: path })
    .eq("id", row.id);

  if (pathError) {
    return NextResponse.json({ error: pathError.message }, { status: 500 });
  }

  const admin = createSupabaseServiceClient();
  const { data: signed, error: signError } = await admin.storage
    .from(BUCKET)
    .createSignedUploadUrl(path, { upsert: true });

  if (signError || !signed) {
    return NextResponse.json(
      { error: signError?.message ?? "Could not create upload URL" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    recordingId: row.id,
    signedUrl: signed.signedUrl,
    token: signed.token,
    path: signed.path,
  });
}

export async function PATCH(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let recordingId: string;
  let durationSeconds: number | undefined;
  try {
    const body = await request.json();
    recordingId = body.recordingId;
    if (typeof body.durationSeconds === "number" && body.durationSeconds >= 0) {
      durationSeconds = Math.round(body.durationSeconds);
    }
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!recordingId || typeof recordingId !== "string") {
    return NextResponse.json({ error: "recordingId required" }, { status: 400 });
  }

  const { data: existing, error: fetchError } = await supabase
    .from("recordings")
    .select("id, user_id, storage_path")
    .eq("id", recordingId)
    .single();

  if (fetchError || !existing || existing.user_id !== user.id || !existing.storage_path) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/$/, "");
  const publicUrl = `${base}/storage/v1/object/public/${BUCKET}/${existing.storage_path}`;

  const { error: updateError } = await supabase
    .from("recordings")
    .update({
      status: "ready",
      public_url: publicUrl,
      ...(durationSeconds !== undefined ? { duration_seconds: durationSeconds } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", recordingId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, publicUrl });
}
