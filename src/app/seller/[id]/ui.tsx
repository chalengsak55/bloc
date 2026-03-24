"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

type SellerProfile = {
  id: string;
  display_name: string | null;
  category: string | null;
  location_text: string | null;
  bio: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  link_url: string | null;
  is_online: boolean;
  lat: number | null;
  lng: number | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getHue(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
  return h;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function fmtDist(km: number) {
  return km < 1 ? `${Math.round(km * 1000)}m away` : `${km.toFixed(1)}km away`;
}

// ─── Distance badge (client-only, geolocation) ────────────────────────────────

function DistanceBadge({ lat, lng }: { lat: number; lng: number }) {
  const [dist, setDist] = useState<string | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setDist(fmtDist(haversineKm(pos.coords.latitude, pos.coords.longitude, lat, lng))),
      () => {},
    );
  }, [lat, lng]);

  if (!dist) return null;

  return (
    <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
      {dist}
    </span>
  );
}

// ─── Message button ───────────────────────────────────────────────────────────

function MessageButton({ seller, variant = "secondary" }: { seller: SellerProfile; variant?: "primary" | "secondary" }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleMessage() {
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push(`/auth?redirect=/seller/${seller.id}`);
      return;
    }

    const firstName = (seller.display_name ?? "").split(/\s+/)[0].trim() || "there";
    const cat = seller.category ? ` with ${seller.category}` : "";
    const draft = encodeURIComponent(`Hi ${firstName}, I need help${cat}`);
    router.push(`/message/${seller.id}?draft=${draft}`);
  }

  const isPrimary = variant === "primary";

  return (
    <button
      onClick={handleMessage}
      disabled={busy}
      className={`w-full rounded-full py-3 text-sm font-semibold transition active:scale-[0.97] disabled:opacity-50 ${
        isPrimary
          ? "text-white shadow-lg"
          : "border border-white/20 bg-white/[0.06] text-white backdrop-blur-sm hover:bg-white/[0.1]"
      }`}
      style={isPrimary ? { background: "#7c5ce8", fontFamily: "var(--font-dm-sans), sans-serif" } : { fontFamily: "var(--font-dm-sans), sans-serif" }}
    >
      {busy ? (
        <span className="flex items-center justify-center gap-2">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        </span>
      ) : (
        isPrimary ? `Ask ${seller.display_name || "agent"}` : "Message"
      )}
    </button>
  );
}

type SellerPost = {
  id: string;
  media_url: string;
  media_type: string;
  caption: string | null;
  created_at: string;
};

// ─── Lazy image with retry on error ──────────────────────────────────────────

function RetryImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [retries, setRetries] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const maxRetries = 3;

  const handleError = useCallback(() => {
    if (retries < maxRetries) {
      setTimeout(() => setRetries((r) => r + 1), 1000 * (retries + 1));
    }
  }, [retries]);

  const imgSrc = retries > 0 ? `${src}${src.includes("?") ? "&" : "?"}retry=${retries}` : src;

  return (
    <>
      {!loaded && (
        <div className="absolute inset-0 animate-pulse bg-zinc-800" />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imgSrc}
        alt={alt}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={handleError}
        className={className}
      />
    </>
  );
}

// ─── Fullscreen viewer (TikTok scroll-snap) ─────────────────────────────────

