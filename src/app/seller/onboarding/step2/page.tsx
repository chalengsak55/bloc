import { ReviewForm } from "./ui";

export const dynamic = "force-dynamic";

export default function Step2Page() {
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
        Review your info
      </h1>
      <p className="mt-2 text-sm text-zinc-400">
        Make sure everything looks right before we build your storefront.
      </p>

      <div className="mt-10">
        <ReviewForm />
      </div>
    </main>
  );
}
