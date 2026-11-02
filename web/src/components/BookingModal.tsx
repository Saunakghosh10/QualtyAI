"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  SpinnerGap,
  Sparkle,
  Lightning,
  Gavel,
  Clock,
  CurrencyDollar,
  FileText,
} from "@phosphor-icons/react";
import { CommodityParams } from "./CommodityCalibrator";

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  injectedParams?: CommodityParams | null;
  contractInfo?: { filename: string; specName: string } | null;
  initialServiceType?: string;
}

export default function BookingModal({
  isOpen,
  onClose,
  injectedParams,
  contractInfo,
  initialServiceType,
}: BookingModalProps) {
  const [bookingMode, setBookingMode] = useState<"quick" | "inquiry">("quick");
  const [step, setStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    bookingType: "quick" as "quick" | "inquiry",
    serviceName: initialServiceType || "Pre-Shipment Inspection (PSI)",
    portLocation: "Mundra Port, Gujarat, Berth 04",
    country: "India",
    destinationCountry: "United Arab Emirates",
    commodity: "Rice (1121 Basmati)",
    volumeTons: 2500,
    jobDurationDays: 3,
    inspectionDate: "2026-11-05",
    endDate: "2026-11-08",
    targetBudgetUSD: 1800,
    companyName: "CargoFirst Global Trading FZE",
    contactName: "Saunak Ghosh",
    email: "ops@cargofirst.com",
    phone: "+91 98765 43210",
    kycSandboxStatus: "BASIC_VERIFIED",
    notes: "",
  });

  useEffect(() => {
    if (initialServiceType) {
      setFormData((prev) => ({ ...prev, serviceName: initialServiceType }));
    }
  }, [initialServiceType]);

  useEffect(() => {
    if (injectedParams) {
      setFormData((prev) => ({
        ...prev,
        commodity: `${injectedParams.commodity} (Broken &le;${injectedParams.broken}%, Purity &ge;${injectedParams.purity}%)`,
      }));
    }
  }, [injectedParams]);

  if (!isOpen) return null;

  const handleModeSwitch = (mode: "quick" | "inquiry") => {
    setBookingMode(mode);
    setFormData((prev) => ({
      ...prev,
      bookingType: mode,
      jobDurationDays: mode === "quick" ? 3 : 8,
      targetBudgetUSD: mode === "quick" ? 650 : 2500,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      const prefix = bookingMode === "quick" ? "QI" : "RI";
      const generatedId = `${prefix}-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      setSubmittedRef(generatedId);
    }, 1100);
  };

  const handleReset = () => {
    setSubmittedRef(null);
    setStep(1);
    onClose();
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        backgroundColor: "var(--modal-backdrop)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="card-shell"
        style={{
          width: "100%",
          maxWidth: "680px",
          maxHeight: "92vh",
          overflowY: "auto",
          backgroundColor: "var(--bg-card)",
          boxShadow: "var(--shadow-xl)",
          padding: "28px",
          position: "relative",
        }}
      >
        {/* Header Bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "18px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h3 className="font-heading" style={{ fontSize: "20px", fontWeight: 700, color: "var(--text-main)" }}>
                Book Cargo Inspection
              </h3>
              {contractInfo && (
                <span className="badge-pill" style={{ backgroundColor: "var(--accent-light)", color: "var(--accent-text)", fontSize: "11px" }}>
                  <FileText size={12} weight="fill" />
                  Contract Linked
                </span>
              )}
            </div>
            <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "2px" }}>
              Select dispatch method for accredited marine surveyors
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

        {submittedRef ? (
          /* Confirmation Screen */
          <div style={{ textAlign: "center", padding: "28px 16px" }}>
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
                margin: "0 auto 18px",
              }}
            >
              <CheckCircle size={32} weight="fill" />
            </div>

            <h4 className="font-heading" style={{ fontSize: "22px", fontWeight: 700, color: "var(--text-main)", marginBottom: "8px" }}>
              {bookingMode === "quick" ? "Quick Inspection Booked!" : "Inquiry Published for Bidding!"}
            </h4>

            <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "20px", maxWidth: "460px", margin: "0 auto 20px" }}>
              {bookingMode === "quick"
                ? `Surveyor matching confirmed for ${formData.portLocation}. Immediate dispatch SLA activated.`
                : `Your inquiry has been broadcasted to accredited inspection companies. Surveyor bids ($500–$5,000) will appear in your dashboard.`}
            </p>

            <div
              style={{
                backgroundColor: "var(--bg-subtle)",
                border: "1px solid var(--border-main)",
                borderRadius: "10px",
                padding: "16px",
                maxWidth: "340px",
                margin: "0 auto 24px",
              }}
            >
              <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>
                Tracking Reference ID
              </div>
              <div className="font-mono" style={{ fontSize: "20px", fontWeight: 700, color: "var(--accent-primary)" }}>
                {submittedRef}
              </div>
            </div>

            <button onClick={handleReset} className="btn-primary" style={{ padding: "10px 24px" }}>
              Done & Return
            </button>
          </div>
        ) : (
          <div>
            {/* Dual Booking Mode Switcher Tab */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "10px",
                padding: "4px",
                backgroundColor: "var(--bg-subtle)",
                borderRadius: "10px",
                marginBottom: "22px",
                border: "1px solid var(--border-main)",
              }}
            >
              <button
                type="button"
                onClick={() => handleModeSwitch("quick")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  padding: "10px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: 600,
                  backgroundColor: bookingMode === "quick" ? "var(--bg-card)" : "transparent",
                  color: bookingMode === "quick" ? "var(--accent-primary)" : "var(--text-secondary)",
                  boxShadow: bookingMode === "quick" ? "var(--shadow-sm)" : "none",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <Lightning size={16} weight="fill" />
                <span>Quick Inspection (&lt; 5 Days)</span>
              </button>

              <button
                type="button"
                onClick={() => handleModeSwitch("inquiry")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  padding: "10px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: 600,
                  backgroundColor: bookingMode === "inquiry" ? "var(--bg-card)" : "transparent",
                  color: bookingMode === "inquiry" ? "var(--accent-primary)" : "var(--text-secondary)",
                  boxShadow: bookingMode === "inquiry" ? "var(--shadow-sm)" : "none",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <Gavel size={16} weight="bold" />
                <span>Raise an Inquiry (&gt; 5 Days Bidding)</span>
              </button>
            </div>

            {/* Mode Explanation Banner */}
            <div
              style={{
                padding: "10px 14px",
                borderRadius: "8px",
                backgroundColor: bookingMode === "quick" ? "var(--accent-light)" : "var(--warning-bg)",
                border: `1px solid ${bookingMode === "quick" ? "var(--accent-border)" : "var(--warning-border)"}`,
                marginBottom: "20px",
                fontSize: "12.5px",
                color: bookingMode === "quick" ? "var(--accent-text)" : "var(--warning-text)",
              }}
            >
              {bookingMode === "quick" ? (
                <span>
                  <strong>Instant Match:</strong> Direct local surveyor dispatch for fast container stuffing, draft survey, or warehouse audits within 2 hours.
                </span>
              ) : (
                <span>
                  <strong>Bidding RFP:</strong> For multi-day bulk vessel loading. Verified survey agencies submit competitive bids ($500, $1,000, up to $5,000+).
                </span>
              )}
            </div>

            {/* Step Indicators */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  style={{
                    flex: 1,
                    height: "4px",
                    borderRadius: "9999px",
                    backgroundColor: s <= step ? "var(--accent-primary)" : "var(--border-main)",
                    transition: "all 0.2s ease",
                  }}
                />
              ))}
            </div>

            {/* Step 1: Service & Port Scope */}
            {step === 1 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <label style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-main)", display: "block", marginBottom: "6px" }}>
                    Service Type
                  </label>
                  <select
                    value={formData.serviceName}
                    onChange={(e) => setFormData({ ...formData, serviceName: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      border: "1px solid var(--border-main)",
                      backgroundColor: "var(--bg-card)",
                      color: "var(--text-main)",
                      fontSize: "13.5px",
                    }}
                  >
                    <option value="Pre-Shipment Inspection (PSI)">Pre-Shipment Inspection (PSI) — Warehouse/Mandi</option>
                    <option value="Loading & Unloading Supervision">Loading & Unloading Supervision — Port Terminal</option>
                    <option value="Container Stuffing Survey">Container Stuffing Survey — Lashing, Dunnage & Seals</option>
                    <option value="Destination Cargo Inspection">Destination Cargo Inspection — Discharge Port</option>
                  </select>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-main)", display: "block", marginBottom: "6px" }}>
                      Loading Port / Location
                    </label>
                    <input
                      type="text"
                      value={formData.portLocation}
                      onChange={(e) => setFormData({ ...formData, portLocation: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        borderRadius: "8px",
                        border: "1px solid var(--border-main)",
                        backgroundColor: "var(--bg-card)",
                        color: "var(--text-main)",
                        fontSize: "13.5px",
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-main)", display: "block", marginBottom: "6px" }}>
                      Export Destination Country
                    </label>
                    <input
                      type="text"
                      value={formData.destinationCountry}
                      onChange={(e) => setFormData({ ...formData, destinationCountry: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        borderRadius: "8px",
                        border: "1px solid var(--border-main)",
                        backgroundColor: "var(--bg-card)",
                        color: "var(--text-main)",
                        fontSize: "13.5px",
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-main)", display: "block", marginBottom: "6px" }}>
                      Commodity & Spec
                    </label>
                    <input
                      type="text"
                      value={formData.commodity}
                      onChange={(e) => setFormData({ ...formData, commodity: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        borderRadius: "8px",
                        border: "1px solid var(--border-main)",
                        backgroundColor: "var(--bg-card)",
                        color: "var(--text-main)",
                        fontSize: "13.5px",
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-main)", display: "block", marginBottom: "6px" }}>
                      Estimated Volume (Metric Tons)
                    </label>
                    <input
                      type="number"
                      value={formData.volumeTons}
                      onChange={(e) => setFormData({ ...formData, volumeTons: parseFloat(e.target.value) || 0 })}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        borderRadius: "8px",
                        border: "1px solid var(--border-main)",
                        backgroundColor: "var(--bg-card)",
                        color: "var(--text-main)",
                        fontSize: "13.5px",
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "12px" }}>
                  <button onClick={() => setStep(2)} className="btn-primary" style={{ padding: "10px 20px" }}>
                    <span>Next: Schedule & Budget</span>
                    <ArrowRight size={14} weight="bold" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Schedule & Pricing / Bidding */}
            {step === 2 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-main)", display: "block", marginBottom: "6px" }}>
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={formData.inspectionDate}
                      onChange={(e) => setFormData({ ...formData, inspectionDate: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        borderRadius: "8px",
                        border: "1px solid var(--border-main)",
                        backgroundColor: "var(--bg-card)",
                        color: "var(--text-main)",
                        fontSize: "13.5px",
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-main)", display: "block", marginBottom: "6px" }}>
                      Estimated Duration (Days)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={bookingMode === "quick" ? 5 : 30}
                      value={formData.jobDurationDays}
                      onChange={(e) => setFormData({ ...formData, jobDurationDays: parseInt(e.target.value) || 1 })}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        borderRadius: "8px",
                        border: "1px solid var(--border-main)",
                        backgroundColor: "var(--bg-card)",
                        color: "var(--text-main)",
                        fontSize: "13.5px",
                      }}
                    />
                  </div>
                </div>

                {/* Pricing / Budget section based on mode */}
                {bookingMode === "quick" ? (
                  <div
                    style={{
                      padding: "16px",
                      borderRadius: "10px",
                      backgroundColor: "var(--bg-subtle)",
                      border: "1px solid var(--border-main)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--text-main)" }}>
                          Standard Rapid Inspection Rate
                        </div>
                        <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                          Flat rate for certified local surveyor dispatch (includes digital photo evidence)
                        </div>
                      </div>
                      <div className="font-mono" style={{ fontSize: "20px", fontWeight: 700, color: "var(--accent-primary)" }}>
                        $650 USD
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-main)", display: "block", marginBottom: "6px" }}>
                      Target Inquiry Budget (USD) — Providers will bid between $500 to $5,000+
                    </label>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span className="font-mono" style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-secondary)" }}>
                        $
                      </span>
                      <input
                        type="number"
                        step="100"
                        min="500"
                        max="10000"
                        value={formData.targetBudgetUSD}
                        onChange={(e) => setFormData({ ...formData, targetBudgetUSD: parseFloat(e.target.value) || 500 })}
                        style={{
                          flex: 1,
                          padding: "10px 14px",
                          borderRadius: "8px",
                          border: "1px solid var(--border-main)",
                          backgroundColor: "var(--bg-card)",
                          color: "var(--text-main)",
                          fontSize: "14px",
                        }}
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-main)", display: "block", marginBottom: "6px" }}>
                    Special Field Instructions / Hold Access Notes
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Sampling every 500 bags, check hatch 2 for prior fertilizer residue, take hold temperature."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      border: "1px solid var(--border-main)",
                      backgroundColor: "var(--bg-card)",
                      color: "var(--text-main)",
                      fontSize: "13px",
                      resize: "vertical",
                    }}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "12px" }}>
                  <button onClick={() => setStep(1)} className="btn-secondary" style={{ padding: "10px 18px" }}>
                    <ArrowLeft size={14} weight="bold" />
                    <span>Back</span>
                  </button>

                  <button onClick={() => setStep(3)} className="btn-primary" style={{ padding: "10px 20px" }}>
                    <span>Next: Trader Profile & KYC</span>
                    <ArrowRight size={14} weight="bold" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Trader Profile & Sandbox KYC */}
            {step === 3 && (
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* KYC Sandbox Badge */}
                <div
                  style={{
                    padding: "12px 14px",
                    borderRadius: "8px",
                    backgroundColor: "var(--success-bg)",
                    border: "1px solid var(--success-border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontSize: "12.5px",
                    color: "var(--success-text)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <ShieldCheck size={18} weight="bold" />
                    <span>
                      Service Receiver Status: <strong>KYC Sandbox Verified</strong>
                    </span>
                  </div>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Instant Booking Active</span>
                </div>

                <div>
                  <label style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-main)", display: "block", marginBottom: "6px" }}>
                    Company / Trading House
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      border: "1px solid var(--border-main)",
                      backgroundColor: "var(--bg-card)",
                      color: "var(--text-main)",
                      fontSize: "14px",
                    }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-main)", display: "block", marginBottom: "6px" }}>
                      Contact Person
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.contactName}
                      onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        borderRadius: "8px",
                        border: "1px solid var(--border-main)",
                        backgroundColor: "var(--bg-card)",
                        color: "var(--text-main)",
                        fontSize: "14px",
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-main)", display: "block", marginBottom: "6px" }}>
                      Official Email
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        borderRadius: "8px",
                        border: "1px solid var(--border-main)",
                        backgroundColor: "var(--bg-card)",
                        color: "var(--text-main)",
                        fontSize: "14px",
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "14px" }}>
                  <button type="button" onClick={() => setStep(2)} className="btn-secondary" style={{ padding: "10px 18px" }}>
                    <ArrowLeft size={14} weight="bold" />
                    <span>Back</span>
                  </button>

                  <button type="submit" disabled={isSubmitting} className="btn-primary" style={{ padding: "10px 22px" }}>
                    {isSubmitting ? (
                      <>
                        <SpinnerGap size={16} className="animate-spin" />
                        <span>Processing Dispatch...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={16} weight="bold" />
                        <span>
                          {bookingMode === "quick" ? "Confirm & Dispatch Surveyor" : "Publish Inquiry for Bids"}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

