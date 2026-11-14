"use client";

// The order chatrooms in their own window, laid out like a desktop chat app:
// rooms on the left, the open room on the right. On phones the two are separate views.

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ChatsCircle } from "@phosphor-icons/react";
import { useDB, roomTitle } from "@/lib/store";
import { useViewer } from "@/lib/viewer";
import { Room, RoomList, useRoomRole } from "./OrderRooms";
import AccountModal from "./AccountModal";
import Toaster from "./Toaster";

/** Reads the deep link (?order=<id>) on the client, so the page itself can be prerendered. */
export default function ChatWindow() {
  const initialOrder = useSearchParams().get("order") ?? undefined;
  const db = useDB();
  const viewer = useViewer();
  const [activeId, setActiveId] = useState<string | null>(initialOrder ?? null);
  const [view, setView] = useState<"list" | "room">(initialOrder ? "room" : "list");

  // Most recent conversation first, like a phone chat list.
  const orders = useMemo(() => {
    const latest = new Map<string, string>();
    for (const m of db.messages) if ((latest.get(m.orderId) ?? "") < m.createdAt) latest.set(m.orderId, m.createdAt);
    const at = (id: string, created: string) => latest.get(id) ?? created;
    return [...db.orders].sort((a, b) => at(b.id, b.createdAt).localeCompare(at(a.id, a.createdAt)));
  }, [db.orders, db.messages]);

  const active = orders.find((o) => o.id === activeId) ?? orders[0] ?? null;
  const [role, setRole] = useRoomRole(active);

  const select = useCallback((id: string) => {
    setActiveId(id);
    setView("room");
    window.history.replaceState(null, "", `/rooms?order=${encodeURIComponent(id)}`);
  }, []);

  useEffect(() => {
    const open = (e: Event) => select((e as CustomEvent<string>).detail);
    window.addEventListener("qualty:open-order", open);
    return () => window.removeEventListener("qualty:open-order", open);
  }, [select]);

  useEffect(() => {
    document.title = active ? `${roomTitle(active)} · Qualty` : "Chatrooms · Qualty";
  }, [active]);

  const signedOut = viewer.kind === "visitor" || viewer.kind === "loading";

  return (
    <div className="cw" data-view={view}>
      <header className="cw-top">
        <Link href="/" className="cw-brand">
          <span className="cw-logo" aria-hidden="true">
            Q
          </span>
          <span className="font-heading cw-word">Qualty</span>
          <span className="cw-ai">AI</span>
        </Link>
        <span className="cw-title">Chatrooms</span>
        <Link href="/" className="cw-home">
          <ArrowLeft size={14} /> Back to Qualty
        </Link>
      </header>

      {signedOut ? (
        <Notice
          title={viewer.kind === "loading" ? "Checking your sign-in..." : "Sign in to see your chatrooms"}
          body="Your order chatrooms are private to you, the inspection company and the Qualty team."
          action={
            viewer.kind === "visitor" ? (
              <button className="btn-primary" style={{ padding: "10px 22px" }} onClick={() => window.dispatchEvent(new CustomEvent("qualty:open-auth", { detail: { mode: "signin" } }))}>
                Sign in
              </button>
            ) : null
          }
        />
      ) : orders.length === 0 ? (
        <Notice
          title="No chatrooms yet"
          body="Book an inspection or raise an enquiry on Qualty. Its chatroom shows up here."
          action={
            <Link href="/#orders" className="btn-primary" style={{ padding: "10px 22px" }}>
              Book an inspection
            </Link>
          }
        />
      ) : (
        <div className="cw-body">
          <aside className="cw-list" aria-label="Your chatrooms">
            <div className="cw-list-head">
              <span>Your chatrooms</span>
              <span className="font-mono cw-count">{orders.length}</span>
            </div>
            <div style={{ padding: "0 8px 8px" }}>
              <RoomList orders={orders} activeId={active?.id ?? null} onSelect={select} label="Orders" />
            </div>
          </aside>
          <main className="cw-room">
            {active && <Room key={active.id} order={active} role={role} setRole={setRole} variant="window" onBack={() => setView("list")} />}
          </main>
        </div>
      )}

      <Toaster />
      <AccountModal />

      <style jsx>{`
        .cw {
          height: 100vh;
          height: 100dvh;
          display: flex;
          flex-direction: column;
          background: var(--bg-page);
          color: var(--text-main);
        }
        .cw-top {
          flex: none;
          height: 52px;
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 0 16px;
          border-bottom: 1px solid var(--border-main);
          background: var(--bg-card);
        }
        .cw-top :global(.cw-brand) {
          display: flex;
          align-items: center;
          gap: 7px;
        }
        .cw-logo {
          width: 26px;
          height: 26px;
          border-radius: 7px;
          background: var(--accent-fill);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--heading);
          font-weight: 700;
          font-size: 14px;
        }
        .cw-word {
          font-size: 17px;
          font-weight: 700;
          color: var(--text-main);
        }
        .cw-ai {
          font-size: 10px;
          font-weight: 700;
          color: var(--accent-primary);
          background: var(--accent-light);
          border-radius: 5px;
          padding: 1px 5px;
        }
        .cw-title {
          font-size: 13px;
          color: var(--text-muted);
          padding-left: 14px;
          border-left: 1px solid var(--border-main);
          line-height: 20px;
        }
        .cw-top :global(.cw-home) {
          margin-left: auto;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 500;
          color: var(--text-secondary);
          padding: 8px 10px;
          border-radius: 8px;
          transition: color 0.15s var(--ease-out), background-color 0.15s var(--ease-out);
        }
        .cw-top :global(.cw-home:hover) {
          color: var(--text-main);
          background: var(--bg-subtle);
        }
        .cw-body {
          flex: 1;
          min-height: 0;
          display: grid;
          grid-template-columns: minmax(280px, 340px) 1fr;
        }
        .cw-list {
          min-height: 0;
          overflow-y: auto;
          border-right: 1px solid var(--border-main);
          background: var(--bg-card);
        }
        .cw-list-head {
          position: sticky;
          top: 0;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 20px 10px;
          font-size: 13px;
          font-weight: 600;
          color: var(--text-main);
          background: var(--bg-card);
        }
        .cw-count {
          font-size: 12px;
          color: var(--text-muted);
        }
        .cw-room {
          min-width: 0;
          min-height: 0;
        }
        @media (max-width: 719px) {
          .cw-title {
            display: none;
          }
          .cw-body {
            grid-template-columns: 1fr;
          }
          .cw-list {
            border-right: none;
          }
          .cw[data-view="room"] .cw-list {
            display: none;
          }
          .cw[data-view="list"] .cw-room {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}

function Notice({ title, body, action }: { title: string; body: string; action: React.ReactNode }) {
  return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div className="card-shell" style={{ padding: "36px 28px", textAlign: "center", maxWidth: "440px", width: "100%" }}>
        <ChatsCircle size={32} color="var(--accent-primary)" style={{ margin: "0 auto 12px" }} />
        <p style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-main)" }}>{title}</p>
        <p style={{ fontSize: "13.5px", color: "var(--text-muted)", margin: "6px auto 18px" }}>{body}</p>
        {action}
      </div>
    </div>
  );
}
