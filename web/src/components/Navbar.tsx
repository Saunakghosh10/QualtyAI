"use client";

import React, { useState, useEffect } from "react";
import { Sun, Moon, ArrowRight, Clock, User, ShieldCheck } from "@phosphor-icons/react";
import { useTheme } from "@/context/ThemeContext";

interface NavbarProps {
  onOpenBooking: () => void;
  onOpenAuth: () => void;
  currentUser?: { name: string; role: string } | null;
}

export default function Navbar({ onOpenBooking, onOpenAuth, currentUser }: NavbarProps) {
  const { theme, toggleTheme } = useTheme();
  const [utcTime, setUtcTime] = useState<string>("");
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    const updateTime = () => {
      const now = new Date();
      setUtcTime(now.toISOString().substring(11, 19) + " UTC");
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        backgroundColor: "var(--nav-backdrop)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--border-main)",
      }}
    >
      <div
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          padding: "12px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
        }}
      >
        {/* Brand */}
        <a
          href="#top"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            textDecoration: "none",
          }}
        >
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              backgroundColor: "var(--accent-primary)",
              color: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: "16px",
              fontFamily: "var(--heading)",
            }}
          >
            Q
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <span
                className="font-heading"
                style={{
                  fontSize: "19px",
                  fontWeight: 700,
                  color: "var(--text-main)",
                  letterSpacing: "-0.03em",
                }}
              >
                Qualty
              </span>
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "var(--accent-primary)",
                  backgroundColor: "var(--accent-light)",
                  padding: "1px 6px",
                  borderRadius: "6px",
                }}
              >
                AI
              </span>
            </div>
            <div
              style={{
                fontSize: "10.5px",
                color: "var(--text-muted)",
                letterSpacing: "0.02em",
                fontWeight: 500,
              }}
            >
              Physical Cargo Inspection
            </div>
          </div>
        </a>

        {/* Navigation Links */}
        <nav
          style={{
            display: "none",
            alignItems: "center",
            gap: "22px",
            fontSize: "13.5px",
            fontWeight: 500,
            color: "var(--text-secondary)",
          }}
          className="desktop-nav"
        >
          <a
            href="#services"
            style={{ transition: "color 0.15s" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent-primary)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
          >
            Services
          </a>
          <a
            href="#calibrator"
            style={{ transition: "color 0.15s" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent-primary)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
          >
            Commodity Calibrator
          </a>
          <a
            href="#vault"
            style={{ transition: "color 0.15s" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent-primary)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
          >
            Evidence Vault
          </a>
          <a
            href="#pilot"
            style={{ transition: "color 0.15s" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent-primary)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
          >
            Quality Pilot
          </a>
          <a
            href="#surveyors"
            style={{ transition: "color 0.15s" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent-primary)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
          >
            Surveyor Hubs
          </a>
        </nav>

        {/* Right Section: Time + Auth + Theme Toggle + CTA */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* UTC Clock */}
          <div
            className="badge-pill"
            style={{
              backgroundColor: "var(--bg-subtle)",
              color: "var(--text-muted)",
              border: "1px solid var(--border-main)",
              display: "none",
            }}
            id="utc-pill"
          >
            <Clock size={13} />
            <span className="font-mono" style={{ fontSize: "11px" }}>
              {utcTime || "12:00:00 UTC"}
            </span>
          </div>

          {/* User Sign In / Profile */}
          {currentUser ? (
            <div
              className="badge-pill"
              style={{
                backgroundColor: "var(--success-bg)",
                color: "var(--success-text)",
                border: "1px solid var(--success-border)",
                fontSize: "12px",
              }}
            >
              <ShieldCheck size={14} weight="bold" />
              <span>{currentUser.name}</span>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                fontSize: "13px",
                fontWeight: 600,
                color: "var(--text-secondary)",
                padding: "6px 12px",
                borderRadius: "8px",
                cursor: "pointer",
                transition: "color 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent-primary)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
            >
              <User size={15} />
              <span>Sign In / KYC</span>
            </button>
          )}

          {/* Theme Toggle Button */}
          {mounted && (
            <button
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
              title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "var(--bg-subtle)",
                color: "var(--text-secondary)",
                border: "1px solid var(--border-main)",
                transition: "all 0.2s ease",
              }}
            >
              {theme === "light" ? <Moon size={16} weight="bold" /> : <Sun size={16} weight="bold" />}
            </button>
          )}

          {/* Book Inspection CTA */}
          <button onClick={onOpenBooking} className="btn-primary" style={{ padding: "8px 16px", fontSize: "13px" }}>
            <span>Book Inspection</span>
            <ArrowRight size={14} weight="bold" />
          </button>
        </div>
      </div>

      <style jsx>{`
        @media (min-width: 860px) {
          .desktop-nav {
            display: flex !important;
          }
          #utc-pill {
            display: inline-flex !important;
          }
        }
      `}</style>
    </header>
  );
}
