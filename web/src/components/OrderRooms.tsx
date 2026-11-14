"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ChatsCircle,
  PaperPlaneRight,
  Camera,
  Truck,
  Eye,
  Warning,
  ShieldCheck,
  CheckCircle,
  Gavel,
  FileText,
  SpinnerGap,
  PencilSimple,
  Check,
  X,
  ArrowSquareOut,
  ArrowLeft,
  SidebarSimple,
} from "@phosphor-icons/react";
import {
  useDB,
  ROLE_LABEL,
  REQUIRED_CHECKS,
  postMessage,
  addEvidence,
  submitBid,
  acceptBid,
  counterBid,
  discountBid,
  setFollowUp,
  withdrawBid,
  bidNet,
  bidCustomerPrice,
  roundCustomerPrice,
  orderCustomerPrice,
  orderCompanyBudget,
  completeInspection,
  setPartyVerified,
  describeSpec,
  getBlob,
  useSession,
  isRemote,
  orderRef,
  roomTitle,
  renameRoom,
  myCompanyIds,
  roomOpen,
  awaitingPayment,
  markPaymentSent,
  recordPayment,
  invoiceTotal,
  invoicePaid,
  type Session,
  type TeamMember,
  type Role,
  type Order,
  type Bid,
  type ChatMessage,
  type Party,
  type EvidenceRecord,
} from "@/lib/store";
import { messageDays } from "@/lib/chat";
import EvidenceMedia from "./EvidenceMedia";
import { run } from "@/lib/notify";

/** Your role in an order's room, from your account (mirrors chat_role_for in the database). */
export function roleIn(o: Order, session: Session | null, team: TeamMember[]): Role {
  if (!session) return "customer";
  if (session.appRole === "admin") return "admin";
  if (o.customerId === session.userId) return "customer";
  const m = team.find((t) => t.companyId === o.companyId && t.userId === session.userId && t.status === "active");
  return m?.role === "inspector" ? "inspector" : "company";
}

/** The viewer's role in the active room. On the backend it comes from the account; the demo lets you switch. */
export function useRoomRole(active: Order | null): [Role, (r: Role) => void] {
  const db = useDB();
  const { session } = useSession();
  const [picked, setPicked] = useState<Role>("customer");
  const role: Role = !isRemote || !active ? picked : roleIn(active, session, db.team);
  return [role, setPicked];
}

type Composer = "message" | "observation" | "dispatch" | "media";

export const STATUS_LABEL: Record<Order["status"], string> = {
  enquiry: "Taking bids",
  booked: "Booked",
  "in-progress": "Inspection in progress",
  completed: "Completed",
};

const field: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: "8px",
  border: "1px solid var(--border-main)",
  backgroundColor: "var(--bg-card)",
  color: "var(--text-main)",
  fontSize: "13px",
  minWidth: 0,
};

const usd = (n: number) => `$${n.toLocaleString()}`;

/** 24-hour clock, like a phone chat. */
export const clock = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

/** Short time for a room list: the clock today, "Yesterday", else the date. */
function listTime(iso: string, now = new Date()) {
  const d = new Date(iso);
  if (d.toDateString() === now.toDateString()) return clock(iso);
  const y = new Date(now);
  y.setDate(y.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/** One line describing a message, for room lists. */
function preview(m: ChatMessage) {
  if (m.kind === "system") return m.text;
  if (m.kind === "summary") return "Inspection summary saved to the Vault";
  if (m.kind === "flag") return `Flag: ${m.text}`;
  const body = m.kind === "media" ? m.text || "Photo or video" : m.kind === "dispatch" ? `Dispatch: ${m.text || m.dispatch?.vehicleNo || ""}` : m.text;
  return `${m.author}: ${body}`;
}

/** Link that opens a room's chat in its own window. */
export const chatHref = (o: Pick<Order, "id">) => `/rooms?order=${encodeURIComponent(o.id)}`;

/**
 * List of rooms: group name, order number, status and the latest message.
 * Each row is a button (its name includes the order number); `openLinks` adds an
 * "open in a new window" link beside it.
 */
export function RoomList({
  orders,
  activeId,
  onSelect,
  openLinks = false,
  label = "Orders",
}: {
  orders: Order[];
  activeId: string | null;
  onSelect: (id: string) => void;
  openLinks?: boolean;
  label?: string;
}) {
  const db = useDB();
  const last = useMemo(() => {
    const map = new Map<string, ChatMessage>();
    for (const m of db.messages) {
      const prev = map.get(m.orderId);
      if (!prev || prev.createdAt <= m.createdAt) map.set(m.orderId, m);
    }
    return map;
  }, [db.messages]);
  const flags = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of db.messages) if (m.kind === "flag") map.set(m.orderId, (map.get(m.orderId) ?? 0) + 1);
    return map;
  }, [db.messages]);

  return (
    <nav aria-label={label} className="room-list">
      {orders.map((o) => {
        const isActive = o.id === activeId;
        const m = last.get(o.id);
        const f = flags.get(o.id) ?? 0;
        return (
          <div key={o.id} className="room-row" data-active={isActive || undefined}>
            <button className="room-pick" onClick={() => onSelect(o.id)} aria-current={isActive ? "true" : undefined}>
              <span className="room-line">
                <span className="room-name">{o.roomName || o.commodity}</span>
                {m && <span className="room-time font-mono">{listTime(m.createdAt)}</span>}
              </span>
              <span className="room-line room-meta">
                <span className="font-mono room-ref">{orderRef(o)}</span>
                <span aria-hidden="true">·</span>
                <span style={{ color: o.status === "completed" ? "var(--success-text)" : undefined }}>{STATUS_LABEL[o.status]}</span>
                {f > 0 && (
                  <span className="room-flags">
                    {f} flag{f === 1 ? "" : "s"}
                  </span>
                )}
              </span>
              {m && <span className="room-preview">{preview(m)}</span>}
            </button>
            {openLinks && (
              <a
                className="room-out"
                href={chatHref(o)}
                target="_blank"
                rel="noopener"
                aria-label={`Open chat for ${orderRef(o)} in a new window`}
                title="Open chat in a new window"
              >
                <ArrowSquareOut size={18} />
              </a>
            )}
          </div>
        );
      })}
      <style jsx>{`
        .room-list {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .room-row {
          display: flex;
          align-items: stretch;
          gap: 2px;
          border-radius: 10px;
          border: 1px solid transparent;
          transition: background-color 0.15s var(--ease-out);
        }
        .room-row:hover {
          background-color: var(--bg-subtle);
        }
        .room-row[data-active] {
          background-color: var(--accent-light);
          border-color: var(--accent-border);
        }
        .room-pick {
          flex: 1;
          min-width: 0;
          text-align: left;
          padding: 10px 12px;
          border-radius: 10px;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .room-line {
          display: flex;
          align-items: baseline;
          gap: 8px;
          min-width: 0;
        }
        .room-name {
          flex: 1;
          min-width: 0;
          font-size: 14px;
          font-weight: 600;
          color: var(--text-main);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .room-time {
          flex: none;
          font-size: 11.5px;
          color: var(--text-muted);
        }
        .room-meta {
          gap: 6px;
          font-size: 12px;
          color: var(--text-muted);
        }
        .room-ref {
          color: var(--text-secondary);
          font-weight: 600;
        }
        .room-flags {
          margin-left: auto;
          color: var(--warning-text);
          white-space: nowrap;
        }
        .room-preview {
          font-size: 12.5px;
          color: var(--text-secondary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .room-out {
          flex: none;
          width: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          color: var(--text-muted);
          transition: color 0.15s var(--ease-out), background-color 0.15s var(--ease-out);
        }
        .room-out:hover {
          color: var(--accent-primary);
          background-color: var(--bg-card);
        }
      `}</style>
    </nav>
  );
}

