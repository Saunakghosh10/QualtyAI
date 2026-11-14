import { expect, test } from "@playwright/test";

// Read-only checks. Safe to run against production (BASE_URL=https://qualty.ai).
test("home page loads every section without errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

  const res = await page.goto("/");
  expect(res?.status()).toBe(200);
  await expect(page).toHaveTitle(/Qualty\.AI/);
  for (const id of ["calibrator", "vault"]) await expect(page.locator(`#${id}`)).toBeVisible();
  // Visitors see who Qualty is for; order chatrooms only show once a customer is signed in.
  await expect(page.getByRole("heading", { name: "Who Qualty is for" })).toBeVisible();
  await expect(page.getByText("Markets this quality suits")).toBeVisible();
  // Login/KYC is not in scope yet; the fake sandbox sign-in was removed.
  await expect(page.getByRole("button", { name: /Sign In/ })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("booking dialog opens and closes with Escape", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Book Inspection with These Specs" }).click();
  const dialog = page.getByRole("dialog", { name: "Book Cargo Inspection" });
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});
