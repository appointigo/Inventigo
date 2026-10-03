import { access } from "node:fs/promises";
import path from "node:path";
import {
  Browser as InstalledBrowser,
  computeExecutablePath,
  detectBrowserPlatform,
} from "@puppeteer/browsers";
import puppeteer, { type Browser, type LaunchOptions } from "puppeteer-core";
import { PUPPETEER_REVISIONS } from "puppeteer-core/internal/revisions.js";

const DEPLOYMENT_ARGS = [
  "--no-sandbox",
  "--disable-setuid-sandbox",
  "--disable-dev-shm-usage",
];

const isVercel = () => process.env.VERCEL === "1";
const isRailway = () => Boolean(process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID);

const localChromeExecutable = () => {
  const platform = detectBrowserPlatform();
  if (!platform) {
    throw new Error(`INVOICE_BROWSER_UNSUPPORTED_PLATFORM: ${process.platform}/${process.arch}`);
  }

  return computeExecutablePath({
    browser: InstalledBrowser.CHROME,
    buildId: PUPPETEER_REVISIONS.chrome,
    cacheDir:
      process.env.PUPPETEER_CACHE_DIR ??
      path.join(/* turbopackIgnore: true */ process.cwd(), ".cache", "puppeteer"),
    platform,
  });
};

export async function getInvoiceBrowserLaunchOptions(): Promise<LaunchOptions> {
  if (isVercel()) {
    const { default: chromium } = await import("@sparticuz/chromium");
    chromium.setGraphicsMode = false;
    return {
      args: await puppeteer.defaultArgs({ args: chromium.args, headless: "shell" }),
      executablePath: await chromium.executablePath(),
      headless: "shell",
    };
  }

  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || localChromeExecutable();
  try {
    await access(executablePath);
  } catch {
    throw new Error(
      `INVOICE_BROWSER_EXECUTABLE_NOT_FOUND: ${executablePath}. Run npm install to install the pinned Chrome for Testing build.`
    );
  }

  return {
    executablePath,
    headless: true,
    args: isRailway() ? DEPLOYMENT_ARGS : undefined,
  };
}

export async function launchInvoiceBrowser(): Promise<Browser> {
  return puppeteer.launch(await getInvoiceBrowserLaunchOptions());
}

export const invoiceBrowserVersions = {
  chrome: PUPPETEER_REVISIONS.chrome,
  puppeteer: "25.11.0",
  serverlessChromiumMajor: "153",
} as const;
