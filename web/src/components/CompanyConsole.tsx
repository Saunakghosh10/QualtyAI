"use client";

import Link from "next/link";
import React, { createContext, useContext, useState } from "react";
import {
  Buildings,
  ClipboardText,
  Storefront,
  Receipt,
  Certificate as CertIcon,
  SealCheck,
  IdentificationCard,
  UsersThree,
  MagnifyingGlass,
  ShieldCheck,
  ArrowSquareOut,
  Plus,
} from "@phosphor-icons/react";
import {
  useDB,
  useSession,
  isRemote,
  orderRef,
  SERVICES,
  createCompany,
  updateCompany,
  kycStatus,
  KYC_REQUIRED,
  addKycDoc,
  reviewKycDoc,
  TEAM_ROLE_LABEL,
  ROLE_ACCESS,
  canAccess,
  inviteMember,
  setMemberRole,
  activateMember,
  removeMember,
  saveListing,
  deleteListing,
  listingNet,
  listingProblems,
  bidNet,
  paymentStatus,
  awaitingPayment,
  raiseInvoice,
  recordPayment,
  invoiceTotal,
  invoicePaid,
  CERT_TYPES,
  issueCertificate,
  revokeCertificate,
  checkCertificate,
  addCompliance,
  removeCompliance,
  complianceState,
  uncoveredCertTypes,
  setCustomerPrice,
  adminCreateOrder,
  assignCompany,
  customerPrice,
  orderCustomerPrice,
  orderCompanyBudget,
  STANDARD_RATES,
  ALL_INDIA,
  MARGIN_PCT,
  type Area,
  type Company,
  type KycDocType,
  type TeamRole,
  type Order,
  type ServiceListing,
  type Payment,
  type PaymentStatus,
  type CertType,
  type CertCheck,
} from "@/lib/store";
import { run } from "@/lib/notify";
import { useViewer } from "@/lib/viewer";

/** Awaits a save that returns problems; a thrown error becomes one problem. */
const problemsOf = async (p: Promise<string[]>) => (await run(p)) ?? ["Couldn't save. Check your connection and try again."];

