# Barcode Working — Complete Flow Documentation

This document explains how barcodes are generated, attached to products, printed,
and used to find products when scanning.

---

## 1. What Is a Barcode in This App?

Every product has an **SKU** (Stock Keeping Unit) — a short alphanumeric code like `NK-DFT-001`.
The barcode is simply the **visual representation of this SKU** rendered as a CODE128 stripe image.

There is also optional support for:
- **externalBarcode** — the manufacturer's EAN-13 printed on the box (e.g. `8901030811649`)
- **variantSku** — per-size barcodes (e.g. `NK-DFT-001-M` for Medium size only)

---

## 2. Barcode Generation Flow

### Where is the barcode generated?

`BarcodeGenerator` is a thin wrapper around the **`react-barcode`** library:

```
src/modules/barcode/components/BarcodeGenerator.tsx
```

```
BarcodeGenerator
  └── react-barcode (npm package)
        └── renders an <svg> element
              - format: CODE128
              - value: the product SKU
              - width, height, fontSize: configurable props
```

It is **client-only** (loaded with `dynamic(..., { ssr: false })`) because it touches the DOM.

### Where does BarcodeGenerator appear in the UI?

| Location | Route | Purpose |
|---|---|---|
| **Product Detail page** | `/dashboard/products/[id]` | Displays the barcode prominently at the top of the detail view |
| **Scan result card** | `/dashboard/scan` | Re-renders the barcode after a successful scan/lookup |

---

## 3. Adding a Barcode to a Product (UI Flow)

### Step 1 — Create/Edit a Product

Navigate to: **Dashboard → Products → New Product** (or edit an existing one)

In the product form (`ProductForm.tsx`) there are two barcode-related fields:

| Field | Where in the form | What it does |
|---|---|---|
| **SKU** | "Basic Info" section | Required. This IS the primary barcode value. Every product must have one. |
| **External Barcode** | Below SKU field (optional) | For manufacturer EAN-13 printed on the product packaging. |

When you save the product, `productService.create()` stores both values in the product record.

### Step 2 — View the Generated Barcode

After creating/saving, navigate to the product detail page:

**Products list → click a product name → Product Detail**

You will see:
```
┌────────────────────────────────┐
│  ← Back      [Print Labels] [Edit] │
│                                │
│  ┌──────────────────────────┐  │
│  │  ||||| NK-DFT-001 |||||| │  │  ← BarcodeGenerator (SVG)
│  └──────────────────────────┘  │
│                                │
│  Name: Nike Dri-FIT T-Shirt    │
│  SKU: NK-DFT-001               │
│  External Barcode: 8901030...  │
│  ...                           │
└────────────────────────────────┘
```

The barcode SVG is rendered automatically from the product's SKU — no manual step needed.

---

## 4. Printing Barcode Labels (UI Flow)

The `LabelPrinter` component sits next to the Edit button on the Product Detail page.

### UI Steps:

1. Go to **Products → [any product] → Product Detail**
2. Click **"Print Labels"** button (top right)
3. A modal opens showing:
   - A live barcode preview (rendered using `BarcodeGenerator`)
   - Product name below the barcode
   - A number input: **"Number of labels"** (1–100, default 1)
4. Three actions in the modal footer:
   - **Download PNG** — exports the barcode as a 2× hi-res PNG image
   - **Cancel** — closes the modal
   - **Print** — opens a new browser print window

### Print Window Technical Flow:

```
User clicks "Print"
  └── LabelPrinter.handlePrint()
        └── window.open("", "_blank")   ← opens new browser tab
              └── writes HTML to the new window:
                    - Inline CSS for A4 page layout (3 labels per row, 62mm × 30mm each)
                    - N label <div> blocks (N = copies selected)
                    - Loads JsBarcode from CDN: jsbarcode@3.11.6
                    - window.onload: renders CODE128 barcode into each label's SVG
                    - setTimeout 300ms → window.print() auto-triggers the print dialog
```

### Download PNG Technical Flow:

```
User clicks "Download PNG"
  └── LabelPrinter.handleDownloadPng()
        └── Finds the <svg> inside #label-printer-barcode-preview
              └── XMLSerializer.serializeToString(svgEl)
                    └── Blob → Object URL → new Image()
                          └── img.onload:
                                - Creates <canvas> at 2× scale (hi-res)
                                - Draws the SVG image onto canvas
                                - canvas.toDataURL("image/png")
                                - Creates <a> tag → a.click() → downloads barcode-{sku}.png
```

