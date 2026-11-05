"use client";

import React, { useMemo, useState } from "react";
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
} from "@phosphor-icons/react";
import {
  useDB,
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
const usd = (n: number) => `$${n.toLocaleString()}`;
const today = () => new Date().toISOString().slice(0, 10);

type Tone = "good" | "warn" | "bad" | "muted";
function Pill({ tone, children }: { tone: Tone; children: React.ReactNode }) {
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

const TABS: { area: Area; label: string; icon: React.ReactNode }[] = [
  { area: "orders", label: "Orders", icon: <ClipboardText size={16} /> },
  { area: "enquiries", label: "Enquiries", icon: <MagnifyingGlass size={16} /> },
  { area: "store", label: "Service store", icon: <Storefront size={16} /> },
  { area: "payments", label: "Payments", icon: <Receipt size={16} /> },
  { area: "certificates", label: "Certificates", icon: <CertIcon size={16} /> },
  { area: "compliance", label: "Compliance", icon: <SealCheck size={16} /> },
  { area: "kyc", label: "KYC", icon: <IdentificationCard size={16} /> },
  { area: "team", label: "Team", icon: <UsersThree size={16} /> },
];

const openChatroom = (id: string) => {
  window.dispatchEvent(new CustomEvent("qualty:open-order", { detail: id }));
  document.getElementById("orders")?.scrollIntoView({ behavior: "smooth" });
};

export default function CompanyConsole() {
  const db = useDB();
  const company = db.companies[0] ?? null;
  const team = useMemo(() => (company ? db.team.filter((m) => m.companyId === company.id) : []), [db.team, company]);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const viewer = team.find((m) => m.id === viewerId) ?? team.find((m) => m.role === "owner") ?? null;
  const role: TeamRole = viewer?.role ?? "owner";
  const tabs = TABS.filter((t) => canAccess(role, t.area));
  const [tab, setTab] = useState<Area>("orders");
  const current = tabs.some((t) => t.area === tab) ? tab : tabs[0].area;

  return (
    <section id="company" style={{ padding: "clamp(48px, 7vw, 80px) 20px", maxWidth: "1280px", margin: "0 auto" }}>
      <div style={{ maxWidth: "720px", marginBottom: "28px" }}>
        <h2 className="font-heading" style={{ fontSize: "clamp(26px, 3.4vw, 36px)", fontWeight: 700, color: "var(--text-main)", textWrap: "balance" }}>
          Run your inspection company here
        </h2>
        <p style={{ fontSize: "15px", color: "var(--text-secondary)", lineHeight: 1.6, marginTop: "10px", textWrap: "pretty" }}>
          List your surveyors so customers can book you directly, bid on enquiries, send invoices, issue certificates customers can check, and
          keep your accreditations and KYC up to date. Your team sees only what their role needs.
        </p>
      </div>

      {!company ? (
        <CompanySetup />
      ) : (
        <div className="card-shell" style={{ padding: 0, overflow: "hidden" }}>
          <header style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-main)", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Buildings size={22} color="var(--accent-primary)" />
              <div>
                <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-main)" }}>{company.name}</div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                  KYC: <KycPill company={company} />
                </div>
              </div>
            </div>
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
          <div role="tabpanel" style={{ padding: "20px" }}>
            {current === "orders" && <OrdersTab company={company} />}
            {current === "enquiries" && <EnquiriesTab company={company} />}
            {current === "store" && <StoreTab company={company} />}
            {current === "payments" && <PaymentsTab company={company} />}
            {current === "certificates" && <CertificatesTab company={company} />}
            {current === "compliance" && <ComplianceTab company={company} />}
            {current === "kyc" && <KycTab company={company} />}
            {current === "team" && <TeamTab company={company} />}
          </div>
        </div>
      )}
    </section>
  );
}

