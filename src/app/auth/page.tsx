import { AuthPanel } from "./ui";

export const dynamic = "force-dynamic";

export default function AuthPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-5 pb-14 pt-10">
      <div className="text-sm font-semibold tracking-wide text-zinc-50">Bloc</div>
      <div className="mt-1 text-xs text-zinc-400">
        Sign in with a magic link to track requests and your seller dashboard.
      </div>
      <div className="mt-8">
        <AuthPanel />
      </div>
    </main>
  );
}