---

## 5. Scanning to Find a Product (UI Flow)

### Where is the scanner?

Navigate to: **Dashboard → Scan** (`/dashboard/scan`)

The page has two tabs:

| Tab | Method | How it works |
|---|---|---|
| **Camera Scan** | Device camera | Points camera at a physical barcode |
| **Manual Entry** | Keyboard | Type the SKU directly and press Enter or click Lookup |

### Camera Scan Flow:

```
User opens /dashboard/scan → "Camera Scan" tab
  └── BarcodeScanner component loads (dynamic import, client-only)
        └── html5-qrcode library initialises
              - Opens device camera (browser asks for permission)
              - Runs at 10 FPS
              - Scans formats: CODE_128, EAN_13, UPC_A, CODE_39
              - Scan box: 300×150px viewfinder
        └── On successful decode → onScan(decodedText) callback
              └── ScanPage.lookupSku(decodedText)
```

### Manual Entry Flow:

```
User types SKU in the input field
  └── Presses Enter or clicks "Lookup"
        └── ScanPage.lookupSku(manualSku)
```

---

## 6. Barcode Lookup — Code Flow (Backend)

```
ScanPage.lookupSku(sku)
  └── barcodeService.lookup(sku)
        └── GET /api/barcode/lookup?sku=NK-DFT-001
              └── productService.getByBarcode(sku)
                    ├── Try 1: match product.sku (exact, case-insensitive)
                    ├── Try 2: match product.externalBarcode (EAN-13 on box)
                    └── Try 3: match any product's stock[].variantSku (size-level)
              └── If found → build BarcodeLookupResult:
                    {
                      product: { id, name, sku, externalBarcode, categoryName, brandName, basePrice, imageUrl }
                      stockLevels: [{ sizeLabel, variantSku, quantity, status: "OK"|"LOW"|"OUT" }]
                      matchedVariant: "M"  ← set only if a variantSku matched
                    }
              └── If not found → 404 → { error: "Product not found" }
  └── Returns BarcodeLookupResult | null
```

### Three-Tier Lookup Priority:

```
Scanned value: "NK-DFT-001-M"
│
├─ Tier 1: Does any product.sku === "NK-DFT-001-M"? → NO
│
├─ Tier 2: Does any product.externalBarcode === "NK-DFT-001-M"? → NO
│
└─ Tier 3: Does any product's stock entry have variantSku === "NK-DFT-001-M"? → YES
            → Returns that product, sets matchedVariant = "M"
```

---

## 7. Scan Result — What the UI Shows

After a successful lookup:

```
┌──────────────────────────────────────────────┐
│  ||||| NK-DFT-001 |||||                       │  ← BarcodeGenerator
│  [Scanned variant: Size M]                    │  ← shown only if variantSku matched
│                                               │
│  Nike Dri-FIT T-Shirt                         │
│  SKU: NK-DFT-001                              │
│  Category: Dry-Fit  Brand: Nike               │
│  Price: ₹1,299                                │
│  Total Stock: 85                              │
│                                               │
│  Stock by Size:                               │
│  ┌───────┬────────────┬──────────┬────────┐   │
│  │ Size  │ Variant SKU│ Qty      │ Status │   │
│  ├───────┼────────────┼──────────┼────────┤   │
│  │ S     │ NK-...-S   │ 15       │ ✅ OK  │   │
│  │ M     │ NK-...-M   │ 25       │ ✅ OK  │   │
│  │ L     │ NK-...-L   │ 20       │ ✅ OK  │   │
│  │ XL    │ NK-...-XL  │ 10       │ ✅ OK  │   │
│  │ XXL   │ NK-...-XXL │ 5        │ ⚠️ LOW │   │
│  └───────┴────────────┴──────────┴────────┘   │
│                                               │
│  ┌── Receive Stock ───────────────────────┐   │
│  │ Size: [M ▼]  Qty: [1]  [Receive]       │   │
│  └────────────────────────────────────────┘   │
│                                               │
│  ┌── Quick Sale ──────────────────────────┐   │
│  │ Size: [M ▼]  Qty: [1]  [Sell] ₹1,299  │   │
│  └────────────────────────────────────────┘   │
│                                               │
│  [View Product]  [Edit Product]               │
│  [Stock Page]    [Go to Billing]              │
└──────────────────────────────────────────────┘
```

---

## 8. Inline Actions from Scan Result

### Receive Stock (Stock-In)

