import { test, expect } from "@playwright/test";
import { TEST_PREFIX } from "../helpers/constants";

test.describe("Template builder (UI)", () => {
  test("dragging a palette item onto the canvas adds it, and Save persists a new version", async ({ page, request }) => {
    test.setTimeout(60_000);
    const template = await (
      await request.post("/api/v1/templates", { data: { name: `${TEST_PREFIX} Builder Template`, status: "DRAFT" } })
    ).json();

    await page.goto(`/templates/${template.id}/builder`);
    await expect(page.getByText("Drag a component onto the canvas")).toBeVisible();

    const source = page.getByRole("button", { name: "Text", exact: true });
    const target = page.locator("div.shadow-lg");
    const sourceBox = await source.boundingBox();
    const targetBox = await target.boundingBox();
    if (!sourceBox || !targetBox) throw new Error("Could not measure palette item or canvas");

    // dnd-kit's PointerSensor needs real intermediate pointer movement past
    // its activation distance to recognize a drag start — a single jump
    // from source to target (what a naive click-drag would do) doesn't
    // register. This was a documented limitation with a chrome-extension-
    // based browser tool in Phase 5; Playwright's own mouse simulation
    // handles it correctly.
    await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(sourceBox.x + sourceBox.width / 2 + 15, sourceBox.y + sourceBox.height / 2 + 15, { steps: 5 });
    await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 10 });
    await page.mouse.up();

    // A newly-dropped text component renders its default content
    // ("New text" — componentDefaults.ts) on the canvas.
    await expect(target.getByText("New text")).toBeVisible();

    // Waiting on the response (not just the request being sent) is the
    // real fix here — a version-creation race, not the drag itself, was
    // the actual cause of an earlier flaky failure in this test.
    const saveResponsePromise = page.waitForResponse((res) => res.url().includes("/versions") && res.request().method() === "POST");
    await page.getByRole("button", { name: "Save" }).click();
    await saveResponsePromise;
    await expect(page.getByText("Saved")).toBeVisible();
    await expect(page.getByText(/^v\d+$/)).toBeVisible();

    const versions = await (await request.get(`/api/v1/templates/${template.id}/versions`)).json();
    expect(versions.length).toBeGreaterThanOrEqual(1);
    const latest = versions[0];
    expect(latest.layout.components.some((c: { type: string }) => c.type === "text")).toBe(true);
  });
});