const field: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: "8px",
  border: "1px solid var(--border-main)",
  backgroundColor: "var(--bg-card)",
  color: "var(--text-main)",
  fontSize: "13px",
  minWidth: 0,
};
const label: React.CSSProperties = { display: "flex", flexDirection: "column", gap: "3px", fontSize: "11.5px", color: "var(--text-muted)" };
const grid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "10px" };
const row: React.CSSProperties = {
  padding: "12px 14px",
  borderRadius: "10px",
  border: "1px solid var(--border-main)",
  backgroundColor: "var(--bg-card)",
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "10px",
};
const linkBtn: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: 600,
  color: "var(--accent-primary)",
  cursor: "pointer",
  background: "none",
  border: "none",
  padding: 0,
  textDecoration: "underline",
};
/** Orders assigned to this company: by id on the backend, by name in the demo. */
export const isOurs = (o: Order, c: Company) => (o.companyId !== undefined ? o.companyId === c.id : o.inspectionCompany === c.name);
export const usd = (n: number) => `$${n.toLocaleString()}`;
const visuallyHidden: React.CSSProperties = { position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap" };
const money: React.CSSProperties = { fontVariantNumeric: "tabular-nums" };
const today = () => new Date().toISOString().slice(0, 10);

export type Tone = "good" | "warn" | "bad" | "muted";
export function Pill({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  const c = {
    good: ["var(--success-bg)", "var(--success-text)", "var(--success-border)"],
    warn: ["var(--warning-bg)", "var(--warning-text)", "var(--warning-border)"],
    bad: ["var(--danger-bg)", "var(--danger-text)", "var(--danger-border)"],
    muted: ["var(--bg-subtle)", "var(--text-secondary)", "var(--border-main)"],
  }[tone];
  return (
    <span style={{ fontSize: "11.5px", fontWeight: 600, padding: "2px 8px", borderRadius: "999px", backgroundColor: c[0], color: c[1], border: `1px solid ${c[2]}`, whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
}

function Problems({ list }: { list: string[] }) {
  if (!list.length) return null;
  return (
    <ul role="alert" style={{ margin: "8px 0 0", paddingLeft: "18px", fontSize: "12.5px", color: "var(--danger-text)" }}>
      {list.map((p) => (
        <li key={p}>{p}</li>
      ))}
    </ul>
  );
}

function Panel({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <div>
        <h3 className="font-heading" style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-main)" }}>{title}</h3>
        {hint && <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "4px", maxWidth: "640px" }}>{hint}</p>}
      </div>
      {children}
    </div>
  );
}

const Empty = ({ children }: { children: React.ReactNode }) => (
  <p style={{ fontSize: "13px", color: "var(--text-muted)", padding: "14px", border: "1px dashed var(--border-main)", borderRadius: "10px" }}>{children}</p>
);

/** A console tab: a team area, or the Qualty team's own view (admins and the demo only). */
export type ConsoleTab = Area | "qualty";

const TABS: { area: Area; label: string; icon: React.ReactNode }[] = [
  { area: "enquiries", label: "Enquiries", icon: <MagnifyingGlass size={16} /> },
  { area: "orders", label: "Orders", icon: <ClipboardText size={16} /> },
  { area: "store", label: "Service store", icon: <Storefront size={16} /> },
  { area: "payments", label: "Payouts", icon: <Receipt size={16} /> },
  { area: "certificates", label: "Certificates", icon: <CertIcon size={16} /> },
  { area: "compliance", label: "Accreditations", icon: <SealCheck size={16} /> },
  { area: "kyc", label: "KYC", icon: <IdentificationCard size={16} /> },
  { area: "team", label: "Team", icon: <UsersThree size={16} /> },
];
const QUALTY_TAB = { area: "qualty" as const, label: "Qualty team", icon: <ShieldCheck size={16} /> };

/** On /dashboard chats open in their own tab at /rooms; on the homepage they open in the order rooms below. */
const RoomsInNewTab = createContext(false);

const openChatroom = (id: string) => {
  window.dispatchEvent(new CustomEvent("qualty:open-order", { detail: id }));
  document.getElementById("orders")?.scrollIntoView({ behavior: "smooth" });
};

function ChatAction({ orderId, label, roomLabel }: { orderId: string; label: string; roomLabel?: string }) {
  const newTab = useContext(RoomsInNewTab);
  if (newTab)
    return (
      <a href={`/rooms?order=${encodeURIComponent(orderId)}`} target="_blank" rel="noopener noreferrer" style={{ ...linkBtn, display: "inline-flex", alignItems: "center", gap: "4px" }}>
        {roomLabel ?? label}
        <ArrowSquareOut size={13} aria-hidden="true" />
        <span style={visuallyHidden}> (opens in a new tab)</span>
      </a>
    );
  return (
    <button style={linkBtn} onClick={() => openChatroom(orderId)}>
      {label}
    </button>
  );
}

/** The companies the signed-in person works for (admins see all; the demo has one) and the one picked. */
export function useMyCompanies() {
  const db = useDB();
  const { session, ready } = useSession();
  const isAdmin = session?.appRole === "admin";
  const mine = isRemote
    ? db.companies.filter((c) => isAdmin || db.team.some((m) => m.companyId === c.id && m.userId === session?.userId && m.status === "active"))
    : db.companies.slice(0, 1);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const company = mine.find((c) => c.id === companyId) ?? mine[0] ?? null;
  return { mine, company, setCompanyId, session, ready, isAdmin };
}

export const CompanySwitcher = ({ mine, company, onChange }: { mine: Company[]; company: Company; onChange: (id: string) => void }) =>
  mine.length > 1 ? (
    <select aria-label="Company" value={company.id} onChange={(e) => onChange(e.target.value)} style={{ ...field, maxWidth: "220px" }}>
      {mine.map((c) => (
        <option key={c.id} value={c.id}>{c.name}</option>
      ))}
    </select>
  ) : null;

/**
 * The tabbed console for one company. `identity` shows the company name and KYC in its header
 * (the homepage); the dashboard draws its own header and passes `identity={false}`.
 */
export function ConsoleCard({
  company,
  mine = [company],
  onCompanyChange,
  identity = true,
  roomsInNewTab = false,
}: {
  company: Company;
  mine?: Company[];
  onCompanyChange?: (id: string) => void;
  identity?: boolean;
  roomsInNewTab?: boolean;
}) {
  const db = useDB();
  const { session } = useSession();
  const kind = useViewer().kind;
  const isAdmin = session?.appRole === "admin";
  const team = db.team.filter((m) => m.companyId === company.id);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const me = isRemote ? team.find((m) => m.userId === session?.userId && m.status === "active") : null;
  const viewer = isRemote
    ? (me ?? (isAdmin ? ({ id: "admin", role: "owner", name: "Qualty admin" } as const) : null))
    : (team.find((m) => m.id === viewerId) ?? team.find((m) => m.role === "owner") ?? null);
  const role: TeamRole = viewer?.role ?? "owner";
  const tabs: { area: ConsoleTab; label: string; icon: React.ReactNode }[] = TABS.filter((t) => canAccess(role, t.area));
  if (kind === "admin" || kind === "demo") tabs.push(QUALTY_TAB);
  const [tab, setTab] = useState<ConsoleTab>("enquiries");
  const current = tabs.some((t) => t.area === tab) ? tab : tabs[0].area;

  const roleControl = isRemote ? (
    <span>
      {identity ? "You: " : "Your role: "}
      {me ? (identity ? `${me.name} (${TEAM_ROLE_LABEL[me.role]})` : TEAM_ROLE_LABEL[me.role]) : isAdmin ? "Qualty admin" : "not on this team"}
    </span>
  ) : (
    <label style={{ ...label, flexDirection: "row", alignItems: "center", gap: "6px", fontSize: "12px" }}>
      Signed in as
      <select value={viewer?.id ?? ""} onChange={(e) => setViewerId(e.target.value)} style={field}>
        {team
          .filter((m) => m.status === "active")
          .map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} ({TEAM_ROLE_LABEL[m.role]})
            </option>
          ))}
      </select>
    </label>
  );

  return (
    <RoomsInNewTab.Provider value={roomsInNewTab}>
      <div className="card-shell" style={{ padding: 0, overflow: "hidden" }}>
        <header style={{ padding: identity ? "16px 20px" : "10px 16px", borderBottom: "1px solid var(--border-main)", display: "flex", flexWrap: "wrap", justifyContent: identity ? "space-between" : "flex-end", alignItems: "center", gap: "12px" }}>
          {identity && (
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Buildings size={22} color="var(--accent-primary)" />
              <div>
                <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-main)" }}>{company.name}</div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                  KYC: <KycPill company={company} />
                </div>
              </div>
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", fontSize: "12.5px", color: "var(--text-secondary)" }}>
            {onCompanyChange && <CompanySwitcher mine={mine} company={company} onChange={onCompanyChange} />}
            {roleControl}
          </div>
        </header>
        <div role="tablist" aria-label="Company console" style={{ display: "flex", gap: "4px", padding: "8px 12px", overflowX: "auto", borderBottom: "1px solid var(--border-main)", backgroundColor: "var(--bg-subtle)" }}>
          {tabs.map((t) => (
            <button
              key={t.area}
              role="tab"
              aria-selected={current === t.area}
              onClick={() => setTab(t.area)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 12px",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: 600,
                whiteSpace: "nowrap",
                cursor: "pointer",
                border: `1px solid ${current === t.area ? "var(--accent-border)" : "transparent"}`,
                backgroundColor: current === t.area ? "var(--accent-light)" : "transparent",
                color: current === t.area ? "var(--accent-text)" : "var(--text-secondary)",
              }}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
        <div role="tabpanel" style={{ padding: "clamp(14px, 3vw, 20px)" }}>
          {current === "orders" && <OrdersTab company={company} />}
          {current === "enquiries" && <EnquiriesTab company={company} />}
          {current === "store" && <StoreTab company={company} />}
          {current === "payments" && <PayoutsTab company={company} />}
          {current === "certificates" && <CertificatesTab company={company} />}
          {current === "compliance" && <ComplianceTab company={company} />}
          {current === "kyc" && <KycTab company={company} />}
          {current === "team" && <TeamTab company={company} />}
          {current === "qualty" && <QualtyTeamTab />}
        </div>
      </div>
    </RoomsInNewTab.Provider>
  );
}

export default function CompanyConsole() {
  const { mine, company, setCompanyId, session, ready } = useMyCompanies();

  return (
    <section id="company" style={{ padding: "clamp(40px, 5vw, 64px) 20px", maxWidth: "1280px", margin: "0 auto" }}>
      <div style={{ maxWidth: "720px", marginBottom: "28px" }}>
        <h2 className="font-heading" style={{ fontSize: "clamp(26px, 3.4vw, 36px)", fontWeight: 700, color: "var(--text-main)", textWrap: "balance" }}>
          Run your inspection company here
        </h2>
        <p style={{ fontSize: "15px", color: "var(--text-secondary)", lineHeight: 1.6, marginTop: "10px", textWrap: "pretty" }}>
          List your surveyors so customers can book you directly, bid on enquiries, track payouts, issue certificates customers can check, and
          keep your accreditations and KYC up to date. Your team sees only what their role needs.
        </p>
      </div>

      {isRemote && !session ? (
        <div className="card-shell" style={{ padding: "24px", maxWidth: "760px", display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center", justifyContent: "space-between" }}>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
            {ready ? "Sign in to set up your company or open your team's console." : "Checking your sign-in..."}
          </p>
          {ready && (
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button
                className="btn-primary"
                style={{ padding: "9px 18px", fontSize: "13.5px" }}
                onClick={() => window.dispatchEvent(new CustomEvent("qualty:open-auth", { detail: { mode: "signup", as: "company" } }))}
              >
                Create a company account
              </button>
              <button
                className="btn-secondary"
                style={{ padding: "9px 18px", fontSize: "13.5px" }}
                onClick={() => window.dispatchEvent(new CustomEvent("qualty:open-auth", { detail: { mode: "signin" } }))}
              >
                Sign in
              </button>
            </div>
          )}
        </div>
      ) : !company ? (
        <CompanySetup />
      ) : (
        <ConsoleCard company={company} mine={mine} onCompanyChange={isRemote ? setCompanyId : undefined} />
      )}
    </section>
  );
}

export function KycPill({ company }: { company: Company }) {
  const s = kycStatus(company);
  const map: Record<typeof s, [Tone, string]> = {
    "not-started": ["muted", "Not started"],
    "in-progress": ["warn", "Documents missing"],
    submitted: ["warn", "Under review"],
    verified: ["good", "Verified"],
    rejected: ["bad", "Document rejected"],
  };
  return <Pill tone={map[s][0]}>{map[s][1]}</Pill>;
}

// ---------- Setup ----------

export function CompanySetup({
  title = "Set up your company",
  hint = "You'll be the owner. You can add KYC documents and invite your team next.",
  footer,
}: {
  title?: string;
  hint?: string;
  footer?: React.ReactNode;
}) {
  const { session } = useSession();
  const [f, setF] = useState({ name: "", owner: session?.name ?? "", email: session?.email ?? "", phone: "", address: "", gstin: "", pan: "" });
  const [problems, setProblems] = useState<string[]>([]);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const p: string[] = [];
    if (!f.name.trim()) p.push("Add the company name.");
    if (!f.owner.trim()) p.push("Add your name.");
    if (!f.email.trim() && !f.phone.trim()) p.push("Add an email or phone so customers can reach you.");
    setProblems(p);
    if (p.length) return;
    await run(createCompany({ name: f.name.trim(), email: f.email.trim(), phone: f.phone.trim(), address: f.address.trim(), gstin: f.gstin, pan: f.pan }, f.owner));
  };
  return (
    <form onSubmit={submit} className="card-shell" style={{ padding: "24px", maxWidth: "760px" }}>
      <Panel title={title} hint={hint}>
        <div style={grid}>
          <label style={label}>Company name<input value={f.name} onChange={set("name")} style={field} /></label>
          <label style={label}>Your name<input value={f.owner} onChange={set("owner")} style={field} /></label>
          <label style={label}>Email<input type="email" value={f.email} onChange={set("email")} style={field} /></label>
          <label style={label}>Phone<input type="tel" value={f.phone} onChange={set("phone")} style={field} /></label>
          <label style={label}>Address<input value={f.address} onChange={set("address")} style={field} /></label>
          <label style={label}>GSTIN (optional)<input value={f.gstin} onChange={set("gstin")} style={field} /></label>
          <label style={label}>PAN (optional)<input value={f.pan} onChange={set("pan")} style={field} /></label>
        </div>
        <Problems list={problems} />
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px 16px" }}>
          <button type="submit" className="btn-primary" style={{ padding: "10px 20px", fontSize: "13.5px" }}>Create company</button>
          {footer}
        </div>
      </Panel>
    </form>
  );
}

// ---------- Orders and enquiries ----------

const ORDER_STATUS: Record<Order["status"], [Tone, string]> = {
  enquiry: ["muted", "Taking bids"],
  booked: ["warn", "Booked"],
  "in-progress": ["warn", "In progress"],
  completed: ["good", "Completed"],
};

function OrdersTab({ company }: { company: Company }) {
  const db = useDB();
  const orders = db.orders.filter((o) => isOurs(o, company));
  const [filter, setFilter] = useState<Order["status"] | "all">("all");
  const shown = orders.filter((o) => filter === "all" || o.status === filter);
  return (
    <Panel title="Order history" hint="Every inspection booked with your company. Open the chatroom to post readings, dispatch and photos.">
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
        {(["all", "booked", "in-progress", "completed"] as const).map((s) => (
          <button key={s} onClick={() => setFilter(s)} aria-pressed={filter === s} style={{ ...field, cursor: "pointer", fontWeight: 600, backgroundColor: filter === s ? "var(--accent-light)" : "var(--bg-card)", color: filter === s ? "var(--accent-text)" : "var(--text-secondary)" }}>
            {s === "all" ? `All (${orders.length})` : ORDER_STATUS[s][1]}
          </button>
        ))}
      </div>
      {shown.length === 0 ? (
        <Empty>No orders yet. Customers who book from your service store or accept your bid show up here.</Empty>
      ) : (
        shown.map((o) => (
          <div key={o.id} style={row}>
            <div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                <span className="font-mono" style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-main)" }}>{orderRef(o)}</span>
                <Pill tone={ORDER_STATUS[o.status][0]}>{ORDER_STATUS[o.status][1]}</Pill>
                {awaitingPayment(o) && <Pill tone="warn">Waiting for payment</Pill>}
              </div>
              <div style={{ fontSize: "12.5px", color: "var(--text-secondary)", marginTop: "2px" }}>
                {o.service} · {o.commodity} · {o.location} · {o.inspectionDate}
                {o.priceUSD ? <span style={money}> · your payout {usd(o.priceUSD)}</span> : ""}
              </div>
            </div>
            <ChatAction orderId={o.id} label={awaitingPayment(o) ? "Open order" : "Open chatroom"} roomLabel="Open chat" />
          </div>
        ))
      )}
    </Panel>
  );
}

function EnquiriesTab({ company }: { company: Company }) {
  const db = useDB();
  const open = db.orders.filter((o) => o.status === "enquiry");
  const t = today();
  return (
    <Panel title="Available jobs" hint="Enquiries from customers. You see the job, the port, the date and the budget; the buyer and seller are shared only if your bid is accepted.">
      {open.length === 0 ? (
        <Empty>No open enquiries right now.</Empty>
      ) : (
        open.map((o) => {
          const mine = o.bids.find((b) => (b.companyId ? b.companyId === company.id : b.company === company.name) && b.status === "open");
          const lowest = Math.min(...o.bids.filter((b) => b.status === "open").map(bidNet));
          const last = mine?.rounds?.[mine.rounds.length - 1];
          return (
            <div key={o.id} style={row}>
              <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                <span className="font-mono" style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-main)" }}>{orderRef(o)}</span>
                <span style={{ fontSize: "12.5px", color: "var(--text-secondary)" }}>
                  {o.service} · {o.commodity} · {o.volumeTons.toLocaleString()} t · {o.location} · {o.inspectionDate}
                </span>
                {orderCompanyBudget(o) !== undefined && (
                  <span style={{ fontSize: "12px", color: "var(--text-secondary)", ...money }}>Budget {usd(orderCompanyBudget(o)!)}</span>
                )}
                <span style={{ fontSize: "12px", color: "var(--text-muted)", ...money }}>
                  {o.bids.length} bid(s){Number.isFinite(lowest) ? `, lowest ${usd(lowest)}` : ""}
                  {mine && `. Your bid: ${usd(bidNet(mine))}`}
                </span>
                {last?.by === "customer" && <Pill tone="warn">Customer countered at {usd(last.priceUSD)}</Pill>}
                {mine?.followUpOn && (
                  <Pill tone={mine.followUpOn <= t ? "bad" : "muted"}>
                    {mine.followUpOn <= t ? "Follow up today" : `Follow up ${mine.followUpOn}`}
                  </Pill>
                )}
              </div>
              <ChatAction orderId={o.id} label={mine ? "Negotiate" : "Place a bid"} />
            </div>
          );
        })
      )}
    </Panel>
  );
}

// ---------- Service store ----------

const blankListing = () => ({
  service: SERVICES[0] as string,
  commodities: "",
  location: "",
  priceUSD: "",
  discountPct: "",
  turnaroundDays: "2",
  surveyors: "1",
  availableFrom: today(),
  availableTo: "",
  active: true,
});

function StoreTab({ company }: { company: Company }) {
  const db = useDB();
  const listings = db.listings.filter((l) => l.companyId === company.id);
  const [f, setF] = useState(blankListing());
  const [editId, setEditId] = useState<string | null>(null);
  const [problems, setProblems] = useState<string[]>([]);
  // Standard certificate services sold across India have one fixed rate: the price is locked to it.
  const rate = STANDARD_RATES[f.service];
  const allIndia = rate != null && f.location.trim() === ALL_INDIA;
  const toInput = () => ({
    companyId: company.id,
    service: f.service,
    commodities: f.commodities.split(",").map((c) => c.trim()).filter(Boolean),
    location: f.location,
    priceUSD: allIndia ? rate : Number(f.priceUSD),
    discountPct: allIndia ? 0 : Number(f.discountPct) || 0,
    turnaroundDays: Number(f.turnaroundDays),
    surveyors: Number(f.surveyors),
    availableFrom: f.availableFrom,
    availableTo: f.availableTo,
    active: f.active,
  });
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const p = await problemsOf(saveListing({ ...toInput(), id: editId ?? undefined }));
    setProblems(p);
    if (!p.length) {
      setF(blankListing());
      setEditId(null);
    }
  };
  const edit = (l: ServiceListing) => {
    setEditId(l.id);
    setProblems([]);
    setF({
      service: l.service,
      commodities: l.commodities.join(", "),
      location: l.location,
      priceUSD: String(l.priceUSD),
      discountPct: l.discountPct ? String(l.discountPct) : "",
      turnaroundDays: String(l.turnaroundDays),
      surveyors: String(l.surveyors),
      availableFrom: l.availableFrom,
      availableTo: l.availableTo,
      active: l.active,
    });
  };
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const draft = toInput();
  const preview = listingProblems(draft).length === 0 ? listingNet(draft) : null;

  return (
    <Panel title="Your service store" hint="Customers booking a quick inspection see these listings when the service, port, date, commodity and budget match. Cheapest shows first.">
      <form onSubmit={submit} style={{ ...row, display: "block" }}>
        <div style={grid}>
          <label style={label}>Service
            <select value={f.service} onChange={set("service")} style={field}>
              {SERVICES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
          <label style={label}>Port or city<input value={f.location} onChange={set("location")} placeholder={rate != null ? ALL_INDIA : "Mundra"} list={rate != null ? "qualty-standard-locations" : undefined} style={field} /></label>
          {rate != null && (
            <datalist id="qualty-standard-locations">
              <option value={ALL_INDIA} />
            </datalist>
          )}
          <label style={label}>Commodities (comma separated, blank = any)<input value={f.commodities} onChange={set("commodities")} placeholder="Rice, Wheat" style={field} /></label>
          <label style={label}>Price (USD)
            <input
              type="number"
              min={1}
              value={allIndia ? String(rate) : f.priceUSD}
              onChange={set("priceUSD")}
              readOnly={allIndia}
              aria-describedby={allIndia ? "standard-rate-note" : undefined}
              style={{ ...field, ...money, ...(allIndia ? { backgroundColor: "var(--bg-subtle)", color: "var(--text-secondary)" } : {}) }}
            />
          </label>
          <label style={label}>Discount %
            <input type="number" min={0} max={99} value={allIndia ? "" : f.discountPct} onChange={set("discountPct")} placeholder="0" disabled={allIndia} style={{ ...field, ...(allIndia ? { backgroundColor: "var(--bg-subtle)" } : {}) }} />
          </label>
          <label style={label}>Turnaround (days)<input type="number" min={1} value={f.turnaroundDays} onChange={set("turnaroundDays")} style={field} /></label>
          <label style={label}>Surveyors available<input type="number" min={1} value={f.surveyors} onChange={set("surveyors")} style={field} /></label>
          <label style={label}>Available from<input type="date" value={f.availableFrom} onChange={set("availableFrom")} style={field} /></label>
          <label style={label}>Available until<input type="date" value={f.availableTo} onChange={set("availableTo")} style={field} /></label>
        </div>
        {rate != null && (
          <p id="standard-rate-note" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px 10px", marginTop: "12px", fontSize: "12.5px", color: "var(--text-secondary)" }}>
            {allIndia ? (
              <>
                <Pill tone="good">Standard rate across India</Pill>
                <span style={money}>Every company sells {f.service} at {usd(rate)} when the location is {ALL_INDIA}.</span>
              </>
            ) : (
              <>
                <span style={money}>{f.service} has a standard rate of {usd(rate)} across India.</span>
                <button type="button" style={linkBtn} onClick={() => setF({ ...f, location: ALL_INDIA, priceUSD: String(rate), discountPct: "" })}>
                  Offer it in {ALL_INDIA}
                </button>
              </>
            )}
          </p>
        )}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "12px", marginTop: "12px" }}>
          <label style={{ ...label, flexDirection: "row", alignItems: "center", gap: "6px", fontSize: "12.5px" }}>
            <input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} /> Show to customers
          </label>
          <button type="submit" className="btn-primary" style={{ padding: "8px 16px", fontSize: "13px" }}>{editId ? "Save changes" : "Add listing"}</button>
          {editId && <button type="button" style={linkBtn} onClick={() => { setEditId(null); setF(blankListing()); setProblems([]); }}>Cancel</button>}
          {preview !== null && (
            <span style={{ fontSize: "12.5px", color: "var(--text-secondary)", ...money }}>
              You get {usd(preview)}. Customers see {usd(customerPrice(preview))} (includes Qualty&apos;s {MARGIN_PCT}%)
            </span>
          )}
        </div>
        <Problems list={problems} />
      </form>
      {listings.length === 0 ? (
        <Empty>No listings yet. Add one so customers can book you without waiting for bids.</Empty>
      ) : (
        listings.map((l) => (
          <div key={l.id} style={{ ...row, opacity: l.active ? 1 : 0.65 }}>
            <div>
              <div style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--text-main)" }}>
                {l.service} · {l.location} {!l.active && <Pill tone="muted">Hidden</Pill>}
                {l.location === ALL_INDIA && STANDARD_RATES[l.service] != null && <Pill tone="good">Standard rate</Pill>}
              </div>
              <div style={{ fontSize: "12.5px", color: "var(--text-secondary)", marginTop: "2px", ...money }}>
                {usd(listingNet(l))}
                {l.discountPct > 0 && ` (${l.discountPct}% off ${usd(l.priceUSD)})`}, customers see {usd(customerPrice(listingNet(l)))} · {l.turnaroundDays} day(s) · {l.surveyors} surveyor(s) ·{" "}
                {l.availableFrom} to {l.availableTo} · {l.commodities.length ? l.commodities.join(", ") : "Any commodity"}
              </div>
            </div>
            <div style={{ display: "flex", gap: "12px" }}>
              <button style={linkBtn} onClick={() => edit(l)}>Edit</button>
              <button style={{ ...linkBtn, color: "var(--danger-text)" }} onClick={() => void run(deleteListing(l.id))}>Delete</button>
            </div>
          </div>
        ))
      )}
    </Panel>
  );
}