```
User picks size + quantity → clicks "Receive"
  └── POST /api/stock
        body: { productId, sizeId, quantity, type: "IN", reason: "Stock received (scan)" }
        └── mockStockService.adjustStock()
              └── Updates in-memory stock quantity
  └── Re-fetches scan result to show updated stock levels
```

### Quick Sale

```
User picks size + quantity → clicks "Sell"
  └── Checks: sizeInfo.quantity >= billingQty (warns if not)
  └── POST /api/billing
        body: { items: [{ productId, productName, sku, sizeId, sizeLabel, quantity, unitPrice }],
                paymentMethod: "CASH", discountAmount: 0, taxAmount: 0 }
        └── billingService.createSale()
              └── Creates a sale record with auto-generated invoiceNumber
  └── Shows success: "Quick sale created: INV-001"
  └── Re-fetches scan result to show updated stock
```

---

## 9. Component Dependency Map

```
/dashboard/products/[id]          /dashboard/scan
        │                                  │
        ▼                                  ▼
  ProductDetail.tsx               ScanPage (page.tsx)
        │                                  │
        ├── BarcodeGenerator        ├── BarcodeScanner
        │     └── react-barcode     │     └── html5-qrcode
        │                           │
        └── LabelPrinter            ├── BarcodeGenerator
              ├── BarcodeGenerator  │     └── react-barcode
              ├── Print window      │
              │     └── JsBarcode   └── barcodeService.lookup()
              │          (CDN)             └── GET /api/barcode/lookup
              └── PNG download                    └── productService.getByBarcode()
                    └── SVG→Canvas                      (3-tier: sku → externalBarcode → variantSku)
```

---

## 11. SKU Auto-Generation

When creating a **new product**, the SKU field is auto-populated as soon as a Brand and Category are both selected. The user never has to invent a code manually.

### Format

```
{BRAND_ABBREV}-{CATEGORY_ABBREV}-{SEQ}

Examples:
  Brand "Nike"     + Category "Dry-Fit"    → NK-DF-847
  Brand "Adidas"   + Category "T-Shirts"   → AD-TS-312
  Brand "Puma"     + Category "Running"    → PM-RN-561
```

### Abbreviation Rules

| Input type | Rule | Example |
|---|---|---|
| **Single-word name** | Remove vowels, take first 2 uppercase consonants | `"Nike"` → `NK`, `"Puma"` → `PM` |
| **Multi-word name** | First letter of each word (up to 2 words), uppercase | `"Dry-Fit"` → `DF`, `"T-Shirts"` → `TS` |
| **Fallback** | If fully vowels (unlikely), use first 2 letters | `"Ae"` → `AE` |

### Sequence Number

A random 3-digit number (100–999) is appended. This avoids the need for an API call to find the "next" counter, which would be slow and complex with mock data. Collision chance at typical catalog sizes is negligible.

### UX Behaviour

| Scenario | What happens |
|---|---|
| Brand + Category selected (new product) | SKU auto-populates immediately |
| User changes Brand or Category | SKU regenerates automatically (if not manually edited) |
| User manually types in the SKU field | Auto-generation stops — field is now "owned" by the user |
| User clicks 🔄 button next to SKU | Forces a fresh SKU regardless of manual edits |
| Edit existing product | SKU field is pre-filled from saved value; no auto-generation runs |

### Code Location

- **Abbreviation logic**: `abbrevName()` helper inside `ProductForm.tsx`
- **Generator**: `generateSku(brandName, categoryName)` helper inside `ProductForm.tsx`
- **Trigger**: `useEffect` watching `brandId` + `categoryId` form fields (via `Form.useWatch`)
- **Regenerate button**: `ReloadOutlined` icon in the SKU `<Input suffix>` slot

---

## 10. Quick Reference — Where to Do What in the UI

| Task | Where to go |
|---|---|
| Create a product and assign its SKU (barcode value) | Products → New Product → SKU field |
| Add a manufacturer EAN-13 to a product | Products → Edit Product → External Barcode field |
| View a product's barcode | Products → click product → Product Detail (top card) |
| Print barcode labels for a product | Products → click product → "Print Labels" button |
| Download barcode as PNG | Products → click product → "Print Labels" → "Download PNG" |
| Scan a barcode with camera | Scan → Camera Scan tab → point camera |
| Look up a product without a scanner | Scan → Manual Entry tab → type SKU |
| Receive new stock after scanning | Scan → scan product → Receive Stock card |
| Create a quick sale after scanning | Scan → scan product → Quick Sale card |
