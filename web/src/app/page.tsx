"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import SignedInBanner from "@/components/SignedInBanner";
import WhoItsFor from "@/components/WhoItsFor";
import Hero from "@/components/Hero";
import HowQualtyWorks from "@/components/explainer/HowQualtyWorks";
import StandardsStrip from "@/components/StandardsStrip";
import ServiceStore, { type StorePick } from "@/components/ServiceStore";
import CommodityCalibrator, { CommodityParams } from "@/components/CommodityCalibrator";
import QualityEvidenceVault from "@/components/QualityEvidenceVault";
import QualityPilot from "@/components/QualityPilot";
import SurveyorNetwork from "@/components/SurveyorNetwork";
import OrderRooms from "@/components/OrderRooms";
import Footer from "@/components/Footer";
import BookingModal from "@/components/BookingModal";
import AccountModal from "@/components/AccountModal";
import Toaster from "@/components/Toaster";
import { useViewer } from "@/lib/viewer";

export default function Home() {
  const [isBookingOpen, setIsBookingOpen] = useState<boolean>(false);
  const [injectedParams, setInjectedParams] = useState<CommodityParams | null>(null);
  const [contractInfo, setContractInfo] = useState<{ filename: string; specName: string } | null>(null);
  const [selectedServiceType, setSelectedServiceType] = useState<string>("Pre-Shipment Inspection (PSI)");
  // Set when booking starts from the service store, so the modal opens on that company and port.
  const [storePick, setStorePick] = useState<{ listingId: string | null; location?: string; mode: "quick" | "inquiry"; n: number } | null>(null);
  const viewer = useViewer();
  const router = useRouter();
  const isCompany = viewer.kind === "company" || viewer.kind === "admin";
  // Order chatrooms belong to customers (and demo mode); visitors have none yet.
  const showRooms = viewer.kind === "customer" || viewer.kind === "demo";

  // Inspection companies work from /dashboard and never get the customer booking site (Vinay, Nov 14).
  // The Qualty team lands there too, but can open "/?view=site" to check what customers see.
  useEffect(() => {
    if (!isCompany) return;
    if (viewer.kind === "admin" && new URLSearchParams(window.location.search).get("view") === "site") return;
    router.replace("/dashboard");
  }, [isCompany, viewer.kind, router]);

  // Each entry point opens the dialog in its own mode (the "n" re-seeds the dialog even when nothing else changed).
  const openIn = (mode: "quick" | "inquiry", service: string) => {
    setSelectedServiceType(service);
    setStorePick((prev) => ({ listingId: null, mode, n: (prev?.n ?? 0) + 1 }));
    setIsBookingOpen(true);
  };
  const handleOpenQuickBooking = () => openIn("quick", "Pre-Shipment Inspection (PSI)");
  const handleOpenInquiryBooking = () => openIn("inquiry", "Loading & Unloading Supervision");

  const handleStorePick = (p: StorePick) => {
    setSelectedServiceType(p.service);
    setStorePick((prev) => ({ listingId: p.listing?.id ?? null, location: p.location, mode: p.mode, n: (prev?.n ?? 0) + 1 }));
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
      <SignedInBanner />
      <Navbar onOpenBooking={handleOpenQuickBooking} />

      {/* Hero Section with Dual CTAs: Quick (<5 days) vs Inquiry (>5 days) */}
      <Hero
        onOpenQuickBooking={handleOpenQuickBooking}
        onOpenInquiryBooking={handleOpenInquiryBooking}
      />

      {/* Two audiences: people booking inspections, and the companies doing them */}
      <WhoItsFor />

      {/* How it works: coded walkthrough from store to certificate */}
      <HowQualtyWorks />

      {/* Standards & Accreditation Strip */}
      <StandardsStrip />

      {/* Service store: standard services, companies per port, book now */}
      <ServiceStore onPick={handleStorePick} />

      {/* Section 01: Multi-Commodity Calibrator, Contract Upload & Quality Checker */}
      <CommodityCalibrator onInjectIntoBooking={handleInjectIntoBooking} />

      {/* Order chatrooms for customers: customer + inspection company + admin, reports, flags, summary */}
      {showRooms && <OrderRooms onBook={handleOpenQuickBooking} />}

      {/* Section 03: Quality Evidence Vault with GPS & Timestamp Watermarks */}
      <QualityEvidenceVault />

      {/* Section 04: Quality Pilot Field Co-Pilot & Surveyor Console */}
      <QualityPilot />

      {/* Section 05: Port Surveyor Network Directory */}
      <SurveyorNetwork />

      {/* Footer */}
      <Footer />

      <AccountModal />
      <Toaster />

      {/* Dual Booking Modal (Quick Inspection vs Raise an Inquiry) */}
      <BookingModal
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        injectedParams={injectedParams}
        contractInfo={contractInfo}
        initialServiceType={selectedServiceType}
        initialListingId={storePick ? `${storePick.listingId ?? ""}#${storePick.n}` : null}
        initialLocation={storePick?.location}
        initialMode={storePick?.mode}
      />
    </main>
  );
}
