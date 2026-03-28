# Barcode Feature — Stockiva

---

## 1. What Is It?

The barcode feature is a two-way bridge between the physical world (products on shelves) and the digital inventory system.

It has two sides:
- **Barcode Reader** — use the device camera (or manual entry) to scan a barcode and instantly pull up a product's details, pricing, and stock levels.
- **Barcode Generator + Label Printer** — generate a scannable CODE-128 barcode for any product (using its SKU) and print it on a physical label to attach to the product.

In Stockiva, **the SKU is the barcode**. Every product's SKU (e.g., `NK-DFT-001`) is encoded as a CODE-128 barcode. This keeps things simple: there is no separate barcode database — if a product exists in the system, it already has a barcode identity.

---

## 2. How It Works

### Scanning (Reading a Barcode)

```
Physical barcode label
        ↓
Camera / manual entry (Scan page)
        ↓
html5-qrcode decodes it → returns the SKU string
        ↓
GET /api/barcode/lookup?sku=NK-DFT-001
        ↓
productService.getBySku() → product + stock levels
        ↓
Display: name, category, brand, price, stock by size
```

**Supported barcode formats (camera scan):**
| Format | Common Use |
|--------|-----------|
| CODE-128 | Internal SKU labels (what Stockiva generates) |
| EAN-13 | International retail products (manufacturer barcodes) |
| UPC-A | US retail products |
| CODE-39 | Legacy warehouse labels |

> **Note:** The scanner will read EAN-13 / UPC-A barcodes from manufacturer packaging, but the lookup only succeeds if the scanned value matches a SKU stored in the system. If a product was received with manufacturer packaging (e.g., barcode `8901030811649`), the SKU in the system would need to be set to that value at product creation time for the scan to resolve.

### Generating (Creating a Barcode)

```
Product created with SKU → "NK-DFT-001"
        ↓
BarcodeGenerator renders SKU as CODE-128 SVG
        ↓
LabelPrinter opens a printable A4 page
(62mm × 30mm label: name + barcode + price)
        ↓
Print → cut → attach label to product
```

---

## 3. Adding a Product to Inventory by Scanning

Currently, scanning identifies a product — it does **not** directly modify stock. After a scan, the "Quick Actions" panel gives shortcuts to:
- **View Details** → goes to the product detail page
- **Adjust Stock** → goes to the Stock page to log a manual adjustment
- **Purchase Orders** → goes to PO page to raise a reorder

**The intended flow for receiving new stock by scan:**

1. Staff scans the barcode on incoming stock.
2. System looks up the product and shows current stock levels by size.
3. Staff enters the received quantity and hits "Add to Stock".
4. System logs a stock movement (`type: IN`, reason: `PURCHASE` or `RECEIVED`).

> **Current gap:** Step 3–4 is not wired up yet. The scan page shows the product but navigates away to the Stock page rather than doing an inline stock adjustment. This is a planned enhancement (see §6).

---

## 4. How Barcode Scanning Helps in Billing

When a customer brings items to the counter, the cashier needs to quickly add products to a sale without manually searching. Barcode scanning makes this instant:

**Proposed billing scan flow:**

```
Cashier scans barcode on product tag
        ↓
/api/barcode/lookup?sku=NK-DFT-001
        ↓
Returns: product name, SKU, price (basePrice)
        ↓
Item is added to the current bill / sale line
(quantity defaulting to 1, editable)
        ↓
Repeat for each item
        ↓
Total is calculated with tax (from Billing Config)
        ↓
Finalize sale → stock is decremented
```

**Key benefit:** The cashier never needs to type a product name or price. One scan gives:
- Product name
- SKU / variant
- Price (with any applicable discount)
- Stock availability (can warn if picking more than in stock)

> **Current gap:** The Billing page (`/dashboard/billing`) has its own sale form but does not yet have a "scan to add line item" button. The scan page's Quick Actions link to Purchase Orders (for procurement), not to Billing (for point-of-sale). Connecting the two is a planned enhancement (see §6).

---

## 5. Handling New Products and New Stock Without Barcodes

### Scenario A — Brand new product arriving at the store (never in system)

A box of **Puma Joggers Size L** arrives. It has never been in Stockiva before.

