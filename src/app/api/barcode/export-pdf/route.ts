import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer";
import type { PDFOptions } from "puppeteer";
import chromium from "@sparticuz/chromium";
import { generateBarcodeLabelHTML } from "@/modules/barcode/services/barcodeExportService";

export const runtime = "nodejs"; // Ensure Node.js runtime

const isServerlessRuntime = Boolean(
  process.env.VERCEL ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.AWS_EXECUTION_ENV ||
  process.env.NETLIFY
);

async function resolveExecutablePath() {
  const explicitExecutablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
  if (explicitExecutablePath) {
    return explicitExecutablePath;
  }

  if (isServerlessRuntime) {
    return await chromium.executablePath();
  }

  return puppeteer.executablePath();
}

interface RequestBody {
  labels: Array<{
    productName: string;
    sku: string;
    sizeLabel: string;
    quantity: number;
    unitPrice: number;
    mrp: number;
    barcodeValue: string;
  }>;
  format?: "a4" | "12x18" | "13x19" | "coreldraw";
}

/**
 * POST /api/barcode/export-pdf
 * Generate barcode label PDF with embedded fonts and vector graphics
 *
 * Request body:
 * {
 *   labels: [{productName, sku, sizeLabel, quantity, unitPrice, mrp, barcodeValue}, ...],
 *   format?: "a4" | "12x18" | "13x19" | "coreldraw"
 * }
 *
 * Response: PDF binary stream
 */
export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json();

    if (!body.labels || !Array.isArray(body.labels) || body.labels.length === 0) {
      return NextResponse.json(
        { error: "No labels provided" },
        { status: 400 }
      );
    }

    // Validate label data
    for (const label of body.labels) {
      if (
        !label.productName ||
        !label.sku ||
        !label.sizeLabel ||
        !label.barcodeValue ||
        typeof label.unitPrice !== "number" ||
        typeof label.mrp !== "number"
      ) {
        return NextResponse.json(
          { error: "Invalid label data structure" },
          { status: 400 }
        );
      }
    }

    // Generate HTML template
    const htmlContent = generateBarcodeLabelHTML(body.labels);

    const executablePath = await resolveExecutablePath();

    // Launch Puppeteer browser
    const browser = await puppeteer.launch({
      headless: true,
      executablePath,
      args: isServerlessRuntime
        ? [...chromium.args, "--no-sandbox", "--disable-setuid-sandbox"]
        : ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });

    const page = await browser.newPage();

    // Set content and wait for fonts to load
    await page.setContent(htmlContent, { waitUntil: "networkidle2" });

    // Wait for all barcodes to be generated
    await page.waitForFunction(
      () => {
        const svgs = document.querySelectorAll(".barcode-svg");
        if (svgs.length === 0) return false;
        
        // Check if all SVGs have been populated by JsBarcode
        for (const svg of svgs) {
          if (!svg.querySelector("rect") && !svg.querySelector("path")) {
            return false; // SVG not yet populated
          }
        }
        return true; // All SVGs are populated
      },
      { timeout: 5000 }
    );

    // Wait for fonts to be loaded
    await page.evaluate(() => {
      return document.fonts.ready;
    });

    // Generate PDF with format-specific settings
    const pdfOptions: PDFOptions = {
      margin: {
        top: "0in",
        right: "0in",
        bottom: "0in",
        left: "0in",
      },
      printBackground: true,
      preferCSSPageSize: true,
    };

    if (body.format === "a4") {
      pdfOptions.width = "210mm";
      pdfOptions.height = "297mm";
    } else if (body.format === "13x19" || body.format === "12x18") {
      pdfOptions.width = "30.48cm";
      pdfOptions.height = "45.72cm";
    } else if (body.format === "coreldraw") {
      // For CorelDRAW compatibility, use the same 30.48×45.72 cm content size
      pdfOptions.width = "30.48cm";
      pdfOptions.height = "45.72cm";
      pdfOptions.printBackground = true;
      pdfOptions.preferCSSPageSize = false;
      pdfOptions.format = undefined;
    } else {
      // Default to 30.48×45.72 cm
      pdfOptions.width = "30.48cm";
      pdfOptions.height = "45.72cm";
    }

    const pdfBuffer = await page.pdf(pdfOptions);

    // Close browser
    await browser.close();

    // Return PDF as binary with appropriate headers
    return new NextResponse(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="barcode-labels-${Date.now()}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[barcode-export-pdf]", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "PDF generation failed",
      },
      { status: 500 }
    );
  }
}
