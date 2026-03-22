"use client";

import { UserModeProvider } from "@/lib/user-mode";

export function Providers({ children }: { children: React.ReactNode }) {
  return <UserModeProvider>{children}</UserModeProvider>;
}
