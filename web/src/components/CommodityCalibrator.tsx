"use client";

import React, { useState } from "react";
import {
  Sliders,
  CheckCircle,
  Warning,
  XCircle,
  ArrowRight,
  UploadSimple,
  BookmarkSimple,
  FileText,
  Sparkle,
  Trash,
} from "@phosphor-icons/react";

export interface CommodityParams {
  commodity: "Rice" | "Wheat" | "Corn" | "Soybeans" | "Pulses" | "Sugar";
  broken: number;
  purity: number;
  damageKernel: number;
  yellowKernel: number;
  chalkyImmature: number;
  moisture: number;
  liveInsects: number;
  millingDegree: "Under Milled" | "Well Milled" | "Over Milled" | "Raw Unprocessed";
  averageGrainLength: number;
}

const COMMODITY_PRESETS: Record<
  string,
  { label: string; category: CommodityParams["commodity"]; params: CommodityParams }
> = {
  basmati1121: {
    label: "1121 Basmati Rice (Export Extra Long)",
    category: "Rice",
    params: {
      commodity: "Rice",
      broken: 2.0,
      purity: 98.5,
      damageKernel: 0.5,
      yellowKernel: 0.5,
      chalkyImmature: 2.0,
      moisture: 12.5,
      liveInsects: 0,
      millingDegree: "Well Milled",
      averageGrainLength: 8.35,
    },
  },
  ir64: {
    label: "IR-64 Non-Basmati Raw 5%",
    category: "Rice",
    params: {
      commodity: "Rice",
      broken: 4.8,
      purity: 96.0,
      damageKernel: 1.0,
      yellowKernel: 1.2,
      chalkyImmature: 4.5,
      moisture: 13.0,
      liveInsects: 0,
      millingDegree: "Well Milled",
      averageGrainLength: 6.2,
    },
  },
  wheatMilling: {
    label: "Milling Wheat Grade 1 (Protein 12.5%)",
    category: "Wheat",
    params: {
      commodity: "Wheat",
      broken: 2.5,
      purity: 98.0,
      damageKernel: 1.0,
      yellowKernel: 0.2,
      chalkyImmature: 1.5,
      moisture: 12.0,
      liveInsects: 0,
      millingDegree: "Raw Unprocessed",
      averageGrainLength: 6.5,
    },
  },
  yellowCorn: {
    label: "Yellow Corn / Maize Grade 2",
    category: "Corn",
    params: {
      commodity: "Corn",
      broken: 3.0,
      purity: 97.5,
      damageKernel: 2.5,
      yellowKernel: 0.0,
      chalkyImmature: 2.0,
      moisture: 14.0,
      liveInsects: 0,
      millingDegree: "Raw Unprocessed",
      averageGrainLength: 9.5,
    },
  },
  soybeansNonGMO: {
    label: "Non-GMO Food Grade Soybeans",
    category: "Soybeans",
    params: {
      commodity: "Soybeans",
      broken: 1.8,
      purity: 99.0,
      damageKernel: 1.2,
      yellowKernel: 0.0,
      chalkyImmature: 1.0,
      moisture: 11.5,
      liveInsects: 0,
      millingDegree: "Raw Unprocessed",
      averageGrainLength: 7.0,
    },
  },
  chickpeasDesi: {
    label: "Desi Chickpeas (Bengal Gram)",
    category: "Pulses",
    params: {
      commodity: "Pulses",
      broken: 1.5,
      purity: 98.2,
      damageKernel: 1.5,
      yellowKernel: 0.0,
      chalkyImmature: 1.2,
      moisture: 11.0,
      liveInsects: 0,
      millingDegree: "Raw Unprocessed",
      averageGrainLength: 7.5,
    },
  },
  sugarIcumsa45: {
    label: "Refined White Cane Sugar (ICUMSA 45)",
    category: "Sugar",
    params: {
      commodity: "Sugar",
      broken: 0.2,
      purity: 99.8,
      damageKernel: 0.0,
      yellowKernel: 0.0,
      chalkyImmature: 0.0,
      moisture: 0.04,
      liveInsects: 0,
      millingDegree: "Well Milled",
      averageGrainLength: 1.2,
    },
  },
};

