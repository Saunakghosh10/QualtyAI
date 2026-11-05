"use client";

import React, { useEffect, useState } from "react";

export default function Toaster() {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const on = (e: Event) => {
      setMsg((e as CustomEvent<string>).detail);
      clearTimeout(t);
      t = setTimeout(() => setMsg(null), 6000);
    };
    window.addEventListener("qualty:toast", on);
    return () => {
      window.removeEventListener("qualty:toast", on);
      clearTimeout(t);
    };
  }, []);
  if (!msg) return null;
  return (
    <div
      role="alert"
      style={{
        position: "fixed",
        left: "50%",
        bottom: "24px",
        transform: "translateX(-50%)",
        zIndex: 100,
        maxWidth: "min(560px, calc(100vw - 32px))",
        padding: "12px 16px",
        borderRadius: "10px",
        backgroundColor: "var(--danger-fill)",
        color: "#fff",
        fontSize: "13.5px",
        boxShadow: "var(--shadow-lg)",
        display: "flex",
        gap: "12px",
        alignItems: "center",
      }}
    >
      <span style={{ flex: 1 }}>{msg}</span>
      <button onClick={() => setMsg(null)} aria-label="Dismiss" style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", fontSize: "16px" }}>
        ×
      </button>
    </div>
  );
}
