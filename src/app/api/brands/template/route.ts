import ExcelJS from "exceljs";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { NextResponse } from "next/server";

const MAX_DATA_ROWS = 1000;
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
const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF1C4E80" },
};

// ─── GET /api/brands/template?format=csv|xlsx ────────────────────────────────

export const GET = async (request: Request) => {
  try {
    await requireOrgAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") ?? "xlsx";

  if (format === "csv") {
    return csvResponse();
  }
  return xlsxResponse();
};

// ─── CSV ─────────────────────────────────────────────────────────────────────

function csvResponse(): Response {
  const header = "name,logo_url,is_active";
  const example1 = "Nike,https://cdn.example.com/logos/nike.png,yes";
  const example2 = "Zudio,,yes";
  const body = [header, example1, example2].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="brand-template.csv"',
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

  // ── Columns ────────────────────────────────────────────────────────────────
  sheet.columns = [
    { header: "name", key: "name", width: 25 },
    { header: "logo_url", key: "logo_url", width: 45 },
    { header: "is_active", key: "is_active", width: 12 },
    { header: "_status", key: "_status", width: 28 },
  ];

  // ── Style header row (row 1) ────────────────────────────────────────────────
  const headerRow = sheet.getRow(1);
  headerRow.eachCell((cell) => {
    if (cell.value === "_status") {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2EFDA" } };
      cell.font = { bold: true, color: { argb: "FF375623" } };
    } else {
      cell.fill = HEADER_FILL;
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    }
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = {
      bottom: { style: "medium", color: { argb: "FF1C4E80" } },
    };
  });
  headerRow.height = 22;

  // ── Example rows (rows 2–3) ─────────────────────────────────────────────────
  const examples = [
    { name: "Nike", logo_url: "https://cdn.example.com/logos/nike.png", is_active: "yes", _status: "— example row, replace with your data —" },
    { name: "Zudio", logo_url: "", is_active: "yes", _status: "— example row, replace with your data —" },
  ];
  examples.forEach((ex, i) => {
    const row = sheet.addRow(ex);
    row.eachCell((cell) => {
      cell.fill = EXAMPLE_ROW_FILL;
      cell.font = EXAMPLE_ROW_FONT;
    });
    // Lock example rows from editing (worksheet protection applied below)
    sheet.getRow(i + 2).protection = { locked: true };
  });

  // ── Data rows (4 to MAX_DATA_ROWS + 3) ──────────────────────────────────────
  const dataStart = 4;
  const dataEnd = dataStart + MAX_DATA_ROWS - 1;
  const dataRange = `${dataStart}:${dataEnd}`;

  // is_active dropdown — Data Validation (Layer 1)
  sheet.dataValidations.add(`C${dataStart}:C${dataEnd}`, {
    type: "list",
    allowBlank: true,
    formulae: ['"yes,no"'],
    showInputMessage: true,
    promptTitle: "Active Status",
    prompt: "Select 'yes' or 'no'. Leave blank to default to 'yes'.",
    showErrorMessage: true,
    errorStyle: "stop",
    errorTitle: "Invalid Value",
    error: "Must be 'yes' or 'no'.",
  });

  // logo_url: warning if filled but doesn't start with http
  // (ExcelJS custom validation via formula — expression type)
  sheet.dataValidations.add(`B${dataStart}:B${dataEnd}`, {
    type: "custom",
    allowBlank: true,
    formulae: [`OR(B${dataStart}="",ISNUMBER(SEARCH("http",B${dataStart})))`],
    showInputMessage: true,
    promptTitle: "Logo URL",
    prompt: "Optional. Full public URL, e.g. https://cdn.example.com/logos/nike.png",
    showErrorMessage: true,
    errorStyle: "warning",
    errorTitle: "Check URL",
    error: "URL should start with http or https.",
  });

  // name: required field tooltip
  sheet.dataValidations.add(`A${dataStart}:A${dataEnd}`, {
    type: "textLength",
    operator: "greaterThan",
    formulae: [0],
    showInputMessage: true,
    promptTitle: "Brand Name",
    prompt: "Required. Unique name per organisation, e.g. Nike",
    showErrorMessage: false, // Conditional formatting handles the visual; we don't block
  });

  // ── Conditional Formatting (Layer 2) ────────────────────────────────────────
  // name blank while other cols on same row are filled → red
  sheet.addConditionalFormatting({
    ref: `A${dataStart}:A${dataEnd}`,
    rules: [
      {
        type: "expression",
        priority: 1,
        formulae: [`AND(COUNTA($A${dataStart}:$C${dataStart})>0,A${dataStart}="")`],
        style: { fill: ERROR_FILL, font: ERROR_FONT },
      },
    ],
  });

  // logo_url filled but not a URL → orange warning
  sheet.addConditionalFormatting({
    ref: `B${dataStart}:B${dataEnd}`,
    rules: [
      {
        type: "expression",
        priority: 1,
        formulae: [
          `AND(B${dataStart}<>"",NOT(ISNUMBER(SEARCH("http",B${dataStart}))))`,
        ],
        style: { fill: WARN_FILL, font: WARN_FONT },
      },
    ],
  });

  // ── Status column formulas (Layer 3) ─────────────────────────────────────────
  for (let r = dataStart; r <= dataEnd; r++) {
    const cell = sheet.getCell(`D${r}`);
    cell.value = {
      formula: `IF(COUNTA(A${r}:C${r})=0,"—",IF(A${r}="","⚠ Brand name is required","✓ Ready to upload"))`,
    };
    // Style via conditional formatting on the status column
  }

  // Status column green / red / grey via CF
  sheet.addConditionalFormatting({
    ref: `D${dataStart}:D${dataEnd}`,
    rules: [
      {
        type: "expression",
        priority: 1,
        formulae: [`D${dataStart}="✓ Ready to upload"`],
        style: {
          fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFC6EFCE" } },
          font: { color: { argb: "FF375623" } },
        },
      },
      {
        type: "expression",
        priority: 2,
        formulae: [`AND(D${dataStart}<>"—",LEFT(D${dataStart},1)="⚠")`],
        style: { fill: ERROR_FILL, font: ERROR_FONT },
      },
    ],
  });

  // ── Worksheet protection (lock example rows, allow editing data rows) ────────
  await sheet.protect("", {
    selectLockedCells: true,
    selectUnlockedCells: true,
    formatRows: false,
    formatColumns: false,
  });
  // Mark data rows as unlocked
  for (let r = dataStart; r <= dataEnd; r++) {
    sheet.getRow(r).protection = { locked: false };
  }

  // Freeze header + example rows; user scrolls from row 4
  sheet.views = [{ state: "frozen", xSplit: 0, ySplit: 3 }];

  // Widen status column, hide the "helper column" feeling with light header
  sheet.getColumn("_status").width = 30;

  // Autofilter on header row
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: 4 },
  };

  // ── Add instruction sheet ──────────────────────────────────────────────────
  const infoSheet = workbook.addWorksheet("Instructions");
  infoSheet.getCell("A1").value = "Inventigo — Brand Bulk Upload Template";
  infoSheet.getCell("A1").font = { bold: true, size: 14 };
  const instructions = [
    ["", ""],
    ["Column", "Description"],
    ["name", "Required. Brand display name. Must be unique per organisation."],
    ["logo_url", "Optional. Full public URL to brand logo. Leave blank if not available."],
    ["is_active", "Optional. 'yes' or 'no'. Defaults to 'yes' if blank."],
    ["", ""],
    ["Notes", ""],
    ["", "Rows 2–3 are example rows (greyed out). Replace them with your data."],
    ["", "Data entry starts at row 4."],
    ["", "The _status column updates live — sort by it to see all errors at once."],
    ["", "Upload order: Brands first → Categories second → Products third."],
  ];
  instructions.forEach((r) => infoSheet.addRow(r));
  infoSheet.getColumn(1).width = 20;
  infoSheet.getColumn(2).width = 65;

  // ── Write buffer and return ────────────────────────────────────────────────
  const buffer = await workbook.xlsx.writeBuffer();

  return new Response(buffer as ArrayBuffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="brand-template.xlsx"',
    },
  });
}
