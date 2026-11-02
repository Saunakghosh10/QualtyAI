"use client";

import React from "react";
import { ArrowRight, Sliders, ShieldCheck, MapPin, CheckCircle, Lightning, Gavel } from "@phosphor-icons/react";

interface HeroProps {
  onOpenQuickBooking: () => void;
  onOpenInquiryBooking: () => void;
}

export default function Hero({ onOpenQuickBooking, onOpenInquiryBooking }: HeroProps) {
  return (
    <section
      style={{
        position: "relative",
        padding: "clamp(48px, 8vw, 84px) 20px clamp(40px, 6vw, 64px)",
        maxWidth: "1280px",
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
      }}
    >
      {/* Soft Ambient Radial Glow */}
      <div
        style={{
          position: "absolute",
          top: "10%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "clamp(300px, 60vw, 700px)",
          height: "320px",
          background: "radial-gradient(circle, var(--accent-glow) 0%, transparent 70%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <div style={{ position: "relative", zIndex: 1, maxWidth: "880px" }}>
        {/* Eyebrow Status Badge */}
        <div
          className="badge-pill"
          style={{
            backgroundColor: "var(--bg-card)",
            color: "var(--text-secondary)",
            border: "1px solid var(--border-main)",
            boxShadow: "var(--shadow-sm)",
            marginBottom: "24px",
            padding: "6px 14px",
          }}
        >
          <span className="status-indicator status-active" />
          <span style={{ fontSize: "12px", fontWeight: 600 }}>
            PHYSICAL CARGO INSPECTION & SURVEYOR DISPATCH PLATFORM
          </span>
        </div>

        {/* H1 Main Headline */}
        <h1
          className="font-heading"
          style={{
            fontSize: "clamp(2.4rem, 5.2vw, 4.2rem)",
            fontWeight: 700,
            lineHeight: 1.1,
            color: "var(--text-main)",
            letterSpacing: "-0.035em",
            marginBottom: "20px",
            textWrap: "balance",
          }}
        >
          Verified physical cargo quality for global commodity trade.
        </h1>

        {/* Readable Subtitle */}
        <p
          style={{
            fontSize: "clamp(16px, 1.8vw, 19px)",
            lineHeight: 1.6,
            color: "var(--text-secondary)",
            maxWidth: "700px",
            margin: "0 auto 36px",
          }}
        >
          Book accredited marine surveyors on-demand. Fast on-dock sampling, pre-shipment cargo grading, container stuffing surveys, and GPS-watermarked evidence vaults across major ports.
        </p>

        {/* Dual Booking Action Buttons */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "14px",
            flexWrap: "wrap",
            marginBottom: "56px",
          }}
        >
          <button
            onClick={onOpenQuickBooking}
            className="btn-primary"
            style={{ padding: "12px 24px", fontSize: "14.5px" }}
          >
            <Lightning size={17} weight="fill" />
            <span>Quick Inspection (&lt; 5 Days)</span>
            <ArrowRight size={15} weight="bold" />
          </button>

          <button
            onClick={onOpenInquiryBooking}
            className="btn-secondary"
            style={{ padding: "12px 22px", fontSize: "14.5px" }}
          >
            <Gavel size={17} weight="bold" />
            <span>Raise an Inquiry (&gt; 5 Days Bidding)</span>
          </button>

          <a href="#calibrator" className="btn-secondary" style={{ padding: "12px 20px", fontSize: "14.5px" }}>
            <Sliders size={16} />
            <span>Commodity Calibrator</span>
          </a>
        </div>

        {/* Stat Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "16px",
            width: "100%",
            textAlign: "left",
          }}
        >
          {/* Stat 1 */}
          <div className="card-shell" style={{ padding: "20px 24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "6px",
                  backgroundColor: "var(--accent-light)",
                  color: "var(--accent-primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ShieldCheck size={18} weight="bold" />
              </div>
              <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)" }}>
                RAPID DISPATCH
              </span>
            </div>
            <div
              className="font-heading"
              style={{ fontSize: "28px", fontWeight: 700, color: "var(--text-main)", lineHeight: 1.1 }}
            >
              &lt; 2 Hours
            </div>
            <div style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "4px" }}>
              Local surveyor mobilization at Mundra, Kakinada, JNPT, and Kandla
            </div>
          </div>

          {/* Stat 2 */}
          <div className="card-shell" style={{ padding: "20px 24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "6px",
                  backgroundColor: "var(--success-bg)",
                  color: "var(--success)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <CheckCircle size={18} weight="bold" />
              </div>
              <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)" }}>
                QUALITY VAULT
              </span>
            </div>
            <div
              className="font-heading"
              style={{ fontSize: "28px", fontWeight: 700, color: "var(--text-main)", lineHeight: 1.1 }}
            >
              Watermarked GPS
            </div>
            <div style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "4px" }}>
              Timestamped digital evidence protecting against 30-90 day transit claims
            </div>
          </div>

          {/* Stat 3 */}
          <div className="card-shell" style={{ padding: "20px 24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "6px",
                  backgroundColor: "var(--bg-subtle)",
                  color: "var(--text-secondary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MapPin size={18} weight="bold" />
              </div>
              <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)" }}>
                PORT DIRECTORY
              </span>
            </div>
            <div
              className="font-heading"
              style={{ fontSize: "28px", fontWeight: 700, color: "var(--text-main)", lineHeight: 1.1 }}
            >
              12+ Global Hubs
            </div>
            <div style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "4px" }}>
              Accredited surveyors active in domestic Indian ports and overseas corridors
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
