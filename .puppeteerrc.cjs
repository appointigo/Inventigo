/* eslint-disable @typescript-eslint/no-require-imports */
const path = require("node:path");

const serverlessDeployment = process.env.VERCEL === "1";

/** @type {import("puppeteer").Configuration} */
module.exports = {
  cacheDirectory: path.join(__dirname, ".cache", "puppeteer"),
  // Vercel uses @sparticuz/chromium. Local and Railway install the exact
  // Chrome for Testing revision selected by the pinned Puppeteer version.
  skipDownload: serverlessDeployment,
  chrome: {
    version: "153.0.8010.36",
  },
  "chrome-headless-shell": {
    skipDownload: true,
  },
  firefox: {
    skipDownload: true,
  },
};
