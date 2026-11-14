import type { Metadata } from "next";
import { Suspense } from "react";
import ChatWindow from "@/components/ChatWindow";

export const metadata: Metadata = {
  title: "Chatrooms · Qualty",
  description: "Your order chatrooms with the inspection company and the Qualty team.",
};

/** Order chatrooms in their own window. Deep link: /rooms?order=<id>. */
export default function RoomsPage() {
  return (
    <Suspense fallback={null}>
      <ChatWindow />
    </Suspense>
  );
}
