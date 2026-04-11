# Bulk Upload — Categories & Products

> Feature design document covering UX flow, template format, validation rules, backend architecture, implementation phases, and working examples.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Design Decisions](#2-design-decisions)
3. [User Experience Flow](#3-user-experience-flow)
4. [Template Design](#4-template-design)
   - [Category Template](#41-category-template)
   - [Product Template](#42-product-template)
   - [Brand Template](#43-brand-template)
5. [Template Examples](#5-template-examples)
   - [4 Category Rows](#51-4-category-rows)
   - [20 Product Rows](#52-20-product-rows)
   - [6 Brand Rows](#53-6-brand-rows)
6. [Validation Rules](#6-validation-rules)
7. [Architecture & Data Flow](#7-architecture--data-flow)
8. [Backend Bulk Insert Strategy](#8-backend-bulk-insert-strategy)
9. [Barcode / Variant SKU Handling](#9-barcode--variant-sku-handling)
10. [Files to Create and Modify](#10-files-to-create-and-modify)
11. [Packages to Install](#11-packages-to-install)
12. [Implementation Phases](#12-implementation-phases)
13. [Verification Checklist](#13-verification-checklist)

---

## 1. Overview

Currently users add categories and products one at a time through the UI form. When an org needs to onboard 20 categories and 100+ products (e.g. during initial setup or a seasonal refresh), this is time-consuming and generates N individual API calls.

The Bulk Upload feature introduces enterprise-style spreadsheet import (as used by Flipkart, Myntra, Zara, Westside, Zudio) that allows importing **1000+ rows in a single operation** using a single server-side transaction.

**Scope — three entities supported:**
- **Brands** — bulk create brands before or during product onboarding
- **Categories** — bulk create categories with sizes and up to 10 attribute definitions
- **Products** — bulk create products with stock quantities; references brand + category by name

**Key capabilities:**
- Download a pre-formatted CSV or Excel template with example rows and column guidance
- Excel templates include dropdown-validated cells and reference sheets for brand/category lookup
- Parse the file in the browser before sending anything to the server
- Inspect a preview table where every invalid row is highlighted red before committing
- All-or-nothing import: fix every error first, then the entire batch is inserted atomically
- Variant barcodes (`variantSku`) are auto-generated on the backend — no manual input required
- Recommended upload order: **Brands first → Categories second → Products third**

---

## 2. Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| File formats | CSV + Excel (.xlsx) | CSV is universal; Excel enables dropdown validation cells |
| Error handling | Reject entire batch | Data integrity first — user must resolve all issues before any row is inserted |
| Product images | Optional `image_url` column | If URL provided it is saved; if left blank the product imports fine (matches UI behaviour) |
| Category attributes in template | Yes — 4 columns per attribute block | Single cryptic `key\|type` encoding is error-prone; split into readable Name/Type/Values/Required columns |
| SKU in product template | Optional | If blank, server auto-generates using same Brand+Category prefix logic as the UI |
| Variant barcodes | Not in template | Generated automatically at backend per `StockEntry` — same as single product creation |
| Max attributes per category | **10** | Supports complex attribute schemas; unused blocks (blank `attr_N_name`) are silently ignored on upload. User fills only what they need — if 2 attributes, leave attr_3 through attr_10 blank. |
| Name normalization — Brand | Case-insensitive only | `Nike`, `nike`, `NIKE` → normalised as `nike` before uniqueness check. Stored with original casing the user entered. |
| Name normalization — Category | Case-insensitive + strip separators | `T-Shirts`, `t_shirts`, `TSHIRTS`, `T Shirts` → all normalised to `tshirts` before uniqueness check. Prevents duplicate categories that differ only in case, hyphens, underscores or spaces. Slug generated from the normalised form. |
| Name normalization — Attribute names | Case-insensitive within a category row | `Color`, `color`, `COLOR` within the same category's attribute blocks are treated as duplicate attribute names — rejected with an error. |
| Name normalization — Product SKU | Case-insensitive | `NK-TS-001`, `nk-ts-001`, `NK-ts-001` are treated as the same SKU for uniqueness checks. |
| Excel dropdown columns — Product template | `brand_name` and `category_name` are data-validated dropdowns | User selects from existing brands/categories directly in Excel — no typos, no foreign-key surprises |
| Excel reference sheets — Product template | Sheet 2 "Category Reference", Sheet 3 "Brand Reference" | Auto-populated at download time from live DB; source data for the in-cell dropdowns |
| Brand bulk upload | Yes — same 4-step drawer pattern | Brands must exist before products can reference them; bulk brand upload enables full fresh-org onboarding in one flow |
| Batch size support | 1000+ rows | Achieved via Prisma `createMany` inside a single transaction — no N+1 inserts |
| In-Excel validation | 3-layer system — Data Validation + Conditional Formatting + Status column | Catches errors before the file is uploaded. No VBA, no macros, no `.xlsm` — all three layers work in standard `.xlsx`. CSV templates do not support this; CSV users rely entirely on the Step 3 Preview table. |
| Excel template library | `exceljs` (replaces `xlsx` / SheetJS Community) | `exceljs` has a full documented API for Data Validation (input messages, Stop/Warning/Information alert styles) and Conditional Formatting. SheetJS Community `xlsx` does not support either. |

---

## 3. User Experience Flow

A **4-step Drawer** opens from the right side (720 px wide) when the user clicks **Bulk Upload** next to the "Add Category" or "Add Product" button in the toolbar.

```
[BrandTable Toolbar]
  [+ Add Brand]     [↑ Bulk Upload]   ← new button

[CategoryTable Toolbar]
  [+ Add Category]  [↑ Bulk Upload]   ← new button

[ProductTable Toolbar]
  [+ Add Product]   [↑ Bulk Upload]   ← new button
```

### Step 1 — Template
- Instructions explaining each column
- Two download buttons: **Download CSV Template** and **Download Excel Template**
- Excel template has:
  - Sheet 1 "Data" — column headers + 2 example rows (locked/greyed), data starts row 4
  - Sheet 2 "Category Reference" (products template only) — lists every existing category name (dropdown source for `category_name` column) plus full attribute schema for reference
  - Sheet 3 "Brand Reference" (products template only) — lists every existing brand name (dropdown source for `brand_name` column)
  - **Layer 1 — Data Validation:** Every constrained column has a validation rule. When the user exits a cell with invalid data, a **Stop alert** fires and blocks entry. Each cell shows an **Input Message tooltip** on focus (e.g. "Enter selling price as a number, e.g. 499"). Applies to: required text fields, price columns, dropdown-constrained columns (`attr_N_type`, `attr_N_required`, `is_active`, `brand_name`, `category_name`), URL columns, barcode length.
  - **Layer 2 — Conditional Formatting:** Required cells in a started row turn red automatically as the user types. The formula `=AND(COUNTA($A4:$J4)>0, A4="")` highlights a blank required cell only when something else on the same row is filled — so untouched rows stay neutral. Other patterns: price cell filled but non-numeric → red; `attr_N_type = dropdown` but `attr_N_values` blank → red.
  - **Layer 3 — Status column** (`_status`, last column): A formula-driven per-row summary that checks all rules and outputs the first error found as "⚠ Product name is required", or "✓ Ready to upload" when the row is valid. Blank rows show "—". Conditional formatting colours the Status cell: grey (not started), red (error), green (ready). User can sort by this column to bring all error rows to the top.
- A note below the CSV download button: *"The Excel template includes built-in cell validation, live error highlighting, and a Status column. Recommended over CSV for large or complex batches."*
- A "Next →" button proceeds to Step 2

### Step 2 — Upload
- Drag-and-drop zone accepting `.csv`, `.xlsx`, `.xls` (max 10 MB)
- After file is selected: file is parsed **entirely in the browser** (no upload yet)
- Shows: filename, file size, and "**X rows found**" count
- A "← Back" and "Preview →" button

### Step 3 — Preview
- Virtual-scroll table showing all parsed rows
- Row colour coding:
  - Green — valid
  - Red — invalid (error message shown inline in an "Error" column at the far right)
- A summary bar: "✓ 95 valid   ✗ 5 errors"
- **"Import" button is disabled as long as any row has an error**
- "← Re-upload" button to go back and fix the file
- User can scroll through 1000+ rows with no performance issue (virtual scroll via `rc-virtual-list` bundled in Ant Design)

### Step 4 — Done
- On click of "Import": spinner shown, POST sent to `/api/categories/bulk` or `/api/products/bulk`
- **Success state:**
  - Green checkmark icon
  - "X categories imported successfully!" or "X products imported successfully!"
  - "Close" button — triggers list refresh
- **Failure state** (server-side validation caught something):
  - Red icon
  - Error summary table with columns: Row # | SKU/Name | Error
  - "Download Error Report" button — downloads a CSV with the errors so user can correct the source file
  - "← Try Again" button to go back to Upload step

---

## 4. Template Design

### 4.1 Category Template

**Column count:** 43 (3 base + 10 × 4 attribute columns)

| # | Column Name | Required | Format / Notes |
|---|-------------|----------|----------------|
| 1 | `name` | ✓ | Category name. Must be unique per organisation. |
| 2 | `description` | | Short description of the category. |
| 3 | `sizes` | ✓ | Comma-separated size labels. E.g. `S,M,L,XL` or `6,7,8,9,10` or `Free Size` |
| 4 | `attr_1_name` | | Name of first attribute. E.g. `Color` |
| 5 | `attr_1_type` | | **Excel dropdown:** `text` or `dropdown` |
| 6 | `attr_1_values` | | Only fill when type = `dropdown`. Comma-separated options. E.g. `Red,Blue,Green,Black` |
| 7 | `attr_1_required` | | **Excel dropdown:** `yes` or `no` |
| 8–11 | `attr_2_*` | | Second attribute block (name / type / values / required) |
| 12–15 | `attr_3_*` | | Third attribute block |
| 16–19 | `attr_4_*` | | Fourth attribute block |
| 20–23 | `attr_5_*` | | Fifth attribute block |
| 24–27 | `attr_6_*` | | Sixth attribute block |
| 28–31 | `attr_7_*` | | Seventh attribute block |
| 32–35 | `attr_8_*` | | Eighth attribute block |
| 36–39 | `attr_9_*` | | Ninth attribute block |
| 40–43 | `attr_10_*` | | Tenth attribute block |

**Notes:**
- If `attr_N_type` is `text`, leave `attr_N_values` blank.
- If an attribute block's `attr_N_name` is blank, **the entire block is silently ignored** — no error, no data stored. Fill only the attributes you need; leave the rest blank.
- There is no minimum — a category with 0 attributes is valid (sizes are still mandatory).
- The generated `attributeSchema` JSON stored in the database follows the existing format: `{ fields: [{ key, label, type, options, required }] }`.
- The `key` is auto-derived from `attr_N_name` by lowercasing and replacing spaces with underscores (e.g. `"Neck Type"` → `"neck_type"`).

**Excel template validation (Layer 1 — Data Validation):**
| Column | Validation | Alert style | Input tooltip |
|--------|-----------|-------------|---------------|
| `name` | Text, `LEN(TRIM(A4))>0` | Stop — "Category name is required" | "Unique category name, e.g. T-Shirts" |
| `sizes` | Text, `LEN(TRIM(C4))>0` | Stop — "At least one size is required" | "Comma-separated sizes, e.g. S,M,L,XL" |
| `attr_N_type` | List: `text,dropdown` | Stop — "Must be 'text' or 'dropdown'" | "Select attribute type" |
| `attr_N_required` | List: `yes,no` | Stop — "Must be 'yes' or 'no'" | "Is this attribute required?" |

**Excel template validation (Layer 2 — Conditional Formatting):**
- `name` blank while `sizes` or any attribute on the same row is filled → **red**
- `sizes` blank while `name` is filled → **red**
- `attr_N_type = dropdown` but `attr_N_values` is blank → **red** on the `attr_N_values` cell
- `attr_N_values` filled but `attr_N_type ≠ dropdown` → **orange** (warning — values will be ignored)

**Excel template validation (Layer 3 — Status column):**
- Column 44 (`_status`) — formula-driven per-row summary. Shows "✓ Ready to upload" (green), "⚠ [first error]" (red), or "—" for blank rows.
- The file parser ignores all columns starting with `_` — the `_status` column is stripped before validation and import.

---

### 4.2 Product Template

**Column count:** 10

**Column order mirrors the UI form input flow:** Brand → Category → SKU → Product details → Stock → Identifiers → Attributes

| # | Column Name | Required | Format / Notes |
|---|-------------|----------|----------------|
| 1 | `brand_name` | ✓ | Exact brand name as registered in the org. E.g. `Zudio` |
| 2 | `category_name` | ✓ | Exact category name in the org. E.g. `T-Shirts` |
| 3 | `sku` | | Leave blank → auto-generated as `{BRAND_PREFIX}-{CAT_PREFIX}-{seq}`. If provided, must be unique per org. |
| 4 | `name` | ✓ | Product display name. E.g. `Blue Slim-Fit Cotton T-Shirt` |
| 5 | `base_price` | ✓ | Selling price (number, > 0). E.g. `499` |
| 6 | `cost_price` | ✓ | Purchase/cost price (number, > 0). E.g. `230` |
| 7 | `sizes_and_quantities` | | `SizeName:Qty` pairs separated by commas. E.g. `S:10,M:20,L:15,XL:5`. Leave blank → product created with zero stock. |
| 8 | `external_barcode` | | Manufacturer EAN-13 / UPC barcode. E.g. `8901234567890`. Optional. |
| 9 | `image_url` | | Public image URL. Leave blank → no image (product still imports). E.g. `https://cdn.example.com/img/tshirt-blue.jpg` |
| 10 | `attributes` | | `key:value` pairs separated by `;`. Keys must match the category's `attributeSchema`. E.g. `color:Blue;material:Cotton;fit:Slim` |

**Excel extras:**
- **`brand_name` column** — Data Validation dropdown in Excel. The allowed values list is sourced from Sheet 3 "Brand Reference" (column A). User clicks the cell and picks from existing brands — no free-text entry, no typo-driven foreign-key failures.
- **`category_name` column** — Data Validation dropdown in Excel. The allowed values list is sourced from Sheet 2 "Category Reference" (column A). Same protection.
- Sheet 2 "Category Reference" — auto-populated at template download time: lists every existing category name (used as dropdown source) plus its full attribute schema for reference:

```
[Sheet 2: Category Reference]

Column A (dropdown source for category_name):
  T-Shirts
  Jeans
  Footwear
  Kurtas

Attribute reference block (informational, below the dropdown list):
Category: T-Shirts    Attributes → color (dropdown: Red,Blue,Green,Black,White) | material (dropdown: Cotton,Polyester,Blend) | fit (dropdown: Regular,Slim,Oversized)
Category: Jeans       Attributes → color (dropdown: Blue,Black,Grey,White) | wash (dropdown: Light,Medium,Dark,Raw) | fit (dropdown: Slim,Skinny,Straight,Bootcut) | rise (dropdown: Low,Mid,High)
Category: Footwear    Attributes → color (dropdown: Black,White,Brown,Grey,Navy) | closure (dropdown: Lace-up,Slip-on,Velcro) | material (dropdown: Leather,Canvas,Mesh,Synthetic)
Category: Kurtas      Attributes → color (text) | pattern (dropdown: Solid,Printed,Embroidered,Checkered) | sleeve (dropdown: Full,Half,Sleeveless) | occasion (dropdown: Casual,Festive,Formal)
```

- Sheet 3 "Brand Reference" — auto-populated at template download time: lists every existing brand name (used as dropdown source):

```
[Sheet 3: Brand Reference]

Column A (dropdown source for brand_name):
  Zudio
  Levis
  Nike
  Bata
  Fabindia
  W for Woman
```

> **Why dropdowns matter:** Without these, a user who types "Levi's" (with apostrophe) instead of "Levis" would only find out at Step 4 after the server rejects the whole batch. The dropdown prevents the error at the source.

**Excel template validation (Layer 1 — Data Validation):**
| Column | Validation | Alert style | Input tooltip |
|--------|-----------|-------------|---------------|
| `brand_name` | List from Sheet 3 col A | Stop — "Select a brand from the list" | "Pick an existing brand" |
| `category_name` | List from Sheet 2 col A | Stop — "Select a category from the list" | "Pick an existing category" |
| `name` | Text, `LEN(TRIM(D4))>0` | Stop — "Product name is required" | "Product display name, e.g. Blue Slim-Fit T-Shirt" |
| `base_price` | Decimal > 0 | Stop — "Must be a number greater than 0" | "Selling price, e.g. 499" |
| `cost_price` | Decimal > 0 | Stop — "Must be a number greater than 0" | "Purchase/cost price, e.g. 230" |
| `external_barcode` | Text length 0 or 8–14 | Warning — "Barcode should be 8–14 digits" | "EAN-13 or UPC barcode (optional)" |
| `image_url` | `OR(G4="", ISNUMBER(SEARCH("http",G4)))` | Warning — "Should start with http" | "Full public URL to product image (optional)" |

**Excel template validation (Layer 2 — Conditional Formatting):**
- `brand_name` blank while any other column on that row is filled → **red**
- `category_name` blank while any other column on that row is filled → **red**
- `name` blank while any other column on that row is filled → **red**
- `base_price` or `cost_price` filled but not a positive number → **red**
- `sizes_and_quantities` filled but doesn't match `Name:Number,...` pattern → **orange** (warning)

**Excel template validation (Layer 3 — Status column):**
- Column 11 (`_status`) — shows "✓ Ready to upload" (green), "⚠ [first error]" (red), or "—" for blank rows.
- Stripped by file parser before validation and import.

---

### 4.3 Brand Template

**Column count:** 3

Brands are the simplest entity — just a name, an optional logo URL, and an active flag. They must be uploaded **before** products, since the product template's `brand_name` dropdown is populated from existing brands.

| # | Column Name | Required | Format / Notes |
|---|-------------|----------|----------------|
| 1 | `name` | ✓ | Brand display name. Must be unique per organisation. E.g. `Nike` |
| 2 | `logo_url` | | Public URL to the brand logo image. Leave blank if not available — brand still imports. E.g. `https://cdn.example.com/logos/nike.png` |
| 3 | `is_active` | | **Excel dropdown:** `yes` or `no`. Defaults to `yes` if left blank. |

**Notes:**
- `is_active` blank = treated as `yes` (same default as the UI form).
- `logo_url` is optional — brand imports fine with no logo, logo can be added later via Edit.
- After a brand batch is imported, user can immediately download a fresh Product template and the new brands will appear in the `brand_name` dropdown on Sheet 3.
- Server validates that `name` is unique per org — duplicate brand names in the same batch or against existing records roll back the entire batch.

**Excel template validation (Layer 1 — Data Validation):**
| Column | Validation | Alert style | Input tooltip |
|--------|-----------|-------------|---------------|
| `name` | Text, `LEN(TRIM(A4))>0` | Stop — "Brand name is required" | "Unique brand display name, e.g. Nike" |
| `logo_url` | `OR(B4="", ISNUMBER(SEARCH("http",B4)))` | Warning — "Should start with http" | "Full public URL to brand logo (optional)" |
| `is_active` | List: `yes,no` | Stop — "Must be 'yes' or 'no'" | "Leave blank to default to 'yes'" |

**Excel template validation (Layer 2 — Conditional Formatting):**
- `name` blank while any other column on that row is filled → **red**
- `logo_url` filled but doesn't start with `http` → **orange** (warning)

**Excel template validation (Layer 3 — Status column):**
- Column 4 (`_status`) — shows "✓ Ready to upload" (green), "⚠ Brand name is required" (red), or "—" for blank rows.
- Stripped by file parser before validation and import.

---

### 5.1 — 4 Category Rows

This is what the data rows look like in the downloaded template (rows 4–7 in Excel, rows 2–5 in CSV after the header). Only filled attribute blocks are shown — blank blocks (attr_5 through attr_10) are omitted here for readability but all 43 columns exist in the actual file.

```
name     | description                    | sizes              | attr_1_name | attr_1_type | attr_1_values                           | attr_1_required | attr_2_name | attr_2_type | attr_2_values           | attr_2_required | attr_3_name | attr_3_type | attr_3_values                | attr_3_required | attr_4_name | attr_4_type | attr_4_values         | attr_4_required | attr_5_name | attr_5_type | attr_5_values | attr_5_required | [attr_6 through attr_10 — all blank]
---------+--------------------------------+--------------------+-------------+-------------+-----------------------------------------+-----------------+-------------+-------------+-------------------------+-----------------+-------------+-------------+------------------------------+-----------------+-------------+-------------+-----------------------+-----------------+-------------+-------------+---------------+-----------------+---------
T-Shirts | Casual and basic tee styles    | XS,S,M,L,XL,XXL   | Color       | dropdown    | Red,Blue,Green,Black,White,Navy         | yes             | Material    | dropdown    | Cotton,Polyester,Blend  | yes             | Fit         | dropdown    | Regular,Slim,Oversized       | no              |             |             |               |                 |
Jeans    | Denim trousers and bottoms     | 28,30,32,34,36,38  | Color       | dropdown    | Blue,Black,Grey,White                   | yes             | Wash        | dropdown    | Light,Medium,Dark,Raw   | yes             | Fit         | dropdown    | Slim,Skinny,Straight,Bootcut | yes             | Rise        | dropdown    | Low,Mid,High          | no              |
Footwear | Shoes sandals and sneakers     | 5,6,7,8,9,10,11,12 | Color       | dropdown    | Black,White,Brown,Grey,Navy             | yes             | Closure     | dropdown    | Lace-up,Slip-on,Velcro  | yes             | Material    | dropdown    | Leather,Canvas,Mesh,Synthetic| no              | Sole        | dropdown    | Rubber,EVA,Leather    | no              |
Kurtas   | Traditional Indian ethnic wear | XS,S,M,L,XL,XXL   | Color       | text        |                                         | yes             | Pattern     | dropdown    | Solid,Printed,Embroidered,Checkered | yes  | Sleeve  | dropdown    | Full,Half,Sleeveless         | no              | Occasion    | dropdown    | Casual,Festive,Formal | no              | Neck Type   | dropdown    | Round,V-Neck,Mandarin,Collar | no
```

**What the backend stores for T-Shirts after import:**
```json
{
  "name": "T-Shirts",
  "description": "Casual and basic tee styles",
  "sizes": ["XS", "S", "M", "L", "XL", "XXL"],
  "attributeSchema": {
    "fields": [
      { "key": "color",    "label": "Color",    "type": "dropdown", "options": ["Red","Blue","Green","Black","White","Navy"],  "required": true },
      { "key": "material", "label": "Material", "type": "dropdown", "options": ["Cotton","Polyester","Blend"],                 "required": true },
      { "key": "fit",      "label": "Fit",      "type": "dropdown", "options": ["Regular","Slim","Oversized"],                 "required": false }
    ]
  }
}
```

**Note on Kurtas:** It uses 5 attribute blocks. Attr_6 through attr_10 are blank — those blocks are discarded. The database stores exactly 5 attributes. Footwear also uses 4 blocks; T-Shirts uses only 3. Each category can have a different number of attributes up to the maximum of 10.

---

### 5.2 — 20 Product Rows

These are the 20 product rows as they would appear in the template. Column headers are shown once at the top.

```
brand_name | category_name | sku        | name                                        | base_price | cost_price | sizes_and_quantities             | external_barcode | image_url | attributes
-----------+---------------+------------+---------------------------------------------+------------+------------+----------------------------------+------------------+-----------+----------------------------------
Zudio      | T-Shirts      |            | Classic White Round-Neck T-Shirt            | 299        | 130        | S:15,M:25,L:20,XL:10,XXL:5      |                  |           | color:White;material:Cotton;fit:Regular
Zudio      | T-Shirts      |            | Navy Blue Slim-Fit T-Shirt                  | 349        | 155        | S:10,M:20,L:20,XL:10            |                  |           | color:Navy;material:Cotton;fit:Slim
Zudio      | T-Shirts      |            | Black Oversized Graphic Tee                 | 449        | 200        | S:8,M:12,L:15,XL:12,XXL:5      |                  |           | color:Black;material:Cotton;fit:Oversized
Zudio      | T-Shirts      |            | Olive Green Polyester Sports Tee            | 399        | 175        | XS:5,S:10,M:20,L:15,XL:8       |                  |           | color:Green;material:Polyester;fit:Regular
Levis      | Jeans         | LV-JN-001  | 511 Slim-Fit Dark Blue Jeans                | 2499       | 1100       | 28:5,30:10,32:15,34:10,36:5     | 8901234100011    |           | color:Blue;wash:Dark;fit:Slim
Levis      | Jeans         | LV-JN-002  | 501 Original Straight Black Jeans           | 2799       | 1250       | 28:4,30:8,32:12,34:8,36:4       | 8901234100028    |           | color:Black;wash:Raw;fit:Straight
Levis      | Jeans         |            | Skinny Mid-Rise Grey Jeans                  | 1999       | 900        | 28:6,30:10,32:10,34:6           |                  |           | color:Grey;wash:Medium;fit:Skinny;rise:Mid
Levis      | Jeans         |            | High-Rise Bootcut White Jeans               | 2299       | 1050       | 28:3,30:6,32:8,34:5             |                  |           | color:White;wash:Light;fit:Bootcut;rise:High
Nike       | Footwear      | NK-FW-001  | Air Max 270 Running Shoes White             | 8999       | 4200       | 6:3,7:5,8:8,9:6,10:4,11:2      | 0196153609414    |           | color:White;closure:Lace-up;material:Mesh
Nike       | Footwear      | NK-FW-002  | Revolution 6 Training Shoes Black           | 4999       | 2300       | 6:4,7:6,8:10,9:8,10:5,11:3     | 0194502303451    |           | color:Black;closure:Lace-up;material:Mesh
Nike       | Footwear      |            | Tanjun Slip-On Casual Shoes Grey            | 3499       | 1600       | 6:5,7:8,8:12,9:10,10:6         |                  |           | color:Grey;closure:Slip-on;material:Canvas
Bata       | Footwear      |            | Hush Puppies Leather Derby Brown            | 3999       | 1800       | 6:4,7:6,8:8,9:6,10:4            | 8901131122350    |           | color:Brown;closure:Lace-up;material:Leather
Zudio      | Jeans         |            | Slim-Fit Blue Stretch Jeans                 | 799        | 360        | 28:8,30:12,32:15,34:10,36:5     |                  |           | color:Blue;wash:Medium;fit:Slim
Fabindia   | Kurtas        |            | Pure Cotton Printed White Kurta             | 1299       | 580        | S:10,M:15,L:12,XL:8,XXL:4      |                  |           | color:White;pattern:Printed;sleeve:Full;occasion:Casual
Fabindia   | Kurtas        |            | Solid Navy Festive Silk Blend Kurta         | 2199       | 980        | S:5,M:10,L:10,XL:6,XXL:3       |                  |           | color:Navy;pattern:Solid;sleeve:Full;occasion:Festive
Fabindia   | Kurtas        |            | Floral Embroidered Kurta - Peach            | 1799       | 800        | XS:4,S:8,M:10,L:8,XL:5         |                  |           | color:peach;pattern:Embroidered;sleeve:Half;occasion:Festive
W for Woman| Kurtas        |            | Checkered Half-Sleeve Cotton Kurta          | 1499       | 670        | XS:5,S:10,M:12,L:10,XL:4       |                  |           | color:Blue;pattern:Checkered;sleeve:Half;occasion:Casual
Nike       | T-Shirts      | NK-TS-001  | Dri-FIT Training T-Shirt Black              | 1499       | 680        | S:10,M:15,L:15,XL:8            | 0195872516389    |           | color:Black;material:Polyester;fit:Regular
Nike       | T-Shirts      | NK-TS-002  | Dri-FIT Running Tee Navy                    | 1699       | 780        | S:8,M:12,L:12,XL:6,XXL:3       | 0195872516402    |           | color:Navy;material:Polyester;fit:Regular
Levis      | T-Shirts      |            | Batwing Logo Tee Classic Red                | 1299       | 590        | S:10,M:18,L:15,XL:8,XXL:3      |                  |           | color:Red;material:Cotton;fit:Regular
```

**Notes on the example:**
- Rows with blank `sku` get auto-generated (e.g. Zudio T-Shirts become `ZUD-TSH-001`, `ZUD-TSH-002`, etc.)
- Rows with provided SKU (e.g. `NK-FW-001`) are stored as-is and validated for uniqueness
- `sizes_and_quantities` like `S:15,M:25,L:20,XL:10,XXL:5` creates 5 `StockEntry` records per product per store
- `external_barcode` is the manufacturer EAN/UPC — separate from the system-generated `variantSku`
- `attributes` keys must match the `attributeSchema` of the referenced category (validated server-side)

---

### 5.3 — 6 Brand Rows

These are 6 brand rows as they would appear in the downloaded brand template. This upload would happen **before** the category and product uploads so that brand names are available in the product template dropdown.

```
name        | logo_url                                         | is_active
------------+--------------------------------------------------+----------
Zudio       |                                                  | yes
Levis       | https://cdn.example.com/logos/levis.png          | yes
Nike        | https://cdn.example.com/logos/nike.png           | yes
Bata        | https://cdn.example.com/logos/bata.png           | yes
Fabindia    | https://cdn.example.com/logos/fabindia.png       | yes
W for Woman |                                                  | yes
```

**What the backend stores after import:**
```json
[
  { "name": "Zudio",       "logoUrl": null,                                         "isActive": true },
  { "name": "Levis",       "logoUrl": "https://cdn.example.com/logos/levis.png",    "isActive": true },
  { "name": "Nike",        "logoUrl": "https://cdn.example.com/logos/nike.png",     "isActive": true },
  { "name": "Bata",        "logoUrl": "https://cdn.example.com/logos/bata.png",     "isActive": true },
  { "name": "Fabindia",    "logoUrl": "https://cdn.example.com/logos/fabindia.png", "isActive": true },
  { "name": "W for Woman", "logoUrl": null,                                         "isActive": true }
]
```

**Notes:**
- Zudio and W for Woman have blank `logo_url` — they import fine with `logoUrl: null`, logo added later via Edit
- `is_active` is `yes` for all — if left blank it also defaults to `yes`
- After these 6 brands are imported, the user downloads a fresh Product Excel template. Sheet 3 "Brand Reference" will list all 6 brand names, and the `brand_name` column will offer them as a dropdown

---

## 6. Validation Rules

### Name Normalization Strategy (applied before every uniqueness check)

All name uniqueness checks — both client-side and server-side — normalize the value before comparing, so that visually similar but differently-cased or differently-punctuated names are caught as duplicates without confusing the user.

| Entity / Field | Normalization | Examples treated as the SAME |
|----------------|---------------|-------------------------------|
| **Brand `name`** | `trim()` + `toLowerCase()` | `Nike` = `nike` = `NIKE` |
| **Category `name`** | `trim()` + `toLowerCase()` + strip all spaces, hyphens, underscores | `T-Shirts` = `t_shirts` = `TSHIRTS` = `T Shirts` = `t-shirt` = `T_Shirt` |
| **Attribute `name`** (within the same category row) | `trim()` + `toLowerCase()` | `Color` = `color` = `COLOR` when two `attr_N_name` fields in the same row match |
| **Product `sku`** | `trim()` + `toUpperCase()` | `NK-TS-001` = `nk-ts-001` = `Nk-Ts-001` |

**Normalization functions (shared utility):**
```typescript
// Brand + attribute names
const normalizeNameKey = (v: string) => v.trim().toLowerCase();

// Category names (also used for slug generation)
const normalizeCategoryName = (v: string) =>
  v.trim().toLowerCase().replace(/[\s\-_]+/g, '');

// SKU
const normalizeSku = (v: string) => v.trim().toUpperCase();
```

> **Original casing is preserved in the database.** Normalization is only for comparison. If the user types `Nike`, `Nike` is stored — not `nike`. The exception is `slug` (always lowercased-hyphenated), which is generated from the normalized category name.

---

### 6.1 Client-side (Step 3 — Preview)

Runs entirely in the browser after file parse, before any server call. Errors appear inline in the preview table row.

**Brand validations:**
| Rule | Error Message |
|------|--------------|
| `name` is blank | "Brand name is required" |
| Duplicate `name` within the batch (case-insensitive: `Nike` = `nike`) | "Brand with same name already exists (row N)" |
| `is_active` provided but not `yes` or `no` | "is_active must be 'yes' or 'no'" |
| `logo_url` provided but not a valid URL | "Invalid logo URL format" |

**Category validations:**
| Rule | Error Message |
|------|--------------|
| `name` is blank | "Category name is required" |
| `sizes` is blank | "At least one size is required" |
| `sizes` format invalid | "Invalid sizes format — use comma-separated labels" |
| Duplicate `name` within the batch (normalized: `T-Shirts` = `t_shirts` = `TSHIRTS`) | "Category with same name already exists (row N)" |
| Two `attr_N_name` values in the same row match (case-insensitive: `Color` = `color`) | "Duplicate attribute name 'Color' in this row" |
| `attr_N_type` not `text` or `dropdown` | "attr_N_type must be 'text' or 'dropdown'" |
| `attr_N_type` is `dropdown` but `attr_N_values` is blank | "Dropdown attribute requires at least one value" |
| `attr_N_required` not `yes` or `no` | "attr_N_required must be 'yes' or 'no'" |
| `attr_N_name` is blank but other `attr_N_*` fields are filled | "attr_N_name is required when other attr_N fields are filled" |

**Product validations:**
| Rule | Error Message |
|------|--------------|
| `brand_name` is blank | "Brand is required" |
| `category_name` is blank | "Category is required" |
| `name` is blank | "Product name is required" |
| `base_price` not a positive number | "Base price must be a number greater than 0" |
| `cost_price` not a positive number | "Cost price must be a number greater than 0" |
| Duplicate `sku` within batch (case-insensitive: `NK-TS-001` = `nk-ts-001`) | "Duplicate SKU — same as row N" |
| `sizes_and_quantities` format invalid (not `Name:Number` pairs) | "Invalid format — use 'S:10,M:20' notation" |
| Any size quantity is not a non-negative integer | "Quantity must be a whole number ≥ 0" |
| `image_url` provided but not a valid URL | "Invalid image URL format" |

### 6.2 Server-side (Step 4 — all-or-nothing transaction)

If any server-side check fails, the entire transaction is rolled back and a structured error list is returned. All server-side name lookups and uniqueness checks use the same normalization functions as client-side.

**Brand validations:**
| Rule | Behaviour |
|------|-----------|
| Brand `name` already exists in the org (case-insensitive check against DB) | Rolls back entire batch — "Brand with same name already exists (row N)" |
| Duplicate `name` within the batch itself after normalization | Rolls back entire batch |

**Category validations:**
| Rule | Behaviour |
|------|-----------|
| Category `name` already exists in the org (normalized slug match against DB) | Rolls back entire batch — "Category with same name already exists (row N)" |
| Duplicate normalized `name` within the batch itself | Rolls back entire batch |
| Size record creation failure | Rolls back entire batch |

**Product validations:**
| Rule | Behaviour |
|------|-----------|
| `sku` already exists in the org (case-insensitive) | Rolls back entire batch — "SKU already exists (row N)" |
| `category_name` not found in org (case-insensitive + normalized lookup) | Rolls back entire batch — "Category not found (row N)" |
| `brand_name` not found in org (case-insensitive lookup) | Rolls back entire batch — "Brand not found (row N)" |
| `sizes_and_quantities` references a size label not in the category (case-insensitive) | Rolls back entire batch |
| `attributes` key not in category's `attributeSchema` | Warning logged, insert continues (soft validation) |

---

## 7. Architecture & Data Flow

```
Browser
│
│  [Step 1] User downloads template (CSV or XLSX)
│  [Step 2] User fills template, re-uploads file
│           ↓
│  fileParser.ts (client-side)
│    papaparse.parse(csvText)              ← for .csv
│    new ExcelJS.Workbook().xlsx.load()    ← for .xlsx / .xls
│    strips _status and other _ columns
│    → normalised: { headers[], rows: Record<string,string>[] }
│           ↓
│  [Step 3] validateRows() — runs client-side rules
│    Returns: { row, fields, error }[] for invalid rows
│    Preview table renders with colour coding
│           ↓  (only if zero errors)
│  [Step 4] POST /api/categories/bulk  OR  /api/products/bulk
│    body: { rows: ValidatedRow[] }
│           ↓
Server (Next.js API Route)
│
│  requireOrgAuth(request)       ← auth middleware
│  Server-side validation        ← DB checks (unique names/SKUs, FK existence)
│           ↓
│  prisma.$transaction(async tx => {
│    // Brands path:
│    tx.brand.createMany(...)
│
│    // Categories path:
│    tx.category.createMany(...)
│    tx.category.findMany(...)   ← resolve new IDs
│    tx.size.createMany(...)
│
│    // Products path:
│    tx.category.findMany(...)   ← resolve category name → ID + sizes
│    tx.brand.findMany(...)      ← resolve brand name → ID
│    tx.product.createMany(...)
│    tx.product.findMany(...)    ← resolve new product IDs by SKU
│    tx.stockEntry.createMany(...)
│  })
│           ↓
│  { imported: N }  or  { errors: [{ row, field, message }] }
│           ↓
Browser
│  Success → close drawer, refresh list
│  Failure → show error table + "Download Error Report" CSV
```

---

## 8. Backend Bulk Insert Strategy

### Why createMany instead of N individual creates

Single product creation today calls `prisma.product.create()` inside a transaction for 1 item — fine for occasional use. For 1000 products, looping `create()` 1000 times is a serial waterfall of 1000 database round-trips.

`createMany` sends a single parameterised `INSERT INTO ... VALUES (...), (...), (...)` statement — the database handles all rows in one operation. On 1000 rows this is ~100× faster.

### Brand Bulk Insert

```typescript
await prisma.$transaction(async (tx) => {
  // Pre-check: case-insensitive uniqueness against existing brands in DB
  const incomingNames = rows.map(r => r.name.trim().toLowerCase());
  const existing = await tx.brand.findMany({
    where: { orgId },
    select: { name: true }
  });
  const existingNormalized = new Set(existing.map(b => b.name.trim().toLowerCase()));

  for (const [i, name] of incomingNames.entries()) {
    if (existingNormalized.has(name)) {
      throw new Error(`Brand with same name already exists (row ${i + 1}: "${rows[i].name}")`);
    }
  }

  await tx.brand.createMany({
    data: rows.map(r => ({
      id: uuid(),
      orgId,
      name: r.name,                       // stored with original casing
      logoUrl: r.logo_url || null,
      isActive: r.is_active !== 'no',
    }))
  });
});
```

Brand is the simplest insert — no child records, no FK resolution needed. Single `createMany` call, single DB round-trip for the entire batch.

### Category Bulk Insert

```typescript
await prisma.$transaction(async (tx) => {
  // Normalize helper: strip separators + lowercase (used for slug + uniqueness)
  const normalize = (v: string) => v.trim().toLowerCase().replace(/[\s\-_]+/g, '');

  // Pre-check: normalized slug uniqueness against existing categories in DB
  const incomingSlugs = rows.map(r => normalize(r.name));
  const existing = await tx.category.findMany({
    where: { orgId },
    select: { slug: true }
  });
  const existingSlugs = new Set(existing.map(c => c.slug));

  for (const [i, slug] of incomingSlugs.entries()) {
    if (existingSlugs.has(slug)) {
      throw new Error(`Category with same name already exists (row ${i + 1}: "${rows[i].name}")`);
    }
  }

  // 1. Insert all categories in one query
  await tx.category.createMany({
    data: rows.map(r => ({
      id: uuid(),
      orgId,
      name: r.name,                       // stored with original casing
      slug: normalize(r.name),            // always normalized
      description: r.description || null,
      attributeSchema: buildAttributeSchema(r),
    }))
  });

  // 2. Fetch created records to get generated IDs
  const created = await tx.category.findMany({
    where: { orgId, slug: { in: incomingSlugs } },
    select: { id: true, slug: true, name: true }
  });
  const slugToId = Object.fromEntries(created.map(c => [c.slug, c.id]));

  // 3. Build all size records across all categories, insert in one query
  const allSizes: SizeCreateData[] = [];
  for (const row of rows) {
    const categoryId = slugToId[normalize(row.name)];
    row.sizes.forEach((label, index) => {
      allSizes.push({ id: uuid(), categoryId, label, sortOrder: index });
    });
  }
  await tx.size.createMany({ data: allSizes });
});
```

### Product Bulk Insert

```typescript
await prisma.$transaction(async (tx) => {
  // 1. Pre-fetch all referenced categories (by normalized slug) and brands (case-insensitive)
  const categoryNames = [...new Set(rows.map(r => r.category_name))];
  const brandNames    = [...new Set(rows.map(r => r.brand_name))];

  const normCat   = (v: string) => v.trim().toLowerCase().replace(/[\s\-_]+/g, '');
  const normBrand = (v: string) => v.trim().toLowerCase();
  const normSku   = (v: string) => v.trim().toUpperCase();

  const [categories, brands] = await Promise.all([
    tx.category.findMany({
      where: { orgId, slug: { in: categoryNames.map(normCat) } },
      include: { sizes: true }
    }),
    tx.brand.findMany({
      where: { orgId },   // fetch all, then filter in-memory by normalized name
      select: { id: true, name: true }
    })
  ]);

  // 2. Build normalized lookup maps
  const catMap   = new Map(categories.map(c => [c.slug, c]));
  const brandMap = new Map(brands.map(b => [normBrand(b.name), b]));

  // 3. Validate each row's brand + category references (case-insensitive)
  for (const [i, row] of rows.entries()) {
    if (!catMap.has(normCat(row.category_name))) {
      throw new Error(`Category not found (row ${i + 1}: "${row.category_name}")`);
    }
    if (!brandMap.has(normBrand(row.brand_name))) {
      throw new Error(`Brand not found (row ${i + 1}: "${row.brand_name}")`);
    }
  }

  // 4. Resolve SKUs (auto-generate where blank); check existing SKUs case-insensitively
  const existingSkus = await tx.product.findMany({
    where: { orgId },
    select: { sku: true }
  });
  const existingSkuSet = new Set(existingSkus.map(p => normSku(p.sku)));

  const resolvedRows = rows.map((r, i) => {
    const sku = r.sku
      ? normSku(r.sku)
      : autoGenerateSku(brandMap.get(normBrand(r.brand_name)), catMap.get(normCat(r.category_name)), i);
    if (existingSkuSet.has(sku)) {
      throw new Error(`SKU already exists (row ${i + 1}: "${sku}")`);
    }
    return { ...r, sku };
  });

  // 5. Insert all products in one query
  await tx.product.createMany({
    data: resolvedRows.map(r => ({
      id: uuid(),
      orgId,
      name: r.name,
      sku: r.sku,                                             // normalized uppercase
      categoryId: catMap.get(normCat(r.category_name))!.id,
      brandId:    brandMap.get(normBrand(r.brand_name))!.id,
      basePrice:  r.base_price,
      costPrice:  r.cost_price,
      externalBarcode: r.external_barcode || null,
      imageUrl:        r.image_url || null,
      attributes:      parseAttributes(r.attributes),
      isActive: true,
    }))
  });

  // 6. Fetch created products to resolve IDs
  const created = await tx.product.findMany({
    where: { orgId, sku: { in: resolvedRows.map(r => r.sku) } },
    select: { id: true, sku: true }
  });
  const skuToId = new Map(created.map(p => [p.sku, p.id]));

  // 7. Build all StockEntry records; size lookup is case-insensitive
  const allStockEntries: StockEntryCreateData[] = [];
  for (const row of resolvedRows) {
    if (!row.sizes_and_quantities) continue;
    const cat = catMap.get(normCat(row.category_name))!;
    const sizeMap = new Map(cat.sizes.map(s => [s.label.trim().toLowerCase(), s]));
    for (const pair of row.sizes_and_quantities.split(',')) {
      const [sizeLabel, qty] = pair.trim().split(':');
      const size = sizeMap.get(sizeLabel.trim().toLowerCase());
      if (!size) continue;
      allStockEntries.push({
        id: uuid(),
        productId: skuToId.get(row.sku)!,
        sizeId: size.id,
        storeId: defaultStoreId,
        quantity: parseInt(qty, 10),
        variantSku: buildVariantSku(row.sku, size.label),  // e.g. "NK-TS-001-M"
        reorderLevel: 5,
        reorderQuantity: 10,
      });
    }
  }
  await tx.stockEntry.createMany({ data: allStockEntries });
});
```

---

## 9. Barcode / Variant SKU Handling

### How it works today (single product)

When a product is saved via the UI, `productService.create()` runs `buildVariantSku()` for every size that has stock:

```typescript
const buildVariantSku = (productSku: string, sizeLabel: string) =>
  `${productSku}-${sizeLabel.trim().toUpperCase().replace(/\s+/g, "")}`;

// Examples:
buildVariantSku("NK-TS-001", "M")     → "NK-TS-001-M"
buildVariantSku("NK-FW-001", "UK 9")  → "NK-FW-001-UK9"
buildVariantSku("LV-JN-001", "32")    → "LV-JN-001-32"
```

One `variantSku` is stored on each `StockEntry` (= one row per product × size × store).

### In Bulk Upload — Zero User Input Required

The user does **not** put barcodes in the template. They only fill `sizes_and_quantities`, for example:

```
S:10,M:20,L:15,XL:5
```

The backend does the rest:

1. Splits the pairs → creates `StockEntry` rows
2. Calls `buildVariantSku(resolvedSku, sizeLabel)` for each entry — exactly the same function as single-product creation
3. Stores the generated `variantSku` on each `StockEntry`

After bulk import completes, the product detail view shows all variant SKUs and printable barcode labels — same as any manually created product.

### Barcode Three-Tier Lookup (unchanged)

The barcode scanner lookup remains unchanged by this feature:

1. Match `Product.sku` or `Product.externalBarcode` → return product + all stock levels
2. Match `StockEntry.variantSku` → return product + matched variant info
3. No match → 404

---

## 10. Files to Create and Modify

### New Files (8)

| File | Purpose |
|------|---------|
| `src/shared/utils/fileParser.ts` | Unified browser file parser. Accepts `File` object, detects CSV vs XLSX, returns `{ headers: string[], rows: Record<string,string>[] }`. Uses `papaparse` for CSV, `exceljs` for Excel. Strips columns whose name starts with `_` (e.g. the `_status` helper column) before returning rows. |
| `src/shared/utils/bulkTemplates.ts` | Template generators. `downloadBrandTemplate()`, `downloadCategoryTemplate()`, `downloadProductTemplate(categories, brands)`. Generates `.xlsx` files with: example rows, Layer 1 Data Validation rules (input messages + Stop/Warning alerts per column), Layer 2 Conditional Formatting (live red/orange cell highlighting), Layer 3 `_status` formula column (per-row error summary), and reference sheets (Sheet 2 / Sheet 3 for products). Triggers browser download. |
| `src/app/api/brands/bulk/route.ts` | `POST /api/brands/bulk`. Auth middleware → server-side validation → `brandService.bulkCreate()` → `{ imported: N }` or `{ errors: [...] }`. |
| `src/app/api/categories/bulk/route.ts` | `POST /api/categories/bulk`. Auth middleware → server-side validation → `categoryService.bulkCreate()` → `{ imported: N }` or `{ errors: [...] }`. |
| `src/app/api/products/bulk/route.ts` | `POST /api/products/bulk`. Auth middleware → server-side validation → `productService.bulkCreate()` → `{ imported: N }` or `{ errors: [...] }`. |
| `src/modules/brands/components/BulkUploadDrawer.tsx` | 4-step Ant Design Drawer for brand bulk upload. Steps: Template → Upload → Preview → Done. |
| `src/modules/categories/components/BulkUploadDrawer.tsx` | 4-step Ant Design Drawer for category bulk upload. Steps: Template → Upload → Preview → Done. |
| `src/modules/products/components/BulkUploadDrawer.tsx` | 4-step Ant Design Drawer for product bulk upload. Steps: Template → Upload → Preview → Done. Fetches existing brands + categories on open to populate template download payload. |

### Modified Files (12)

| File | Change |
|------|--------|
| `src/modules/brands/types.ts` | Add `BulkBrandRow`, `BulkBrandValidated`, `BulkUploadResult`, `BulkUploadError` types |
| `src/modules/categories/types.ts` | Add `BulkCategoryRow`, `BulkCategoryValidated`, `BulkUploadResult`, `BulkUploadError` types |
| `src/modules/products/types.ts` | Add `BulkProductRow`, `BulkProductValidated`, `BulkUploadResult`, `BulkUploadError` types |
| `src/modules/brands/services/brandService.ts` | Add `bulkCreate(rows: BulkBrandValidated[], orgId: string): Promise<{ imported: number }>` |
| `src/modules/categories/services/categoryService.ts` | Add `bulkCreate(rows: BulkCategoryValidated[], orgId: string): Promise<{ imported: number }>` |
| `src/modules/products/services/productService.ts` | Add `bulkCreate(rows: BulkProductValidated[], orgId: string, storeId: string): Promise<{ imported: number }>` |
| `src/modules/brands/components/BrandTable.tsx` | Add "Bulk Upload" button (`<UploadOutlined />`) in toolbar, accepts `onBulkUpload` prop |
| `src/modules/categories/components/CategoryTable.tsx` | Add "Bulk Upload" button (`<UploadOutlined />`) in toolbar, accepts `onBulkUpload` prop |
| `src/modules/products/components/ProductTable.tsx` | Add "Bulk Upload" button (`<UploadOutlined />`) in toolbar, accepts `onBulkUpload` prop |
| `src/app/(dashboard)/dashboard/brands/page.tsx` | Add `bulkDrawerOpen` state, wire `onBulkUpload` → `<BrandBulkUploadDrawer />` |
| `src/app/(dashboard)/dashboard/categories/page.tsx` | Add `bulkDrawerOpen` state, wire `onBulkUpload` → `<CategoryBulkUploadDrawer />` |
| `src/app/(dashboard)/dashboard/products/page.tsx` | Add `bulkDrawerOpen` state, wire `onBulkUpload` → `<ProductBulkUploadDrawer />`, pass brands + categories for template generation |
| `package.json` | Add `papaparse`, `@types/papaparse`, `exceljs` (replaces `xlsx`) |

---

## 11. Packages to Install

```bash
npm install papaparse exceljs
npm install --save-dev @types/papaparse
```

| Package | Version | Purpose |
|---------|---------|----------|
| `papaparse` | ^5.x | Browser-safe streaming CSV parser. Handles quoted fields, line breaks within cells, large files. |
| `@types/papaparse` | ^5.x | TypeScript types for papaparse |
| `exceljs` | ^4.x | Read and write `.xlsx` files. Full API for Data Validation (input messages, Stop/Warning/Information alert styles), Conditional Formatting, named styles, multiple sheets. TypeScript types included — no `@types/exceljs` needed. Replaces `xlsx` (SheetJS Community), which does not support Data Validation messages or Conditional Formatting. |

> **Why not `xlsx` (SheetJS Community)?** SheetJS Community supports reading and basic writing of `.xlsx` but has no documented API for Data Validation `promptTitle`/`prompt`/`errorTitle`/`error`/`errorStyle` fields or Conditional Formatting rules. These are required for the 3-layer in-Excel validation system. `exceljs` exposes all of these natively.

---

## 12. Implementation Phases

### Phase 1 — Foundation (no dependencies on other phases)

**Goal:** Shared utilities and type definitions.

| Task | File(s) |
|------|---------|
| Install packages | `package.json` |
| Create browser file parser | `src/shared/utils/fileParser.ts` |
| Create template generators (CSV + Excel) | `src/shared/utils/bulkTemplates.ts` |
| Add bulk types to categories | `src/modules/categories/types.ts` |
| Add bulk types to products | `src/modules/products/types.ts` |

Deliverable: `fileParser.ts` can parse a CSV and XLSX and return normalised rows. Templates download correctly in both formats.

---

### Phase 2 — Backend APIs (parallel, both depend on Phase 1 types)

**Goal:** Server endpoints with validation and bulk insert.

#### 2A — Brands bulk API
| Task | File(s) |
|------|---------|
| Add `brandService.bulkCreate()` | `src/modules/brands/services/brandService.ts` |
| Create `POST /api/brands/bulk` route | `src/app/api/brands/bulk/route.ts` |

#### 2B — Categories bulk API
| Task | File(s) |
|------|---------|
| Add `categoryService.bulkCreate()` | `src/modules/categories/services/categoryService.ts` |
| Create `POST /api/categories/bulk` route | `src/app/api/categories/bulk/route.ts` |

#### 2C — Products bulk API
| Task | File(s) |
|------|---------|
| Add `productService.bulkCreate()` | `src/modules/products/services/productService.ts` |
| Create `POST /api/products/bulk` route | `src/app/api/products/bulk/route.ts` |

Deliverable: All three endpoints accept a JSON array, validate server-side, insert atomically, return `{ imported: N }` or error list. Testable via Postman/curl before the UI is built.

---

### Phase 3 — Frontend Drawers (parallel, depends on Phase 1)

**Goal:** 4-step Drawer UI for all three entities.

#### 3A — Brand Bulk Upload Drawer
| Task | File(s) |
|------|---------|
| Build `BrandBulkUploadDrawer.tsx` (4 steps) | `src/modules/brands/components/BulkUploadDrawer.tsx` |

#### 3B — Category Bulk Upload Drawer
| Task | File(s) |
|------|---------|
| Build `CategoryBulkUploadDrawer.tsx` (4 steps) | `src/modules/categories/components/BulkUploadDrawer.tsx` |

#### 3C — Product Bulk Upload Drawer
| Task | File(s) |
|------|---------|
| Build `ProductBulkUploadDrawer.tsx` (4 steps) | `src/modules/products/components/BulkUploadDrawer.tsx` |

Deliverable: Drawers fully functional with template download, file upload, preview table with error highlighting, and POST to the Phase 2 endpoints.

---

### Phase 4 — Integration (depends on Phase 2 + 3)

**Goal:** Wire drawers into existing pages and tables.

| Task | File(s) |
|------|---------|
| Add Bulk Upload button to BrandTable | `src/modules/brands/components/BrandTable.tsx` |
| Add Bulk Upload button to CategoryTable | `src/modules/categories/components/CategoryTable.tsx` |
| Add Bulk Upload button to ProductTable | `src/modules/products/components/ProductTable.tsx` |
| Wire drawer state in brands page | `src/app/(dashboard)/dashboard/brands/page.tsx` |
| Wire drawer state in categories page | `src/app/(dashboard)/dashboard/categories/page.tsx` |
| Wire drawer state in products page | `src/app/(dashboard)/dashboard/products/page.tsx` |

Deliverable: End-to-end flow works in the browser. After successful import the list refreshes and the drawer closes.

---

### Phase Dependency Graph

```
Phase 1 (Foundation)
    ├── Phase 2A (Brands API) ──────────┐
    ├── Phase 2B (Categories API) ───────┤
    ├── Phase 2C (Products API) ─────────┤
    ├── Phase 3A (Brand Drawer) ─────────┤
    ├── Phase 3B (Category Drawer) ───────┤
    └── Phase 3C (Product Drawer) ────────┘
                                          └── Phase 4 (Integration)
```

Phases 2A, 2B, 2C, 3A, 3B, 3C can all be built in parallel once Phase 1 is complete.

---

## 13. Verification Checklist

| # | Test | Expected Result |
|---|------|----------------|
| 1 | Download Brand CSV template | File has correct 3 columns with example row |
| 2 | Download Brand Excel template | `is_active` cell has dropdown validation (`yes`/`no`) |
| 3 | Upload 6-brand CSV (Section 5.3) | All 6 brands created; logos stored where provided; blank logos → `null` |
| 4 | Upload same brand CSV again | Batch rejected — "Brand with same name already exists" for each row; 0 inserts |
| 5 | Upload brand CSV with `Nike` already in DB, new batch has `nike` | Step 4 rejects — "Brand with same name already exists (row N)"; case-insensitive match caught server-side |
| 6 | Upload brand CSV with `Nike` and `NIKE` in same batch | Step 3 catches it client-side — second row flagged red "Brand with same name already exists" |
| 7 | Upload brand CSV with blank `name` | Step 3 blocks — row highlighted red |
| 8 | Download Category CSV template | File has correct 43 columns, 2 example rows |
| 9 | Download Category Excel template | Dropdown validation on all `attr_N_type` and `attr_N_required` cells (1 through 10) |
| 10 | `T-Shirts` already in DB; upload batch with `t-shirts` | Step 4 rejects — "Category with same name already exists"; normalized slug match caught |
| 11 | Upload batch with `T-Shirts` and `T_SHIRTS` in same CSV | Step 3 catches both rows red — normalized to same value `tshirts` |
| 12 | Upload batch with `T-Shirts` and `TSHIRTS` in same CSV | Step 3 catches both rows red — same normalization `tshirts` |
| 13 | Category row has `attr_1_name = Color` and `attr_3_name = color` | Step 3 flags row — "Duplicate attribute name 'color' in this row" |
| 14 | Upload category with only 2 attributes filled (attr_3–attr_10 blank) | Only 2 attributes stored in `attributeSchema`; blank blocks discarded silently |
| 15 | Upload category with 10 attributes filled | All 10 attributes stored correctly in `attributeSchema` |
| 16 | Upload category CSV with `attr_N_type = dropdown` but no `attr_N_values` | Step 3 flags row as error: "Dropdown attribute requires at least one value" |
| 17 | Upload 100-row valid category CSV | Step 3 shows all rows green; Step 4 inserts all; DB confirms categories + sizes created |
| 18 | Download Product Excel template | `brand_name` dropdown from Sheet 3; `category_name` dropdown from Sheet 2 |
| 19 | Download Product Excel template after uploading 6 new brands | Sheet 3 "Brand Reference" lists all 6 new brands; dropdown reflects them |
| 20 | Upload 20-product CSV (Section 5.2) | All 20 products created; `sku` stored as uppercase; StockEntries per size; variantSku auto-generated |
| 21 | `NK-TS-001` in DB; upload batch with `nk-ts-001` | Step 4 rejects — "SKU already exists (row N)"; case-insensitive check caught it |
| 22 | Batch has `NK-TS-001` and `nk-ts-001` in two rows | Step 3 catches it client-side; second row flagged red |
| 23 | Product CSV has `category_name = "T-shirts"` but DB has `T-Shirts` | Resolves correctly (normalized slug match); product imports |
| 24 | Product CSV has `brand_name = "levis"` but DB has `Levis` | Resolves correctly (case-insensitive match); product imports |
| 25 | Open a bulk-imported product on the detail page | Variant SKUs (e.g. `NK-TS-001-M`) visible; barcode labels printable |
| 26 | Upload product CSV with `brand_name` = "DoesNotExist" | Server rejects — "Brand not found (row N)"; 0 rows inserted |
| 27 | Upload product CSV with `category_name` = "DoesNotExist" | Server rejects — "Category not found (row N)"; 0 rows inserted |
| 28 | Upload product CSV with all `sku` cells blank | All SKUs auto-generated as uppercase; all products inserted |
| 29 | Upload product CSV with `image_url` blank for some rows | Those products import with `imageUrl: null`; products with URL get URL stored |
| 30 | Upload 1000-row product CSV | Import completes; verify `createMany` used (no N+1) |
| 31 | Upload `.xlsx` file for any entity | Parsed identically to CSV; `_status` column stripped before validation; same preview and import behaviour |
| 32 | Download Error Report from Step 4 failure | Valid CSV with columns: `row`, `name_or_sku`, `error` — one line per failed row |
| 33 | Open Product Excel template; click on `base_price` cell | Input Message tooltip appears: "Selling price, e.g. 499" |
| 34 | Type `abc` in `base_price` cell, press Tab | Stop alert fires: "Must be a number greater than 0"; cell value is blocked |
| 35 | Type `-50` in `base_price` cell, press Tab | Stop alert fires; negative value blocked |
| 36 | Fill `name` on a product row, leave `brand_name` blank | `brand_name` cell turns **red** immediately via Conditional Formatting |
| 37 | Start filling a Category row (`name` + `sizes`), leave `sizes` blank | `sizes` cell turns **red** |
| 38 | Set `attr_1_type = dropdown` but leave `attr_1_values` blank | `attr_1_values` cell turns **red** |
| 39 | Fill `attr_1_values` but set `attr_1_type = text` | `attr_1_values` cell turns **orange** (warning — values will be ignored) |
| 40 | Complete a valid product row in Excel | `_status` column shows "✓ Ready to upload" in green |
| 41 | Leave `category_name` blank on a product row | `_status` column shows "⚠ Category is required" in red |
| 42 | Sort Excel sheet by `_status` column | All error rows (red) move to top; all ready rows (green) move to bottom |
| 43 | Download Brand Excel template; leave all rows blank | All `_status` cells show "—" (grey); no red highlighting on untouched rows |
| 44 | Upload a Category CSV (not Excel) | File parses and previews correctly; Step 3 shows validation results; no `_status` column appears |
