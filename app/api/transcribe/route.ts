import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase-server";
import OpenAI from "openai";
import { NextResponse } from "next/server";

export const runtime = 'edge';

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OpenAI not configured" }, { status: 500 });
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
    .select("id, user_id, public_url, status, transcript")
    .eq("id", recordingId)
    .single();

  if (error || !rec || rec.user_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (rec.status !== "ready" || !rec.public_url) {
    return NextResponse.json({ error: "Recording not ready" }, { status: 400 });
  }

  const mediaRes = await fetch(rec.public_url);
  if (!mediaRes.ok) {
    return NextResponse.json({ error: "Could not fetch recording file" }, { status: 502 });
  }

  const buf = Buffer.from(await mediaRes.arrayBuffer());
  const file = new File([buf], "recording.webm", { type: "video/webm" });

  const openai = new OpenAI({ apiKey });
  const transcription = await openai.audio.transcriptions.create({
    file,
    model: "whisper-1",
  });

  const text = transcription.text?.trim() ?? "";

  const admin = createSupabaseServiceClient();
  const { error: upErr } = await admin
    .from("recordings")
    .update({ transcript: text, updated_at: new Date().toISOString() })
    .eq("id", recordingId)
    .eq("user_id", user.id);

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  return NextResponse.json({ transcript: text });
}