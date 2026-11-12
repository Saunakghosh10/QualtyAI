"use client";

import React, { useState } from "react";
import { MapPin, Globe, Buildings, ShieldCheck, Clock, Check } from "@phosphor-icons/react";

export default function SurveyorNetwork() {
  const [activeTab, setActiveTab] = useState<"india" | "international">("india");

  const indianHubs = [
    { name: "Mundra Port (Gujarat)", role: "Container & Bulk Agro Terminal", surveyors: "148 Certified", sla: "2.5 hrs", badge: "PORT CLEARANCE" },
    { name: "Kakinada Anchorage (A.P.)", role: "Primary Rice Export Anchorage", surveyors: "210 Certified", sla: "1.8 hrs", badge: "GRAIN SPECIALIST" },
    { name: "Kandla / Deendayal Port", role: "Dry Bulk & Wheat Terminal", surveyors: "115 Certified", sla: "3.0 hrs", badge: "BULK DRAFT SURVEY" },
    { name: "JNPT / Nhava Sheva (Mumbai)", role: "Container Freight Stations", surveyors: "185 Certified", sla: "2.0 hrs", badge: "CFS AUDIT" },
    { name: "Visakhapatnam (Vizag)", role: "East Coast Multi-Cargo Port", surveyors: "92 Certified", sla: "3.5 hrs", badge: "HOLD CLEANLINESS" },
    { name: "Karnal Mandi Processing Hub", role: "Inland Basmati Milling Sampling", surveyors: "134 Certified", sla: "1.5 hrs", badge: "MILLING AUDIT" },
  ];

  const internationalHubs = [
    { name: "Jebel Ali & Dubai (UAE)", role: "GCC Import Hub & Transshipment", surveyors: "78 Certified", sla: "3.0 hrs", badge: "GAFTA ACCREDITED" },
    { name: "Port of Rotterdam (NL)", role: "European Union Entry Point", surveyors: "64 Certified", sla: "4.0 hrs", badge: "EU MRL PROTOCOL" },
    { name: "Port of Singapore (SG)", role: "East Asia Trade Corridor", surveyors: "52 Certified", sla: "3.0 hrs", badge: "SGS/BIVAC SYNC" },
    { name: "Chittagong Port (BD)", role: "Non-Basmati Parboiled Terminal", surveyors: "86 Certified", sla: "2.5 hrs", badge: "WEIGHT/TALLY" },
    { name: "Mombasa Port (KE)", role: "East Africa Grain Corridor", surveyors: "44 Certified", sla: "4.5 hrs", badge: "PVOC COMPLIANCE" },
    { name: "Dammam / Jubail (KSA)", role: "Saudi Food & Drug Authority", surveyors: "58 Certified", sla: "3.5 hrs", badge: "SFDA PROTOCOL" },
  ];

  const currentHubs = activeTab === "india" ? indianHubs : internationalHubs;

  return (
    <section
      id="surveyors"
      style={{
        padding: "clamp(40px, 5vw, 64px) 20px",
        maxWidth: "1280px",
        margin: "0 auto",
      }}
    >
      {/* Header */}
      <div style={{ textAlign: "center", maxWidth: "680px", margin: "0 auto 36px" }}>
        <div
          className="badge-pill"
          style={{
            backgroundColor: "var(--accent-light)",
            color: "var(--accent-text)",
            border: "1px solid var(--accent-border)",
            marginBottom: "14px",
          }}
        >
          <MapPin size={13} weight="bold" />
          <span>Surveyor network preview</span>
        </div>
        <h2
          className="font-heading"
          style={{
            fontSize: "clamp(26px, 3.4vw, 36px)",
            fontWeight: 700,
            color: "var(--text-main)",
            marginBottom: "12px",
            letterSpacing: "-0.03em",
          }}
        >
          Accredited Port Surveyor Directory
        </h2>
        <p style={{ fontSize: "15px", color: "var(--text-secondary)", lineHeight: 1.6 }}>
          Certified independent marine surveyors and quality inspectors mobilized on-demand across major export and import corridors.
        </p>
      </div>

      {/* Region Switcher Tabs */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          marginBottom: "32px",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            backgroundColor: "var(--bg-subtle)",
            padding: "4px",
            borderRadius: "9999px",
            border: "1px solid var(--border-main)",
          }}
        >
          <button
            onClick={() => setActiveTab("india")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 20px",
              borderRadius: "9999px",
              fontSize: "13.5px",
              fontWeight: 600,
              backgroundColor: activeTab === "india" ? "var(--bg-card)" : "transparent",
              color: activeTab === "india" ? "var(--accent-primary)" : "var(--text-secondary)",
              boxShadow: activeTab === "india" ? "var(--shadow-sm)" : "none",
              transition: "all 0.15s ease",
            }}
          >
            <Buildings size={16} />
            <span>Domestic Indian Ports</span>
          </button>

          <button
            onClick={() => setActiveTab("international")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 20px",
              borderRadius: "9999px",
              fontSize: "13.5px",
              fontWeight: 600,
              backgroundColor: activeTab === "international" ? "var(--bg-card)" : "transparent",
              color: activeTab === "international" ? "var(--accent-primary)" : "var(--text-secondary)",
              boxShadow: activeTab === "international" ? "var(--shadow-sm)" : "none",
              transition: "all 0.15s ease",
            }}
          >
            <Globe size={16} />
            <span>International Hubs</span>
          </button>
        </div>
      </div>

      {/* Port Hubs Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "16px",
        }}
      >
        {currentHubs.map((hub) => (
          <div
            key={hub.name}
            className="card-shell"
            style={{
              padding: "20px 24px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px", marginBottom: "8px" }}>
                <h3
                  className="font-heading"
                  style={{
                    fontSize: "17px",
                    fontWeight: 700,
                    color: "var(--text-main)",
                  }}
                >
                  {hub.name}
                </h3>
                <span
                  style={{
                    fontSize: "10.5px",
                    fontWeight: 700,
                    color: "var(--accent-text)",
                    backgroundColor: "var(--accent-light)",
                    border: "1px solid var(--accent-border)",
                    padding: "2px 8px",
                    borderRadius: "6px",
                    whiteSpace: "nowrap",
                  }}
                >
                  {hub.badge}
                </span>
              </div>

              <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "16px" }}>
                {hub.role}
              </p>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                paddingTop: "14px",
                borderTop: "1px solid var(--border-main)",
                fontSize: "12px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--success)" }}>
                <ShieldCheck size={16} weight="fill" />
                <span style={{ fontWeight: 600 }}>{hub.surveyors}</span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text-muted)" }}>
                <Clock size={15} />
                <span>Dispatch: {hub.sla}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
