import { expect, type Page } from "@playwright/test";

export const bookingDialog = (page: Page) => page.getByRole("dialog", { name: "Book Cargo Inspection" });
export const orders = (page: Page) => page.locator("#orders");

/** Opens booking from the Calibrator, fills parties, submits, returns the order number. */
export async function bookFromCalibrator(
  page: Page,
  opts: { mode?: "quick" | "inquiry"; buyer?: string; seller?: string; buyerGstin?: string; buyerIec?: string } = {},
) {
  await page.getByRole("button", { name: "Book Inspection with These Specs" }).click();
  const dialog = bookingDialog(page);
  await expect(dialog).toBeVisible();
  if (opts.mode === "inquiry") await dialog.getByRole("button", { name: /Raise an Inquiry/ }).click();
  await dialog.getByRole("button", { name: "Next: Schedule & Budget" }).click();
  await dialog.getByRole("button", { name: "Next: Your details" }).click();
  await dialog.getByLabel("Buyer", { exact: true }).fill(opts.buyer ?? "Al-Khaleej Foods");
  await dialog.getByLabel("Seller", { exact: true }).fill(opts.seller ?? "Punjab Rice Mills");
  if (opts.buyerGstin) await dialog.getByLabel("Buyer GSTIN (optional)").fill(opts.buyerGstin);
  if (opts.buyerIec) await dialog.getByLabel("Buyer IEC (optional)").fill(opts.buyerIec);
  await dialog.getByRole("button", { name: opts.mode === "inquiry" ? "Publish enquiry for bids" : "Book inspection" }).click();
  const number = dialog.getByText(/^(QI|RI)-\d{4}-\d{4}$/);
  await expect(number).toBeVisible();
  return (await number.textContent())!;
}

export async function openRoom(page: Page) {
  await bookingDialog(page).getByRole("button", { name: "Open order chatroom" }).click();
  await expect(bookingDialog(page)).toBeHidden();
}

export async function viewAs(page: Page, role: "Customer" | "Inspection company" | "Inspector" | "Qualty admin") {
  await orders(page).getByLabel("Viewing as").selectOption({ label: role });
}

export async function post(page: Page, tab: "Message" | "Observation" | "Dispatch" | "Photo or video", fields: Record<string, string> = {}, text = "") {
  const room = orders(page);
  await room.getByRole("tab", { name: tab }).click();
  for (const [label, value] of Object.entries(fields)) await room.getByLabel(label, { exact: true }).fill(value);
  if (text) await room.getByLabel("Message", { exact: true }).fill(text);
  await room.getByRole("button", { name: "Send" }).click();
}
