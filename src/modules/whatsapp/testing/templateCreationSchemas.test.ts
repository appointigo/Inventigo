import assert from "node:assert/strict";
import test from "node:test";
import {
  extractTemplateVariablePositions,
  merchantTemplateDraftSchema,
  normalizeMetaTemplateName,
  renderTemplatePreview,
} from "../templateCreationSchemas.ts";

test("normalizes merchant labels into Meta-safe template names", () => {
  assert.equal(
    normalizeMetaTemplateName("Rare Thread — Diwali Sale V1 (en_US)"),
    "rare_thread_diwali_sale_v1_en_us"
  );
});

test("renders a preview from variable examples without evaluating content", () => {
  assert.equal(
    renderTemplatePreview("Hi {{1}}, save {{2}}.", [
      { position: 1, example: "Aarav" },
      { position: 2, example: "20%" },
    ]),
    "Hi Aarav, save 20%."
  );
});

test("rejects unsafe names and non-marketing categories", () => {
  const base = {
    wabaId: "f0af18a3-b634-4687-8d7b-cb332e77ee58",
    displayLabel: "Diwali Sale",
    language: "en_US",
    category: "MARKETING",
    purpose: "MARKETING_PROMOTION",
    body: "Hi {{1}}, our offer is live.",
    variables: [{ position: 1, key: "customerName", example: "Aarav" }],
  };
  assert.equal(
    merchantTemplateDraftSchema.safeParse({ ...base, metaTemplateName: "Unsafe Name" }).success,
    false
  );
  assert.equal(
    merchantTemplateDraftSchema.safeParse({
      ...base,
      metaTemplateName: "rare_thread_sale_v1",
      category: "UTILITY",
    }).success,
    false
  );
});

test("requires sequential numeric placeholders with semantic mappings", () => {
  assert.deepEqual(extractTemplateVariablePositions("Hi {{2}} and {{1}}"), [1, 2]);
  const base = {
    wabaId: "f0af18a3-b634-4687-8d7b-cb332e77ee58",
    displayLabel: "Offer",
    metaTemplateName: "rare_thread_offer_v1",
    language: "en_US",
    category: "MARKETING",
    purpose: "MARKETING_PROMOTION",
    footer: "Reply STOP to opt out.",
  } as const;
  assert.equal(merchantTemplateDraftSchema.safeParse({
    ...base,
    body: "Hi {{1}}, save {{2}}.",
    variables: [
      { position: 1, key: "customerName", example: "Aarav" },
      { position: 2, key: "discount", example: "20%" },
    ],
  }).success, true);
  assert.equal(merchantTemplateDraftSchema.safeParse({
    ...base,
    body: "Hi {{1}}, save {{3}}.",
    variables: [
      { position: 1, key: "customerName", example: "Aarav" },
      { position: 3, key: "discount", example: "20%" },
    ],
  }).success, false);
});
