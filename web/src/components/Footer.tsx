"use client";

import React from "react";
import { ShieldCheck, Vault } from "@phosphor-icons/react";

export default function Footer() {
  return (
    <footer
      style={{
        borderTop: "1px solid var(--border-main)",
        backgroundColor: "var(--bg-card)",
        padding: "48px 20px 32px",
      }}
    >
      <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
        {/* Metrics Row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "16px",
            paddingBottom: "36px",
            borderBottom: "1px solid var(--border-main)",
            marginBottom: "36px",
          }}
        >
          <div>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Surveyor Dispatch
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "6px" }}>
              <span className="status-indicator status-active" />
              <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-main)" }}>
                Active &lt; 2hr Mobilization
              </span>
            </div>
          </div>

          <div>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Accredited Protocols
            </div>
            <div style={{ marginTop: "6px" }}>
              <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-main)" }}>
                GAFTA 124 / ISO 24333 / NABL
              </span>
            </div>
          </div>

          <div>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Evidence Security
            </div>
            <div style={{ marginTop: "6px" }}>
              <span className="font-mono" style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-main)" }}>
                SHA-256 GPS Watermarking
              </span>
            </div>
          </div>

          <div>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Process Timezone
            </div>
            <div style={{ marginTop: "6px" }}>
              <span className="font-mono" style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-main)" }}>
                UTC (Coordinated Universal Time)
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "16px",
            fontSize: "13px",
            color: "var(--text-muted)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                width: "24px",
                height: "24px",
                borderRadius: "6px",
                backgroundColor: "var(--accent-primary)",
                color: "#FFFFFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: "13px",
              }}
            >
              Q
            </div>
            <span style={{ fontWeight: 600, color: "var(--text-main)" }}>Qualty.AI</span>
            <span>— A CargoFirst Company. All rights reserved.</span>
          </div>

          <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
            <a href="#services" style={{ color: "var(--text-secondary)" }}>Services</a>
            <a href="#calibrator" style={{ color: "var(--text-secondary)" }}>Calibrator</a>
            <a href="#vault" style={{ color: "var(--text-secondary)" }}>Evidence Vault</a>
            <a href="#pilot" style={{ color: "var(--text-secondary)" }}>Quality Pilot</a>
            <a href="#surveyors" style={{ color: "var(--text-secondary)" }}>Surveyor Hubs</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