/** Homepage section: your chatrooms, each one also opens in its own window. */
export default function OrderRooms({ onBook }: { onBook: () => void }) {
  const db = useDB();
  const orders = db.orders;
  const [activeId, setActiveId] = useState<string | null>(null);
  const { session, ready } = useSession();

  useEffect(() => {
    const open = (e: Event) => setActiveId((e as CustomEvent<string>).detail);
    window.addEventListener("qualty:open-order", open);
    return () => window.removeEventListener("qualty:open-order", open);
  }, []);

  const active = orders.find((o) => o.id === activeId) ?? orders[0] ?? null;
  const [role, setRole] = useRoomRole(active);

  return (
    <section id="orders" style={{ padding: "clamp(40px, 5vw, 64px) 20px", maxWidth: "1280px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "16px", flexWrap: "wrap", marginBottom: "28px" }}>
        <div style={{ maxWidth: "720px" }}>
          <h2 className="font-heading" style={{ fontSize: "clamp(26px, 3.4vw, 36px)", fontWeight: 700, color: "var(--text-main)", textWrap: "balance" }}>
            Every order gets its own chatroom
          </h2>
          <p style={{ fontSize: "15px", color: "var(--text-secondary)", lineHeight: 1.6, marginTop: "10px", textWrap: "pretty" }}>
            Once the order is booked and paid, a private chatroom opens for you, the inspection company and the Qualty team.
            Inspectors report there live: readings, truck and container dispatch, photos and videos. Readings outside the
            booked spec are flagged automatically, and closing the inspection writes the summary into the Quality Evidence Vault.
          </p>
        </div>
        {orders.length > 0 && (!isRemote || session) && (
          <a href="/rooms" target="_blank" rel="noopener" className="btn-secondary" style={{ padding: "9px 16px", fontSize: "13.5px" }}>
            <ArrowSquareOut size={16} /> Open chatrooms in a new window
          </a>
        )}
      </div>

      {isRemote && !session ? (
        <div className="card-shell" style={{ padding: "36px 28px", textAlign: "center" }}>
          <ChatsCircle size={32} color="var(--accent-primary)" style={{ margin: "0 auto 12px" }} />
          <p style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-main)" }}>{ready ? "Sign in to see your orders" : "Checking your sign-in..."}</p>
          <p style={{ fontSize: "13.5px", color: "var(--text-muted)", margin: "6px auto 18px", maxWidth: "420px" }}>
            Your orders, invoices and chatrooms are private to you and the inspection company you book.
          </p>
          {ready && (
            <div style={{ display: "flex", gap: "8px", justifyContent: "center", flexWrap: "wrap" }}>
              <button className="btn-primary" onClick={() => window.dispatchEvent(new CustomEvent("qualty:open-auth", { detail: { mode: "signin" } }))} style={{ padding: "10px 22px" }}>
                Sign in
              </button>
              <button className="btn-secondary" onClick={() => window.dispatchEvent(new CustomEvent("qualty:open-auth", { detail: { mode: "signup", as: "customer" } }))} style={{ padding: "10px 22px" }}>
                Create a customer account
              </button>
            </div>
          )}
        </div>
      ) : orders.length === 0 ? (
        <div className="card-shell" style={{ padding: "36px 28px", textAlign: "center" }}>
          <ChatsCircle size={32} color="var(--accent-primary)" style={{ margin: "0 auto 12px" }} />
          <p style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-main)" }}>No orders yet</p>
          <p style={{ fontSize: "13.5px", color: "var(--text-muted)", margin: "6px auto 18px", maxWidth: "420px" }}>
            Book a quick inspection or raise an enquiry. Its chatroom opens here straight away.
          </p>
          <button className="btn-primary" onClick={onBook} style={{ padding: "10px 22px" }}>
            Book an inspection
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "20px", alignItems: "flex-start" }}>
          <div className="card-shell" style={{ flex: "1 1 280px", maxWidth: "100%", padding: "8px" }}>
            <h3 style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--text-muted)", padding: "6px 12px 8px" }}>Your chatrooms</h3>
            <RoomList orders={orders} activeId={active?.id ?? null} onSelect={setActiveId} openLinks />
          </div>
          {active && <Room key={active.id} order={active} role={role} setRole={setRole} />}
        </div>
      )}
    </section>
  );
}

function PartyLine({ label, party, canVerify, onVerify }: { label: string; party: Party; canVerify: boolean; onVerify: () => void }) {
  const state =
    party.verification === "verified"
      ? { text: "Verified", color: "var(--success-text)" }
      : party.verification === "format-checked"
        ? { text: "IDs format-checked, registry check pending", color: "var(--warning-text)" }
        : { text: "Not verified", color: "var(--danger-text)" };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", fontSize: "12.5px" }}>
      <span style={{ color: "var(--text-muted)", minWidth: "44px" }}>{label}</span>
      <strong style={{ color: "var(--text-main)" }}>{party.name || "—"}</strong>
      {(party.gstin || party.iec) && (
        <span className="font-mono" style={{ color: "var(--text-muted)", fontSize: "11.5px" }}>
          {[party.gstin && `GSTIN ${party.gstin}`, party.iec && `IEC ${party.iec}`].filter(Boolean).join(" / ")}
        </span>
      )}
      <span style={{ color: state.color }}>{state.text}</span>
      {canVerify && party.verification !== "verified" && (
        <button onClick={onVerify} style={{ fontSize: "12px", fontWeight: 600, color: "var(--accent-primary)", cursor: "pointer", textDecoration: "underline" }}>
          Mark verified
        </button>
      )}
    </div>
  );
}

