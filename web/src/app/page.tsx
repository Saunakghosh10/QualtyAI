"use client";

import React, { useState } from "react";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import StandardsStrip from "@/components/StandardsStrip";
import DualPipeline from "@/components/DualPipeline";
import CommodityCalibrator, { CommodityParams } from "@/components/CommodityCalibrator";
import QualityEvidenceVault from "@/components/QualityEvidenceVault";
import QualityPilot from "@/components/QualityPilot";
import SurveyorNetwork from "@/components/SurveyorNetwork";
import OrderRooms from "@/components/OrderRooms";
import CompanyConsole from "@/components/CompanyConsole";
import Footer from "@/components/Footer";
import BookingModal from "@/components/BookingModal";

export default function Home() {
  const [isBookingOpen, setIsBookingOpen] = useState<boolean>(false);
  const [injectedParams, setInjectedParams] = useState<CommodityParams | null>(null);
  const [contractInfo, setContractInfo] = useState<{ filename: string; specName: string } | null>(null);
  const [selectedServiceType, setSelectedServiceType] = useState<string>("Pre-Shipment Inspection (PSI)");

  const handleOpenQuickBooking = () => {
    setSelectedServiceType("Pre-Shipment Inspection (PSI)");
    setIsBookingOpen(true);
  };

  const handleOpenInquiryBooking = () => {
    setSelectedServiceType("Loading & Unloading Supervision");
    setIsBookingOpen(true);
  };

  const handleServiceSelect = (serviceTitle?: string) => {
    if (serviceTitle) setSelectedServiceType(serviceTitle);
    setIsBookingOpen(true);
  };

  const handleInjectIntoBooking = (
    params: CommodityParams,
    contract?: { filename: string; specName: string }
  ) => {
    setInjectedParams(params);
    if (contract) setContractInfo(contract);
    setIsBookingOpen(true);
  };

  return (
    <main id="top" style={{ minHeight: "100vh", backgroundColor: "var(--bg-page)", color: "var(--text-main)" }}>
      {/* Navbar with theme toggle */}
      <Navbar onOpenBooking={handleOpenQuickBooking} />

      {/* Hero Section with Dual CTAs: Quick (<5 days) vs Inquiry (>5 days) */}
      <Hero
        onOpenQuickBooking={handleOpenQuickBooking}
        onOpenInquiryBooking={handleOpenInquiryBooking}
      />

      {/* Standards & Accreditation Strip */}
      <StandardsStrip />

      {/* Section 02: Physical Cargo Inspection Suite (Chemical & Contracts Badged Coming Soon/Locked) */}
      <DualPipeline onBookInspection={handleServiceSelect} />

      {/* Section 01: Multi-Commodity Calibrator, Contract Upload & Quality Checker */}
      <CommodityCalibrator onInjectIntoBooking={handleInjectIntoBooking} />

      {/* Order chatrooms: customer + inspection company + admin, reports, flags, summary */}
      <OrderRooms onBook={handleOpenQuickBooking} />

      {/* Inspection company console: store, bids, payments, certificates, compliance, KYC, team */}
      <CompanyConsole />

      {/* Section 03: Quality Evidence Vault with GPS & Timestamp Watermarks */}
      <QualityEvidenceVault />

      {/* Section 04: Quality Pilot Field Co-Pilot & Surveyor Console */}
      <QualityPilot />

      {/* Section 05: Port Surveyor Network Directory */}
      <SurveyorNetwork />

      {/* Footer */}
      <Footer />

      {/* Dual Booking Modal (Quick Inspection vs Raise an Inquiry) */}
      <BookingModal
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        injectedParams={injectedParams}
        contractInfo={contractInfo}
        initialServiceType={selectedServiceType}
      />
    </main>
  );
}
