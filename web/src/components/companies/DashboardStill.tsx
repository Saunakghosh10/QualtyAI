"use client";

import React from "react";
import {
  Tray,
  Storefront,
  Wallet,
  Certificate,
  UsersThree,
  ChatsCircle,
  MapPin,
  CheckCircle,
} from "@phosphor-icons/react";

/**
 * A still of the company dashboard (stageshow rules): the window rises from the bottom edge of the
 * hero, real words only on the new enquiry, one listing and the payout; everything else is placeholder.
 * The numbers match the pricing section: a $2,500 customer budget shows companies $1,750.
 */

const Bar = ({ w, h = 8, tone = "faint" }: { w: number | string; h?: number; tone?: "faint" | "soft" }) => (
  <span className={`bar bar-${tone}`} style={{ width: typeof w === "number" ? `${w}px` : w, height: `${h}px` }}>
    <style jsx>{`
      .bar {
        display: block;
        flex: none;
        border-radius: 9999px;
      }
      .bar-faint {
        background: var(--border-main);
      }
      .bar-soft {
        background: var(--border-strong);
      }
    `}</style>
  </span>
);

const NAV = [
  { Icon: Tray, label: "Enquiries", active: true },
  { Icon: Storefront },
  { Icon: Wallet },
  { Icon: Certificate },
  { Icon: ChatsCircle },
  { Icon: UsersThree },
];

