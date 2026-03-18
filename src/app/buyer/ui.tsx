"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function BuyerComposer() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();
  const [sentence, setSentence] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  // Hydrate from localStorage on mount so refresh/back keeps the last draft.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("bloc_buyer_sentence");
      if (stored) {
        setSentence(stored);
      }
    } catch {
      // ignore
    }
  }, []);

  // Persist draft as the user types.
  useEffect(() => {
    try {
      window.localStorage.setItem("bloc_buyer_sentence", sentence);
    } catch {
      // ignore
    }
  }, [sentence]);

  async function createRequest() {
    setBusy(true);
    setStatus(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setStatus("Please sign in with email first so you can track this request.");
        router.push("/auth?redirect=/buyer");
        return;
      }

      let mediaUrl: string | null = null;
      if (file) {
        if (
          !(
            file.type.startsWith("image/") ||
            file.type === "image/jpeg" ||
            file.type === "image/png" ||
            file.type === "video/mp4"
          )
        ) {
          throw new Error("Unsupported file type. Use jpg, png, or mp4.");
        }
        if (file.size > 50 * 1024 * 1024) {
          throw new Error("File too large. Max 50MB.");
        }
        const ext =
          file.name.split(".").pop() ??
          (file.type.startsWith("image/") ? "jpg" : "mp4");
        const path = `buyer/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { data: uploaded, error: uploadErr } = await supabase.storage
          .from("media")
          .upload(path, file, { cacheControl: "3600", upsert: false });
        if (uploadErr) throw uploadErr;
        mediaUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/${uploaded.path}`;
      }

      const { data, error } = await supabase
        .from("requests")
        .insert({ sentence, buyer_id: user.id, media_url: mediaUrl })
        .select("id")
        .single();
      if (error) throw error;

      try {
        window.localStorage.setItem("bloc_last_request_id", data.id);
      } catch {
        // ignore
      }

      router.push(`/request/${data.id}`);
    } catch (e) {
      if (e && typeof e === "object" && "message" in e && typeof (e as any).message === "string") {
        setStatus((e as any).message as string);
      } else {
        setStatus("Failed to create request.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur">
      <div className="text-xs font-medium tracking-wide text-zinc-400">
        Include service + location + budget + time.
      </div>
      <div className="mt-4 space-y-3">
        <Input
          value={sentence}
          onChange={(e) => setSentence(e.target.value)}
          placeholder="e.g. 'Haircut in SoHo under $60 today at 5pm'"
          disabled={busy}
        />
        <div className="space-y-2 text-xs text-zinc-400">
          <input
            type="file"
            accept="image/jpeg,image/png,video/mp4"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setFile(f);
              if (filePreview) URL.revokeObjectURL(filePreview);
              setFilePreview(f ? URL.createObjectURL(f) : null);
            }}
            disabled={busy}
            className="text-xs"
          />
          {filePreview ? (
            <div className="mt-1 rounded-2xl border border-white/10 bg-black/30 p-2">
              {file?.type.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={filePreview}
                  alt="Preview"
                  className="max-h-48 w-full rounded-xl object-cover"
                />
              ) : (
                <video
                  src={filePreview}
                  className="max-h-48 w-full rounded-xl"
                  controls
                />
              )}
            </div>
          ) : null}
        </div>
        <div className="grid gap-2">
          <Button onClick={createRequest} disabled={busy || sentence.trim().length < 3}>
            Broadcast request
          </Button>
        </div>
        {status ? (
          <div className="text-xs text-red-300">
            {status.includes("relation \"requests\" does not exist")
              ? "The Supabase table `requests` is missing. Please run supabase/schema.sql in your Supabase project."
              : status}
          </div>
        ) : null}
      </div>
    </div>
  );
}

