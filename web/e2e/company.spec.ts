import { expect, test, type Page } from "@playwright/test";
import { bookFromCalibrator, bookingDialog, openRoom, orders, payIfDue, viewAs } from "./helpers";

// Company work happens on /dashboard, customer booking on "/". Demo data lives in localStorage,
// which both pages share (same origin), and in demo mode the dashboard is also the Qualty team.
const dash = (page: Page) => page.locator("#company");
const tab = (page: Page, name: string) => dash(page).getByRole("tab", { name, exact: true }).click();
const store = (page: Page) => page.locator("#services");

async function setUpCompany(page: Page) {
  await page.goto("/dashboard");
  const c = dash(page);
  await c.getByLabel("Company name").fill("Acme Surveyors");
  await c.getByLabel("Your name").fill("Ravi");
  await c.getByLabel("Email").fill("ops@acme.in");
  await c.getByRole("button", { name: "Create company" }).click();
  await expect(c.getByRole("tab", { name: "Enquiries" })).toHaveAttribute("aria-selected", "true");
}

async function addListing(page: Page, fields: { port: string; price: string; discount?: string; commodities?: string; until?: string }) {
  const c = dash(page);
  await tab(page, "Service store");
  await c.getByLabel("Port or city").fill(fields.port);
  if (fields.commodities) await c.getByLabel("Commodities (comma separated, blank = any)").fill(fields.commodities);
  await c.getByLabel("Price (USD)").fill(fields.price);
  if (fields.discount) await c.getByLabel("Discount %").fill(fields.discount);
  await c.getByLabel("Available from").fill("2026-11-01");
  await c.getByLabel("Available until").fill(fields.until ?? "2099-12-31");
}

/** The Qualty team tab's row for one order. */
const marginRow = (page: Page, ref: string) =>
  dash(page).locator("div", { has: page.getByText(ref, { exact: true }) }).filter({ has: page.getByText("Company price") }).last();

test("company store listing is offered in quick booking; Qualty collects the payment", async ({ page }) => {
  await setUpCompany(page);
  const c = dash(page);
  await addListing(page, { port: "Mundra", commodities: "Rice", price: "800", discount: "25", until: "2026-12-31" });
  await c.getByLabel("Surveyors available").fill("3");
  await expect(c.getByText("You get $600. Customers see $780 (includes Qualty's 30%)")).toBeVisible();
  await c.getByRole("button", { name: "Add listing" }).click();
  await expect(c.getByText(/\$600 \(25% off \$800\), customers see \$780/)).toBeVisible();

  // The calibrator books Rice at Mundra on 2026-11-05: Acme should be offered and picked.
  await page.goto("/");
  await page.getByRole("button", { name: "Book Inspection with These Specs" }).click();
  const dialog = bookingDialog(page);
  await dialog.getByRole("button", { name: "Next: Schedule & Budget" }).click();
  await expect(dialog.getByRole("radio", { name: /Acme Surveyors/ })).toBeChecked();
  await expect(dialog.getByRole("radio", { name: /Qualty partner surveyors/ })).not.toBeChecked();
  await dialog.getByRole("button", { name: "Next: Your details" }).click();
  await dialog.getByLabel("Buyer", { exact: true }).fill("Al-Khaleej Foods");
  await dialog.getByLabel("Seller", { exact: true }).fill("Punjab Rice Mills");
  await dialog.getByRole("button", { name: "Book inspection" }).click();
  const id = (await dialog.getByText(/^QI-\d{4}-\d{4}$/).textContent())!;
  await openRoom(page, { pay: false });
  const room = orders(page);
  await expect(room.getByText(/Members: .*Acme Surveyors \(Inspection company\)/)).toBeVisible();
  // Booked orders are invoiced at the customer price; the chatroom stays shut until it is paid.
  await expect(room.getByRole("heading", { name: "Waiting for payment" })).toBeVisible();
  await expect(room.getByRole("region", { name: "Payment" })).toContainText("$780");
  await expect(room.getByRole("log")).toHaveCount(0);
  await room.getByLabel("Payment reference").fill("UTR555");
  await room.getByRole("button", { name: "I have paid" }).click();
  await expect(room.getByText(/You sent payment reference UTR555\./)).toBeVisible();

  // The company sees its own price and payout status, never the customer's figure.
  await page.goto("/dashboard");
  await tab(page, "Orders");
  await expect(c.getByText(id)).toBeVisible();
  await tab(page, "Payouts");
  await expect(c.getByText("Waiting for the customer's payment")).toBeVisible();
  await expect(c.getByRole("tabpanel")).toContainText("$600");
  await expect(c.getByRole("tabpanel")).not.toContainText("$780");

  // The Qualty team records the payment against the invoice.
  await tab(page, "Qualty team");
  const row = marginRow(page, id);
  await expect(row).toContainText("UTR555");
  await row.getByRole("button", { name: "Record payment" }).click();
  await row.getByLabel("Amount (USD)").fill("900");
  await row.getByRole("button", { name: "Record payment" }).click();
  await expect(row.getByRole("alert")).toHaveText("Only $780 is left to pay on this invoice.");
  await row.getByLabel("Amount (USD)").fill("780");
  await row.getByRole("button", { name: "Record payment" }).click();
  await expect(row.getByText("Paid", { exact: true })).toBeVisible();

  await tab(page, "Payouts");
  await expect(c.getByText("Customer paid, payout due")).toBeVisible();

  await page.goto("/");
  await expect(room.getByRole("log")).toBeVisible();
  await expect(room.getByRole("log").getByText(/Payment confirmed\. Chatroom opened/)).toBeVisible();
});

