#!/usr/bin/env node
// Export companies and inspectors from the OLD Qualty database (Express + Sequelize + Postgres)
// into companies.csv, so they can be invited to re-register on qualty.ai.
//
//   DATABASE_URL=postgres://... node export.mjs            # writes ./companies.csv
//   DATABASE_URL=postgres://... node export.mjs --out=x.csv
//   DATABASE_SSL=1 adds ssl { rejectUnauthorized: false } for hosted Postgres without a CA bundle.
//
// Safety:
// - Reads only. Runs everything inside a READ ONLY transaction and only issues SELECTs.
// - Never selects password, bank, ID or document columns.
// - Prints counts only, never rows or the connection string.
//
// Table and column names come from QualtyAI/server/models/*.js. Every model sets tableName, so
// Sequelize does not pluralise anything. Column names come from each attribute's `field`
// (or the attribute name when there is no `field`). The created-at column is `createdAt` unless
// the global `define: { underscored: true }` in server/config/config.json was on, so the script
// checks information_schema at run time and uses whichever exists.

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

// Candidate columns per output field, first existing non-empty value wins.
// `literal` is used when a source has no column for the field.
const SOURCES = [
  {
    source: "indian_company",
    table: "indian_companies", // models/indiancompany.js
    fields: {
      company_name: ["company_name"],
      contact_name: ["representative_name"],
      email: ["email_address"],
      phone: ["contact_number", "office_number"],
      country: [],
      city: [], // model has only registered_address (free text), no city
    },
    literal: { country: "India" },
  },
  {
    source: "international_company",
    table: "international_company", // models/internationalcompany.js (singular table name)
    fields: {
      company_name: ["company_name"],
      contact_name: [],
      // The model has NO email column. These are picked up only if the live table has one.
      email: ["email_address", "email", "email_id"],
      phone: ["office_number"],
      country: [],
      city: [],
    },
    literal: {},
  },
  {
    source: "indian_inspector",
    table: "indian_inspectors", // models/Indianinspector.js
    fields: {
      company_name: [],
      contact_name: ["name"],
      email: ["email_id"],
      phone: ["mobile_number"],
      country: [],
      city: [], // model has only address (free text)
    },
    literal: { country: "India" },
  },
  {
    source: "international_inspector",
    table: "international_inspectors", // models/Internationalinspector.js
    fields: {
      company_name: [],
      contact_name: ["full_name"],
      email: ["email_address"],
      phone: ["mobile_number"],
      country: ["country_code"], // a dialling code such as +44, not a country name
      city: [],
    },
    literal: {},
  },
];

const CREATED_AT_CANDIDATES = ["createdAt", "created_at"];
const CSV_COLUMNS = ["source", "company_name", "contact_name", "email", "phone", "country", "city", "created_at"];
const EMAIL_RE = /^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]{2,}$/;

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, "").split("=");
    return [k, v.length ? v.join("=") : true];
  }),
);
const outPath = resolve(process.cwd(), typeof args.out === "string" ? args.out : "companies.csv");

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. Run: DATABASE_URL=postgres://... node export.mjs");
  process.exit(1);
}

let pg;
try {
  pg = (await import("pg")).default;
} catch {
  console.error("The pg package is missing. Run `npm install` in this folder (or `npm i pg`).");
  process.exit(1);
}

const quoteIdent = (name) => `"${String(name).replace(/"/g, '""')}"`;
const clean = (v) => (v == null ? "" : String(v).replace(/\s+/g, " ").trim());

// Neutralise spreadsheet formulas (the CSV is meant to be opened in Google Sheets).
// Phone numbers like +91 98... are left alone.
function safeCell(v) {
  const s = clean(v);
  if (/^[=@\t\r]/.test(s)) return `'${s}`;
  if (/^[+-]/.test(s) && !/^[+-][\d\s().-]*$/.test(s)) return `'${s}`;
  return s;
}
const csvCell = (v) => {
  const s = safeCell(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ...(process.env.DATABASE_SSL === "1" ? { ssl: { rejectUnauthorized: false } } : {}),
});

const counts = {};
const seen = new Set();
const out = [];

try {
  await client.connect();
  await client.query("BEGIN READ ONLY");

  for (const src of SOURCES) {
    const c = (counts[src.source] = { read: 0, no_valid_email: 0, duplicate: 0, written: 0, note: "" });

    const { rows: cols } = await client.query(
      `SELECT column_name FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = $1`,
      [src.table],
    );
    if (cols.length === 0) {
      c.note = `table ${src.table} not found, skipped`;
      continue;
    }
    const have = new Set(cols.map((r) => r.column_name));

    const select = [];
    const picked = {};
    for (const [field, candidates] of Object.entries(src.fields)) {
      picked[field] = candidates.filter((col) => have.has(col));
      picked[field].forEach((col, i) => select.push(`${quoteIdent(col)}::text AS ${quoteIdent(`${field}__${i}`)}`));
    }
    const createdCol = CREATED_AT_CANDIDATES.find((col) => have.has(col));
    if (createdCol) select.push(`${quoteIdent(createdCol)} AS "created_at__0"`);

    if (picked.email.length === 0) {
      const { rows } = await client.query(`SELECT count(*)::int AS n FROM ${quoteIdent(src.table)}`);
      c.read = rows[0].n;
      c.no_valid_email = rows[0].n;
      c.note = "no email column in this table";
      continue;
    }

    const order = createdCol ? ` ORDER BY ${quoteIdent(createdCol)} ASC NULLS LAST` : "";
    const { rows } = await client.query(`SELECT ${select.join(", ")} FROM ${quoteIdent(src.table)}${order}`);

    for (const row of rows) {
      c.read++;
      const pick = (field) => {
        for (let i = 0; i < picked[field].length; i++) {
          const v = clean(row[`${field}__${i}`]);
          if (v) return v;
        }
        return clean(src.literal[field]);
      };
      const email = pick("email").toLowerCase();
      if (!EMAIL_RE.test(email)) {
        c.no_valid_email++;
        continue;
      }
      if (seen.has(email)) {
        c.duplicate++;
        continue;
      }
      seen.add(email);
      const created = row.created_at__0;
      out.push({
        source: src.source,
        company_name: pick("company_name"),
        contact_name: pick("contact_name"),
        email,
        phone: pick("phone"),
        country: pick("country"),
        city: pick("city"),
        created_at: created instanceof Date ? created.toISOString() : clean(created),
      });
      c.written++;
    }
  }

  await client.query("ROLLBACK");
} catch (err) {
  // Message and code only: no rows, no connection string.
  console.error(`Export failed: ${err.code ? `[${err.code}] ` : ""}${err.message}`);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}

if (process.exitCode !== 1) {
  const csv = [CSV_COLUMNS.join(","), ...out.map((r) => CSV_COLUMNS.map((k) => csvCell(r[k])).join(","))].join("\n") + "\n";
  writeFileSync(outPath, csv, { mode: 0o600 });

  console.log("source                    read  no_valid_email  duplicate  written");
  for (const [name, c] of Object.entries(counts)) {
    console.log(
      `${name.padEnd(24)}${String(c.read).padStart(6)}${String(c.no_valid_email).padStart(16)}${String(c.duplicate).padStart(11)}${String(c.written).padStart(9)}${c.note ? `   (${c.note})` : ""}`,
    );
  }
  console.log(`total unique emails written: ${out.length}`);
  console.log(`file: ${outPath}`);
}
