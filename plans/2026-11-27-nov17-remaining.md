# Nov 17 roadmap: the items not started yet (2026-11-27)

Branch `feat/nov17-remaining`. No database change: everything uses tables and rules already live
(`standard_rates`, quick booking without a listing, from `20261121120000_roadmap_nov17.sql`).

## 1. Specialised certificates section
- The service store keeps only physical inspections: PSI, loading and unloading, container stuffing, destination.
- New section below it, "Specialised certificates": ECTN, CoC, Customs Import Control.
  Each card shows one customer price across India (standard rate x 1.3) and a Book button.
- Booking opens a short form (commodity, port or city, volume, shipment date, buyer, seller) and creates a
  quick order with no listing. The database prices it at the standard rate; the Qualty team assigns a company.

## 2. Buyer and seller verification, highlighted
- A highlighted band on the services page: "Verify a buyer or seller before you ship".
- The form asks who you are checking (buyer or seller), the company name, country, registration or tax number,
  contact person, email and phone. It creates a quick order for "Buyer & Seller Verification" at its standard
  rate, and the order's chatroom opens. Legal documents are uploaded in the chatroom: the database only lets files
  into a room after payment, so the form says what to have ready.

## 3. Website gap found while checking
- The database already accepts a quick booking with no company for standard-rate services, but the website blocked it
  ("Pick an inspection company"). Allow it for services that have a standard rate.
- Add Buyer & Seller Verification ($60, placeholder until Vinay confirms) to the browser-side rates, matching the database.

## 4. Scanning in the chat
- A Scan button in the chatroom composer, disabled, marked "Soon", with a tooltip "Scanning is coming soon".

## 5. Service page copy
- Store heading says it is for physical inspections; certificates and verification get their own plain copy.

## Checks
tsc, eslint, vitest, the Playwright suites (company, flows, a11y), screenshots at 1280 and 390.
Then PR to CargofirstQaho/QualtyAI; merging deploys to qualty.ai via Vercel.