test("30% margin: customers see $780 for a $600 listing, the company only $600, the Qualty team both", async ({ page }) => {
  await setUpCompany(page);
  const c = dash(page);
  await addListing(page, { port: "Mundra", price: "600" });
  await expect(c.getByText("You get $600. Customers see $780 (includes Qualty's 30%)")).toBeVisible();
  await c.getByRole("button", { name: "Add listing" }).click();

  await page.goto("/");
  const s = store(page);
  await s.getByLabel("Port or city").selectOption("Mundra");
  await expect(s.getByText("$780")).toBeVisible();
  await expect(s.getByText("$600")).toHaveCount(0);
  await s.getByRole("button", { name: "Book Acme Surveyors for Pre-Shipment Inspection (PSI) at Mundra" }).click();
  const dialog = bookingDialog(page);
  await dialog.getByRole("button", { name: "Next: Schedule & Budget" }).click();
  await expect(dialog.getByRole("radio", { name: /Acme Surveyors/ })).toBeChecked();
  await dialog.getByRole("button", { name: "Next: Your details" }).click();
  await dialog.getByLabel("Buyer", { exact: true }).fill("Al-Khaleej Foods");
  await dialog.getByLabel("Seller", { exact: true }).fill("Punjab Rice Mills");
  await dialog.getByRole("button", { name: "Book inspection" }).click();
  const id = (await dialog.getByText(/^QI-\d{4}-\d{4}$/).textContent())!;
  await openRoom(page, { pay: false });
  await expect(orders(page).getByRole("region", { name: "Payment" })).toContainText("$780");

  await page.goto("/dashboard");
  await tab(page, "Payouts");
  await expect(c.getByRole("tabpanel")).toContainText("$600");
  await expect(c.getByRole("tabpanel")).not.toContainText("$780");

  await tab(page, "Qualty team");
  const row = marginRow(page, id);
  await expect(row).toContainText(/Company price\s*\$600/);
  await expect(row).toContainText(/Customer price\s*\$780/);
  await expect(row).toContainText(/Margin\s*\$180 \(30%\)/);

  await row.getByRole("button", { name: "Set customer price" }).click();
  await row.getByLabel("Customer price (USD)").fill("500");
  await row.getByRole("button", { name: "Save price" }).click();
  await expect(row.getByRole("alert")).toHaveText("The customer price can't be below the company's $600.");
  await row.getByLabel("Customer price (USD)").fill("820");
  await row.getByRole("button", { name: "Save price" }).click();
  await expect(row).toContainText(/Customer price\s*\$820/);
  await expect(row).toContainText(/Margin\s*\$220 \(37%\)/);
});

test("enquiry budgets show companies their figure: $2,500 is Budget $1,750", async ({ page }) => {
  await setUpCompany(page);
  await page.goto("/");
  await bookFromCalibrator(page, { mode: "inquiry", budget: 2500 });
  await page.goto("/dashboard");
  const c = dash(page);
  // Enquiries is the default tab.
  await expect(c.getByRole("tab", { name: "Enquiries" })).toHaveAttribute("aria-selected", "true");
  await expect(c.getByText("Budget $1,750")).toBeVisible();
  await expect(c.getByRole("tabpanel")).not.toContainText("$2,500");
});

