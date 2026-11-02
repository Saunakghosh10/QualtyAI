"use client";

import React, { useState } from "react";
import {
  Compass,
  CloudRain,
  Sun,
  Drop,
  Thermometer,
  Eye,
  CheckCircle,
  Warning,
  FileText,
  CurrencyDollar,
  TrendUp,
  UserCheck,
  Copy,
  Check,
} from "@phosphor-icons/react";

export default function QualityPilot() {
  // Field observation states
  const [weatherCondition, setWeatherCondition] = useState<"clear" | "overcast" | "rain">("clear");
  const [humidity, setHumidity] = useState<number>(64);
  const [temperature, setTemperature] = useState<number>(31);
  const [odorStatus, setOdorStatus] = useState<"normal" | "musty" | "sour">("normal");
  const [damagedBags, setDamagedBags] = useState<number>(4);
  const [holdCleanliness, setHoldCleanliness] = useState<"pass" | "re-sweep" | "reject">("pass");
  const [containerSeal, setContainerSeal] = useState<string>("IN-MUN-892401");

  // Output generated report
  const [generatedBrief, setGeneratedBrief] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const handleGenerateBrief = () => {
    const timestamp = new Date().toISOString().replace("T", " ").substring(0, 19) + " UTC";
    const brief = `PRELIMINARY FIELD INSPECTION BRIEF (QUALTY PILOT)
-----------------------------------------------------------------
Timestamp: ${timestamp}
Location: Mundra Port Terminal 02, Berth 04
Surveyor ID: IND-SUR-9842 (Capt. S. K. Verma)

ENVIRONMENTAL & WEATHER OBSERVATIONS:
- Sky & Precipitation: ${weatherCondition.toUpperCase()} ${weatherCondition === "rain" ? "[CAUTION: HATCHES ORDERED CLOSED]" : "[SAFE FOR LOADING]"}
- Ambient Humidity: ${humidity}%
- Ambient Temp: ${temperature}°C

CARGO ORGANOLEPTIC & STOWAGE CHECK:
- Aroma / Odor: ${odorStatus.toUpperCase()} ${odorStatus === "normal" ? "(Characteristic natural grain smell)" : "(Warning: abnormal moisture aroma detected)"}
- Hold Cleanliness: ${holdCleanliness.toUpperCase()} (Bilges dry, zero scale rust)
- Packaging Condition: ${damagedBags} bags torn by sling hook (re-bagged on dock)
- Container Bolt Seal: Verified intact (#${containerSeal})

DISPATCH VERDICT: CONFORMING FOR LOADING / DEPARTURE
-----------------------------------------------------------------
Certified by Qualty.AI Mobile Field Co-Pilot`;

    setGeneratedBrief(brief);
  };

  const handleCopy = () => {
    if (!generatedBrief) return;
    navigator.clipboard.writeText(generatedBrief);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section
      id="pilot"
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
          <Compass size={13} weight="bold" />
          <span>SECTION 04 / SURVEYOR FIELD CO-PILOT</span>
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
          Quality Pilot & Productivity Console
        </h2>
        <p style={{ fontSize: "15px", color: "var(--text-secondary)", lineHeight: 1.6 }}>
          Field observation tool for marine inspectors on-dock. Log weather conditions, cargo smell, and bag damage in real time to auto-generate certified preliminary briefs.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
          gap: "24px",
          alignItems: "start",
        }}
      >
        {/* Left Card: Field Observation Logger */}
        <div className="card-shell" style={{ padding: "24px 28px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
            <h3 className="font-heading" style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-main)" }}>
              Field Observation Logger
            </h3>
            <span className="badge-pill" style={{ backgroundColor: "var(--bg-subtle)", color: "var(--text-muted)" }}>
              Live Berth 04 Sync
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Weather & Rain */}
            <div>
              <label style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>
                Weather & Precipitation (Hatch Warning)
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => setWeatherCondition("clear")}
                  style={{
                    padding: "8px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: 600,
                    backgroundColor: weatherCondition === "clear" ? "var(--accent-primary)" : "var(--bg-subtle)",
                    color: weatherCondition === "clear" ? "#FFFFFF" : "var(--text-secondary)",
                    border: "1px solid var(--border-main)",
                    cursor: "pointer",
                  }}
                >
                  Clear / Sunny
                </button>
                <button
                  type="button"
                  onClick={() => setWeatherCondition("overcast")}
                  style={{
                    padding: "8px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: 600,
                    backgroundColor: weatherCondition === "overcast" ? "var(--accent-primary)" : "var(--bg-subtle)",
                    color: weatherCondition === "overcast" ? "#FFFFFF" : "var(--text-secondary)",
                    border: "1px solid var(--border-main)",
                    cursor: "pointer",
                  }}
                >
                  Overcast
                </button>
                <button
                  type="button"
                  onClick={() => setWeatherCondition("rain")}
                  style={{
                    padding: "8px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: 600,
                    backgroundColor: weatherCondition === "rain" ? "var(--danger)" : "var(--bg-subtle)",
                    color: weatherCondition === "rain" ? "#FFFFFF" : "var(--danger-text)",
                    border: "1px solid var(--border-main)",
                    cursor: "pointer",
                  }}
                >
                  Rain (Close Hatches)
                </button>
              </div>
            </div>

            {/* Humidity & Temp */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>
                  Humidity: {humidity}%
                </label>
                <input
                  type="range"
                  min="30"
                  max="95"
                  value={humidity}
                  onChange={(e) => setHumidity(parseInt(e.target.value))}
                />
              </div>

              <div>
                <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>
                  Ambient Temp: {temperature}°C
                </label>
                <input
                  type="range"
                  min="15"
                  max="48"
                  value={temperature}
                  onChange={(e) => setTemperature(parseInt(e.target.value))}
                />
              </div>
            </div>

            {/* Cargo Aroma / Smell */}
            <div>
              <label style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>
                Cargo Organoleptic Aroma / Smell
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => setOdorStatus("normal")}
                  style={{
                    padding: "7px",
                    borderRadius: "6px",
                    fontSize: "11.5px",
                    fontWeight: 600,
                    backgroundColor: odorStatus === "normal" ? "var(--success)" : "var(--bg-subtle)",
                    color: odorStatus === "normal" ? "#FFFFFF" : "var(--text-secondary)",
                    border: "1px solid var(--border-main)",
                    cursor: "pointer",
                  }}
                >
                  Natural Fresh
                </button>
                <button
                  type="button"
                  onClick={() => setOdorStatus("musty")}
                  style={{
                    padding: "7px",
                    borderRadius: "6px",
                    fontSize: "11.5px",
                    fontWeight: 600,
                    backgroundColor: odorStatus === "musty" ? "var(--warning)" : "var(--bg-subtle)",
                    color: odorStatus === "musty" ? "#FFFFFF" : "var(--text-secondary)",
                    border: "1px solid var(--border-main)",
                    cursor: "pointer",
                  }}
                >
                  Musty / Damp
                </button>
                <button
                  type="button"
                  onClick={() => setOdorStatus("sour")}
                  style={{
                    padding: "7px",
                    borderRadius: "6px",
                    fontSize: "11.5px",
                    fontWeight: 600,
                    backgroundColor: odorStatus === "sour" ? "var(--danger)" : "var(--bg-subtle)",
                    color: odorStatus === "sour" ? "#FFFFFF" : "var(--text-secondary)",
                    border: "1px solid var(--border-main)",
                    cursor: "pointer",
                  }}
                >
                  Sour / Fermenting
                </button>
              </div>
            </div>

            {/* Hold Cleanliness & Torn Bags */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>
                  Hold Cleanliness
                </label>
                <select
                  value={holdCleanliness}
                  onChange={(e) => setHoldCleanliness(e.target.value as any)}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: "6px",
                    border: "1px solid var(--border-main)",
                    backgroundColor: "var(--bg-card)",
                    color: "var(--text-main)",
                    fontSize: "12.5px",
                  }}
                >
                  <option value="pass">Clean & Dry (Passed)</option>
                  <option value="re-sweep">Re-sweep Required</option>
                  <option value="reject">Rejected (Contaminated)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>
                  Torn Bags Count
                </label>
                <input
                  type="number"
                  min="0"
                  value={damagedBags}
                  onChange={(e) => setDamagedBags(parseInt(e.target.value) || 0)}
                  style={{
                    width: "100%",
                    padding: "7px 10px",
                    borderRadius: "6px",
                    border: "1px solid var(--border-main)",
                    backgroundColor: "var(--bg-card)",
                    color: "var(--text-main)",
                    fontSize: "12.5px",
                  }}
                />
              </div>
            </div>

            <button onClick={handleGenerateBrief} className="btn-primary" style={{ padding: "10px", fontSize: "13px", marginTop: "6px" }}>
              <FileText size={16} weight="bold" />
              <span>Generate Preliminary Field Brief</span>
            </button>
          </div>
        </div>

        {/* Right Card: Productivity Dashboard Preview + Generated Brief */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Inspector Earnings & Metric Preview */}
          <div className="card-shell" style={{ padding: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  Surveyor Portal Console
                </div>
                <h4 className="font-heading" style={{ fontSize: "17px", fontWeight: 700, color: "var(--text-main)" }}>
                  Capt. S. K. Verma (Adani Mundra Hub)
                </h4>
              </div>
              <span className="badge-pill" style={{ backgroundColor: "var(--success-bg)", color: "var(--success-text)" }}>
                Active On-Dock
              </span>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: "10px",
                padding: "12px",
                backgroundColor: "var(--bg-subtle)",
                borderRadius: "10px",
                border: "1px solid var(--border-main)",
              }}
            >
              <div>
                <div style={{ fontSize: "10.5px", color: "var(--text-muted)" }}>Surveys Done</div>
                <div className="font-mono" style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-main)" }}>
                  48
                </div>
              </div>
              <div>
                <div style={{ fontSize: "10.5px", color: "var(--text-muted)" }}>On-Time SLA</div>
                <div className="font-mono" style={{ fontSize: "16px", fontWeight: 700, color: "var(--success)" }}>
                  99.2%
                </div>
              </div>
              <div>
                <div style={{ fontSize: "10.5px", color: "var(--text-muted)" }}>Monthly Payout</div>
                <div className="font-mono" style={{ fontSize: "16px", fontWeight: 700, color: "var(--accent-primary)" }}>
                  $14,250
                </div>
              </div>
            </div>
          </div>

          {/* Generated Brief Terminal Preview */}
          {generatedBrief && (
            <div className="card-shell" style={{ padding: "20px", backgroundColor: "var(--bg-inset)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <span style={{ fontSize: "11.5px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                  Instant Certified Brief
                </span>
                <button
                  onClick={handleCopy}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "11.5px",
                    fontWeight: 600,
                    color: "var(--accent-primary)",
                    cursor: "pointer",
                  }}
                >
                  {copied ? <Check size={13} weight="bold" color="var(--success)" /> : <Copy size={13} />}
                  <span>{copied ? "Copied" : "Copy Brief"}</span>
                </button>
              </div>

              <pre
                className="font-mono"
                style={{
                  fontSize: "11.5px",
                  lineHeight: 1.5,
                  color: "var(--text-main)",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  backgroundColor: "var(--bg-card)",
                  padding: "14px",
                  borderRadius: "8px",
                  border: "1px solid var(--border-main)",
                }}
              >
                {generatedBrief}
              </pre>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

