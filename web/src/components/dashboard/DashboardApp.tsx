"use client";

import React from "react";
import Link from "next/link";
import { SignOut } from "@phosphor-icons/react";
import AccountModal from "@/components/AccountModal";
import Toaster from "@/components/Toaster";
import { ConsoleCard, CompanySetup, CompanySwitcher, QualtyTeamPanel, useMyCompanies } from "@/components/CompanyConsole";
import CompanyHeader from "@/components/dashboard/CompanyHeader";
import { signOut } from "@/lib/store";
import { run } from "@/lib/notify";
import { useViewer } from "@/lib/viewer";

const openAuth = (mode: "signin" | "signup") =>
  window.dispatchEvent(new CustomEvent("qualty:open-auth", { detail: { mode, as: "company" } }));

/** The post-login workspace for inspection companies and the Qualty team. */
export default function DashboardApp() {
  const viewer = useViewer();
  const { mine, company, setCompanyId, session } = useMyCompanies();
  const workspace = viewer.kind === "company" || viewer.kind === "admin" || viewer.kind === "demo";
  const who = viewer.kind === "admin" ? "Qualty team" : viewer.kind === "company" ? "Company" : null;

  return (
    <div className="dash">
      <header className="dash-bar">
        <div className="dash-bar-inner">
          <Link href="/" className="dash-brand">
            <span className="dash-logo" aria-hidden="true">Q</span>
            <span className="font-heading dash-word">Qualty</span>
            <span className="dash-ai">AI</span>
          </Link>
          <span className="dash-crumb">Dashboard</span>
          <div className="dash-bar-end">
            {workspace && company && <CompanySwitcher mine={mine} company={company} onChange={setCompanyId} />}
            {viewer.kind === "demo" && <span className="dash-tag">Demo, no sign-in</span>}
            {session && (
              <>
                <span className="dash-user">
                  <span className="dash-user-name">{session.name || session.email}</span>
                  {who && <span className="dash-user-role">{who}</span>}
                </span>
                <button className="btn-secondary dash-signout" onClick={() => void run(signOut())}>
                  <SignOut size={15} aria-hidden="true" />
                  Sign out
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="dash-main" id="company">
        {viewer.kind === "loading" ? (
          <Skeleton />
        ) : viewer.kind === "visitor" ? (
          <SignInPrompt />
        ) : !workspace ? (
          <CompanySetup
            title="Set up your inspection company"
            hint="You'll be the owner. Next you can list your services and prices, add KYC documents and accreditations, and invite your team."
            footer={
              <Link href="/" className="dash-link">
                Booking an inspection instead? Go to booking
              </Link>
            }
          />
        ) : company ? (
          <>
            <CompanyHeader company={company} />
            <ConsoleCard company={company} identity={false} roomsInNewTab />
          </>
        ) : viewer.kind === "admin" ? (
          <QualtyTeamPanel />
        ) : (
          <CompanySetup
            title="Set up your inspection company"
            hint="You'll be the owner. Next you can list your services and prices, add KYC documents and accreditations, and invite your team."
          />
        )}
      </main>

      <AccountModal />
      <Toaster />

      <style jsx>{`
        .dash {
          min-height: 100vh;
          background: var(--bg-page);
          -webkit-font-smoothing: antialiased;
        }
        .dash-bar {
          position: sticky;
          top: 0;
          z-index: 50;
          background-color: var(--nav-backdrop);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--border-main);
        }
        .dash-bar-inner {
          max-width: 1280px;
          margin: 0 auto;
          padding: 10px clamp(12px, 3vw, 20px);
          min-height: 60px;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px 14px;
        }
        .dash-bar-inner :global(.dash-brand) {
          display: flex;
          align-items: center;
          gap: 8px;
          flex: none;
          border-radius: 8px;
        }
        .dash-logo {
          width: 30px;
          height: 30px;
          border-radius: 8px;
          background: var(--accent-fill);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--heading);
          font-weight: 700;
          font-size: 16px;
        }
        .dash-word {
          font-size: 19px;
          font-weight: 700;
          color: var(--text-main);
        }
        .dash-ai {
          font-size: 11px;
          font-weight: 700;
          color: var(--accent-primary);
          background: var(--accent-light);
          padding: 2px 6px;
          border-radius: 6px;
        }
        .dash-crumb {
          display: none;
          font-size: 13.5px;
          font-weight: 600;
          color: var(--text-secondary);
          padding-left: 14px;
          border-left: 1px solid var(--border-main);
        }
        .dash-bar-end {
          margin-left: auto;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: flex-end;
          gap: 8px 12px;
          min-width: 0;
        }
        .dash-tag {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary);
          background: var(--bg-subtle);
          border: 1px solid var(--border-main);
          padding: 3px 9px;
          border-radius: 999px;
          white-space: nowrap;
        }
        .dash-user {
          display: none;
          flex-direction: column;
          align-items: flex-end;
          line-height: 1.25;
          min-width: 0;
        }
        .dash-user-name {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-main);
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .dash-user-role {
          font-size: 11.5px;
          color: var(--text-muted);
        }
        .dash-bar-end :global(.dash-signout) {
          padding: 7px 12px;
          font-size: 13px;
          min-height: 36px;
        }
        @media (min-width: 640px) {
          .dash-crumb {
            display: inline;
          }
          .dash-user {
            display: flex;
          }
        }
        .dash-main {
          max-width: 1280px;
          margin: 0 auto;
          padding: clamp(20px, 4vw, 32px) clamp(12px, 3vw, 20px) 64px;
        }
        .dash-main :global(.dash-link) {
          font-size: 13px;
          font-weight: 600;
          color: var(--accent-primary);
          text-decoration: underline;
          text-underline-offset: 3px;
        }
      `}</style>
    </div>
  );
}

function SignInPrompt() {
  return (
    <div className="card-shell prompt">
      <h1 className="font-heading prompt-title">Sign in to your company dashboard</h1>
      <p className="prompt-body">
        Bid on enquiries, manage bookings, set your service prices and availability, track payouts and keep your accreditations up to date.
      </p>
      <div className="prompt-actions">
        <button className="btn-primary" style={{ padding: "10px 18px", fontSize: "14px" }} onClick={() => openAuth("signin")}>
          Sign in
        </button>
        <button className="btn-secondary" style={{ padding: "10px 18px", fontSize: "14px" }} onClick={() => openAuth("signup")}>
          Create a company account
        </button>
      </div>
      <p className="prompt-foot">
        New to Qualty?{" "}
        <Link href="/companies" className="prompt-link">
          See how it works for inspection companies
        </Link>
        . Booking an inspection?{" "}
        <Link href="/" className="prompt-link">
          Go to booking
        </Link>
        .
      </p>
      <style jsx>{`
        .prompt {
          max-width: 560px;
          margin: clamp(16px, 6vh, 64px) auto 0;
          padding: clamp(20px, 4vw, 32px);
        }
        .prompt-title {
          font-size: clamp(22px, 3vw, 28px);
          font-weight: 700;
          color: var(--text-main);
          line-height: 1.2;
          text-wrap: balance;
        }
        .prompt-body {
          margin-top: 10px;
          font-size: 15px;
          line-height: 1.6;
          color: var(--text-secondary);
          text-wrap: pretty;
        }
        .prompt-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 20px;
        }
        .prompt-foot {
          margin-top: 20px;
          padding-top: 16px;
          border-top: 1px solid var(--border-main);
          font-size: 13px;
          color: var(--text-muted);
          line-height: 1.6;
        }
        .prompt-foot :global(.prompt-link) {
          color: var(--accent-primary);
          font-weight: 600;
          text-decoration: underline;
          text-underline-offset: 3px;
        }
      `}</style>
    </div>
  );
}

function Skeleton() {
  return (
    <div aria-busy="true" aria-label="Loading your dashboard" className="sk">
      <div className="sk-head">
        <div>
          <div className="sk-bar" style={{ width: "min(320px, 70%)", height: "28px" }} />
          <div className="sk-bar" style={{ width: "140px", height: "14px", marginTop: "12px" }} />
          <div className="sk-bar" style={{ width: "min(420px, 90%)", height: "40px", marginTop: "18px" }} />
        </div>
        <div className="sk-stats">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="sk-bar" style={{ height: "84px" }} />
          ))}
        </div>
      </div>
      <div className="sk-bar" style={{ height: "420px", marginTop: "20px", borderRadius: "16px" }} />
      <style jsx>{`
        .sk-head {
          display: grid;
          gap: 20px;
        }
        @media (min-width: 960px) {
          .sk-head {
            grid-template-columns: minmax(0, 1fr) minmax(0, 520px);
          }
        }
        .sk-stats {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }
        .sk-bar {
          background: var(--bg-subtle);
          border-radius: 10px;
        }
        @media (prefers-reduced-motion: no-preference) {
          .sk-bar {
            animation: sk-pulse 1.6s ease-in-out infinite;
          }
        }
        @keyframes sk-pulse {
          50% {
            opacity: 0.55;
          }
        }
      `}</style>
    </div>
  );
}