// ---------- Payouts (companies) and the Qualty team's view ----------

const PAY_STATUS: Record<PaymentStatus, [Tone, string]> = {
  "not-invoiced": ["muted", "Not invoiced"],
  unpaid: ["warn", "Unpaid"],
  "part-paid": ["warn", "Part paid"],
  paid: ["good", "Paid"],
  overdue: ["bad", "Overdue"],
};
const METHODS: Payment["method"][] = ["Bank transfer", "UPI", "Card", "Letter of credit", "Other"];
const plusDays = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString().slice(0, 10);

function Figures({ items }: { items: [string, number, string][] }) {
  return (
    <div style={{ ...grid, gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
      {items.map(([k, v, c]) => (
        <div key={k} style={{ ...row, display: "block" }}>
          <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{k}</div>
          <div className="font-mono" style={{ fontSize: "20px", fontWeight: 700, color: c, ...money }}>{usd(v)}</div>
        </div>
      ))}
    </div>
  );
}

/** Booked orders and what the company is owed. Qualty collects from the customer, so no invoice figures here. */
function PayoutsTab({ company }: { company: Company }) {
  const db = useDB();
  const orders = db.orders.filter((o) => isOurs(o, company) && o.status !== "enquiry");
  const due = orders.filter((o) => o.paidAt).reduce((s, o) => s + (o.priceUSD ?? 0), 0);
  const waiting = orders.filter((o) => !o.paidAt).reduce((s, o) => s + (o.priceUSD ?? 0), 0);
  return (
    <Panel title="Payouts" hint="Qualty collects payment from the customer. Once the customer has paid, your payout for the job is due.">
      <Figures
        items={[
          ["Payout due", due, "var(--success-text)"],
          ["Waiting for customers", waiting, "var(--warning-text)"],
        ]}
      />
      {orders.length === 0 ? (
        <Empty>No booked orders yet. Payouts show here once a customer books you.</Empty>
      ) : (
        orders.map((o) => (
          <div key={o.id} style={row}>
            <div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                <span className="font-mono" style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-main)" }}>{orderRef(o)}</span>
                {o.paidAt ? <Pill tone="good">Customer paid, payout due</Pill> : <Pill tone="warn">Waiting for the customer&apos;s payment</Pill>}
              </div>
              <div style={{ fontSize: "12.5px", color: "var(--text-secondary)", marginTop: "2px" }}>
                {o.service} · {o.commodity} · {o.inspectionDate}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "11.5px", color: "var(--text-muted)" }}>Your payout</div>
              <div className="font-mono" style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-main)", ...money }}>{o.priceUSD != null ? usd(o.priceUSD) : "Not agreed"}</div>
            </div>
          </div>
        ))
      )}
    </Panel>
  );
}

