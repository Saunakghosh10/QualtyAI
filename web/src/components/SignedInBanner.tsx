"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Buildings } from "@phosphor-icons/react";
import { useDB } from "@/lib/store";
import { useViewer } from "@/lib/viewer";

/** A slim bar on the booking site for inspection companies and the Qualty team, pointing back to their dashboard. */
export default function SignedInBanner() {
  const viewer = useViewer();
  const companies = useDB().companies;
  if (viewer.kind !== "company" && viewer.kind !== "admin") return null;

  const who =
    viewer.kind === "admin"
      ? "the Qualty team"
      : companies.find((c) => c.id === viewer.companyIds[0])?.name ?? viewer.name ?? "an inspection company";

  return (
    <div className="sib" role="region" aria-label="Signed in">
      <div className="sib-inner">
        <Buildings size={16} aria-hidden="true" className="sib-icon" />
        <span className="sib-text">You&apos;re signed in as {who}.</span>
        <Link href="/dashboard" className="sib-link">
          Go to your dashboard
          <ArrowRight size={14} weight="bold" aria-hidden="true" />
        </Link>
      </div>
      <style jsx>{`
        .sib {
          background: var(--accent-light);
          border-bottom: 1px solid var(--accent-border);
          color: var(--accent-text);
        }
        .sib-inner {
          max-width: 1280px;
          margin: 0 auto;
          padding: 8px 20px;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 4px 12px;
          font-size: 14px;
          line-height: 20px;
        }
        .sib-inner :global(.sib-icon) {
          flex: none;
        }
        .sib-text {
          min-width: 0;
        }
        .sib-inner :global(.sib-link) {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-weight: 600;
          color: var(--accent-primary);
          text-decoration: underline;
          text-underline-offset: 3px;
        }
      `}</style>
    </div>
  );
}
