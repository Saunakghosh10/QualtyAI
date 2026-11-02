"use client";

import React, { useState } from "react";
import {
  Vault,
  MapPin,
  Clock,
  ShieldCheck,
  MagnifyingGlass,
  DownloadSimple,
  CheckCircle,
  FileText,
  Lock,
} from "@phosphor-icons/react";

interface EvidenceItem {
  id: string;
  title: string;
  category: "Stuffing" | "Hold Cleanliness" | "Grain Sampling" | "Bolt Seal";
  vessel: string;
  containerOrHatch: string;
  location: string;
  gps: string;
  timestamp: string;
  surveyor: string;
  surveyorId: string;
  hash: string;
  imageUrl: string;
}

export default function QualityEvidenceVault() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [activeItem, setActiveItem] = useState<EvidenceItem | null>(null);

  const evidenceItems: EvidenceItem[] = [
    {
      id: "EV-8921-A",
      title: "Hatch 02 Hold Cleanliness & Bilge Inspection",
      category: "Hold Cleanliness",
      vessel: "MV Arabian Star (IMO 9481029)",
      containerOrHatch: "Bulk Cargo Hold #02",
      location: "Kakinada Deep Water Anchorage, Berth 02",
      gps: "16.9891° N, 82.2674° E",
      timestamp: "2026-10-28 07:15:22 UTC",
      surveyor: "Capt. Rajesh Nair",
      surveyorId: "IND-SUR-4081 (GAFTA 124)",
      hash: "8f4b29a7c1e309...d8a4",
      imageUrl: "https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=800&q=80",
    },
    {
      id: "EV-8921-B",
      title: "Container Bolt Seal Integrity Verification",
      category: "Bolt Seal",
      vessel: "MSC Rifaya (Voyage 261W)",
      containerOrHatch: "MSCU-8291048 (40ft High Cube)",
      location: "Adani Mundra CFS Yard Terminal 2",
      gps: "22.7441° N, 69.7042° E",
      timestamp: "2026-10-28 11:42:09 UTC",
      surveyor: "S. K. Verma",
      surveyorId: "IND-SUR-9842 (NABL Certified)",
      hash: "a4c281093f619e...771b",
      imageUrl: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80",
    },
    {
      id: "EV-8921-C",
      title: "1121 Basmati Export Composite Bag Sampling",
      category: "Grain Sampling",
      vessel: "CMA CGM Tage",
      containerOrHatch: "Lot #1121-EXP-84 (2,500 Bags)",
      location: "JNPT / Nhava Sheva CFS 04",
      gps: "18.9499° N, 72.9515° E",
      timestamp: "2026-10-28 14:08:44 UTC",
      surveyor: "Amitabh Banerjee",
      surveyorId: "IND-SUR-7193 (ISO 24333)",
      hash: "3b9281c00f1a23...e69a",
      imageUrl: "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=800&q=80",
    },
    {
      id: "EV-8921-D",
      title: "Desiccant & Dunnage Floor Lashing Audit",
      category: "Stuffing",
      vessel: "Maersk Danube",
      containerOrHatch: "TGHU-9182301 (20ft Dry Box)",
      location: "Kandla Deendayal Port Terminal 01",
      gps: "23.0033° N, 70.2198° E",
      timestamp: "2026-10-29 02:30:11 UTC",
      surveyor: "G. R. Mehta",
      surveyorId: "IND-SUR-1102 (FOSFA/GAFTA)",
      hash: "991e0a2b47f93c...01cd",
      imageUrl: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=800&q=80",
    },
  ];

  const filteredItems = evidenceItems.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.containerOrHatch.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.vessel.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === "all" || item.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <section
      id="vault"
      style={{
        padding: "clamp(48px, 7vw, 80px) 20px",
        maxWidth: "1280px",
        margin: "0 auto",
      }}
    >
      {/* Section Header */}
      <div style={{ textAlign: "center", maxWidth: "720px", margin: "0 auto 36px" }}>
        <div
          className="badge-pill"
          style={{
            backgroundColor: "var(--accent-light)",
            color: "var(--accent-text)",
            border: "1px solid var(--accent-border)",
            marginBottom: "14px",
          }}
        >
          <Vault size={13} weight="bold" />
          <span>SECTION 03 / DIGITAL CHAIN OF CUSTODY</span>
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
          Quality Evidence Vault
        </h2>
        <p style={{ fontSize: "15px", color: "var(--text-secondary)", lineHeight: 1.6 }}>
          Immutable on-dock photographic evidence watermarked with GPS coordinates, ISO timestamps, and surveyor digital IDs for bulletproof dispute defense.
        </p>
      </div>

      {/* Search & Filter Toolbar */}
      <div
        className="card-shell"
        style={{
          padding: "16px 20px",
          marginBottom: "28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "14px",
          backgroundColor: "var(--bg-card)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: "260px" }}>
          <MagnifyingGlass size={18} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search by Container No, Vessel Name, Port or BL #..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "6px 10px",
              borderRadius: "6px",
              border: "none",
              outline: "none",
              backgroundColor: "transparent",
              color: "var(--text-main)",
              fontSize: "13.5px",
            }}
          />
        </div>

        {/* Category Filter Pills */}
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {["all", "Hold Cleanliness", "Bolt Seal", "Grain Sampling", "Stuffing"].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: "6px 12px",
                borderRadius: "9999px",
                fontSize: "12px",
                fontWeight: 600,
                backgroundColor: selectedCategory === cat ? "var(--accent-primary)" : "var(--bg-subtle)",
                color: selectedCategory === cat ? "#FFFFFF" : "var(--text-secondary)",
                border: "1px solid var(--border-main)",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {cat === "all" ? "All Evidence" : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Evidence Cards Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "20px",
        }}
      >
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className="card-shell"
            style={{
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            {/* Visual Photo with Watermark Overlay */}
            <div
              style={{
                position: "relative",
                height: "190px",
                backgroundImage: `url(${item.imageUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              {/* Dark Gradient Overlay for Readability */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)",
                }}
              />

              {/* Top Category Badge */}
              <div style={{ position: "absolute", top: "12px", left: "12px", display: "flex", gap: "6px" }}>
                <span
                  style={{
                    backgroundColor: "rgba(0,0,0,0.75)",
                    backdropFilter: "blur(4px)",
                    color: "#FFFFFF",
                    fontSize: "10.5px",
                    fontWeight: 700,
                    padding: "3px 8px",
                    borderRadius: "4px",
                    border: "1px solid rgba(255,255,255,0.2)",
                  }}
                >
                  {item.category}
                </span>
              </div>

              {/* Bottom Watermark Overlay (GPS & Time) */}
              <div
                style={{
                  position: "absolute",
                  bottom: "10px",
                  left: "12px",
                  right: "12px",
                  color: "#FFFFFF",
                  fontSize: "11px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "4px", fontWeight: 600 }}>
                  <MapPin size={12} weight="fill" color="#60A5FA" />
                  <span className="font-mono">{item.gps}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "4px", opacity: 0.9, marginTop: "2px" }}>
                  <Clock size={12} />
                  <span className="font-mono">{item.timestamp}</span>
                </div>
              </div>
            </div>

            {/* Card Content */}
            <div style={{ padding: "18px 20px" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--accent-primary)", marginBottom: "4px" }}>
                {item.vessel}
              </div>
              <h3 className="font-heading" style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-main)", marginBottom: "8px" }}>
                {item.title}
              </h3>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "14px" }}>
                <div>
                  <strong>Target:</strong> {item.containerOrHatch}
                </div>
                <div>
                  <strong>Port:</strong> {item.location}
                </div>
                <div>
                  <strong>Surveyor:</strong> {item.surveyor} ({item.surveyorId})
                </div>
              </div>

              {/* SHA-256 Hash Strip & Certificate Export */}
              <div
                style={{
                  paddingTop: "12px",
                  borderTop: "1px solid var(--border-main)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: "11px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "var(--text-muted)" }}>
                  <ShieldCheck size={14} color="var(--success)" weight="bold" />
                  <span className="font-mono">SHA-256: {item.hash}</span>
                </div>

                <button
                  onClick={() => setActiveItem(item)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    fontWeight: 600,
                    color: "var(--accent-primary)",
                    cursor: "pointer",
                  }}
                >
                  <DownloadSimple size={13} weight="bold" />
                  <span>Proof</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Proof Certificate Drawer / Modal */}
      {activeItem && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 110,
            backgroundColor: "var(--modal-backdrop)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={(e) => e.target === e.currentTarget && setActiveItem(null)}
        >
          <div
            className="card-shell"
            style={{
              width: "100%",
              maxWidth: "520px",
              padding: "24px",
              backgroundColor: "var(--bg-card)",
              boxShadow: "var(--shadow-xl)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <CheckCircle size={20} color="var(--success)" weight="fill" />
                <h4 className="font-heading" style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-main)" }}>
                  Digital Evidentiary Certificate
                </h4>
              </div>
              <button onClick={() => setActiveItem(null)} style={{ color: "var(--text-muted)", cursor: "pointer" }}>
                &times;
              </button>
            </div>

            <div style={{ backgroundColor: "var(--bg-subtle)", padding: "16px", borderRadius: "8px", fontSize: "13px", display: "flex", flexDirection: "column", gap: "8px", marginBottom: "20px" }}>
              <div><strong>Item Reference:</strong> {activeItem.id}</div>
              <div><strong>Vessel & Voyage:</strong> {activeItem.vessel}</div>
              <div><strong>Container / Hold:</strong> {activeItem.containerOrHatch}</div>
              <div><strong>Watermarked GPS:</strong> {activeItem.gps}</div>
              <div><strong>UTC Timestamp:</strong> {activeItem.timestamp}</div>
              <div><strong>Certifying Surveyor:</strong> {activeItem.surveyor}</div>
              <div><strong>Cryptographic Fingerprint:</strong> <span className="font-mono">{activeItem.hash}</span></div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button onClick={() => setActiveItem(null)} className="btn-secondary" style={{ padding: "8px 16px" }}>
                Close
              </button>
              <button
                onClick={() => {
                  alert(`Downloading Certified Evidence Pack for ${activeItem.id}...`);
                  setActiveItem(null);
                }}
                className="btn-primary"
                style={{ padding: "8px 16px" }}
              >
                Download PDF Evidence Bundle
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

