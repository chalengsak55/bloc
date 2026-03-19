import { Suspense } from "react";
import { ChatView } from "./ui";

export const dynamic = "force-dynamic";

export default async function ChatPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0d0d12]" />}>
      <ChatView conversationId={conversationId} />
    </Suspense>
  );
}
