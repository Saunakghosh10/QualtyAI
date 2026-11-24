"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Storefront, Gavel, ChatsCircle, Wallet } from "@phosphor-icons/react";
import Navbar from "@/components/Navbar";
import SignedInBanner from "@/components/SignedInBanner";
import Footer from "@/components/Footer";
import AccountModal from "@/components/AccountModal";
import Toaster from "@/components/Toaster";
import DashboardStill from "@/components/companies/DashboardStill";
import CompanyCredentials, { CompanyBenefits } from "@/components/companies/CompanyCredentials";
import { isRemote, MARGIN_PCT, budgetForCompanies } from "@/lib/store";
import { useViewer } from "@/lib/viewer";

const STEPS = [
  {
    Icon: Storefront,
    title: "List what you inspect",
    body: "Add each service with your price, the ports your surveyors cover and the dates you're free. Customers book listed jobs straight away.",
  },
  {
    Icon: Gavel,
    title: "Bid on enquiries",
    body: "Longer or unusual jobs come in as enquiries with a budget. Send a bid, answer counter offers, and the customer picks one.",
  },
  {
    Icon: ChatsCircle,
    title: "Run the job in one chat",
    body: "Each order gets a chatroom with the customer and the Qualty team. Your surveyor posts readings, photos and the certificate there.",
  },
  {
    Icon: Wallet,
    title: "Get paid through Qualty",
    body: "The customer pays before the chat opens. Your share goes out once the inspection is closed.",
  },
];

const EXAMPLE_BUDGET = 2500;

