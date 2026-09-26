import { z } from "zod";

export const auditStatuses = ["Implemented", "Partial", "Backend Only", "UI Only", "Broken", "Disabled", "Unverified"] as const;

const priceSchema = z.object({ monthlyInr: z.number().nonnegative().nullable(), annualEquivalentMonthlyInr: z.number().nonnegative().nullable().optional(), displayMode: z.enum(["request-quote", "contact-sales", "published-price"]) });
const planSchema = z.object({
  id: z.string().min(1), name: z.string().min(1), eyebrow: z.string().min(1), target: z.string().min(1), order: z.number().int().nonnegative(), highlighted: z.boolean().optional(), inherits: z.array(z.string()).optional(), price: priceSchema,
  proposedLimits: z.object({ stores: z.number().int().positive().nullable(), users: z.number().int().positive().nullable(), registers: z.number().int().positive().nullable(), isEnforced: z.boolean() }),
  headlineFeatures: z.array(z.string().min(1)).min(1).max(6), cta: z.object({ label: z.string().min(1), href: z.string().startsWith("/") }), legalNote: z.string().optional(),
});
const featureSchema = z.object({ id: z.string().regex(/^[A-Z]+-\d{3}$/), name: z.string().min(1), summary: z.string().min(1), group: z.string().min(1), minimumPlan: z.string().nullable(), addOn: z.string().nullable(), commercialPlacement: z.enum(["core-plan", "add-on", "platform-internal"]), marketingVisibility: z.enum(["public-candidate", "review", "roadmap", "internal"]), auditStatus: z.enum(auditStatuses), publishAsAvailable: z.boolean(), auditLimitations: z.string() });
const groupSchema = z.object({ id: z.string().min(1), title: z.string().min(1), subtitle: z.string().min(1), icon: z.string().min(1), featureIds: z.array(z.string()), public: z.boolean().optional() });
const addOnSchema = z.object({ id: z.string().min(1), name: z.string().min(1), availableWith: z.array(z.string()).min(1), price: priceSchema.omit({ annualEquivalentMonthlyInr: true }), highlights: z.array(z.string().min(1)).min(1).max(6), publication: z.string().min(1), billingDisclosure: z.string().optional(), disclosure: z.string().optional() });

export const pricingCatalogSchema = z.object({
  schemaVersion: z.number().int().positive(), configId: z.string().min(1), isCommercialDraft: z.boolean(), publishPrices: z.boolean(), priceDisplayFallback: z.string().min(1), currency: z.string().length(3), notes: z.array(z.string()), planOrder: z.array(z.string()).min(1), plans: z.array(planSchema).min(1), addOns: z.array(addOnSchema), featureGroups: z.array(groupSchema), featureCatalog: z.array(featureSchema),
  presentation: z.object({ featureCardMaxHighlights: z.number().int().positive(), comparisonDisplay: z.string(), internalFeaturesExcluded: z.boolean(), excludeUnapprovedFeaturesFromPublic: z.boolean(), roadmapSectionEnabled: z.boolean(), showAddonBadges: z.boolean(), useSeparateAddOnSection: z.boolean(), metaBillingDisclaimerRequired: z.boolean(), mobileCardLayout: z.string(), draftPreviewEnabled: z.boolean(), productionRequiresMarketingApproval: z.boolean() }),
  futureDataSource: z.object({ mode: z.string(), adapter: z.string(), publicReadEndpointPlanned: z.string(), adminEndpointsPlanned: z.array(z.string()), doNotImplementAdminWritesNow: z.boolean(), security: z.array(z.string()) }),
}).superRefine((catalog, context) => {
  const duplicate = (values: string[]) => values.find((value, i) => values.indexOf(value) !== i);
  for (const [label, values] of [["plan", catalog.plans.map((x) => x.id)], ["feature", catalog.featureCatalog.map((x) => x.id)], ["group", catalog.featureGroups.map((x) => x.id)], ["add-on", catalog.addOns.map((x) => x.id)]] as const) {
    const id = duplicate(values); if (id) context.addIssue({ code: "custom", message: `Duplicate ${label} ID: ${id}` });
  }
  const planIds = new Set(catalog.plans.map((x) => x.id)); const featureIds = new Set(catalog.featureCatalog.map((x) => x.id)); const groupIds = new Set(catalog.featureGroups.map((x) => x.id)); const addOnIds = new Set(catalog.addOns.map((x) => x.id));
  if (catalog.planOrder.some((id) => !planIds.has(id))) context.addIssue({ code: "custom", message: "Unknown plan in planOrder" });
  for (const plan of catalog.plans) if (plan.inherits?.some((id) => !planIds.has(id) || id === plan.id)) context.addIssue({ code: "custom", message: `${plan.id} has invalid inheritance` });
  for (const feature of catalog.featureCatalog) {
    if (!groupIds.has(feature.group)) context.addIssue({ code: "custom", message: `${feature.id} has unknown group` });
    if (feature.minimumPlan && !planIds.has(feature.minimumPlan)) context.addIssue({ code: "custom", message: `${feature.id} has unknown plan` });
    if (feature.addOn && !addOnIds.has(feature.addOn)) context.addIssue({ code: "custom", message: `${feature.id} has unknown add-on` });
  }
  for (const group of catalog.featureGroups) if (group.featureIds.some((id) => !featureIds.has(id))) context.addIssue({ code: "custom", message: `${group.id} has unknown feature` });
  for (const addOn of catalog.addOns) if (addOn.availableWith.some((id) => !planIds.has(id))) context.addIssue({ code: "custom", message: `${addOn.id} has unknown plan` });
});

export type PricingCatalog = z.infer<typeof pricingCatalogSchema>;
export type PricingFeature = PricingCatalog["featureCatalog"][number];
export type PublicPricingCatalog = Omit<PricingCatalog, "notes" | "futureDataSource" | "featureCatalog"> & { mode: "draft-preview" | "published"; featureCatalog: Array<Omit<PricingFeature, "auditLimitations">> };

export function resolveInheritedPlanIds(catalog: PricingCatalog, planId: string): Set<string> {
  const result = new Set<string>();
  const visit = (id: string, trail: Set<string>) => { if (trail.has(id)) throw new Error(`Circular plan inheritance: ${id}`); if (result.has(id)) return; const plan = catalog.plans.find((x) => x.id === id); if (!plan) throw new Error(`Unknown plan: ${id}`); const next = new Set(trail).add(id); plan.inherits?.forEach((parent) => visit(parent, next)); result.add(id); };
  visit(planId, new Set()); return result;
}
export function getEffectivePlanFeatures(catalog: PricingCatalog, planId: string) { const plans = resolveInheritedPlanIds(catalog, planId); return catalog.featureCatalog.filter((feature) => feature.commercialPlacement === "core-plan" && feature.minimumPlan && plans.has(feature.minimumPlan)); }

export function toPublicPricingCatalog(catalog: PricingCatalog, preview: boolean): PublicPricingCatalog {
  const featureCatalog = catalog.featureCatalog
    .filter((feature) => feature.commercialPlacement !== "platform-internal")
    .filter((feature) => preview || feature.publishAsAvailable || feature.marketingVisibility === "roadmap")
    .map((feature) => {
      const { auditLimitations, ...publicFeature } = feature;
      void auditLimitations;
      return publicFeature;
    });
  const { notes, futureDataSource, ...publicFields } = catalog;
  void notes;
  void futureDataSource;
  return { ...publicFields, mode: preview ? "draft-preview" : "published", featureCatalog };
}
