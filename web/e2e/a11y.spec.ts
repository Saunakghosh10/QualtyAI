import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { bookFromCalibrator, openRoom } from "./helpers";

type AxePage = ConstructorParameters<typeof AxeBuilder>[0]["page"];

// @axe-core/playwright pins its own playwright-core types; the runtime object is the same.
const scan = (page: Page, include: string) =>
  new AxeBuilder({ page: page as unknown as AxePage }).include(include).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();

const summarize = (v: Awaited<ReturnType<typeof scan>>["violations"]) =>
  v.map((x) => `${x.impact} ${x.id}: ${x.nodes.length} node(s) — ${x.nodes[0]?.target.join(" ")}`);

const useTheme = async (page: Page, theme: "light" | "dark") => {
  await page.addInitScript((t) => localStorage.setItem("qualty_theme", t), theme);
};

for (const theme of ["light", "dark"] as const) {
  test(`no accessibility violations on the home page (${theme} theme)`, async ({ page }) => {
    await useTheme(page, theme);
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    expect(summarize((await scan(page, "body")).violations)).toEqual([]);
  });

  test(`no accessibility violations on /companies (${theme} theme)`, async ({ page }) => {
    await useTheme(page, theme);
    await page.goto("/companies");
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(summarize((await scan(page, "body")).violations)).toEqual([]);
  });

  test(`no accessibility violations on /dashboard (${theme} theme)`, async ({ page }) => {
    await useTheme(page, theme);
    await page.goto("/dashboard");
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    const c = page.locator("#company");
    // The company set-up form, then the console with a listing and the Qualty team tab.
    await expect(c.getByRole("button", { name: "Create company" })).toBeVisible();
    expect(summarize((await scan(page, "body")).violations)).toEqual([]);
    await c.getByLabel("Company name").fill("Acme Surveyors");
    await c.getByLabel("Your name").fill("Ravi");
    await c.getByLabel("Email").fill("ops@acme.in");
    await c.getByRole("button", { name: "Create company" }).click();
    await expect(c.getByRole("tab", { name: "Enquiries" })).toBeVisible();
    expect(summarize((await scan(page, "body")).violations)).toEqual([]);
    for (const name of ["Service store", "Payouts", "Accreditations", "Qualty team"]) {
      await c.getByRole("tab", { name, exact: true }).click();
      expect(summarize((await scan(page, "#company")).violations), name).toEqual([]);
    }
  });

  test(`no accessibility violations on /rooms (${theme} theme)`, async ({ page }) => {
    await useTheme(page, theme);
    await page.goto("/");
    await bookFromCalibrator(page);
    await openRoom(page);
    await page.goto("/rooms");
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    await expect(page.getByRole("log")).toBeVisible();
    expect(summarize((await scan(page, "body")).violations)).toEqual([]);
    await page.getByRole("button", { name: "Rename group" }).click();
    expect(summarize((await scan(page, "body")).violations)).toEqual([]);
  });
}

test("booking dialog and order chatroom have no accessibility violations", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Book Inspection with These Specs" }).click();
  expect(summarize((await scan(page, '[role="dialog"]')).violations)).toEqual([]);
  await page.keyboard.press("Escape");
  await bookFromCalibrator(page);
  await openRoom(page);
  expect(summarize((await scan(page, "#orders")).violations)).toEqual([]);
});
