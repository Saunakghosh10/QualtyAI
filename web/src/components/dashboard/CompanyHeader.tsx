"use client";

import React from "react";
import { SealCheck } from "@phosphor-icons/react";
import { useDB, complianceState, type Company } from "@/lib/store";
import { KycPill, Pill, ACCREDITATION_STATE, isOurs, usd } from "@/components/CompanyConsole";

const fmtDate = (d: string) => {
  const t = Date.parse(d);
  return Number.isNaN(t) ? d : new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};

/** Who the company is (KYC, accreditations) and the four numbers it checks every morning. */
export default function CompanyHeader({ company }: { company: Company }) {
  const db = useDB();
  const ours = db.orders.filter((o) => isOurs(o, company));
  const openEnquiries = db.orders.filter((o) => o.status === "enquiry").length;
  const activeBookings = ours.filter((o) => o.status === "booked" || o.status === "in-progress").length;
  const payoutsDue = ours.filter((o) => o.paidAt && o.status !== "enquiry").reduce((s, o) => s + (o.priceUSD ?? 0), 0);
  const listingsLive = db.listings.filter((l) => l.companyId === company.id && l.active).length;
  const accreditations = db.compliance.filter((c) => c.companyId === company.id);

  const stats: { label: string; value: string; note: string }[] = [
    { label: "Open enquiries", value: String(openEnquiries), note: "You can bid on these" },
    { label: "Active bookings", value: String(activeBookings), note: "Booked or in progress" },
    { label: "Payouts due", value: usd(payoutsDue), note: "Customer has paid" },
    { label: "Listings live", value: String(listingsLive), note: "Shown in the store" },
  ];

  return (
    <section aria-labelledby="company-name" className="dash-head">
      <div className="dash-id">
        <h1 id="company-name" className="font-heading dash-name">{company.name}</h1>
        <div className="dash-kyc">
          <span>KYC</span>
          <KycPill company={company} />
        </div>
        <div className="dash-acc">
          <h2 className="dash-acc-title">Accreditations</h2>
          {accreditations.length === 0 ? (
            <p className="dash-muted">None added yet. Add NABL, NABCB or ISO/IEC 17020 in the Accreditations tab.</p>
          ) : (
            <ul className="dash-chips">
              {accreditations.map((a) => {
                const s = complianceState(a);
                return (
                  <li key={a.id} className="dash-chip" data-state={s}>
                    <SealCheck size={16} weight={s === "valid" ? "fill" : "regular"} aria-hidden="true" className="dash-chip-icon" />
                    <span className="dash-chip-text">
                      <span className="dash-chip-name">{a.name}</span>
                      <span className="dash-chip-meta">
                        {a.issuedBy}, valid until {fmtDate(a.validUntil)}
                      </span>
                    </span>
                    {s !== "valid" && <Pill tone={ACCREDITATION_STATE[s][0]}>{ACCREDITATION_STATE[s][1]}</Pill>}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <dl className="dash-stats">
        {stats.map((s) => (
          <div key={s.label} className="dash-stat">
            <dt>{s.label}</dt>
            <dd className="font-heading dash-stat-value">{s.value}</dd>
            <dd className="dash-stat-note">{s.note}</dd>
          </div>
        ))}
      </dl>

      <style jsx>{`
        .dash-head {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 20px;
          margin-bottom: 20px;
        }
        @media (min-width: 960px) {
          .dash-head {
            grid-template-columns: minmax(0, 1fr) minmax(0, 520px);
            align-items: start;
          }
        }
        .dash-name {
          font-size: clamp(24px, 3.2vw, 32px);
          font-weight: 700;
          color: var(--text-main);
          line-height: 1.15;
          text-wrap: balance;
        }
        .dash-kyc {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 8px;
          font-size: 12.5px;
          color: var(--text-muted);
        }
        .dash-acc {
          margin-top: 16px;
        }
        .dash-acc-title {
          font-size: 12.5px;
          font-weight: 600;
          color: var(--text-secondary);
          margin-bottom: 8px;
        }
        .dash-muted {
          font-size: 13px;
          color: var(--text-muted);
          text-wrap: pretty;
        }
        .dash-chips {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .dash-chip {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 7px 12px 7px 10px;
          border-radius: 10px;
          border: 1px solid var(--border-main);
          background: var(--bg-card);
          min-width: 0;
          max-width: 100%;
        }
        .dash-chip :global(.dash-chip-icon) {
          flex: none;
          color: var(--success-text);
        }
        .dash-chip[data-state="expiring"] :global(.dash-chip-icon) {
          color: var(--warning-text);
        }
        .dash-chip[data-state="expired"] :global(.dash-chip-icon) {
          color: var(--danger-text);
        }
        .dash-chip-text {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        .dash-chip-name {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-main);
          overflow-wrap: anywhere;
        }
        .dash-chip-meta {
          font-size: 11.5px;
          color: var(--text-muted);
          font-variant-numeric: tabular-nums;
        }
        .dash-stats {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1px;
          margin: 0;
          border: 1px solid var(--border-main);
          border-radius: 14px;
          overflow: hidden;
          background: var(--border-main);
        }
        .dash-stat {
          background: var(--bg-card);
          padding: 14px 16px;
          min-width: 0;
        }
        .dash-stat dt {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary);
        }
        .dash-stat dd {
          margin: 0;
        }
        .dash-stat-value {
          font-size: clamp(22px, 2.6vw, 28px);
          font-weight: 700;
          color: var(--text-main);
          font-variant-numeric: tabular-nums;
          line-height: 1.2;
          margin-top: 4px;
          overflow-wrap: anywhere;
        }
        .dash-stat-note {
          font-size: 11.5px;
          color: var(--text-muted);
          margin-top: 2px;
        }
      `}</style>
    </section>
  );
}
