"use client";

import React, { useState, useEffect, useSyncExternalStore } from "react";
import { Sun, Moon, ArrowRight, Clock, List, X } from "@phosphor-icons/react";
import { useTheme } from "@/context/ThemeContext";
import { isRemote, useSession, signOut } from "@/lib/store";

interface NavbarProps {
  onOpenBooking: () => void;
}

const noopSubscribe = () => () => {};

export default function Navbar({ onOpenBooking }: NavbarProps) {
  const { theme, toggleTheme } = useTheme();
  const [utcTime, setUtcTime] = useState<string>("");
  // true only after hydration, so the theme button never mismatches the server HTML
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const { session, ready } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  // Close the mobile menu on Escape and lock page scroll while it is open.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setUtcTime(now.toISOString().substring(11, 19) + " UTC");
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const links = [
    { href: "#services", label: "Services" },
    { href: "#calibrator", label: "Calibrator" },
    { href: "#orders", label: "Orders" },
    { href: "#vault", label: "Evidence" },
    { href: "#company", label: "For companies" },
  ];

  const openAuth = () => window.dispatchEvent(new CustomEvent("qualty:open-auth"));

  return (
    <header className="qnav">
      <div className="qnav-inner">
        <a href="#top" className="qnav-brand">
          <span className="qnav-logo" aria-hidden="true">Q</span>
          <span className="font-heading qnav-word">Qualty</span>
          <span className="qnav-ai">AI</span>
        </a>

        <nav className="qnav-links" aria-label="Main">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="qnav-link">
              {l.label}
            </a>
          ))}
        </nav>

        <div className="qnav-actions">
          <div id="utc-pill" className="qnav-clock font-mono" aria-label="Current UTC time">
            <Clock size={13} aria-hidden="true" />
            <span>{utcTime || "12:00:00 UTC"}</span>
          </div>

          {mounted && (
            <button
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
              title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
              className="qnav-icon"
            >
              {theme === "light" ? <Moon size={16} weight="bold" /> : <Sun size={16} weight="bold" />}
            </button>
          )}

          {/* Account (only with the Supabase backend) */}
          {isRemote && mounted && ready && (
            session ? (
              <button
                onClick={() => void signOut()}
                className="btn-secondary qnav-btn qnav-desktop"
                title={`Signed in as ${session.email}`}
              >
                Sign out
              </button>
            ) : (
              <button onClick={openAuth} className="btn-secondary qnav-btn qnav-desktop">
                Sign in
              </button>
            )
          )}

          <button onClick={onOpenBooking} className="btn-primary qnav-btn" aria-label="Book Inspection">
            <span className="qnav-cta-long">Book Inspection</span>
            <span className="qnav-cta-short" aria-hidden="true">Book</span>
            <ArrowRight size={14} weight="bold" aria-hidden="true" />
          </button>

          <button
            className="qnav-icon qnav-menu-btn"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="qnav-panel"
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? <X size={18} weight="bold" /> : <List size={18} weight="bold" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div id="qnav-panel" className="qnav-panel">
          <nav aria-label="Mobile">
            {links.map((l, i) => (
              <a
                key={l.href}
                href={l.href}
                className="qnav-panel-link font-heading"
                style={{ animationDelay: `${Math.min(i * 50, 300)}ms` }}
                onClick={() => setMenuOpen(false)}
              >
                {l.label}
              </a>
            ))}
          </nav>
          {isRemote && mounted && ready && (
            session ? (
              <button className="btn-secondary" onClick={() => { setMenuOpen(false); void signOut(); }}>
                Sign out ({session.email})
              </button>
            ) : (
              <button className="btn-secondary" onClick={() => { setMenuOpen(false); openAuth(); }}>
                Sign in
              </button>
            )
          )}
        </div>
      )}

      <style jsx>{`
        .qnav {
          position: sticky;
          top: 0;
          z-index: 50;
          background-color: var(--nav-backdrop);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--border-main);
        }
        .qnav-inner {
          max-width: 1280px;
          margin: 0 auto;
          padding: 10px 20px;
          height: 60px;
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .qnav-brand {
          display: flex;
          align-items: center;
          gap: 8px;
          flex: none;
        }
        .qnav-logo {
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
        .qnav-word {
          font-size: 19px;
          font-weight: 700;
          color: var(--text-main);
        }
        .qnav-ai {
          font-size: 11px;
          font-weight: 700;
          color: var(--accent-primary);
          background: var(--accent-light);
          padding: 2px 6px;
          border-radius: 6px;
        }
        .qnav-links {
          display: none;
          align-items: center;
          gap: 4px;
          margin-left: 12px;
        }
        .qnav-link {
          white-space: nowrap;
          font-size: 14px;
          font-weight: 500;
          color: var(--text-secondary);
          padding: 8px 12px;
          border-radius: 9999px;
          transition: color 0.2s var(--ease-out), background-color 0.2s var(--ease-out);
        }
        .qnav-link:hover {
          color: var(--text-main);
          background: var(--bg-subtle);
        }
        .qnav-actions {
          margin-left: auto;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .qnav-clock {
          display: none;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: var(--text-muted);
          padding: 6px 10px;
          border-radius: 9999px;
          border: 1px solid var(--border-main);
          background: var(--bg-subtle);
          white-space: nowrap;
        }
        .qnav-icon {
          width: 36px;
          height: 36px;
          flex: none;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-subtle);
          color: var(--text-secondary);
          border: 1px solid var(--border-main);
          transition: color 0.2s var(--ease-out), border-color 0.2s var(--ease-out), transform 0.2s var(--ease-out);
        }
        .qnav-icon:hover {
          color: var(--text-main);
          border-color: var(--border-strong);
        }
        .qnav-icon:active {
          transform: scale(0.96);
        }
        .qnav-btn {
          padding: 8px 14px;
          font-size: 13.5px;
        }
        .qnav-cta-long,
        .qnav-desktop {
          display: none;
        }
        .qnav-panel {
          position: fixed;
          inset: 60px 0 0 0;
          background: var(--bg-page);
          padding: 24px 20px;
          display: flex;
          flex-direction: column;
          gap: 24px;
          overflow-y: auto;
        }
        .qnav-panel nav {
          display: flex;
          flex-direction: column;
        }
        .qnav-panel-link {
          font-size: 24px;
          font-weight: 600;
          color: var(--text-main);
          padding: 12px 0;
          border-bottom: 1px solid var(--border-light);
          animation: qnav-in 0.4s var(--ease-out) both;
        }
        @keyframes qnav-in {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: none;
          }
        }
        @media (min-width: 640px) {
          .qnav-cta-long {
            display: inline;
          }
          .qnav-cta-short {
            display: none;
          }
          .qnav-desktop {
            display: inline-flex;
          }
        }
        @media (min-width: 960px) {
          .qnav-links {
            display: flex;
          }
          .qnav-menu-btn {
            display: none;
          }
        }
        @media (min-width: 1200px) {
          .qnav-clock {
            display: inline-flex;
          }
        }
      `}</style>
    </header>
  );
}