function KycPill({ company }: { company: Company }) {
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

function CompanySetup() {
  const [f, setF] = useState({ name: "", owner: "", email: "", phone: "", address: "", gstin: "", pan: "" });
  const [problems, setProblems] = useState<string[]>([]);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const p: string[] = [];
    if (!f.name.trim()) p.push("Add the company name.");
    if (!f.owner.trim()) p.push("Add your name.");
    if (!f.email.trim() && !f.phone.trim()) p.push("Add an email or phone so customers can reach you.");
    setProblems(p);
    if (p.length) return;
    createCompany({ name: f.name.trim(), email: f.email.trim(), phone: f.phone.trim(), address: f.address.trim(), gstin: f.gstin, pan: f.pan }, f.owner);
  };
  return (
    <form onSubmit={submit} className="card-shell" style={{ padding: "24px", maxWidth: "760px" }}>
      <Panel title="Set up your company" hint="You'll be the owner. You can add KYC documents and invite your team next.">
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
        <div>
          <button type="submit" className="btn-primary" style={{ padding: "10px 20px", fontSize: "13.5px" }}>Create company</button>
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
  const orders = db.orders.filter((o) => o.inspectionCompany === company.name);
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
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <span className="font-mono" style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-main)" }}>{o.id}</span>
                <Pill tone={ORDER_STATUS[o.status][0]}>{ORDER_STATUS[o.status][1]}</Pill>
              </div>
              <div style={{ fontSize: "12.5px", color: "var(--text-secondary)", marginTop: "2px" }}>
                {o.service} · {o.commodity} · {o.location} · {o.inspectionDate}
                {o.priceUSD ? ` · ${usd(o.priceUSD)}` : ""}
              </div>
            </div>
            <button style={linkBtn} onClick={() => openChatroom(o.id)}>Open chatroom</button>
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
    <Panel title="Open enquiries" hint="Bid, give a discount or answer a counter-offer inside each enquiry's chatroom. Follow-ups you set are listed here.">
      {open.length === 0 ? (
        <Empty>No open enquiries right now.</Empty>
      ) : (
        open.map((o) => {
          const mine = o.bids.find((b) => b.company === company.name && b.status === "open");
          const lowest = Math.min(...o.bids.filter((b) => b.status === "open").map(bidNet));
          const last = mine?.rounds?.[mine.rounds.length - 1];
          return (
            <div key={o.id} style={row}>
              <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                <span className="font-mono" style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-main)" }}>{o.id}</span>
                <span style={{ fontSize: "12.5px", color: "var(--text-secondary)" }}>
                  {o.service} · {o.commodity} · {o.volumeTons.toLocaleString()} t · {o.location} · {o.inspectionDate}
                </span>
                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
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
              <button style={linkBtn} onClick={() => openChatroom(o.id)}>{mine ? "Negotiate" : "Place a bid"}</button>
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
  const toInput = () => ({
    companyId: company.id,
    service: f.service,
    commodities: f.commodities.split(",").map((c) => c.trim()).filter(Boolean),
    location: f.location,
    priceUSD: Number(f.priceUSD),
    discountPct: Number(f.discountPct) || 0,
    turnaroundDays: Number(f.turnaroundDays),
    surveyors: Number(f.surveyors),
    availableFrom: f.availableFrom,
    availableTo: f.availableTo,
    active: f.active,
  });
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = saveListing({ ...toInput(), id: editId ?? undefined });
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
  const preview = listingProblems(toInput()).length === 0 ? listingNet({ priceUSD: Number(f.priceUSD), discountPct: Number(f.discountPct) || 0 }) : null;

  return (
    <Panel title="Your service store" hint="Customers booking a quick inspection see these listings when the service, port, date, commodity and budget match. Cheapest shows first.">
      <form onSubmit={submit} style={{ ...row, display: "block" }}>
        <div style={grid}>
          <label style={label}>Service
            <select value={f.service} onChange={set("service")} style={field}>
              {SERVICES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
          <label style={label}>Port or city<input value={f.location} onChange={set("location")} placeholder="Mundra" style={field} /></label>
          <label style={label}>Commodities (comma separated, blank = any)<input value={f.commodities} onChange={set("commodities")} placeholder="Rice, Wheat" style={field} /></label>
          <label style={label}>Price (USD)<input type="number" min={1} value={f.priceUSD} onChange={set("priceUSD")} style={field} /></label>
          <label style={label}>Discount %<input type="number" min={0} max={99} value={f.discountPct} onChange={set("discountPct")} placeholder="0" style={field} /></label>
          <label style={label}>Turnaround (days)<input type="number" min={1} value={f.turnaroundDays} onChange={set("turnaroundDays")} style={field} /></label>
          <label style={label}>Surveyors available<input type="number" min={1} value={f.surveyors} onChange={set("surveyors")} style={field} /></label>
          <label style={label}>Available from<input type="date" value={f.availableFrom} onChange={set("availableFrom")} style={field} /></label>
          <label style={label}>Available until<input type="date" value={f.availableTo} onChange={set("availableTo")} style={field} /></label>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "12px", marginTop: "12px" }}>
          <label style={{ ...label, flexDirection: "row", alignItems: "center", gap: "6px", fontSize: "12.5px" }}>
            <input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} /> Show to customers
          </label>
          <button type="submit" className="btn-primary" style={{ padding: "8px 16px", fontSize: "13px" }}>{editId ? "Save changes" : "Add listing"}</button>
          {editId && <button type="button" style={linkBtn} onClick={() => { setEditId(null); setF(blankListing()); setProblems([]); }}>Cancel</button>}
          {preview !== null && <span style={{ fontSize: "12.5px", color: "var(--text-secondary)" }}>Customers pay {usd(preview)}</span>}
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
              </div>
              <div style={{ fontSize: "12.5px", color: "var(--text-secondary)", marginTop: "2px" }}>
                {usd(listingNet(l))}
                {l.discountPct > 0 && ` (${l.discountPct}% off ${usd(l.priceUSD)})`} · {l.turnaroundDays} day(s) · {l.surveyors} surveyor(s) ·{" "}
                {l.availableFrom} to {l.availableTo} · {l.commodities.length ? l.commodities.join(", ") : "Any commodity"}
              </div>
            </div>
            <div style={{ display: "flex", gap: "12px" }}>
              <button style={linkBtn} onClick={() => edit(l)}>Edit</button>
              <button style={{ ...linkBtn, color: "var(--danger-text)" }} onClick={() => deleteListing(l.id)}>Delete</button>
            </div>
          </div>
        ))
      )}
    </Panel>
  );
}

