"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function SellerOnboard() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();

  const [linkUrl, setLinkUrl] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [category, setCategory] = useState("");
  const [locationText, setLocationText] = useState("");
  const [bio, setBio] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function autofill() {
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch(`/api/scrape?url=${encodeURIComponent(linkUrl)}`);
      const json = (await res.json()) as {
        title?: string;
        description?: string;
        category?: string | null;
        location?: string | null;
      };
      if (!res.ok) throw new Error((json as any).error ?? "Scrape failed");
      if (json.title && !displayName) setDisplayName(json.title);
      if (json.description && !bio) setBio(json.description);
      if (json.category && !category) setCategory(json.category);
      if (json.location && !locationText) setLocationText(json.location);
      setStatus("Auto-filled. Review and save.");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Auto-fill failed.");
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setBusy(true);
    setStatus(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setStatus("Sign in with email first to create your seller profile.");
        return;
      }

      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        role: "seller",
        display_name: displayName || null,
        link_url: linkUrl || null,
        category: category || null,
        location_text: locationText || null,
        bio: bio || null,
        is_online: true,
      });
      if (error) throw error;

      router.push("/seller/dashboard");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur">
      <div className="text-xs font-medium tracking-wide text-zinc-400">
        Link types: Instagram, Facebook, website, Google Maps.
      </div>

      <div className="mt-4 space-y-3">
        <Input
          value={linkUrl}
          onChange={(e) => setLinkUrl(e.target.value)}
          placeholder="https://instagram.com/yourbusiness"
          disabled={busy}
        />
        <div className="flex gap-2">
          <Button
            onClick={autofill}
            disabled={busy || !/^https?:\/\//i.test(linkUrl)}
            className="w-full"
          >
            Auto-fill from link
          </Button>
        </div>

        <Input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Display name"
          disabled={busy}
        />
        <Input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="Category (e.g. barber, nail tech, photographer)"
          disabled={busy}
        />
        <Input
          value={locationText}
          onChange={(e) => setLocationText(e.target.value)}
          placeholder="Location (e.g. SoHo NYC)"
          disabled={busy}
        />
        <Input
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Short bio"
          disabled={busy}
        />

        <Button
          onClick={save}
          disabled={
            busy ||
            !/^https?:\/\//i.test(linkUrl) ||
            displayName.trim().length < 2 ||
            category.trim().length < 3 ||
            locationText.trim().length < 2
          }
          className="w-full bg-emerald-300/10 hover:bg-emerald-300/15"
        >
          Save and go online
        </Button>
        {status ? <div className="text-xs text-zinc-400">{status}</div> : null}
      </div>
    </div>
  );
}

