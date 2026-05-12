"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";

type Phase =
  | "idle"
  | "requesting"
  | "recording"
  | "paused"
  | "stopped"
  | "uploading"
  | "done";

function pickMimeType(): string {
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  for (const t of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)) {
      return t;
    }
  }
  return "";
}

function uploadBlobXHR(
  signedUrl: string,
  blob: Blob,
  onProgress: (pct: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", signedUrl);
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) {
        onProgress(Math.round((ev.loaded / ev.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));

    const fd = new FormData();
    fd.append("cacheControl", "3600");
    fd.append("", blob, "recording.webm");
    xhr.send(fd);
  });
}

export default function Recorder() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [includeWebcam, setIncludeWebcam] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);

  const displayStreamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const camStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const rafRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);
  const camVideoRef = useRef<HTMLVideoElement | null>(null);

  const recordStartRef = useRef<number>(0);
  const pausedAccumRef = useRef<number>(0);
  const pauseStartedRef = useRef<number | null>(null);

  const cleanupStreams = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    displayStreamRef.current?.getTracks().forEach((t) => t.stop());
    displayStreamRef.current = null;
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;
    camStreamRef.current?.getTracks().forEach((t) => t.stop());
    camStreamRef.current = null;
    void audioCtxRef.current?.close();
    audioCtxRef.current = null;
    if (screenVideoRef.current) {
      screenVideoRef.current.srcObject = null;
    }
    if (camVideoRef.current) {
      camVideoRef.current.srcObject = null;
    }
  }, []);

  const startRecording = async () => {
    setError(null);
    setPhase("requesting");
    chunksRef.current = [];
    pausedAccumRef.current = 0;
    pauseStartedRef.current = null;

    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
      displayStreamRef.current = displayStream;

      displayStream.getVideoTracks()[0]?.addEventListener("ended", () => {
        const mr = mediaRecorderRef.current;
        if (mr && (mr.state === "recording" || mr.state === "paused")) {
          mr.stop();
        }
      });

      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      micStreamRef.current = micStream;

      let camStream: MediaStream | null = null;
      if (includeWebcam) {
        camStream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        });
        camStreamRef.current = camStream;
      }

      const audioCtx = new AudioContext();
      await audioCtx.resume();
      audioCtxRef.current = audioCtx;
      const dest = audioCtx.createMediaStreamDestination();

      const sysAudioTracks = displayStream.getAudioTracks();
      if (sysAudioTracks.length) {
        const sysSource = audioCtx.createMediaStreamSource(
          new MediaStream([sysAudioTracks[0]])
        );
        sysSource.connect(dest);
      }

      const micSource = audioCtx.createMediaStreamSource(
        new MediaStream(micStream.getAudioTracks())
      );
      micSource.connect(dest);

      const mixedAudioTrack = dest.stream.getAudioTracks()[0];
      if (!mixedAudioTrack) {
        throw new Error("Could not mix audio");
      }

      let videoTrack = displayStream.getVideoTracks()[0];
      if (!videoTrack) {
        throw new Error("No display video track");
      }

      if (camStream && camStream.getVideoTracks()[0] && canvasRef.current) {
        const canvas = canvasRef.current;
        const screenV = screenVideoRef.current!;
        const camV = camVideoRef.current!;
        screenV.srcObject = displayStream;
        camV.srcObject = camStream;
        await screenV.play();
        await camV.play();

        const { width = 1280, height = 720 } = videoTrack.getSettings();
        canvas.width = width;
        canvas.height = height;
        const camSize = Math.round(Math.min(width, height) * 0.22);
        const pad = Math.round(camSize * 0.08);
        const bubbleR = camSize / 2;

        const draw = () => {
          const ctx = canvas.getContext("2d");
          if (!ctx) return;
          ctx.drawImage(screenV, 0, 0, canvas.width, canvas.height);
          const cx = canvas.width - pad - bubbleR;
          const cy = canvas.height - pad - bubbleR;
          ctx.save();
          ctx.beginPath();
          ctx.arc(cx, cy, bubbleR, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();
          ctx.drawImage(camV, cx - bubbleR, cy - bubbleR, camSize, camSize);
          ctx.restore();
          ctx.beginPath();
          ctx.arc(cx, cy, bubbleR, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(255,255,255,0.9)";
          ctx.lineWidth = 4;
          ctx.stroke();
          rafRef.current = requestAnimationFrame(draw);
        };
        rafRef.current = requestAnimationFrame(draw);

        const canvasStream = canvas.captureStream(30);
        const vt = canvasStream.getVideoTracks()[0];
        if (vt) videoTrack = vt;
      }

      const outStream = new MediaStream([videoTrack, mixedAudioTrack]);
      const mimeType = pickMimeType();
      const mr = new MediaRecorder(outStream, mimeType ? { mimeType } : undefined);

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mr.onerror = () => {
        setError("Recorder error");
        cleanupStreams();
        setPhase("idle");
      };

      mr.onstop = () => {
        if (pauseStartedRef.current != null) {
          pausedAccumRef.current += Date.now() - pauseStartedRef.current;
          pauseStartedRef.current = null;
        }
        cleanupStreams();
        mediaRecorderRef.current = null;
        setPhase("stopped");
      };

      mediaRecorderRef.current = mr;
      mr.start(250);
      recordStartRef.current = Date.now();
      setPhase("recording");
    } catch (e) {
      cleanupStreams();
      setPhase("idle");
      setError(e instanceof Error ? e.message : "Could not start recording");
    }
  };

  const pauseOrResume = () => {
    const mr = mediaRecorderRef.current;
    if (!mr) return;
    if (mr.state === "recording") {
      mr.pause();
      pauseStartedRef.current = Date.now();
      setPhase("paused");
    } else if (mr.state === "paused") {
      mr.resume();
      if (pauseStartedRef.current != null) {
        pausedAccumRef.current += Date.now() - pauseStartedRef.current;
        pauseStartedRef.current = null;
      }
      setPhase("recording");
    }
  };

  const stopRecording = () => {
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== "inactive") {
      mr.stop();
    } else {
      cleanupStreams();
      setPhase("stopped");
    }
  };

  const runUpload = async () => {
    setPhase("uploading");
    setUploadPct(0);
    setError(null);

    const chunks = chunksRef.current;
    if (!chunks.length) {
      setError("No recording data");
      setPhase("idle");
      return;
    }

    const blobType =
      chunks[0] instanceof Blob && chunks[0].type ? chunks[0].type : "video/webm";
    const blob = new Blob(chunks, { type: blobType });
    let pauseExtra = 0;
    if (pauseStartedRef.current != null) {
      pauseExtra = Date.now() - pauseStartedRef.current;
    }
    const durationSeconds = Math.max(
      1,
      Math.round((Date.now() - recordStartRef.current - pausedAccumRef.current - pauseExtra) / 1000)
    );

    try {
      const createRes = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const createJson = await createRes.json();
      if (!createRes.ok) {
        throw new Error(createJson.error ?? "Could not start upload");
      }

      const { recordingId, signedUrl } = createJson as {
        recordingId: string;
        signedUrl: string;
      };

      await uploadBlobXHR(signedUrl, blob, setUploadPct);

      const patchRes = await fetch("/api/upload", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recordingId, durationSeconds }),
      });
      const patchJson = await patchRes.json();
      if (!patchRes.ok) {
        throw new Error(patchJson.error ?? "Could not finalize upload");
      }

      setPhase("done");
      void fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recordingId }),
      }).catch(() => {});

      router.push(`/watch/${recordingId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
      setPhase("stopped");
    }
  };

  const reset = () => {
    chunksRef.current = [];
    setPhase("idle");
    setError(null);
    setUploadPct(0);
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Status
            </p>
            <p className="text-lg font-semibold capitalize text-zinc-900 dark:text-zinc-50">
              {phase}
            </p>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <input
              type="checkbox"
              checked={includeWebcam}
              onChange={(e) => setIncludeWebcam(e.target.checked)}
              disabled={phase !== "idle" && phase !== "stopped"}
              className="rounded border-zinc-400"
            />
            Webcam bubble
          </label>
        </div>

        {includeWebcam && (
          <canvas ref={canvasRef} className="hidden" aria-hidden />
        )}
        <video ref={screenVideoRef} className="hidden" muted playsInline />
        <video ref={camVideoRef} className="hidden" muted playsInline />

        {error && (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        )}

        {phase === "uploading" && (
          <div className="mb-4">
            <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
              <div
                className="h-full bg-emerald-500 transition-all"
                style={{ width: `${uploadPct}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-zinc-500">{uploadPct}% uploaded</p>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          {phase === "idle" || phase === "stopped" ? (
            <button
              type="button"
              onClick={startRecording}
              className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500"
            >
              {phase === "stopped" ? "Record again" : "Start recording"}
            </button>
          ) : null}

          {phase === "recording" || phase === "paused" ? (
            <>
              <button
                type="button"
                onClick={pauseOrResume}
                className="rounded-xl border border-zinc-300 px-5 py-2.5 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-900"
              >
                {phase === "paused" ? "Resume" : "Pause"}
              </button>
              <button
                type="button"
                onClick={stopRecording}
                className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-500"
              >
                Stop
              </button>
            </>
          ) : null}

          {phase === "stopped" ? (
            <>
              <button
                type="button"
                onClick={runUpload}
                className="rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
              >
                Upload & finish
              </button>
              <button
                type="button"
                onClick={reset}
                className="rounded-xl px-5 py-2.5 text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400"
              >
                Discard
              </button>
            </>
          ) : null}
        </div>
      </div>
      <p className="text-center text-sm text-zinc-500">
        Choose a screen or window with tab audio, allow the microphone, then stop when you are
        finished. Video uses VP9 in WebM when your browser supports it.
      </p>
    </div>
  );
}
