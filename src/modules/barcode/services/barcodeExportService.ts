export interface BarcodeLabel {
  productName: string;
  sku: string;
  sizeLabel: string;
  quantity: number;
  unitPrice: number;
  mrp: number;
  barcodeValue: string;
}

export interface BarcodeSheetOptions {
  autoPrint?: boolean;
}

/**
 * Generate print HTML for barcode labels
 * Fixed layout: 13" × 19" (1560px × 2280px @ 120 DPI)
 * Each label: 264px × 120px
 * Grid: 5 columns × 19 rows per page
 * 
 * Uses client-side JsBarcode from CDN for SVG rendering
 * Puppeteer will wait for document.fonts.ready before PDF generation
 */
export const generateBarcodeLabelHTML = (labels: BarcodeLabel[], options: BarcodeSheetOptions = {}): string => {
  const labelRows = labels
    .map((label, index) => {
      const mrp = Number(label.mrp) || 0;
      const sellPrice = Number(label.unitPrice) || 0;
      const discount =
        mrp > 0 && sellPrice > 0
          ? Math.max(0, Math.round((1 - sellPrice / mrp) * 100))
          : 0;

      const barcodeStr = String(label.barcodeValue || "");
      const startDigit = barcodeStr.charAt(0);
      const endDigit = barcodeStr.charAt(barcodeStr.length - 1);

      return `
      <div class="label" data-barcode-id="barcode-${index}" data-barcode-value="${label.barcodeValue}">
        <div class="label-left">
          <div class="name">${escapeHtml(label.productName)}</div>
          <div class="size-badge">Size: ${escapeHtml(label.sizeLabel)}</div>
          <div class="promo-badge">RARE THREAD — SPECIAL PRICE</div>
          <div class="price-row">
            <span class="mrp">₹${mrp.toLocaleString("en-IN")}</span>
            <span class="sell-price">₹${sellPrice.toLocaleString("en-IN")}</span>
            <span class="discount-tag">${discount}% OFF</span>
          </div>
        </div>
        <div class="label-divider"></div>
        <div class="label-right">
          <svg id="barcode-${index}" class="barcode-svg" data-barcode="${label.barcodeValue}"></svg>
          <div class="barcode-numbers">
            <span>${startDigit}</span>
            <span>${endDigit}</span>
          </div>
          <input type="text" class="barcode-input" value="${label.barcodeValue}" readonly />
        </div>
      </div>`;
    })
    .join("");

  const autoPrintScript = options.autoPrint
    ? `
    <script>
      window.addEventListener('load', function() {
        setTimeout(function() {
          window.print();
        }, 300);
      });
    <\/script>`
    : "";

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Barcode Labels</title>
    <style>
      @font-face {
        font-family: 'Noto Sans';
        src: url('https://fonts.gstatic.com/s/notosans/v36/ga4hA_VRG3aoIxEbsxUa6-xVIcg.woff2') format('woff2');
        font-weight: 400;
      }
      @font-face {
        font-family: 'Noto Sans';
        src: url('https://fonts.gstatic.com/s/notosans/v36/ga4iA_VRG3aoIxEbsxUa6-xdM_U.woff2') format('woff2');
        font-weight: bold;
      }
      @page {
        size: 330mm 483mm;
        margin: 0;
        padding: 0;
      }
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }
      html, body {
        width: 330mm;
        height: 483mm;
        margin: 0;
        padding: 0;
        font-family: 'Noto Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      }
      body {
        display: flex;
        flex-wrap: wrap;
        align-content: flex-start;
        gap: 3mm;
        background: white;
        padding: 4mm;
      }
      .label {
        width: calc((330mm - 8mm - 12mm) / 5);
        height: calc((483mm - 8mm - 54mm) / 19);
        border: 1px solid #d3d3d3;
        border-radius: 0.12in;
        background: white;
        padding: 1.6mm 1.2mm 1.1mm;
        display: flex;
        align-items: stretch;
        gap: 0;
        page-break-inside: avoid;
        overflow: hidden;
        flex-shrink: 0;
      }
      .label-left {
        width: 55%;
        flex-shrink: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
        justify-content: center;
        position: relative;
        padding-right: 6px;
      }
      .label-divider {
        display: none;
      }
      .label-right {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.25px;
        overflow: hidden;
      }
      .name {
        font-family: Georgia, serif;
        font-size: 7.7px;
        font-weight: bold;
        color: #111;
        line-height: 1.2;
        text-align: left;
        word-break: break-word;
        overflow: hidden;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        /* Reserve space for 2 lines to avoid shifting */
        height: 18px;
        min-height: 18px;
        margin-top: 2px;
      }
      .size-badge {
        background: #1e90ff;
        color: white;
        font-size: 6.1px;
        font-weight: bold;
        padding: 1.5px 6px;
        border-radius: 999px;
        text-align: center;
        white-space: nowrap;
        max-width: 64%;
        overflow: hidden;
        text-overflow: ellipsis;
        align-self: center; /* center horizontally under the divider */
        min-height: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        line-height: 1;
      }
      .promo-badge {
        border: 1px solid #2e7d32;
        color: #2e7d32;
        background: #f4fbf4;
        font-size: 5.3px;
        font-weight: bold;
        text-transform: uppercase;
        padding: 1px 2.5px;
        border-radius: 3px;
        text-align: center;
        line-height: 1.1;
        word-break: break-word;
        width: 100%;
      }
      .price-row {
        display: flex;
        align-items: center;
        gap: 3px;
        flex-wrap: nowrap;
        width: 100%;
        font-size: 0.85em;
        white-space: nowrap;
        overflow: visible;
        margin-top: auto; /* push pricing row to bottom of left column */
        padding-bottom: 1mm;
        padding-right: 3px; /* keep clear of divider */
      }
      .mrp {
        font-family: 'Courier New', monospace;
        font-size: 9.5px;
        font-weight: bold;
        color: #000;
        text-decoration: line-through;
        white-space: nowrap;
        flex-shrink: 0;
      }
      .sell-price {
        font-family: 'Courier New', monospace;
        font-size: 10.5px;
        font-weight: bold;
        color: #c62828;
        white-space: nowrap;
        flex-shrink: 0;
      }
      .discount-tag {
        background: #c62828;
        color: white;
        font-size: 6.2px;
        font-weight: bold;
        padding: 2px 5px;
        border-radius: 3px;
        white-space: nowrap;
        flex-shrink: 0;
        min-width: fit-content;
      }
      .barcode-svg {
        width: 100%;
        height: 0.6in;
        margin: 0 0.006in;
      }
      .barcode-numbers {
        display: flex;
        justify-content: space-between;
        width: 100%;
        padding: 0 0.012in;
        font-family: 'Courier New', monospace;
        font-size: 5px;
        color: #444;
      }
      .barcode-input {
        width: 100%;
        padding: 0.005in 0.012in;
        border: none;
        font-family: 'Courier New', monospace;
        font-size: 5px;
        text-align: center;
        color: #333;
        background: transparent;
      }
      @media print {
        body {
          margin: 0;
          padding: 4mm;
        }
        .label {
          border: 1px solid #d3d3d3;
        }
      }
    </style>
  </head>
  <body>
    ${labelRows}
    <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script>
    <script>
      window.addEventListener('load', function() {
        var labels = document.querySelectorAll('.label');
        labels.forEach(function(label) {
          var barcodeValue = label.getAttribute('data-barcode-value');
          var barcodeId = label.getAttribute('data-barcode-id');
          var svg = document.getElementById(barcodeId);
          
          if (svg && barcodeValue) {
            try {
              JsBarcode(svg, barcodeValue, {
                format: 'EAN13',
                width: 2.0,
                height: 70,
                displayValue: false,
                margin: 2,
              });
            } catch(e) {
              try {
                JsBarcode(svg, barcodeValue, {
                  format: 'CODE128',
                  width: 2.0,
                  height: 70,
                  displayValue: false,
                  margin: 2,
                });
              } catch(e2) {
                console.warn('Barcode generation failed for', barcodeValue, e2);
              }
            }
          }
        });
      });
    <\/script>
    ${autoPrintScript}
  </body>
</html>`;
};

/**
 * Escape HTML special characters to prevent injection
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
