import { OnboardingFlow } from "./ui";

export const dynamic = "force-dynamic";

export default function SellerOnboardingPage() {
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
        Set up your storefront
      </h1>
      <p className="mt-2 text-sm text-zinc-400">
        Paste your link, pick a vibe, and we&apos;ll build it for you.
      </p>

      <div className="mt-10">
        <OnboardingFlow />
      </div>
    </main>
  );
}
