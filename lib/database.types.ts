export type RecordingStatus = "uploading" | "ready" | "failed";

export interface Recording {
  id: string;
  user_id: string;
  title: string;
  status: RecordingStatus;
  storage_path: string | null;
  public_url: string | null;
  duration_seconds: number | null;
  transcript: string | null;
  view_count: number;
  created_at: string;
  updated_at: string;
}