/** Every booked order with both prices, Qualty's margin and the invoice. Only the Qualty team (and the demo) see this. */
/** The Qualty team's view on its own, for admins when no company exists yet. */
export function QualtyTeamPanel() {
  return (
    <div className="card-shell" style={{ padding: "clamp(14px, 3vw, 20px)" }}>
      <QualtyTeamTab />
    </div>
  );
}

function QualtyTeamTab() {
  const db = useDB();
  const orders = db.orders.filter((o) => o.status !== "enquiry");
  const sum = (f: (o: Order) => number | undefined) => orders.reduce((s, o) => s + (f(o) ?? 0), 0);
  const companyName = (o: Order) => db.companies.find((c) => c.id === o.companyId)?.name ?? o.inspectionCompany ?? "Unassigned";
  return (
    <Panel
      title="Qualty team"
      hint="All booked orders with the company's price and the customer's price. Set the customer price before payment starts, raise the invoice, and record payments as they arrive."
    >
      <Figures
        items={[
          ["Customer prices", sum(orderCustomerPrice), "var(--text-main)"],
          ["Company payouts", sum((o) => o.priceUSD), "var(--text-secondary)"],
          ["Qualty margin", sum((o) => (o.priceUSD == null ? 0 : (orderCustomerPrice(o) ?? 0) - o.priceUSD)), "var(--success-text)"],
          ["Collected", sum((o) => (o.invoice ? invoicePaid(o.invoice) : 0)), "var(--accent-text)"],
        ]}
      />
      <p style={{ margin: "0 0 12px", fontSize: "13px" }}>
        <Link href="/admin" style={{ color: "var(--accent-text)" }}>Platform stats: sign-ups, companies, orders and money</Link>
      </p>
      <NewOrder />
      {orders.length === 0 ? <Empty>No booked orders yet.</Empty> : orders.map((o) => <MarginRow key={o.id} order={o} company={companyName(o)} />)}
    </Panel>
  );
}

