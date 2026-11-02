"use client";

import React from "react";
import { Cube, Flask, CheckCircle, ShieldCheck, Lock, Clock, FileText, Scales } from "@phosphor-icons/react";

interface DualPipelineProps {
  onBookInspection?: (serviceType?: string) => void;
}

export default function DualPipeline({ onBookInspection }: DualPipelineProps) {
  const physicalServices = [
    {
      step: "01",
      title: "Pre-Shipment Inspection (PSI)",
      tag: "WAREHOUSE / SILO",
      desc: "Comprehensive sampling at milling facilities, inland silos, and container freight stations (CFS). Verification of grade conformity, moisture, and export bag packaging.",
      sla: "Within 2 Hours",
    },
    {
      step: "02",
      title: "Loading & Unloading Supervision",
      tag: "PORT TERMINAL",
      desc: "Continuous round-the-clock gangway monitoring. Vessel hold cleanliness, hatch inspection, weather monitoring, draft survey tally, and hatch cover rubber gasket integrity.",
      sla: "24/7 Shift Tally",
    },
    {
      step: "03",
      title: "Container Stuffing Survey",
      tag: "CFS / ON-DOCK",
      desc: "Inspection of dry container floors for moisture, rust, and foreign odors. Verification of silica gel desiccant bags, dunnage, lashing, and customs tamper-proof high-security bolt seals.",
      sla: "Instant Seal Record",
    },
    {
      step: "04",
      title: "Destination Cargo Inspection",
      tag: "DISCHARGE PORT",
      desc: "Joint condition assessment at import discharge terminals (e.g. Dubai, Rotterdam, Singapore). Damage assessment, out-turn quantity reconciliation, and certified claims reporting.",
      sla: "Same-Day Certificate",
    },
  ];

  return (
    <section
      id="services"
      style={{
        padding: "clamp(48px, 7vw, 80px) 20px",
        maxWidth: "1280px",
        margin: "0 auto",
      }}
    >
      {/* Section Header */}
      <div style={{ textAlign: "center", maxWidth: "720px", margin: "0 auto 48px" }}>
        <div
          className="badge-pill"
          style={{
            backgroundColor: "var(--accent-light)",
            color: "var(--accent-text)",
            border: "1px solid var(--accent-border)",
            marginBottom: "14px",
          }}
        >
          <Cube size={13} weight="bold" />
          <span>SECTION 02 / CORE INSPECTION SERVICES</span>
        </div>
        <h2
          className="font-heading"
          style={{
            fontSize: "clamp(26px, 3.4vw, 38px)",
            fontWeight: 700,
            color: "var(--text-main)",
            marginBottom: "12px",
            letterSpacing: "-0.03em",
          }}
        >
          Physical Cargo Inspection Suite
        </h2>
        <p style={{ fontSize: "15px", color: "var(--text-secondary)", lineHeight: 1.6 }}>
          Prioritized on-dock surveyor mobilization across all critical stages of international bulk commodity freight.
        </p>
      </div>

      {/* 4 Physical Cargo Inspection Service Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "20px",
          marginBottom: "36px",
        }}
      >
        {physicalServices.map((service) => (
          <div
            key={service.step}
            className="card-shell"
            style={{
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              position: "relative",
            }}
          >
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "16px",
                }}
              >
                <span
                  className="font-mono"
                  style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "var(--accent-primary)",
                    backgroundColor: "var(--accent-light)",
                    padding: "3px 8px",
                    borderRadius: "6px",
                  }}
                >
                  {service.step}
                </span>
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    color: "var(--text-muted)",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  {service.tag}
                </span>
              </div>

              <h3
                className="font-heading"
                style={{
                  fontSize: "18px",
                  fontWeight: 700,
                  color: "var(--text-main)",
                  marginBottom: "10px",
                }}
              >
                {service.title}
              </h3>

              <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                {service.desc}
              </p>
            </div>

            <div
              style={{
                marginTop: "20px",
                paddingTop: "14px",
                borderTop: "1px solid var(--border-main)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontSize: "12px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text-muted)" }}>
                <Clock size={14} />
                <span>SLA: {service.sla}</span>
              </div>
              <button
                onClick={() => onBookInspection && onBookInspection(service.title)}
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "var(--accent-primary)",
                  cursor: "pointer",
                }}
              >
                Book Now &rarr;
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Secondary Row: Chemical Testing (Coming Soon) & Contracts/Disputes (Locked) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
          gap: "24px",
        }}
      >
        {/* Chemical Testing — COMING SOON */}
        <div
          className="card-shell"
          style={{
            padding: "28px",
            backgroundColor: "var(--bg-card)",
            border: "1px dashed var(--border-strong)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "8px",
                  backgroundColor: "var(--bg-subtle)",
                  color: "var(--text-muted)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Flask size={20} />
              </div>
              <h3 className="font-heading" style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-main)" }}>
                Chemical & Residue Testing
              </h3>
            </div>

            <span
              className="badge-pill"
              style={{
                backgroundColor: "var(--warning-bg)",
                color: "var(--warning-text)",
                border: "1px solid var(--warning-border)",
                fontSize: "11px",
                fontWeight: 700,
              }}
            >
              COMING SOON
            </span>
          </div>

          <p style={{ fontSize: "13.5px", color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: "16px" }}>
            Advanced laboratory assays including GC-MS/MS multi-residue pesticide screening (300+ compounds), HPLC Aflatoxins B1/B2/G1/G2 detection, and ICP-MS heavy metals assay.
          </p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", fontSize: "11.5px", color: "var(--text-muted)" }}>
            <span style={{ padding: "4px 8px", borderRadius: "6px", backgroundColor: "var(--bg-subtle)" }}>
              GC-MS/MS Pesticides
            </span>
            <span style={{ padding: "4px 8px", borderRadius: "6px", backgroundColor: "var(--bg-subtle)" }}>
              HPLC Aflatoxins
            </span>
            <span style={{ padding: "4px 8px", borderRadius: "6px", backgroundColor: "var(--bg-subtle)" }}>
              ICP-MS Heavy Metals
            </span>
            <span style={{ padding: "4px 8px", borderRadius: "6px", backgroundColor: "var(--bg-subtle)" }}>
              NABL / ISO 17025
            </span>
          </div>
        </div>

        {/* Digital Contracts & Quality Disputes — LOCKED */}
        <div
          className="card-shell"
          style={{
            padding: "28px",
            backgroundColor: "var(--bg-card)",
            border: "1px dashed var(--border-strong)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "8px",
                  backgroundColor: "var(--bg-subtle)",
                  color: "var(--text-muted)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Scales size={20} />
              </div>
              <div>
                <h3 className="font-heading" style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-main)" }}>
                  Contracts & Quality Disputes
                </h3>
              </div>
            </div>

            <span
              className="badge-pill"
              style={{
                backgroundColor: "var(--bg-subtle)",
                color: "var(--text-muted)",
                border: "1px solid var(--border-main)",
                fontSize: "11px",
                fontWeight: 600,
              }}
            >
              <Lock size={12} weight="bold" />
              <span>POST-SHIPMENT LOCKED</span>
            </span>
          </div>

          <p style={{ fontSize: "13.5px", color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: "16px" }}>
            Automated arbitration workflows for trade specification discrepancies between port of loading (POL) and discharge (POD). Locked until shipment completion and report verification.
          </p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", fontSize: "11.5px", color: "var(--text-muted)" }}>
            <span style={{ padding: "4px 8px", borderRadius: "6px", backgroundColor: "var(--bg-subtle)" }}>
              Signed Contract Spec Locker
            </span>
            <span style={{ padding: "4px 8px", borderRadius: "6px", backgroundColor: "var(--bg-subtle)" }}>
              Dispute Claim Filing
            </span>
            <span style={{ padding: "4px 8px", borderRadius: "6px", backgroundColor: "var(--bg-subtle)" }}>
              Evidence Package Export
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
