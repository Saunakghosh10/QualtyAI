import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { bookFromCalibrator, openRoom } from "./helpers";

type AxePage = ConstructorParameters<typeof AxeBuilder>[0]["page"];

// @axe-core/playwright pins its own playwright-core types; the runtime object is the same.
const scan = (page: import("@playwright/test").Page, include: string) =>
  new AxeBuilder({ page: page as unknown as AxePage }).include(include).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();

const summarize = (v: Awaited<ReturnType<typeof scan>>["violations"]) =>
  v.map((x) => `${x.impact} ${x.id}: ${x.nodes.length} node(s) — ${x.nodes[0]?.target.join(" ")}`);

for (const theme of ["light", "dark"] as const) {
  test(`no accessibility violations on the page (${theme} theme)`, async ({ page }) => {
    await page.addInitScript((t) => localStorage.setItem("qualty_theme", t), theme);
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
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
