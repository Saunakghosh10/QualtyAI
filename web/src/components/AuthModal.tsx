"use client";

import React, { useState } from "react";
import {
  X,
  Buildings,
  UserCheck,
  ShieldCheck,
  CheckCircle,
  ArrowRight,
  IdentificationBadge,
  SpinnerGap,
  Sparkle,
} from "@phosphor-icons/react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess?: (user: { name: string; role: "receiver" | "provider"; kycStatus: string }) => void;
}

export default function AuthModal({ isOpen, onClose, onLoginSuccess }: AuthModalProps) {
  const [role, setRole] = useState<"receiver" | "provider">("receiver");
  const [mode, setMode] = useState<"login" | "register">("register");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [taxIdOrLicense, setTaxIdOrLicense] = useState("");
  const [country, setCountry] = useState("India");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setIsSuccess(true);
      if (onLoginSuccess) {
        onLoginSuccess({
          name: companyName || email.split("@")[0],
          role,
          kycStatus: "SANDBOX_BASIC_VERIFIED",
        });
      }
    }, 1000);
  };

  const handleReset = () => {
    setIsSuccess(false);
    onClose();
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 120,
        backgroundColor: "var(--modal-backdrop)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="card-shell"
        style={{
          width: "100%",
          maxWidth: "520px",
          padding: "28px",
          backgroundColor: "var(--bg-card)",
          boxShadow: "var(--shadow-xl)",
          position: "relative",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
          <div>
            <h3 className="font-heading" style={{ fontSize: "20px", fontWeight: 700, color: "var(--text-main)" }}>
              {mode === "login" ? "Sign In to Qualty.AI" : "Create Account & KYC Sandbox"}
            </h3>
            <p style={{ fontSize: "12.5px", color: "var(--text-muted)", marginTop: "2px" }}>
              {mode === "login" ? "Access your inspection bookings & certificates" : "Instant sandbox account activation"}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "var(--bg-subtle)",
              color: "var(--text-muted)",
              border: "1px solid var(--border-main)",
            }}
          >
            <X size={16} />
          </button>
        </div>

        {isSuccess ? (
          /* Success Screen */
          <div style={{ textAlign: "center", padding: "24px 16px" }}>
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                backgroundColor: "var(--success-bg)",
                color: "var(--success)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
              }}
            >
              <CheckCircle size={32} weight="fill" />
            </div>

            <h4 className="font-heading" style={{ fontSize: "20px", fontWeight: 700, color: "var(--text-main)", marginBottom: "6px" }}>
              Sandbox KYC Verified!
            </h4>
            <p style={{ fontSize: "13.5px", color: "var(--text-secondary)", marginBottom: "18px" }}>
              Your account as <strong>{role === "receiver" ? "Service Receiver (Trader)" : "Service Provider (Surveyor)"}</strong> is activated for on-demand bookings and quotation previews.
            </p>

            <div
              style={{
                backgroundColor: "var(--bg-subtle)",
                borderRadius: "8px",
                padding: "12px",
                fontSize: "12px",
                color: "var(--text-muted)",
                marginBottom: "20px",
                border: "1px solid var(--border-main)",
              }}
            >
              Tier 1 Basic KYC complete. Full KYB documents required prior to final order execution.
            </div>

            <button onClick={handleReset} className="btn-primary" style={{ padding: "10px 24px" }}>
              Continue to Platform
            </button>
          </div>
        ) : (
          <div>
            {/* Role Switcher */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "8px",
                padding: "4px",
                backgroundColor: "var(--bg-subtle)",
                borderRadius: "8px",
                marginBottom: "20px",
                border: "1px solid var(--border-main)",
              }}
            >
              <button
                type="button"
                onClick={() => setRole("receiver")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  padding: "8px",
                  borderRadius: "6px",
                  fontSize: "12.5px",
                  fontWeight: 600,
                  backgroundColor: role === "receiver" ? "var(--bg-card)" : "transparent",
                  color: role === "receiver" ? "var(--accent-primary)" : "var(--text-secondary)",
                  boxShadow: role === "receiver" ? "var(--shadow-sm)" : "none",
                  cursor: "pointer",
                }}
              >
                <Buildings size={15} />
                <span>Service Receiver (Trader)</span>
              </button>

              <button
                type="button"
                onClick={() => setRole("provider")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  padding: "8px",
                  borderRadius: "6px",
                  fontSize: "12.5px",
                  fontWeight: 600,
                  backgroundColor: role === "provider" ? "var(--bg-card)" : "transparent",
                  color: role === "provider" ? "var(--accent-primary)" : "var(--text-secondary)",
                  boxShadow: role === "provider" ? "var(--shadow-sm)" : "none",
                  cursor: "pointer",
                }}
              >
                <UserCheck size={15} />
                <span>Service Provider (Surveyor)</span>
              </button>
            </div>

            {/* Mode Toggle (Login vs Register) */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                {mode === "login" ? "Don't have an account?" : "Already have an account?"}
              </span>
              <button
                type="button"
                onClick={() => setMode(mode === "login" ? "register" : "login")}
                style={{ fontSize: "12px", fontWeight: 600, color: "var(--accent-primary)", cursor: "pointer" }}
              >
                {mode === "login" ? "Register & Verify KYC &rarr;" : "Sign In &rarr;"}
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {mode === "register" && (
                <div>
                  <label style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--text-main)", display: "block", marginBottom: "4px" }}>
                    Company / Entity Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CargoFirst Global Trading FZE"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: "6px",
                      border: "1px solid var(--border-main)",
                      backgroundColor: "var(--bg-card)",
                      color: "var(--text-main)",
                      fontSize: "13px",
                    }}
                  />
                </div>
              )}

              <div>
                <label style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--text-main)", display: "block", marginBottom: "4px" }}>
                  Corporate Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="trade@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "6px",
                    border: "1px solid var(--border-main)",
                    backgroundColor: "var(--bg-card)",
                    color: "var(--text-main)",
                    fontSize: "13px",
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--text-main)", display: "block", marginBottom: "4px" }}>
                  Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "6px",
                    border: "1px solid var(--border-main)",
                    backgroundColor: "var(--bg-card)",
                    color: "var(--text-main)",
                    fontSize: "13px",
                  }}
                />
              </div>

              {mode === "register" && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <label style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--text-main)" }}>
                      GST / Tax ID / Marine Surveyor License #
                    </label>
                    <span style={{ fontSize: "11px", color: "var(--success)" }}>Instant Sandbox Verification</span>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 24AAACC1206M1ZP or SUR-IND-9842"
                    value={taxIdOrLicense}
                    onChange={(e) => setTaxIdOrLicense(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: "6px",
                      border: "1px solid var(--border-main)",
                      backgroundColor: "var(--bg-card)",
                      color: "var(--text-main)",
                      fontSize: "13px",
                    }}
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary"
                style={{ width: "100%", padding: "10px", marginTop: "8px", fontSize: "13.5px" }}
              >
                {isLoading ? (
                  <>
                    <SpinnerGap size={16} className="animate-spin" />
                    <span>Verifying Sandbox Credentials...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={16} weight="bold" />
                    <span>{mode === "login" ? "Sign In" : "Activate Sandbox Account"}</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

