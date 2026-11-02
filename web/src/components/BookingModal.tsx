"use client";

import React, { useEffect, useState } from "react";
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
import { useDB, specLabel, checkParty, createOrder } from "@/lib/store";

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

  const [seenService, setSeenService] = useState(initialServiceType);
  if (initialServiceType !== seenService) {
    setSeenService(initialServiceType);
    if (initialServiceType) setFormData((prev) => ({ ...prev, serviceName: initialServiceType }));
  }

  // Spec attached to the order: from the Calibrator or a saved buyer spec.
  const savedSpecs = useDB().specs;
  const [spec, setSpec] = useState<CommodityParams | null>(null);
  const [specName, setSpecName] = useState<string | null>(null);
  const [selectedSpecId, setSelectedSpecId] = useState("");

  // Buyer / seller verification
  const [parties, setParties] = useState({
    buyerName: "",
    buyerGstin: "",
    buyerIec: "",
    sellerName: "",
    sellerGstin: "",
    sellerIec: "",
  });
  const [partyProblems, setPartyProblems] = useState<string[]>([]);

  const describe = (p: CommodityParams) => `${p.commodity} (broken ≤ ${p.broken}%, purity ≥ ${p.purity}%)`;

  // When the Calibrator hands over new params, adopt them (adjusting state during render, not in an effect).
  const [seenParams, setSeenParams] = useState<CommodityParams | null | undefined>(undefined);
  if (injectedParams !== seenParams) {
    setSeenParams(injectedParams);
    if (injectedParams) {
      setSpec(injectedParams);
      setSpecName(contractInfo?.specName ? `Calibrator: ${contractInfo.specName}` : "From the Calibrator");
      setSelectedSpecId("");
      setFormData((prev) => ({ ...prev, commodity: describe(injectedParams) }));
    }
  }

  const applySavedSpec = (id: string) => {
    setSelectedSpecId(id);
    const s = savedSpecs.find((x) => x.id === id);
    if (!s) {
      setSpec(null);
      setSpecName(null);
      return;
    }
    setSpec(s.params);
    setSpecName(specLabel(s));
    setFormData((prev) => ({ ...prev, commodity: describe(s.params) }));
    setParties((prev) => ({ ...prev, buyerName: prev.buyerName || s.buyerName }));
  };

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

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
    const buyer = checkParty({ name: parties.buyerName, gstin: parties.buyerGstin, iec: parties.buyerIec });
    const seller = checkParty({ name: parties.sellerName, gstin: parties.sellerGstin, iec: parties.sellerIec });
    const problems = [
      ...buyer.problems.map((p) => `Buyer: ${p}`),
      ...seller.problems.map((p) => `Seller: ${p}`),
    ];
    setPartyProblems(problems);
    if (problems.length) return;

    setIsSubmitting(true);
    const order = createOrder({
      mode: bookingMode,
      service: formData.serviceName,
      commodity: formData.commodity,
      spec,
      specLabel: specName,
      buyer: buyer.party,
      seller: seller.party,
      location: formData.portLocation,
      inspectionDate: formData.inspectionDate,
      volumeTons: formData.volumeTons,
      customerName: `${formData.contactName} (${formData.companyName})`,
    });
    setIsSubmitting(false);
    setSubmittedRef(order.id);
  };

  const openChatroom = () => {
    const id = submittedRef;
    handleReset();
    if (id) {
      window.dispatchEvent(new CustomEvent("qualty:open-order", { detail: id }));
      document.getElementById("orders")?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleReset = () => {
    setSubmittedRef(null);
    setPartyProblems([]);
    setStep(1);
    onClose();
  };

  const partyInput = (key: keyof typeof parties, label: string, placeholder: string, required = false) => (
    <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)" }}>
      {label}
      <input
        type="text"
        required={required}
        placeholder={placeholder}
        value={parties[key]}
        onChange={(e) => setParties({ ...parties, [key]: e.target.value })}
        style={{
          padding: "9px 12px",
          borderRadius: "8px",
          border: "1px solid var(--border-main)",
          backgroundColor: "var(--bg-card)",
          color: "var(--text-main)",
          fontSize: "13.5px",
          fontWeight: 400,
        }}
      />
    </label>
  );

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
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-title"
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
              <h3 id="booking-title" className="font-heading" style={{ fontSize: "20px", fontWeight: 700, color: "var(--text-main)" }}>
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
            aria-label="Close booking"
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
                ? `Your order chatroom is open with you, the inspection company and the Qualty admin team. All reports, photos and the final summary arrive there.`
                : `Inspection companies can now bid on your enquiry. Compare bids in the order chatroom and accept the one you want.`}
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
                Order number
              </div>
              <div className="font-mono" style={{ fontSize: "20px", fontWeight: 700, color: "var(--accent-primary)" }}>
                {submittedRef}
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
              <button onClick={handleReset} className="btn-secondary" style={{ padding: "10px 20px" }}>
                Close
              </button>
              <button onClick={openChatroom} className="btn-primary" style={{ padding: "10px 24px" }}>
                Open order chatroom
              </button>
            </div>
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
                  <label htmlFor="booking-field-1" style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-main)", display: "block", marginBottom: "6px" }}>
                    Service Type
                  </label>
                  <select
                    id="booking-field-1"
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
                    <label htmlFor="booking-field-2" style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-main)", display: "block", marginBottom: "6px" }}>
                      Loading Port / Location
                    </label>
                    <input
                      id="booking-field-2"
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
                    <label htmlFor="booking-field-3" style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-main)", display: "block", marginBottom: "6px" }}>
                      Export Destination Country
                    </label>
                    <input
                      id="booking-field-3"
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
                    <label htmlFor="booking-field-4" style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-main)", display: "block", marginBottom: "6px" }}>
                      Commodity & Spec
                    </label>
                    <input
                      id="booking-field-4"
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
                    <select
                      aria-label="Use a saved buyer spec"
                      value={selectedSpecId}
                      onChange={(e) => applySavedSpec(e.target.value)}
                      style={{
                        width: "100%",
                        marginTop: "6px",
                        padding: "8px 12px",
                        borderRadius: "8px",
                        border: "1px solid var(--border-main)",
                        backgroundColor: "var(--bg-subtle)",
                        color: "var(--text-main)",
                        fontSize: "12.5px",
                      }}
                    >
                      <option value="">
                        {savedSpecs.length ? "Use a saved buyer spec" : "No saved specs yet (save one in the Calibrator)"}
                      </option>
                      {savedSpecs.map((s) => (
                        <option key={s.id} value={s.id}>
                          {specLabel(s)} ({s.params.commodity})
                        </option>
                      ))}
                    </select>
                    {specName && (
                      <p style={{ fontSize: "11.5px", color: "var(--accent-text)", marginTop: "4px" }}>
                        Spec attached: {specName}. Readings outside it get flagged.
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="booking-field-5" style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-main)", display: "block", marginBottom: "6px" }}>
                      Estimated Volume (Metric Tons)
                    </label>
                    <input
                      id="booking-field-5"
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
                    <label htmlFor="booking-field-6" style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-main)", display: "block", marginBottom: "6px" }}>
                      Start Date
                    </label>
                    <input
                      id="booking-field-6"
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
                    <label htmlFor="booking-field-7" style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-main)", display: "block", marginBottom: "6px" }}>
                      Estimated Duration (Days)
                    </label>
                    <input
                      id="booking-field-7"
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
                    <label htmlFor="booking-field-8" style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-main)", display: "block", marginBottom: "6px" }}>
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
                    id="booking-field-8"
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
                {/* Buyer / Seller Verification */}
                <fieldset style={{ border: "1px solid var(--border-main)", borderRadius: "10px", padding: "14px", display: "flex", flexDirection: "column", gap: "12px" }}>
                  <legend style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: 600, color: "var(--text-main)", padding: "0 6px" }}>
                    <ShieldCheck size={16} weight="bold" /> Buyer and seller verification
                  </legend>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "-4px", textWrap: "pretty" }}>
                    Add GSTIN or IEC and we check the format now. The Qualty admin confirms against the registry from the order chatroom.
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "10px" }}>
                    {partyInput("buyerName", "Buyer", "Buyer company", true)}
                    {partyInput("buyerGstin", "Buyer GSTIN (optional)", "27AAPFU0939F1ZV")}
                    {partyInput("buyerIec", "Buyer IEC (optional)", "AAPFU0939F")}
                    {partyInput("sellerName", "Seller", "Seller company", true)}
                    {partyInput("sellerGstin", "Seller GSTIN (optional)", "24AABCS1429B1Z5")}
                    {partyInput("sellerIec", "Seller IEC (optional)", "AABCS1429B")}
                  </div>
                  {partyProblems.length > 0 && (
                    <ul role="alert" style={{ margin: 0, paddingLeft: "18px", fontSize: "12.5px", color: "var(--danger-text)" }}>
                      {partyProblems.map((p) => (
                        <li key={p}>{p}</li>
                      ))}
                    </ul>
                  )}
                </fieldset>

                <div>
                  <label htmlFor="booking-field-9" style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-main)", display: "block", marginBottom: "6px" }}>
                    Company / Trading House
                  </label>
                  <input
                    id="booking-field-9"
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
                    <label htmlFor="booking-field-10" style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-main)", display: "block", marginBottom: "6px" }}>
                      Contact Person
                    </label>
                    <input
                      id="booking-field-10"
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
                    <label htmlFor="booking-field-11" style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-main)", display: "block", marginBottom: "6px" }}>
                      Official Email
                    </label>
                    <input
                      id="booking-field-11"
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
                        <span>Creating order…</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={16} weight="bold" />
                        <span>
                          {bookingMode === "quick" ? "Book inspection" : "Publish enquiry for bids"}
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

