"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Certificate, FileText, Stamp, ShieldCheck, SpinnerGap, ArrowRight } from "@phosphor-icons/react";
import { STANDARD_RATES, customerPrice, createOrder, checkParty, useSession, isRemote, orderRef } from "@/lib/store";
import { run } from "@/lib/notify";
import { CERTIFICATES, type StorePick } from "./ServiceStore";

const ABOUT: Record<string, { Icon: typeof Certificate; what: string }> = {
  "ECTN (Electronic Cargo Tracking Note)": {
    Icon: FileText,
    what: "The cargo tracking note many African ports ask for before the ship arrives.",
  },
  "CoC (Certificate of Conformity)": {
    Icon: Certificate,
    what: "Inspection and the certificate that shows the goods meet the importing country's standards.",
  },
  "Customs Import Control": {
    Icon: Stamp,
    what: "The import control check some African and Southeast Asian customs need before clearance.",
  },
};

export const VERIFICATION = "Buyer & Seller Verification";

/** Certificates are paperwork, not a site visit: one Qualty price across India, booked without picking a company. */
export function SpecialisedCertificates({ onPick }: { onPick: (p: StorePick) => void }) {
  return (
    <section id="certificates" className="section" aria-labelledby="certificates-title">
      <div className="section-head">
        <span className="eyebrow">Specialised certificates</span>
        <h2 id="certificates-title">Certificates at one price across India</h2>
        <p>Book the certificate. The Qualty team assigns an accredited inspection company and the chatroom tracks it to issue.</p>
      </div>
      <ul className="cert-grid" aria-label="Specialised certificates">
        {CERTIFICATES.map((s) => {
          const a = ABOUT[s] ?? { Icon: Certificate, what: "" };
          const rate = STANDARD_RATES[s] ?? 0;
          return (
            <li key={s} className="card-shell cert-card">
              <a.Icon size={22} aria-hidden="true" color="var(--accent-primary)" />
              <span className="cert-title">{s}</span>
              {a.what && <span className="cert-what">{a.what}</span>}
              <div className="cert-foot">
                <span>
                  <span className="font-mono cert-price">${customerPrice(rate).toLocaleString()}</span>
                  <span className="cert-unit"> anywhere in India</span>
                </span>
                <button className="btn-primary" aria-label={`Book ${s}`} onClick={() => onPick({ service: s, mode: "quick" })}>
                  Book
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      <style jsx>{`
        .cert-grid {
          list-style: none;
          margin: 0;
          padding: 0;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 12px;
        }
        .cert-card {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .cert-title {
          font-size: 16px;
          font-weight: 600;
          color: var(--text-main);
          margin-top: 4px;
        }
        .cert-what {
          font-size: 13.5px;
          line-height: 1.5;
          color: var(--text-secondary);
        }
        .cert-foot {
          margin-top: auto;
          padding-top: 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .cert-price {
          font-size: 18px;
          font-weight: 600;
          color: var(--text-main);
          font-variant-numeric: tabular-nums;
        }
        .cert-unit {
          font-size: 12.5px;
          color: var(--text-muted);
        }
      `}</style>
    </section>
  );
}

const EMPTY = { side: "seller" as "buyer" | "seller", company: "", country: "India", regNo: "", contact: "", email: "", phone: "" };

/** Check a buyer or seller before shipping: the details open an order and its chatroom with the Qualty team. */
export function VerificationService() {
  const { session } = useSession();
  const router = useRouter();
  const [f, setF] = useState(EMPTY);
  const [problems, setProblems] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ id: string; ref: string } | null>(null);
  const rate = STANDARD_RATES[VERIFICATION] ?? 0;
  const india = f.country.trim().toLowerCase() === "india";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const p: string[] = [];
    if (!f.company.trim()) p.push("Add the company name.");
    if (!f.country.trim()) p.push("Add the country.");
    if (!f.contact.trim()) p.push("Add a contact person.");
    if (!f.email.trim() && !f.phone.trim()) p.push("Add an email or phone for the contact.");
    const checked = checkParty({ name: f.company, gstin: india ? f.regNo : undefined });
    p.push(...checked.problems);
    setProblems(p);
    if (p.length) return;

    setBusy(true);
    const details = [
      `Verify ${f.side}: ${f.company.trim()}, ${f.country.trim()}`,
      !india && f.regNo.trim() ? `Registration or tax no. ${f.regNo.trim()}` : "",
      `Contact ${f.contact.trim()}${f.email.trim() ? `, ${f.email.trim()}` : ""}${f.phone.trim() ? `, ${f.phone.trim()}` : ""}`,
    ]
      .filter(Boolean)
      .join(". ");
    const blank = { name: "", verification: "unverified" as const };
    const order = await run(
      createOrder({
        mode: "quick",
        service: VERIFICATION,
        commodity: "Company check",
        spec: null,
        specLabel: details,
        buyer: f.side === "buyer" ? checked.party : blank,
        seller: f.side === "seller" ? checked.party : blank,
        location: f.country.trim(),
        inspectionDate: new Date().toISOString().slice(0, 10),
        volumeTons: 0,
        customerName: session?.name || "Customer",
        priceUSD: rate,
      }),
    );
    setBusy(false);
    if (!order) return;
    setDone({ id: order.id, ref: orderRef(order) });
    setF(EMPTY);
  };

  const openRoom = () => {
    if (!done) return;
    const rooms = document.getElementById("orders");
    if (rooms) {
      window.dispatchEvent(new CustomEvent("qualty:open-order", { detail: done.id }));
      rooms.scrollIntoView({ behavior: "smooth" });
    } else {
      router.push(`/rooms?order=${encodeURIComponent(done.id)}`);
    }
  };

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <section id="verification" className="section" aria-labelledby="verification-title">
      <div className="card-shell verify">
        <div className="verify-copy">
          <span className="eyebrow">
            <ShieldCheck size={14} weight="fill" aria-hidden="true" /> Buyer and seller verification
          </span>
          <h2 id="verification-title">Check who you are trading with before you ship</h2>
          <p>
            Give us the company and a contact. The Qualty team checks its registration and documents and reports back in the
            order chatroom.
          </p>
          <p className="verify-price">
            <span className="font-mono">${customerPrice(rate).toLocaleString()}</span> per company
          </p>
          <p className="verify-note">Keep the company&apos;s registration certificate and tax papers ready to upload in the chatroom once it opens.</p>
        </div>

        {done ? (
          <div className="verify-done" role="status">
            <p>
              Verification {done.ref} is booked. Pay the invoice and the chatroom opens with the Qualty team.
            </p>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button className="btn-primary" onClick={openRoom}>
                Open the chatroom <ArrowRight size={16} aria-hidden="true" />
              </button>
              <button className="btn-secondary" onClick={() => setDone(null)}>
                Check another company
              </button>
            </div>
          </div>
        ) : isRemote && !session ? (
          <div className="verify-done">
            <p>Sign in to book a verification. Your order and its chatroom are saved to your account.</p>
            <button className="btn-primary" onClick={() => window.dispatchEvent(new CustomEvent("qualty:open-auth"))}>
              Sign in
            </button>
          </div>
        ) : (
          <form className="verify-form" aria-label="Verify a buyer or seller" onSubmit={submit} noValidate>
            <fieldset className="verify-side">
              <legend>Who are you checking?</legend>
              {(["seller", "buyer"] as const).map((s) => (
                <label key={s}>
                  <input type="radio" name="verify-side" checked={f.side === s} onChange={() => setF({ ...f, side: s })} />
                  {s === "seller" ? "A seller" : "A buyer"}
                </label>
              ))}
            </fieldset>
            <label>
              Company name
              <input value={f.company} onChange={set("company")} autoComplete="organization" />
            </label>
            <div className="verify-row">
              <label>
                Country
                <input value={f.country} onChange={set("country")} autoComplete="country-name" />
              </label>
              <label>
                {india ? "GSTIN (optional)" : "Registration or tax no. (optional)"}
                <input value={f.regNo} onChange={set("regNo")} />
              </label>
            </div>
            <label>
              Contact person
              <input value={f.contact} onChange={set("contact")} />
            </label>
            <div className="verify-row">
              <label>
                Contact email
                <input type="email" value={f.email} onChange={set("email")} />
              </label>
              <label>
                Contact phone
                <input type="tel" value={f.phone} onChange={set("phone")} />
              </label>
            </div>
            {problems.length > 0 && (
              <ul role="alert" className="verify-problems">
                {problems.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            )}
            <button type="submit" className="btn-primary" disabled={busy}>
              {busy ? <SpinnerGap size={16} className="animate-spin" aria-hidden="true" /> : null}
              {busy ? "Booking…" : "Book verification"}
            </button>
          </form>
        )}
      </div>
      <style jsx>{`
        .verify {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr);
          gap: 32px;
          padding: 32px;
          border-color: var(--accent-border);
          background: var(--accent-light);
        }
        .verify-copy {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .verify-copy .eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .verify-copy h2 {
          font-size: 28px;
          line-height: 1.2;
          font-weight: 600;
          color: var(--text-main);
          margin: 0;
        }
        .verify-copy p {
          margin: 0;
          font-size: 15px;
          line-height: 1.55;
          color: var(--text-secondary);
        }
        .verify-copy .verify-price {
          font-size: 14px;
          color: var(--text-muted);
        }
        .verify-price .font-mono {
          font-size: 20px;
          font-weight: 600;
          color: var(--text-main);
          font-variant-numeric: tabular-nums;
        }
        .verify-copy .verify-note {
          font-size: 13px;
          color: var(--text-muted);
        }
        .verify-form,
        .verify-done {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 20px;
          border-radius: 12px;
          background: var(--bg-card);
          border: 1px solid var(--border-main);
        }
        .verify-done p {
          margin: 0;
          font-size: 14px;
          line-height: 1.5;
          color: var(--text-main);
        }
        .verify-form label {
          display: flex;
          flex-direction: column;
          gap: 4px;
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary);
        }
        .verify-form input:not([type="radio"]) {
          padding: 10px 12px;
          border-radius: 8px;
          border: 1px solid var(--border-main);
          background: var(--bg-card);
          color: var(--text-main);
          font-size: 14px;
        }
        .verify-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .verify-side {
          border: 0;
          padding: 0;
          margin: 0;
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
        }
        .verify-side legend {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary);
          margin-bottom: 6px;
        }
        .verify-side label {
          flex-direction: row;
          align-items: center;
          gap: 6px;
          font-size: 14px;
          font-weight: 500;
          color: var(--text-main);
        }
        .verify-problems {
          margin: 0;
          padding-left: 18px;
          font-size: 12.5px;
          color: var(--danger-text);
        }
        @media (max-width: 768px) {
          .verify {
            grid-template-columns: 1fr;
            padding: 20px;
            gap: 20px;
          }
          .verify-row {
            grid-template-columns: 1fr;
          }
          .verify-copy h2 {
            font-size: 22px;
          }
        }
      `}</style>
    </section>
  );
}
