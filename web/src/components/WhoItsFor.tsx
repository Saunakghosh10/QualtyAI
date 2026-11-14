"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Boat,
  Buildings,
  ChatsCircle,
  HandCoins,
  ListChecks,
  MagnifyingGlass,
  MapPin,
  Tray,
} from "@phosphor-icons/react";

type Item = { Icon: typeof Boat; text: string };

const SIDES: {
  id: string;
  Icon: typeof Boat;
  who: string;
  title: string;
  items: Item[];
  cta: { label: string; href: string };
  tone: "accent" | "success";
}[] = [
  {
    id: "buyers",
    Icon: Boat,
    who: "Exporters, importers and traders",
    title: "Get your cargo checked at the port",
    items: [
      { Icon: MapPin, text: "Book an inspection at the port your cargo leaves from" },
      { Icon: MagnifyingGlass, text: "Compare companies on price and turnaround" },
      { Icon: ChatsCircle, text: "Follow the job in one chat with photos and readings" },
    ],
    cta: { label: "Browse inspections", href: "#services" },
    tone: "accent",
  },
  {
    id: "companies",
    Icon: Buildings,
    who: "Inspection companies and inspectors",
    title: "Get inspection jobs from buyers",
    items: [
      { Icon: ListChecks, text: "List your services, prices and the dates you're free" },
      { Icon: Tray, text: "Get enquiries and bid on the ones you want" },
      { Icon: HandCoins, text: "Get paid through Qualty when the inspection closes" },
    ],
    cta: { label: "See how it works for companies", href: "/companies" },
    tone: "success",
  },
];

/** Two audiences, side by side, right after the hero. */
export default function WhoItsFor() {
  return (
    <section className="who section" aria-labelledby="who-title">
      <h2 id="who-title" className="who-title font-heading">
        Who Qualty is for
      </h2>
      <div className="who-grid">
        {SIDES.map((side) => (
          <article key={side.id} className="card-shell who-card" data-tone={side.tone}>
            <div className="who-head">
              <span className="who-icon" aria-hidden="true">
                <side.Icon size={20} weight="bold" />
              </span>
              <span className="who-who">{side.who}</span>
            </div>
            <h3 className="who-card-title font-heading">{side.title}</h3>
            <ul className="who-list">
              {side.items.map(({ Icon, text }) => (
                <li key={text}>
                  <Icon size={18} aria-hidden="true" className="who-item-icon" />
                  <span>{text}</span>
                </li>
              ))}
            </ul>
            {side.cta.href.startsWith("/") ? (
              <Link href={side.cta.href} className="who-cta">
                {side.cta.label}
                <ArrowRight size={16} weight="bold" aria-hidden="true" />
              </Link>
            ) : (
              <a href={side.cta.href} className="who-cta">
                {side.cta.label}
                <ArrowRight size={16} weight="bold" aria-hidden="true" />
              </a>
            )}
          </article>
        ))}
      </div>

      <style jsx>{`
        .who {
          padding-top: 0;
          padding-bottom: clamp(48px, 6vw, 64px);
        }
        .who-title {
          font-size: 14px;
          line-height: 20px;
          font-weight: 600;
          color: var(--text-muted);
          text-align: center;
          letter-spacing: 0;
          margin-bottom: 16px;
        }
        .who-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(min(100%, 340px), 1fr));
          gap: 16px;
        }
        .who-grid :global(.who-card) {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .who-head {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .who-icon {
          width: 40px;
          height: 40px;
          flex: none;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--accent-light);
          color: var(--accent-primary);
        }
        [data-tone="success"] .who-icon {
          background: var(--success-bg);
          color: var(--success-text);
        }
        .who-who {
          font-size: 14px;
          line-height: 20px;
          font-weight: 500;
          color: var(--text-secondary);
        }
        .who-card-title {
          font-size: 24px;
          line-height: 32px;
          font-weight: 600;
          color: var(--text-main);
        }
        .who-list {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .who-list li {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          font-size: 16px;
          line-height: 24px;
          color: var(--text-secondary);
        }
        .who-list :global(.who-item-icon) {
          flex: none;
          margin-top: 3px;
          color: var(--text-muted);
        }
        .who-grid :global(.who-cta) {
          margin-top: auto;
          align-self: flex-start;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          line-height: 20px;
          font-weight: 600;
          color: var(--accent-primary);
          padding: 8px 0;
          border-radius: 6px;
        }
        .who-grid :global(.who-cta:hover) {
          color: var(--accent-text);
        }
        .who-grid :global(.who-cta svg) {
          transition: transform 0.3s var(--ease-out);
        }
        .who-grid :global(.who-cta:hover svg) {
          transform: translateX(2px);
        }
      `}</style>
    </section>
  );
}