// ---------- Payments ----------

const PAY_STATUS: Record<PaymentStatus, [Tone, string]> = {
  "not-invoiced": ["muted", "Not invoiced"],
  unpaid: ["warn", "Unpaid"],
  "part-paid": ["warn", "Part paid"],
  paid: ["good", "Paid"],
  overdue: ["bad", "Overdue"],
};
const METHODS: Payment["method"][] = ["Bank transfer", "UPI", "Card", "Letter of credit", "Other"];

function PaymentsTab({ company }: { company: Company }) {
  const db = useDB();
  const orders = db.orders.filter((o) => o.inspectionCompany === company.name && o.status !== "enquiry");
  const totals = orders.reduce(
    (t, o) => {
      if (!o.invoice) return t;
      const due = invoiceTotal(o.invoice);
      const paid = invoicePaid(o.invoice);
      t.billed += due;
      t.received += paid;
      if (paymentStatus(o) === "overdue") t.overdue += due - paid;
      return t;
    },
    { billed: 0, received: 0, overdue: 0 },
  );
  return (
    <Panel title="Payment tracking" hint="Raise an invoice once the customer has booked, then record each payment as it arrives.">
      <div style={{ ...grid, gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
        {[
          ["Billed", totals.billed, "var(--text-main)"],
          ["Received", totals.received, "var(--success-text)"],
          ["Outstanding", totals.billed - totals.received, "var(--warning-text)"],
          ["Overdue", totals.overdue, "var(--danger-text)"],
        ].map(([k, v, c]) => (
          <div key={k as string} style={{ ...row, display: "block" }}>
            <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{k}</div>
            <div className="font-mono" style={{ fontSize: "20px", fontWeight: 700, color: c as string, fontVariantNumeric: "tabular-nums" }}>{usd(v as number)}</div>
          </div>
        ))}
      </div>
      {orders.length === 0 ? <Empty>No booked orders to invoice yet.</Empty> : orders.map((o) => <PaymentRow key={o.id} order={o} />)}
    </Panel>
  );
}

function PaymentRow({ order }: { order: Order }) {
  const [inv, setInv] = useState({ amount: String(order.priceUSD ?? ""), discount: "", due: "" });
  const [pay, setPay] = useState({ amount: "", method: METHODS[0], reference: "", on: today() });
  const [problems, setProblems] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const status = paymentStatus(order);
  const i = order.invoice;
  return (
    <div style={{ ...row, display: "block" }}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: "10px", alignItems: "center" }}>
        <div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <span className="font-mono" style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-main)" }}>{order.id}</span>
            <Pill tone={PAY_STATUS[status][0]}>{PAY_STATUS[status][1]}</Pill>
          </div>
          <div style={{ fontSize: "12.5px", color: "var(--text-secondary)", marginTop: "2px" }}>
            {order.buyer.name || order.service}
            {i
              ? ` · ${i.number} · ${usd(invoicePaid(i))} of ${usd(invoiceTotal(i))} paid · due ${i.dueOn}`
              : order.priceUSD
                ? ` · agreed ${usd(order.priceUSD)}`
                : ""}
          </div>
        </div>
        {status !== "paid" && (
          <button style={linkBtn} onClick={() => setOpen(!open)}>{open ? "Close" : i ? "Record payment" : "Raise invoice"}</button>
        )}
      </div>
      {open && !i && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const p = raiseInvoice(order.id, { amountUSD: Number(inv.amount), discountPct: Number(inv.discount) || 0, dueOn: inv.due });
            setProblems(p);
            if (!p.length) setOpen(false);
          }}
          style={{ ...grid, marginTop: "10px", alignItems: "end" }}
        >
          <label style={label}>Amount (USD)<input type="number" min={1} value={inv.amount} onChange={(e) => setInv({ ...inv, amount: e.target.value })} style={field} /></label>
          <label style={label}>Discount %<input type="number" min={0} max={99} value={inv.discount} onChange={(e) => setInv({ ...inv, discount: e.target.value })} placeholder="0" style={field} /></label>
          <label style={label}>Due on<input type="date" value={inv.due} onChange={(e) => setInv({ ...inv, due: e.target.value })} style={field} /></label>
          <button type="submit" className="btn-primary" style={{ padding: "8px 14px", fontSize: "13px" }}>Raise invoice</button>
        </form>
      )}
      {open && i && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const p = recordPayment(order.id, { amountUSD: Number(pay.amount), method: pay.method, reference: pay.reference.trim(), receivedOn: pay.on });
            setProblems(p);
            if (!p.length) {
              setPay({ ...pay, amount: "", reference: "" });
              setOpen(false);
            }
          }}
          style={{ ...grid, marginTop: "10px", alignItems: "end" }}
        >
          <label style={label}>Amount (USD)<input type="number" min={0} step="any" value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} placeholder={String(invoiceTotal(i) - invoicePaid(i))} style={field} /></label>
          <label style={label}>Method
            <select value={pay.method} onChange={(e) => setPay({ ...pay, method: e.target.value as Payment["method"] })} style={field}>
              {METHODS.map((m) => <option key={m}>{m}</option>)}
            </select>
          </label>
          <label style={label}>Reference (UTR, LC no.)<input value={pay.reference} onChange={(e) => setPay({ ...pay, reference: e.target.value })} style={field} /></label>
          <label style={label}>Received on<input type="date" value={pay.on} onChange={(e) => setPay({ ...pay, on: e.target.value })} style={field} /></label>
          <button type="submit" className="btn-primary" style={{ padding: "8px 14px", fontSize: "13px" }}>Record payment</button>
        </form>
      )}
      {i && i.payments.length > 0 && (
        <ul style={{ margin: "8px 0 0", paddingLeft: "18px", fontSize: "12px", color: "var(--text-muted)" }}>
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
  const completed = db.orders.filter((o) => o.inspectionCompany === company.name && o.status === "completed");
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
    const r = await issueCertificate({ companyId: company.id, type: f.type, orderId: f.orderId || undefined, issuedTo: f.issuedTo, validUntil: f.validUntil || undefined, file });
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
              {completed.map((o) => <option key={o.id} value={o.id}>{o.id} · {o.commodity}</option>)}
            </select>
          </label>
          <label style={label}>Issued to<input value={f.issuedTo} onChange={(e) => setF({ ...f, issuedTo: e.target.value })} style={field} /></label>
          <label style={label}>Valid until (optional)<input type="date" value={f.validUntil} onChange={(e) => setF({ ...f, validUntil: e.target.value })} style={field} /></label>
          <label style={label}>Signed PDF (optional)<input type="file" accept="application/pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} style={{ fontSize: "12.5px" }} /></label>
        </div>
        {uncovered.includes(f.type) && (
          <p style={{ fontSize: "12.5px", color: "var(--warning-text)", marginTop: "10px" }}>
            No valid accreditation in Compliance covers {f.type}. Add one there before issuing, or the customer may reject it.
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
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!revokeCertificate(c.id, reason).length) {
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
      onSubmit={(e) => {
        e.preventDefault();
        setRes(checkCertificate(code));
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

// ---------- Compliance ----------

function ComplianceTab({ company }: { company: Company }) {
  const db = useDB();
  const items = db.compliance.filter((c) => c.companyId === company.id);
  const uncovered = uncoveredCertTypes(db.compliance, company.id);
  const [f, setF] = useState({ name: "", issuedBy: "", reference: "", validUntil: "", covers: [] as CertType[] });
  const [file, setFile] = useState<File | null>(null);
  const [problems, setProblems] = useState<string[]>([]);
  const toggle = (t: CertType) => setF({ ...f, covers: f.covers.includes(t) ? f.covers.filter((x) => x !== t) : [...f.covers, t] });
  const STATE: Record<ReturnType<typeof complianceState>, [Tone, string]> = { valid: ["good", "Valid"], expiring: ["warn", "Expires within 60 days"], expired: ["bad", "Expired"] };

  return (
    <Panel title="Compliance" hint="Keep your accreditations and licences here (ISO 17020, Halal body approval, CoC programme). We warn you 60 days before one expires.">
      {uncovered.length > 0 && (
        <p style={{ fontSize: "12.5px", color: "var(--warning-text)" }}>Not covered by a valid approval: {uncovered.join(", ")}.</p>
      )}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const p = await addCompliance({ companyId: company.id, ...f, file });
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
          <button type="submit" className="btn-primary" style={{ padding: "8px 16px", fontSize: "13px" }}>Add approval</button>
        </div>
        <Problems list={problems} />
      </form>
      {items.length === 0 ? (
        <Empty>No approvals added yet.</Empty>
      ) : (
        items.map((c) => {
          const s = complianceState(c);
          return (
            <div key={c.id} style={row}>
              <div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--text-main)" }}>{c.name}</span>
                  <Pill tone={STATE[s][0]}>{STATE[s][1]}</Pill>
                </div>
                <div style={{ fontSize: "12.5px", color: "var(--text-secondary)", marginTop: "2px" }}>
                  {c.issuedBy}
                  {c.reference && ` · ${c.reference}`} · valid until {c.validUntil}
                  {c.covers.length > 0 && ` · covers ${c.covers.join(", ")}`}
                </div>
              </div>
              <button style={{ ...linkBtn, color: "var(--danger-text)" }} onClick={() => removeCompliance(c.id)}>Remove</button>
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
    } catch {
      setError("Couldn't save that file in this browser. Try a smaller PDF or image.");
    }
    setBusy(null);
  };
  const DOC: Record<"submitted" | "verified" | "rejected", [Tone, string]> = { submitted: ["warn", "Under review"], verified: ["good", "Verified"], rejected: ["bad", "Rejected"] };

  return (
    <Panel title="KYC and company profile" hint="Upload each document once. Qualty checks them before your listings are marked verified to customers. A new upload replaces the old one.">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          updateCompany(company.id, { ...p, gstin: p.gstin.trim().toUpperCase() || undefined, pan: p.pan.trim().toUpperCase() || undefined });
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
              {doc?.status === "submitted" && (
                <>
                  <button style={linkBtn} title="Qualty admin action" onClick={() => reviewKycDoc(company.id, doc.id, "verified")}>Admin: verify</button>
                  <button style={{ ...linkBtn, color: "var(--danger-text)" }} title="Qualty admin action" onClick={() => reviewKycDoc(company.id, doc.id, "rejected", "Unreadable, please upload again")}>Admin: reject</button>
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
        onSubmit={(e) => {
          e.preventDefault();
          const p = inviteMember(company.id, f);
          setProblems(p);
          setSent(p.length ? null : `Invite sent to ${f.email || f.phone}.`);
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
            <select aria-label={`Role for ${m.name}`} value={m.role} onChange={(e) => setMemberRole(m.id, e.target.value as TeamRole)} style={field}>
              {ROLES.map((r) => <option key={r} value={r}>{TEAM_ROLE_LABEL[r]}</option>)}
            </select>
            {m.status === "invited" && (
              <button style={linkBtn} title="Stands in for the person accepting the invite" onClick={() => activateMember(m.id)}>Mark accepted</button>
            )}
            <button style={{ ...linkBtn, color: "var(--danger-text)" }} onClick={() => removeMember(m.id)}>Remove</button>
          </div>
        </div>
      ))}
    </Panel>
  );
}