**Steps:**

1. **Create the product** in Stockiva:
   - Go to Products → New Product
   - Fill in: Name, Category, Brand, Base Price
   - Assign a **SKU** — this becomes the barcode value.
     - Use a consistent naming convention, e.g., `PM-JOG-L`
     - Or, if the product has a manufacturer EAN-13 barcode on the box (e.g., `4060477182940`), use that as the SKU so the physical barcode on packaging already scans correctly.

2. **Generate and print a label:**
   - Open the product's detail page.
   - The barcode is auto-rendered from the SKU.
   - Click **Print Labels** → choose number of copies → print.
   - The label shows: product name, CODE-128 barcode, price.

3. **Attach the label** to the product (or hang tag).

4. **Add opening stock:**
   - Go to Stock → Adjust Stock → select product → enter quantity received.

From this point, scanning the label at billing or receiving will resolve instantly.

---

### Scenario B — New stock of an existing product (e.g., Nike T-Shirt Size M restock)

The product already exists in the system with SKU `NK-TSH-M`. A shipment of 20 units just arrived.

**Steps:**

1. **Scan the existing label** on one of the incoming units (or find the product manually).
2. System shows current stock for `NK-TSH-M`.
3. **Adjust stock** — log a stock-in movement with quantity 20, reason `PURCHASE` or `RECEIVED`.
4. If the incoming stock doesn't have labels (e.g., it's loose stock without hang tags), **print new labels** from the product detail page and attach them.

No new barcode is needed — the SKU and its barcode already exist.

---

### Barcode Generation — Technical Detail

Stockiva uses **react-barcode** (wraps **JsBarcode**) to render CODE-128 barcodes in the browser:

```tsx
<BarcodeGenerator value="NK-TSH-M" height={50} displayValue />
```

The `LabelPrinter` component opens a new browser window with print-ready HTML. It:
- Lays out 62mm × 30mm labels in an A4 grid (fits ~24 per page)
- Uses **JsBarcode** (loaded from CDN in the print window) to render each barcode as SVG
- Includes product name and price on each label
- Calls `window.print()` after a 300ms delay (to ensure SVGs render)

**Label size:** 62mm × 30mm — compatible with standard hangtag printers (e.g., Zebra ZD220, Dymo LabelWriter).

---

## 6. What the Current System Already Manages

| Feature | Status | Where |
|---------|--------|-------|
| Camera barcode scanning | ✅ Done | `BarcodeScanner.tsx` — html5-qrcode, CODE-128/EAN-13/UPC-A/CODE-39 |
| Manual SKU entry lookup | ✅ Done | Scan page → Manual Entry tab |
| Product lookup by SKU | ✅ Done | `GET /api/barcode/lookup?sku=` |
| Returns product name, category, brand, price | ✅ Done | `BarcodeLookupResult` type + API |
| Returns stock levels by size (OK/LOW/OUT) | ✅ Done | API route maps stock to status |
| Barcode display on scan result | ✅ Done | `BarcodeGenerator` on scan result card |
| Barcode on product detail page | ✅ Done | `ProductDetail.tsx` renders barcode + LabelPrinter |
| Barcode label generation (CODE-128) | ✅ Done | `BarcodeGenerator.tsx` — react-barcode |
| Print labels (multi-copy, A4 layout, with price) | ✅ Done | `LabelPrinter.tsx` — opens print window, JsBarcode CDN |
| Scan → navigate to stock adjustment | ✅ Done | Quick Actions on scan result |
| Inline stock-in from scan | ✅ Done | Receive Stock" card on scan result with size + qty + submit |
| Billing: scan to add line item | ✅ Done | "Quick Sale" card on scan result + "Go to Billing" navigation |
| External EAN-13 auto-match | ✅ Done | `externalBarcode` field on Product, barcode lookup tries SKU → externalBarcode → variantSku |
| Variant-level barcodes | ✅ Done | `variantSku` per size (e.g., `NK-DFT-001-M`), resolved in barcode lookup with `matchedVariant` indicator |
| Barcode image export | ✅ Done | "Download PNG" button in LabelPrinter modal, exports 2× hi-res PNG via canvas |
