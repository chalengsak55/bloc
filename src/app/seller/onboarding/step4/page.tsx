import { ThemeSelector } from "./ui";

export const dynamic = "force-dynamic";

export default function Step4Page() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-5 pb-14 pt-12">
      <h1
        className="text-3xl font-serif tracking-tight"
        style={{
          backgroundImage: "linear-gradient(135deg, #7c5ce8, #4d9ef5, #00d4c8)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        Choose your theme
      </h1>
      <p className="mt-2 text-sm text-zinc-400">
        Pick a vibe for your storefront. You can change this anytime.
      </p>

      <div className="mt-8">
        <ThemeSelector />
      </div>
    </main>
  );
}
