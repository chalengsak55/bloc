"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type RequestRow = {
  id: string;
  sentence: string;
  created_at: string;
  status: string;
};

type Profile = {
  id: string;
  is_online: boolean;
  display_name: string | null;
  category: string | null;
  location_text: string | null;
};

export function SellerDashboard() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();
  const [me, setMe] = useState<Profile | null>(null);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [replyMedia, setReplyMedia] = useState("");
  const [replyFile, setReplyFile] = useState<File | null>(null);
  const [replyPreview, setReplyPreview] = useState<string | null>(null);

  // Restore reply UI state on mount so refresh/back doesn't lose drafts.
  useEffect(() => {
    try {
      const storedTo = window.localStorage.getItem("bloc_seller_replying_to");
      const storedBody = window.localStorage.getItem("bloc_seller_reply_body");
      const storedMedia = window.localStorage.getItem("bloc_seller_reply_media");
      if (storedTo) setReplyingTo(storedTo);
      if (storedBody) setReplyBody(storedBody);
      if (storedMedia) setReplyMedia(storedMedia);
    } catch {
      // ignore
    }
  }, []);

  // Persist reply UI state as it changes.
  useEffect(() => {
    try {
      if (replyingTo) {
        window.localStorage.setItem("bloc_seller_replying_to", replyingTo);
      } else {
        window.localStorage.removeItem("bloc_seller_replying_to");
      }
      window.localStorage.setItem("bloc_seller_reply_body", replyBody);
      window.localStorage.setItem("bloc_seller_reply_media", replyMedia);
    } catch {
      // ignore
    }
  }, [replyingTo, replyBody, replyMedia]);

  useEffect(() => {
    let canceled = false;
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (!canceled) {
          setStatus("Sign in with your email to see your seller dashboard.");
        }
        return;
      }

      const { data: p } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (!canceled) {
        setMe((p ?? null) as Profile | null);
      }

      const { data: r } = await supabase
        .from("requests")
        .select("id,sentence,created_at,status")
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(50);
      if (!canceled) {
        setRequests((r ?? []) as RequestRow[]);
        setStatus(null);
      }
    }
    load();
    return () => {
      canceled = true;
    };
  }, [supabase]);

  useEffect(() => {
    const channel = supabase
      .channel("seller-requests")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "requests" },
        (payload) => {
          const row = payload.new as RequestRow;
          setRequests((prev) => [row, ...prev].slice(0, 50));
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase]);

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/auth");
  }

  async function toggleOnline() {
    if (!me) {
      // No profile yet; nothing to toggle.
      return;
    }
    const next = !me.is_online;
    setMe({ ...me, is_online: next });
    await supabase.from("profiles").update({ is_online: next }).eq("id", me.id);
  }

  const [busy, setBusy] = useState(false);
  const [postUploading, setPostUploading] = useState(false);
  const [postToast, setPostToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const postFileRef = useRef<HTMLInputElement>(null);

  async function handleAddPost(file: File) {
    if (postUploading) return;

    const showPostError = (msg: string) => {
      setPostToast({ message: msg, type: "error" });
      setTimeout(() => setPostToast(null), 4000);
    };

    const validTypes = ["image/jpeg", "image/png", "video/mp4"];
    if (!validTypes.includes(file.type)) {
      showPostError("Only JPG, PNG, or MP4 files are allowed.");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      showPostError("File too large. Max 50MB.");
      return;
    }

    setPostUploading(true);
    setPostToast(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        showPostError("Sign in to add a post.");
        return;
      }

      const ext = file.name.split(".").pop() ?? (file.type.startsWith("image/") ? "jpg" : "mp4");
      const path = `${user.id}/posts/${Date.now()}.${ext}`;

      const { data: uploaded, error: uploadErr } = await supabase.storage
        .from("storefront-media")
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage
        .from("storefront-media")
        .getPublicUrl(uploaded.path);

      const mediaType = file.type.startsWith("video/") ? "video" : "image";

      const { error: insertErr } = await supabase.from("seller_posts").insert({
        seller_id: user.id,
        media_url: urlData.publicUrl,
        media_type: mediaType,
        caption: null,
      });
      if (insertErr) throw insertErr;

      setPostToast({ message: "Post added!", type: "success" });
      setTimeout(() => setPostToast(null), 3000);
    } catch (e) {
      const raw =
        e && typeof e === "object" && "message" in e
          ? String((e as { message: unknown }).message)
          : "";
      const msg = raw.includes("row-level security")
        ? "Permission denied. Try signing out and back in."
        : raw || "Failed to add post.";
      setPostToast({ message: msg, type: "error" });
      setTimeout(() => setPostToast(null), 4000);
    } finally {
      setPostUploading(false);
      if (postFileRef.current) postFileRef.current.value = "";
    }
  }

  async function reply() {
    if (!replyingTo) return;
    setBusy(true);
    setStatus(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setStatus("Sign in with your email to reply.");
        return;
      }

      const { data: match } = await supabase
        .from("matches")
        .select("*")
        .eq("request_id", replyingTo)
        .eq("seller_id", user.id)
        .maybeSingle();

      if (!match) {
        setStatus("You must be matched to reply. Ask the buyer to re-run match.");
        return;
      }

      let mediaUrl: string | null = null;
      if (replyFile) {
        if (
          !(
            replyFile.type.startsWith("image/") ||
            replyFile.type === "image/jpeg" ||
            replyFile.type === "image/png" ||
            replyFile.type === "video/mp4"
          )
        ) {
          setStatus("Unsupported file type. Use jpg, png, or mp4.");
          return;
        }
        if (replyFile.size > 50 * 1024 * 1024) {
          setStatus("File too large. Max 50MB.");
          return;
        }
        const ext =
          replyFile.name.split(".").pop() ??
          (replyFile.type.startsWith("image/") ? "jpg" : "mp4");
        const path = `seller/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { data: uploaded, error: uploadErr } = await supabase.storage
          .from("media")
          .upload(path, replyFile, { cacheControl: "3600", upsert: false });
        if (uploadErr) throw uploadErr;
        mediaUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/${uploaded.path}`;
      }

      const { error: insertErr } = await supabase.from("activities").insert({
        request_id: replyingTo,
        seller_id: user.id,
        type: "seller_message",
        body: replyBody,
        media_url: mediaUrl || replyMedia || null,
      });
      if (insertErr) throw insertErr;

      setReplyBody("");
      setReplyMedia("");
      setReplyFile(null);
      if (replyPreview) URL.revokeObjectURL(replyPreview);
      setReplyPreview(null);
      setReplyingTo(null);
      try {
        window.localStorage.removeItem("bloc_seller_replying_to");
        window.localStorage.removeItem("bloc_seller_reply_body");
        window.localStorage.removeItem("bloc_seller_reply_media");
      } catch {
        // ignore
      }
      setStatus("Reply sent.");
    } catch (e) {
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as { message: unknown }).message)
          : "Failed to send reply. Please try again.";
      setStatus(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-medium tracking-wide text-zinc-400">
              Agent status
            </div>
            <div className="mt-1 text-sm font-semibold text-zinc-50">
              {me?.display_name ?? "Seller"}
            </div>
            <div className="mt-1 text-xs text-zinc-500">
              {me?.category ?? "category"} • {me?.location_text ?? "location"}
            </div>
          </div>
          <Button
            onClick={toggleOnline}
            className={me?.is_online ? "bg-emerald-300/10 hover:bg-emerald-300/15" : ""}
            disabled={!me}
          >
            {me?.is_online ? "Online" : "Offline"}
          </Button>
        </div>
        {status ? <div className="mt-3 text-xs text-zinc-400">{status}</div> : null}

        {/* Add post + Sign out */}
        <div className="mt-4 flex items-center gap-4">
          <input
            ref={postFileRef}
            type="file"
            accept="image/jpeg,image/png,video/mp4"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleAddPost(f);
            }}
          />
          <button
            onClick={() => postFileRef.current?.click()}
            disabled={postUploading || !me}
            className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-xs font-semibold text-zinc-200 transition hover:bg-white/[0.08] disabled:opacity-40"
          >
            {postUploading ? (
              <>
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Uploading…
              </>
            ) : (
              <>
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Add post
              </>
            )}
          </button>
          <button
            onClick={signOut}
            className="text-xs text-zinc-600 transition-colors hover:text-zinc-400"
          >
            Sign out
          </button>
        </div>

        {/* Post toast */}
        {postToast && (
          <div
            className={`mt-3 rounded-xl px-3 py-2 text-xs font-medium ${
              postToast.type === "success"
                ? "bg-emerald-500/10 text-emerald-400"
                : "bg-red-500/10 text-red-400"
            }`}
          >
            {postToast.message}
          </div>
        )}
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur">
        <div className="flex items-center justify-between">
          <div className="text-xs font-medium tracking-wide text-zinc-400">
            Incoming requests (open)
          </div>
          <Link href="/seller/onboarding" className="text-xs text-zinc-400 underline decoration-white/20 underline-offset-4">
            Edit profile
          </Link>
        </div>

        <div className="mt-4 space-y-3">
          {requests.length === 0 ? (
            <div className="text-sm text-zinc-400">
              No open requests yet.
            </div>
          ) : (
            requests.map((r) => (
              <div key={r.id} className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <div className="text-xs text-zinc-500">
                  {new Date(r.created_at).toLocaleString()}
                </div>
                <div className="mt-1 text-sm text-zinc-100">{r.sentence}</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    onClick={() => setReplyingTo(r.id)}
                    className="bg-fuchsia-400/10 hover:bg-fuchsia-400/15"
                  >
                    Reply
                  </Button>
                  <Button href={`/request/${r.id}`} className="bg-white/0 hover:bg-white/5">
                    View live
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {replyingTo ? (
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur">
          <div className="text-xs font-medium tracking-wide text-zinc-400">
            Reply to request
          </div>
          <div className="mt-4 space-y-3">
            <Input
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              placeholder="Your message (text)"
            />
            <Input
              value={replyMedia}
              onChange={(e) => setReplyMedia(e.target.value)}
              placeholder="Optional media URL (photo/video)"
            />
            <div className="space-y-2 text-xs text-zinc-400">
              <input
                type="file"
                accept="image/jpeg,image/png,video/mp4"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setReplyFile(f);
                  if (replyPreview) URL.revokeObjectURL(replyPreview);
                  setReplyPreview(f ? URL.createObjectURL(f) : null);
                }}
                className="text-xs"
              />
              {replyPreview ? (
                <div className="mt-1 rounded-2xl border border-white/10 bg-black/30 p-2">
                  {replyFile?.type.startsWith("image/") ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={replyPreview}
                      alt="Preview"
                      className="max-h-48 w-full rounded-xl object-cover"
                    />
                  ) : (
                    <video
                      src={replyPreview}
                      className="max-h-48 w-full rounded-xl"
                      controls
                    />
                  )}
                </div>
              ) : null}
            </div>
            <div className="flex gap-2">
              <Button onClick={reply} disabled={replyBody.trim().length < 2 || busy}>
                Send
              </Button>
              <Button onClick={() => setReplyingTo(null)} className="bg-white/0 hover:bg-white/5">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

