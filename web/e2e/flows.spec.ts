import { expect, test } from "@playwright/test";
import path from "node:path";
import { bookFromCalibrator, bookingDialog, openRoom, orders, payIfDue, post, viewAs } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("saved buyer spec survives reload and is offered when booking", async ({ page }) => {
  await page.getByRole("button", { name: "Save as buyer spec" }).click();
  await page.getByLabel("Buyer name").fill("Al-Khaleej Foods");
  await page.getByLabel("Reference name").fill("PO-2611");
  await page.getByRole("button", { name: "Save spec" }).click();
  await page.reload();

  await expect(page.getByLabel("Saved buyer spec").getByRole("option", { name: "Al-Khaleej Foods · PO-2611 (Rice)" })).toBeAttached();

  await page.getByRole("button", { name: "Book Inspection" }).first().click();
  const dialog = bookingDialog(page);
  await dialog.getByLabel("Use a saved buyer spec").selectOption({ label: "Al-Khaleej Foods · PO-2611 (Rice)" });
  await expect(dialog.getByText("Spec attached: Al-Khaleej Foods · PO-2611")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("calibrator shows which markets the quality suits and reacts to changes", async ({ page }) => {
  const panel = page.locator("li", { hasText: "European Union" }).first();
  await expect(page.getByText("Markets this quality suits")).toBeVisible();
  await expect(panel).toBeVisible();
  await expect(page.locator("li", { hasText: "UAE / GCC" }).getByLabel("Fits")).toBeVisible();
});

test("rejects an IEC that does not match the buyer's GSTIN", async ({ page }) => {
  await page.getByRole("button", { name: "Book Inspection with These Specs" }).click();
  const dialog = bookingDialog(page);
  await dialog.getByRole("button", { name: "Next: Schedule & Budget" }).click();
  await dialog.getByRole("button", { name: "Next: Your details" }).click();
  await dialog.getByLabel("Buyer", { exact: true }).fill("B");
  await dialog.getByLabel("Seller", { exact: true }).fill("S");
  await dialog.getByLabel("Buyer GSTIN (optional)").fill("27AAPFU0939F1ZV");
  await dialog.getByLabel("Buyer IEC (optional)").fill("BBBBB1234B");
  await dialog.getByRole("button", { name: "Book inspection" }).click();
  await expect(dialog.getByRole("alert")).toHaveText("Buyer: IEC does not match the PAN inside the GSTIN.");
});

test("quick inspection: chatroom, reports, flags, summary and Vault", async ({ page }) => {
  const id = await bookFromCalibrator(page, { buyerGstin: "27AAPFU0939F1ZV", buyerIec: "AAPFU0939F" });
  expect(id).toMatch(/^QI-/);
  await openRoom(page);
  const room = orders(page);
  await expect(room.getByRole("heading", { name: id })).toBeVisible();
  await expect(room.getByText(/Members: .*\(Customer\), .*\(Inspection company\), Qualty admin team/)).toBeVisible();
  await expect(room.getByText("IDs format-checked, registry check pending")).toBeVisible();

  await viewAs(page, "Inspector");
  await post(page, "Observation", { "Broken %": "4", "Live insects": "1" }, "Hold 3 slight musty odour");
  await expect(room.getByRole("log").getByText("Critical flag · Quality deviation: Live insects found (1); the booked spec allows 0.")).toBeVisible();
  await expect(room.getByRole("log").getByText("Quality deviation: Broken 4% is above the booked 2%.")).toBeVisible();

  await post(page, "Dispatch", { "Truck / container no.": "MSCU8291048", "Seal no.": "IN-MUN-1", Bags: "500", "Weight (t)": "25" });
  await room.getByRole("tab", { name: "Photo or video" }).click();
  await room.locator('input[type="file"]').setInputFiles(path.join(__dirname, "seal.png"));
  await room.getByLabel("Message", { exact: true }).fill("Seal photo MSCU8291048");
  await room.getByRole("button", { name: "Send" }).click();
  await expect(room.getByRole("log").getByRole("img", { name: "Seal photo MSCU8291048" })).toBeVisible();

  for (const item of ["Sample drawn and sealed", "Moisture reading taken", "Hold or container cleanliness checked", "Seal photo taken", "Weighbridge slip photo taken"]) {
    await room.getByLabel(item).check();
  }
  await room.getByRole("button", { name: "Close inspection and write summary" }).click();
  const summary = room.locator("pre");
  await expect(summary).toContainText(`INSPECTION SUMMARY — ${id}`);
  await expect(summary).toContainText("Outcome: Not conforming: critical deviations were raised.");
  await expect(summary).toContainText("MSCU8291048 — seal IN-MUN-1, 500 bags, 25 t");
  await expect(summary).not.toContainText("No photo of MSCU8291048");
  await expect(room.getByText("This inspection is closed.")).toBeVisible();

  const download = page.waitForEvent("download");
  await room.getByRole("button", { name: "Download summary" }).click();
  expect((await download).suggestedFilename()).toBe(`${id}-inspection-summary.txt`);

  // Everything is still there after a reload, and the Vault hashes still match.
  await page.reload();
  const vault = page.locator("#vault");
  await expect(vault.locator("article")).toHaveCount(2);
  for (const btn of await vault.getByRole("button", { name: "Check file is unchanged" }).all()) await btn.click();
  await expect(vault.getByText("Hash matches")).toHaveCount(2);
  await expect(vault.getByText(/GPS 22\.74410, 69\.70420/)).toBeVisible();
});

test("enquiry: companies bid, customer accepts, winner joins the room", async ({ page }) => {
  const id = await bookFromCalibrator(page, { mode: "inquiry" });
  expect(id).toMatch(/^RI-/);
  await openRoom(page);
  const room = orders(page);
  await expect(room.getByText("No bids yet.")).toBeVisible();

  await viewAs(page, "Inspection company");
  for (const [company, price] of [["SGS India", "1200"], ["Cotecna", "950"]]) {
    await room.getByLabel("Your company").fill(company);
    await room.getByLabel("Price in USD").fill(price);
    await room.getByLabel("Days").fill("3");
    await room.getByRole("button", { name: "Submit bid" }).click();
  }
  await expect(room.getByText("Bids (2)")).toBeVisible();

  // Companies see their own prices.
  await expect(room.getByText("$950", { exact: true })).toBeVisible();

  await viewAs(page, "Customer");
  // Customers see prices with Qualty's 30% ($950 -> $1,235, $1,200 -> $1,560), cheapest first.
  await expect(room.getByText("$1,235", { exact: true })).toBeVisible();
  await expect(room.getByText("$1,560", { exact: true })).toBeVisible();
  await expect(room.getByText("$950", { exact: true })).toHaveCount(0);
  await room.getByRole("button", { name: "Accept bid" }).first().click();
  await expect(room.getByText(/Members: .*Cotecna \(Inspection company\)/)).toBeVisible();
  await payIfDue(page);
  await expect(room.getByRole("log").getByText("Customer accepted Cotecna's bid. Invoice sent; the chatroom opens once payment is confirmed.")).toBeVisible();
  await expect(room.getByRole("button", { name: "Accept bid" })).toHaveCount(0);
});

test("customers cannot post inspector reports", async ({ page }) => {
  await bookFromCalibrator(page);
  await openRoom(page);
  const room = orders(page);
  await expect(room.getByRole("tab", { name: "Observation" })).toHaveCount(0);
  await post(page, "Message", {}, "When does the surveyor arrive?");
  await expect(room.getByRole("log").getByText("When does the surveyor arrive?")).toBeVisible();
});

test("chat page: open a paid room in its own window, rename the group", async ({ page }) => {
  const id = await bookFromCalibrator(page);
  await openRoom(page);
  const link = orders(page).getByRole("link", { name: "Open chat", exact: true });
  await expect(link).toHaveAttribute("href", /^\/rooms\?order=/);
  const [chat] = await Promise.all([page.waitForEvent("popup"), link.click()]);
  await expect(chat).toHaveURL(/\/rooms\?order=/);

  const log = chat.getByRole("log", { name: `Chat for ${id}` });
  await expect(log.getByRole("group", { name: "Today" })).toBeVisible();

  await chat.getByRole("button", { name: "Rename group" }).click();
  await chat.getByRole("textbox", { name: "Group name" }).fill("Basmati Lot 7");
  await chat.getByRole("textbox", { name: "Group name" }).press("Enter");
  await expect(chat.getByRole("heading", { name: `Basmati Lot 7 · ${id}` })).toBeVisible();
  await expect(log.getByText("Group renamed to Basmati Lot 7.")).toBeVisible();
  await expect(chat).toHaveTitle(/Basmati Lot 7/);

  // The room list shows the new name (on phones it is one tap back).
  const back = chat.getByRole("button", { name: "Back to chatrooms" });
  if (await back.isVisible()) await back.click();
  await expect(chat.getByRole("navigation", { name: "Orders" }).getByRole("button", { name: /Basmati Lot 7/ })).toBeVisible();
});

test("companies page: what companies get, and sign-up as a company", async ({ page }) => {
  await page.goto("/companies");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "You set your price. Qualty adds its fee on top." })).toBeVisible();
  // Demo mode: no sign-in, so the call to action goes straight to the dashboard.
  await expect(page.getByRole("link", { name: "Go to your dashboard" }).first()).toHaveAttribute("href", "/dashboard");

  // With the backend, "List your company" fires this event; the dialog opens as a company sign-up.
  await page.evaluate(() =>
    window.dispatchEvent(new CustomEvent("qualty:open-auth", { detail: { mode: "signup", as: "company" } })),
  );
  const dialog = page.getByRole("dialog", { name: "Create a company account" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("radio", { name: /An inspection company/ })).toBeChecked();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});
