import ExcelJS from "exceljs";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const MAX_DATA_ROWS = 1000;
const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF1C4E80" },
};
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

type CategoryRef = {
  name: string;
  attributeSchema: unknown;
};
type BrandRef = { name: string };

// Attribute field shape — handles both UI-created (name) and legacy bulk-created (label)
type SchemaField = {
  key?: string;
  name?: string;
  label?: string;
  type: string;
  options?: string[];
  required: boolean;
};

// Convert 1-based column number to Excel letter(s) (A, B, ..., Z, AA, AB, ...)
function colLetter(n: number): string {
  let s = "";
  let num = n;
  while (num > 0) {
    num--;
    s = String.fromCharCode(65 + (num % 26)) + s;
    num = Math.floor(num / 26);
  }
  return s;
}

// ─── GET /api/products/template?format=csv|xlsx ──────────────────────────────

export const GET = async (request: Request) => {
  let user: { orgId: string };
  try {
    user = await requireOrgAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch live brands + categories for dropdown population
  const [categories, brands] = await Promise.all([
    prisma.category.findMany({
      where: { orgId: user.orgId },
      select: { name: true, attributeSchema: true },
      orderBy: { name: "asc" },
    }),
    prisma.brand.findMany({
      where: { orgId: user.orgId, isActive: true },
      select: { name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") ?? "xlsx";

  if (format === "csv") return csvResponse(categories, brands);
  return xlsxResponse(categories, brands);
};

// ─── CSV ─────────────────────────────────────────────────────────────────────

function csvResponse(categories: CategoryRef[], brands: BrandRef[]): Response {
  // Include reference lists as comments at the top
  const brandList = brands.map((b) => b.name).join(", ");
  const catList = categories.map((c) => c.name).join(", ");

  const header = "brand_name,category_name,sku,name,base_price,cost_price,sizes_and_quantities,external_barcode,image_url,attributes,_status";
  const comment1 = `# Available brands: ${brandList || "(none yet — upload brands first)"}`;
  const comment2 = `# Available categories: ${catList || "(none yet — upload categories first)"}`;
  const ex1 = `Nike,T-Shirts,,Dri-FIT Training T-Shirt Black,1499,680,"S:10,M:15,L:15,XL:8",0195872516389,,color:Black;material:Polyester;fit:Regular,— example row —`;
  const ex2 = `Levis,Jeans,LV-JN-001,511 Slim-Fit Dark Blue Jeans,2499,1100,"28:5,30:10,32:15,34:10",8901234100011,,color:Blue;wash:Dark;fit:Slim,— example row —`;

  const body = [comment1, comment2, header, ex1, ex2].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="product-template.csv"',
    },
  });
}

// ─── XLSX ─────────────────────────────────────────────────────────────────────

async function xlsxResponse(
  categories: CategoryRef[],
  brands: BrandRef[]
): Promise<Response> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Inventigo Bulk Upload";
  workbook.created = new Date();

  // ── Collect unique attribute keys + their dropdown options across all categories ──
  const attrKeyOptionsMap = new Map<string, string[]>(); // key → union of all dropdown options
  for (const cat of categories) {
    const schema = cat.attributeSchema as { fields?: SchemaField[] };
    for (const field of schema?.fields ?? []) {
      const displayName = (field.name ?? field.label ?? "").trim();
      const key = field.key ?? displayName.toLowerCase().replace(/\s+/g, "_");
      if (!key) continue;
      if (!attrKeyOptionsMap.has(key)) attrKeyOptionsMap.set(key, []);
      if ((field.type === "select" || field.type === "dropdown") && field.options?.length) {
        const existing = new Set(attrKeyOptionsMap.get(key)!);
        for (const opt of field.options) existing.add(opt);
        attrKeyOptionsMap.set(key, [...existing]);
      }
    }
  }
  const uniqueAttrKeys = [...attrKeyOptionsMap.keys()];

  // Column layout:
  // A(1)=brand_name  B(2)=category_name  C(3)=sku  D(4)=name
  // E(5)=base_price  F(6)=cost_price  G(7)=sizes_and_quantities
  // H(8)=external_barcode  I(9)=image_url
  // J(10) onwards = one column per unique attr key
  // last = _status
  const BASE_COLS = 9;
  const statusColNum = BASE_COLS + 1 + uniqueAttrKeys.length;
  const statusLetter = colLetter(statusColNum);
  const lastDataColLetter = colLetter(BASE_COLS + uniqueAttrKeys.length);

  // ── Sheet 2: Category Reference ────────────────────────────────────────────
  const catSheet = workbook.addWorksheet("Category Reference");
  catSheet.columns = [
    { header: "Category Name", key: "name", width: 30 },
    { header: "Attributes", key: "attrs", width: 100 },
  ];
  catSheet.getRow(1).font = { bold: true };
  categories.forEach((c) => {
    const schema = c.attributeSchema as { fields?: SchemaField[] };
    const attrs = (schema?.fields ?? [])
      .map((f) => {
        const displayName = f.name ?? f.label ?? "(unnamed)";
        return `${displayName} (${f.type}${f.options?.length ? `: ${f.options.join(",")}` : ""})${f.required ? " *" : ""}`;
      })
      .join(" | ");
    catSheet.addRow({ name: c.name, attrs: attrs || "(no attributes defined)" });
  });

  // ── Sheet 3: Brand Reference ───────────────────────────────────────────────
  const brandSheet = workbook.addWorksheet("Brand Reference");
  brandSheet.columns = [{ header: "Brand Name", key: "name", width: 30 }];
  brandSheet.getRow(1).font = { bold: true };
  brands.forEach((b) => brandSheet.addRow({ name: b.name }));

  // ── Sheet 4: Attr Options (hidden — source ranges for attribute dropdowns) ────
  const attrOptionsSheet = workbook.addWorksheet("Attr Options");
  attrOptionsSheet.state = "veryHidden";
  uniqueAttrKeys.forEach((key, idx) => {
    attrOptionsSheet.getCell(1, idx + 1).value = key;
    const options = attrKeyOptionsMap.get(key) ?? [];
    options.forEach((opt, rowIdx) => {
      attrOptionsSheet.getCell(rowIdx + 2, idx + 1).value = opt;
    });
  });

  // ── Sheet 1: Data ──────────────────────────────────────────────────────────
  type WS = ExcelJS.Worksheet & { dataValidations: { add(ref: string, rule: object): void } };
  const sheet = workbook.addWorksheet("Data") as WS;

  const attrColumnDefs = uniqueAttrKeys.map((key) => ({
    header: key,
    key,
    width: 18,
  }));

  sheet.columns = [
    { header: "brand_name", key: "brand_name", width: 20 },
    { header: "category_name", key: "category_name", width: 22 },
    { header: "sku", key: "sku", width: 16 },
    { header: "name", key: "name", width: 38 },
    { header: "base_price", key: "base_price", width: 13 },
    { header: "cost_price", key: "cost_price", width: 13 },
    { header: "sizes_and_quantities", key: "sizes_and_quantities", width: 30 },
    { header: "external_barcode", key: "external_barcode", width: 18 },
    { header: "image_url", key: "image_url", width: 45 },
    ...attrColumnDefs,
    { header: "_status", key: "_status", width: 30 },
  ];

  // ── Style header row ──────────────────────────────────────────────────────
  const BASE_COLUMN_KEYS = new Set(["brand_name","category_name","sku","name","base_price","cost_price","sizes_and_quantities","external_barcode","image_url"]);
  const headerRow = sheet.getRow(1);
  headerRow.eachCell((cell) => {
    const val = String(cell.value ?? "");
    if (val === "_status") {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2EFDA" } };
      cell.font = { bold: true, color: { argb: "FF375623" } };
    } else if (!BASE_COLUMN_KEYS.has(val)) {
      // Attribute column — teal header
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2C7A7B" } };
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    } else {
      cell.fill = HEADER_FILL;
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    }
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = { bottom: { style: "medium", color: { argb: "FF1C4E80" } } };
  });
  headerRow.height = 22;

  // ── Example rows (2–3) ────────────────────────────────────────────────────
  const ex1Attrs: Record<string, string> = { color: "Black", material: "Polyester", fit: "Regular" };
  const ex1Base: Record<string, unknown> = {
    brand_name: "Nike", category_name: "T-Shirts", sku: "NK-TS-001",
    name: "Dri-FIT Training T-Shirt Black", base_price: 1499, cost_price: 680,
    sizes_and_quantities: "S:10,M:15,L:15,XL:8", external_barcode: "0195872516389",
    image_url: "", _status: "— example row, replace with your data —",
  };
  uniqueAttrKeys.forEach((k) => { if (ex1Attrs[k]) ex1Base[k] = ex1Attrs[k]; });

  const ex2Attrs: Record<string, string> = { color: "Blue", wash: "Dark", fit: "Slim" };
  const ex2Base: Record<string, unknown> = {
    brand_name: "Levis", category_name: "Jeans", sku: "LV-JN-001",
    name: "511 Slim-Fit Dark Blue Jeans", base_price: 2499, cost_price: 1100,
    sizes_and_quantities: "28:5,30:10,32:15,34:10", external_barcode: "8901234100011",
    image_url: "", _status: "— example row, replace with your data —",
  };
  uniqueAttrKeys.forEach((k) => { if (ex2Attrs[k]) ex2Base[k] = ex2Attrs[k]; });

  [ex1Base, ex2Base].forEach((ex, i) => {
    const row = sheet.addRow(ex);
    row.eachCell((cell) => {
      cell.fill = EXAMPLE_ROW_FILL;
      cell.font = EXAMPLE_ROW_FONT;
    });
    sheet.getRow(i + 2).protection = { locked: true };
  });

  // ── Data Validation (Layer 1) ─────────────────────────────────────────────
  const dataStart = 4;
  const dataEnd = dataStart + MAX_DATA_ROWS - 1;

  // brand_name — list from Brand Reference sheet
  const brandCount = Math.max(brands.length, 1);
  if (brands.length > 0) {
    sheet.dataValidations.add(`A${dataStart}:A${dataEnd}`, {
      type: "list",
      allowBlank: false,
      formulae: [`'Brand Reference'!$A$2:$A$${brandCount + 1}`],
      showInputMessage: true,
      promptTitle: "Brand Name",
      prompt: "Select from existing brands in your organisation.",
      showErrorMessage: true,
      errorStyle: "stop",
      errorTitle: "Brand Not Found",
      error: "Select a brand from the dropdown list. Upload brands first if the list is empty.",
    });
  } else {
    sheet.dataValidations.add(`A${dataStart}:A${dataEnd}`, {
      type: "textLength", operator: "greaterThan", formulae: [0],
      showInputMessage: true, promptTitle: "Brand Name",
      prompt: "Required. Upload brands first so the dropdown is populated.",
      showErrorMessage: false,
    });
  }

  // category_name — list from Category Reference sheet
  const catCount = Math.max(categories.length, 1);
  if (categories.length > 0) {
    sheet.dataValidations.add(`B${dataStart}:B${dataEnd}`, {
      type: "list",
      allowBlank: false,
      formulae: [`'Category Reference'!$A$2:$A$${catCount + 1}`],
      showInputMessage: true,
      promptTitle: "Category Name",
      prompt: "Select from existing categories. Upload categories first if the list is empty.",
      showErrorMessage: true,
      errorStyle: "stop",
      errorTitle: "Category Not Found",
      error: "Select a category from the dropdown list.",
    });
  } else {
    sheet.dataValidations.add(`B${dataStart}:B${dataEnd}`, {
      type: "textLength", operator: "greaterThan", formulae: [0],
      showInputMessage: true, promptTitle: "Category Name",
      prompt: "Required. Upload categories first so the dropdown is populated.",
      showErrorMessage: false,
    });
  }

  // sku — optional
  sheet.dataValidations.add(`C${dataStart}:C${dataEnd}`, {
    type: "textLength", operator: "greaterThan", formulae: [0], allowBlank: true,
    showInputMessage: true, promptTitle: "SKU (optional)",
    prompt: "Leave blank to auto-generate. If provided, must be unique per org.",
    showErrorMessage: false,
  });

  // name — required
  sheet.dataValidations.add(`D${dataStart}:D${dataEnd}`, {
    type: "textLength", operator: "greaterThan", formulae: [0],
    showInputMessage: true, promptTitle: "Product Name",
    prompt: "Required. Product display name, e.g. Blue Slim-Fit Cotton T-Shirt",
    showErrorMessage: false,
  });

  // base_price — decimal > 0
  sheet.dataValidations.add(`E${dataStart}:E${dataEnd}`, {
    type: "decimal", operator: "greaterThan", allowBlank: false, formulae: [0],
    showInputMessage: true, promptTitle: "Base / Selling Price",
    prompt: "Required. Selling price as a number > 0, e.g. 499",
    showErrorMessage: true, errorStyle: "stop", errorTitle: "Invalid Price",
    error: "Base price must be a number greater than 0.",
  });

  // cost_price — decimal > 0
  sheet.dataValidations.add(`F${dataStart}:F${dataEnd}`, {
    type: "decimal", operator: "greaterThan", allowBlank: false, formulae: [0],
    showInputMessage: true, promptTitle: "Cost / Purchase Price",
    prompt: "Required. Purchase cost as a number > 0, e.g. 230",
    showErrorMessage: true, errorStyle: "stop", errorTitle: "Invalid Price",
    error: "Cost price must be a number greater than 0.",
  });

  // sizes_and_quantities — optional
  sheet.dataValidations.add(`G${dataStart}:G${dataEnd}`, {
    type: "textLength", operator: "greaterThan", formulae: [0], allowBlank: true,
    showInputMessage: true, promptTitle: "Sizes & Quantities",
    prompt: "Optional. Format: S:10,M:20,L:15 (comma or semicolon). Leave blank → zero stock.",
    showErrorMessage: false,
  });

  // external_barcode — 8–14 chars or blank
  sheet.dataValidations.add(`H${dataStart}:H${dataEnd}`, {
    type: "custom", allowBlank: true,
    formulae: [`OR(H${dataStart}="",AND(LEN(H${dataStart})>=8,LEN(H${dataStart})<=14))`],
    showInputMessage: true, promptTitle: "External Barcode",
    prompt: "Optional. Manufacturer EAN-13 or UPC barcode, 8–14 digits.",
    showErrorMessage: true, errorStyle: "warning", errorTitle: "Check Barcode Length",
    error: "Barcode should be 8–14 digits (EAN-13 or UPC).",
  });

  // image_url — must start with http or blank
  sheet.dataValidations.add(`I${dataStart}:I${dataEnd}`, {
    type: "custom", allowBlank: true,
    formulae: [`OR(I${dataStart}="",ISNUMBER(SEARCH("http",I${dataStart})))`],
    showInputMessage: true, promptTitle: "Image URL",
    prompt: "Optional. Full public URL to product image, e.g. https://cdn.example.com/img.jpg",
    showErrorMessage: true, errorStyle: "warning", errorTitle: "Check URL",
    error: "URL should start with http or https.",
  });

  // ── Per-attribute column data validations (J onwards) ─────────────────────
  uniqueAttrKeys.forEach((key, idx) => {
    const attrColNum = BASE_COLS + 1 + idx; // J=10, K=11, ...
    const attrColLetter = colLetter(attrColNum);
    const attrOptionsColLetter = colLetter(idx + 1); // column in Attr Options sheet
    const options = attrKeyOptionsMap.get(key) ?? [];

    if (options.length > 0) {
      // Dropdown attribute — list from Attr Options sheet
      const maxOptionsRow = options.length + 1; // +1 for header
      sheet.dataValidations.add(`${attrColLetter}${dataStart}:${attrColLetter}${dataEnd}`, {
        type: "list",
        allowBlank: true,
        formulae: [`'Attr Options'!$${attrOptionsColLetter}$2:$${attrOptionsColLetter}$${maxOptionsRow}`],
        showInputMessage: true,
        promptTitle: key,
        prompt: `Select ${key} value. See "Category Reference" for valid options per category. Leave blank if this attribute does not apply.`,
        showErrorMessage: true,
        errorStyle: "information",
        errorTitle: "Check value",
        error: `This value may not match your category's valid options. Leave blank if not applicable.`,
      });
    } else {
      // Text attribute — input message only
      sheet.dataValidations.add(`${attrColLetter}${dataStart}:${attrColLetter}${dataEnd}`, {
        type: "textLength", operator: "greaterThan", formulae: [0], allowBlank: true,
        showInputMessage: true, promptTitle: key,
        prompt: `Text value for "${key}" attribute. Leave blank if not applicable.`,
        showErrorMessage: false,
      });
    }
  });

  // ── Conditional Formatting (Layer 2) ─────────────────────────────────────
  const anyFilled = `COUNTA($A${dataStart}:$${lastDataColLetter}${dataStart})>0`;

  sheet.addConditionalFormatting({
    ref: `A${dataStart}:A${dataEnd}`,
    rules: [{ type: "expression", priority: 1, formulae: [`AND(${anyFilled},A${dataStart}="")`], style: { fill: ERROR_FILL, font: ERROR_FONT } }],
  });
  sheet.addConditionalFormatting({
    ref: `B${dataStart}:B${dataEnd}`,
    rules: [{ type: "expression", priority: 1, formulae: [`AND(${anyFilled},B${dataStart}="")`], style: { fill: ERROR_FILL, font: ERROR_FONT } }],
  });
  sheet.addConditionalFormatting({
    ref: `D${dataStart}:D${dataEnd}`,
    rules: [{ type: "expression", priority: 1, formulae: [`AND(${anyFilled},D${dataStart}="")`], style: { fill: ERROR_FILL, font: ERROR_FONT } }],
  });
  sheet.addConditionalFormatting({
    ref: `E${dataStart}:E${dataEnd}`,
    rules: [{ type: "expression", priority: 1, formulae: [`AND(${anyFilled},OR(E${dataStart}="",NOT(ISNUMBER(E${dataStart})),E${dataStart}<=0))`], style: { fill: ERROR_FILL, font: ERROR_FONT } }],
  });
  sheet.addConditionalFormatting({
    ref: `F${dataStart}:F${dataEnd}`,
    rules: [{ type: "expression", priority: 1, formulae: [`AND(${anyFilled},OR(F${dataStart}="",NOT(ISNUMBER(F${dataStart})),F${dataStart}<=0))`], style: { fill: ERROR_FILL, font: ERROR_FONT } }],
  });
  sheet.addConditionalFormatting({
    ref: `I${dataStart}:I${dataEnd}`,
    rules: [{ type: "expression", priority: 1, formulae: [`AND(I${dataStart}<>"",NOT(ISNUMBER(SEARCH("http",I${dataStart}))))`], style: { fill: WARN_FILL, font: WARN_FONT } }],
  });

  // ── Status column (Layer 3) ───────────────────────────────────────────────
  for (let r = dataStart; r <= dataEnd; r++) {
    const cell = sheet.getCell(`${statusLetter}${r}`);
    cell.value = {
      formula:
        `IF(COUNTA(A${r}:${lastDataColLetter}${r})=0,"—",` +
        `IF(A${r}="","⚠ Brand is required",` +
        `IF(B${r}="","⚠ Category is required",` +
        `IF(D${r}="","⚠ Product name is required",` +
        `IF(OR(E${r}="",NOT(ISNUMBER(E${r})),E${r}<=0),"⚠ Base price must be > 0",` +
        `IF(OR(F${r}="",NOT(ISNUMBER(F${r})),F${r}<=0),"⚠ Cost price must be > 0",` +
        `"✓ Ready to upload"))))))`,
    };
  }
  sheet.addConditionalFormatting({
    ref: `${statusLetter}${dataStart}:${statusLetter}${dataEnd}`,
    rules: [
      {
        type: "expression", priority: 1,
        formulae: [`${statusLetter}${dataStart}="✓ Ready to upload"`],
        style: { fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFC6EFCE" } }, font: { color: { argb: "FF375623" } } },
      },
      {
        type: "expression", priority: 2,
        formulae: [`AND(${statusLetter}${dataStart}<>"—",LEFT(${statusLetter}${dataStart},1)="⚠")`],
        style: { fill: ERROR_FILL, font: ERROR_FONT },
      },
    ],
  });

  // ── Freeze, autofilter, protection ────────────────────────────────────────
  sheet.views = [{ state: "frozen", xSplit: 0, ySplit: 3 }];
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: statusColNum } };
  await sheet.protect("", { selectLockedCells: true, selectUnlockedCells: true });
  for (let r = dataStart; r <= dataEnd; r++) {
    sheet.getRow(r).protection = { locked: false };
  }

  // ── Instructions sheet ────────────────────────────────────────────────────
  const infoSheet = workbook.addWorksheet("Instructions");
  infoSheet.getCell("A1").value = "Inventigo — Product Bulk Upload Template";
  infoSheet.getCell("A1").font = { bold: true, size: 14 };
  const attrColumnNote = uniqueAttrKeys.length > 0
    ? `Attribute columns (${uniqueAttrKeys.join(", ")}): select values from the dropdown in each column. Only fill attributes that apply to your selected category — leave others blank. Refer to "Category Reference" sheet for which attributes each category uses.`
    : "No attribute columns: upload categories with attribute schemas first, then re-download this template.";
  const instructions = [
    ["", ""],
    ["Column", "Description"],
    ["brand_name", "Required. Select from the dropdown (sourced from 'Brand Reference' sheet)."],
    ["category_name", "Required. Select from the dropdown (sourced from 'Category Reference' sheet)."],
    ["sku", "Optional. Leave blank to auto-generate. Must be unique per org if provided."],
    ["name", "Required. Product display name, e.g. Blue Slim-Fit Cotton T-Shirt"],
    ["base_price", "Required. Selling price as a number > 0, e.g. 499"],
    ["cost_price", "Required. Purchase cost as a number > 0, e.g. 230"],
    ["sizes_and_quantities", "Optional. Format: S:10,M:20,L:15,XL:5 (comma or semicolon separator). Leave blank for zero stock."],
    ["external_barcode", "Optional. Manufacturer EAN-13 or UPC barcode."],
    ["image_url", "Optional. Full public URL to product image."],
    ["[attr columns]", attrColumnNote],
    ["", ""],
    ["Notes", ""],
    ["", "Rows 2–3 are example rows. Replace with your data starting from row 4."],
    ["", "The _status column updates live — sort by it to see all errors at once."],
    ["", "Refer to 'Category Reference' sheet to see which attributes and options are valid per category."],
    ["", brands.length === 0 ? "⚠ No brands found. Upload your brands first, then re-download this template." : `${brands.length} brand(s) available in the dropdown.`],
    ["", categories.length === 0 ? "⚠ No categories found. Upload your categories first, then re-download this template." : `${categories.length} category/ies available.`],
  ];
  instructions.forEach((r) => infoSheet.addRow(r));
  infoSheet.getColumn(1).width = 22;
  infoSheet.getColumn(2).width = 75;

  const buffer = await workbook.xlsx.writeBuffer();
  return new Response(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="product-template.xlsx"',
    },
  });
}

