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
  await interactionPage.$eval('nav[aria-label="Primary navigation"] a[href="#pricing"]', (link) => link.click());
  const menuClosed = await interactionPage.$eval('button[aria-label="Toggle navigation"]', (button) => button.getAttribute("aria-expanded") === "false");
  const pricingReached = await interactionPage.evaluate(() => location.hash === "#pricing");
  await interactionPage.click("#compare-plans details summary");
  const comparisonOpened = await interactionPage.$eval("#compare-plans details", (details) => details.open);
  await interactionPage.click("#faq details summary");
  const faqOpened = await interactionPage.$eval("#faq details", (details) => details.open);
  const inputFontSize = await interactionPage.$eval('form input[name="fullName"]', (input) => getComputedStyle(input).fontSize);
  const demoHref = await interactionPage.$eval('a[href="/demo"]', (anchor) => anchor.getAttribute("href"));
  results.push({ interactions: { menuOpen, menuClosed, pricingReached, comparisonOpened, faqOpened, inputFontSize, demoHref } });
  await interactionPage.close();
} finally {
  await browser.close();
}

await fs.writeFile(path.join(outputDir, `${label}-results.json`), `${JSON.stringify(results, null, 2)}\n`);
const failures = results.filter((result) => "horizontalOverflow" in result && (result.horizontalOverflow || result.clipped.length));
if (failures.length) {
  console.error(JSON.stringify(failures, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(results, null, 2));
}