/** The page for inspection companies: what they get, how a job runs, and how the price split works. */
export default function CompaniesPage() {
  const viewer = useViewer();
  const isCompany = viewer.kind === "company" || viewer.kind === "admin" || viewer.kind === "demo";

  const openSignup = () =>
    window.dispatchEvent(new CustomEvent("qualty:open-auth", { detail: { mode: "signup", as: "company" } }));

  const primary = isCompany ? (
    <Link href="/dashboard" className="btn-primary cp-cta">
      Go to your dashboard
      <ArrowRight size={16} weight="bold" aria-hidden="true" />
    </Link>
  ) : isRemote ? (
    <button type="button" onClick={openSignup} className="btn-primary cp-cta">
      List your company
      <ArrowRight size={16} weight="bold" aria-hidden="true" />
    </button>
  ) : (
    <Link href="/dashboard" className="btn-primary cp-cta">
      Try the company dashboard
      <ArrowRight size={16} weight="bold" aria-hidden="true" />
    </Link>
  );

  return (
    <main id="top" style={{ minHeight: "100vh", backgroundColor: "var(--bg-page)", color: "var(--text-main)" }}>
      <SignedInBanner />
      <Navbar />

      <section className="cp-hero" aria-labelledby="cp-title">
        <span className="eyebrow">For inspection companies</span>
        <h1 id="cp-title" className="font-heading cp-title">
          Inspection jobs from buyers, booked and paid in one place
        </h1>
        <p className="cp-sub">
          Exporters and importers book surveyors on Qualty for PSI, loading supervision, stuffing surveys and
          certificates. List your services and ports, bid on enquiries, and run each job in a chat with the customer.
        </p>
        <div className="cp-actions">
          {primary}
          <Link href="/#services" className="btn-secondary cp-cta">
            See the store as customers do
          </Link>
        </div>
      </section>

      <DashboardStill />

      <CompanyBenefits />

      <section className="section cp-steps-wrap" aria-labelledby="cp-steps-title">
        <div className="section-head">
          <span className="eyebrow">How a job runs</span>
          <h2 id="cp-steps-title">From listing to payout</h2>
        </div>
        <ol className="cp-steps">
          {STEPS.map(({ Icon, title, body }, i) => (
            <li key={title} className="card-shell cp-step">
              <span className="cp-step-icon" aria-hidden="true">
                <Icon size={20} weight="bold" />
              </span>
              <span className="cp-step-n">Step {i + 1}</span>
              <h3 className="cp-step-title">{title}</h3>
              <p className="cp-step-body">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      <CompanyCredentials />

      <section className="section" aria-labelledby="cp-price-title">
        <div className="section-head">
          <span className="eyebrow">Pricing</span>
          <h2 id="cp-price-title">You set your price. Qualty adds its fee on top.</h2>
          <p>
            Customers pay your price plus {MARGIN_PCT}%. On enquiries, Qualty takes its fee out of the budget before you
            see it, so every number on your dashboard is what you take home.
          </p>
        </div>
        <div className="card-shell cp-split">
          <div className="cp-split-row">
            <span>Customer&apos;s enquiry budget</span>
            <span className="cp-num">${EXAMPLE_BUDGET.toLocaleString()}</span>
          </div>
          <div className="cp-split-row cp-split-you">
            <span>Budget shown to your company</span>
            <span className="cp-num">${budgetForCompanies(EXAMPLE_BUDGET).toLocaleString()}</span>
          </div>
        </div>
      </section>

      <section className="section cp-final" aria-labelledby="cp-final-title">
        <h2 id="cp-final-title" className="font-heading cp-final-title">
          Put your surveyors in front of buyers at your ports
        </h2>
        <div className="cp-actions">{primary}</div>
      </section>

      <Footer />
      <AccountModal />
      <Toaster />

      <style jsx>{`
        .cp-hero {
          max-width: 1280px;
          margin: 0 auto;
          padding: clamp(48px, 8vw, 96px) 20px 48px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 16px;
        }
        .cp-title {
          max-width: 680px;
          font-size: clamp(36px, 5vw, 48px);
          line-height: 1.05;
          font-weight: 600;
          letter-spacing: -0.03em;
          margin: 0;
          text-wrap: balance;
        }
        .cp-sub {
          max-width: 620px;
          font-size: 18px;
          line-height: 28px;
          color: var(--text-secondary);
          margin: 0;
        }
        .cp-actions {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 12px;
          margin-top: 8px;
        }
        .cp-actions :global(.cp-cta) {
          padding: 12px 20px;
          font-size: 16px;
          text-decoration: none;
        }
        .cp-steps {
          list-style: none;
          padding: 0;
          margin: 0;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 16px;
        }
        .cp-step {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .cp-step-icon {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--accent-light);
          color: var(--accent-primary);
          margin-bottom: 8px;
        }
        .cp-step-n {
          font-size: 12px;
          line-height: 16px;
          font-weight: 600;
          color: var(--text-muted);
        }
        .cp-step-title {
          font-size: 18px;
          line-height: 28px;
          font-weight: 600;
          margin: 0;
          color: var(--text-main);
        }
        .cp-step-body {
          font-size: 14px;
          line-height: 20px;
          color: var(--text-secondary);
          margin: 0;
        }
        .cp-split {
          max-width: 480px;
          margin: 0 auto;
          padding: 8px 24px;
        }
        .cp-split-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          padding: 16px 0;
          font-size: 16px;
          line-height: 24px;
          color: var(--text-secondary);
        }
        .cp-split-row + .cp-split-row {
          border-top: 1px solid var(--border-light);
        }
        .cp-split-you {
          color: var(--text-main);
          font-weight: 600;
        }
        .cp-num {
          font-family: var(--mono);
          font-variant-numeric: tabular-nums;
          font-size: 20px;
          line-height: 28px;
          font-weight: 600;
          color: var(--text-main);
        }
        .cp-final {
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }
        .cp-final-title {
          max-width: 680px;
          font-size: clamp(30px, 4vw, 40px);
          line-height: 1.1;
          font-weight: 600;
          letter-spacing: -0.025em;
          margin: 0;
          text-wrap: balance;
        }
      `}</style>
    </main>
  );
}