const BLANK_ORDER = {
  customerEmail: "", service: SERVICES[0] as string, commodity: "", location: "", inspectionDate: "",
  volumeTons: "", buyerName: "", sellerName: "", companyId: "", priceUSD: "",
};

/** The Qualty team creates an order for a customer: with a company and its price it is booked and invoiced, without them it opens for bids. */
function NewOrder() {
  const db = useDB();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(BLANK_ORDER);
  const [problems, setProblems] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof BLANK_ORDER) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const price = Number(f.priceUSD);
  if (!open)
    return (
      <div style={{ marginBottom: "12px" }}>
        <button className="btn-secondary" style={{ padding: "8px 14px", fontSize: "13px" }} onClick={() => { setF(BLANK_ORDER); setProblems([]); setOpen(true); }}>
          New order for a customer
        </button>
      </div>
    );
  return (
    <form
      aria-label="New order for a customer"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const p = await problemsOf(
          adminCreateOrder({
            customerEmail: f.customerEmail, service: f.service, commodity: f.commodity, location: f.location,
            inspectionDate: f.inspectionDate, volumeTons: Number(f.volumeTons), buyerName: f.buyerName, sellerName: f.sellerName,
            companyId: f.companyId || undefined, priceUSD: f.priceUSD === "" ? undefined : price,
          }),
        );
        setBusy(false);
        setProblems(p);
        if (!p.length) setOpen(false);
      }}
      style={{ ...row, display: "block", marginBottom: "12px" }}
    >
      <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-main)", margin: "0 0 4px" }}>New order for a customer</p>
      <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "0 0 12px" }}>
        The customer needs a Qualty account first. Pick a company and its price to book it now, or leave both empty to open it for bids.
      </p>
      <div style={grid}>
        <label style={label}>Customer email<input type="email" value={f.customerEmail} onChange={set("customerEmail")} style={field} /></label>
        <label style={label}>Service
          <select value={f.service} onChange={set("service")} style={field}>{SERVICES.map((s) => <option key={s}>{s}</option>)}</select>
        </label>
        <label style={label}>Commodity<input value={f.commodity} onChange={set("commodity")} style={field} /></label>
        <label style={label}>Port or city<input value={f.location} onChange={set("location")} style={field} /></label>
        <label style={label}>Inspection date<input type="date" value={f.inspectionDate} onChange={set("inspectionDate")} style={field} /></label>
        <label style={label}>Volume (tons)<input type="number" min={0} step="any" value={f.volumeTons} onChange={set("volumeTons")} style={{ ...field, ...money }} /></label>
        <label style={label}>Buyer<input value={f.buyerName} onChange={set("buyerName")} style={field} /></label>
        <label style={label}>Seller<input value={f.sellerName} onChange={set("sellerName")} style={field} /></label>
        <label style={label}>Inspection company
          <select value={f.companyId} onChange={set("companyId")} style={field}>
            <option value="">None, open for bids</option>
            {db.companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label style={label}>Company price (USD)<input type="number" min={0} step="any" value={f.priceUSD} onChange={set("priceUSD")} disabled={!f.companyId} style={{ ...field, ...money }} /></label>
      </div>
      {f.companyId && price > 0 && (
        <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "8px", ...money }}>Customer is invoiced {usd(customerPrice(price))}, including Qualty&apos;s 30%.</p>
      )}
      <div style={{ display: "flex", gap: "12px", alignItems: "center", marginTop: "12px" }}>
        <button type="submit" className="btn-primary" disabled={busy} style={{ padding: "8px 14px", fontSize: "13px" }}>{busy ? "Creating…" : "Create order"}</button>
        <button type="button" style={linkBtn} onClick={() => setOpen(false)}>Cancel</button>
      </div>
      <Problems list={problems} />
    </form>
  );
}

function Figure({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div style={{ minWidth: 0 }}>
      <dt style={{ fontSize: "11.5px", color: "var(--text-muted)" }}>{k}</dt>
      <dd style={{ margin: "2px 0 0", fontSize: "13.5px", fontWeight: 600, color: "var(--text-main)", overflowWrap: "anywhere", ...money }}>{children}</dd>
    </div>
  );
}

