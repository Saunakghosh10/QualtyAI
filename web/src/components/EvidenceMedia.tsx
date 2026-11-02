"use client";

import React, { useEffect, useState } from "react";
import { getBlob, type EvidenceRecord } from "@/lib/store";

// Loads a stored evidence file from IndexedDB and renders it.
export function useEvidenceUrl(id: string | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!id) return;
    let objectUrl: string | null = null;
    let cancelled = false;
    getBlob(id)
      .then((b) => {
        if (b && !cancelled) {
          objectUrl = URL.createObjectURL(b);
          setUrl(objectUrl);
        }
      })
      .catch(() => setUrl(null));
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id]);
  return url;
}

export function stampLines(e: EvidenceRecord) {
  return [
    e.orderId,
    new Date(e.capturedAt).toLocaleString(),
    e.gps ? `GPS ${e.gps.lat.toFixed(5)}, ${e.gps.lng.toFixed(5)} (±${e.gps.accuracy} m)` : "No GPS",
  ];
}

export default function EvidenceMedia({ record, height = 180 }: { record: EvidenceRecord; height?: number }) {
  const url = useEvidenceUrl(record.id);
  const frame: React.CSSProperties = {
    position: "relative",
    width: "100%",
    height,
    borderRadius: "8px",
    overflow: "hidden",
    backgroundColor: "var(--bg-inset)",
    outline: "1px solid oklch(0 0 0 / 0.1)",
    outlineOffset: "-1px",
  };
  if (!url) return <div style={frame} aria-label="Loading evidence" />;
  if (record.kind === "video") {
    return (
      <div style={frame}>
        <video src={url} controls style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        {/* Videos keep their original bytes; the stamp is shown on top of them. */}
        <div
          className="font-mono"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            padding: "6px 8px",
            fontSize: "10.5px",
            color: "#fff",
            backgroundColor: "rgba(0,0,0,0.6)",
            pointerEvents: "none",
          }}
        >
          {stampLines(record).join("  ·  ")}
        </div>
      </div>
    );
  }
  if (record.kind === "photo") {
    return (
      <div style={frame}>
        {/* eslint-disable-next-line @next/next/no-img-element -- local object URL */}
        <img src={url} alt={record.caption || record.fileName} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
      </div>
    );
  }
  return (
    <a href={url} download={record.fileName} style={{ fontSize: "13px", color: "var(--accent-primary)" }}>
      Download {record.fileName}
    </a>
  );
}
