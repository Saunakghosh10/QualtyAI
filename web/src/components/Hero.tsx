"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Sliders, ShieldCheck, MapPin, CheckCircle, Lightning, Gavel, SquaresFour } from "@phosphor-icons/react";
import { useViewer } from "@/lib/viewer";

interface HeroProps {
  onOpenQuickBooking: () => void;
  onOpenInquiryBooking: () => void;
}

const STEPS = [
  {
    Icon: MapPin,
    title: "Book or ask for bids",
    body: "Pick the port, cargo and specs. Get a fixed quote or let inspection companies bid.",
    bg: "var(--accent-light)",
    fg: "var(--accent-primary)",
  },
  {
    Icon: ShieldCheck,
    title: "Watch it happen",
    body: "The surveyor posts readings, photos and video to the order chatroom. Off spec readings get flagged.",
    bg: "var(--warning-bg)",
    fg: "var(--warning-text)",
  },
  {
    Icon: CheckCircle,
    title: "Get a checkable certificate",
    body: "Anyone can verify it with its code, and the evidence stays in the vault.",
    bg: "var(--success-bg)",
    fg: "var(--success-text)",
  },
];

export default function Hero({ onOpenQuickBooking, onOpenInquiryBooking }: HeroProps) {
  const kind = useViewer().kind;
  // Inspection companies and the Qualty team see their dashboard first, not the booking buttons.
  const forCompany = kind === "company" || kind === "admin";
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
        {/* Eyebrow */}
        <div
          className="badge-pill"
          style={{
            backgroundColor: "var(--bg-card)",
            color: "var(--text-secondary)",
            border: "1px solid var(--border-main)",
            boxShadow: "var(--shadow-sm)",
            marginBottom: "24px",
            padding: "6px 12px",
            fontSize: "13px",
          }}
        >
          <span className="status-indicator status-active" aria-hidden="true" />
          Surveyors on call at major Indian ports
        </div>

        <h1
          className="font-heading"
          style={{
            fontSize: "clamp(40px, 6vw, 72px)",
            fontWeight: 700,
            lineHeight: 1.04,
            color: "var(--text-main)",
            letterSpacing: "-0.035em",
            margin: "0 auto 20px",
            maxWidth: "820px",
          }}
        >
          Know what is in the container before you pay for it.
        </h1>

        <p
          style={{
            fontSize: "clamp(16px, 1.6vw, 18px)",
            lineHeight: 1.6,
            color: "var(--text-secondary)",
            maxWidth: "620px",
            margin: "0 auto 32px",
          }}
        >
          Book an accredited surveyor at the port. Sampling, grading and stuffing checks land in one shared
          chatroom with GPS stamped photos, readings and a signed certificate.
        </p>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          {forCompany ? (
            <>
              <Link href="/dashboard" className="btn-primary" style={{ padding: "12px 22px", fontSize: "16px" }}>
                <SquaresFour size={16} weight="bold" aria-hidden="true" />
                <span>Go to your dashboard</span>
                <ArrowRight size={16} weight="bold" aria-hidden="true" />
              </Link>
              <a href="#services" className="btn-secondary" style={{ padding: "12px 22px", fontSize: "16px" }}>
                <span>See the store as customers do</span>
              </a>
            </>
          ) : (
            <>
              <button onClick={onOpenQuickBooking} className="btn-primary" style={{ padding: "12px 22px", fontSize: "16px" }}>
                <Lightning size={16} weight="fill" aria-hidden="true" />
                <span>Book a quick inspection</span>
                <ArrowRight size={16} weight="bold" aria-hidden="true" />
              </button>

              <button onClick={onOpenInquiryBooking} className="btn-secondary" style={{ padding: "12px 22px", fontSize: "16px" }}>
                <Gavel size={16} weight="bold" aria-hidden="true" />
                <span>Raise an Inquiry for bids</span>
              </button>
            </>
          )}
        </div>

        <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: "16px auto 56px" }}>
          Quick bookings go out within 5 days. Longer jobs get bids from several companies.{" "}
          <a
            href="#calibrator"
            style={{ color: "var(--accent-primary)", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "4px" }}
          >
            <Sliders size={13} aria-hidden="true" />
            Set specs first
          </a>
        </p>

        {/* How it works: three things the product really does */}
        <ol
          style={{
            listStyle: "none",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "12px",
            width: "100%",
            textAlign: "left",
          }}
        >
          {STEPS.map((step, i) => (
            <li key={step.title} className="card-shell" style={{ padding: "20px", display: "flex", gap: "14px" }}>
              <div
                aria-hidden="true"
                style={{
                  width: "36px",
                  height: "36px",
                  flex: "none",
                  borderRadius: "10px",
                  backgroundColor: step.bg,
                  color: step.fg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <step.Icon size={18} weight="bold" />
              </div>
              <div>
                <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "2px" }}>
                  Step {i + 1}
                </div>
                <div style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-main)", lineHeight: 1.3 }}>
                  {step.title}
                </div>
                <div style={{ fontSize: "14px", color: "var(--text-secondary)", marginTop: "4px", lineHeight: 1.5 }}>
                  {step.body}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
