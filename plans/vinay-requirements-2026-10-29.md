# Qualty.AI — Vinay's requirements (29 Oct 2026): status and build plan

## Where things stand today

The `web/` app is a single marketing page (`web/src/app/page.tsx`). Nothing in it calls an API:
- No `fetch` or axios calls anywhere in `web/src`.
- Login, KYC and booking are simulated with `setTimeout`. Booking IDs come from `Math.random`.
- Evidence Vault photos are 4 hardcoded Unsplash images.

The `server/` Express API has older register/login routes for customers, inspectors and companies, plus `POST /inquiries`.
- Nothing in `web/` uses it.
- It has no bids, uploads, chat or reports.

| Requirement | Status | What exists |
|---|---|---|
| Quick Inspection Booking | UI only | `BookingModal.tsx` "quick" mode. Shows a fake confirmation and saves nothing |
| Raise Enquiry, get multiple bids | UI only | `BookingModal.tsx` "inquiry" mode just *says* bids will appear. No bids table, no bid flow, no dashboard |
| Buyer/Seller Verification | Missing | Only a "Sandbox KYC" badge for the user signing up. Can't verify a counterparty |
| Contracts (Coming Soon) | Done (badge) | Locked card in `DualPipeline.tsx` |
| Calibrator: change specs, see which **market** suits | Partly | `CommodityCalibrator.tsx` gives a grade (Export A / Grade B / reject) for 6 commodities. Doesn't map quality to markets |
| Save specs under buyer/reference name, reuse at next booking | UI only | "Save Current as Buyer Spec" works in memory and is lost on refresh. The booking modal never shows saved specs |
| Evidence Vault: history, photos/videos, date-time-GPS watermark | UI only | Mock gallery with the watermark drawn in CSS. No upload, no video, no real watermark burned into files, no storage |
| Inspection Copilot: summary report (quality + truck/container dispatch) | Partly (demo) | `QualityPilot.tsx` builds a text brief from form inputs. No per-truck or per-container dispatch log |
| Copilot: inspector observations | Partly (demo) | One observation field in the demo form |
| Copilot: flags (quality deviation, missing items) | Missing | No deviation check against the booked spec, no missing-item checklist |
| Subcontracting (Coming Soon) | Missing | Not on the page |
| Quality Scorecard (Coming Soon) | Missing | Not on the page |
| Our own chatroom per order | Missing | Nothing |
| Group auto-created on order (customer + inspection co + admin) | Missing | Nothing |
| Chat reports → Vault + auto summary at inspection end | Missing | Nothing |

**Bottom line:** the page shows the product idea well, but none of the actual working features exist yet. The chatroom, which Vinay calls the core of the product, doesn't exist at all.

## Build plan

The order follows the data each step needs. Each phase can ship on its own.

### Phase 0: decisions (before writing code)
1. **Backend.** Keep the old Express + Postgres `server/`, or move to Supabase like CargoFirst/blinkus? Supabase gives us auth, Postgres with RLS, Realtime (chat) and Storage (evidence) out of the box. **Recommended: Supabase**, and retire `server/`.
2. **Roles:** customer (buyer/seller), inspection company, inspector, admin.
3. **Mobile:** inspectors capture photos on site. Is a mobile web app (PWA with the camera) enough for v1, or does it need a native app?

### Phase 1: real accounts and orders
- Auth with roles and company membership. Replaces `AuthModal`'s sandbox flow.
- Tables: `orders` (order number, type quick/enquiry, commodity, spec snapshot, buyer/seller names, location, dates, status), `companies`, `profiles`.
- Quick Inspection writes a real order and assigns an inspection company (admin assigns at first).
- **Coming Soon cards:** add Subcontracting and Quality Scorecard next to Contracts.

### Phase 2: enquiries and bidding
- `enquiries` and `bids` tables. Inspection companies see open enquiries and submit price, timeline and scope.
- The customer compares bids side by side, accepts one, and that turns into an order. Notify by email first, WhatsApp later.

### Phase 3: saved specs and Calibrator v2
- `saved_specs` table (owner, buyer/reference name, commodity, params).
- Saving happens from the Calibrator **and** when an order is placed. The booking modal gets a "Use saved spec" picker.
- Market fit: a `market_standards` table (market → commodity → tolerance limits). The Calibrator lists the markets the current spec passes and highlights the failing parameter for the others. **We need the real market standards from Vinay.**

### Phase 4: order chatroom (core)
- When an order is created, a database trigger creates a `chat_room` for the order. Members: customer, the assigned inspection company's users, and the admin team.
- Messages: text, photo/video, plus structured "report" messages (observation, loading tally, flag).
- Supabase Realtime for live updates. RLS so only room members can read a room. Admin sees all rooms.
- Unread counts and notifications.

### Phase 5: Evidence Vault (real)
- Media uploaded in the chat goes to Storage. On capture the app records GPS and the server timestamp. Inspectors capture in the app, not from the gallery, so the stamp can't be faked.
- A server-side job burns a date/time/GPS/order-no watermark into a copy. The original and its SHA-256 hash are kept as proof.
- Vault page: per-order history, filter by date, commodity or buyer, download an evidence pack (zip + PDF index).

### Phase 6: Inspection Copilot (real)
- Inspector console in the order: dispatch log (truck or container no., seal, bags/weight, time), observations, checklist.
- Auto-flags:
  - a reading outside the spec booked on the order (quality deviation);
  - a checklist item or required photo not captured (missing items).
  The flag is posted into the chat.
- When the inspection is marked complete, an LLM writes a summary from the chat reports, dispatch log, flags and evidence. It's saved as a PDF to the Vault and posted in the chat for the customer to see.

### Later
Buyer/Seller Verification (company registry/GST/IEC checks, plus trade history from completed orders), Contracts, Subcontracting, Quality Scorecard (built from flags and deviations per seller/inspector).

## Questions for Vinay
1. Buyer/Seller Verification: what exactly gets checked (GST, IEC, bank, site visit), and is it a paid service?
2. Market standards for the Calibrator: which markets and commodities first, and where do the limits come from?
3. Bids: who can bid (only verified companies?), and how long does an enquiry stay open?
4. Does the admin team need to *post* in every chatroom, or only monitor?
5. Report format: is there an existing summary/certificate template to match?
