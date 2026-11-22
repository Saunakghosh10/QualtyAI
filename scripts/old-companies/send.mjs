#!/usr/bin/env node
// Send the re-registration email in email.md to the rows in companies.csv through Resend's batch API.
// DRY RUN BY DEFAULT: without --send it prints only the recipient count and the first rendered subject.
//
//   node send.mjs                                   # dry run
//   RESEND_API_KEY=re_... node send.mjs --send --limit=50
//
// Options:
//   --send             actually send (also needs RESEND_API_KEY)
//   --subject=1|2      which subject option from email.md (default 1)
//   --only=a,b         only these sources (indian_company, international_company, indian_inspector, international_inspector)
//   --limit=N          send to at most N recipients this run (recommended: start small)
//   --batch-size=N     emails per API call, 1-100 (default 100)
//   --delay-ms=N       pause between API calls (default 1500)
//   --csv=path         recipients file (default companies.csv)
//
// Skips anyone listed in unsubscribed.txt (one email per line) and anyone already in sent.csv,
// so it is safe to run again for the next batch. sent.csv records email, Resend id and time.
//
// Resend batch API (checked against resend.com/docs/api-reference/emails/send-batch-emails):
// POST https://api.resend.com/emails/batch, JSON array of up to 100 email objects
// ({ from, to, subject, text, html, reply_to, headers }), no attachments or scheduled_at.
// The call is all-or-nothing by default. Response: { data: [{ id }, ...] } in request order.
// Idempotency-Key header (max 256 chars, kept 24h) stops a retried call from sending twice.

import { readFileSync, existsSync, appendFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const FROM = "Qualty <team@qualty.ai>";
const REPLY_TO = "iq@cargofirst.net";
const ENDPOINT = "https://api.resend.com/emails/batch";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, "").split("=");
    return [k, v.length ? v.join("=") : true];
  }),
);
const SEND = args.send === true;
const subjectIndex = Number(args.subject ?? 1) - 1;
const limit = args.limit ? Number(args.limit) : Infinity;
const batchSize = Math.min(100, Math.max(1, Number(args["batch-size"] ?? 100)));
const delayMs = Number(args["delay-ms"] ?? 1500);
const only = typeof args.only === "string" ? new Set(args.only.split(",").map((s) => s.trim())) : null;
const csvPath = resolve(HERE, typeof args.csv === "string" ? args.csv : "companies.csv");
const sentPath = resolve(HERE, "sent.csv");
const unsubPath = resolve(HERE, "unsubscribed.txt");

// ---------- email.md ----------
const md = readFileSync(resolve(HERE, "email.md"), "utf8");
const section = (heading) => {
  const m = md.match(new RegExp(`^## ${heading}\\s*$([\\s\\S]*?)(?=^## |(?![\\s\\S]))`, "m"));
  if (!m) throw new Error(`email.md: missing "## ${heading}" section`);
  return m[1];
};
const fenced = (heading, lang) => {
  const m = section(heading).match(new RegExp("```" + lang + "\\n([\\s\\S]*?)\\n```"));
  if (!m) throw new Error(`email.md: no \`\`\`${lang} block under "## ${heading}"`);
  return m[1];
};
const subjects = [...section("Subject options").matchAll(/^\s*\d+\.\s+(.+?)\s*$/gm)].map((m) => m[1]);
if (!subjects[subjectIndex]) throw new Error(`email.md: no subject option ${subjectIndex + 1}`);
const textTemplate = fenced("Plain text", "text");
const htmlTemplate = fenced("HTML", "html");

