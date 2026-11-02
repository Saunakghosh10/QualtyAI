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
} from "@phosphor-icons/react";
import {
  useDB,
  ROLE_LABEL,
  REQUIRED_CHECKS,
  postMessage,
  addEvidence,
  submitBid,
  acceptBid,
  completeInspection,
  setPartyVerified,
  describeSpec,
  getBlob,
  type Role,
  type Order,
  type ChatMessage,
  type Party,
  type EvidenceRecord,
} from "@/lib/store";
import EvidenceMedia from "./EvidenceMedia";

type Composer = "message" | "observation" | "dispatch" | "media";

const STATUS_LABEL: Record<Order["status"], string> = {
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

export default function OrderRooms({ onBook }: { onBook: () => void }) {
  const db = useDB();
  const orders = db.orders;
  const [activeId, setActiveId] = useState<string | null>(null);
  const [role, setRole] = useState<Role>("customer");

  useEffect(() => {
    const open = (e: Event) => setActiveId((e as CustomEvent<string>).detail);
    window.addEventListener("qualty:open-order", open);
    return () => window.removeEventListener("qualty:open-order", open);
  }, []);

  const active = orders.find((o) => o.id === activeId) ?? orders[0] ?? null;

  return (
    <section id="orders" style={{ padding: "clamp(48px, 7vw, 80px) 20px", maxWidth: "1280px", margin: "0 auto" }}>
      <div style={{ maxWidth: "720px", marginBottom: "28px" }}>
        <h2 className="font-heading" style={{ fontSize: "clamp(26px, 3.4vw, 36px)", fontWeight: 700, color: "var(--text-main)", textWrap: "balance" }}>
          Every order gets its own chatroom
        </h2>
        <p style={{ fontSize: "15px", color: "var(--text-secondary)", lineHeight: 1.6, marginTop: "10px", textWrap: "pretty" }}>
          The customer, the inspection company and the Qualty admin team are added when the order is placed. Inspectors report
          here: observations, truck and container dispatch, photos and videos. Readings outside the booked spec are flagged
          automatically, and closing the inspection writes the summary into the Quality Evidence Vault.
        </p>
      </div>

      {orders.length === 0 ? (
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
          {/* Order list */}
          <nav aria-label="Orders" className="card-shell" style={{ flex: "1 1 260px", maxWidth: "100%", padding: "8px", display: "flex", flexDirection: "column", gap: "4px" }}>
            {orders.map((o) => {
              const isActive = o.id === active?.id;
              const flags = db.messages.filter((m) => m.orderId === o.id && m.kind === "flag").length;
              return (
                <button
                  key={o.id}
                  onClick={() => setActiveId(o.id)}
                  aria-current={isActive ? "true" : undefined}
                  style={{
                    textAlign: "left",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    backgroundColor: isActive ? "var(--accent-light)" : "transparent",
                    border: isActive ? "1px solid var(--accent-border)" : "1px solid transparent",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "8px" }}>
                    <span className="font-mono" style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-main)" }}>{o.id}</span>
                    <span style={{ fontSize: "11.5px", color: o.status === "completed" ? "var(--success-text)" : "var(--text-muted)" }}>
                      {STATUS_LABEL[o.status]}
                    </span>
                  </div>
                  <div style={{ fontSize: "12.5px", color: "var(--text-secondary)", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {o.commodity}
                  </div>
                  {flags > 0 && (
                    <div style={{ fontSize: "11.5px", color: "var(--warning-text)", marginTop: "2px" }}>
                      {flags} flag{flags === 1 ? "" : "s"}
                    </div>
                  )}
                </button>
              );
            })}
          </nav>

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

function Room({ order, role, setRole }: { order: Order; role: Role; setRole: (r: Role) => void }) {
  const db = useDB();
  const messages = useMemo(() => db.messages.filter((m) => m.orderId === order.id), [db.messages, order.id]);
  const evidence = useMemo(() => db.evidence.filter((e) => e.orderId === order.id), [db.evidence, order.id]);
  const evidenceById = useMemo(() => new Map(evidence.map((e) => [e.id, e])), [evidence]);
  const threadRef = useRef<HTMLDivElement>(null);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});

  const memberName = (r: Role) =>
    r === "inspector"
      ? `Inspector${order.inspectionCompany ? ` (${order.inspectionCompany})` : ""}`
      : order.members.find((m) => m.role === r)?.name ?? ROLE_LABEL[r];

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight });
  }, [messages.length]);

  const closed = order.status === "completed";
  const canReport = (role === "inspector" || role === "company" || role === "admin") && !closed && order.status !== "enquiry";

  return (
    <div className="card-shell" style={{ flex: "999 1 480px", minWidth: 0, padding: 0, overflow: "hidden" }}>
      {/* Header */}
      <header style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-main)", display: "flex", flexDirection: "column", gap: "8px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <div>
            <h3 className="font-mono" style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-main)" }}>{order.id}</h3>
            <p style={{ fontSize: "12.5px", color: "var(--text-secondary)" }}>
              {order.service} · {order.location} · {order.volumeTons.toLocaleString()} t · {order.inspectionDate}
            </p>
          </div>
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
        </div>
        <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
          Members: {order.members.map((m) => `${m.name} (${ROLE_LABEL[m.role]})`).join(", ")}
        </div>
        <PartyLine label="Buyer" party={order.buyer} canVerify={role === "admin"} onVerify={() => setPartyVerified(order.id, "buyer")} />
        <PartyLine label="Seller" party={order.seller} canVerify={role === "admin"} onVerify={() => setPartyVerified(order.id, "seller")} />
        {order.spec && (
          <p style={{ fontSize: "12px", color: "var(--accent-text)" }}>
            Booked spec{order.specLabel ? ` (${order.specLabel})` : ""}: {describeSpec(order.spec)}
          </p>
        )}
      </header>

      {order.mode === "inquiry" && <Bids order={order} role={role} />}

      {/* Thread */}
      <div ref={threadRef} role="log" aria-label={`Chat for ${order.id}`} style={{ maxHeight: "460px", overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: "10px", backgroundColor: "var(--bg-subtle)" }}>
        {messages.map((m) => (
          <Message key={m.id} m={m} evidence={m.evidenceId ? evidenceById.get(m.evidenceId) : undefined} mine={m.role === role} />
        ))}
      </div>

      {/* Composer */}
      {closed ? (
        <p style={{ padding: "14px 20px", fontSize: "13px", color: "var(--text-muted)", borderTop: "1px solid var(--border-main)" }}>
          This inspection is closed. The summary and evidence are in the Quality Evidence Vault.
        </p>
      ) : (
        <ComposerBar order={order} role={role} author={memberName(role)} canReport={canReport} />
      )}

      {/* Completion checklist */}
      {canReport && (role === "inspector" || role === "admin") && (
        <div style={{ padding: "14px 20px", borderTop: "1px solid var(--border-main)" }}>
          <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-main)", marginBottom: "8px" }}>Before you close the inspection</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px", marginBottom: "12px" }}>
            {REQUIRED_CHECKS.map((c) => (
              <label key={c} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12.5px", color: "var(--text-secondary)", minHeight: "28px" }}>
                <input type="checkbox" checked={!!checklist[c]} onChange={(e) => setChecklist({ ...checklist, [c]: e.target.checked })} />
                {c}
              </label>
            ))}
          </div>
          <button className="btn-primary" style={{ padding: "9px 18px", fontSize: "13px" }} onClick={() => completeInspection(order.id, checklist)}>
            <CheckCircle size={16} weight="bold" /> Close inspection and write summary
          </button>
          <p style={{ fontSize: "11.5px", color: "var(--text-muted)", marginTop: "6px" }}>Unticked items are flagged as missing in the summary.</p>
        </div>
      )}
    </div>
  );
}

