"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function AuthPanel() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const params = useSearchParams();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setStatus("You are signed in. You can continue as buyer or seller.");
      }
    })();
  }, [supabase]);

  async function sendMagicLink() {
    setBusy(true);
    setStatus(null);
    try {
      const redirect = params.get("redirect") ?? "/buyer";
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo:
            typeof window !== "undefined"
              ? `${window.location.origin}${redirect}`
              : undefined,
        },
      });
      if (error) throw error;
      setStatus("Magic link sent. Check your email.");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Failed to send magic link.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur">
      <div className="text-xs font-medium tracking-wide text-zinc-400">
        Use an email you can access right now. We’ll send a magic link.
      </div>

      <div className="mt-4 space-y-3">
        <Input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          inputMode="email"
          type="email"
          disabled={busy}
        />
      </div>

      <div className="mt-4 flex flex-col gap-3">
        <Button onClick={sendMagicLink} disabled={busy || !email.includes("@")}>
          Send magic link
        </Button>

        <div className="grid gap-2 text-xs text-zinc-400">
          <button
            type="button"
            className="text-left underline decoration-white/20 underline-offset-4"
            onClick={() => router.push("/buyer")}
          >
            Continue as buyer
          </button>
          <button
            type="button"
            className="text-left underline decoration-white/20 underline-offset-4"
            onClick={() => router.push("/seller/dashboard")}
          >
            Seller: open your dashboard
          </button>
        </div>

        {status ? <div className="text-xs text-zinc-400">{status}</div> : null}
      </div>
    </div>
  );
}