// ---------- companies.csv ----------
function parseCsv(src) {
  const rows = [];
  let row = [], cell = "", q = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (q) {
      if (ch === '"' && src[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [header, ...body] = rows.filter((r) => r.some((c) => c !== ""));
  // export.mjs prefixes formula-like cells with an apostrophe for Sheets; undo that here.
  const unguard = (v) => v.replace(/^'(?=[=@+\-\t\r])/, "");
  return body.map((r) => Object.fromEntries(header.map((h, i) => [h, unguard(r[i] ?? "")])));
}

if (!existsSync(csvPath)) {
  console.error(`No recipients file at ${csvPath}. Run export.mjs first.`);
  process.exit(1);
}
const readList = (p) =>
  existsSync(p)
    ? new Set(readFileSync(p, "utf8").split(/\r?\n/).map((l) => l.split(",")[0].trim().toLowerCase()).filter((l) => l.includes("@")))
    : new Set();
const unsubscribed = readList(unsubPath);
const alreadySent = readList(sentPath);

const recipients = parseCsv(readFileSync(csvPath, "utf8"))
  .map((r) => ({ ...r, email: (r.email || "").trim().toLowerCase() }))
  .filter((r) => r.email && !unsubscribed.has(r.email) && !alreadySent.has(r.email))
  .filter((r) => !only || only.has(r.source))
  .slice(0, limit);

// ---------- render ----------
const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
function render(r) {
  const name = (r.contact_name || r.company_name || "").trim();
  const fill = (tpl, esc) =>
    tpl.replace(/Hello \{\{greeting_name\}\},/g, name ? `Hello ${esc(name)},` : "Hello,").replace(/\{\{greeting_name\}\}/g, esc(name));
  return {
    from: FROM,
    to: [r.email],
    reply_to: REPLY_TO,
    subject: fill(subjects[subjectIndex], (s) => s),
    text: fill(textTemplate, (s) => s),
    html: fill(htmlTemplate, escapeHtml),
    headers: { "List-Unsubscribe": `<mailto:${REPLY_TO}?subject=unsubscribe>` },
  };
}

if (!SEND) {
  console.log(`Recipients: ${recipients.length}`);
  console.log(`First subject: ${recipients[0] ? render(recipients[0]).subject : "(none)"}`);
  console.log("Dry run. Nothing was sent. Add --send with RESEND_API_KEY set to send.");
  process.exit(0);
}

// ---------- send ----------
const key = process.env.RESEND_API_KEY;
if (!key) {
  console.error("RESEND_API_KEY is not set. Nothing was sent.");
  process.exit(1);
}
if (!existsSync(sentPath)) writeFileSync(sentPath, "email,resend_id,sent_at\n", { mode: 0o600 });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let sent = 0;
for (let i = 0; i < recipients.length; i += batchSize) {
  const chunk = recipients.slice(i, i + batchSize);
  const payload = chunk.map(render);
  const idem = "qualty-reregister-" + createHash("sha256").update(`${subjectIndex}|` + chunk.map((r) => r.email).join("|")).digest("hex").slice(0, 40);

  let res;
  for (let attempt = 1; attempt <= 4; attempt++) {
    res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "Idempotency-Key": idem },
      body: JSON.stringify(payload),
    });
    if (res.status !== 429 && res.status < 500) break;
    const wait = Number(res.headers.get("retry-after")) * 1000 || 2000 * attempt;
    console.log(`Batch ${i / batchSize + 1}: HTTP ${res.status}, retrying in ${Math.round(wait / 1000)}s`);
    await sleep(wait);
  }

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error(`Batch ${i / batchSize + 1} failed: HTTP ${res.status} ${body.name ?? ""} ${body.message ?? ""}`.trim());
    console.error(`Stopped. Sent so far this run: ${sent}. Fix the problem and run again; sent.csv skips anyone already sent.`);
    process.exit(1);
  }
  const ids = Array.isArray(body.data) ? body.data : [];
  const now = new Date().toISOString();
  appendFileSync(sentPath, chunk.map((r, j) => `${r.email},${ids[j]?.id ?? ""},${now}`).join("\n") + "\n");
  sent += chunk.length;
  console.log(`Batch ${i / batchSize + 1}: ${chunk.length} sent (${sent}/${recipients.length})`);
  if (i + batchSize < recipients.length) await sleep(delayMs);
}
console.log(`Done. Sent this run: ${sent}.`);
