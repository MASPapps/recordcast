"use client";

import { createClient } from "@/lib/supabase";
import { useEffect, useRef } from "react";

export function ViewTracker({ recordingId }: { recordingId: string }) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    const supabase = createClient();
    void supabase.rpc("increment_recording_views", { recording_id: recordingId });
  }, [recordingId]);

  return null;
}