/**
 * The room's title: group name (or commodity) and the order number, which always stays.
 * Members can rename the group in place: Enter saves, Esc cancels, an empty name goes back to the commodity.
 */
export function RoomName({ order, size = 16, level = 3 }: { order: Order; size?: number; level?: 2 | 3 }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [problems, setProblems] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const pencil = useRef<HTMLButtonElement>(null);
  const Heading = level === 2 ? "h2" : "h3";
  const name = order.roomName || order.commodity;

  const start = () => {
    setDraft(order.roomName ?? "");
    setProblems([]);
    setEditing(true);
  };
  const stop = () => {
    setEditing(false);
    setProblems([]);
    requestAnimationFrame(() => pencil.current?.focus());
  };
  const save = async () => {
    if (busy) return;
    if (draft.trim().replace(/\s+/g, " ") === (order.roomName ?? "")) return stop();
    setBusy(true);
    const p = await run(renameRoom(order.id, draft));
    setBusy(false);
    if (p === undefined) return;
    if (p.length) setProblems(p);
    else stop();
  };

  if (editing) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
        style={{ display: "flex", flexDirection: "column", gap: "4px", minWidth: 0, flex: "1 1 240px" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0 }}>
          <input
            autoFocus
            aria-label="Group name"
            aria-invalid={problems.length > 0 || undefined}
            aria-describedby={`rename-${order.id}-hint`}
            placeholder={order.commodity}
            maxLength={60}
            value={draft}
            disabled={busy}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                stop();
              }
            }}
            style={{ ...field, flex: "1 1 160px", fontSize: "14px", fontWeight: 600, padding: "6px 10px" }}
          />
          <span className="font-mono" style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
            {orderRef(order)}
          </span>
          <button type="submit" aria-label="Save group name" disabled={busy} style={iconBtn}>
            {busy ? <SpinnerGap size={16} className="animate-spin" /> : <Check size={16} weight="bold" />}
          </button>
          <button type="button" aria-label="Cancel renaming" onClick={stop} style={iconBtn}>
            <X size={16} />
          </button>
        </div>
        {problems.length > 0 ? (
          <p id={`rename-${order.id}-hint`} role="alert" style={{ fontSize: "12px", color: "var(--danger-text)" }}>
            {problems.join(" ")}
          </p>
        ) : (
          <p id={`rename-${order.id}-hint`} style={{ fontSize: "11.5px", color: "var(--text-muted)" }}>
            Enter to save, Esc to cancel. Leave it empty to use the commodity. The order number stays.
          </p>
        )}
      </form>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "4px", minWidth: 0 }}>
      <Heading
        className="font-heading"
        title={roomTitle(order)}
        style={{ fontSize: `${size}px`, fontWeight: 700, color: "var(--text-main)", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", letterSpacing: "-0.01em" }}
      >
        {name}
        <span style={{ color: "var(--text-faint)", fontWeight: 400 }}> · </span>
        <span className="font-mono" style={{ fontSize: `${size - 2}px`, color: "var(--text-secondary)" }}>
          {orderRef(order)}
        </span>
      </Heading>
      <button ref={pencil} type="button" aria-label="Rename group" title="Rename group" onClick={start} style={iconBtn}>
        <PencilSimple size={16} />
      </button>
    </div>
  );
}

const iconBtn: React.CSSProperties = {
  flex: "none",
  width: "32px",
  height: "32px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "8px",
  color: "var(--text-muted)",
};

/** Members, parties, budget and spec. */
function RoomFacts({ order, role }: { order: Order; role: Role }) {
  const partiesHidden = order.members.length === 0;
  const budget = role === "customer" ? order.budgetUSD : orderCompanyBudget(order);
  return (
    <>
      <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
        Members: {order.members.map((m) => `${m.name} (${ROLE_LABEL[m.role]})`).join(", ")}
      </div>
      {partiesHidden ? (
        <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
          Buyer, seller and customer details are shared only with the company whose bid is accepted.
        </p>
      ) : (
        <>
          <PartyLine label="Buyer" party={order.buyer} canVerify={role === "admin"} onVerify={() => void run(setPartyVerified(order.id, "buyer"))} />
          <PartyLine label="Seller" party={order.seller} canVerify={role === "admin"} onVerify={() => void run(setPartyVerified(order.id, "seller"))} />
        </>
      )}
      {budget !== undefined && (
        <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
          {role === "customer" ? "Your budget" : "Budget"} <span className="font-mono">{usd(budget)}</span>
        </p>
      )}
      {order.spec && (
        <p style={{ fontSize: "12px", color: "var(--accent-text)" }}>
          Booked spec{order.specLabel ? ` (${order.specLabel})` : ""}: {describeSpec(order.spec)}
        </p>
      )}
    </>
  );
}

function RoleControl({ role, setRole }: { role: Role; setRole: (r: Role) => void }) {
  return isRemote ? (
    <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>You&apos;re in this room as {ROLE_LABEL[role]}</span>
  ) : (
    <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--text-muted)" }}>
      Viewing as
      <select value={role} onChange={(e) => setRole(e.target.value as Role)} style={field}>
        {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
          <option key={r} value={r}>
            {ROLE_LABEL[r]}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Messages under sticky day separators (Today, Yesterday, a date). */
function Thread({ order, role, fill }: { order: Order; role: Role; fill?: boolean }) {
  const db = useDB();
  const messages = useMemo(() => db.messages.filter((m) => m.orderId === order.id), [db.messages, order.id]);
  const evidenceById = useMemo(() => new Map(db.evidence.filter((e) => e.orderId === order.id).map((e) => [e.id, e])), [db.evidence, order.id]);
  const days = useMemo(() => messageDays(messages), [messages]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight });
  }, [messages.length]);

  return (
    <div
      ref={ref}
      role="log"
      aria-label={`Chat for ${orderRef(order)}`}
      style={{
        ...(fill ? { flex: 1, minHeight: 0 } : { maxHeight: "460px" }),
        overflowY: "auto",
        padding: "0 20px 16px",
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        backgroundColor: "var(--bg-subtle)",
      }}
    >
      {days.map((d) => (
        <div key={d.key} role="group" aria-label={d.label} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ position: "sticky", top: 0, zIndex: 1, display: "flex", justifyContent: "center", padding: "10px 0 2px", pointerEvents: "none" }}>
            <span
              style={{
                fontSize: "11.5px",
                fontWeight: 600,
                color: "var(--text-secondary)",
                backgroundColor: "var(--bg-card)",
                border: "1px solid var(--border-main)",
                borderRadius: "9999px",
                padding: "3px 10px",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              {d.label}
            </span>
          </div>
          {d.items.map((m) => (
            <Message key={m.id} m={m} evidence={m.evidenceId ? evidenceById.get(m.evidenceId) : undefined} mine={m.role === role} />
          ))}
        </div>
      ))}
    </div>
  );
}

