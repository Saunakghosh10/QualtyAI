import { expect, test, type Browser, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import path from "node:path";

// Full flow against the real Supabase project, as three real users in separate browsers.
// Everything it creates is deleted at the end.

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

const consoleOf = (p: Page) => p.locator("#company");
const roomOf = (p: Page) => p.locator("#orders");

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

test("company, quick booking, inspection, payments, certificates and negotiation on the real backend", async ({ browser }) => {
  await makeUser("owner", "company");
  const customerId = await makeUser("customer", "customer");

  // ---- Company owner sets up the company, a store listing and invites an inspector ----
  const owner = await signedIn(browser, "owner");
  const oc = consoleOf(owner);
  await oc.getByLabel("Company name").fill(COMPANY);
  await oc.getByLabel("Your name").fill("E2E owner");
  await oc.getByLabel("Email").fill(email("owner"));
  await oc.getByRole("button", { name: "Create company" }).click();
  await expect(oc.getByText(COMPANY, { exact: true })).toBeVisible();
  await expect(oc.getByText("You: E2E owner (Owner)")).toBeVisible();

  await oc.getByRole("tab", { name: "Service store" }).click();
  await oc.getByLabel("Port or city").fill("Mundra");
  await oc.getByLabel("Commodities (comma separated, blank = any)").fill("Rice");
  await oc.getByLabel("Price (USD)").fill("800");
  await oc.getByLabel("Discount %").fill("25");
  await oc.getByLabel("Available from").fill("2026-11-01");
  await oc.getByLabel("Available until").fill("2026-12-31");
  await oc.getByRole("button", { name: "Add listing" }).click();
  await expect(oc.getByText(/\$600 \(25% off \$800\)/)).toBeVisible();

  await oc.getByRole("tab", { name: "Team" }).click();
  await oc.getByLabel("Name", { exact: true }).fill("E2E inspector");
  await oc.getByLabel("Email", { exact: true }).fill(email("inspector"));
  await oc.locator("form").getByRole("combobox").first().selectOption("inspector");
  await oc.getByRole("button", { name: "Send invite" }).click();
  await expect(oc.getByText(/joins the team when they sign up/)).toBeVisible();

  // The inspector signs up with the invited email and joins automatically.
  await makeUser("inspector", "customer");

  // ---- Customer books a quick inspection from the store ----
  const customer = await signedIn(browser, "customer");
  await customer.getByRole("button", { name: "Book Inspection with These Specs" }).click();
  const dialog = customer.getByRole("dialog", { name: "Book Cargo Inspection" });
  await dialog.getByRole("button", { name: "Next: Schedule & Budget" }).click();
  await expect(dialog.getByRole("radio", { name: new RegExp(COMPANY) })).toBeChecked();
  await expect(dialog.getByText("Qualty partner surveyors")).toHaveCount(0);
  await dialog.getByRole("button", { name: "Next: Your details" }).click();
  await dialog.getByLabel("Buyer", { exact: true }).fill("Al-Khaleej Foods");
  await dialog.getByLabel("Seller", { exact: true }).fill("Punjab Rice Mills");
  await dialog.getByRole("button", { name: "Book inspection" }).click();
  const ref = (await dialog.getByText(/^QI-\d{4}-[0-9A-F]{6}$/).textContent())!;
  await dialog.getByRole("button", { name: "Open order chatroom" }).click();
  const croom = roomOf(customer);
  await expect(croom.getByRole("heading", { name: ref })).toBeVisible();
  await expect(croom.getByText(`Members: E2E customer (Customer), ${COMPANY} (Inspection company), Qualty admin team`)).toBeVisible();
  await expect(croom.getByText("Order booked. Chatroom opened.")).toBeVisible();
  await expect(croom.getByText("You're in this room as Customer")).toBeVisible();
  // Customers can't post inspection reports.
  await expect(croom.getByRole("tab", { name: "Observation" })).toHaveCount(0);

  // ---- Inspector reports, uploads a photo and closes the inspection ----
  const inspector = await signedIn(browser, "inspector");
  const iroom = roomOf(inspector);
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

  // ---- Owner invoices, records payment and issues a certificate ----
  await owner.reload();
  await oc.getByRole("tab", { name: "Orders" }).click();
  await expect(oc.getByText(ref)).toBeVisible();
  await oc.getByRole("tab", { name: "Payments" }).click();
  await oc.getByRole("button", { name: "Raise invoice" }).click();
  await expect(oc.getByLabel("Amount (USD)")).toHaveValue("600");
  await oc.getByLabel("Due on").fill("2099-01-01");
  await oc.getByRole("button", { name: "Raise invoice" }).click();
  await expect(oc.getByText("Unpaid")).toBeVisible();
  await oc.getByRole("button", { name: "Record payment" }).click();
  await oc.getByLabel("Amount (USD)").fill("600");
  await oc.getByRole("button", { name: "Record payment" }).click();
  await expect(oc.getByText("Paid", { exact: true })).toBeVisible();

  await oc.getByRole("tab", { name: "Certificates" }).click();
  await oc.getByLabel("Type").selectOption("Certificate of quality");
  await oc.getByLabel("For order (optional)").selectOption({ index: 1 });
  await oc.getByRole("button", { name: "Issue certificate" }).click();
  const certNumber = (await oc.getByText(/^COQ-\d{4}-0001-[0-9A-F]{4}$/).textContent())!;
  const code = (await oc.locator("span.font-mono").filter({ hasText: /^[0-9A-Z]{5}-[0-9A-Z]{5}$/ }).first().textContent())!;
  await oc.getByLabel("Certificate number or check code").fill(code);
  await oc.getByRole("button", { name: "Check", exact: true }).click();
  await expect(oc.getByRole("status")).toContainText(`${certNumber}, issued by ${COMPANY}`);

  // Anyone, even signed out, can check the code through the public function.
  const anon = createClient(url, publishable, { auth: { persistSession: false } });
  const { data: check } = await anon.rpc("verify_certificate", { code });
  expect(check?.[0]?.number).toBe(certNumber);

  // ---- Enquiry: bid with discount, counter-offer, accept at the net price ----
  await customer.getByRole("button", { name: "Book Inspection with These Specs" }).click();
  await dialog.getByRole("button", { name: /Raise an Inquiry/ }).click();
  await dialog.getByRole("button", { name: "Next: Schedule & Budget" }).click();
  await dialog.getByRole("button", { name: "Next: Your details" }).click();
  await dialog.getByLabel("Buyer", { exact: true }).fill("Al-Khaleej Foods");
  await dialog.getByLabel("Seller", { exact: true }).fill("Punjab Rice Mills");
  await dialog.getByRole("button", { name: "Publish enquiry for bids" }).click();
  const enquiry = (await dialog.getByText(/^RI-\d{4}-[0-9A-F]{6}$/).textContent())!;
  await dialog.getByRole("button", { name: "Open order chatroom" }).click();

  await owner.reload();
  await oc.getByRole("tab", { name: "Enquiries" }).click();
  await oc.locator("div", { hasText: enquiry }).getByRole("button", { name: "Place a bid" }).last().click();
  const oroom = roomOf(owner);
  await expect(oroom.getByRole("heading", { name: enquiry })).toBeVisible();
  await expect(oroom.getByLabel("Your company")).toHaveCount(0);
  await oroom.getByLabel("Price in USD").fill("2000");
  await oroom.getByLabel("Days").fill("3");
  await oroom.getByRole("button", { name: "Submit bid" }).click();
  await expect(oroom.getByText(COMPANY, { exact: true }).first()).toBeVisible();

  await customer.reload();
  await customer.locator("#orders nav").getByRole("button", { name: new RegExp(enquiry) }).click();
  await croom.getByRole("button", { name: "Counter-offer" }).click();
  await croom.getByLabel("Offer in USD").fill("1500");
  await croom.getByRole("button", { name: "Send offer" }).click();
  await expect(croom.getByText("Customer asked for $1,500")).toBeVisible();

  await owner.reload();
  await owner.locator("#orders nav").getByRole("button", { name: new RegExp(enquiry) }).click();
  await oroom.getByRole("button", { name: "Give a discount" }).click();
  await oroom.getByLabel("Discount on this bid in percent").fill("10");
  await oroom.getByRole("button", { name: "Apply discount" }).click();
  await expect(oroom.getByText(/\$1,800/).first()).toBeVisible();

  await customer.reload();
  await customer.locator("#orders nav").getByRole("button", { name: new RegExp(enquiry) }).click();
  await croom.getByRole("button", { name: "Accept bid" }).click();
  await expect(croom.getByText("Bid accepted. Order booked and chatroom opened.")).toBeVisible();

  const { data: booked } = await admin.from("orders").select("status, price_usd").eq("customer_id", customerId).eq("mode", "inquiry").single();
  expect(booked).toMatchObject({ status: "booked", price_usd: 1800 });

  // ---- The database refuses what the screens hide ----
  const asCustomer = createClient(url, publishable, { auth: { persistSession: false } });
  await asCustomer.auth.signInWithPassword({ email: email("customer"), password: PASSWORD });
  const { error: priceErr } = await asCustomer.from("orders").update({ price_usd: 1 }).eq("customer_id", customerId);
  expect(priceErr).not.toBeNull();
  const { data: others } = await asCustomer.from("kyc_docs").select("id");
  expect(others).toEqual([]);
});
