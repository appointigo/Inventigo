import assert from "node:assert/strict";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import { createRequire } from "node:module";
import { JSDOM } from "jsdom";
import React, { useEffect } from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";
import ts from "typescript";

const require = createRequire(import.meta.url);
const hookPath = path.resolve("src/modules/billing/hooks/useBillingProductSearch.ts");
const source = fs.readFileSync(hookPath, "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    esModuleInterop: true,
  },
  fileName: hookPath,
}).outputText;

const hookModule = new Module(hookPath);
hookModule.filename = hookPath;
hookModule.paths = Module._nodeModulePaths(path.dirname(hookPath));
hookModule.require = require;
hookModule._compile(compiled, hookPath);

const {
  BILLING_PRODUCT_SEARCH_DEBOUNCE_MS,
  useBillingProductSearch,
} = hookModule.exports;

const dom = new JSDOM("<div id=\"root\"></div>", { url: "http://localhost" });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
Object.defineProperty(globalThis, "navigator", {
  configurable: true,
  value: dom.window.navigator,
});
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let current;
const queryChanges = [];

function Harness() {
  current = useBillingProductSearch();
  const productQuery = current.productQuery;
  useEffect(() => {
    queryChanges.push(productQuery);
  }, [productQuery]);
  return null;
}

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const root = createRoot(document.getElementById("root"));

await act(async () => root.render(React.createElement(Harness)));
assert.equal(current.productQuery, "", "empty input must not create a query");

await act(async () => {
  current.changeSearch("C");
});
await act(async () => wait(BILLING_PRODUCT_SEARCH_DEBOUNCE_MS + 25));
assert.equal(current.productQuery, "", "one character must not create a partial-search query");

await act(async () => {
  current.changeSearch("Ca");
  current.changeSearch("Cal");
  current.changeSearch("Calvin");
});
await act(async () => wait(BILLING_PRODUCT_SEARCH_DEBOUNCE_MS + 25));
assert.equal(current.productQuery, "Calvin", "rapid typing must settle to one final query");

await act(async () => current.changeSearch("Cal"));
await act(async () => wait(BILLING_PRODUCT_SEARCH_DEBOUNCE_MS / 2));
await act(async () => current.changeSearch("Calvin Klein"));
await act(async () => wait(BILLING_PRODUCT_SEARCH_DEBOUNCE_MS - 50));
assert.equal(current.productQuery, "", "continuing to type must reset the timer");
await act(async () => wait(75));
assert.equal(current.productQuery, "Calvin Klein", "the final value must run after the renewed delay");

const beforeExplicit = queryChanges.length;
await act(async () => {
  current.submitExactSearch("TSHIRT-BLK-XL-1024");
});
assert.equal(current.productQuery, "TSHIRT-BLK-XL-1024", "Enter must submit immediately");
await act(async () => wait(BILLING_PRODUCT_SEARCH_DEBOUNCE_MS + 25));
assert.equal(
  queryChanges.slice(beforeExplicit).filter((value) => value === "TSHIRT-BLK-XL-1024").length,
  1,
  "an explicit Enter query must not be repeated by the debounce",
);

await act(async () => current.clearSearch());
assert.equal(current.search, "");
assert.equal(current.productQuery, "", "clearing input must clear the active query");

await act(async () => root.unmount());

const productsHookPath = path.resolve("src/modules/products/hooks/useProducts.ts");
const productsHookSource = fs.readFileSync(productsHookPath, "utf8");
const productsHookCompiled = ts.transpileModule(productsHookSource, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    esModuleInterop: true,
  },
  fileName: productsHookPath,
}).outputText;
const productsHookModule = new Module(productsHookPath);
productsHookModule.filename = productsHookPath;
productsHookModule.paths = Module._nodeModulePaths(path.dirname(productsHookPath));
productsHookModule.require = require;
productsHookModule._compile(productsHookCompiled, productsHookPath);
const { useProducts } = productsHookModule.exports;

const requests = [];
globalThis.fetch = (url, options = {}) => new Promise((resolve) => {
  requests.push({ url: String(url), signal: options.signal, resolve });
});

let productsState;
function ProductsHarness({ query }) {
  productsState = useProducts({ search: query }, { enabled: true });
  return null;
}

const productsContainer = document.createElement("div");
document.body.appendChild(productsContainer);
const productsRoot = createRoot(productsContainer);
await act(async () => productsRoot.render(React.createElement(ProductsHarness, { query: "Cal" })));
assert.equal(requests.length, 1, "the first settled term must create one request");

await act(async () => productsRoot.render(React.createElement(ProductsHarness, { query: "Calvin" })));
assert.equal(requests.length, 2, "a newer settled term must create one newer request");
assert.equal(requests[0].signal.aborted, true, "the older request must be aborted");

await act(async () => {
  requests[1].resolve({
    ok: true,
    json: async () => ({ items: [{ id: "new-result" }], total: 1, page: 1, pageSize: 10 }),
  });
  await wait(0);
});
assert.equal(productsState.products[0]?.id, "new-result");
assert.equal(productsState.resolvedSearch, "Calvin");

await act(async () => {
  requests[0].resolve({
    ok: true,
    json: async () => ({ items: [{ id: "stale-result" }], total: 1, page: 1, pageSize: 10 }),
  });
  await wait(0);
});
assert.equal(productsState.products[0]?.id, "new-result", "a stale response must not overwrite newer results");

await act(async () => productsRoot.unmount());
console.log("Billing product-search scheduling verification passed.");
