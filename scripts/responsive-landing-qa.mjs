import fs from "node:fs/promises";
import path from "node:path";
import puppeteer from "puppeteer";

const label = process.argv[2] || "qa";
const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3002";
const outputDir = path.resolve("docs/responsive/screenshots");
const viewports = [
  [320, 700], [360, 800], [375, 812], [390, 844], [430, 932],
  [480, 854], [600, 960], [700, 320], [844, 390],
  [768, 1024], [820, 1180], [834, 1194], [1024, 768], [1180, 820],
  [1280, 800], [1440, 900], [1920, 1080],
];

await fs.mkdir(outputDir, { recursive: true });
const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
const results = [];

async function testDemoForm(browserInstance, responseStatus) {
  const page = await browserInstance.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await page.setRequestInterception(true);
  page.on("request", async (request) => {
    if (request.url().endsWith("/api/demo-requests") && request.method() === "POST") {
      await request.respond({
        status: responseStatus,
        contentType: "application/json",
        body: JSON.stringify(responseStatus === 200 ? { ok: true } : { error: "Test server error" }),
      });
      return;
    }
    await request.continue();
  });
  await page.goto(baseUrl, { waitUntil: "networkidle0", timeout: 60_000 });
  await page.type('input[name="fullName"]', "Responsive QA");
  await page.type('input[name="businessName"]', "Stockiva Test Store");
  await page.type('input[name="mobile"]', "9876543210");
  await page.type('input[name="email"]', "responsive@example.com");
  await page.type('input[name="city"]', "Lucknow");
  await page.select('select[name="businessType"]', "Clothing & Apparel");
  await page.click('form button[type="submit"], form button:not([type])');
  await page.waitForSelector('form [role="status"]', { visible: true });
  const message = await page.$eval('form [role="status"]', (element) => element.textContent?.trim());
  const buttonEnabled = await page.$eval("form button", (button) => !button.disabled);
  const formReset = responseStatus !== 200 || await page.$eval('input[name="fullName"]', (input) => input.value === "");
  await page.close();
  return { responseStatus, message, buttonEnabled, formReset };
}

try {
  for (const [width, height] of viewports) {
    const page = await browser.newPage();
    await page.setViewport({ width, height, deviceScaleFactor: 1 });
    await page.goto(baseUrl, { waitUntil: "networkidle0", timeout: 60_000 });
    await page.evaluate(() => document.fonts.ready);
    const metrics = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      scrollHeight: document.documentElement.scrollHeight,
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      clipped: [...document.querySelectorAll("main a, main button, main input, main select, main textarea")]
        .filter((element) => {
          if (element.matches('input[name="website"]')) return false;
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          const isVisible = rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
          return isVisible && (rect.right > document.documentElement.clientWidth + 1 || rect.left < -1);
        })
        .map((element) => element.textContent?.trim() || element.getAttribute("name") || element.tagName),
    }));
    await page.screenshot({ path: path.join(outputDir, `${label}-${width}x${height}.png`), fullPage: true });
    results.push({ width, height, ...metrics });
    await page.close();
  }

  const interactionPage = await browser.newPage();
  await interactionPage.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await interactionPage.goto(baseUrl, { waitUntil: "networkidle0", timeout: 60_000 });
  const menuButton = await interactionPage.$('button[aria-label="Toggle navigation"]');
  await menuButton?.evaluate((button) => button.click());
  await interactionPage.waitForFunction(() => document.querySelector('button[aria-label="Toggle navigation"]')?.getAttribute("aria-expanded") === "true");
  const menuOpen = await interactionPage.$eval('button[aria-label="Toggle navigation"]', (button) => button.getAttribute("aria-expanded") === "true");
  const bodyScrollLocked = await interactionPage.$eval("body", (body) => body.style.overflow === "hidden");
  await interactionPage.keyboard.press("Escape");
  const escapeClosedMenu = await interactionPage.$eval('button[aria-label="Toggle navigation"]', (button) => button.getAttribute("aria-expanded") === "false");
  await menuButton?.evaluate((button) => button.click());
  await interactionPage.$eval('nav[aria-label="Primary navigation"] a[href="#pricing"]', (link) => link.click());
  const menuClosed = await interactionPage.$eval('button[aria-label="Toggle navigation"]', (button) => button.getAttribute("aria-expanded") === "false");
  const pricingReached = await interactionPage.evaluate(() => location.hash === "#pricing");
  await interactionPage.click("#compare-plans details summary");
  const comparisonOpened = await interactionPage.$eval("#compare-plans details", (details) => details.open);
  await interactionPage.click("#faq details summary");
  const faqOpened = await interactionPage.$eval("#faq details", (details) => details.open);
  const inputFontSize = await interactionPage.$eval('form input[name="fullName"]', (input) => getComputedStyle(input).fontSize);
  const demoHref = await interactionPage.$eval('a[href="/demo"]', (anchor) => anchor.getAttribute("href"));
  const linkAudit = await interactionPage.evaluate(() => {
    const hrefs = [...document.querySelectorAll("main a[href]")].map((anchor) => anchor.getAttribute("href"));
    const localAnchors = hrefs
      .filter((href) => href?.startsWith("#") || href?.startsWith("/#"))
      .map((href) => href.startsWith("/#") ? href.slice(1) : href);
    const missingAnchorTargets = [...new Set(localAnchors)].filter((href) => !document.querySelector(href));
    const unsupportedLocalRoutes = [...new Set(hrefs.filter((href) => href?.startsWith("/")))]
      .filter((href) => !href.startsWith("/#") && !["/", "/demo", "/login"].includes(href));
    return { missingAnchorTargets, unsupportedLocalRoutes };
  });
  results.push({ interactions: { menuOpen, bodyScrollLocked, escapeClosedMenu, menuClosed, pricingReached, comparisonOpened, faqOpened, inputFontSize, demoHref, linkAudit } });
  await interactionPage.close();
  results.push({ demoFormSuccess: await testDemoForm(browser, 200) });
  results.push({ demoFormError: await testDemoForm(browser, 500) });
} finally {
  await browser.close();
}

await fs.writeFile(path.join(outputDir, `${label}-results.json`), `${JSON.stringify(results, null, 2)}\n`);
const failures = results.filter((result) => "horizontalOverflow" in result && (result.horizontalOverflow || result.clipped.length));
const interactionResult = results.find((result) => result.interactions)?.interactions;
const interactionFailed = !interactionResult || Object.entries(interactionResult)
  .some(([key, value]) => key === "inputFontSize" ? value !== "16px" : key === "demoHref" ? value !== "/demo" : key === "linkAudit" ? value.missingAnchorTargets.length || value.unsupportedLocalRoutes.length : value !== true);
const formsFailed = results.some((result) => result.demoFormSuccess && (!result.demoFormSuccess.message?.startsWith("Thanks") || !result.demoFormSuccess.buttonEnabled || !result.demoFormSuccess.formReset))
  || results.some((result) => result.demoFormError && (result.demoFormError.message !== "Test server error" || !result.demoFormError.buttonEnabled));
if (failures.length || interactionFailed || formsFailed) {
  console.error(JSON.stringify(failures, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(results, null, 2));
}
