import { z } from "zod";

export const META_TEMPLATE_NAME_PATTERN = /^[a-z0-9]+(?:_[a-z0-9]+)*$/;

export function normalizeMetaTemplateName(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 512)
    .replace(/_+$/g, "");
}

export function extractTemplateVariablePositions(body: string): number[] {
  return [...body.matchAll(/\{\{\s*(\d+)\s*\}\}/g)]
    .map(match => Number(match[1]))
    .filter((position, index, positions) =>
      Number.isInteger(position) && position > 0 && positions.indexOf(position) === index
    )
    .sort((left, right) => left - right);
}

export function renderTemplatePreview(
  body: string,
  variables: Array<{ position: number; example: string }>
): string {
  return variables.reduce(
    (preview, variable) =>
      preview.replaceAll(`{{${variable.position}}}`, variable.example),
    body
  );
}

const templateVariableSchema = z.object({
  position: z.number().int().positive(),
  key: z.string().trim().regex(/^[A-Za-z][A-Za-z0-9]*$/, "Use a semantic key such as customerName"),
  example: z.string().trim().min(1).max(120),
});

export const merchantTemplateDraftSchema = z.object({
  wabaId: z.string().uuid(),
  blueprintId: z.string().min(1).max(100).optional(),
  displayLabel: z.string().trim().min(1).max(120),
  metaTemplateName: z.string().min(1).max(512).regex(
    META_TEMPLATE_NAME_PATTERN,
    "Use lowercase letters, numbers, and single underscores only"
  ),
  language: z.literal("en_US"),
  category: z.literal("MARKETING"),
  purpose: z.enum(["MARKETING_PROMOTION", "PRODUCT_LAUNCH", "COUPON", "CUSTOM"]),
  body: z.string().trim().min(1).max(1024),
  footer: z.string().trim().max(60).optional(),
  variables: z.array(templateVariableSchema).max(20),
}).superRefine((value, context) => {
  const placeholders = value.body.match(/\{\{[^}]*\}\}/g) ?? [];
  const positions = extractTemplateVariablePositions(value.body);
  if (placeholders.length !== positions.length) {
    context.addIssue({ code: "custom", path: ["body"], message: "Use each numeric placeholder once, for example {{1}}" });
    return;
  }
  if (positions.some((position, index) => position !== index + 1)) {
    context.addIssue({ code: "custom", path: ["body"], message: "Template variables must be sequential from {{1}}" });
  }
  if (
    value.variables.length !== positions.length ||
    value.variables.some((variable, index) => variable.position !== positions[index])
  ) {
    context.addIssue({ code: "custom", path: ["variables"], message: "Define one semantic mapping for every body variable" });
  }
  if (new Set(value.variables.map(variable => variable.key)).size !== value.variables.length) {
    context.addIssue({ code: "custom", path: ["variables"], message: "Variable keys must be unique" });
  }
});
