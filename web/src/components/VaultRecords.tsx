"use client";

import React, { useMemo, useState } from "react";
import { DownloadSimple, FileText } from "@phosphor-icons/react";
import { useDB, getBlob, sha256Hex, type EvidenceRecord } from "@/lib/store";
import EvidenceMedia, { stampLines } from "./EvidenceMedia";

const field: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: "8px",
  border: "1px solid var(--border-main)",
  backgroundColor: "var(--bg-card)",
  color: "var(--text-main)",
  fontSize: "13px",
  minWidth: 0,
};

// Real evidence from order chatrooms: photos, videos and summaries, per order.
export default function VaultRecords() {
  const db = useDB();
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [checks, setChecks] = useState<Record<string, "ok" | "changed" | "missing">>({});

  const orderById = useMemo(() => new Map(db.orders.map((o) => [o.id, o])), [db.orders]);

  const items = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return db.evidence
      .filter((e) => {
        const o = orderById.get(e.orderId);
        const day = e.capturedAt.slice(0, 10);
        if (from && day < from) return false;
        if (to && day > to) return false;
        if (!needle) return true;
        return [e.orderId, e.caption, e.fileName, o?.commodity, o?.buyer.name, o?.seller.name, o?.location]
          .filter(Boolean)
          .some((s) => String(s).toLowerCase().includes(needle));
      })
      .sort((a, b) => b.capturedAt.localeCompare(a.capturedAt));
  }, [db.evidence, orderById, q, from, to]);

  const verify = async (e: EvidenceRecord) => {
    const blob = await getBlob(e.id);
    if (!blob) return setChecks((c) => ({ ...c, [e.id]: "missing" }));
    const hash = await sha256Hex(await blob.arrayBuffer());
    setChecks((c) => ({ ...c, [e.id]: hash === e.sha256 ? "ok" : "changed" }));
  };

  const exportIndex = () => {
    const rows = [["order", "kind", "file", "captured_at", "gps", "author", "caption", "sha256"]];
    items.forEach((e) =>
      rows.push([
        e.orderId,
        e.kind,
        e.fileName,
        e.capturedAt,
        e.gps ? `${e.gps.lat},${e.gps.lng}` : "",
        e.author,
        e.caption,
        e.sha256,
      ]),
    );
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "qualty-evidence-index.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="card-shell" style={{ padding: "20px 24px", marginBottom: "36px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap", marginBottom: "14px" }}>
        <div>
          <h3 className="font-heading" style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-main)" }}>
            Your inspection evidence
          </h3>
          <p style={{ fontSize: "12.5px", color: "var(--text-muted)" }}>
            Everything posted in your order chatrooms, with its date, time and GPS stamp and a SHA-256 hash of the file.
          </p>
        </div>
        {items.length > 0 && (
          <button className="btn-secondary" onClick={exportIndex} style={{ padding: "8px 14px", fontSize: "12.5px" }}>
            <DownloadSimple size={15} weight="bold" /> Export index (CSV)
          </button>
        )}
      </div>

      {db.evidence.length === 0 ? (
        <p style={{ fontSize: "13.5px", color: "var(--text-secondary)" }}>
          Nothing yet. Photos and videos posted in an order chatroom, and the summary written when an inspection closes, are kept
          here. The examples below show what a finished record looks like.
        </p>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "8px", marginBottom: "16px" }}>
            <input aria-label="Search evidence" placeholder="Order no., buyer, commodity, caption" value={q} onChange={(e) => setQ(e.target.value)} style={{ ...field, gridColumn: "span 2" }} />
            <label style={{ display: "flex", flexDirection: "column", gap: "2px", fontSize: "11.5px", color: "var(--text-muted)" }}>
              From
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={field} />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: "2px", fontSize: "11.5px", color: "var(--text-muted)" }}>
              To
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={field} />
            </label>
          </div>

          {items.length === 0 ? (
            <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>No evidence matches these filters.</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "14px" }}>
              {items.map((e) => {
                const o = orderById.get(e.orderId);
                const check = checks[e.id];
                return (
                  <article key={e.id} style={{ border: "1px solid var(--border-main)", borderRadius: "10px", padding: "10px", backgroundColor: "var(--bg-card)", display: "flex", flexDirection: "column", gap: "6px" }}>
                    {e.kind === "report" ? (
                      <div style={{ height: 140, borderRadius: "8px", backgroundColor: "var(--bg-subtle)", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", color: "var(--accent-text)", fontSize: "13px", fontWeight: 600 }}>
                        <FileText size={20} weight="bold" /> Inspection summary
                      </div>
                    ) : (
                      <EvidenceMedia record={e} height={140} />
                    )}
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-main)" }}>{e.caption || e.fileName}</div>
                    <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                      {e.orderId}
                      {o ? ` · ${o.commodity} · Buyer ${o.buyer.name}` : ""}
                    </div>
                    <div className="font-mono" style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                      {stampLines(e).slice(1).join(" · ")}
                    </div>
                    <div className="font-mono" style={{ fontSize: "10.5px", color: "var(--text-muted)", wordBreak: "break-all" }}>
                      SHA-256 {e.sha256 || "pending"}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      <button onClick={() => verify(e)} style={{ fontSize: "12px", fontWeight: 600, color: "var(--accent-primary)", cursor: "pointer", textDecoration: "underline", minHeight: "28px" }}>
                        Check file is unchanged
                      </button>
                      {check && (
                        <span role="status" style={{ fontSize: "12px", color: check === "ok" ? "var(--success-text)" : "var(--danger-text)" }}>
                          {check === "ok" ? "Hash matches" : check === "changed" ? "Hash does not match" : "File not found"}
                        </span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
