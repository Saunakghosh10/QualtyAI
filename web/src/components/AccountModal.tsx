"use client";

import React, { useEffect, useState } from "react";
import { X } from "@phosphor-icons/react";
import { signIn, signUp } from "@/lib/store";

const field: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: "8px",
  border: "1px solid var(--border-main)",
  backgroundColor: "var(--bg-card)",
  color: "var(--text-main)",
  fontSize: "14px",
  width: "100%",
};
const label: React.CSSProperties = { display: "flex", flexDirection: "column", gap: "4px", fontSize: "12.5px", color: "var(--text-secondary)" };

/** Sign in or create an account. Opens on the "qualty:open-auth" event. Only used with the Supabase backend. */
export default function AccountModal() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [f, setF] = useState({ name: "", email: "", password: "", asCompany: false });
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const on = () => {
      setOpen(true);
      setError(null);
      setNotice(null);
    };
    window.addEventListener("qualty:open-auth", on);
    return () => window.removeEventListener("qualty:open-auth", on);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (mode === "signup" && !f.name.trim()) return setError("Add your name.");
    if (f.password.length < 8) return setError("Passwords need at least 8 characters.");
    setBusy(true);
    try {
      if (mode === "signin") {
        await signIn(f.email, f.password);
        setOpen(false);
      } else {
        const r = await signUp({ name: f.name, email: f.email, password: f.password, asCompany: f.asCompany });
        if (r.needsConfirmation) {
          setNotice(`We sent a confirmation link to ${f.email.trim()}. Open it, then sign in here.`);
          setMode("signin");
        } else setOpen(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      onClick={() => setOpen(false)}
      style={{ position: "fixed", inset: 0, zIndex: 90, backgroundColor: "var(--modal-backdrop)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-title"
        onClick={(e) => e.stopPropagation()}
        className="card-shell"
        style={{ width: "100%", maxWidth: "420px", padding: "24px", backgroundColor: "var(--bg-card)" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
          <h2 id="account-title" className="font-heading" style={{ fontSize: "20px", fontWeight: 700, color: "var(--text-main)" }}>
            {mode === "signin" ? "Sign in to Qualty" : "Create your account"}
          </h2>
          <button aria-label="Close" onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
            <X size={18} />
          </button>
        </div>
        <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "16px" }}>
          {mode === "signin"
            ? "Your orders, chatrooms and company console are saved to your account."
            : "Invited to a company's team? Use the email you were invited with and you'll join it automatically."}
        </p>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {mode === "signup" && (
            <label style={label}>
              Your name
              <input autoComplete="name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} style={field} />
            </label>
          )}
          <label style={label}>
            Email
            <input required type="email" autoComplete="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} style={field} />
          </label>
          <label style={label}>
            Password
            <input
              required
              type="password"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              value={f.password}
              onChange={(e) => setF({ ...f, password: e.target.value })}
              style={field}
            />
          </label>
          {mode === "signup" && (
            <label style={{ display: "flex", gap: "8px", alignItems: "center", fontSize: "13px", color: "var(--text-secondary)" }}>
              <input type="checkbox" checked={f.asCompany} onChange={(e) => setF({ ...f, asCompany: e.target.checked })} />
              I run an inspection company
            </label>
          )}
          {error && (
            <p role="alert" style={{ fontSize: "13px", color: "var(--danger-text)" }}>
              {error}
            </p>
          )}
          {notice && (
            <p role="status" style={{ fontSize: "13px", color: "var(--success-text)" }}>
              {notice}
            </p>
          )}
          <button type="submit" disabled={busy} className="btn-primary" style={{ padding: "11px 18px", fontSize: "14px", justifyContent: "center" }}>
            {busy ? "Please wait..." : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>
        <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "14px", textAlign: "center" }}>
          {mode === "signin" ? "New to Qualty? " : "Already have an account? "}
          <button
            type="button"
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setError(null);
            }}
            style={{ background: "none", border: "none", padding: 0, color: "var(--accent-primary)", fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}
          >
            {mode === "signin" ? "Create an account" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}
