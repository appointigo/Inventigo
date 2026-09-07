// Run: node scripts/verify-negotiated-pricing.mjs
// Database checks: TEST_DATABASE_URL=postgresql://.../pricing_test node scripts/verify-negotiated-pricing.mjs --database
// The database must be disposable and have the current schema. No .env is loaded.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Module, { createRequire } from 'node:module';
import ts from 'typescript';
import React, { act } from 'react';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const cache = new Map();
const moduleMocks = new Map();
function load(filename) {
  filename = path.resolve(filename);
  if (cache.has(filename)) return cache.get(filename).exports;
  const mod = new Module(filename);
  cache.set(filename, mod);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(path.dirname(filename));
  mod.require = (id) => {
    if (moduleMocks.has(id)) return moduleMocks.get(id);
    // Only messaging is stubbed; billing, customers, stock and Prisma run unchanged.
    if (id === '@/modules/whatsapp/server') return { createWhatsAppAutomationReader: () => ({ emit: async () => {} }) };
    if (id === '@/providers/StoreProvider') return { useStore: () => ({ storeName: 'Test Store' }) };
    if (id.startsWith('@/') || id.startsWith('.')) {
      const base = id.startsWith('@/') ? path.resolve('src', id.slice(2)) : path.resolve(path.dirname(filename), id);
      const candidate = [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`].find((p) => fs.existsSync(p) && fs.statSync(p).isFile());
      if (candidate && /\.tsx?$/.test(candidate)) return load(candidate);
    }
    return require(id);
  };
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    fileName: filename,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, filename);
  return mod.exports;
}

const { resolveItemPrice, allocatePricingSnapshots } = load('src/modules/billing/utils/pricingEngine.ts');
const { getHistoricalReturnAmount, normalizeSaleCompatibility } = load('src/modules/billing/utils/saleCompatibility.ts');
let passed = 0;
async function check(name, run) { await run(); passed++; console.log(`PASS ${name}`); }
const source = (price, mode = 'NONE', value = 0, quantity = 1) => ({ productId: 'P', mrp: price, sellingPrice: price, originalUnitPrice: price, itemDiscountType: mode, itemDiscountValue: value, quantity, costPrice: 400 });

await check('fixed discount is per unit; percentage and direct prices preserve metadata', () => {
  for (const [mode, value, expected] of [['FLAT', 150, 850], ['PERCENTAGE', 20, 800], ['PRICE', 900, 900], ['PRICE', 1100, 1100], ['PRICE', 0, 0]]) {
    const result = allocatePricingSnapshots([source(1000, mode, value, 2)]);
    assert.equal(result.total, expected * 2);
    assert.equal(result.snapshots[0].sellingPrice, expected);
    assert.equal(result.snapshots[0].itemDiscountType, mode);
    assert.equal(result.snapshots[0].itemDiscountValue, value);
    assert.equal(result.snapshots[0].originalUnitPrice, 1000);
    assert.equal(result.snapshots[0].costPrice, 400);
    assert.equal(getHistoricalReturnAmount(result.snapshots[0], 2), expected * 2);
  }
});
await check('A 1000→900 and B 800→900; B return and exchange credit is 900', () => {
  const result = allocatePricingSnapshots([source(1000, 'PRICE', 900), source(800, 'PRICE', 900)]);
  assert.equal(result.total, 1800);
  assert.deepEqual(result.snapshots.map((item) => item.netLineAmount), [900, 900]);
  assert.equal(getHistoricalReturnAmount(result.snapshots[1], 1), 900);
});
await check('different item discounts and unchanged items remain independent', () => {
  const result = allocatePricingSnapshots([source(1000, 'FLAT', 100), source(1000, 'PERCENTAGE', 20), source(800)]);
  assert.deepEqual(result.snapshots.map((item) => item.netLineAmount), [900, 800, 800]);
  assert.equal(result.total, 2500);
});
await check('bill discount follows item pricing and survives historical normalization', () => {
  const result = allocatePricingSnapshots([source(1000, 'PRICE', 900), source(800, 'PRICE', 900)], { discountType: 'FLAT', discountAmount: 100 });
  assert.equal(result.total, 1700);
  assert.deepEqual(result.snapshots.map((item) => item.allocatedDiscount), [50, 50]);
  const sale = normalizeSaleCompatibility({ items: result.snapshots, discountAmount: 999 });
  assert.equal(getHistoricalReturnAmount(sale.items[1], 1), 850);
});
await check('tax exclusive/inclusive and mixed rates conserve exact net lines', () => {
  for (const mode of ['EXCLUSIVE', 'INCLUSIVE']) {
    const result = allocatePricingSnapshots([source(1000, 'PERCENTAGE', 20)], { taxRate: 18, taxMode: mode });
    assert.equal(result.total, mode === 'EXCLUSIVE' ? 944 : 800);
    assert.equal(result.snapshots[0].netLineAmount, result.total);
    assert.equal(result.snapshots[0].effectiveUnitPrice, result.total);
    assert.equal(getHistoricalReturnAmount(result.snapshots[0], 1), result.total);
  }
  const mixed = allocatePricingSnapshots([{ ...source(1000), taxRate: 5 }, { ...source(1000), taxRate: 18 }]);
  assert.equal(mixed.taxAmount, 230);
});
await check('paise allocation cannot discount zero-price/ineligible lines; partial returns reconcile', () => {
  const result = allocatePricingSnapshots([...Array.from({ length: 6 }, () => source(1)), source(0)], { discountType: 'FLAT', discountAmount: 0.03 });
  assert.equal(result.snapshots.at(-1).allocatedDiscount, 0);
  assert.ok(result.snapshots.every((item) => item.allocatedDiscount >= 0));
  const item = allocatePricingSnapshots([source(1, 'NONE', 0, 3)], { discountType: 'FLAT', discountAmount: 0.01 }).snapshots[0];
  assert.deepEqual([0, 1, 2].map((returned) => getHistoricalReturnAmount(item, 1, returned)), [1, 0.99, 1]);
  assert.equal(getHistoricalReturnAmount(item, 3), 2.99);
});
await check('malformed prices, discounts, quantities and global percentages are rejected', () => {
  for (const value of [-1, NaN, Infinity, '20', null]) assert.throws(() => resolveItemPrice(1000, { itemDiscountType: 'PRICE', itemDiscountValue: value }));
  for (const [mode, value] of [['PERCENTAGE', 101], ['FLAT', 1001], ['FLAT', -1], ['oops', 0]]) assert.throws(() => resolveItemPrice(1000, { itemDiscountType: mode, itemDiscountValue: value }));
  for (const options of [{ discountPercent: 101 }, { discountAmount: -1 }, { taxRate: Infinity }]) assert.throws(() => allocatePricingSnapshots([source(1000)], options));
  assert.throws(() => allocatePricingSnapshots([source(1000, 'NONE', 0, 0.5)]));
});

moduleMocks.set('@/lib/db', { prisma: {} });
const productServicePath = path.resolve('src/modules/products/services/productService.ts');
const { buildProductWhere } = load(productServicePath);
moduleMocks.delete('@/lib/db');
cache.delete(productServicePath);
await check('product query combines tenant, category, brand, search, store and exact positive size stock', () => {
  const where = buildProductWhere('ORG', {
    storeId: 'STORE',
    categoryId: 'SHIRTS',
    brandId: 'BRAND',
    search: 'Oxford',
    sizeId: '42',
  });
  assert.equal(where.orgId, 'ORG');
  assert.equal(where.categoryId, 'SHIRTS');
  assert.equal(where.brandId, 'BRAND');
  assert.ok(Array.isArray(where.OR));
  assert.deepEqual(where.stockEntries, {
    some: {
      storeId: 'STORE',
      sizeId: '42',
      quantity: { gt: 0 },
      store: { orgId: 'ORG', isActive: true },
    },
  });

  const barcode = buildProductWhere('ORG', { search: '12345678' });
  assert.ok(barcode.OR.every((condition) => !JSON.stringify(condition).includes('contains')));
});
load('src/modules/billing/utils/saleCompatibility.test.ts');
load('__tests__/pricing.integration.test.ts');

// Exercise the real cart hook and item editor, plus the invoice DOM and print output.
const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
for (const name of ['HTMLElement', 'Element', 'SVGElement', 'ShadowRoot', 'MutationObserver']) globalThis[name] = dom.window[name];
globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: dom.window.navigator });
window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { createRoot } = require('react-dom/client');
const { useCart } = load('src/modules/billing/hooks/useBilling.ts');
const { ItemPriceEditor } = load('src/modules/billing/components/ItemPriceEditor.tsx');
let cart;
function CartHarness() { cart = useCart(); return React.createElement('div', {}, cart.items.map((item) => React.createElement(ItemPriceEditor, { key: item.productId, item, onChange: cart.updateItemPricing }))); }
const root = createRoot(document.getElementById('root'));
await act(async () => root.render(React.createElement(CartHarness)));
const cartItem = (productId, unitPrice) => ({ productId, productName: productId, sku: productId, sizeId: '42', sizeLabel: '42', attributes: {}, quantity: 1, unitPrice });
await check('cart editing updates totals, payload, quantity, removal and default payment', async () => {
  await act(async () => { cart.addItem(cartItem('A', 1000)); cart.addItem(cartItem('B', 800)); });
  await act(async () => { cart.updateItemPricing('A', '42', { itemDiscountType: 'PRICE', itemDiscountValue: 900 }); cart.updateItemPricing('B', '42', { itemDiscountType: 'PRICE', itemDiscountValue: 900 }); });
  assert.equal(cart.total, 1800);
  assert.equal(cart.toCreateInput().amountPaid, 1800);
  assert.equal(document.querySelectorAll('input[role="spinbutton"]').length, 2);
  assert.match(document.body.textContent, /Final ₹900/);
  await act(async () => cart.updateQuantity('B', '42', 2));
  assert.equal(cart.total, 2700);
  await act(async () => { cart.setDiscountPct(10); cart.setTaxPct(18); });
  assert.equal(cart.total, 2867); // 2700 - 270 + 437.40, rounded to rupee
  assert.equal(cart.toCreateInput().taxAmount, 437.4);
  await act(async () => { cart.removeItem('A', '42'); cart.clearCart(); });
  assert.equal(cart.total, 0);
});
await act(async () => root.unmount());

const { useProducts } = load('src/modules/products/hooks/useProducts.ts');
const productRequests = [];
const realFetch = globalThis.fetch;
globalThis.fetch = async (url) => {
  productRequests.push(String(url));
  return {
    ok: true,
    json: async () => ({ items: [], total: 0, page: 1, pageSize: 20 }),
  };
};
function ProductHarness({ filters, enabled }) {
  useProducts(filters, { enabled });
  return React.createElement('div');
}
const productRoot = createRoot(document.getElementById('root'));
const settle = (milliseconds = 20) => new Promise((resolve) => setTimeout(resolve, milliseconds));
await check('product hook waits for store, sends one request per filter transition, debounces search and omits undefined values', async () => {
  await act(async () => {
    productRoot.render(React.createElement(ProductHarness, { filters: {}, enabled: false }));
  });
  await act(async () => settle());
  assert.equal(productRequests.length, 0);

  const renderFilters = async (filters, delay = 20) => {
    await act(async () => {
      productRoot.render(React.createElement(ProductHarness, { filters, enabled: true }));
    });
    await act(async () => settle(delay));
  };
  await renderFilters({ storeId: 'STORE', page: 1, pageSize: 20 });
  await renderFilters({ storeId: 'STORE', categoryId: 'SHIRTS', page: 1, pageSize: 20 });
  await renderFilters({ storeId: 'STORE', categoryId: 'SHIRTS', sizeId: '42', page: 1, pageSize: 20 });
  await renderFilters({ storeId: 'STORE', categoryId: 'SHIRTS', sizeId: undefined, page: 1, pageSize: 20 });
  await renderFilters({ storeId: 'STORE', categoryId: undefined, sizeId: undefined, page: 1, pageSize: 20 });
  await renderFilters({ storeId: 'STORE', search: 'O', page: 1, pageSize: 20 }, 25);
  await renderFilters({ storeId: 'STORE', search: 'Ox', page: 1, pageSize: 20 }, 25);
  await renderFilters({ storeId: 'STORE', search: 'Oxford', page: 1, pageSize: 20 }, 375);

  assert.equal(productRequests.length, 6);
  assert.match(productRequests[0], /storeId=STORE/);
  assert.match(productRequests[1], /categoryId=SHIRTS/);
  assert.match(productRequests[2], /sizeId=42/);
  assert.ok(!productRequests[3].includes('sizeId='));
  assert.ok(!productRequests[4].includes('categoryId='));
  assert.match(productRequests[5], /search=Oxford/);
  assert.ok(productRequests.every((url) => !/=(?:undefined|null)(?:&|$)/.test(url)));
});
await act(async () => productRoot.unmount());

let desktopStoreId;
let desktopQuery = new URLSearchParams();
const desktopRequests = [];
const desktopMessage = { error() {}, success() {} };
const desktopRouter = { push() {}, replace() {} };
moduleMocks.set('next/dynamic', { __esModule: true, default: () => () => React.createElement('div') });
moduleMocks.set('next/navigation', {
  useRouter: () => desktopRouter,
  usePathname: () => '/dashboard/products',
  useSearchParams: () => desktopQuery,
});
moduleMocks.set('antd', {
  App: { useApp: () => ({ message: desktopMessage }) },
  Typography: { Title: ({ children }) => React.createElement('h1', {}, children) },
});
moduleMocks.set('@/providers/StoreProvider', { useStore: () => ({ storeId: desktopStoreId }) });
moduleMocks.set('@/modules/mobile-dashboard/hooks/useMobileViewport', { useMobileViewport: () => ({ isMobile: false, isReady: true }) });
moduleMocks.set('@/modules/categories/hooks/useCategories', { useCategories: () => ({ categories: [] }) });
moduleMocks.set('@/modules/brands/hooks/useBrands', { useBrands: () => ({ brands: [] }) });
moduleMocks.set('@/modules/products/components/ProductTable', { __esModule: true, default: () => React.createElement('div') });
moduleMocks.set('@/modules/products/components/BulkUploadDrawer', { __esModule: true, default: () => React.createElement('div') });
globalThis.fetch = async (url) => {
  desktopRequests.push(String(url));
  return {
    ok: true,
    json: async () => ({ items: [], total: 0, page: 1, pageSize: 20, categoryAttributeSchema: null }),
  };
};
const DesktopProductsPage = load('src/app/(dashboard)/dashboard/products/page.tsx').default;
const desktopRoot = createRoot(document.getElementById('root'));
const renderDesktop = async () => {
  await act(async () => desktopRoot.render(React.createElement(DesktopProductsPage)));
  await act(async () => settle());
};
await check('desktop product page waits for store and issues one request for each category/size/clear transition', async () => {
  await renderDesktop();
  assert.equal(desktopRequests.length, 0);
  desktopStoreId = 'STORE';
  await renderDesktop();
  desktopQuery = new URLSearchParams('categoryId=SHIRTS&page=1&pageSize=20');
  await renderDesktop();
  desktopQuery = new URLSearchParams('categoryId=SHIRTS&sizeId=42&page=1&pageSize=20');
  await renderDesktop();
  desktopQuery = new URLSearchParams('categoryId=SHIRTS&page=1&pageSize=20');
  await renderDesktop();
  desktopQuery = new URLSearchParams('page=1&pageSize=20');
  await renderDesktop();

  assert.equal(desktopRequests.length, 5);
  assert.ok(desktopRequests.every((url) => url.includes('storeId=STORE')));
  assert.ok(desktopRequests[1].includes('categoryId=SHIRTS'));
  assert.ok(desktopRequests[2].includes('sizeId=42'));
  assert.ok(!desktopRequests[3].includes('sizeId='));
  assert.ok(!desktopRequests[4].includes('categoryId='));
});
await act(async () => desktopRoot.unmount());
for (const id of [
  'next/dynamic',
  'next/navigation',
  'antd',
  '@/providers/StoreProvider',
  '@/modules/mobile-dashboard/hooks/useMobileViewport',
  '@/modules/categories/hooks/useCategories',
  '@/modules/brands/hooks/useBrands',
  '@/modules/products/components/ProductTable',
  '@/modules/products/components/BulkUploadDrawer',
]) moduleMocks.delete(id);
globalThis.fetch = realFetch;

if (process.argv.includes('--database')) {
  const url = new URL(process.env.TEST_DATABASE_URL ?? '');
  assert.equal(url.hostname, '127.0.0.1', 'Database tests require an isolated localhost database');
  assert.equal(url.pathname, '/pricing_test', 'Database tests require the disposable pricing_test database');
  process.env.DATABASE_URL = url.href;
  const { prisma } = load('src/lib/db.ts');
  const { billingService } = load('src/modules/billing/services/billingService.ts');
  const { productService } = load('src/modules/products/services/productService.ts');
  try {
    const token = `${Date.now()}`;
    const org = await prisma.organization.create({ data: { name: 'Pricing regression', slug: `pricing-${token}` } });
    const store = await prisma.store.create({ data: { orgId: org.id, name: 'Test', code: 'TEST' } });
    const otherStore = await prisma.store.create({ data: { orgId: org.id, name: 'Other', code: 'OTHER' } });
    const user = await prisma.user.create({ data: { orgId: org.id, storeId: store.id, name: 'Cashier', email: `${token}@example.invalid`, passwordHash: 'unused' } });
    const category = await prisma.category.create({ data: { orgId: org.id, name: 'Shirt', slug: 'shirt' } });
    const brand = await prisma.brand.create({ data: { orgId: org.id, name: 'Nike' } });
    const sizes = await Promise.all(['40', '42', '44'].map((label) => prisma.size.create({ data: { categoryId: category.id, label } })));
    const product = async (name, price, quantities) => prisma.product.create({ data: {
      orgId: org.id, categoryId: category.id, brandId: brand.id, name, sku: name, basePrice: price, mrp: price, costPrice: 400,
      stockEntries: { create: quantities.map((quantity, index) => ({ storeId: store.id, sizeId: sizes[index].id, quantity })) },
    } });
    const a = await product('Product A', 1000, [20, 20, 20]);
    const b = await product('Product B', 800, [20, 20, 20]);
    const inputItem = (p, value = 900, mode = 'PRICE', quantity = 1) => ({ ...cartItem(p.id, 99999), sizeId: sizes[1].id, itemDiscountType: mode, itemDiscountValue: value, quantity, originalUnitPrice: 99999 });
    const saleInput = (items, extra = {}) => ({ items, customerPhone: '9999999999', paymentMethod: 'CASH', discountAmount: 0, taxAmount: 99999, ...extra });
    const createSale = (input) => billingService.createSale(org.id, store.id, user.id, input);
    const returnSale = (sale, index = 1, quantity = 1, extra = {}) => billingService.createReturnTransaction(org.id, sale.id, user.id, {
      type: 'RETURN', returnedItems: [{ productId: sale.items[index].productId, sizeId: sizes[1].id, quantity, total: 1 }], refundAmount: 1, refundMethod: 'CASH', ...extra,
    });
    let realSale;
    await check('DATABASE sale→invoice→return: A 900 + B 900 = 1800; return B = 900', async () => {
      realSale = await createSale(saleInput([inputItem(a), inputItem(b)]));
      assert.equal(realSale.total, 1800);
      assert.equal(realSale.items[0].originalUnitPrice, 1000);
      assert.equal(realSale.items[1].originalUnitPrice, 800);
      assert.equal(realSale.items[1].netLineAmount, 900);
      const invoice = await billingService.getSaleById(org.id, realSale.id);
      assert.deepEqual(invoice.items.map((item) => item.finalLineAmount), [900, 900]);
      await prisma.product.update({ where: { id: b.id }, data: { basePrice: 1234 } });
      const returned = await returnSale(realSale);
      assert.equal(returned.refundAmount, 900);
      assert.equal(returned.returnedItems[0].total, 900);
      const detail = await billingService.getSaleById(org.id, realSale.id);
      assert.equal(detail.returnTransactions[0].returnedItems[0].total, 900);
      assert.equal(Number((await prisma.product.findUnique({ where: { id: b.id } })).costPrice), 400);
      await assert.rejects(() => returnSale(realSale), /Invalid returned quantity/);
      await prisma.product.update({ where: { id: b.id }, data: { basePrice: 800 } });
    });
    await check('DATABASE invoice DOM and print show the agreed 900/900 transaction', async () => {
      const Invoice = load('src/modules/billing/components/InvoicePreview.tsx').default;
      const { ThemeProvider } = require('@emotion/react');
      const { lightTheme } = load('src/shared/theme/tokens.ts');
      const invoiceRoot = createRoot(document.getElementById('root'));
      let printed = '';
      window.open = () => ({ document: { write: (html) => { printed += html; }, close() {} }, focus() {}, print() {} });
      await act(async () => invoiceRoot.render(React.createElement(ThemeProvider, { theme: lightTheme }, React.createElement(Invoice, { sale: realSale, open: true, onClose() {} }))));
      const rows = [...document.querySelectorAll('tr.ant-table-row')];
      assert.ok(rows.length >= 2);
      assert.ok(rows.slice(0, 2).every((row) => row.textContent.includes('₹900.00')));
      assert.match(document.body.textContent, /₹1,800\.00/);
      const printButton = [...document.querySelectorAll('button')].find((button) => /Print/.test(button.textContent));
      await act(async () => printButton.click());
      assert.match(printed, /₹1,800\.00/);
      assert.equal((printed.match(/text-align:right">₹900.00/g) ?? []).length, 2);
      assert.ok(!printed.includes('NaN'));
      await act(async () => invoiceRoot.unmount());
    });
    await check('DATABASE percentage/fixed/zero prices and taxes survive return processing', async () => {
      for (const [mode, value, options, expected] of [
        ['PERCENTAGE', 20, {}, 800], ['FLAT', 150, {}, 850], ['PRICE', 0, {}, 0],
        ['PRICE', 900, { taxRate: 18 }, 1062], ['PRICE', 900, { taxRate: 18, taxMode: 'INCLUSIVE' }, 900],
      ]) {
        const sale = await createSale(saleInput([inputItem(a, value, mode)], options));
        const returned = await returnSale(sale, 0);
        assert.equal(returned.refundAmount, expected);
        assert.equal(returned.returnedItems[0].total, expected);
      }
    });
    await check('DATABASE item plus bill discount and exchange use stored credit', async () => {
      const sale = await createSale(saleInput([inputItem(a), inputItem(b)], { discountType: 'FLAT', discountAmount: 100 }));
      assert.deepEqual(sale.items.map((item) => item.netLineAmount), [850, 850]);
      const exchanged = await returnSale(sale, 1, 1, { type: 'EXCHANGE', exchangedItems: [{ productId: a.id, sizeId: sizes[1].id, quantity: 1, total: 1000 }] });
      assert.equal(exchanged.returnedItems[0].total, 850);
      assert.equal(exchanged.netAmount, 150);
      const direct = await createSale(saleInput([inputItem(a), inputItem(b)]));
      const replacement = await returnSale(direct, 1, 1, { type: 'EXCHANGE', exchangedItems: [{ productId: a.id, sizeId: sizes[1].id, quantity: 1, total: 1000 }] });
      assert.equal(replacement.netAmount, 100);
      assert.equal(replacement.returnedItems[0].total, 900);
    });
    await check('DATABASE partial quantities conserve line paise and retain return history', async () => {
      const sale = await createSale(saleInput([inputItem(a, 1, 'PRICE', 3)], { discountType: 'FLAT', discountAmount: 0.01 }));
      assert.equal(sale.calculatedTotal, 2.99);
      assert.equal(sale.roundOffAmount, 0.01);
      const amounts = [];
      for (let i = 0; i < 3; i++) amounts.push((await returnSale(sale, 0)).returnedItems[0].total);
      assert.deepEqual(amounts, [1, 0.99, 1]);
      const history = await billingService.getSaleById(org.id, sale.id);
      assert.deepEqual(history.returnTransactions.map((r) => r.returnedItems[0].total).sort(), [0.99, 1, 1]);
    });
    await check('DATABASE historical rows use stored financial fallback after catalogue changes', async () => {
      const sale = await createSale(saleInput([inputItem(a, 1000)], { discountType: 'FLAT', discountAmount: 100 }));
      await prisma.saleItem.updateMany({ where: { saleId: sale.id }, data: {
        originalUnitPrice: null, itemDiscountType: null, itemDiscountValue: null, netLineAmount: null,
        pricingSnapshotDate: null, finalUnitPrice: 0, finalLineAmount: 0, effectiveUnitPrice: 0,
      } });
      const legacy = await billingService.getSaleById(org.id, sale.id);
      assert.equal(legacy.items[0].finalLineAmount, 900);
      assert.equal((await returnSale(legacy, 0)).refundAmount, 900);
    });
    await check('DATABASE malformed payload and tenant boundaries; stock rollback is atomic', async () => {
      const before = await prisma.sale.count({ where: { storeId: store.id } });
      for (const item of [{ ...inputItem(a), unitPrice: -1 }, inputItem(a, 101, 'PERCENTAGE'), inputItem(a, 900, 'PRICE', 100000), { ...inputItem(a), quantity: '2' }]) await assert.rejects(() => createSale(saleInput([item])));
      const foreign = await prisma.organization.create({ data: { name: 'Foreign', slug: `foreign-${token}` } });
      await assert.rejects(() => billingService.createSale(foreign.id, store.id, user.id, saleInput([inputItem(a)])), /Invalid store/);
      assert.equal(await billingService.getSaleById(foreign.id, realSale.id), null);
      assert.equal(await prisma.sale.count({ where: { storeId: store.id } }), before);
    });
    await check('DATABASE exact size stock, AND filters, store isolation and paginated count', async () => {
      const shirt = await product('Oxford Shirt A', 1000, [5, 0, 3]);
      const positive = await product('Oxford available', 1000, [0, 5, 0]);
      await product('Oxford negative', 1000, [5, -1, 3]);
      await product('Oxford historical', 1000, [5]);
      await prisma.stockEntry.create({ data: { productId: shirt.id, sizeId: sizes[1].id, storeId: otherStore.id, quantity: 10 } });
      const filters = { storeId: store.id, categoryId: category.id, brandId: brand.id, search: 'Oxford', sizeId: sizes[1].id, page: 1, pageSize: 1 };
      const result = await productService.listPaginatedWithAttributes(org.id, filters);
      assert.equal(result.total, 1);
      assert.equal(result.items[0].id, positive.id);
      assert.equal((await productService.listPaginatedWithAttributes(org.id, { ...filters, page: 2 })).items.length, 0);
      assert.equal((await productService.listPaginatedWithAttributes(org.id, { ...filters, search: 'Oxford Shirt A' })).total, 0);
      assert.equal((await productService.listPaginatedWithAttributes(org.id, { ...filters, search: 'Oxford Shirt A', sizeId: sizes[2].id })).total, 1);
      assert.equal((await productService.listPaginatedWithAttributes(org.id, { ...filters, brandId: 'missing' })).total, 0);
      assert.equal((await productService.listPaginatedWithAttributes(org.id, { ...filters, categoryId: 'missing' })).total, 0);
      assert.equal((await productService.listPaginatedWithAttributes('foreign', filters)).total, 0);
      assert.equal((await productService.listPaginatedWithAttributes(org.id, { ...filters, storeId: otherStore.id })).items[0].id, shirt.id);
    });
  } finally { await prisma.$disconnect(); }
}
console.log(`\n${passed} regression groups passed.`);
dom.window.close();
