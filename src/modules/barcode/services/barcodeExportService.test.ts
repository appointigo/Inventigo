import assert from "node:assert/strict";
import test from "node:test";
import { generateBarcodeLabelHTML, renderOutlinedRupeePrice } from "./barcodeExportService.ts";

test("outlines the real Unicode rupee glyph for Corel-compatible output", () => {
  const price = renderOutlinedRupeePrice(1599);
  assert.match(price, /aria-label="₹"/u);
  assert.match(price, /<title>₹<\/title>/u);
  assert.match(price, /<path d="M14 8H86/);
  assert.match(price, />1,599<\/span>/);
});

test("renders MRP and selling prices as outlined rupees without rasterizing barcode SVG", () => {
  const html = generateBarcodeLabelHTML([
    {
      productName: "Shirt",
      sku: "123456789012",
      sizeLabel: "M",
      quantity: 1,
      unitPrice: 999,
      mrp: 1599,
      barcodeValue: "1234567890128",
    },
  ]);

  assert.equal((html.match(/class="rupee-glyph"/g) ?? []).length, 2);
  assert.match(html, />1,599<\/span>/);
  assert.match(html, />999<\/span>/);
  assert.match(html, /<span class="mrp">/);
  assert.match(html, /<svg id="barcode-0" class="barcode-svg"/);
  assert.match(html, /<meta charset="UTF-8">/);
});