function Checklist({ order }: { order: Order }) {
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  return (
    <div>
      <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-main)", marginBottom: "8px" }}>Before you close the inspection</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px", marginBottom: "12px" }}>
        {REQUIRED_CHECKS.map((c) => (
          <label key={c} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12.5px", color: "var(--text-secondary)", minHeight: "28px" }}>
            <input type="checkbox" checked={!!checklist[c]} onChange={(e) => setChecklist({ ...checklist, [c]: e.target.checked })} />
            {c}
          </label>
        ))}
      </div>
      <button className="btn-primary" style={{ padding: "9px 18px", fontSize: "13px" }} onClick={() => void run(completeInspection(order.id, checklist))}>
        <CheckCircle size={16} weight="bold" /> Close inspection and write summary
      </button>
      <p style={{ fontSize: "11.5px", color: "var(--text-muted)", marginTop: "6px" }}>Unticked items are flagged as missing in the summary.</p>
    </div>
  );
}

/**
 * One order's chatroom. `inline` is the homepage card; `window` fills the /rooms page:
 * a sticky header, the thread with the composer below it, and a collapsible details panel
 * holding the parties, bids, payment and closing checklist.
 */
export function Room({
  order,
  role,
  setRole,
  variant = "inline",
  onBack,
}: {
  order: Order;
  role: Role;
  setRole: (r: Role) => void;
  variant?: "inline" | "window";
  onBack?: () => void;
}) {
  // null follows the screen width (shown on wide screens); a click pins it open or shut.
  const [details, setDetails] = useState<boolean | null>(null);

  const memberName = (r: Role) =>
    r === "inspector"
      ? `Inspector${order.inspectionCompany ? ` (${order.inspectionCompany})` : ""}`
      : order.members.find((m) => m.role === r)?.name ?? ROLE_LABEL[r];

  const closed = order.status === "completed";
  const open = roomOpen(order) || (role === "admin" && order.status !== "enquiry");
  const canReport = (role === "inspector" || role === "company" || role === "admin") && !closed && open;
  const showChecklist = canReport && (role === "inspector" || role === "admin");
  const subline = `${order.service} · ${order.location} · ${order.volumeTons.toLocaleString()} t · ${order.inspectionDate}`;

  const enquiryNote = (
    <p style={{ padding: "16px 20px", fontSize: "13px", color: "var(--text-muted)" }}>
      The chatroom opens for the customer and the chosen company once a bid is accepted and paid.
    </p>
  );
  const composer = closed ? (
    <p style={{ padding: "14px 20px", fontSize: "13px", color: "var(--text-muted)", borderTop: "1px solid var(--border-main)" }}>
      This inspection is closed. The summary and evidence are in the Quality Evidence Vault.
    </p>
  ) : (
    <ComposerBar order={order} role={role} author={memberName(role)} canReport={canReport} />
  );

  if (variant === "inline") {
    return (
      <div className="card-shell" style={{ flex: "999 1 480px", minWidth: 0, padding: 0, overflow: "hidden" }}>
        <header style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-main)", display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <div style={{ minWidth: 0, flex: "1 1 240px" }}>
              <RoomName order={order} />
              <p style={{ fontSize: "12.5px", color: "var(--text-secondary)" }}>{subline}</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              <RoleControl role={role} setRole={setRole} />
              <a
                href={chatHref(order)}
                target="_blank"
                rel="noopener"
                style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12.5px", fontWeight: 600, color: "var(--accent-primary)", minHeight: "32px" }}
              >
                <ArrowSquareOut size={16} /> Open chat
              </a>
            </div>
          </div>
          <RoomFacts order={order} role={role} />
        </header>

        {order.mode === "inquiry" && <Bids order={order} role={role} />}

        {order.status === "enquiry" ? (
          <div style={{ borderTop: "1px solid var(--border-main)" }}>{enquiryNote}</div>
        ) : !open ? (
          <PaymentPanel order={order} role={role} />
        ) : (
          <>
            {/* The Qualty team can use an unpaid room, and confirms the payment from it. */}
            {awaitingPayment(order) && <PaymentPanel order={order} role={role} />}
            <Thread order={order} role={role} />
            {composer}
            {showChecklist && (
              <div style={{ padding: "14px 20px", borderTop: "1px solid var(--border-main)" }}>
                <Checklist order={order} />
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  const toggleDetails = () => {
    const showing = details ?? window.matchMedia("(min-width: 1100px)").matches;
    setDetails(!showing);
  };
  const detailsState = details === null ? "auto" : details ? "open" : "closed";

  return (
    <div className="rw" data-details={detailsState}>
      <header className="rw-head">
        {onBack && (
          <button type="button" className="rw-back" aria-label="Back to chatrooms" onClick={onBack} style={iconBtn}>
            <ArrowLeft size={18} />
          </button>
        )}
        <div style={{ minWidth: 0, flex: 1 }}>
          <RoomName order={order} size={17} level={2} />
          <p className="rw-sub">
            {STATUS_LABEL[order.status]} · {subline}
          </p>
        </div>
        <div className="rw-tools">
          <RoleControl role={role} setRole={setRole} />
          <button
            type="button"
            className="btn-secondary"
            aria-expanded={detailsState === "open" ? true : detailsState === "closed" ? false : undefined}
            aria-controls={`details-${order.id}`}
            onClick={toggleDetails}
            style={{ padding: "6px 12px", fontSize: "12.5px" }}
          >
            <SidebarSimple size={16} style={{ transform: "scaleX(-1)" }} /> Details
          </button>
        </div>
      </header>

      <div className="rw-body">
        <div className="rw-main">
          {order.status === "enquiry" ? (
            <div style={{ overflowY: "auto", flex: 1 }}>
              {order.mode === "inquiry" && <Bids order={order} role={role} />}
              {enquiryNote}
            </div>
          ) : !open ? (
            <div style={{ overflowY: "auto", flex: 1 }}>
              <PaymentPanel order={order} role={role} />
            </div>
          ) : (
            <>
              {awaitingPayment(order) && <PaymentPanel order={order} role={role} />}
              <Thread order={order} role={role} fill />
              {composer}
            </>
          )}
        </div>

        <aside id={`details-${order.id}`} className="rw-details" aria-label="Order details">
          <div className="rw-details-head">
            <span>Order details</span>
            <button type="button" aria-label="Close details" onClick={() => setDetails(false)} style={iconBtn}>
              <X size={16} />
            </button>
          </div>
          <div style={{ padding: "4px 20px 16px", display: "flex", flexDirection: "column", gap: "8px" }}>
            <RoomFacts order={order} role={role} />
          </div>
          {order.mode === "inquiry" && order.status !== "enquiry" && (
            <div style={{ borderTop: "1px solid var(--border-main)" }}>
              <Bids order={order} role={role} />
            </div>
          )}
          {showChecklist && (
            <div style={{ padding: "14px 20px", borderTop: "1px solid var(--border-main)" }}>
              <Checklist order={order} />
            </div>
          )}
        </aside>
      </div>

      <style jsx>{`
        .rw {
          position: relative;
          display: flex;
          flex-direction: column;
          height: 100%;
          min-height: 0;
          background: var(--bg-card);
        }
        .rw-head {
          flex: none;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 16px 10px 20px;
          border-bottom: 1px solid var(--border-main);
          background: var(--bg-card);
          position: sticky;
          top: 0;
          z-index: 3;
        }
        .rw-sub {
          font-size: 12.5px;
          color: var(--text-muted);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .rw-tools {
          flex: none;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .rw-body {
          flex: 1;
          min-height: 0;
          display: flex;
          position: relative;
        }
        .rw-main {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          background: var(--bg-subtle);
        }
        .rw-details {
          flex: none;
          width: 360px;
          overflow-y: auto;
          border-left: 1px solid var(--border-main);
          background: var(--bg-card);
        }
        .rw-details-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 12px 2px 20px;
          font-size: 13px;
          font-weight: 600;
          color: var(--text-main);
        }
        .rw[data-details="closed"] .rw-details {
          display: none;
        }
        @media (max-width: 1099px) {
          .rw[data-details="auto"] .rw-details {
            display: none;
          }
          .rw[data-details="open"] .rw-details {
            position: absolute;
            top: 0;
            right: 0;
            bottom: 0;
            width: min(380px, 100%);
            z-index: 2;
            box-shadow: var(--shadow-xl);
            animation: rw-in 0.22s var(--ease-out);
          }
        }
        @media (min-width: 720px) {
          .rw-back {
            display: none !important;
          }
        }
        @media (max-width: 719px) {
          .rw-head {
            padding: 8px 10px;
            gap: 6px;
            flex-wrap: wrap;
          }
          .rw-tools {
            width: 100%;
            justify-content: space-between;
          }
        }
        @keyframes rw-in {
          from {
            transform: translateX(16px);
            opacity: 0;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .rw-details {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Booked but not paid. Qualty collects the money: the customer pays Qualty and gives the
 * reference, the Qualty team confirms it. Companies only see whether the customer has paid.
 */
function PaymentPanel({ order, role }: { order: Order; role: Role }) {
  const [reference, setReference] = useState(order.paymentRef ?? "");
  const [problems, setProblems] = useState<string[]>([]);
  const inv = order.invoice;
  // What the Qualty team records against the invoice.
  const invoiceDue = inv ? invoiceTotal(inv) - invoicePaid(inv) : order.priceUSD ?? 0;
  // What the customer pays: always the customer's figure, never the company price.
  const customerDue = orderCustomerPrice(order);

  const sendRef = async () => {
    const p = await run(markPaymentSent(order.id, reference));
    setProblems(p ?? []);
  };
  const confirm = async () => {
    const p = await run(
      recordPayment(order.id, {
        amountUSD: invoiceDue,
        method: "Bank transfer",
        reference: order.paymentRef ?? "",
        receivedOn: new Date().toISOString().slice(0, 10),
      }),
    );
    setProblems(p ?? []);
  };

  const text: React.CSSProperties = { fontSize: "13.5px", color: "var(--text-secondary)" };

  return (
    <section aria-label="Payment" style={{ padding: "20px", borderTop: "1px solid var(--border-main)", display: "flex", flexDirection: "column", gap: "10px" }}>
      <h4 style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-main)" }}>
        {awaitingPayment(order) ? "Waiting for payment" : "Payment"}
      </h4>

      {role === "customer" ? (
        <>
          <p style={text}>
            {inv ? `Invoice ${inv.number}` : "Your invoice"}
            {customerDue !== undefined && (
              <>
                : <strong className="font-mono" style={{ color: "var(--text-main)" }}>{usd(customerDue)}</strong>
              </>
            )}
            {inv ? ` due by ${inv.dueOn}.` : "."} The chatroom opens for you and {order.inspectionCompany ?? "the inspection company"} once the
            payment is confirmed.
          </p>
          {order.paymentRef ? (
            <p role="status" style={{ fontSize: "13px", color: "var(--success-text)" }}>
              You sent payment reference {order.paymentRef}. The Qualty team confirms it, then the chatroom opens.
            </p>
          ) : (
            <>
              <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Pay Qualty by bank transfer or UPI, then enter the payment reference here.</p>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <input
                  aria-label="Payment reference"
                  placeholder="UTR or UPI reference"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  style={{ ...field, flex: "1 1 200px" }}
                />
                <button className="btn-primary" style={{ padding: "8px 16px", fontSize: "13px" }} onClick={() => void sendRef()}>
                  I have paid
                </button>
              </div>
            </>
          )}
        </>
      ) : role === "admin" ? (
        <>
          <p style={text}>
            {inv ? `Invoice ${inv.number}: ${usd(invoiceDue)} due by ${inv.dueOn}.` : `Amount due: ${usd(invoiceDue)}.`}{" "}
            {order.paymentRef
              ? `The customer says they paid on ${order.paymentSentOn ?? "today"} (ref ${order.paymentRef}). Check the Qualty account, then confirm.`
              : "The customer hasn't sent a payment reference yet."}
          </p>
          <div>
            <button className="btn-primary" style={{ padding: "8px 16px", fontSize: "13px" }} onClick={() => void confirm()}>
              Confirm payment received
            </button>
          </div>
        </>
      ) : (
        <p role="status" style={text}>
          {order.paidAt
            ? "Paid."
            : order.paymentRef
              ? "Waiting for the customer's payment. They have sent a reference and the Qualty team confirms it."
              : "Waiting for the customer's payment."}{" "}
          The chatroom opens for you and the customer once it is confirmed.
        </p>
      )}
      {problems.length > 0 && (
        <p role="alert" style={{ fontSize: "12.5px", color: "var(--danger-text)" }}>
          {problems.join(" ")}
        </p>
      )}
    </section>
  );
}

function Message({ m, evidence, mine }: { m: ChatMessage; evidence?: EvidenceRecord; mine: boolean }) {
  const time = clock(m.createdAt);

  if (m.kind === "system") {
    return (
      <p style={{ fontSize: "12px", color: "var(--text-muted)", textAlign: "center", maxWidth: "560px", margin: "0 auto", textWrap: "pretty" }}>
        {m.text}
      </p>
    );
  }

  if (m.kind === "flag") {
    const critical = m.severity === "critical";
    return (
      <div
        role="status"
        style={{
          display: "flex",
          gap: "8px",
          padding: "10px 12px",
          borderRadius: "8px",
          fontSize: "13px",
          backgroundColor: critical ? "var(--danger-bg)" : "var(--warning-bg)",
          border: `1px solid ${critical ? "var(--danger-border)" : "var(--warning-border)"}`,
          color: critical ? "var(--danger-text)" : "var(--warning-text)",
        }}
      >
        <Warning size={16} weight="fill" style={{ flexShrink: 0, marginTop: "2px" }} />
        <span>
          <strong>{critical ? "Critical flag" : "Flag"}</strong> · {m.text} <span style={{ opacity: 0.7 }}>{time}</span>
        </span>
      </div>
    );
  }

  if (m.kind === "summary") {
    return (
      <div style={{ padding: "14px", borderRadius: "10px", backgroundColor: "var(--bg-card)", border: "1px solid var(--accent-border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: 600, color: "var(--accent-text)", marginBottom: "8px" }}>
          <FileText size={16} weight="bold" /> Inspection summary, saved to the Vault
        </div>
        <pre className="font-mono" style={{ fontSize: "11.5px", whiteSpace: "pre-wrap", color: "var(--text-main)", margin: 0, lineHeight: 1.55 }}>
          {m.text}
        </pre>
        <DownloadSummary id={m.evidenceId} text={m.text} name={evidence?.fileName ?? `${m.orderId}-inspection-summary.txt`} />
      </div>
    );
  }

  const icon =
    m.kind === "observation" ? <Eye size={14} weight="bold" /> : m.kind === "dispatch" ? <Truck size={14} weight="bold" /> : m.kind === "media" ? <Camera size={14} weight="bold" /> : null;
  const kindLabel = m.kind === "observation" ? "Observation" : m.kind === "dispatch" ? "Dispatch" : m.kind === "media" ? "Evidence" : null;
  const ev = evidence;

  return (
    <div style={{ alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "min(520px, 92%)" }}>
      <div style={{ fontSize: "11.5px", color: "var(--text-muted)", marginBottom: "3px", textAlign: mine ? "right" : "left" }}>
        {m.author} · {time}
      </div>
      <div
        style={{
          padding: "10px 12px",
          borderRadius: "10px",
          fontSize: "13.5px",
          lineHeight: 1.5,
          backgroundColor: mine ? "var(--accent-light)" : "var(--bg-card)",
          border: `1px solid ${mine ? "var(--accent-border)" : "var(--border-main)"}`,
          color: "var(--text-main)",
        }}
      >
        {kindLabel && (
          <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11.5px", fontWeight: 600, color: "var(--accent-text)", marginBottom: "4px" }}>
            {icon} {kindLabel}
          </div>
        )}
        {ev && <div style={{ marginBottom: "6px" }}><EvidenceMedia record={ev} /></div>}
        <div style={{ whiteSpace: "pre-wrap" }}>{m.text}</div>
        {m.dispatch && (
          <div className="font-mono" style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px" }}>
            {m.dispatch.vehicleNo} · seal {m.dispatch.sealNo || "—"} · {m.dispatch.bags} bags · {m.dispatch.weightTons} t
          </div>
        )}
        {m.readings && Object.keys(m.readings).length > 0 && (
          <div className="font-mono" style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px" }}>
            {Object.entries(m.readings)
              .map(([k, v]) => `${k} ${v}`)
              .join(" · ")}
          </div>
        )}
        {ev && (
          <div className="font-mono" style={{ fontSize: "10.5px", color: "var(--text-muted)", marginTop: "4px", wordBreak: "break-all" }}>
            SHA-256 {ev.sha256.slice(0, 16)}…
          </div>
        )}
      </div>
    </div>
  );
}

function DownloadSummary({ id, text, name }: { id?: string; text: string; name: string }) {
  const download = async () => {
    const stored = id ? await getBlob(id).catch(() => null) : null;
    const b = stored ?? new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(b);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <button onClick={download} style={{ marginTop: "8px", fontSize: "12.5px", fontWeight: 600, color: "var(--accent-primary)", cursor: "pointer", textDecoration: "underline" }}>
      Download summary
    </button>
  );
}

function ComposerBar({ order, role, author, canReport }: { order: Order; role: Role; author: string; canReport: boolean }) {
  const [mode, setMode] = useState<Composer>("message");
  const [text, setText] = useState("");
  const [readings, setReadings] = useState({ broken: "", purity: "", moisture: "", damageKernel: "", liveInsects: "" });
  const [dispatch, setDispatch] = useState({ vehicleNo: "", sealNo: "", bags: "", weightTons: "" });
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const modes: { key: Composer; label: string; icon: React.ReactNode }[] = [
    { key: "message", label: "Message", icon: <ChatsCircle size={14} /> },
    ...(canReport
      ? ([
          { key: "observation", label: "Observation", icon: <Eye size={14} /> },
          { key: "dispatch", label: "Dispatch", icon: <Truck size={14} /> },
        ] as const)
      : []),
    { key: "media", label: "Photo or video", icon: <Camera size={14} /> },
  ];

  const reset = () => {
    setText("");
    setReadings({ broken: "", purity: "", moisture: "", damageKernel: "", liveInsects: "" });
    setDispatch({ vehicleNo: "", sealNo: "", bags: "", weightTons: "" });
    setFile(null);
  };

  // Returns false and shows the reason when a save fails.
  const save = async (p: Promise<void>) => {
    try {
      setBusy(true);
      await p;
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send. Try again.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const base = { orderId: order.id, role, author };
    if (mode === "message") {
      if (!text.trim()) return;
      if (!(await save(postMessage({ ...base, kind: "text", text: text.trim() })))) return;
    } else if (mode === "observation") {
      const r = Object.fromEntries(
        Object.entries(readings)
          .filter(([, v]) => v.trim() !== "")
          .map(([k, v]) => [k, Number(v)]),
      );
      if (!text.trim() && Object.keys(r).length === 0) return setError("Write what you saw or enter at least one reading.");
      if (!(await save(postMessage({ ...base, kind: "observation", text: text.trim() || "Sample readings", readings: r })))) return;
    } else if (mode === "dispatch") {
      if (!dispatch.vehicleNo.trim()) return setError("Enter the truck or container number.");
      const ok = await save(postMessage({
        ...base,
        kind: "dispatch",
        text: text.trim() || `Dispatched ${dispatch.vehicleNo.trim().toUpperCase()}`,
        dispatch: {
          vehicleNo: dispatch.vehicleNo.trim().toUpperCase(),
          sealNo: dispatch.sealNo.trim().toUpperCase(),
          bags: Number(dispatch.bags) || 0,
          weightTons: Number(dispatch.weightTons) || 0,
        },
      }));
      if (!ok) return;
    } else {
      if (!file) return setError("Choose or take a photo or video.");
      setBusy(true);
      try {
        await addEvidence({ orderId: order.id, file, caption: text.trim(), author, role });
      } catch (err) {
        setError(isRemote && err instanceof Error ? err.message : "Could not save that file. Try a JPEG, PNG or MP4.");
        setBusy(false);
        return;
      }
      setBusy(false);
    }
    reset();
  };

  return (
    <form onSubmit={send} style={{ padding: "12px 20px 16px", borderTop: "1px solid var(--border-main)", display: "flex", flexDirection: "column", gap: "10px" }}>
      <div role="tablist" aria-label="What are you posting" style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
        {modes.map((md) => (
          <button
            key={md.key}
            type="button"
            role="tab"
            aria-selected={mode === md.key}
            onClick={() => {
              setMode(md.key);
              setError(null);
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              padding: "6px 10px",
              minHeight: "32px",
              borderRadius: "999px",
              fontSize: "12.5px",
              fontWeight: 600,
              cursor: "pointer",
              color: mode === md.key ? "var(--accent-text)" : "var(--text-secondary)",
              backgroundColor: mode === md.key ? "var(--accent-light)" : "transparent",
              border: `1px solid ${mode === md.key ? "var(--accent-border)" : "var(--border-main)"}`,
            }}
          >
            {md.icon} {md.label}
          </button>
        ))}
      </div>

      {mode === "observation" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: "8px" }}>
          {(
            [
              ["broken", "Broken %"],
              ["purity", "Purity %"],
              ["moisture", "Moisture %"],
              ["damageKernel", "Damaged %"],
              ["liveInsects", "Live insects"],
            ] as const
          ).map(([k, label]) => (
            <label key={k} style={{ display: "flex", flexDirection: "column", gap: "3px", fontSize: "11.5px", color: "var(--text-muted)" }}>
              {label}
              <input type="number" step="0.01" inputMode="decimal" value={readings[k]} onChange={(e) => setReadings({ ...readings, [k]: e.target.value })} style={field} />
            </label>
          ))}
        </div>
      )}

      {mode === "dispatch" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "8px" }}>
          {(
            [
              ["vehicleNo", "Truck / container no.", "text"],
              ["sealNo", "Seal no.", "text"],
              ["bags", "Bags", "number"],
              ["weightTons", "Weight (t)", "number"],
            ] as const
          ).map(([k, label, type]) => (
            <label key={k} style={{ display: "flex", flexDirection: "column", gap: "3px", fontSize: "11.5px", color: "var(--text-muted)" }}>
              {label}
              <input type={type} step="0.01" value={dispatch[k]} onChange={(e) => setDispatch({ ...dispatch, [k]: e.target.value })} style={field} />
            </label>
          ))}
        </div>
      )}

      {mode === "media" && (
        <label style={{ display: "flex", flexDirection: "column", gap: "3px", fontSize: "11.5px", color: "var(--text-muted)" }}>
          Photo or video. Date, time, GPS and the order number are stamped on it.
          <input type="file" accept="image/*,video/*" capture="environment" onChange={(e) => setFile(e.target.files?.[0] ?? null)} style={{ fontSize: "13px" }} />
        </label>
      )}

      <div style={{ display: "flex", gap: "8px" }}>
        <input
          type="text"
          aria-label="Message"
          placeholder={
            mode === "observation"
              ? "What did you see? (e.g. Hold 3 dry, slight musty odour)"
              : mode === "dispatch"
                ? "Note (optional)"
                : mode === "media"
                  ? "Caption: include the truck or container no."
                  : `Message as ${ROLE_LABEL[role]}`
          }
          value={text}
          onChange={(e) => setText(e.target.value)}
          style={{ ...field, flex: 1, padding: "10px 12px" }}
        />
        <button type="submit" className="btn-primary" disabled={busy} style={{ padding: "10px 16px", fontSize: "13px" }}>
          {busy ? <SpinnerGap size={16} className="animate-spin" /> : <PaperPlaneRight size={16} weight="bold" />}
          <span>{busy ? "Stamping…" : "Send"}</span>
        </button>
      </div>
      {error && (
        <p role="alert" style={{ fontSize: "12.5px", color: "var(--danger-text)" }}>
          {error}
        </p>
      )}
      {!canReport && order.status !== "enquiry" && (
        <p style={{ fontSize: "11.5px", color: "var(--text-muted)" }}>
          Switch to Inspector or Inspection company to post observations and dispatch reports.
        </p>
      )}
    </form>
  );
}

function BidActions({ order, bid, role }: { order: Order; bid: Bid; role: Role }) {
  const [mode, setMode] = useState<"counter" | "discount" | "follow" | null>(null);
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const isCompany = role === "company";
  const close = () => {
    setMode(null);
    setValue("");
    setNote("");
  };
  const apply = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "counter" && Number(value) > 0) void run(counterBid(order.id, bid.id, isCompany ? "company" : "customer", Number(value), note));
    if (mode === "discount" && Number(value) >= 0 && Number(value) < 100) void run(discountBid(order.id, bid.id, Number(value)));
    if (mode === "follow") void run(setFollowUp(order.id, bid.id, value));
    close();
  };
  const link: React.CSSProperties = { fontSize: "12px", fontWeight: 600, color: "var(--accent-primary)", cursor: "pointer", background: "none", border: "none", padding: 0, textDecoration: "underline" };
  return (
    <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: "6px" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
        <button type="button" style={link} onClick={() => setMode(mode === "counter" ? null : "counter")}>
          {isCompany ? "Revise price" : "Counter-offer"}
        </button>
        {isCompany && (
          <>
            <button type="button" style={link} onClick={() => setMode(mode === "discount" ? null : "discount")}>Give a discount</button>
            <button type="button" style={link} onClick={() => setMode(mode === "follow" ? null : "follow")}>Set follow-up</button>
            <button type="button" style={{ ...link, color: "var(--danger-text)" }} onClick={() => void run(withdrawBid(order.id, bid.id))}>Withdraw</button>
          </>
        )}
      </div>
      {mode && (
        <form onSubmit={apply} style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          <input
            required
            autoFocus
            type={mode === "follow" ? "date" : "number"}
            min={0}
            max={mode === "discount" ? 99 : undefined}
            step="any"
            aria-label={mode === "counter" ? "Offer in USD" : mode === "discount" ? "Discount on this bid in percent" : "Follow-up date"}
            placeholder={mode === "counter" ? "Price (USD)" : mode === "discount" ? "Discount %" : ""}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            style={{ ...field, flex: "0 1 140px" }}
          />
          {mode === "counter" && (
            <input aria-label="Note" placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} style={{ ...field, flex: "1 1 160px" }} />
          )}
          <button type="submit" className="btn-primary" style={{ padding: "7px 12px", fontSize: "12.5px" }}>
            {mode === "counter" ? "Send offer" : mode === "discount" ? "Apply discount" : "Save date"}
          </button>
          <button type="button" style={link} onClick={close}>Cancel</button>
        </form>
      )}
    </div>
  );
}

/**
 * Bids on an enquiry. Customers see customer prices (with the Qualty margin), companies and the
 * Qualty team see company prices. The store only fills the reader's side on the backend.
 */
function Bids({ order, role }: { order: Order; role: Role }) {
  const [form, setForm] = useState({ company: "", price: "", days: "", scope: "", discount: "", date: "" });
  const open = order.status === "enquiry";
  const live = order.bids.filter((b) => b.status !== "withdrawn");
  const asCustomer = role === "customer";
  const price = (b: Bid) => (asCustomer ? bidCustomerPrice(b) : bidNet(b));
  return (
    <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border-main)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: 600, color: "var(--text-main)", marginBottom: "10px" }}>
        <Gavel size={16} weight="bold" /> Bids ({live.length})
      </div>
      {order.bids.length === 0 && (
        <p style={{ fontSize: "12.5px", color: "var(--text-muted)", marginBottom: "10px" }}>
          No bids yet. Inspection companies see this enquiry and bid here.
        </p>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: open && role === "company" ? "12px" : 0 }}>
        {[...order.bids]
          .sort((a, b) => Number(a.status === "withdrawn") - Number(b.status === "withdrawn") || price(a) - price(b))
          .map((b) => {
            const last = b.rounds?.[b.rounds.length - 1];
            const mineBid = !isRemote || role !== "company" || myCompanyIds(["owner", "sales"]).includes(b.companyId ?? "");
            const negotiable = open && b.status === "open" && (role === "company" || role === "customer") && mineBid;
            return (
              <div
                key={b.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: "8px",
                  alignItems: "center",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: `1px solid ${b.status === "accepted" ? "var(--success-border)" : "var(--border-main)"}`,
                  backgroundColor: b.status === "accepted" ? "var(--success-bg)" : "var(--bg-card)",
                  opacity: b.status === "declined" || b.status === "withdrawn" ? 0.6 : 1,
                }}
              >
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-main)" }}>
                    {b.company}
                    {b.status === "withdrawn" && <span style={{ fontWeight: 400, color: "var(--text-muted)" }}> · withdrawn</span>}
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                    <span className="font-mono" style={{ fontVariantNumeric: "tabular-nums" }}>{usd(price(b))}</span>
                    {b.discountPct ? (
                      <span style={{ color: "var(--success-text)" }}>
                        {" "}
                        {asCustomer ? (
                          `(${b.discountPct}% off)`
                        ) : (
                          <>
                            ({b.discountPct}% off <s>{usd(b.priceUSD)}</s>)
                          </>
                        )}
                      </span>
                    ) : null}
                    {" "}· {b.days} day(s)
                    {b.proposedDate && ` · inspects ${b.proposedDate}`}
                    {b.scope && ` · ${b.scope}`}
                  </div>
                  {last?.by === "customer" && b.status === "open" && (
                    <div style={{ fontSize: "12px", color: "var(--warning-text)", marginTop: "2px" }}>
                      {asCustomer ? `You asked for ${usd(roundCustomerPrice(last))}` : `Customer asked for ${usd(last.priceUSD)}`}
                      {last.note && `: "${last.note}"`}
                    </div>
                  )}
                  {b.followUpOn && b.status === "open" && role === "company" && (
                    <div style={{ fontSize: "11.5px", color: "var(--text-muted)", marginTop: "2px" }}>Follow up on {b.followUpOn}</div>
                  )}
                </div>
                {b.status === "accepted" ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "var(--success-text)" }}>
                    <ShieldCheck size={14} weight="bold" /> Accepted
                  </span>
                ) : open && role === "customer" && b.status === "open" ? (
                  <button className="btn-primary" onClick={() => void run(acceptBid(order.id, b.id))} style={{ padding: "7px 14px", fontSize: "12.5px" }}>
                    Accept bid
                  </button>
                ) : null}
                {negotiable && <BidActions order={order} bid={b} role={role} />}
              </div>
            );
          })}
      </div>
      {open && role === "company" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const discount = Number(form.discount) || 0;
            if ((!isRemote && !form.company.trim()) || !(Number(form.price) > 0) || discount < 0 || discount >= 100) return;
            void run(submitBid(order.id, {
              company: form.company.trim(),
              priceUSD: Number(form.price),
              days: Number(form.days) || 1,
              scope: form.scope.trim(),
              discountPct: discount || undefined,
              proposedDate: form.date || undefined,
            }));
            setForm({ company: "", price: "", days: "", scope: "", discount: "", date: "" });
          }}
          style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "8px" }}
        >
          {!isRemote && (
            <input required aria-label="Your company" placeholder="Your company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} style={field} />
          )}
          <input required type="number" min={1} aria-label="Price in USD" placeholder="Price (USD)" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} style={field} />
          <input type="number" min={0} max={99} aria-label="Discount in percent" placeholder="Discount % (optional)" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} style={field} />
          <input type="number" min={1} aria-label="Days" placeholder="Days" value={form.days} onChange={(e) => setForm({ ...form, days: e.target.value })} style={field} />
          <input type="date" aria-label="Proposed inspection date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} style={field} />
          <input aria-label="Scope" placeholder="Scope (e.g. 2 surveyors, lab)" value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })} style={field} />
          <button type="submit" className="btn-primary" style={{ padding: "8px 14px", fontSize: "12.5px" }}>
            Submit bid
          </button>
        </form>
      )}
      {open && role !== "company" && role !== "customer" && (
        <p style={{ fontSize: "11.5px", color: "var(--text-muted)" }}>Switch to Inspection company to bid, or Customer to accept a bid.</p>
      )}
    </div>
  );
}