function FullscreenViewer({
  posts,
  initialIndex,
  onClose,
  sparkCounts,
  userSparks,
  toggleSpark,
  onSparkFlash,
  sparkFlashId,
}: {
  posts: SellerPost[];
  initialIndex: number;
  onClose: () => void;
  sparkCounts: Record<string, number>;
  userSparks: Set<string>;
  toggleSpark: (postId: string) => void;
  onSparkFlash: (postId: string) => void;
  sparkFlashId: string | null;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [playIcon, setPlayIcon] = useState<"play" | "pause" | null>(null);
  const iconTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [expandedCaption, setExpandedCaption] = useState<string | null>(null);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Scroll to initial post on mount
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: initialIndex * window.innerHeight, behavior: "instant" });
  }, [initialIndex]);

  // Track current index via IntersectionObserver
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const idx = Number(entry.target.getAttribute("data-index"));
            if (!isNaN(idx)) setCurrentIndex(idx);

            // Auto-play visible video, pause others
            const videos = el.querySelectorAll("video");
            videos.forEach((v) => {
              if (entry.target.contains(v)) {
                v.play().catch(() => {});
              } else {
                v.pause();
              }
            });
          }
        }
      },
      { root: el, threshold: 0.6 },
    );

    const slides = el.querySelectorAll("[data-index]");
    slides.forEach((s) => observer.observe(s));

    return () => observer.disconnect();
  }, [posts]);

  // Tap to toggle play/pause with icon flash
  const handleVideoTap = useCallback((e: React.MouseEvent<HTMLVideoElement>) => {
    const v = e.currentTarget;
    if (v.paused) {
      v.play().catch(() => {});
      setPlayIcon("play");
    } else {
      v.pause();
      setPlayIcon("pause");
    }
    if (iconTimer.current) clearTimeout(iconTimer.current);
    iconTimer.current = setTimeout(() => setPlayIcon(null), 600);
  }, []);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ zIndex: 9999, backgroundColor: "#000" }}
      onClick={onClose}
    >
      {/* Content area — TikTok-sized on desktop */}
      <div
        className="relative h-full w-full max-w-[420px]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button — inside content, safe-area aware */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="absolute right-4 z-40 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition hover:bg-black/60"
          style={{ top: "max(env(safe-area-inset-top, 12px), 12px)" }}
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        {/* Scroll container */}
        <div
          ref={scrollRef}
          className="h-full w-full overflow-y-scroll"
          style={{
            scrollSnapType: "y mandatory",
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          {posts.map((p, i) => {
            const text = p.caption ? p.caption.replace(/<[^>]*>/g, "") : "";
            const hasCaption = text.length > 0 && !/^\s*</.test(p.caption ?? "");
            const isExpanded = expandedCaption === p.id;
            const sparkCount = sparkCounts[p.id] ?? 0;

            return (
              <div
                key={p.id}
                data-index={i}
                className="flex h-screen w-full flex-shrink-0 flex-col bg-black"
                style={{ scrollSnapAlign: "start", scrollSnapStop: "always" }}
              >
                {/* Fixed image — 280px, never moves */}
                <div className="relative w-full flex-shrink-0" style={{ height: 280 }}>
                  {p.media_type === "video" ? (
                    <video
                      src={p.media_url}
                      autoPlay={i === initialIndex}
                      muted={i !== initialIndex}
                      playsInline
                      loop
                      onClick={handleVideoTap}
                      className="h-full w-full cursor-pointer object-cover"
                    />
                  ) : (
                    <RetryImage
                      src={p.media_url}
                      alt={p.caption ?? "Post"}
                      className="h-full w-full object-cover"
                    />
                  )}
                  {sparkFlashId === p.id && <SparkFlash />}
                </div>

                {/* Below image: spark count + caption */}
                <div className="flex-1 overflow-y-auto px-4 pt-3" onClick={(e) => e.stopPropagation()}>
                  {/* Spark count */}
                  <div className="mb-2 flex items-center gap-1.5">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="#7c5ce8">
                      <path d="M13 2L4.09 12.63a1 1 0 00.78 1.62H11l-1 7.75L19.91 11.37a1 1 0 00-.78-1.62H13l1-7.75z" />
                    </svg>
                    <span className="text-sm font-semibold" style={{ color: "#7c5ce8" }}>
                      {sparkCount}
                    </span>
                  </div>

                  {/* Caption with expand/collapse */}
                  {hasCaption && (
                    <div>
                      <p
                        className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-200"
                        style={!isExpanded ? {
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical" as const,
                          overflow: "hidden",
                        } : undefined}
                      >
                        {text}
                      </p>
                      {text.length > 80 && (
                        <button
                          type="button"
                          onClick={() => setExpandedCaption(isExpanded ? null : p.id)}
                          className="mt-1 text-xs font-semibold transition"
                          style={{ color: "#7c5ce8" }}
                        >
                          {isExpanded ? "show less" : "more"}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Play/Pause icon flash */}
        {playIcon && (
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm"
              style={{ animation: "pulse 0.3s ease-out" }}
            >
              {playIcon === "play" ? (
                <svg className="ml-1 h-8 w-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              ) : (
                <svg className="h-8 w-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
                </svg>
              )}
            </div>
          </div>
        )}

        {/* Dot indicators */}
        {posts.length > 1 && (
          <div className="absolute bottom-6 left-0 right-0 z-20 flex items-center justify-center gap-1.5">
            {posts.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === currentIndex ? "w-4 bg-white" : "w-1.5 bg-white/30"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tabs: Posts & Services ───────────────────────────────────────────────────

const PLACEHOLDER_SERVICES = [
  { name: "Classic Haircut", description: "Precision cut with hot towel finish", price: "$35" },
  { name: "Beard Trim & Shape", description: "Line-up, trim, and oil treatment", price: "$20" },
  { name: "Full Service Package", description: "Cut, beard, shave, and styling", price: "$55" },
] as const;

function StorefrontTabs({ seller, isOwner, supabase }: { seller: SellerProfile; isOwner: boolean; supabase: ReturnType<typeof createSupabaseBrowserClient> }) {
  const [tab, setTab] = useState<"posts" | "services">("posts");
  const [posts, setPosts] = useState<SellerPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [viewingIndex, setViewingIndex] = useState<number | null>(null);

  // Add post state
  const addPostRef = useRef<HTMLInputElement>(null);
  const [postDraft, setPostDraft] = useState<{ file: File; preview: string } | null>(null);
  const [postCaption, setPostCaption] = useState("");
  const [postUploading, setPostUploading] = useState(false);

  // Edit caption state
  const [editingCaptionId, setEditingCaptionId] = useState<string | null>(null);
  const [editCaptionText, setEditCaptionText] = useState("");

  const postIds = useMemo(() => posts.map((p) => p.id), [posts]);
  const { sparkCounts, userSparks, toggleSpark } = usePostSparks(postIds, supabase);
  const [sparkFlashId, setSparkFlashId] = useState<string | null>(null);
  const sparkFlashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showSparkFlash = useCallback((postId: string) => {
    setSparkFlashId(postId);
    if (sparkFlashTimer.current) clearTimeout(sparkFlashTimer.current);
    sparkFlashTimer.current = setTimeout(() => setSparkFlashId(null), 800);
  }, []);

  useEffect(() => {
    let canceled = false;
    async function load() {
      setPostsLoading(true);
      const { data } = await supabase
        .from("seller_posts")
        .select("id,media_url,media_type,caption,created_at")
        .eq("seller_id", seller.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (!canceled) {
        setPosts((data ?? []) as SellerPost[]);
        setPostsLoading(false);
      }
    }
    load();
    return () => { canceled = true; };
  }, [supabase, seller.id]);

  async function deletePost(postId: string) {
    const { error } = await supabase.from("seller_posts").delete().eq("id", postId);
    if (!error) setPosts((prev) => prev.filter((p) => p.id !== postId));
  }

  // ── Add post ──
  function handleAddFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const validTypes = ["image/jpeg", "image/png", "video/mp4"];
    if (!validTypes.includes(file.type) || file.size > 50 * 1024 * 1024) return;
    if (postDraft?.preview) URL.revokeObjectURL(postDraft.preview);
    setPostDraft({ file, preview: URL.createObjectURL(file) });
    setPostCaption("");
  }

  function cancelDraft() {
    if (postDraft?.preview) URL.revokeObjectURL(postDraft.preview);
    setPostDraft(null);
    setPostCaption("");
    if (addPostRef.current) addPostRef.current.value = "";
  }

  async function publishPost() {
    if (!postDraft || postUploading) return;
    setPostUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const file = postDraft.file;
      const ext = file.name.split(".").pop() ?? (file.type.startsWith("image/") ? "jpg" : "mp4");
      const path = `${user.id}/posts/${Date.now()}.${ext}`;
      const { data: uploaded, error: uploadErr } = await supabase.storage
        .from("storefront-media").upload(path, file, { cacheControl: "3600", upsert: false });
      if (uploadErr) throw uploadErr;
      const { data: urlData } = supabase.storage.from("storefront-media").getPublicUrl(uploaded.path);
      const mediaType = file.type.startsWith("video/") ? "video" : "image";
      const { data: inserted, error: insertErr } = await supabase.from("seller_posts").insert({
        seller_id: user.id, media_url: urlData.publicUrl, media_type: mediaType, caption: postCaption.trim() || null,
      }).select("id,media_url,media_type,caption,created_at").single();
      if (insertErr) throw insertErr;
      if (inserted) setPosts((prev) => [inserted as SellerPost, ...prev]);
      cancelDraft();
    } catch { /* silent */ } finally { setPostUploading(false); }
  }

  // ── Edit caption ──
  async function saveCaption(postId: string) {
    const newCaption = editCaptionText.trim() || null;
    await supabase.from("seller_posts").update({ caption: newCaption }).eq("id", postId);
    setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, caption: newCaption } : p));
    setEditingCaptionId(null);
  }

  return (
    <div className="px-3.5 pb-16 pt-4">
      {/* Tab bar */}
      <div className="flex gap-1 rounded-full bg-white/[0.04] p-1">
        {(["posts", "services"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 rounded-full py-2 text-sm font-semibold transition-all ${
              tab === t
                ? "bg-white text-black shadow-sm"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {t === "posts" ? "Posts" : "Services"}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="mt-4">
        {tab === "posts" ? (
          <>
            {/* Owner: Add post draft preview */}
            {isOwner && postDraft && (
              <div className="mb-4 overflow-hidden rounded-2xl" style={{ backgroundColor: "#111", border: "1px solid #1e1e1e" }}>
                <div className="relative aspect-video">
                  {postDraft.file.type.startsWith("video/") ? (
                    <video src={postDraft.preview} className="h-full w-full object-cover" autoPlay muted loop playsInline />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={postDraft.preview} alt="Draft" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="p-3">
                  <textarea
                    value={postCaption}
                    onChange={(e) => setPostCaption(e.target.value)}
                    placeholder="Add a caption..."
                    rows={2}
                    className="w-full resize-none rounded-xl bg-white/[0.06] px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-600 focus:ring-1 focus:ring-[#7c5ce8]"
                  />
                  <div className="mt-2 flex gap-2">
                    <button type="button" onClick={cancelDraft} className="flex-1 rounded-full border border-white/10 py-2 text-xs font-semibold text-zinc-400">Cancel</button>
                    <button type="button" onClick={publishPost} disabled={postUploading} className="flex-1 rounded-full py-2 text-xs font-semibold text-white disabled:opacity-50" style={{ background: "linear-gradient(135deg, #7c5ce8, #4d9ef5)" }}>
                      {postUploading ? "Uploading..." : "Post"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Posts grid */}
            {postsLoading ? (
              <div className="grid grid-cols-2 gap-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="aspect-square animate-pulse rounded-2xl" style={{ backgroundColor: "#111" }} />
                ))}
              </div>
            ) : posts.length === 0 && !isOwner ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <svg className="mb-3 h-8 w-8 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                </svg>
                <p className="text-sm text-zinc-500">No posts yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {/* Owner: Add post card */}
                {isOwner && (
                  <div>
                    <button
                      type="button"
                      onClick={() => addPostRef.current?.click()}
                      className="flex aspect-square w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/10 transition hover:border-[#7c5ce8]/50 hover:bg-white/[0.02]"
                    >
                      <svg className="mb-1 h-8 w-8 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                      <span className="text-xs text-zinc-500">Add post</span>
                    </button>
                    <input ref={addPostRef} type="file" accept="image/jpeg,image/png,video/mp4" className="hidden" onChange={handleAddFile} />
                  </div>
                )}
                {posts.map((p, i) => {
                  const isLastOdd = isOwner
                    ? posts.length % 2 === 0 && i === posts.length - 1
                    : posts.length % 2 === 1 && i === posts.length - 1;
                  return (
                  <div key={p.id} className={isLastOdd ? "col-span-2" : ""}>
                    <div
                      className={`relative cursor-pointer overflow-hidden rounded-2xl ${isLastOdd ? "aspect-video" : "aspect-square"}`}
                      style={{ backgroundColor: "#111" }}
                      onClick={() => setViewingIndex(i)}
                    >
                      {p.media_type === "video" ? (
                        <video src={p.media_url} autoPlay muted loop playsInline className="h-full w-full object-cover" />
                      ) : (
                        <RetryImage src={p.media_url} alt={p.caption ?? "Post"} className="h-full w-full object-cover" />
                      )}
                      {sparkFlashId === p.id && <SparkFlash />}
                      {isOwner && (
                        <div className="absolute right-1.5 top-1.5 z-10 flex gap-1">
                          {/* Edit caption */}
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setEditingCaptionId(p.id); setEditCaptionText(p.caption ?? ""); }}
                            className="flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white/70 backdrop-blur-sm transition hover:bg-black/80 hover:text-white"
                          >
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          {/* Delete */}
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); deletePost(p.id); }}
                            className="flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white/70 backdrop-blur-sm transition hover:bg-black/80 hover:text-white"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                    {/* Spark under card — buyer only, hide if 0 */}
                    {!isOwner && (sparkCounts[p.id] ?? 0) > 0 && (
                      <div className="mt-1 px-1">
                        <PostSparkButton
                          postId={p.id}
                          count={sparkCounts[p.id] ?? 0}
                          sparked={userSparks.has(p.id)}
                          onToggle={toggleSpark}
                          onFlash={showSparkFlash}
                        />
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
            )}

            {/* Edit caption modal */}
            {editingCaptionId && (
              <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" onClick={() => setEditingCaptionId(null)}>
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                <div className="relative w-full max-w-[420px] rounded-t-3xl bg-[#111] px-5 pb-8 pt-6 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
                  <div className="mb-4 flex justify-center sm:hidden"><div className="h-1 w-10 rounded-full bg-zinc-600" /></div>
                  <h2 className="mb-3 text-lg font-bold text-white">Edit caption</h2>
                  <textarea
                    value={editCaptionText}
                    onChange={(e) => setEditCaptionText(e.target.value)}
                    rows={4}
                    className="w-full resize-none rounded-xl bg-white/[0.06] px-4 py-2.5 text-sm text-white outline-none focus:ring-1 focus:ring-[#7c5ce8]"
                    placeholder="Add a caption..."
                  />
                  <div className="mt-4 flex gap-3">
                    <button type="button" onClick={() => setEditingCaptionId(null)} className="flex-1 rounded-full border border-white/10 py-2.5 text-sm font-semibold text-zinc-400">Cancel</button>
                    <button type="button" onClick={() => saveCaption(editingCaptionId)} className="flex-1 rounded-full py-2.5 text-sm font-semibold text-white" style={{ background: "linear-gradient(135deg, #7c5ce8, #4d9ef5)" }}>Save</button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          /* ── Services list ── */
          <div className="flex flex-col gap-2">
            {PLACEHOLDER_SERVICES.map((s) => (
              <div
                key={s.name}
                className="flex items-center gap-3 rounded-2xl px-4 py-3.5"
                style={{ backgroundColor: "#111", border: "1px solid #1e1e1e" }}
              >
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-bold text-white">{s.name}</span>
                  <p className="mt-0.5 text-xs text-zinc-500">{s.description}</p>
                </div>
                <span className="flex-shrink-0 text-sm font-semibold text-[#7c5ce8]">
                  {s.price}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Fullscreen post viewer ── */}
      {viewingIndex !== null && posts[viewingIndex] && (
        <FullscreenViewer
          posts={posts}
          initialIndex={viewingIndex}
          onClose={() => setViewingIndex(null)}
          sparkCounts={sparkCounts}
          userSparks={userSparks}
          toggleSpark={toggleSpark}
          onSparkFlash={showSparkFlash}
          sparkFlashId={sparkFlashId}
        />
      )}
    </div>
  );
}

// ─── Post Spark button ───────────────────────────────────────────────────────

function usePostSparks(postIds: string[], supabase: ReturnType<typeof createSupabaseBrowserClient>) {
  const [sparkCounts, setSparkCounts] = useState<Record<string, number>>({});
  const [userSparks, setUserSparks] = useState<Set<string>>(new Set());
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let canceled = false;
    async function load() {
      if (postIds.length === 0) return;

      // Get counts for all posts
      const { data: counts } = await supabase
        .from("sparks")
        .select("post_id")
        .in("post_id", postIds);
      if (!canceled && counts) {
        const map: Record<string, number> = {};
        for (const row of counts) {
          map[row.post_id] = (map[row.post_id] ?? 0) + 1;
        }
        setSparkCounts(map);
      }

      // Check user sparks
      const { data: { user } } = await supabase.auth.getUser();
      if (!canceled && user) {
        setUserId(user.id);
        const { data: userRows } = await supabase
          .from("sparks")
          .select("post_id")
          .eq("user_id", user.id)
          .in("post_id", postIds);
        if (!canceled && userRows) {
          setUserSparks(new Set(userRows.map((r) => r.post_id)));
        }
      }
    }
    load();
    return () => { canceled = true; };
  }, [supabase, postIds.join(",")]);

  const toggleSpark = useCallback(async (postId: string) => {
    if (!userId) return;
    const wasSparked = userSparks.has(postId);

    if (wasSparked) {
      await supabase.from("sparks").delete().eq("post_id", postId).eq("user_id", userId);
      setUserSparks((prev) => { const next = new Set(prev); next.delete(postId); return next; });
      setSparkCounts((prev) => ({ ...prev, [postId]: Math.max(0, (prev[postId] ?? 1) - 1) }));
    } else {
      await supabase.from("sparks").insert({ post_id: postId, user_id: userId });
      setUserSparks((prev) => new Set(prev).add(postId));
      setSparkCounts((prev) => ({ ...prev, [postId]: (prev[postId] ?? 0) + 1 }));
    }
  }, [supabase, userId, userSparks]);

  return { sparkCounts, userSparks, userId, toggleSpark };
}

function SparkFlash() {
  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
      <div className="flex items-center gap-2 rounded-full bg-[#7c5ce8]/90 px-5 py-2.5 shadow-lg backdrop-blur-sm"
        style={{ animation: "pulse 0.3s ease-out" }}
      >
        <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="currentColor">
          <path d="M13 2L4.09 12.63a1 1 0 00.78 1.62H11l-1 7.75L19.91 11.37a1 1 0 00-.78-1.62H13l1-7.75z" />
        </svg>
        <span className="text-sm font-bold text-white">Sparked!</span>
      </div>
    </div>
  );
}

function PostSparkButton({
  postId,
  count,
  sparked,
  onToggle,
  onFlash,
  variant = "small",
}: {
  postId: string;
  count: number;
  sparked: boolean;
  onToggle: (postId: string) => void;
  onFlash: (postId: string) => void;
  variant?: "small" | "large";
}) {
  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (!sparked) onFlash(postId);
    onToggle(postId);
  }

  if (variant === "large") {
    return (
      <button
        type="button"
        onClick={handleClick}
        className="flex flex-col items-center gap-1"
      >
        <div className={`flex h-11 w-11 items-center justify-center rounded-full transition active:scale-[0.9] ${sparked ? "bg-[#7c5ce8]" : "bg-white/10"}`}>
          <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M13 2L4.09 12.63a1 1 0 00.78 1.62H11l-1 7.75L19.91 11.37a1 1 0 00-.78-1.62H13l1-7.75z" />
          </svg>
        </div>
        <span className="text-[11px] font-semibold text-white">{count || ""}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex items-center gap-1 text-xs transition active:scale-[0.9]"
    >
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="#7c5ce8">
        <path d="M13 2L4.09 12.63a1 1 0 00.78 1.62H11l-1 7.75L19.91 11.37a1 1 0 00-.78-1.62H13l1-7.75z" />
      </svg>
      {count > 0 && <span className="font-semibold" style={{ color: "#7c5ce8" }}>{count}</span>}
    </button>
  );
}

// ─── Storefront ───────────────────────────────────────────────────────────────

// ─── CTA by category ─────────────────────────────────────────────────────────

// ─── Save seller hook ───────────────────────────────────────────────────────

function useSavedSeller(sellerId: string, supabase: ReturnType<typeof createSupabaseBrowserClient>) {
  const [saved, setSaved] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let canceled = false;
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || canceled) return;
      setUserId(user.id);
      const { data } = await supabase
        .from("saved_sellers")
        .select("id")
        .eq("buyer_id", user.id)
        .eq("seller_id", sellerId)
        .maybeSingle();
      if (!canceled && data) setSaved(true);
    }
    load();
    return () => { canceled = true; };
  }, [supabase, sellerId]);

  const toggle = useCallback(async () => {
    if (!userId) {
      router.push(`/auth?redirect=/seller/${sellerId}`);
      return;
    }
    if (busy) return;
    setBusy(true);
    if (saved) {
      await supabase.from("saved_sellers").delete().eq("buyer_id", userId).eq("seller_id", sellerId);
      setSaved(false);
    } else {
      await supabase.from("saved_sellers").insert({ buyer_id: userId, seller_id: sellerId });
      setSaved(true);
    }
    setBusy(false);
  }, [supabase, userId, sellerId, saved, busy, router]);

  return { saved, toggle, busy };
}

// ─── Smile count hook ───────────────────────────────────────────────────────

function useSmileCount(sellerId: string, supabase: ReturnType<typeof createSupabaseBrowserClient>) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let canceled = false;
    async function load() {
      const { count: total } = await supabase
        .from("smiles")
        .select("id", { count: "exact", head: true })
        .eq("seller_id", sellerId);
      if (!canceled) setCount(total ?? 0);
    }
    load();
    return () => { canceled = true; };
  }, [supabase, sellerId]);

  return count;
}

// ─── Owner hooks ──────────────────────────────────────────────────────────────

function useOwnerCheck(sellerId: string) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setIsOwner(user.id === sellerId);
    });
  }, [supabase, sellerId]);

  return { isOwner, supabase };
}

// ─── Edit Info Modal ─────────────────────────────────────────────────────────

function EditInfoModal({
  seller,
  onClose,
  onSaved,
  supabase,
}: {
  seller: SellerProfile;
  onClose: () => void;
  onSaved: (updated: Partial<SellerProfile>) => void;
  supabase: ReturnType<typeof createSupabaseBrowserClient>;
}) {
  const [name, setName] = useState(seller.display_name ?? "");
  const [category, setCategory] = useState(seller.category ?? "");
  const [location, setLocation] = useState(seller.location_text ?? "");
  const [bio, setBio] = useState(seller.bio ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const update = {
      display_name: name.trim() || null,
      category: category.trim() || null,
      location_text: location.trim() || null,
      bio: bio.trim() || null,
    };
    await supabase.from("profiles").update(update).eq("id", seller.id);
    onSaved(update);
    setSaving(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-[420px] rounded-t-3xl bg-[#111] px-5 pb-8 pt-6 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex justify-center sm:hidden">
          <div className="h-1 w-10 rounded-full bg-zinc-600" />
        </div>
        <h2 className="mb-4 text-lg font-bold text-white">Edit store info</h2>
        <div className="flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl bg-white/[0.06] px-4 py-2.5 text-sm text-white outline-none focus:ring-1 focus:ring-[#7c5ce8]" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Category</label>
            <input value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-xl bg-white/[0.06] px-4 py-2.5 text-sm text-white outline-none focus:ring-1 focus:ring-[#7c5ce8]" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Location</label>
            <input value={location} onChange={(e) => setLocation(e.target.value)} className="w-full rounded-xl bg-white/[0.06] px-4 py-2.5 text-sm text-white outline-none focus:ring-1 focus:ring-[#7c5ce8]" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Bio</label>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} className="w-full resize-none rounded-xl bg-white/[0.06] px-4 py-2.5 text-sm text-white outline-none focus:ring-1 focus:ring-[#7c5ce8]" />
          </div>
        </div>
        <div className="mt-5 flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 rounded-full border border-white/10 py-2.5 text-sm font-semibold text-zinc-400">Cancel</button>
          <button type="button" onClick={save} disabled={saving} className="flex-1 rounded-full py-2.5 text-sm font-semibold text-white" style={{ background: "linear-gradient(135deg, #7c5ce8, #4d9ef5)" }}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Storefront ───────────────────────────────────────────────────────────────

export function SellerStorefront({ seller: initialSeller }: { seller: SellerProfile }) {
  const [seller, setSeller] = useState(initialSeller);
  const hue = getHue(seller.id);
  const { isOwner, supabase } = useOwnerCheck(seller.id);
  const { saved, toggle: toggleSave, busy: saveBusy } = useSavedSeller(seller.id, supabase);
  const smileCount = useSmileCount(seller.id, supabase);
  const [isOnline, setIsOnline] = useState(seller.is_online);
  const [showEditInfo, setShowEditInfo] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [coverSrc, setCoverSrc] = useState(seller.cover_url || seller.avatar_url);
  const [coverDraft, setCoverDraft] = useState<{ file: File; preview: string } | null>(null);
  const [coverSaving, setCoverSaving] = useState(false);

  // ── Cover: pick file → show preview (don't save yet) ──
  function handleCoverPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const validTypes = ["image/jpeg", "image/png", "video/mp4"];
    if (!validTypes.includes(file.type) || file.size > 50 * 1024 * 1024) return;
    if (coverDraft?.preview) URL.revokeObjectURL(coverDraft.preview);
    setCoverDraft({ file, preview: URL.createObjectURL(file) });
  }

  function cancelCoverDraft() {
    if (coverDraft?.preview) URL.revokeObjectURL(coverDraft.preview);
    setCoverDraft(null);
    if (coverInputRef.current) coverInputRef.current.value = "";
  }

  // ── Cover: save to storage + DB ──
  async function saveCover() {
    if (!coverDraft || coverSaving) return;
    setCoverSaving(true);
    const file = coverDraft.file;
    const ext = file.type === "video/mp4" ? "mp4" : file.type === "image/png" ? "png" : "jpg";
    const path = `${seller.id}/cover.${ext}`;
    const { data: uploaded, error } = await supabase.storage
      .from("storefront-media")
      .upload(path, file, { cacheControl: "0", upsert: true });
    if (error) { setCoverSaving(false); return; }

    const { data: urlData } = supabase.storage.from("storefront-media").getPublicUrl(uploaded.path);
    const newUrl = `${urlData.publicUrl}?t=${Date.now()}`;
    await supabase.from("profiles").update({ cover_url: newUrl }).eq("id", seller.id);
    setCoverSrc(newUrl);
    URL.revokeObjectURL(coverDraft.preview);
    setCoverDraft(null);
    setCoverSaving(false);
    if (coverInputRef.current) coverInputRef.current.value = "";
  }

  // ── Online toggle ──
  async function toggleOnline() {
    const next = !isOnline;
    setIsOnline(next);
    await supabase.from("profiles").update({ is_online: next }).eq("id", seller.id);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col bg-[#0d0d12]">
      {/* ── Hero cover ── */}
      <div
        className="relative flex min-h-[56vh] flex-col justify-end"
        style={{
          background: coverSrc
            ? undefined
            : `linear-gradient(135deg, hsl(${hue},55%,35%), hsl(${(hue + 60) % 360},55%,25%))`,
        }}
      >
        {/* Cover / Avatar background (image or video, or draft preview) */}
        {(coverDraft?.preview || coverSrc) && (() => {
          const src = coverDraft?.preview || coverSrc!;
          const isVideo = coverDraft
            ? coverDraft.file.type.startsWith("video/")
            : /\.mp4/i.test(src);
          return isVideo ? (
            <video src={src} autoPlay muted loop playsInline className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" />
          );
        })()}

        {/* Dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d12] via-[#0d0d12]/60 to-transparent" />

        {/* Cover draft: Save / Cancel bar */}
        {coverDraft && (
          <div className="absolute inset-x-0 bottom-0 z-20 flex items-center justify-center gap-3 bg-black/60 px-5 py-3 backdrop-blur-sm">
            <button type="button" onClick={cancelCoverDraft} className="rounded-full border border-white/20 px-5 py-2 text-sm font-semibold text-white transition hover:bg-white/10">
              Cancel
            </button>
            <button type="button" onClick={saveCover} disabled={coverSaving} className="rounded-full px-5 py-2 text-sm font-semibold text-white disabled:opacity-50" style={{ background: "linear-gradient(135deg, #7c5ce8, #4d9ef5)" }}>
              {coverSaving ? "Saving..." : "Save cover"}
            </button>
          </div>
        )}

        {/* Top bar — Back + Edit cover (owner) */}
        <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-5 pt-12">
          <Link
            href="/nearby"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm transition hover:bg-black/60"
          >
            <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="flex gap-2">
            {isOwner && (
              <>
                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  className="flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-2 text-xs font-medium text-white backdrop-blur-sm transition hover:bg-black/60"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Edit cover
                </button>
                <input ref={coverInputRef} type="file" accept="image/jpeg,image/png,video/mp4" className="hidden" onChange={handleCoverPick} />
              </>
            )}
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm transition hover:bg-black/60"
            >
              <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="5" cy="12" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="19" cy="12" r="2" />
              </svg>
            </button>
          </div>
        </div>

        {/* Hero content */}
        <div className="relative z-10 px-5 pb-6">
          {/* Open now pill — toggleable for owner */}
          {isOnline ? (
            <button
              type="button"
              onClick={isOwner ? toggleOnline : undefined}
              className={`mb-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-emerald-400 backdrop-blur-sm ${isOwner ? "cursor-pointer" : ""}`}
              style={{ border: "1px solid rgba(52,211,153,0.25)" }}
              disabled={!isOwner}
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              Open now
            </button>
          ) : (
            <button
              type="button"
              onClick={isOwner ? toggleOnline : undefined}
              className={`mb-3 inline-flex items-center gap-1.5 rounded-full bg-zinc-700/30 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 backdrop-blur-sm ${isOwner ? "cursor-pointer" : ""}`}
              style={{ border: "1px solid rgba(113,113,122,0.25)" }}
              disabled={!isOwner}
            >
              <span className="inline-flex h-2 w-2 rounded-full bg-zinc-600" />
              Offline
            </button>
          )}

          {/* Business name + edit button */}
          <div className="flex items-start gap-2">
            <h1
              className="flex-1 text-[32px] font-bold leading-tight text-white"
              style={{ fontFamily: "var(--font-instrument-serif), Georgia, serif" }}
            >
              {seller.display_name ?? "Seller"}
            </h1>
            {isOwner && (
              <button
                type="button"
                onClick={() => setShowEditInfo(true)}
                className="mt-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/70 transition hover:bg-white/20 hover:text-white"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            )}
          </div>

          {/* Category + Location */}
          <p className="mt-1 text-sm text-zinc-400" style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}>
            {[seller.category, seller.location_text].filter(Boolean).join(" · ")}
            {seller.lat != null && seller.lng != null && (
              <span className="ml-1">
                <DistanceBadge lat={seller.lat} lng={seller.lng} />
              </span>
            )}
          </p>

        </div>
      </div>

      {/* ── Action buttons — hidden for owner ── */}
      {!isOwner && (
        <div className="flex flex-col gap-2.5 px-5 pt-4">
          <MessageButton seller={seller} variant="primary" />
          <button
            type="button"
            onClick={toggleSave}
            disabled={saveBusy}
            className="flex w-full items-center justify-center gap-2 rounded-full border py-3 text-sm font-semibold transition active:scale-[0.97] disabled:opacity-50"
            style={{
              borderColor: saved ? "#7c5ce8" : "rgba(255,255,255,0.15)",
              color: saved ? "#7c5ce8" : "rgba(255,255,255,0.7)",
              background: saved ? "rgba(124,92,232,0.1)" : "transparent",
            }}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            {saved ? "Saved" : "Save"}
          </button>
        </div>
      )}

      {/* ── Agent bar ── */}
      <div className="px-3 pt-3">
        <div
          className="flex items-center gap-3 rounded-2xl px-4 py-3.5"
          style={{
            backgroundColor: "#0f0f1a",
            border: "1px solid rgba(124,92,232,0.25)",
          }}
        >
          <svg className="h-5 w-5 flex-shrink-0" viewBox="0 0 24 24" fill="none">
            <defs>
              <linearGradient id="bolt-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#7c5ce8" />
                <stop offset="100%" stopColor="#00d4c8" />
              </linearGradient>
            </defs>
            <path
              d="M13 2L4.09 12.63a1 1 0 00.78 1.62H11l-1 7.75L19.91 11.37a1 1 0 00-.78-1.62H13l1-7.75z"
              fill="url(#bolt-grad)"
            />
          </svg>
          <div className="min-w-0 flex-1">
            <span className="text-sm font-bold text-white">Agent active</span>
            <p className="text-xs text-zinc-500">Replies in ~2 min · 24/7</p>
          </div>
        </div>
      </div>

      {/* ── Trust metrics ── */}
      <div className="flex gap-1.5 px-3.5 pt-2.5">
        {([
          { value: "94%", label: "Response rate" },
          { value: "~2 min", label: "Avg reply" },
          ...((smileCount ?? 0) >= 5 ? [{ value: `${smileCount}%`, label: "Smiles" }] : []),
          { value: "2 yr", label: "On Bloc" },
        ] as { value: string; label: string }[]).map((m) => (
          <div
            key={m.label}
            className="flex flex-1 flex-col items-center rounded-2xl py-2.5"
            style={{ backgroundColor: "#111", border: "1px solid #1e1e1e" }}
          >
            <span className="text-[16px] font-bold text-white">{m.value}</span>
            <span className="mt-0.5 text-[9px] font-medium uppercase tracking-wider text-zinc-500">
              {m.label}
            </span>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <StorefrontTabs seller={seller} isOwner={isOwner} supabase={supabase} />

      {/* ── Edit info modal ── */}
      {showEditInfo && (
        <EditInfoModal
          seller={seller}
          onClose={() => setShowEditInfo(false)}
          onSaved={(updated) => setSeller((prev) => ({ ...prev, ...updated }))}
          supabase={supabase}
        />
      )}
    </main>
  );
}