export default function DashboardStill() {
  return (
    <div
      className="stage"
      role="img"
      aria-label="The Qualty company dashboard. A new enquiry for Pre-Shipment Inspection at Kandla Port with a budget of $1,750, your ECTN listing at $120 across India, and a $910 payout sent."
    >
      <div className="win" aria-hidden="true">
        <div className="chrome">
          <span className="dots">
            <i />
            <i />
            <i />
          </span>
          <span className="address">
            <Bar w={120} h={6} />
          </span>
        </div>

        <div className="body">
          <nav className="side">
            <span className="logo">Q</span>
            {NAV.map(({ Icon, label, active }, i) => (
              <span key={i} className="nav-item" data-active={active || undefined}>
                <Icon size={18} weight={active ? "fill" : "regular"} />
                {label ? (
                  <>
                    <span className="nav-label">{label}</span>
                    <span className="nav-count">1</span>
                  </>
                ) : (
                  <span className="nav-label">
                    <Bar w={56 + ((i * 23) % 40)} />
                  </span>
                )}
              </span>
            ))}
          </nav>

          <div className="main">
            <div className="main-head">
              <Bar w={96} h={10} tone="soft" />
              <span className="chips">
                <Bar w={48} h={20} />
                <Bar w={64} h={20} />
              </span>
            </div>

            <div className="enq">
              <div className="enq-top">
                <span className="new-dot" />
                <Bar w={72} h={6} />
              </div>
              <div className="enq-title">Pre-Shipment Inspection (PSI)</div>
              <div className="enq-meta">
                <MapPin size={14} />
                <span>Kandla Port</span>
                <Bar w={80} h={6} />
              </div>
              <div className="enq-foot">
                <div>
                  <div className="enq-budget-label">Budget</div>
                  <div className="enq-budget">$1,750</div>
                </div>
                <span className="send">Send bid</span>
              </div>
            </div>

            {[0, 1].map((k) => (
              <div key={k} className="enq-quiet">
                <span className="q-icon" />
                <span className="q-lines">
                  <Bar w={k ? 140 : 180} tone="soft" />
                  <Bar w={k ? 96 : 120} h={6} />
                </span>
                <Bar w={44} h={10} />
              </div>
            ))}
          </div>

          <div className="rail">
            <Bar w={88} h={10} tone="soft" />
            <div className="listing">
              <div className="listing-top">
                <span className="listing-name">ECTN</span>
                <span className="toggle">
                  <span />
                </span>
              </div>
              <div className="listing-where">All India</div>
              <div className="listing-price">$120</div>
            </div>
            {[0, 1].map((k) => (
              <div key={k} className="listing-quiet">
                <span className="q-lines">
                  <Bar w={k ? 72 : 104} tone="soft" />
                  <Bar w={k ? 56 : 64} h={6} />
                </span>
                <Bar w={36} h={10} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="payout" aria-hidden="true">
        <span className="payout-icon">
          <CheckCircle size={20} weight="fill" />
        </span>
        <span className="payout-text">
          <span className="payout-label">Payout sent</span>
          <Bar w={72} h={6} />
        </span>
        <span className="payout-amount">$910</span>
      </div>

      <style jsx>{`
        .stage {
          position: relative;
          height: 440px;
          overflow: hidden;
          max-width: 1080px;
          margin: 0 auto;
          padding: 0 56px;
        }
        .win {
          position: relative;
          height: 520px;
          border-radius: 16px 16px 0 0;
          background: var(--bg-card);
          border: 1px solid var(--border-main);
          border-bottom: none;
          box-shadow: var(--shadow-xl);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .chrome {
          height: 40px;
          flex: none;
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 0 16px;
          border-bottom: 1px solid var(--border-main);
          background: var(--bg-subtle);
        }
        .dots {
          display: flex;
          gap: 6px;
        }
        .dots i {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: var(--border-strong);
        }
        .address {
          flex: 1;
          display: flex;
          justify-content: center;
          margin-right: 46px;
        }
        .body {
          flex: 1;
          display: grid;
          grid-template-columns: 184px minmax(0, 1fr) 272px;
          min-height: 0;
        }
        .side {
          border-right: 1px solid var(--border-main);
          padding: 16px 12px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .logo {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          background: var(--accent-fill);
          color: #fff;
          font-family: var(--heading);
          font-weight: 700;
          font-size: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 0 16px 4px;
        }
        .nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          height: 36px;
          padding: 0 8px;
          border-radius: 8px;
          color: var(--text-faint);
        }
        .nav-item[data-active] {
          background: var(--accent-light);
          color: var(--accent-primary);
        }
        .nav-label {
          flex: 1;
          display: flex;
          align-items: center;
          font-size: 14px;
          line-height: 20px;
          font-weight: 600;
        }
        .nav-count {
          font-size: 12px;
          line-height: 16px;
          font-weight: 600;
          color: #fff;
          background: var(--accent-fill);
          border-radius: 9999px;
          padding: 0 6px;
          font-variant-numeric: tabular-nums;
        }
        .main {
          padding: 20px 24px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          background: var(--bg-page);
        }
        .main-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 4px;
        }
        .chips {
          display: flex;
          gap: 8px;
        }
        .enq {
          background: var(--bg-card);
          border: 1px solid var(--accent-border);
          border-radius: 12px;
          padding: 16px;
          box-shadow: 0 0 0 4px var(--accent-light), var(--shadow-md);
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .enq-top {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .new-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--accent-fill);
        }
        .enq-title {
          font-size: 18px;
          line-height: 28px;
          font-weight: 600;
          color: var(--text-main);
          letter-spacing: -0.01em;
        }
        .enq-meta {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 14px;
          line-height: 20px;
          color: var(--text-secondary);
        }
        .enq-meta :global(.bar) {
          margin-left: 8px;
        }
        .enq-foot {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 16px;
          margin-top: 8px;
          padding-top: 12px;
          border-top: 1px solid var(--border-light);
        }
        .enq-budget-label {
          font-size: 12px;
          line-height: 16px;
          font-weight: 500;
          color: var(--text-muted);
        }
        .enq-budget {
          font-family: var(--mono);
          font-variant-numeric: tabular-nums;
          font-size: 24px;
          line-height: 32px;
          font-weight: 600;
          color: var(--text-main);
        }
        .send {
          font-size: 14px;
          line-height: 20px;
          font-weight: 600;
          color: #fff;
          background: var(--accent-fill);
          padding: 8px 16px;
          border-radius: 9999px;
          white-space: nowrap;
        }
        .enq-quiet,
        .listing-quiet {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          border-radius: 12px;
          background: var(--bg-card);
          border: 1px solid var(--border-main);
        }
        .q-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: var(--bg-subtle);
          flex: none;
        }
        .q-lines {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-width: 0;
        }
        .rail {
          border-left: 1px solid var(--border-main);
          padding: 20px 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .rail > :global(.bar) {
          margin: 4px 0 8px;
        }
        .listing {
          border: 1px solid var(--border-main);
          border-radius: 12px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          box-shadow: var(--shadow-sm);
        }
        .listing-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .listing-name {
          font-size: 16px;
          line-height: 24px;
          font-weight: 600;
          color: var(--text-main);
        }
        .toggle {
          width: 32px;
          height: 18px;
          border-radius: 9999px;
          background: var(--success-fill);
          position: relative;
        }
        .toggle span {
          position: absolute;
          top: 2px;
          right: 2px;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #fff;
        }
        .listing-where {
          font-size: 14px;
          line-height: 20px;
          color: var(--text-secondary);
        }
        .listing-price {
          font-family: var(--mono);
          font-variant-numeric: tabular-nums;
          font-size: 20px;
          line-height: 28px;
          font-weight: 600;
          color: var(--text-main);
          margin-top: 4px;
        }
        .listing-quiet {
          padding: 12px 16px;
        }
        .payout {
          position: absolute;
          left: 8px;
          bottom: 48px;
          width: 248px;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border-radius: 16px;
          background: var(--bg-elevated);
          border: 1px solid var(--border-main);
          box-shadow: var(--shadow-xl);
        }
        .payout-icon {
          color: var(--success);
          display: flex;
          flex: none;
        }
        .payout-text {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 6px;
          min-width: 0;
        }
        .payout-label {
          font-size: 14px;
          line-height: 20px;
          font-weight: 600;
          color: var(--text-main);
        }
        .payout-amount {
          font-family: var(--mono);
          font-variant-numeric: tabular-nums;
          font-size: 16px;
          line-height: 24px;
          font-weight: 600;
          color: var(--success-text);
        }

        /* Mid widths: drop the sidebar labels to icons. */
        @media (max-width: 960px) {
          .stage {
            padding: 0 32px;
          }
          .body {
            grid-template-columns: 56px minmax(0, 1fr) 248px;
          }
          .nav-label,
          .nav-count {
            display: none;
          }
          .side {
            padding: 16px 8px;
            align-items: center;
          }
          .logo {
            margin: 0 0 16px;
          }
          .nav-item {
            width: 40px;
            justify-content: center;
            padding: 0;
          }
        }

        /* Phones: a narrower window that runs off the right edge too; the listing sits under the enquiry. */
        @media (max-width: 640px) {
          .stage {
            height: 560px;
            padding: 0 0 0 16px;
          }
          .win {
            width: 520px;
            height: 600px;
          }
          .body {
            grid-template-columns: 56px 320px;
            grid-template-rows: auto 1fr;
          }
          .side {
            grid-row: 1 / span 2;
          }
          .main {
            padding: 16px;
          }
          .main-head .chips {
            display: none;
          }
          .enq-quiet:last-child {
            display: none;
          }
          .rail {
            border-left: none;
            grid-column: 2;
            padding: 0 16px 16px;
            background: var(--bg-page);
          }
          .rail > :global(.bar),
          .listing-quiet {
            display: none;
          }
          .payout {
            left: auto;
            right: 16px;
            bottom: 8px;
            width: 220px;
          }
        }
      `}</style>
    </div>
  );
}
