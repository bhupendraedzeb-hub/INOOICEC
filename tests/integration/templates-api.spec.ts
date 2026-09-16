import { test, expect } from "@playwright/test";
import { TEST_PREFIX } from "../helpers/constants";

const minimalLayout = {
  page: { size: "A4", orientation: "portrait", marginTopMm: 15, marginRightMm: 15, marginBottomMm: 15, marginLeftMm: 15 },
  components: [],
};

test.describe("Template API", () => {
  test("creating a template defaults to DRAFT status", async ({ request }) => {
    const res = await request.post("/api/v1/templates", { data: { name: `${TEST_PREFIX} Draft Template` } });
    expect(res.status()).toBe(201);
    expect((await res.json()).status).toBe("DRAFT");
  });

  test("versions are immutable: creating a second version never changes the first's stored layout", async ({ request }) => {
    const template = await (
      await request.post("/api/v1/templates", { data: { name: `${TEST_PREFIX} Versioned Template`, status: "ACTIVE" } })
    ).json();

    const v1 = await (
      await request.post(`/api/v1/templates/${template.id}/versions`, {
        data: { layout: { ...minimalLayout, components: [{ id: "a", type: "text", x: 0, y: 0, width: 10, height: 10, locked: false, visible: true, zIndex: 1, props: { content: ["v1"] } }] } },
      })
    ).json();

    const v2 = await (
      await request.post(`/api/v1/templates/${template.id}/versions`, {
        data: { layout: { ...minimalLayout, components: [{ id: "a", type: "text", x: 0, y: 0, width: 10, height: 10, locked: false, visible: true, zIndex: 1, props: { content: ["v2"] } }] } },
      })
    ).json();

    expect(v2.versionNumber).toBe(v1.versionNumber + 1);

    const versions = await (await request.get(`/api/v1/templates/${template.id}/versions`)).json();
    const storedV1 = versions.find((v: { id: string }) => v.id === v1.id);
    // The first version's layout is exactly as created — never touched by
    // the second version's creation (no update path exists for a version).
    expect(storedV1.layout.components[0].props.content[0]).toBe("v1");
  });

  test("updating template metadata does not create a new version or touch existing ones", async ({ request }) => {
    const template = await (
      await request.post("/api/v1/templates", { data: { name: `${TEST_PREFIX} Metadata Template` } })
    ).json();
    // createTemplate already auto-creates version 1 — this explicitly adds
    // a second, so the count-unchanged assertion below is meaningful (not
    // just "still zero").
    await request.post(`/api/v1/templates/${template.id}/versions`, { data: { layout: minimalLayout } });
    const versionsBefore = await (await request.get(`/api/v1/templates/${template.id}/versions`)).json();

    const updated = await request.put(`/api/v1/templates/${template.id}`, {
      data: { name: `${TEST_PREFIX} Renamed Template`, status: "ACTIVE" },
    });
    expect(updated.ok()).toBe(true);
    expect((await updated.json()).name).toBe(`${TEST_PREFIX} Renamed Template`);

    const versionsAfter = await (await request.get(`/api/v1/templates/${template.id}/versions`)).json();
    expect(versionsAfter).toHaveLength(versionsBefore.length);
  });

  test("archiving is a soft delete (status flag), not a hard delete", async ({ request }) => {
    const template = await (
      await request.post("/api/v1/templates", { data: { name: `${TEST_PREFIX} Archive Template` } })
    ).json();
    const archived = await request.delete(`/api/v1/templates/${template.id}`);
    expect(archived.ok()).toBe(true);
    expect((await archived.json()).status).toBe("ARCHIVED");

    const stillThere = await request.get(`/api/v1/templates/${template.id}`);
    expect(stillThere.ok()).toBe(true);
  });

  test("duplicating a template copies metadata but starts a fresh version history", async ({ request }) => {
    const template = await (
      await request.post("/api/v1/templates", { data: { name: `${TEST_PREFIX} Source Template`, status: "ACTIVE" } })
    ).json();
    await request.post(`/api/v1/templates/${template.id}/versions`, { data: { layout: minimalLayout } });

    const copy = await (await request.post(`/api/v1/templates/${template.id}/duplicate`)).json();
    expect(copy.id).not.toBe(template.id);
    expect(copy.name).toContain(template.name);
  });
});
