import { expect, test, type Browser, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import path from "node:path";

// Full flow against the real Supabase project, as real users in separate browsers:
// an inspection company owner, its inspector, a customer and a Qualty admin.
// Everything it creates is deleted at the end, including the throwaway admin.

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const secret = process.env.SUPABASE_SECRET_KEY!;
const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
test.skip(!url || !secret || !publishable, "needs NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY and SUPABASE_SECRET_KEY");

const admin = createClient(url || "http://unset", secret || "unset", { auth: { persistSession: false } });
const tag = Date.now().toString(36);
const PASSWORD = `Qa-${tag}-pass!`;
const email = (who: string) => `qualty-e2e+${who}-${tag}@example.com`;
const COMPANY = `E2E Surveyors ${tag}`;
const userIds: string[] = [];

async function makeUser(who: string, role: "customer" | "company") {
  const { data, error } = await admin.auth.admin.createUser({
    email: email(who),
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: `E2E ${who}`, role },
  });
  if (error) throw error;
  userIds.push(data.user.id);
  return data.user.id;
}

/** A throwaway Qualty team member: only admins confirm payments and see both prices. */
async function makeAdmin(who: string) {
  const id = await makeUser(who, "customer");
  const { error } = await admin.from("profiles").update({ role: "admin" }).eq("id", id);
  if (error) throw error;
}

/** Signs in on the booking site. Companies and admins are then sent on to /dashboard. */
async function signedIn(browser: Browser, who: string) {
  const ctx = await browser.newContext({ geolocation: { latitude: 22.7441, longitude: 69.7042 }, permissions: ["geolocation"] });
  const page = await ctx.newPage();
  await page.goto("/");
  await page.locator("header").first().getByRole("button", { name: "Sign in" }).click();
  const dlg = page.getByRole("dialog", { name: "Sign in to Qualty" });
  await dlg.getByLabel("Email").fill(email(who));
  await dlg.getByLabel("Password").fill(PASSWORD);
  await dlg.getByRole("button", { name: "Sign in" }).click();
  await expect(dlg).toBeHidden();
  await expect(page.locator("header").first().getByRole("button", { name: "Sign out" })).toBeVisible();
  return page;
}

async function asUser(who: string) {
  const client = createClient(url, publishable, { auth: { persistSession: false } });
  const { error } = await client.auth.signInWithPassword({ email: email(who), password: PASSWORD });
  if (error) throw error;
  return client;
}

/** The /dashboard workspace. */
const consoleOf = (p: Page) => p.locator("#company");
const tab = (p: Page, name: string) => consoleOf(p).getByRole("tab", { name, exact: true }).click();
/** The customer's order rooms on the booking site. */
const roomOf = (p: Page) => p.locator("#orders");
/** A room in the /rooms chat window, where companies and the Qualty team chat. */
const windowRoom = (p: Page) => p.locator("main.cw-room");
const openWindowRoom = async (p: Page, orderId: string) => {
  await p.goto(`/rooms?order=${encodeURIComponent(orderId)}`);
  return windowRoom(p);
};
/** The Qualty team tab's row for one order. */
const marginRow = (p: Page, ref: string) =>
  consoleOf(p).locator("div", { has: p.getByText(ref, { exact: true }) }).filter({ has: p.getByText("Company price") }).last();

const orderId = async (customerId: string, mode: "quick" | "inquiry") => {
  const { data, error } = await admin.from("orders").select("id").eq("customer_id", customerId).eq("mode", mode).single();
  if (error) throw error;
  return data.id as string;
};

test.afterAll(async () => {
  // Orders cascade to bids, messages, evidence, invoices; companies cascade to members, listings, docs.
  const { data: companies } = await admin.from("companies").select("id").in("created_by", userIds);
  const { data: orders } = await admin.from("orders").select("id").in("customer_id", userIds);
  for (const o of orders ?? []) {
    const { data: files } = await admin.storage.from("evidence").list(o.id);
    if (files?.length) await admin.storage.from("evidence").remove(files.map((f) => `${o.id}/${f.name}`));
  }
  for (const c of companies ?? []) {
    for (const folder of ["kyc", "certificates", "compliance"]) {
      const { data: files } = await admin.storage.from("company-docs").list(`${c.id}/${folder}`);
      if (files?.length) await admin.storage.from("company-docs").remove(files.map((f) => `${c.id}/${folder}/${f.name}`));
    }
  }
  await admin.from("orders").delete().in("customer_id", userIds);
  await admin.from("companies").delete().in("created_by", userIds);
  for (const id of userIds) await admin.auth.admin.deleteUser(id);
});