test("enquiry negotiation: prices stay on each side's terms and out of the chat", async ({ page }) => {
  await page.goto("/");
  const id = await bookFromCalibrator(page, { mode: "inquiry", budget: 2500 });
  expect(id).toMatch(/^RI-/);
  await openRoom(page);
  const room = orders(page);
  await expect(room.getByText("Your budget $2,500")).toBeVisible();

  await viewAs(page, "Inspection company");
  await expect(room.getByText("Budget $1,750")).toBeVisible();
  await room.getByLabel("Your company").fill("Acme");
  await room.getByLabel("Price in USD").fill("2000");
  await room.getByLabel("Days").fill("3");
  await room.getByRole("button", { name: "Submit bid" }).click();

  await viewAs(page, "Customer");
  await expect(room.getByText("$2,600")).toBeVisible();
  await room.getByRole("button", { name: "Counter-offer" }).click();
  await room.getByLabel("Offer in USD").fill("1500");
  await room.getByRole("button", { name: "Send offer" }).click();
  await expect(room.getByText("You asked for $1,500")).toBeVisible();

  // The customer's $1,500 reaches the company on company terms: 1500 / 1.3.
  await viewAs(page, "Inspection company");
  await expect(room.getByText("Customer asked for $1,154")).toBeVisible();
  await room.getByRole("button", { name: "Give a discount" }).click();
  await room.getByLabel("Discount on this bid in percent").fill("10");
  await room.getByRole("button", { name: "Apply discount" }).click();
  await expect(room.getByText("$1,800")).toBeVisible();

  await viewAs(page, "Customer");
  await expect(room.getByText("$2,340")).toBeVisible();
  await room.getByRole("button", { name: "Accept bid" }).click();
  await payIfDue(page);
  await expect(room.getByText("Customer accepted Acme's bid. Invoice sent; the chatroom opens once payment is confirmed.")).toBeVisible();
  // Bid, counter, discount, invoice and payment messages never carry a dollar figure.
  await expect(room.getByRole("log")).not.toContainText("$");
});

test("accreditations, certificates and the public check", async ({ page }) => {
  await setUpCompany(page);
  const c = dash(page);

  await tab(page, "Certificates");
  await c.getByLabel("Type").selectOption("Halal certificate");
  await expect(c.getByText(/No valid accreditation .*covers Halal certificate/)).toBeVisible();

  await tab(page, "Accreditations");
  await c.getByLabel("Accreditation or licence").fill("Halal body approval");
  await c.getByLabel("Issued by").fill("ESMA");
  await c.getByLabel("Valid until").fill("2099-01-01");
  await c.getByLabel("Halal certificate").check();
  await c.getByRole("button", { name: "Add accreditation" }).click();
  await expect(c.getByText("Valid", { exact: true })).toBeVisible();

  await tab(page, "Certificates");
  await c.getByLabel("Type").selectOption("Halal certificate");
  await expect(c.getByText(/No valid accreditation/)).toBeHidden();
  await c.getByLabel("Issued to").fill("Punjab Rice Mills");
  await c.getByRole("button", { name: "Issue certificate" }).click();
  const number = (await c.getByText(/^HC-\d{4}-0001$/).textContent())!;

  await c.getByLabel("Certificate number or check code").fill(number);
  await c.getByRole("button", { name: "Check", exact: true }).click();
  await expect(c.getByRole("status")).toContainText("Valid");

  await c.getByRole("button", { name: "Revoke" }).click();
  await c.getByLabel("Reason").fill("Wrong lot");
  await c.getByRole("button", { name: "Revoke" }).click();
  await c.getByRole("button", { name: "Check", exact: true }).click();
  await expect(c.getByRole("status")).toContainText("Revoked");
});

test("team invites and role-based access", async ({ page }) => {
  await setUpCompany(page);
  const c = dash(page);
  await tab(page, "Team");
  await c.getByLabel("Name").fill("Priya");
  await c.getByLabel("or phone").fill("12");
  await c.getByRole("button", { name: "Send invite" }).click();
  await expect(c.getByRole("alert")).toContainText("8 to 15 digits");
  await c.getByLabel("or phone").fill("+91 90000 11111");
  await c.getByRole("button", { name: "Send invite" }).click();
  await expect(c.getByText("Invite sent to +91 90000 11111.")).toBeVisible();
  await c.getByRole("button", { name: "Mark accepted" }).click();

  await c.getByLabel("Signed in as").selectOption({ label: "Priya (Sales)" });
  await expect(c.getByRole("tab", { name: "Service store" })).toBeVisible();
  await expect(c.getByRole("tab", { name: "Payouts" })).toHaveCount(0);
  await expect(c.getByRole("tab", { name: "Team", exact: true })).toHaveCount(0);

  await c.getByLabel("Signed in as").selectOption({ label: "Ravi (Owner)" });
  await tab(page, "KYC");
  await expect(c.getByText("Missing")).toHaveCount(4);
});

