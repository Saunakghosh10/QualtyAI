"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { ArrowLeft, ArrowClockwise } from "@phosphor-icons/react";
import { useDB, isRemote, adminStats } from "@/lib/store";
import { useViewer } from "@/lib/viewer";
import { statsFromDB, normaliseStats, margin, type QualtyStats } from "@/lib/stats";

const noop = () => () => {};
/** False while prerendering, true in the browser, so dates are read only on the client. */
const useInBrowser = () => useSyncExternalStore(noop, () => true, () => false);

const usd = (n: number) => `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "Never";

/** The Qualty team's view of the whole platform: people, companies, orders and money. */
export default function AdminStats() {
  const viewer = useViewer();
  const db = useDB();
  const inBrowser = useInBrowser();
  const [remote, setRemote] = useState<QualtyStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      setRemote(normaliseStats(await adminStats()));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load the numbers.");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (!isRemote || viewer.kind !== "admin") return;
    let live = true;
    adminStats()
      .then((raw) => live && setRemote(normaliseStats(raw)))
      .catch((e: unknown) => live && setError(e instanceof Error ? e.message : "Couldn't load the numbers."));
    return () => {
      live = false;
    };
  }, [viewer.kind]);

  if (viewer.kind === "loading" || !inBrowser)
    return (
      <Shell>
        <p className="adm-muted">Checking your sign-in…</p>
      </Shell>
    );
  if (isRemote && viewer.kind !== "admin")
    return (
      <Shell>
        <h1 className="adm-title">Platform stats</h1>
        <p className="adm-muted">Only the Qualty team can see this page. Sign in with a Qualty admin account.</p>
      </Shell>
    );

  const s = isRemote ? remote : statsFromDB(db);

  return (
    <Shell>
      <div className="adm-head">
        <div>
          <h1 className="adm-title">Platform stats</h1>
          <p className="adm-muted">{isRemote ? "Live from the Qualty database." : "Demo data from this browser."}</p>
        </div>
        {isRemote && (
          <button type="button" className="btn-secondary adm-refresh" onClick={() => void load()} disabled={busy}>
            <ArrowClockwise size={16} aria-hidden="true" /> {busy ? "Loading…" : "Refresh"}
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="adm-error">
          {error}
        </p>
      )}
      {!s && !error && <p className="adm-muted">Loading the numbers…</p>}

      {s && (
        <>
          <dl className="adm-stats">
            <Stat
              label="People signed up"
              value={s.users ? s.users.total : "—"}
              note={s.users ? `${s.users.last7} in the last 7 days` : "Counted with Supabase only"}
            />
            <Stat label="Inspection companies" value={s.companies.total} note={`${s.companies.kycVerified} KYC verified`} />
            <Stat label="Orders" value={s.orders.total} note={`${s.orders.last7} in the last 7 days`} />
            <Stat label="Qualty margin" value={usd(margin(s))} note={`on ${usd(s.money.customerTotal)} customer price`} />
          </dl>

          <div className="adm-grid">
            <section className="adm-panel adm-wide" aria-labelledby="adm-signups">
              <h2 id="adm-signups" className="adm-h2">
                Sign-ups, last 30 days
              </h2>
              <Bars days={s.signupsByDay} />
            </section>

            <section className="adm-panel" aria-labelledby="adm-people">
              <h2 id="adm-people" className="adm-h2">
                People
              </h2>
              <Rows
                rows={[
                  ["Email confirmed", s.users?.confirmed ?? "—"],
                  ["Signed in, last 7 days", s.users?.activeLast7 ?? "—"],
                  ["New, last 30 days", s.users?.last30 ?? "—"],
                  ...Object.entries(s.roles).map(([r, n]) => [`Role: ${r}`, n] as [string, number]),
                ]}
              />
            </section>

            <section className="adm-panel" aria-labelledby="adm-companies">
              <h2 id="adm-companies" className="adm-h2">
                Companies and store
              </h2>
              <Rows
                rows={[
                  ["Companies", s.companies.total],
                  ["KYC verified", s.companies.kycVerified],
                  ["With a store listing", s.companies.withListings],
                  ["Live listings", s.companies.activeListings],
                  ["Certificates issued", s.certificates],
                ]}
              />
            </section>

            <section className="adm-panel" aria-labelledby="adm-orders">
              <h2 id="adm-orders" className="adm-h2">
                Orders
              </h2>
              <Rows
                rows={[
                  ["Open enquiries", s.orders.enquiry],
                  ["Booked", s.orders.booked],
                  ["In progress", s.orders.inProgress],
                  ["Completed", s.orders.completed],
                  ["Paid", s.orders.paid],
                  ["Bids placed", s.bids],
                ]}
              />
            </section>

            <section className="adm-panel" aria-labelledby="adm-money">
              <h2 id="adm-money" className="adm-h2">
                Money
              </h2>
              <Rows
                rows={[
                  ["Customer price, booked", usd(s.money.customerTotal)],
                  ["Company price, booked", usd(s.money.companyTotal)],
                  ["Qualty margin", usd(margin(s))],
                  ["Invoiced", usd(s.money.invoiced)],
                  ["Collected", usd(s.money.collected)],
                ]}
              />
            </section>

            <section className="adm-panel" aria-labelledby="adm-services">
              <h2 id="adm-services" className="adm-h2">
                Orders by service
              </h2>
              {s.byService.length === 0 ? (
                <p className="adm-muted">No orders yet.</p>
              ) : (
                <Rows rows={s.byService.map((b) => [b.service, b.count] as [string, number])} />
              )}
            </section>

            <section className="adm-panel adm-wide" aria-labelledby="adm-recent">
              <h2 id="adm-recent" className="adm-h2">
                Latest sign-ups
              </h2>
              {s.recentSignups.length === 0 ? (
                <p className="adm-muted">
                  {s.users ? "No one has signed up yet." : "Sign-ups are listed with Supabase only."}
                </p>
              ) : (
                <div className="adm-table-wrap">
                  <table className="adm-table">
                    <thead>
                      <tr>
                        <th scope="col">Name</th>
                        <th scope="col">Email</th>
                        <th scope="col">Role</th>
                        <th scope="col">Company</th>
                        <th scope="col">Joined</th>
                        <th scope="col">Last sign-in</th>
                      </tr>
                    </thead>
                    <tbody>
                      {s.recentSignups.map((u) => (
                        <tr key={u.email + u.createdAt}>
                          <td>{u.name || "—"}</td>
                          <td className="font-mono">
                            {u.email}
                            {!u.confirmed && <span className="adm-tag">unconfirmed</span>}
                          </td>
                          <td>{u.role}</td>
                          <td>{u.company ?? "—"}</td>
                          <td>{when(u.createdAt)}</td>
                          <td>{when(u.lastSignIn)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="adm">
      <Link href="/dashboard" className="adm-back">
        <ArrowLeft size={16} aria-hidden="true" /> Dashboard
      </Link>
      {children}
      <style jsx global>{`
        .adm { max-width: 1200px; margin: 0 auto; padding: 32px clamp(16px, 4vw, 40px) 64px; color: var(--text-main); }
        .adm-back { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; color: var(--text-secondary); text-decoration: none; margin-bottom: 16px; }
        .adm-back:hover { color: var(--text-main); }
        .adm-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; flex-wrap: wrap; margin-bottom: 24px; }
        .adm-title { font-size: 28px; font-weight: 600; margin: 0 0 4px; }
        .adm-h2 { font-size: 15px; font-weight: 600; margin: 0 0 12px; }
        .adm-muted { color: var(--text-secondary); font-size: 14px; margin: 0; }
        .adm-error { color: var(--danger); font-size: 14px; margin: 0 0 16px; }
        .adm-refresh { display: inline-flex; align-items: center; gap: 8px; padding: 8px 16px; font-size: 13px; }
        .adm-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin: 0 0 24px; }
        .adm-stat { background: var(--bg-card); border: 1px solid var(--border-main); border-radius: 12px; padding: 16px 20px; }
        .adm-stat dt { font-size: 13px; color: var(--text-secondary); }
        .adm-stat dd { margin: 4px 0 0; }
        .adm-stat-value { display: block; font-size: 28px; font-weight: 600; font-variant-numeric: tabular-nums; }
        .adm-stat-note { display: block; font-size: 12px; color: var(--text-muted); margin-top: 4px; }
        .adm-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; }
        .adm-panel { background: var(--bg-card); border: 1px solid var(--border-main); border-radius: 12px; padding: 20px; min-width: 0; }
        .adm-wide { grid-column: 1 / -1; }
        .adm-rows { list-style: none; margin: 0; padding: 0; }
        .adm-rows li { display: flex; justify-content: space-between; gap: 12px; padding: 8px 0; font-size: 14px; border-top: 1px solid var(--border-main); }
        .adm-rows li:first-child { border-top: 0; }
        .adm-rows span:first-child { color: var(--text-secondary); }
        .adm-rows span:last-child { font-variant-numeric: tabular-nums; font-weight: 500; }
        .adm-bars { display: flex; align-items: flex-end; gap: 4px; height: 120px; }
        .adm-bar { flex: 1; min-width: 0; background: var(--accent-primary); border-radius: 4px 4px 0 0; }
        .adm-bar[data-zero] { background: var(--border-main); }
        .adm-bars-axis { display: flex; justify-content: space-between; font-size: 12px; color: var(--text-muted); margin-top: 8px; }
        .adm-table-wrap { overflow-x: auto; }
        .adm-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .adm-table th { text-align: left; font-weight: 500; color: var(--text-secondary); padding: 8px 12px 8px 0; white-space: nowrap; }
        .adm-table td { padding: 8px 12px 8px 0; border-top: 1px solid var(--border-main); white-space: nowrap; }
        .adm-tag { margin-left: 8px; font-family: inherit; font-size: 12px; color: var(--warning-text); }
      `}</style>
    </main>
  );
}

function Stat({ label, value, note }: { label: string; value: number | string; note: string }) {
  return (
    <div className="adm-stat">
      <dt>{label}</dt>
      <dd>
        <span className="adm-stat-value">{value}</span>
        <span className="adm-stat-note">{note}</span>
      </dd>
    </div>
  );
}

function Rows({ rows }: { rows: [string, number | string][] }) {
  return (
    <ul className="adm-rows">
      {rows.map(([k, v]) => (
        <li key={k}>
          <span>{k}</span>
          <span>{v}</span>
        </li>
      ))}
    </ul>
  );
}

function Bars({ days }: { days: { day: string; count: number }[] }) {
  const max = Math.max(1, ...days.map((d) => d.count));
  const total = days.reduce((s, d) => s + d.count, 0);
  return (
    <figure style={{ margin: 0 }}>
      <div className="adm-bars" role="img" aria-label={`${total} sign-ups in the last 30 days`}>
        {days.map((d) => (
          <div
            key={d.day}
            className="adm-bar"
            data-zero={d.count === 0 ? "" : undefined}
            title={`${d.day}: ${d.count}`}
            style={{ height: d.count === 0 ? 2 : `${(d.count / max) * 100}%` }}
          />
        ))}
      </div>
      <div className="adm-bars-axis">
        <span>{days[0]?.day}</span>
        <span>{total} total</span>
        <span>{days[days.length - 1]?.day}</span>
      </div>
    </figure>
  );
}
