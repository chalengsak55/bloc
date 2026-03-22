"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type UserMode = "buyer" | "seller";

interface UserModeCtx {
  mode: UserMode;
  setMode: (m: UserMode) => void;
  isSeller: boolean;
  loading: boolean;
}

const Ctx = createContext<UserModeCtx>({
  mode: "buyer",
  setMode: () => {},
  isSeller: false,
  loading: true,
});

const STORAGE_KEY = "bloc_user_mode";

export function UserModeProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [mode, setModeState] = useState<UserMode>("buyer");
  const [isSeller, setIsSeller] = useState(false);
  const [loading, setLoading] = useState(true);

  // On mount: read localStorage + fetch is_seller
  useEffect(() => {
    let canceled = false;

    // Read persisted mode
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "seller") setModeState("seller");
    } catch {
      // ignore
    }

    // Fetch is_seller from DB
    async function check() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!canceled && user) {
        const { data } = await supabase
          .from("profiles")
          .select("is_seller")
          .eq("id", user.id)
          .maybeSingle();
        if (!canceled) {
          const seller = data?.is_seller === true;
          setIsSeller(seller);
          // If stored mode is seller but user isn't a seller, reset to buyer
          if (!seller) {
            setModeState("buyer");
            try { localStorage.setItem(STORAGE_KEY, "buyer"); } catch {}
          }
        }
      }
      if (!canceled) setLoading(false);
    }
    check();
    return () => { canceled = true; };
  }, [supabase]);

  const setMode = useCallback((m: UserMode) => {
    if (m === "seller" && !isSeller) return; // can't switch if not a seller
    setModeState(m);
    try { localStorage.setItem(STORAGE_KEY, m); } catch {}
  }, [isSeller]);

  const value = useMemo(() => ({ mode, setMode, isSeller, loading }), [mode, setMode, isSeller, loading]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useUserMode() {
  return useContext(Ctx);
}