test("service store: pick a service and port, compare companies, book one", async ({ page }) => {
  await setUpCompany(page);
  await addListing(page, { port: "Kandla", price: "900" });
  await expect(dash(page).getByText("You get $900. Customers see $1,170 (includes Qualty's 30%)")).toBeVisible();
  await dash(page).getByRole("button", { name: "Add listing" }).click();

  await page.goto("/");
  const s = store(page);
  await expect(s.getByRole("radio", { name: /Pre-Shipment Inspection/ })).toHaveAttribute("aria-checked", "true");
  await s.getByLabel("Port or city").selectOption("Kandla");
  await expect(s.getByText("$1,170")).toBeVisible();
  await s.getByRole("button", { name: "Book Acme Surveyors for Pre-Shipment Inspection (PSI) at Kandla" }).click();

  const dialog = bookingDialog(page);
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Next: Schedule & Budget" }).click();
  await expect(dialog.getByRole("radio", { name: /Acme Surveyors/ })).toBeChecked();

  // Another service with no listings offers an enquiry instead.
  await page.keyboard.press("Escape");
  await s.getByRole("radio", { name: /Destination Cargo Inspection/ }).click();
  await expect(s.getByText(/No company lists Destination Cargo Inspection/)).toBeVisible();
  await s.getByRole("button", { name: "Raise an enquiry" }).click();
  await expect(dialog).toBeVisible();
});

test("standard-rate services: ECTN is $120 across India", async ({ page }) => {
  await setUpCompany(page);
  const c = dash(page);
  await tab(page, "Service store");
  const ectn = "ECTN (Electronic Cargo Tracking Note)";
  await c.getByRole("combobox", { name: "Service", exact: true }).selectOption(ectn);
  await c.getByLabel("Port or city").fill("Mundra");
  await c.getByLabel("Price (USD)").fill("200");
  await expect(c.getByText(`${ectn} has a standard rate of $120 across India.`)).toBeVisible();

  // All India locks the price to the standard rate, whatever was typed.
  await c.getByLabel("Port or city").fill("All India");
  await expect(c.getByLabel("Price (USD)")).toHaveValue("120");
  await expect(c.getByLabel("Price (USD)")).not.toBeEditable();
  await expect(c.getByLabel("Discount %")).toBeDisabled();
  await c.getByLabel("Available from").fill("2026-11-01");
  await c.getByLabel("Available until").fill("2099-12-31");
  await c.getByRole("button", { name: "Add listing" }).click();
  await expect(c.getByText(`${ectn} · All India`)).toBeVisible();
  await expect(c.getByText("Standard rate", { exact: true })).toBeVisible();
  await expect(c.getByText(/\$120, customers see \$156/)).toBeVisible();

  await page.goto("/");
  const s = store(page);
  await s.getByRole("radio", { name: /ECTN/ }).click();
  await s.getByLabel("Port or city").selectOption("All India");
  await expect(s.getByText("$156")).toBeVisible();
});

test("Qualty team creates an order by hand: booked and invoiced at price × 1.3, or open for bids", async ({ page }) => {
  await setUpCompany(page);
  const c = dash(page);
  await tab(page, "Qualty team");
  await c.getByRole("button", { name: "New order for a customer" }).click();
  const form = c.getByRole("form", { name: "New order for a customer" });
  await form.getByRole("button", { name: "Create order" }).click();
  await expect(form.getByRole("alert")).toContainText("Add the customer's email.");

  await form.getByLabel("Customer email").fill("exports@alkhaleej.ae");
  await form.getByLabel("Commodity").fill("Basmati rice");
  await form.getByLabel("Port or city").fill("Mundra");
  await form.getByLabel("Inspection date").fill("2026-12-01");
  await form.getByLabel("Volume (tons)").fill("500");
  await form.getByLabel("Buyer").fill("Al-Khaleej Foods");
  await form.getByLabel("Seller").fill("Punjab Rice Mills");
  await form.getByLabel("Inspection company").selectOption({ label: "Acme Surveyors" });
  await form.getByLabel("Company price (USD)").fill("1000");
  await expect(form).toContainText("Customer is invoiced $1,300, including Qualty's 30%.");
  await form.getByRole("button", { name: "Create order" }).click();
  await expect(form).toHaveCount(0);

  const row = c.locator("div", { has: page.getByText("Acme Surveyors", { exact: true }) }).filter({ has: page.getByText("Company price") }).last();
  await expect(row).toContainText(/Company price\s*\$1,000/);
  await expect(row).toContainText(/Customer price\s*\$1,300/);
  await expect(row).toContainText(/\$0 of \$1,300 paid/);

  // Without a company or price it opens as an enquiry for companies to bid on.
  await c.getByRole("button", { name: "New order for a customer" }).click();
  await form.getByLabel("Customer email").fill("exports@alkhaleej.ae");
  await form.getByLabel("Commodity").fill("Sugar");
  await form.getByLabel("Port or city").fill("Kandla");
  await form.getByLabel("Inspection date").fill("2026-12-05");
  await form.getByLabel("Volume (tons)").fill("200");
  await form.getByLabel("Buyer").fill("Gulf Sweets");
  await form.getByLabel("Seller").fill("Kutch Sugar");
  await form.getByRole("button", { name: "Create order" }).click();
  await expect(form).toHaveCount(0);
  await tab(page, "Enquiries");
  await expect(c.getByRole("tabpanel")).toContainText("Sugar");
});