function Message({ m, evidence, mine }: { m: ChatMessage; evidence?: EvidenceRecord; mine: boolean }) {
  const time = new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

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
        <DownloadSummary id={m.evidenceId} text={m.text} name={`${m.orderId}-inspection-summary.txt`} />
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

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const base = { orderId: order.id, role, author };
    if (mode === "message") {
      if (!text.trim()) return;
      postMessage({ ...base, kind: "text", text: text.trim() });
    } else if (mode === "observation") {
      const r = Object.fromEntries(
        Object.entries(readings)
          .filter(([, v]) => v.trim() !== "")
          .map(([k, v]) => [k, Number(v)]),
      );
      if (!text.trim() && Object.keys(r).length === 0) return setError("Write what you saw or enter at least one reading.");
      postMessage({ ...base, kind: "observation", text: text.trim() || "Sample readings", readings: r });
    } else if (mode === "dispatch") {
      if (!dispatch.vehicleNo.trim()) return setError("Enter the truck or container number.");
      postMessage({
        ...base,
        kind: "dispatch",
        text: text.trim() || `Dispatched ${dispatch.vehicleNo.trim().toUpperCase()}`,
        dispatch: {
          vehicleNo: dispatch.vehicleNo.trim().toUpperCase(),
          sealNo: dispatch.sealNo.trim().toUpperCase(),
          bags: Number(dispatch.bags) || 0,
          weightTons: Number(dispatch.weightTons) || 0,
        },
      });
    } else {
      if (!file) return setError("Choose or take a photo or video.");
      setBusy(true);
      try {
        await addEvidence({ orderId: order.id, file, caption: text.trim(), author, role });
      } catch {
        setError("Could not save that file. Try a JPEG, PNG or MP4.");
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

function Bids({ order, role }: { order: Order; role: Role }) {
  const [form, setForm] = useState({ company: "", price: "", days: "", scope: "" });
  const open = order.status === "enquiry";
  return (
    <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border-main)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: 600, color: "var(--text-main)", marginBottom: "10px" }}>
        <Gavel size={16} weight="bold" /> Bids ({order.bids.length})
      </div>
      {order.bids.length === 0 && (
        <p style={{ fontSize: "12.5px", color: "var(--text-muted)", marginBottom: "10px" }}>
          No bids yet. Inspection companies see this enquiry and bid here.
        </p>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: open && role === "company" ? "12px" : 0 }}>
        {[...order.bids]
          .sort((a, b) => a.priceUSD - b.priceUSD)
          .map((b) => (
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
                opacity: b.status === "declined" ? 0.6 : 1,
              }}
            >
              <div>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-main)" }}>{b.company}</div>
                <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                  <span className="font-mono" style={{ fontVariantNumeric: "tabular-nums" }}>${b.priceUSD.toLocaleString()}</span> · {b.days} day(s)
                  {b.scope && ` · ${b.scope}`}
                </div>
              </div>
              {b.status === "accepted" ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "var(--success-text)" }}>
                  <ShieldCheck size={14} weight="bold" /> Accepted
                </span>
              ) : open && role === "customer" ? (
                <button className="btn-primary" onClick={() => acceptBid(order.id, b.id)} style={{ padding: "7px 14px", fontSize: "12.5px" }}>
                  Accept bid
                </button>
              ) : null}
            </div>
          ))}
      </div>
      {open && role === "company" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!form.company.trim() || !Number(form.price)) return;
            submitBid(order.id, { company: form.company.trim(), priceUSD: Number(form.price), days: Number(form.days) || 1, scope: form.scope.trim() });
            setForm({ company: "", price: "", days: "", scope: "" });
          }}
          style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "8px" }}
        >
          <input required aria-label="Your company" placeholder="Your company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} style={field} />
          <input required type="number" aria-label="Price in USD" placeholder="Price (USD)" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} style={field} />
          <input type="number" aria-label="Days" placeholder="Days" value={form.days} onChange={(e) => setForm({ ...form, days: e.target.value })} style={field} />
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
