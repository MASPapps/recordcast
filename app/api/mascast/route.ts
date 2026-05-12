import type { Recording } from "@/lib/database.types";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const webhookUrl = process.env.MASCAST_WEBHOOK_URL;
  const secret = process.env.MASCAST_WEBHOOK_SECRET;

  if (!webhookUrl) {
    return NextResponse.json({ error: "MASCAST webhook not configured" }, { status: 500 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let recordingId: string;
  try {
    const body = await request.json();
    recordingId = body.recordingId;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!recordingId) {
    return NextResponse.json({ error: "recordingId required" }, { status: 400 });
  }

  const { data: rec, error } = await supabase
    .from("recordings")
    .select(
      "id, user_id, title, status, public_url, duration_seconds, transcript, view_count, created_at"
    )
    .eq("id", recordingId)
    .single();

  const recording = rec as Recording | null;
  if (error || !recording || recording.user_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const payload = {
    event: "recordcast.recording.ready",
    recording: {
      id: recording.id,
      title: recording.title,
      public_url: recording.public_url,
      duration_seconds: recording.duration_seconds,
      transcript: recording.transcript,
      view_count: recording.view_count,
      created_at: recording.created_at,
    },
    user: { id: user.id, email: user.email },
    app_url: process.env.NEXT_PUBLIC_APP_URL ?? "",
  };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (secret) {
    headers["X-RecordCast-Secret"] = secret;
  }

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const t = await res.text();
    return NextResponse.json(
      { error: "Webhook failed", detail: t.slice(0, 500) },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
