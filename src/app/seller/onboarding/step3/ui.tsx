"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

/* ── Component ── */

export function PublishForm() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [onboardingData, setOnboardingData] = useState<Record<string, unknown> | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isVideo, setIsVideo] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ── Load sessionStorage on mount ── */
  useEffect(() => {
    const raw = sessionStorage.getItem("onboarding");
    if (!raw) {
      router.replace("/seller/onboarding");
      return;
    }
    try {
      setOnboardingData(JSON.parse(raw));
    } catch {
      router.replace("/seller/onboarding");
    }
  }, [router]);

  /* ── Handle file pick ── */
  const handleFile = useCallback((f: File | null) => {
    // Cleanup old preview
    if (preview) URL.revokeObjectURL(preview);

    if (!f) {
      setFile(null);
      setPreview(null);
      setIsVideo(false);
      return;
    }

    // Validate type
    const validTypes = ["image/jpeg", "image/png", "video/mp4"];
    if (!validTypes.includes(f.type)) {
      setError("Only JPG, PNG, or MP4 files are allowed.");
      return;
    }

    // Validate size (50MB)
    if (f.size > 50 * 1024 * 1024) {
      setError("File too large. Max 50MB.");
      return;
    }

    setError(null);
    setFile(f);
    setIsVideo(f.type === "video/mp4");
    setPreview(URL.createObjectURL(f));
  }, [preview]);

  /* ── Publish ── */
  const handlePublish = useCallback(async () => {
    if (!onboardingData || publishing) return;
    setPublishing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("data", JSON.stringify(onboardingData));
      if (file) formData.append("cover", file);

      const res = await fetch("/api/seller/publish", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Publish failed");

      // Cleanup
      sessionStorage.removeItem("onboarding");

      router.push("/seller/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setPublishing(false);
    }
  }, [onboardingData, file, publishing, router]);

  /* ── Cleanup preview URL on unmount ── */
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  if (!onboardingData) return null;

  return (
    <div className="flex flex-col gap-8 animate-[fade-in_0.3s_ease-out]">
      {/* ── Upload zone ── */}
      <section>
        <label className="mb-3 block text-xs font-semibold uppercase tracking-widest text-zinc-500">
          Cover photo or video
        </label>

        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,video/mp4"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        />

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="group relative w-full overflow-hidden rounded-2xl border border-white/10 transition hover:border-white/20"
          style={{ aspectRatio: "16 / 10" }}
        >
          {preview ? (
            /* ── Preview ── */
            isVideo ? (
              <video
                src={preview}
                autoPlay
                muted
                loop
                playsInline
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview}
                alt="Cover preview"
                className="absolute inset-0 h-full w-full object-cover"
              />
            )
          ) : (
            /* ── Empty state ── */
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-3"
              style={{
                background: "linear-gradient(135deg, rgba(124,92,232,0.12), rgba(77,158,245,0.08), rgba(0,212,200,0.06))",
              }}
            >
              <svg className="h-10 w-10 text-zinc-500 transition group-hover:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
              </svg>
              <span className="text-sm text-zinc-500 transition group-hover:text-zinc-400">
                Add a cover photo or video
              </span>
              <span className="text-[10px] text-zinc-600">
                JPG, PNG, or MP4 · max 50MB
              </span>
            </div>
          )}

          {/* Change overlay on preview */}
          {preview && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/40 group-hover:opacity-100">
              <span className="text-sm font-semibold text-white">Change cover</span>
            </div>
          )}
        </button>

        {/* Remove / Skip */}
        <div className="mt-3 flex items-center justify-between">
          {file ? (
            <button
              type="button"
              onClick={() => handleFile(null)}
              className="text-xs text-zinc-500 transition hover:text-zinc-300"
            >
              Remove
            </button>
          ) : (
            <span />
          )}
          <span className="text-[10px] text-zinc-600">
            You can skip this and add it later
          </span>
        </div>
      </section>

      {/* ── Error ── */}
      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}

      {/* ── Publish + Back ── */}
      <div className="flex flex-col gap-3">
        <button
          type="button"
          disabled={publishing}
          onClick={handlePublish}
          className="relative w-full overflow-hidden rounded-2xl py-3.5 text-sm font-semibold text-white shadow-lg transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          style={{
            background: "linear-gradient(135deg, #7c5ce8, #4d9ef5, #00d4c8)",
          }}
        >
          {publishing ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Publishing…
            </span>
          ) : (
            "Publish my storefront →"
          )}
        </button>
        <button
          type="button"
          onClick={() => router.push("/seller/onboarding/step2")}
          className="text-xs text-zinc-500 transition hover:text-zinc-300"
        >
          &larr; Back to step 2
        </button>
      </div>
    </div>
  );
}
