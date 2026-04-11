import ExcelJS from "exceljs";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { NextResponse } from "next/server";

const MAX_DATA_ROWS = 1000;
const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF1C4E80" },
};
const ATTR_HEADER_FILLS = [
  { argb: "FF2E75B6" }, // attr_1 — blue shades per block pair for readability
  { argb: "FF2E75B6" },
  { argb: "FF2F5597" },
  { argb: "FF2F5597" },
  { argb: "FF1C4E80" },
  { argb: "FF1C4E80" },
  { argb: "FF203864" },
  { argb: "FF203864" },
  { argb: "FF17375E" },
  { argb: "FF17375E" },
];
const EXAMPLE_ROW_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFF2F2F2" },
};
const EXAMPLE_ROW_FONT: Partial<ExcelJS.Font> = {
  italic: true,
  color: { argb: "FF999999" },
};
const ERROR_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFFFC7CE" },
};
const ERROR_FONT: Partial<ExcelJS.Font> = { color: { argb: "FF9C0006" } };
const WARN_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFFFFFCC" },
};
const WARN_FONT: Partial<ExcelJS.Font> = { color: { argb: "FF9C6500" } };

// Column index helpers (1-based)
// base cols: A=name(1), B=description(2), C=sizes(3)
// attr N -> cols: 4 + (N-1)*4 + 0..3
const attrCol = (n: number, offset: 0 | 1 | 2 | 3) =>
  4 + (n - 1) * 4 + offset;
const colLetter = (n: number) => {
  let r = "";
  while (n > 0) {
    const m = (n - 1) % 26;
    r = String.fromCharCode(65 + m) + r;
    n = Math.floor((n - 1) / 26);
  }
  return r;
};
// status col = 3 + 10*4 + 1 = 44
const STATUS_COL = 44;

// ─── GET /api/categories/template?format=csv|xlsx ────────────────────────────

export const GET = async (request: Request) => {
  try {
    await requireOrgAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") ?? "xlsx";

  if (format === "csv") return csvResponse();
  return xlsxResponse();
};

// ─── CSV ─────────────────────────────────────────────────────────────────────

function csvResponse(): Response {
  const attrHeaders: string[] = [];
  for (let n = 1; n <= 10; n++) {
    attrHeaders.push(`attr_${n}_name`, `attr_${n}_type`, `attr_${n}_values`, `attr_${n}_required`);
  }
  const headers = ["name", "description", "sizes", ...attrHeaders, "_status"];
  const ex1 = [
    "T-Shirts",
    "Casual tee styles",
    "XS,S,M,L,XL,XXL",
    "Color", "dropdown", "Red,Blue,Green,Black,White", "yes",
    "Material", "dropdown", "Cotton,Polyester,Blend", "yes",
    "Fit", "dropdown", "Regular,Slim,Oversized", "no",
    ...Array(28).fill(""),
    "— example row —",
  ];
  const ex2 = [
    "Jeans",
    "Denim trousers",
    "28,30,32,34,36,38",
    "Color", "dropdown", "Blue,Black,Grey", "yes",
    "Wash", "dropdown", "Light,Medium,Dark,Raw", "yes",
    "Fit", "dropdown", "Slim,Skinny,Straight", "yes",
    "Rise", "dropdown", "Low,Mid,High", "no",
    ...Array(24).fill(""),
    "— example row —",
  ];
  const lines = [headers.join(","), ex1.join(","), ex2.join(",")];

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="category-template.csv"',
    },
  });
}

// ─── XLSX ─────────────────────────────────────────────────────────────────────

