"use client";

import React, { useMemo, useState, useSyncExternalStore } from "react";
import { Package, Anchor, Truck, Boat, MapPin, SealCheck, Clock, Users, Gavel, Certificate, FileText, Stamp } from "@phosphor-icons/react";
import { useDB, SERVICES, STANDARD_RATES, listingCustomerPrice, type ServiceListing } from "@/lib/store";

export interface StorePick {
  service: string;
  mode: "quick" | "inquiry";
  listing?: ServiceListing;
  location?: string;
}

const ABOUT: Record<string, { Icon: typeof Package; where: string; what: string }> = {
  "Pre-Shipment Inspection (PSI)": {
    Icon: Package,
    where: "Mill, warehouse or CFS",
    what: "Sampling and grading against your spec, moisture, packing and marking before the cargo leaves.",
  },
  "Loading & Unloading Supervision": {
    Icon: Anchor,
    where: "Port terminal",
    what: "Hold cleanliness, tally, draft survey and weather checks while the vessel loads or discharges.",
  },
  "Container Stuffing Survey": {
    Icon: Truck,
    where: "CFS or on dock",
    what: "Container condition, stuffing, lashing and the seal number photographed before it closes.",
  },
  "Destination Cargo Inspection": {
    Icon: Boat,
    where: "Discharge port",
    what: "Condition and out turn quantity at arrival, with photos for any claim.",
  },
  "ECTN (Electronic Cargo Tracking Note)": {
    Icon: FileText,
    where: "One rate across India",
    what: "The cargo tracking note many African ports ask for before the ship arrives.",
  },
  "CoC (Certificate of Conformity)": {
    Icon: Certificate,
    where: "One rate across India",
    what: "Inspection and the certificate that shows the goods meet the importing country's standards.",
  },
  "Customs Import Control": {
    Icon: Stamp,
    where: "One rate across India",
    what: "The import control check some African and Southeast Asian customs need before clearance.",
  },
};

/** Physical inspections are booked from company listings; certificates have one Qualty rate (Vinay, Nov 17). */
const PHYSICAL = SERVICES.filter((s) => STANDARD_RATES[s] == null);
export const CERTIFICATES = SERVICES.filter((s) => STANDARD_RATES[s] != null);

const FALLBACK = { Icon: Package, where: "", what: "" };

const ANY = "";
const noop = () => () => {};
// Today's date, read only in the browser (the page is prerendered without it).
const useToday = () => useSyncExternalStore(noop, () => new Date().toISOString().slice(0, 10), () => "");

