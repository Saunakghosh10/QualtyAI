"use client";

import React from "react";
import { SealCheck, Certificate } from "@phosphor-icons/react";
import { STANDARD_RATES, customerPrice } from "@/lib/store";

const ACCREDITATIONS = [
  { name: "NABL", what: "Testing and calibration labs, ISO/IEC 17025" },
  { name: "NABCB", what: "Inspection bodies, ISO/IEC 17020" },
  { name: "ISO/IEC 17020", what: "Competence of bodies that carry out inspection" },
];

const CERTIFICATES = [
  { service: "ECTN (Electronic Cargo Tracking Note)", short: "ECTN", markets: "Required by many West and Central African ports" },
  { service: "CoC (Certificate of Conformity)", short: "CoC", markets: "Goods meet the importing country's standards" },
  { service: "Customs Import Control", short: "Customs Import Control", markets: "Pre-clearance checks for African and Southeast Asian customs" },
];

/** What a company can show on its profile, and the certificate services sold at one rate across India. */
export default function CompanyCredentials() {
  return (
    <section className="section" aria-labelledby="cp-cred-title">
      <div className="section-head">
        <span className="eyebrow">Credentials and certificates</span>
        <h2 id="cp-cred-title">Show your accreditations. Sell standard certificates.</h2>
        <p>
          Upload your accreditation certificates once and customers see them next to every listing. Standard export
          certificates have one rate across India, so you compete on turnaround and coverage.
        </p>
      </div>

      <div className="cred-grid">
        <div className="card-shell cred-card">
          <h3 className="cred-h">
            <SealCheck size={18} weight="bold" aria-hidden="true" /> Accreditations on your profile
          </h3>
          <ul className="cred-list">
            {ACCREDITATIONS.map((a) => (
              <li key={a.name}>
                <span className="cred-name">{a.name}</span>
                <span className="cred-what">{a.what}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="card-shell cred-card">
          <h3 className="cred-h">
            <Certificate size={18} weight="bold" aria-hidden="true" /> Standard certificate services
          </h3>
          <ul className="cred-list">
            {CERTIFICATES.map((c) => {
              const rate = STANDARD_RATES[c.service];
              return (
                <li key={c.service}>
                  <span className="cred-row">
                    <span className="cred-name">{c.short}</span>
                    {rate != null && (
                      <span className="cred-rate">
                        You get ${rate.toLocaleString()} <span className="cred-muted">· customers pay ${customerPrice(rate).toLocaleString()}</span>
                      </span>
                    )}
                  </span>
                  <span className="cred-what">{c.markets}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <style jsx>{`
        .cred-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 16px;
          max-width: 960px;
          margin: 0 auto;
        }
        .cred-card {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .cred-h {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 16px;
          font-weight: 600;
          color: var(--text-main);
        }
        .cred-h :global(svg) {
          color: var(--accent-primary);
        }
        .cred-list {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 14px;
          margin: 0;
          padding: 0;
        }
        .cred-list li {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .cred-row {
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          gap: 4px 12px;
        }
        .cred-name {
          font-size: 14.5px;
          font-weight: 600;
          color: var(--text-main);
        }
        .cred-what {
          font-size: 13.5px;
          line-height: 1.5;
          color: var(--text-secondary);
          text-wrap: pretty;
        }
        .cred-rate {
          font-size: 13.5px;
          font-weight: 600;
          color: var(--text-main);
          font-variant-numeric: tabular-nums;
        }
        .cred-muted {
          font-weight: 400;
          color: var(--text-muted);
        }
      `}</style>
    </section>
  );
}