async function xlsxResponse(): Promise<Response> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Inventigo Bulk Upload";
  workbook.created = new Date();

  // ExcelJS v4 types omit dataValidations from Worksheet; it exists at runtime
  type WS = ExcelJS.Worksheet & { dataValidations: { add(ref: string, rule: object): void } };
  const sheet = workbook.addWorksheet("Data") as WS;

  // ── Build column definitions ───────────────────────────────────────────────
  const cols: Partial<ExcelJS.Column>[] = [
    { header: "name", key: "name", width: 22 },
    { header: "description", key: "description", width: 30 },
    { header: "sizes", key: "sizes", width: 22 },
  ];
  for (let n = 1; n <= 10; n++) {
    cols.push(
      { header: `attr_${n}_name`, key: `attr_${n}_name`, width: 18 },
      { header: `attr_${n}_type`, key: `attr_${n}_type`, width: 12 },
      { header: `attr_${n}_values`, key: `attr_${n}_values`, width: 32 },
      { header: `attr_${n}_required`, key: `attr_${n}_required`, width: 14 }
    );
  }
  cols.push({ header: "_status", key: "_status", width: 30 });
  sheet.columns = cols;

  // ── Style header row ──────────────────────────────────────────────────────
  const headerRow = sheet.getRow(1);
  headerRow.eachCell((cell, colNumber) => {
    const val = String(cell.value ?? "");
    if (val === "_status") {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2EFDA" } };
      cell.font = { bold: true, color: { argb: "FF375623" } };
    } else if (colNumber <= 3) {
      cell.fill = HEADER_FILL;
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    } else {
      // Attribute headers — alternate shading per attribute block
      const attrIndex = Math.floor((colNumber - 4) / 4);
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: ATTR_HEADER_FILLS[attrIndex % ATTR_HEADER_FILLS.length],
      };
      cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 9 };
    }
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = { bottom: { style: "medium", color: { argb: "FF1C4E80" } } };
  });
  headerRow.height = 32;

  // ── Example rows (2–3) ────────────────────────────────────────────────────
  const ex1: Record<string, string> = {
    name: "T-Shirts", description: "Casual tee styles", sizes: "XS,S,M,L,XL,XXL",
    attr_1_name: "Color", attr_1_type: "dropdown",
    attr_1_values: "Red,Blue,Green,Black,White", attr_1_required: "yes",
    attr_2_name: "Material", attr_2_type: "dropdown",
    attr_2_values: "Cotton,Polyester,Blend", attr_2_required: "yes",
    attr_3_name: "Fit", attr_3_type: "dropdown",
    attr_3_values: "Regular,Slim,Oversized", attr_3_required: "no",
    _status: "— example row, replace with your data —",
  };
  const ex2: Record<string, string> = {
    name: "Jeans", description: "Denim trousers", sizes: "28,30,32,34,36,38",
    attr_1_name: "Color", attr_1_type: "dropdown",
    attr_1_values: "Blue,Black,Grey", attr_1_required: "yes",
    attr_2_name: "Wash", attr_2_type: "dropdown",
    attr_2_values: "Light,Medium,Dark,Raw", attr_2_required: "yes",
    attr_3_name: "Fit", attr_3_type: "dropdown",
    attr_3_values: "Slim,Skinny,Straight", attr_3_required: "yes",
    attr_4_name: "Rise", attr_4_type: "dropdown",
    attr_4_values: "Low,Mid,High", attr_4_required: "no",
    _status: "— example row, replace with your data —",
  };
  [ex1, ex2].forEach((ex, i) => {
    const row = sheet.addRow(ex);
    row.eachCell((cell) => {
      cell.fill = EXAMPLE_ROW_FILL;
      cell.font = EXAMPLE_ROW_FONT;
    });
    sheet.getRow(i + 2).protection = { locked: true };
  });

  // ── Data Validation (Layer 1) for data rows 4–1003 ────────────────────────
  const dataStart = 4;
  const dataEnd = dataStart + MAX_DATA_ROWS - 1;

  // name: input message
  sheet.dataValidations.add(`A${dataStart}:A${dataEnd}`, {
    type: "textLength",
    operator: "greaterThan",
    formulae: [0],
    showInputMessage: true,
    promptTitle: "Category Name",
    prompt: "Required. Unique per organisation, e.g. T-Shirts",
    showErrorMessage: false,
  });

  // sizes: input message
  sheet.dataValidations.add(`C${dataStart}:C${dataEnd}`, {
    type: "textLength",
    operator: "greaterThan",
    formulae: [0],
    showInputMessage: true,
    promptTitle: "Sizes",
    prompt: "Required. Comma-separated, e.g. S,M,L,XL  or  28,30,32,34",
    showErrorMessage: false,
  });

  // attr_N_type dropdown and attr_N_required dropdown for all 10 blocks
  for (let n = 1; n <= 10; n++) {
    const typeColLetter = colLetter(attrCol(n, 1));
    const reqColLetter = colLetter(attrCol(n, 3));

    sheet.dataValidations.add(`${typeColLetter}${dataStart}:${typeColLetter}${dataEnd}`, {
      type: "list",
      allowBlank: true,
      formulae: ['"text,dropdown"'],
      showInputMessage: true,
      promptTitle: `Attribute ${n} Type`,
      prompt: "Select 'text' for free-text input, 'dropdown' for a fixed list of options.",
      showErrorMessage: true,
      errorStyle: "stop",
      errorTitle: "Invalid Type",
      error: "Must be 'text' or 'dropdown'.",
    });

    sheet.dataValidations.add(`${reqColLetter}${dataStart}:${reqColLetter}${dataEnd}`, {
      type: "list",
      allowBlank: true,
      formulae: ['"yes,no"'],
      showInputMessage: true,
      promptTitle: `Attribute ${n} Required?`,
      prompt: "Is this attribute required on every product in this category?",
      showErrorMessage: true,
      errorStyle: "stop",
      errorTitle: "Invalid Value",
      error: "Must be 'yes' or 'no'.",
    });
  }

  // ── Conditional Formatting (Layer 2) ─────────────────────────────────────
  // Total columns for COUNTA check: 3 base + 40 attr = 43 → AQ
  const lastDataColLetter = colLetter(43);

  // name blank while row has any data → red
  sheet.addConditionalFormatting({
    ref: `A${dataStart}:A${dataEnd}`,
    rules: [{
      type: "expression",
      priority: 1,
      formulae: [`AND(COUNTA($A${dataStart}:$${lastDataColLetter}${dataStart})>0,A${dataStart}="")`],
      style: { fill: ERROR_FILL, font: ERROR_FONT },
    }],
  });

  // sizes blank while name is filled → red
  sheet.addConditionalFormatting({
    ref: `C${dataStart}:C${dataEnd}`,
    rules: [{
      type: "expression",
      priority: 1,
      formulae: [`AND($A${dataStart}<>"",C${dataStart}="")`],
      style: { fill: ERROR_FILL, font: ERROR_FONT },
    }],
  });

  // For each attr block: attr_N_type=dropdown but attr_N_values blank → red on values cell
  for (let n = 1; n <= 10; n++) {
    const typeColLetter = colLetter(attrCol(n, 1));
    const valuesColLetter = colLetter(attrCol(n, 2));

    sheet.addConditionalFormatting({
      ref: `${valuesColLetter}${dataStart}:${valuesColLetter}${dataEnd}`,
      rules: [{
        type: "expression",
        priority: 1,
        formulae: [`AND(${typeColLetter}${dataStart}="dropdown",${valuesColLetter}${dataStart}="")`],
        style: { fill: ERROR_FILL, font: ERROR_FONT },
      }],
    });

    // attr_N_values filled but type is not "dropdown" → orange warning
    sheet.addConditionalFormatting({
      ref: `${valuesColLetter}${dataStart}:${valuesColLetter}${dataEnd}`,
      rules: [{
        type: "expression",
        priority: 2,
        formulae: [
          `AND(${valuesColLetter}${dataStart}<>"",${typeColLetter}${dataStart}<>"dropdown")`,
        ],
        style: { fill: WARN_FILL, font: WARN_FONT },
      }],
    });
  }

  // ── Status column (Layer 3) ───────────────────────────────────────────────
  const statusColLetter = colLetter(STATUS_COL);
  for (let r = dataStart; r <= dataEnd; r++) {
    const cell = sheet.getCell(`${statusColLetter}${r}`);
    const totalRange = `$A${r}:$${lastDataColLetter}${r}`;
    cell.value = {
      formula:
        `IF(COUNTA(${totalRange})=0,"—",` +
        `IF($A${r}="","⚠ Category name is required",` +
        `IF($C${r}="","⚠ Sizes are required",` +
        `"✓ Ready to upload")))`,
    };
  }

  // Status column CF
  sheet.addConditionalFormatting({
    ref: `${statusColLetter}${dataStart}:${statusColLetter}${dataEnd}`,
    rules: [
      {
        type: "expression",
        priority: 1,
        formulae: [`${statusColLetter}${dataStart}="✓ Ready to upload"`],
        style: { fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFC6EFCE" } }, font: { color: { argb: "FF375623" } } },
      },
      {
        type: "expression",
        priority: 2,
        formulae: [`AND(${statusColLetter}${dataStart}<>"—",LEFT(${statusColLetter}${dataStart},1)="⚠")`],
        style: { fill: ERROR_FILL, font: ERROR_FONT },
      },
    ],
  });

  // ── Freeze, autofilter, protection ───────────────────────────────────────
  sheet.views = [{ state: "frozen", xSplit: 0, ySplit: 3 }];
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: STATUS_COL } };
  await sheet.protect("", { selectLockedCells: true, selectUnlockedCells: true });
  for (let r = dataStart; r <= dataEnd; r++) {
    sheet.getRow(r).protection = { locked: false };
  }

  // ── Instructions sheet ─────────────────────────────────────────────────────
  const infoSheet = workbook.addWorksheet("Instructions");
  infoSheet.getCell("A1").value = "Inventigo — Category Bulk Upload Template";
  infoSheet.getCell("A1").font = { bold: true, size: 14 };
  const instructions = [
    ["", ""],
    ["Column", "Description"],
    ["name", "Required. Category name, unique per org. E.g. T-Shirts"],
    ["description", "Optional. Short description."],
    ["sizes", "Required. Comma-separated size labels. E.g. S,M,L,XL  or  28,30,32"],
    ["attr_N_name", "Attribute N name. E.g. Color. Leave blank to skip this attribute slot."],
    ["attr_N_type", "'text' (free input) or 'dropdown' (pick from a list)."],
    ["attr_N_values", "Required when type=dropdown. Comma-separated options. E.g. Red,Blue,Green"],
    ["attr_N_required", "'yes' or 'no'. Is this attribute mandatory on every product?"],
    ["", ""],
    ["Notes", ""],
    ["", "Up to 10 attribute blocks (attr_1 through attr_10). Fill only what you need; leave unused blocks blank."],
    ["", "Rows 2–3 are example rows. Replace with your data starting from row 4."],
    ["", "The _status column updates live — sort by it to see all errors at once."],
    ["", "Upload order: Brands first → Categories second → Products third."],
  ];
  instructions.forEach((r) => infoSheet.addRow(r));
  infoSheet.getColumn(1).width = 20;
  infoSheet.getColumn(2).width = 75;

  const buffer = await workbook.xlsx.writeBuffer();
  return new Response(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="category-template.xlsx"',
    },
  });
}