interface CommodityCalibratorProps {
  onInjectIntoBooking: (params: CommodityParams, contractInfo?: { filename: string; specName: string }) => void;
}

export default function CommodityCalibrator({ onInjectIntoBooking }: CommodityCalibratorProps) {
  const [selectedPreset, setSelectedPreset] = useState<string>("basmati1121");
  const [params, setParams] = useState<CommodityParams>(COMMODITY_PRESETS.basmati1121.params);

  // Quality Checker: Saved Buyer Specs
  const [savedSpecs, setSavedSpecs] = useState<Array<{ id: string; name: string; params: CommodityParams }>>([
    {
      id: "spec-1",
      name: "Dubai Jebel Ali — Grade A Basmati Spec",
      params: { ...COMMODITY_PRESETS.basmati1121.params },
    },
    {
      id: "spec-2",
      name: "Rotterdam Port — Non-GMO Soybean Standard",
      params: { ...COMMODITY_PRESETS.soybeansNonGMO.params },
    },
  ]);
  const [newSpecName, setNewSpecName] = useState("");
  const [isSavingSpec, setIsSavingSpec] = useState(false);

  // Contract Upload State
  const [uploadedContract, setUploadedContract] = useState<{ filename: string; uploadedAt: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handlePresetChange = (presetKey: string) => {
    setSelectedPreset(presetKey);
    setParams({ ...COMMODITY_PRESETS[presetKey].params });
  };

  const updateParam = <K extends keyof CommodityParams>(field: K, value: CommodityParams[K]) => {
    setParams((prev) => ({ ...prev, [field]: value }));
  };

  // Quality Checker: Save Spec
  const handleSaveSpec = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSpecName.trim()) return;
    const newEntry = {
      id: `spec-${Date.now()}`,
      name: newSpecName.trim(),
      params: { ...params },
    };
    setSavedSpecs((prev) => [newEntry, ...prev]);
    setNewSpecName("");
    setIsSavingSpec(false);
  };

  const handleLoadSavedSpec = (specId: string) => {
    const found = savedSpecs.find((s) => s.id === specId);
    if (found) {
      setParams({ ...found.params });
      setSelectedPreset("");
    }
  };

  // Contract File Drop
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setTimeout(() => {
      setIsUploading(false);
      setUploadedContract({
        filename: file.name,
        uploadedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      });
      // Pre-calibrate to safe export values based on contract upload
      setParams((prev) => ({
        ...prev,
        broken: Math.min(prev.broken, 3.0),
        purity: Math.max(prev.purity, 98.0),
        liveInsects: 0,
      }));
    }, 900);
  };

  // Evaluation logic
  const isInsectDisqualified = params.liveInsects > 0;
  const isPurityDisqualified = params.purity < 92.0;
  const isBrokenHigh = params.broken > 8.0;
  const totalDefects = (
    params.broken +
    params.damageKernel +
    params.yellowKernel +
    params.chalkyImmature
  ).toFixed(1);

  let verdict: { status: "PASS" | "WARN" | "REJECT"; label: string; color: string; bg: string; border: string; reason: string } = {
    status: "PASS",
    label: "Export Grade A — Conforming",
    color: "var(--success)",
    bg: "var(--success-bg)",
    border: "var(--success-border)",
    reason: "Parameters comply fully with international trade contract specifications.",
  };

  if (isInsectDisqualified) {
    verdict = {
      status: "REJECT",
      label: "Zero-Tolerance Rejection",
      color: "var(--danger)",
      bg: "var(--danger-bg)",
      border: "var(--danger-border)",
      reason: "Live insect infestation detected. Automatic phytosanitary quarantine.",
    };
  } else if (isPurityDisqualified || isBrokenHigh) {
    verdict = {
      status: "REJECT",
      label: "Out of Export Spec",
      color: "var(--danger)",
      bg: "var(--danger-bg)",
      border: "var(--danger-border)",
      reason: "Broken grains or foreign matter exceed permissible contract tolerance.",
    };
  } else if (params.broken > 4.5 || params.damageKernel > 2.0 || params.moisture > 13.5) {
    verdict = {
      status: "WARN",
      label: "Conditional Clearance (Grade B)",
      color: "var(--warning)",
      bg: "var(--warning-bg)",
      border: "var(--warning-border)",
      reason: "Elevated moisture or minor defects. Secondary hold sampling advised.",
    };
  }

  return (
    <section id="calibrator" style={{ padding: "clamp(48px, 7vw, 80px) 20px", maxWidth: "1280px", margin: "0 auto" }}>
      {/* Header */}
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
          <Sliders size={13} weight="bold" />
          <span>SECTION 01 / CALIBRATION & SPEC CHECKER</span>
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
          Commodity Quality Calibrator
        </h2>
        <p style={{ fontSize: "15px", color: "var(--text-secondary)", lineHeight: 1.6 }}>
          Calibrate physical cargo defect tolerances across grains, oilseeds, and sugar. Upload signed contract specifications or save custom buyer profiles.
        </p>
      </div>

      {/* Preset Commodity Switcher */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          flexWrap: "wrap",
          marginBottom: "20px",
        }}
      >
        <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", marginRight: "4px" }}>
          Commodities:
        </span>
        {Object.entries(COMMODITY_PRESETS).map(([key, item]) => {
          const isActive = selectedPreset === key;
          return (
            <button
              key={key}
              onClick={() => handlePresetChange(key)}
              style={{
                padding: "8px 14px",
                borderRadius: "9999px",
                fontSize: "12.5px",
                fontWeight: 500,
                backgroundColor: isActive ? "var(--accent-primary)" : "var(--bg-card)",
                color: isActive ? "#FFFFFF" : "var(--text-secondary)",
                border: `1px solid ${isActive ? "var(--accent-primary)" : "var(--border-main)"}`,
                boxShadow: isActive ? "var(--shadow-sm)" : "none",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Quality Checker Bar (Saved Buyer Specs + Contract Upload) */}
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
          backgroundColor: "var(--bg-subtle)",
        }}
      >
        {/* Saved Specs Selector */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12.5px", fontWeight: 600, color: "var(--text-main)" }}>
            <BookmarkSimple size={16} color="var(--accent-primary)" weight="bold" />
            <span>Quality Checker:</span>
          </div>

          <select
            onChange={(e) => e.target.value && handleLoadSavedSpec(e.target.value)}
            style={{
              padding: "6px 12px",
              borderRadius: "8px",
              fontSize: "13px",
              backgroundColor: "var(--bg-card)",
              color: "var(--text-main)",
              border: "1px solid var(--border-main)",
              minWidth: "220px",
            }}
          >
            <option value="">Select Saved Buyer Spec...</option>
            {savedSpecs.map((spec) => (
              <option key={spec.id} value={spec.id}>
                {spec.name}
              </option>
            ))}
          </select>

          <button
            onClick={() => setIsSavingSpec(!isSavingSpec)}
            style={{
              fontSize: "12px",
              fontWeight: 600,
              color: "var(--accent-primary)",
              textDecoration: "underline",
              cursor: "pointer",
            }}
          >
            {isSavingSpec ? "Cancel" : "+ Save Current as Buyer Spec"}
          </button>
        </div>

        {/* Upload Signed Contract Button */}
        <div>
          <label
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "7px 14px",
              borderRadius: "8px",
              fontSize: "12.5px",
              fontWeight: 600,
              backgroundColor: "var(--bg-card)",
              color: "var(--text-main)",
              border: "1px solid var(--border-main)",
              cursor: "pointer",
            }}
          >
            <UploadSimple size={15} weight="bold" />
            <span>{isUploading ? "Reading Contract..." : "Upload Signed Contract Spec (PDF)"}</span>
            <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={handleFileUpload} style={{ display: "none" }} />
          </label>
        </div>
      </div>

      {/* Save Spec Modal Input Inline */}
      {isSavingSpec && (
        <form
          onSubmit={handleSaveSpec}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "20px",
            padding: "12px 18px",
            borderRadius: "10px",
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--accent-border)",
          }}
        >
          <input
            type="text"
            required
            placeholder="Enter Buyer Profile Name (e.g. Al-Khaleej Dubai Spec 2026)"
            value={newSpecName}
            onChange={(e) => setNewSpecName(e.target.value)}
            style={{
              flex: 1,
              padding: "8px 12px",
              borderRadius: "6px",
              border: "1px solid var(--border-main)",
              fontSize: "13px",
              backgroundColor: "var(--bg-subtle)",
              color: "var(--text-main)",
            }}
          />
          <button type="submit" className="btn-primary" style={{ padding: "8px 16px", fontSize: "12.5px" }}>
            Save Profile
          </button>
        </form>
      )}

      {/* Uploaded Contract Pill */}
      {uploadedContract && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 16px",
            borderRadius: "8px",
            backgroundColor: "var(--success-bg)",
            border: "1px solid var(--success-border)",
            marginBottom: "20px",
            fontSize: "13px",
            color: "var(--success-text)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <FileText size={18} weight="bold" />
            <span>
              Contract Attached: <strong>{uploadedContract.filename}</strong> (Parsed specs synced to calibrator)
            </span>
          </div>
          <button
            onClick={() => setUploadedContract(null)}
            style={{ color: "var(--danger)", cursor: "pointer" }}
            title="Remove contract"
          >
            <Trash size={16} />
          </button>
        </div>
      )}

      {/* Interactive Main Two-Column Layout */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
          gap: "24px",
          alignItems: "start",
        }}
      >
        {/* Left Column: Parameter Sliders */}
        <div className="card-shell" style={{ padding: "24px 28px" }}>
          <h3
            className="font-heading"
            style={{
              fontSize: "18px",
              fontWeight: 700,
              color: "var(--text-main)",
              marginBottom: "20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span>Physical Defect Parameters</span>
            <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 500 }}>
              Live Interactive Adjustments
            </span>
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            {/* Broken Grain % */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-main)" }}>Broken Grain</span>
                <span className="font-mono" style={{ fontSize: "13px", fontWeight: 700, color: "var(--accent-primary)" }}>
                  {params.broken}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="25"
                step="0.1"
                value={params.broken}
                onChange={(e) => updateParam("broken", parseFloat(e.target.value))}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10.5px", color: "var(--text-muted)", marginTop: "2px" }}>
                <span>0% (Nil)</span>
                <span>Max Export Tolerance: 5.0%</span>
                <span>25%</span>
              </div>
            </div>

            {/* Purity % */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-main)" }}>Purity / Foreign Matter</span>
                <span className="font-mono" style={{ fontSize: "13px", fontWeight: 700, color: "var(--accent-primary)" }}>
                  {params.purity}%
                </span>
              </div>
              <input
                type="range"
                min="85"
                max="100"
                step="0.1"
                value={params.purity}
                onChange={(e) => updateParam("purity", parseFloat(e.target.value))}
              />
            </div>

            {/* Damage & Chalky Kernels */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)" }}>Damage Kernel</span>
                  <span className="font-mono" style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-main)" }}>
                    {params.damageKernel}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.1"
                  value={params.damageKernel}
                  onChange={(e) => updateParam("damageKernel", parseFloat(e.target.value))}
                />
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)" }}>Chalky / Immature</span>
                  <span className="font-mono" style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-main)" }}>
                    {params.chalkyImmature}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="15"
                  step="0.1"
                  value={params.chalkyImmature}
                  onChange={(e) => updateParam("chalkyImmature", parseFloat(e.target.value))}
                />
              </div>
            </div>

            {/* Grain Length & Moisture */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)" }}>Avg Length</span>
                  <span className="font-mono" style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-main)" }}>
                    {params.averageGrainLength} mm
                  </span>
                </div>
                <input
                  type="range"
                  min="1.0"
                  max="12.0"
                  step="0.1"
                  value={params.averageGrainLength}
                  onChange={(e) => updateParam("averageGrainLength", parseFloat(e.target.value))}
                />
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)" }}>Moisture %</span>
                  <span className="font-mono" style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-main)" }}>
                    {params.moisture}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="18"
                  step="0.1"
                  value={params.moisture}
                  onChange={(e) => updateParam("moisture", parseFloat(e.target.value))}
                />
              </div>
            </div>

            {/* Live Insects (Zero Tolerance) */}
            <div
              style={{
                padding: "12px 14px",
                borderRadius: "10px",
                backgroundColor: params.liveInsects > 0 ? "var(--danger-bg)" : "var(--bg-subtle)",
                border: `1px solid ${params.liveInsects > 0 ? "var(--danger-border)" : "var(--border-main)"}`,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--text-main)" }}>
                    Live Insects (Zero Tolerance)
                  </div>
                  <div style={{ fontSize: "11px", color: params.liveInsects > 0 ? "var(--danger)" : "var(--text-muted)" }}>
                    {params.liveInsects > 0 ? "Quarantine condition: reject" : "0 insects detected (compliant)"}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    onClick={() => updateParam("liveInsects", 0)}
                    style={{
                      padding: "4px 10px",
                      borderRadius: "6px",
                      fontSize: "11px",
                      fontWeight: 600,
                      backgroundColor: params.liveInsects === 0 ? "var(--success)" : "var(--bg-card)",
                      color: params.liveInsects === 0 ? "#FFFFFF" : "var(--text-secondary)",
                      border: "1px solid var(--border-main)",
                    }}
                  >
                    0 (Pass)
                  </button>
                  <button
                    onClick={() => updateParam("liveInsects", 1)}
                    style={{
                      padding: "4px 10px",
                      borderRadius: "6px",
                      fontSize: "11px",
                      fontWeight: 600,
                      backgroundColor: params.liveInsects > 0 ? "var(--danger)" : "var(--bg-card)",
                      color: params.liveInsects > 0 ? "#FFFFFF" : "var(--text-secondary)",
                      border: "1px solid var(--border-main)",
                    }}
                  >
                    &gt;0 (Fail)
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Verdict & Export Summary */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Main Verdict Card */}
          <div
            className="card-shell"
            style={{
              padding: "24px",
              backgroundColor: verdict.bg,
              borderColor: verdict.border,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
              {verdict.status === "PASS" ? (
                <CheckCircle size={24} color={verdict.color} weight="fill" />
              ) : verdict.status === "WARN" ? (
                <Warning size={24} color={verdict.color} weight="fill" />
              ) : (
                <XCircle size={24} color={verdict.color} weight="fill" />
              )}
              <h4
                className="font-heading"
                style={{
                  fontSize: "19px",
                  fontWeight: 700,
                  color: "var(--text-main)",
                }}
              >
                {verdict.label}
              </h4>
            </div>

            <p style={{ fontSize: "13.5px", color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: "16px" }}>
              {verdict.reason}
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "10px",
                padding: "12px",
                borderRadius: "10px",
                backgroundColor: "var(--bg-card)",
                border: "1px solid var(--border-main)",
              }}
            >
              <div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Total Defects</div>
                <div className="font-mono" style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-main)" }}>
                  {totalDefects}%
                </div>
              </div>
              <div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Purity Score</div>
                <div className="font-mono" style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-main)" }}>
                  {params.purity}%
                </div>
              </div>
            </div>
          </div>

          {/* Quick Specifications Breakdown */}
          <div className="card-shell" style={{ padding: "22px 24px" }}>
            <h4
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color: "var(--text-main)",
                marginBottom: "14px",
              }}
            >
              Calibrated Cargo Specifications
            </h4>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-secondary)" }}>
                <span>Commodity Category:</span>
                <span style={{ fontWeight: 600, color: "var(--text-main)" }}>{params.commodity}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-secondary)" }}>
                <span>Moisture Limit:</span>
                <span className="font-mono" style={{ fontWeight: 600, color: "var(--text-main)" }}>
                  {params.moisture}%
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-secondary)" }}>
                <span>Average Sizing:</span>
                <span className="font-mono" style={{ fontWeight: 600, color: "var(--text-main)" }}>
                  {params.averageGrainLength} mm
                </span>
              </div>
            </div>

            <button
              onClick={() =>
                onInjectIntoBooking(params, uploadedContract ? { filename: uploadedContract.filename, specName: selectedPreset } : undefined)
              }
              className="btn-primary"
              style={{
                width: "100%",
                marginTop: "20px",
                padding: "12px",
                fontSize: "14px",
              }}
            >
              <Sparkle size={16} weight="fill" />
              <span>Book Inspection with These Specs</span>
              <ArrowRight size={14} weight="bold" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