function MarginRow({ order, company }: { order: Order; company: string }) {
  const i = order.invoice;
  const cp = orderCustomerPrice(order);
  const left = i ? invoiceTotal(i) - invoicePaid(i) : 0;
  const status = paymentStatus(order);
  const priceFixed = !!i?.payments.length;
  const [open, setOpen] = useState<"price" | "invoice" | "payment" | "assign" | null>(null);
  const [cid, setCid] = useState("");
  const companies = useDB().companies;
  const [price, setPrice] = useState("");
  const [inv, setInv] = useState({ discount: "", due: plusDays(7) });
  const [pay, setPay] = useState({ amount: "", method: METHODS[0], reference: "", on: today() });
  const [problems, setProblems] = useState<string[]>([]);
  const start = (what: NonNullable<typeof open>) => {
    setProblems([]);
    if (what === "price") setPrice(String(cp ?? ""));
    if (what === "payment") setPay({ amount: String(left), method: METHODS[0], reference: order.paymentRef ?? "", on: today() });
    setOpen(what);
  };
  const done = (p: string[]) => {
    setProblems(p);
    if (!p.length) setOpen(null);
  };
  const cancel = (
    <button type="button" style={linkBtn} onClick={() => { setOpen(null); setProblems([]); }}>
      Cancel
    </button>
  );
  const formStyle: React.CSSProperties = { ...grid, marginTop: "12px", alignItems: "end" };

  return (
    <div style={{ ...row, display: "block" }}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: "8px", alignItems: "center" }}>
        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap", minWidth: 0 }}>
          <span className="font-mono" style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-main)" }}>{orderRef(order)}</span>
          <Pill tone={PAY_STATUS[status][0]}>{PAY_STATUS[status][1]}</Pill>
          <span style={{ fontSize: "12.5px", color: "var(--text-secondary)" }}>{company}</span>
        </div>
        {open === null && (
          <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
            {!order.companyId && !order.inspectionCompany && order.status !== "completed" && companies.length > 0 && <button style={linkBtn} onClick={() => { setCid(companies[0]?.id ?? ""); start("assign"); }}>Assign company</button>}
            {order.priceUSD != null && !priceFixed && <button style={linkBtn} onClick={() => start("price")}>Set customer price</button>}
            {!i && <button style={linkBtn} onClick={() => start("invoice")}>Raise invoice</button>}
            {i && status !== "paid" && <button style={linkBtn} onClick={() => start("payment")}>Record payment</button>}
          </div>
        )}
      </div>
      <dl style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "10px 16px", margin: "12px 0 0" }}>
        <Figure k="Company price">{order.priceUSD != null ? usd(order.priceUSD) : "Not agreed"}</Figure>
        <Figure k="Customer price">{cp != null ? usd(cp) : "Not set"}</Figure>
        <Figure k="Margin">
          {cp != null && order.priceUSD != null ? (
            <span style={{ color: "var(--success-text)" }}>
              {usd(cp - order.priceUSD)}
              {order.priceUSD > 0 && <span style={{ color: "var(--text-muted)", fontWeight: 500 }}> ({Math.round(((cp - order.priceUSD) / order.priceUSD) * 100)}%)</span>}
            </span>
          ) : (
            "Not set"
          )}
        </Figure>
        <Figure k="Invoice">{i ? `${usd(invoicePaid(i))} of ${usd(invoiceTotal(i))} paid` : "Not raised"}</Figure>
        <Figure k="Customer's payment ref">
          {order.paymentRef ? (
            <span className="font-mono">
              {order.paymentRef}
              {order.paymentSentOn && <span style={{ color: "var(--text-muted)", fontWeight: 500, fontFamily: "inherit" }}> sent {order.paymentSentOn}</span>}
            </span>
          ) : (
            <span style={{ color: "var(--text-muted)", fontWeight: 500 }}>None yet</span>
          )}
        </Figure>
      </dl>
      {i && (
        <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "8px" }}>
          {i.number}, issued {i.issuedOn}, due {i.dueOn}
          {priceFixed && ". Payment has started, so the price is fixed."}
        </p>
      )}

      {open === "assign" && (
        <form onSubmit={async (e) => { e.preventDefault(); done(await problemsOf(assignCompany(order.id, cid))); }} style={formStyle}>
          <label style={label}>
            Inspection company
            <select value={cid} onChange={(e) => setCid(e.target.value)} style={field}>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <button type="submit" className="btn-primary" disabled={!cid} style={{ padding: "8px 14px", fontSize: "13px" }}>Assign</button>
            {cancel}
          </div>
        </form>
      )}
      {open === "price" && order.priceUSD != null && (
        <form onSubmit={async (e) => { e.preventDefault(); done(await problemsOf(setCustomerPrice(order.id, Number(price)))); }} style={formStyle}>
          <label style={label}>
            Customer price (USD)
            <input type="number" step="any" value={price} onChange={(e) => setPrice(e.target.value)} style={{ ...field, ...money }} />
          </label>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", alignSelf: "center", ...money }}>
            At least {usd(order.priceUSD)}, the company&apos;s price.{i ? " The invoice changes to match." : ""}
          </p>
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <button type="submit" className="btn-primary" style={{ padding: "8px 14px", fontSize: "13px" }}>Save price</button>
            {cancel}
          </div>
        </form>
      )}
      {open === "invoice" && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            done(await problemsOf(raiseInvoice(order.id, { amountUSD: cp ?? 0, discountPct: Number(inv.discount) || 0, dueOn: inv.due })));
          }}
          style={formStyle}
        >
          <p style={{ fontSize: "12.5px", color: "var(--text-secondary)", alignSelf: "center", ...money }}>Invoice for the customer price, {cp != null ? usd(cp) : "not set"}</p>
          <label style={label}>Discount %<input type="number" min={0} max={99} value={inv.discount} onChange={(e) => setInv({ ...inv, discount: e.target.value })} placeholder="0" style={field} /></label>
          <label style={label}>Due on<input type="date" value={inv.due} onChange={(e) => setInv({ ...inv, due: e.target.value })} style={field} /></label>
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <button type="submit" className="btn-primary" style={{ padding: "8px 14px", fontSize: "13px" }}>Raise invoice</button>
            {cancel}
          </div>
        </form>
      )}
      {open === "payment" && i && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            done(await problemsOf(recordPayment(order.id, { amountUSD: Number(pay.amount), method: pay.method, reference: pay.reference.trim(), receivedOn: pay.on })));
          }}
          style={formStyle}
        >
          <label style={label}>Amount (USD)<input type="number" min={0} step="any" value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} style={{ ...field, ...money }} /></label>
          <label style={label}>Method
            <select value={pay.method} onChange={(e) => setPay({ ...pay, method: e.target.value as Payment["method"] })} style={field}>
              {METHODS.map((m) => <option key={m}>{m}</option>)}
            </select>
          </label>
          <label style={label}>Reference (UTR, LC no.)<input value={pay.reference} onChange={(e) => setPay({ ...pay, reference: e.target.value })} style={field} /></label>
          <label style={label}>Received on<input type="date" value={pay.on} onChange={(e) => setPay({ ...pay, on: e.target.value })} style={field} /></label>
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <button type="submit" className="btn-primary" style={{ padding: "8px 14px", fontSize: "13px" }}>Record payment</button>
            {cancel}
          </div>
        </form>
      )}
      {i && i.payments.length > 0 && (
        <ul style={{ margin: "8px 0 0", paddingLeft: "18px", fontSize: "12px", color: "var(--text-muted)", ...money }}>
          {i.payments.map((p) => (
            <li key={p.id}>
              {p.receivedOn}: {usd(p.amountUSD)} by {p.method}
              {p.reference && ` (${p.reference})`}
            </li>
          ))}
        </ul>
      )}
      <Problems list={problems} />
    </div>
  );
}

// ---------- Certificates ----------

function CertificatesTab({ company }: { company: Company }) {
  const db = useDB();
  const certs = db.certificates.filter((c) => c.companyId === company.id);
  const completed = db.orders.filter((o) => isOurs(o, company) && o.status === "completed");
  const uncovered = uncoveredCertTypes(db.compliance, company.id);
  const [f, setF] = useState({ type: CERT_TYPES[0] as CertType, orderId: "", issuedTo: "", validUntil: "" });
  const [file, setFile] = useState<File | null>(null);
  const [problems, setProblems] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const r = (await run(issueCertificate({ companyId: company.id, type: f.type, orderId: f.orderId || undefined, issuedTo: f.issuedTo, validUntil: f.validUntil || undefined, file }))) ?? { problems: ["Couldn't issue it. Try again."] };
    setBusy(false);
    setProblems(r.problems);
    if (!r.problems.length) {
      setF({ ...f, orderId: "", issuedTo: "", validUntil: "" });
      setFile(null);
    }
  };

  return (
    <Panel title="Certificates" hint="Issue CoC, CIC, Halal and other certificates. Each one gets a check code the holder can use below to confirm it's real and still valid.">
      <form onSubmit={submit} style={{ ...row, display: "block" }}>
        <div style={grid}>
          <label style={label}>Type
            <select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value as CertType })} style={field}>
              {CERT_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </label>
          <label style={label}>For order (optional)
            <select
              value={f.orderId}
              onChange={(e) => {
                const o = completed.find((x) => x.id === e.target.value);
                setF({ ...f, orderId: e.target.value, issuedTo: o ? o.seller.name || o.buyer.name : f.issuedTo });
              }}
              style={field}
            >
              <option value="">No order</option>
              {completed.map((o) => <option key={o.id} value={o.id}>{orderRef(o)} · {o.commodity}</option>)}
            </select>
          </label>
          <label style={label}>Issued to<input value={f.issuedTo} onChange={(e) => setF({ ...f, issuedTo: e.target.value })} style={field} /></label>
          <label style={label}>Valid until (optional)<input type="date" value={f.validUntil} onChange={(e) => setF({ ...f, validUntil: e.target.value })} style={field} /></label>
          <label style={label}>Signed PDF (optional)<input type="file" accept="application/pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} style={{ fontSize: "12.5px" }} /></label>
        </div>
        {uncovered.includes(f.type) && (
          <p style={{ fontSize: "12.5px", color: "var(--warning-text)", marginTop: "10px" }}>
            No valid accreditation in Accreditations covers {f.type}. Add one there before issuing, or the customer may reject it.
          </p>
        )}
        <div style={{ marginTop: "12px" }}>
          <button type="submit" disabled={busy} className="btn-primary" style={{ padding: "8px 16px", fontSize: "13px" }}>{busy ? "Issuing..." : "Issue certificate"}</button>
        </div>
        <Problems list={problems} />
      </form>
      {certs.length === 0 ? (
        <Empty>No certificates issued yet.</Empty>
      ) : (
        certs.map((c) => {
          const expired = c.validUntil && c.validUntil < today();
          return (
            <div key={c.id} style={{ ...row, opacity: c.status === "revoked" ? 0.7 : 1 }}>
              <div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                  <span className="font-mono" style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-main)" }}>{c.number}</span>
                  <Pill tone={c.status === "revoked" ? "bad" : expired ? "warn" : "good"}>{c.status === "revoked" ? "Revoked" : expired ? "Expired" : "Valid"}</Pill>
                </div>
                <div style={{ fontSize: "12.5px", color: "var(--text-secondary)", marginTop: "2px" }}>
                  {c.type} · {c.issuedTo} · issued {c.issuedOn}
                  {c.validUntil && `, valid until ${c.validUntil}`}
                  {c.orderId && ` · ${c.orderId}`}
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                  Check code <span className="font-mono" style={{ color: "var(--text-main)" }}>{c.verifyCode}</span>
                  {c.revokedReason && ` · Revoked: ${c.revokedReason}`}
                </div>
              </div>
              {c.status === "issued" &&
                (revoking === c.id ? (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!(await problemsOf(revokeCertificate(c.id, reason))).length) {
                        setRevoking(null);
                        setReason("");
                      }
                    }}
                    style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}
                  >
                    <input required autoFocus aria-label="Reason" placeholder="Why is it revoked?" value={reason} onChange={(e) => setReason(e.target.value)} style={field} />
                    <button type="submit" className="btn-primary" style={{ padding: "7px 12px", fontSize: "12.5px" }}>Revoke</button>
                    <button type="button" style={linkBtn} onClick={() => setRevoking(null)}>Cancel</button>
                  </form>
                ) : (
                  <button style={{ ...linkBtn, color: "var(--danger-text)" }} onClick={() => setRevoking(c.id)}>Revoke</button>
                ))}
            </div>
          );
        })
      )}
      <CertificateCheck />
    </Panel>
  );
}

