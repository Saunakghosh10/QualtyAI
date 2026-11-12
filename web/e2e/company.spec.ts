import { expect, test, type Page } from "@playwright/test";
import { bookFromCalibrator, bookingDialog, openRoom, orders, payIfDue, viewAs } from "./helpers";

const console_ = (page: Page) => page.locator("#company");
const tab = (page: Page, name: string) => console_(page).getByRole("tab", { name }).click();

async function setUpCompany(page: Page) {
  const c = console_(page);
  await c.getByLabel("Company name").fill("Acme Surveyors");
  await c.getByLabel("Your name").fill("Ravi");
  await c.getByLabel("Email").fill("ops@acme.in");
  await c.getByRole("button", { name: "Create company" }).click();
  await expect(c.getByText("Acme Surveyors", { exact: true })).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("company store listing is offered in quick booking and drives invoice and payments", async ({ page }) => {
  await setUpCompany(page);
  const c = console_(page);

  await tab(page, "Service store");
  await c.getByLabel("Port or city").fill("Mundra");
  await c.getByLabel("Commodities (comma separated, blank = any)").fill("Rice");
  await c.getByLabel("Price (USD)").fill("800");
  await c.getByLabel("Discount %").fill("25");
  await c.getByLabel("Surveyors available").fill("3");
  await c.getByLabel("Available from").fill("2026-11-01");
  await c.getByLabel("Available until").fill("2026-12-31");
  await expect(c.getByText("Customers pay $600")).toBeVisible();
  await c.getByRole("button", { name: "Add listing" }).click();
  await expect(c.getByText(/\$600 \(25% off \$800\)/)).toBeVisible();

  // The calibrator books Rice at Mundra on 2026-11-05: Acme should be offered and picked.
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
  await expect(orders(page).getByText(/Members: .*Acme Surveyors \(Inspection company\)/)).toBeVisible();
  // Booked orders are invoiced at the agreed price; the chatroom stays shut until it is paid.
  await expect(orders(page).getByRole("heading", { name: "Waiting for payment" })).toBeVisible();
  await expect(orders(page).getByRole("log")).toHaveCount(0);

  await tab(page, "Orders");
  await expect(c.getByText(id)).toBeVisible();
  await expect(c.getByText("Waiting for payment")).toBeVisible();

  await tab(page, "Payments");
  await expect(c.getByText("Unpaid")).toBeVisible();
  await expect(c.getByText(/INV-.* \$0 of \$600 paid/)).toBeVisible();

  await c.getByRole("button", { name: "Record payment" }).click();
  await c.getByLabel("Amount (USD)").fill("700");
  await c.getByRole("button", { name: "Record payment" }).click();
  await expect(c.getByRole("alert")).toHaveText("Only $600 is left to pay on this invoice.");
  await c.getByLabel("Amount (USD)").fill("600");
  await c.getByRole("button", { name: "Record payment" }).click();
  await expect(c.getByText("Paid", { exact: true })).toBeVisible();
  await expect(orders(page).getByRole("log")).toBeVisible();
  await expect(orders(page).getByText(/Payment confirmed\. Chatroom opened/)).toBeVisible();
});

test("enquiry negotiation: discount, counter-offer, accept at the net price", async ({ page }) => {
  const id = await bookFromCalibrator(page, { mode: "inquiry" });
  await openRoom(page);
  const room = orders(page);

  await viewAs(page, "Inspection company");
  await room.getByLabel("Your company").fill("Acme");
  await room.getByLabel("Price in USD").fill("2000");
  await room.getByLabel("Days").fill("3");
  await room.getByRole("button", { name: "Submit bid" }).click();

  await viewAs(page, "Customer");
  await room.getByRole("button", { name: "Counter-offer" }).click();
  await room.getByLabel("Offer in USD").fill("1500");
  await room.getByRole("button", { name: "Send offer" }).click();
  await expect(room.getByText("Customer asked for $1,500")).toBeVisible();

  await viewAs(page, "Inspection company");
  await room.getByRole("button", { name: "Give a discount" }).click();
  await room.getByLabel("Discount on this bid in percent").fill("10");
  await room.getByRole("button", { name: "Apply discount" }).click();

  await viewAs(page, "Customer");
  await room.getByRole("button", { name: "Accept bid" }).click();
  await payIfDue(page);
  await expect(room.getByText(/^Customer accepted Acme's bid of \$1,800\./)).toBeVisible();
  expect(id).toMatch(/^RI-/);
});

test("compliance, certificates and the public check", async ({ page }) => {
  await setUpCompany(page);
  const c = console_(page);

  await tab(page, "Certificates");
  await c.getByLabel("Type").selectOption("Halal certificate");
  await expect(c.getByText(/No valid accreditation in Compliance covers Halal certificate/)).toBeVisible();

  await tab(page, "Compliance");
  await c.getByLabel("Accreditation or licence").fill("Halal body approval");
  await c.getByLabel("Issued by").fill("ESMA");
  await c.getByLabel("Valid until").fill("2099-01-01");
  await c.getByLabel("Halal certificate").check();
  await c.getByRole("button", { name: "Add approval" }).click();
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
  const c = console_(page);
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
  await expect(c.getByRole("tab", { name: "Payments" })).toHaveCount(0);
  await expect(c.getByRole("tab", { name: "Team" })).toHaveCount(0);

  await c.getByLabel("Signed in as").selectOption({ label: "Ravi (Owner)" });
  await tab(page, "KYC");
  await expect(c.getByText("Missing")).toHaveCount(4);
});

test("service store: pick a service and port, compare companies, book one", async ({ page }) => {
  await setUpCompany(page);
  const c = console_(page);
  await tab(page, "Service store");
  await c.getByLabel("Port or city").fill("Kandla");
  await c.getByLabel("Price (USD)").fill("900");
  await c.getByLabel("Available from").fill("2026-11-01");
  await c.getByLabel("Available until").fill("2099-12-31");
  await c.getByRole("button", { name: "Add listing" }).click();

  const store = page.locator("#services");
  await expect(store.getByRole("radio", { name: /Pre-Shipment Inspection/ })).toHaveAttribute("aria-checked", "true");
  await store.getByLabel("Port or city").selectOption("Kandla");
  await expect(store.getByText("$900")).toBeVisible();
  await store.getByRole("button", { name: "Book Acme Surveyors for Pre-Shipment Inspection (PSI) at Kandla" }).click();

  const dialog = bookingDialog(page);
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Next: Schedule & Budget" }).click();
  await expect(dialog.getByRole("radio", { name: /Acme Surveyors/ })).toBeChecked();

  // Another service with no listings offers an enquiry instead.
  await page.keyboard.press("Escape");
  await store.getByRole("radio", { name: /Destination Cargo Inspection/ }).click();
  await expect(store.getByText(/No company lists Destination Cargo Inspection/)).toBeVisible();
  await store.getByRole("button", { name: "Raise an enquiry" }).click();
  await expect(dialog).toBeVisible();
});