/** The service store: pick a service and a port, compare the companies that serve it, book one. */
export default function ServiceStore({ onPick }: { onPick: (p: StorePick) => void }) {
  const listings = useDB().listings;
  const [service, setService] = useState<string>(PHYSICAL[0]);
  const [location, setLocation] = useState<string>(ANY);

  const today = useToday();
  const forService = useMemo(
    () => listings.filter((l) => l.active && l.service === service && l.availableTo >= today),
    [listings, service, today],
  );
  const locations = useMemo(() => [...new Set(forService.map((l) => l.location))].sort(), [forService]);
  const shown = useMemo(
    () => forService.filter((l) => location === ANY || l.location === location).sort((a, b) => listingCustomerPrice(a) - listingCustomerPrice(b)),
    [forService, location],
  );

  return (
    <section id="services" className="section" aria-labelledby="services-title">
      <div className="section-head">
        <span className="eyebrow">Service store</span>
        <h2 id="services-title">Book a physical inspection</h2>
        <p>
          Pick the inspection and the port. You see every inspection company that covers it, with its price and how fast it
          turns the job around.
        </p>
      </div>

      <div role="radiogroup" aria-label="Service" className="store-services">
        {PHYSICAL.map((s) => {
          const a = ABOUT[s] ?? FALLBACK;
          const on = s === service;
          const count = listings.filter((l) => l.active && l.service === s && l.availableTo >= today).length;
          return (
            <button
              key={s}
              role="radio"
              aria-checked={on}
              onClick={() => {
                setService(s);
                setLocation(ANY);
              }}
              className="card-shell store-service"
              data-on={on || undefined}
            >
              <a.Icon size={22} weight={on ? "fill" : "regular"} aria-hidden="true" color="var(--accent-primary)" />
              <span className="store-service-title">{s}</span>
              {a.where && <span className="store-service-where">{a.where}</span>}
              {a.what && <span className="store-service-what">{a.what}</span>}
              <span className="store-service-count">{count === 0 ? "No companies listed yet" : `${count} offer${count === 1 ? "" : "s"}`}</span>
            </button>
          );
        })}
      </div>

      <div className="store-bar">
        <label className="store-location">
          <MapPin size={16} aria-hidden="true" />
          <select aria-label="Port or city" value={location} onChange={(e) => setLocation(e.target.value)}>
            <option value={ANY}>All ports and cities ({forService.length})</option>
            {locations.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <button className="btn-secondary" onClick={() => onPick({ service, mode: "inquiry", location: location || undefined })}>
          <Gavel size={16} aria-hidden="true" />
          Ask companies to bid instead
        </button>
      </div>

      {shown.length === 0 ? (
        <div className="card-shell store-empty">
          <p className="store-empty-title">No company lists {service} {location ? `at ${location}` : ""} yet.</p>
          <p>Raise an enquiry with your date and budget. Inspection companies that cover the port send you bids.</p>
          <button className="btn-primary" onClick={() => onPick({ service, mode: "inquiry", location: location || undefined })}>
            Raise an enquiry
          </button>
        </div>
      ) : (
        <ul className="store-list" aria-label={`Companies offering ${service}`}>
          {shown.map((l) => (
            <li key={l.id} className="card-shell store-row">
              <div className="store-row-main">
                <div className="store-row-name">
                  {l.companyName}
                  {l.companyVerified && (
                    <span className="store-verified">
                      <SealCheck size={14} weight="fill" aria-hidden="true" /> KYC checked
                    </span>
                  )}
                </div>
                <div className="store-row-meta">
                  <span>
                    <MapPin size={14} aria-hidden="true" /> {l.location}
                  </span>
                  <span>
                    <Clock size={14} aria-hidden="true" /> {l.turnaroundDays} day{l.turnaroundDays === 1 ? "" : "s"}
                  </span>
                  <span>
                    <Users size={14} aria-hidden="true" /> {l.surveyors} surveyor{l.surveyors === 1 ? "" : "s"}
                  </span>
                  <span>Until {l.availableTo}</span>
                </div>
                {l.commodities.length > 0 && <div className="store-row-goods">{l.commodities.join(", ")}</div>}
              </div>
              <div className="store-row-price">
                <span className="font-mono store-price">${listingCustomerPrice(l).toLocaleString()}</span>
                <span className="store-was">per inspection</span>
              </div>
              <button
                className="btn-primary"
                aria-label={`Book ${l.companyName} for ${service} at ${l.location}`}
                onClick={() => onPick({ service, mode: "quick", listing: l, location: l.location })}
              >
                Book now
              </button>
            </li>
          ))}
        </ul>
      )}

      <style jsx>{`
        .store-services {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 12px;
          margin-bottom: 24px;
        }
        .store-service {
          text-align: left;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          cursor: pointer;
          transition: border-color 0.2s var(--ease-out), background-color 0.2s var(--ease-out);
        }
        .store-service[data-on] {
          border-color: var(--accent-primary);
          background-color: var(--accent-light);
        }
        .store-service-title {
          font-size: 16px;
          font-weight: 600;
          color: var(--text-main);
          margin-top: 4px;
        }
        .store-service-where {
          font-size: 13px;
          font-weight: 500;
          color: var(--accent-text);
        }
        .store-service-what {
          font-size: 13.5px;
          line-height: 1.5;
          color: var(--text-secondary);
        }
        .store-service-count {
          margin-top: auto;
          padding-top: 8px;
          font-size: 12.5px;
          color: var(--text-muted);
        }
        .store-bar {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .store-location {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0 12px;
          border-radius: 9999px;
          border: 1px solid var(--border-main);
          background: var(--bg-card);
          color: var(--text-muted);
          flex: 1 1 260px;
          max-width: 420px;
        }
        .store-location select {
          flex: 1;
          border: none;
          background: transparent;
          color: var(--text-main);
          font: inherit;
          font-size: 14px;
          padding: 10px 0;
          min-width: 0;
        }
        .store-list {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .store-row {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 16px;
          padding: 16px 20px;
        }
        .store-row-main {
          flex: 1 1 320px;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .store-row-name {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px;
          font-size: 16px;
          font-weight: 600;
          color: var(--text-main);
        }
        .store-verified {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          font-weight: 500;
          color: var(--success-text);
          background: var(--success-bg);
          padding: 2px 8px;
          border-radius: 9999px;
        }
        .store-row-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 4px 16px;
          font-size: 13px;
          color: var(--text-secondary);
        }
        .store-row-meta span {
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        .store-row-goods {
          font-size: 12.5px;
          color: var(--text-muted);
        }
        .store-row-price {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 2px;
        }
        .store-price {
          font-size: 20px;
          font-weight: 700;
          color: var(--text-main);
        }
        .store-was {
          font-size: 12px;
          color: var(--text-muted);
        }
        .store-empty {
          padding: 32px 24px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          color: var(--text-secondary);
        }
        .store-empty-title {
          font-size: 16px;
          font-weight: 600;
          color: var(--text-main);
        }
        .store-empty button {
          margin-top: 8px;
        }
      `}</style>
    </section>
  );
}