export function CertificateCheck() {
  useDB(); // re-check when certificates change
  const [code, setCode] = useState("");
  const [res, setRes] = useState<CertCheck | null>(null);
  const msg: Record<CertCheck["result"], [Tone, string]> = {
    valid: ["good", "Valid"],
    expired: ["warn", "Expired"],
    revoked: ["bad", "Revoked"],
    "not-found": ["bad", "Not found"],
  };
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setRes((await run(checkCertificate(code))) ?? null);
      }}
      style={{ ...row, display: "block", backgroundColor: "var(--bg-subtle)" }}
    >
      <div style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--text-main)", marginBottom: "8px" }}>Check a certificate</div>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        <input aria-label="Certificate number or check code" placeholder="Certificate number or check code" value={code} onChange={(e) => setCode(e.target.value)} style={{ ...field, flex: "1 1 240px" }} />
        <button type="submit" className="btn-primary" style={{ padding: "8px 16px", fontSize: "13px" }}>Check</button>
      </div>
      {res && (
        <div role="status" style={{ marginTop: "10px", fontSize: "12.5px", color: "var(--text-secondary)", display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          <Pill tone={msg[res.result][0]}>{msg[res.result][1]}</Pill>
          {res.result === "not-found"
            ? "No certificate matches that code. Check for typos."
            : `${res.cert.type} ${res.cert.number}, issued by ${res.companyName} to ${res.cert.issuedTo} on ${res.cert.issuedOn}${res.cert.validUntil ? `, valid until ${res.cert.validUntil}` : ""}${res.cert.revokedReason ? `. Reason: ${res.cert.revokedReason}` : ""}.`}
        </div>
      )}
    </form>
  );
}

// ---------- Accreditations (compliance items) ----------

export const ACCREDITATION_STATE: Record<ReturnType<typeof complianceState>, [Tone, string]> = {
  valid: ["good", "Valid"],
  expiring: ["warn", "Expires within 60 days"],
  expired: ["bad", "Expired"],
};

/** The accreditations Indian inspection companies show most; one click fills the form. */
const ACCREDITATION_PRESETS = [
  { label: "NABL", name: "NABL accreditation (ISO/IEC 17025)", issuedBy: "NABL" },
  { label: "NABCB", name: "NABCB accreditation", issuedBy: "NABCB" },
  { label: "ISO/IEC 17020", name: "ISO/IEC 17020 inspection body", issuedBy: "NABCB" },
];

function ComplianceTab({ company }: { company: Company }) {
  const db = useDB();
  const items = db.compliance.filter((c) => c.companyId === company.id);
  const uncovered = uncoveredCertTypes(db.compliance, company.id);
  const [f, setF] = useState({ name: "", issuedBy: "", reference: "", validUntil: "", covers: [] as CertType[] });
  const [file, setFile] = useState<File | null>(null);
  const [problems, setProblems] = useState<string[]>([]);
  const toggle = (t: CertType) => setF({ ...f, covers: f.covers.includes(t) ? f.covers.filter((x) => x !== t) : [...f.covers, t] });
  return (
    <Panel
      title="Accreditations"
      hint="Show customers the accreditations and licences you hold, such as NABL, NABCB or ISO/IEC 17020. They appear on your profile, and we warn you 60 days before one expires."
    >
      {uncovered.length > 0 && (
        <p style={{ fontSize: "12.5px", color: "var(--warning-text)" }}>Not covered by a valid approval: {uncovered.join(", ")}.</p>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px" }}>
        <span style={{ fontSize: "12.5px", color: "var(--text-secondary)" }}>Quick fill:</span>
        {ACCREDITATION_PRESETS.map((a) => (
          <button
            key={a.label}
            type="button"
            className="btn-secondary"
            style={{ padding: "6px 12px", fontSize: "12.5px", gap: "5px" }}
            onClick={() => setF({ ...f, name: a.name, issuedBy: a.issuedBy })}
          >
            <Plus size={12} weight="bold" aria-hidden="true" />
            {a.label}
          </button>
        ))}
      </div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const p = await problemsOf(addCompliance({ companyId: company.id, ...f, file }));
          setProblems(p);
          if (!p.length) {
            setF({ name: "", issuedBy: "", reference: "", validUntil: "", covers: [] });
            setFile(null);
          }
        }}
        style={{ ...row, display: "block" }}
      >
        <div style={grid}>
          <label style={label}>Accreditation or licence<input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="ISO/IEC 17020" style={field} /></label>
          <label style={label}>Issued by<input value={f.issuedBy} onChange={(e) => setF({ ...f, issuedBy: e.target.value })} placeholder="NABCB" style={field} /></label>
          <label style={label}>Reference no.<input value={f.reference} onChange={(e) => setF({ ...f, reference: e.target.value })} style={field} /></label>
          <label style={label}>Valid until<input type="date" value={f.validUntil} onChange={(e) => setF({ ...f, validUntil: e.target.value })} style={field} /></label>
          <label style={label}>Document (optional)<input type="file" accept="application/pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} style={{ fontSize: "12.5px" }} /></label>
        </div>
        <fieldset style={{ border: "none", padding: 0, margin: "12px 0 0" }}>
          <legend style={{ fontSize: "11.5px", color: "var(--text-muted)", marginBottom: "6px" }}>Lets you issue</legend>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px" }}>
            {CERT_TYPES.map((t) => (
              <label key={t} style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "12.5px", color: "var(--text-secondary)" }}>
                <input type="checkbox" checked={f.covers.includes(t)} onChange={() => toggle(t)} /> {t}
              </label>
            ))}
          </div>
        </fieldset>
        <div style={{ marginTop: "12px" }}>
          <button type="submit" className="btn-primary" style={{ padding: "8px 16px", fontSize: "13px" }}>Add accreditation</button>
        </div>
        <Problems list={problems} />
      </form>
      {items.length === 0 ? (
        <Empty>No accreditations added yet. Use quick fill above for NABL, NABCB or ISO/IEC 17020.</Empty>
      ) : (
        items.map((c) => {
          const s = complianceState(c);
          return (
            <div key={c.id} style={row}>
              <div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--text-main)" }}>{c.name}</span>
                  <Pill tone={ACCREDITATION_STATE[s][0]}>{ACCREDITATION_STATE[s][1]}</Pill>
                </div>
                <div style={{ fontSize: "12.5px", color: "var(--text-secondary)", marginTop: "2px" }}>
                  {c.issuedBy}
                  {c.reference && ` · ${c.reference}`} · valid until {c.validUntil}
                  {c.covers.length > 0 && ` · covers ${c.covers.join(", ")}`}
                </div>
              </div>
              <button style={{ ...linkBtn, color: "var(--danger-text)" }} onClick={() => void run(removeCompliance(c.id))}>Remove</button>
            </div>
          );
        })
      )}
    </Panel>
  );
}