test("company, quick booking, Qualty-confirmed payments, inspection, certificates and negotiation on the real backend", async ({ browser }) => {
  await makeUser("owner", "company");
  const customerId = await makeUser("customer", "customer");
  await makeAdmin("qualty");

  // ---- Company owner sets up the company on /dashboard, a store listing and invites an inspector ----
  const owner = await signedIn(browser, "owner");
  await expect(owner).toHaveURL(/\/dashboard$/);
  const oc = consoleOf(owner);
  await oc.getByLabel("Company name").fill(COMPANY);
  await oc.getByLabel("Your name").fill("E2E owner");
  await oc.getByLabel("Email").fill(email("owner"));
  await oc.getByRole("button", { name: "Create company" }).click();
  await expect(oc.getByRole("tab", { name: "Enquiries" })).toBeVisible();

  await tab(owner, "Service store");
  await oc.getByLabel("Port or city").fill("Mundra");
  await oc.getByLabel("Commodities (comma separated, blank = any)").fill("Rice");
  await oc.getByLabel("Price (USD)").fill("800");
  await oc.getByLabel("Discount %").fill("25");
  await oc.getByLabel("Available from").fill("2026-11-01");
  await oc.getByLabel("Available until").fill("2026-12-31");
  await expect(oc.getByText("You get $600. Customers see $780 (includes Qualty's 30%)")).toBeVisible();
  await oc.getByRole("button", { name: "Add listing" }).click();
  await expect(oc.getByText(/\$600 \(25% off \$800\), customers see \$780/)).toBeVisible();

  await tab(owner, "Team");
  await oc.getByLabel("Name", { exact: true }).fill("E2E inspector");
  await oc.getByLabel("Email", { exact: true }).fill(email("inspector"));
  await oc.locator("form").getByRole("combobox").first().selectOption("inspector");
  await oc.getByRole("button", { name: "Send invite" }).click();
  await expect(oc.getByText(/joins the team when they sign up/)).toBeVisible();

  // The inspector signs up with the invited email and joins automatically.
  await makeUser("inspector", "customer");

  // ---- Customer books a quick inspection from the store, at the customer price ----
  const customer = await signedIn(browser, "customer");
  await customer.getByRole("button", { name: "Book Inspection with These Specs" }).click();
  const dialog = customer.getByRole("dialog", { name: "Book Cargo Inspection" });
  await dialog.getByRole("button", { name: "Next: Schedule & Budget" }).click();
  await expect(dialog.getByRole("radio", { name: new RegExp(COMPANY) })).toBeChecked();
  await dialog.getByRole("button", { name: "Next: Your details" }).click();
  await dialog.getByLabel("Buyer", { exact: true }).fill("Al-Khaleej Foods");
  await dialog.getByLabel("Seller", { exact: true }).fill("Punjab Rice Mills");
  await dialog.getByRole("button", { name: "Book inspection" }).click();
  const ref = (await dialog.getByText(/^QI-\d{4}-[0-9A-F]{6}$/).textContent())!;
  await dialog.getByRole("button", { name: "Open order chatroom" }).click();
  const croom = roomOf(customer);
  await expect(croom.getByRole("heading", { name: ref })).toBeVisible();
  await expect(croom.getByText("You're in this room as Customer")).toBeVisible();
  const quickId = await orderId(customerId, "quick");

  // ---- Pay to open the room: invoiced at $780, the customer sends a reference, Qualty confirms ----
  await expect(croom.getByRole("heading", { name: "Waiting for payment" })).toBeVisible();
  await expect(croom.getByRole("region", { name: "Payment" })).toContainText("$780");
  await expect(croom.getByRole("log")).toHaveCount(0);
  await croom.getByLabel("Payment reference").fill("UTR-E2E-0001");
  await croom.getByRole("button", { name: "I have paid" }).click();
  await expect(croom.getByText(/You sent payment reference UTR-E2E-0001\./)).toBeVisible();

  // The company sees its own price and the payout status, never the customer's figure, and can't record payments.
  await owner.reload();
  await tab(owner, "Orders");
  await expect(oc.getByText(ref)).toBeVisible();
  await tab(owner, "Payouts");
  await expect(oc.getByText("Waiting for the customer's payment")).toBeVisible();
  await expect(oc.getByRole("tabpanel")).toContainText("$600");
  await expect(oc.getByRole("tabpanel")).not.toContainText("$780");
  await expect(oc.getByRole("tab", { name: "Qualty team", exact: true })).toHaveCount(0);
  await expect(oc.getByRole("button", { name: "Record payment" })).toHaveCount(0);

  // The Qualty admin sees both prices and records the payment against the invoice.
  const qualty = await signedIn(browser, "qualty");
  await expect(qualty).toHaveURL(/\/dashboard$/);
  await tab(qualty, "Qualty team");
  const row = marginRow(qualty, ref);
  await expect(row).toContainText("$600");
  await expect(row).toContainText("$780");
  await expect(row).toContainText("UTR-E2E-0001");
  await row.getByRole("button", { name: "Record payment" }).click();
  await row.getByLabel("Amount (USD)").fill("900");
  await row.getByRole("button", { name: "Record payment" }).click();
  await expect(row.getByRole("alert")).toHaveText("Only $780 is left to pay on this invoice.");
  await row.getByLabel("Amount (USD)").fill("780");
  await row.getByRole("button", { name: "Record payment" }).click();
  await expect(row.getByText("Paid", { exact: true })).toBeVisible();

  await owner.reload();
  await tab(owner, "Payouts");
  await expect(oc.getByText("Customer paid, payout due")).toBeVisible();

  await customer.reload();
  await customer.locator("#orders nav").getByRole("button", { name: new RegExp(ref) }).click();
  await expect(croom.getByText(/^Payment confirmed\. Chatroom opened/)).toBeVisible();
  await expect(croom.getByText("Order booked. Invoice sent; the chatroom opens once payment is confirmed.")).toBeVisible();
  // Customers can't post inspection reports.
  await expect(croom.getByRole("tab", { name: "Observation" })).toHaveCount(0);

  // ---- Inspector works from /dashboard and the /rooms chat window ----
  const inspector = await signedIn(browser, "inspector");
  await expect(inspector).toHaveURL(/\/dashboard$/);
  const iroom = await openWindowRoom(inspector, quickId);
  await expect(iroom.getByRole("heading", { name: ref })).toBeVisible();
  await expect(iroom.getByText("You're in this room as Inspector")).toBeVisible();
  await iroom.getByRole("tab", { name: "Observation" }).click();
  await iroom.getByLabel("Broken %", { exact: true }).fill("4");
  await iroom.getByLabel("Live insects", { exact: true }).fill("1");
  await iroom.getByLabel("Message", { exact: true }).fill("Hold 3 slight musty odour");
  await iroom.getByRole("button", { name: "Send" }).click();
  await expect(iroom.getByText("Quality deviation: Live insects found (1); the booked spec allows 0.")).toBeVisible();
  await expect(iroom.getByText("Inspection started.")).toBeVisible();

  await iroom.getByRole("tab", { name: "Photo or video" }).click();
  await iroom.locator('input[type="file"]').setInputFiles(path.join(__dirname, "..", "seal.png"));
  await iroom.getByLabel("Message", { exact: true }).fill("Seal photo hold 3");
  await iroom.getByRole("button", { name: "Send" }).click();
  await expect(iroom.getByRole("log").getByRole("img", { name: "Seal photo hold 3" })).toBeVisible();

  await iroom.getByRole("button", { name: "Close inspection and write summary" }).click();
  await expect(iroom.locator("pre")).toContainText(`INSPECTION SUMMARY — ${ref}`);
  await expect(iroom.getByText("Inspection marked complete.")).toBeVisible();

  // The customer sees the inspector's work, including the photo from storage.
  await customer.reload();
  await expect(croom.getByText("Critical flag · Quality deviation: Live insects found (1); the booked spec allows 0.")).toBeVisible();
  await expect(croom.getByRole("log").getByRole("img", { name: "Seal photo hold 3" })).toBeVisible();
  await expect(customer.locator("#vault").getByText("Seal photo hold 3")).toBeVisible();

  // ---- Owner issues a certificate ----
  await owner.reload();
  await tab(owner, "Certificates");
  await oc.getByLabel("Type").selectOption("Certificate of quality");
  await oc.getByLabel("For order (optional)").selectOption({ index: 1 });
  await oc.getByRole("button", { name: "Issue certificate" }).click();
  const certNumber = (await oc.getByText(/^COQ-\d{4}-0001-[0-9A-F]{4}$/).textContent())!;
  const code = (await oc.locator("span.font-mono").filter({ hasText: /^[0-9A-Z]{5}-[0-9A-Z]{5}$/ }).first().textContent())!;
  await oc.getByLabel("Certificate number or check code").fill(code);
  await oc.getByRole("button", { name: "Check", exact: true }).click();
  await expect(oc.getByRole("status")).toContainText(`${certNumber}, issued by ${COMPANY}`);

  // Anyone, even signed out, can check the code and browse the store, which shows customer prices only.
  const anon = createClient(url, publishable, { auth: { persistSession: false } });
  const { data: check } = await anon.rpc("verify_certificate", { code });
  expect(check?.[0]?.number).toBe(certNumber);
  const { data: store } = await anon.rpc("browse_listings");
  const listing = store?.find((l: { company_name: string }) => l.company_name === COMPANY);
  expect(Number(listing?.price_usd)).toBe(780);
  expect(Number(listing?.discount_pct)).toBe(0);
  const { data: anonOrders } = await anon.from("orders").select("id");
  expect(anonOrders ?? []).toEqual([]);
  const { data: anonFigures } = await anon.rpc("order_figures");
  expect(anonFigures ?? []).toEqual([]);

  // ---- Enquiry: bid with discount, counter-offer, accept; each side sees its own price ----
  await customer.getByRole("button", { name: "Book Inspection with These Specs" }).click();
  await dialog.getByRole("button", { name: /Raise an Inquiry/ }).click();
  await dialog.getByRole("button", { name: "Next: Schedule & Budget" }).click();
  await dialog.getByRole("button", { name: "Next: Your details" }).click();
  await dialog.getByLabel("Buyer", { exact: true }).fill("Al-Khaleej Foods");
  await dialog.getByLabel("Seller", { exact: true }).fill("Punjab Rice Mills");
  await dialog.getByRole("button", { name: "Publish enquiry for bids" }).click();
  const enquiry = (await dialog.getByText(/^RI-\d{4}-[0-9A-F]{6}$/).textContent())!;
  await dialog.getByRole("button", { name: "Open order chatroom" }).click();
  const enquiryId = await orderId(customerId, "inquiry");

  // The company finds it under Enquiries; the bid room opens in its own tab.
  await owner.reload();
  await tab(owner, "Enquiries");
  const [bidPage] = await Promise.all([
    owner.waitForEvent("popup"),
    oc.locator("div", { hasText: enquiry }).getByRole("link", { name: "Place a bid" }).last().click(),
  ]);
  const oroom = windowRoom(bidPage);
  await expect(oroom.getByRole("heading", { name: enquiry })).toBeVisible();
  await expect(oroom.getByLabel("Your company")).toHaveCount(0);
  // Bidding companies see the job, never the buyer, seller or customer.
  await expect(oroom.getByText("Buyer, seller and customer details are shared only with the company whose bid is accepted.")).toBeVisible();
  await expect(oroom.getByText("Al-Khaleej Foods")).toHaveCount(0);
  const asOwner = await asUser("owner");
  const { data: leaked } = await asOwner.from("orders").select("buyer_name").eq("mode", "inquiry");
  expect(leaked).toEqual([]);
  const { data: jobs } = await asOwner.rpc("open_enquiries");
  expect(jobs?.length).toBeGreaterThan(0);
  expect(Object.keys(jobs![0])).not.toContain("buyer_name");
  await oroom.getByLabel("Price in USD").fill("2000");
  await oroom.getByLabel("Days").fill("3");
  await oroom.getByLabel("Proposed inspection date").fill("2026-11-20");
  await oroom.getByRole("button", { name: "Submit bid" }).click();
  await expect(oroom.getByText(/inspects 2026-11-20/)).toBeVisible();

  // The customer sees the bid with the margin in it, and counters in their own terms.
  await customer.reload();
  await customer.locator("#orders nav").getByRole("button", { name: new RegExp(enquiry) }).click();
  await expect(croom.getByText("$2,600").first()).toBeVisible();
  await croom.getByRole("button", { name: "Counter-offer" }).click();
  await croom.getByLabel("Offer in USD").fill("1500");
  await croom.getByRole("button", { name: "Send offer" }).click();
  await expect(croom.getByText("You asked for $1,500")).toBeVisible();

  // The $1,500 reaches the company on company terms: 1500 / 1.3.
  await bidPage.reload();
  await expect(oroom.getByText("Customer asked for $1,154")).toBeVisible();
  await oroom.getByRole("button", { name: "Give a discount" }).click();
  await oroom.getByLabel("Discount on this bid in percent").fill("10");
  await oroom.getByRole("button", { name: "Apply discount" }).click();
  await expect(oroom.getByText(/\$1,800/).first()).toBeVisible();

  await customer.reload();
  await customer.locator("#orders nav").getByRole("button", { name: new RegExp(enquiry) }).click();
  await expect(croom.getByText("$2,340").first()).toBeVisible();
  await croom.getByRole("button", { name: "Accept bid" }).click();
  await expect(croom.getByRole("heading", { name: "Waiting for payment" })).toBeVisible();
  await expect(croom.getByRole("region", { name: "Payment" })).toContainText("$2,340");
  await croom.getByLabel("Payment reference").fill("UTR-E2E-0002");
  await croom.getByRole("button", { name: "I have paid" }).click();

  // The winning company can read the parties now, but only the Qualty team confirms the payment.
  await bidPage.reload();
  await expect(oroom.getByText(/Al-Khaleej Foods/).first()).toBeVisible();
  await expect(oroom.getByRole("button", { name: "Confirm payment received" })).toHaveCount(0);
  const qroom = await openWindowRoom(qualty, enquiryId);
  await expect(qroom.getByText(/ref UTR-E2E-0002/)).toBeVisible();
  await qroom.getByRole("button", { name: "Confirm payment received" }).click();
  await expect(qroom.getByText(/^Payment confirmed\. Chatroom opened/)).toBeVisible();
  await expect(qroom.getByText("Bid accepted. Invoice sent; the chatroom opens once payment is confirmed.")).toBeVisible();

  const { data: booked } = await admin.from("orders").select("status, price_usd, customer_price_usd").eq("id", enquiryId).single();
  expect(booked).toMatchObject({ status: "booked", price_usd: 1800, customer_price_usd: 2340 });
  const { data: inv } = await admin.from("invoices").select("amount_usd").eq("order_id", enquiryId).single();
  expect(Number(inv?.amount_usd)).toBe(2340);

  // ---- The database refuses what the screens hide ----
  const asCustomer = await asUser("customer");
  // Money columns are column-revoked; each side reads its own figure through order_figures().
  const { error: custReadsCompanyPrice } = await asCustomer.from("orders").select("price_usd").eq("id", enquiryId);
  expect(custReadsCompanyPrice).not.toBeNull();
  const { error: ownerReadsCustomerPrice } = await asOwner.from("orders").select("customer_price_usd").eq("id", enquiryId);
  expect(ownerReadsCustomerPrice).not.toBeNull();
  const { data: custFigures } = await asCustomer.rpc("order_figures");
  expect(custFigures?.find((f: { order_id: string }) => f.order_id === enquiryId)).toMatchObject({ price_usd: null, customer_price_usd: 2340 });
  const { data: ownerFigures } = await asOwner.rpc("order_figures");
  expect(ownerFigures?.find((f: { order_id: string }) => f.order_id === enquiryId)).toMatchObject({ price_usd: 1800, customer_price_usd: null });

  // Only admins confirm payments or set customer prices.
  const { data: ownerInvoice } = await asOwner.from("invoices").select("id").eq("order_id", enquiryId);
  expect(ownerInvoice ?? []).toEqual([]);
  const { error: ownerPays } = await asOwner.rpc("set_customer_price", { oid: quickId, price: 9999 });
  expect(ownerPays).not.toBeNull();
  const { error: payErr } = await anon.rpc("mark_payment_sent", { oid: "00000000-0000-0000-0000-000000000000", ref: "anon" });
  expect(payErr).not.toBeNull();

  const { error: priceErr } = await asCustomer.from("orders").update({ price_usd: 1 }).eq("customer_id", customerId);
  expect(priceErr).not.toBeNull();
  const { data: others } = await asCustomer.from("kyc_docs").select("id");
  expect(others).toEqual([]);
  // Standard rates are for companies and the Qualty team, not customers.
  const { data: rates } = await asCustomer.from("standard_rates").select("service");
  expect(rates).toEqual([]);
});