// ---------- KYC and profile ----------

function KycTab({ company }: { company: Company }) {
  const [busy, setBusy] = useState<KycDocType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [p, setP] = useState({ name: company.name, email: company.email, phone: company.phone, address: company.address, gstin: company.gstin ?? "", pan: company.pan ?? "" });
  const [saved, setSaved] = useState(false);
  const upload = async (type: KycDocType, file: File | undefined) => {
    if (!file) return;
    setBusy(type);
    setError(null);
    try {
      await addKycDoc(company.id, type, file);
    } catch (e) {
      setError(e instanceof Error && isRemote ? e.message : "Couldn't save that file. Try a smaller PDF or image (under 20 MB).");
    }
    setBusy(null);
  };
  const { session } = useSession();
  // Only Qualty admins review KYC on the backend; the demo shows the buttons so the flow can be tried.
  const canReview = !isRemote || session?.appRole === "admin";
  const DOC: Record<"submitted" | "verified" | "rejected", [Tone, string]> = { submitted: ["warn", "Under review"], verified: ["good", "Verified"], rejected: ["bad", "Rejected"] };

  return (
    <Panel title="KYC and company profile" hint="Upload each document once. Qualty checks them before your listings are marked verified to customers. A new upload replaces the old one.">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          await run(updateCompany(company.id, { ...p, gstin: p.gstin.trim().toUpperCase() || undefined, pan: p.pan.trim().toUpperCase() || undefined }));
          setSaved(true);
        }}
        style={{ ...row, display: "block" }}
      >
        <div style={grid}>
          {(["name", "email", "phone", "address", "gstin", "pan"] as const).map((k) => (
            <label key={k} style={label}>
              {{ name: "Company name", email: "Email", phone: "Phone", address: "Address", gstin: "GSTIN", pan: "PAN" }[k]}
              <input value={p[k]} onChange={(e) => { setP({ ...p, [k]: e.target.value }); setSaved(false); }} style={field} />
            </label>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "12px" }}>
          <button type="submit" className="btn-primary" style={{ padding: "8px 16px", fontSize: "13px" }}>Save profile</button>
          {saved && <span role="status" style={{ fontSize: "12.5px", color: "var(--success-text)" }}>Saved</span>}
        </div>
      </form>
      {error && <p role="alert" style={{ fontSize: "12.5px", color: "var(--danger-text)" }}>{error}</p>}
      {KYC_REQUIRED.map((type) => {
        const doc = company.kyc.find((d) => d.type === type);
        return (
          <div key={type} style={row}>
            <div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--text-main)" }}>{type}</span>
                {doc ? <Pill tone={DOC[doc.status][0]}>{DOC[doc.status][1]}</Pill> : <Pill tone="muted">Missing</Pill>}
              </div>
              {doc && (
                <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                  {doc.fileName} · {doc.uploadedAt.slice(0, 10)}
                  {doc.note && ` · ${doc.note}`}
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
              {doc?.status === "submitted" && canReview && (
                <>
                  <button style={linkBtn} title="Qualty admin action" onClick={() => void run(reviewKycDoc(company.id, doc.id, "verified"))}>Admin: verify</button>
                  <button style={{ ...linkBtn, color: "var(--danger-text)" }} title="Qualty admin action" onClick={() => void run(reviewKycDoc(company.id, doc.id, "rejected", "Unreadable, please upload again"))}>Admin: reject</button>
                </>
              )}
              <label style={{ ...linkBtn, textDecoration: "none" }}>
                {busy === type ? "Uploading..." : doc ? "Replace" : "Upload"}
                <input type="file" accept="application/pdf,image/*" hidden onChange={(e) => upload(type, e.target.files?.[0])} />
              </label>
            </div>
          </div>
        );
      })}
    </Panel>
  );
}

// ---------- Team ----------

const ROLES = Object.keys(TEAM_ROLE_LABEL) as TeamRole[];

function TeamTab({ company }: { company: Company }) {
  const db = useDB();
  const team = db.team.filter((m) => m.companyId === company.id);
  const [f, setF] = useState({ name: "", email: "", phone: "", role: "sales" as TeamRole });
  const [problems, setProblems] = useState<string[]>([]);
  const [sent, setSent] = useState<string | null>(null);
  return (
    <Panel title="Team and roles" hint="Invite people by email or phone. Each role only sees the sections it needs. There's always at least one owner.">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const p = await problemsOf(inviteMember(company.id, f));
          setProblems(p);
          setSent(
            p.length
              ? null
              : !isRemote
                ? `Invite sent to ${f.email || f.phone}.`
                : f.email
                  ? `Added. ${f.name} joins the team when they sign up at qualty.ai with ${f.email.trim().toLowerCase()}.`
                  : "Added. Phone-only invites can't sign in yet, so add their email too.",
          );
          if (!p.length) setF({ name: "", email: "", phone: "", role: f.role });
        }}
        style={{ ...row, display: "block" }}
      >
        <div style={grid}>
          <label style={label}>Name<input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} style={field} /></label>
          <label style={label}>Email<input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} style={field} /></label>
          <label style={label}>or phone<input type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="+91 98765 43210" style={field} /></label>
          <label style={label}>Role
            <select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as TeamRole })} style={field}>
              {ROLES.map((r) => <option key={r} value={r}>{TEAM_ROLE_LABEL[r]}</option>)}
            </select>
          </label>
        </div>
        <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "8px" }}>
          {TEAM_ROLE_LABEL[f.role]} can open: {ROLE_ACCESS[f.role].map((a) => TABS.find((t) => t.area === a)!.label).join(", ")}.
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "10px" }}>
          <button type="submit" className="btn-primary" style={{ padding: "8px 16px", fontSize: "13px" }}>Send invite</button>
          {sent && <span role="status" style={{ fontSize: "12.5px", color: "var(--success-text)" }}>{sent}</span>}
        </div>
        <Problems list={problems} />
      </form>
      {team.map((m) => (
        <div key={m.id} style={row}>
          <div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--text-main)" }}>{m.name}</span>
              <Pill tone={m.status === "active" ? "good" : "warn"}>{m.status === "active" ? "Active" : "Invited"}</Pill>
            </div>
            <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>{[m.email, m.phone].filter(Boolean).join(" · ")}</div>
          </div>
          <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
            <select aria-label={`Role for ${m.name}`} value={m.role} onChange={(e) => void run(setMemberRole(m.id, e.target.value as TeamRole))} style={field}>
              {ROLES.map((r) => <option key={r} value={r}>{TEAM_ROLE_LABEL[r]}</option>)}
            </select>
            {m.status === "invited" && !isRemote && (
              <button style={linkBtn} title="Stands in for the person accepting the invite" onClick={() => void run(activateMember(m.id))}>Mark accepted</button>
            )}
            <button style={{ ...linkBtn, color: "var(--danger-text)" }} onClick={() => void run(removeMember(m.id))}>Remove</button>
          </div>
        </div>
      ))}
    </Panel>
  );
}
