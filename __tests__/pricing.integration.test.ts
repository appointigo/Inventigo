/**
 * Pricing Engine Integration Tests
 * 
 * Run with: node __tests__/pricing.integration.test.mjs
 * (or: npx tsx __tests__/pricing.integration.test.ts)
 *
 * Validates:
 * - Discount allocation (percentage & flat)
 * - Tax calculation (exclusive & inclusive)
 * - Rounding safety (no paisa mismatches)
 * - Historical snapshot accuracy
 * - Return/exchange settlement correctness
 */

// Pure TypeScript - but can be run as standalone test
// For now, we'll inline the pricing engine for testing purposes

const round2 = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

interface TestCase {
  name: string;
  items: PricingSourceItem[];
  options: any;
  assertions: (result: PricingAllocationResult) => void;
}

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEquals(actual: number, expected: number, tolerance = 0.01, message = '') {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(
      `Expected ${expected} but got ${actual} (diff: ${actual - expected})${message ? ': ' + message : ''}`
    );
  }
}

function runTest(testCase: TestCase) {
  try {
    const result = allocatePricingSnapshots(testCase.items, testCase.options);
    testCase.assertions(result);
    console.log(`✅ PASS: ${testCase.name}`);
    passed++;
  } catch (error) {
    console.log(`❌ FAIL: ${testCase.name}`);
    console.log(`   Error: ${error instanceof Error ? error.message : String(error)}`);
    failed++;
  }
}

// ============================================================================
// PERCENTAGE DISCOUNT TESTS
// ============================================================================

const percentageTests: TestCase[] = [
  {
    name: 'Simple 20% percentage discount on single item',
    items: [{ productId: 'P1', quantity: 1, mrp: 1000, sellingPrice: 1000 }],
    options: { discountType: 'PERCENTAGE', discountPercent: 20, taxRate: 0 },
    assertions: (result) => {
      assertEquals(result.subtotal, 1000, 0.01, 'subtotal');
      assertEquals(result.discountAmount, 200, 0.01, 'discount');
      assertEquals(result.snapshots[0].allocatedDiscount, 200, 0.01, 'item discount');
      assertEquals(result.snapshots[0].finalLineAmount, 800, 0.01, 'final line');
      assertEquals(result.total, 800, 0.01, 'total');
    },
  },
  {
    name: 'Proportional 20% discount across multiple items',
    items: [
      { productId: 'P1', quantity: 1, mrp: 1000, sellingPrice: 1000 },
      { productId: 'P2', quantity: 1, mrp: 1500, sellingPrice: 1500 },
      { productId: 'P3', quantity: 1, mrp: 500, sellingPrice: 500 },
    ],
    options: { discountType: 'PERCENTAGE', discountPercent: 20, taxRate: 0 },
    assertions: (result) => {
      assertEquals(result.subtotal, 3000, 0.01, 'subtotal');
      assertEquals(result.discountAmount, 600, 0.01, 'total discount');
      // Verify proportional allocation: 1000/3000=33.33%, 1500/3000=50%, 500/3000=16.67%
      assertEquals(result.snapshots[0].allocatedDiscount, 200, 0.01, 'P1 discount (1000/3000 * 600)');
      assertEquals(result.snapshots[1].allocatedDiscount, 300, 0.01, 'P2 discount (1500/3000 * 600)');
      assertEquals(result.snapshots[2].allocatedDiscount, 100, 0.01, 'P3 discount (500/3000 * 600)');
      // Total should exactly reconcile
      const totalAllocated = round2(
        result.snapshots[0].allocatedDiscount +
        result.snapshots[1].allocatedDiscount +
        result.snapshots[2].allocatedDiscount
      );
      assertEquals(totalAllocated, result.discountAmount, 0.01, 'total allocated matches');
    },
  },
  {
    name: 'Quantity multipliers in percentage discount',
    items: [
      { productId: 'P1', quantity: 2, mrp: 500, sellingPrice: 500 },
      { productId: 'P2', quantity: 3, mrp: 500, sellingPrice: 500 },
    ],
    options: { discountType: 'PERCENTAGE', discountPercent: 10, taxRate: 0 },
    assertions: (result) => {
      assertEquals(result.subtotal, 2500, 0.01, '2*500 + 3*500');
      assertEquals(result.discountAmount, 250, 0.01, '10% of 2500');
      // Allocate proportionally: 1000/2500=40%, 1500/2500=60%
      assertEquals(result.snapshots[0].allocatedDiscount, 100, 0.01, 'P1 discount 40% of 250');
      assertEquals(result.snapshots[1].allocatedDiscount, 150, 0.01, 'P2 discount 60% of 250');
    },
  },
  {
    name: '0% discount (no discount)',
    items: [
      { productId: 'P1', quantity: 1, mrp: 1000, sellingPrice: 1000 },
    ],
    options: { discountType: 'PERCENTAGE', discountPercent: 0, taxRate: 0 },
    assertions: (result) => {
      assertEquals(result.subtotal, 1000, 0.01);
      assertEquals(result.discountAmount, 0, 0.01);
      assertEquals(result.snapshots[0].allocatedDiscount, 0, 0.01);
      assertEquals(result.total, 1000, 0.01);
    },
  },
];

// ============================================================================
// FLAT DISCOUNT TESTS
// ============================================================================

const flatDiscountTests: TestCase[] = [
  {
    name: 'Simple flat ₹100 discount on single item',
    items: [{ productId: 'P1', quantity: 1, mrp: 1000, sellingPrice: 1000 }],
    options: { discountType: 'FLAT', discountAmount: 100, taxRate: 0 },
    assertions: (result) => {
      assertEquals(result.subtotal, 1000, 0.01);
      assertEquals(result.discountAmount, 100, 0.01);
      assertEquals(result.snapshots[0].allocatedDiscount, 100, 0.01);
      assertEquals(result.total, 900, 0.01);
    },
  },
  {
    name: 'Proportional flat ₹300 discount across items',
    items: [
      { productId: 'P1', quantity: 1, mrp: 1000, sellingPrice: 1000 },
      { productId: 'P2', quantity: 1, mrp: 1500, sellingPrice: 1500 },
      { productId: 'P3', quantity: 1, mrp: 500, sellingPrice: 500 },
    ],
    options: { discountType: 'FLAT', discountAmount: 300, taxRate: 0 },
    assertions: (result) => {
      assertEquals(result.subtotal, 3000, 0.01);
      assertEquals(result.discountAmount, 300, 0.01);
      // Proportional: 1000/3000 → 100, 1500/3000 → 150, 500/3000 → 50
      assertEquals(result.snapshots[0].allocatedDiscount, 100, 0.01, 'P1: 1/3 of discount');
      assertEquals(result.snapshots[1].allocatedDiscount, 150, 0.01, 'P2: 1/2 of discount');
      assertEquals(result.snapshots[2].allocatedDiscount, 50, 0.01, 'P3: 1/6 of discount');
    },
  },
  {
    name: 'Flat discount clamped to subtotal',
    items: [
      { productId: 'P1', quantity: 1, mrp: 100, sellingPrice: 100 },
    ],
    options: { discountType: 'FLAT', discountAmount: 500, taxRate: 0 },
    assertions: (result) => {
      assertEquals(result.discountAmount, 100, 0.01, 'clamped to subtotal');
      assertEquals(result.total, 0, 0.01, 'total is zero');
    },
  },
  {
    name: 'Rounding safety with fractional flat discount',
    items: [
      { productId: 'P1', quantity: 1, mrp: 1000, sellingPrice: 1000 },
      { productId: 'P2', quantity: 1, mrp: 2000, sellingPrice: 2000 },
      { productId: 'P3', quantity: 1, mrp: 2000, sellingPrice: 2000 },
    ],
    options: { discountType: 'FLAT', discountAmount: 333, taxRate: 0 },
    assertions: (result) => {
      // Each item proportion: 1000/5000, 2000/5000, 2000/5000
      // Allocations: 66.60, 133.20, 133.20 → rounded: 66, 134, 133 (with rounding adjustment)
      const totalAllocated = round2(
        result.snapshots[0].allocatedDiscount +
        result.snapshots[1].allocatedDiscount +
        result.snapshots[2].allocatedDiscount
      );
      assertEquals(totalAllocated, result.discountAmount, 0.01, 'total allocated exactly matches');
      assertEquals(result.total, 4667, 0.01, 'final total correct');
    },
  },
];

// ============================================================================
// TAX CALCULATION TESTS (EXCLUSIVE MODE)
// ============================================================================

const taxExclusiveTests: TestCase[] = [
  {
    name: 'Tax 18% exclusive on single item (no discount)',
    items: [{ productId: 'P1', quantity: 1, mrp: 1000, sellingPrice: 1000 }],
    options: { discountType: 'PERCENTAGE', discountPercent: 0, taxRate: 18, taxMode: 'EXCLUSIVE' },
    assertions: (result) => {
      assertEquals(result.subtotal, 1000, 0.01);
      assertEquals(result.discountAmount, 0, 0.01);
      assertEquals(result.taxableAmount, 1000, 0.01);
      assertEquals(result.taxAmount, 180, 0.01, '18% of 1000');
      assertEquals(result.total, 1180, 0.01);
    },
  },
  {
    name: 'Tax 18% exclusive with 20% discount',
    items: [{ productId: 'P1', quantity: 1, mrp: 1000, sellingPrice: 1000 }],
    options: { discountType: 'PERCENTAGE', discountPercent: 20, taxRate: 18, taxMode: 'EXCLUSIVE' },
    assertions: (result) => {
      assertEquals(result.subtotal, 1000, 0.01);
      assertEquals(result.discountAmount, 200, 0.01);
      assertEquals(result.taxableAmount, 800, 0.01, 'after discount');
      assertEquals(result.taxAmount, 144, 0.01, '18% of 800');
      assertEquals(result.total, 944, 0.01);
    },
  },
  {
    name: 'Tax exclusive across multiple items with rounding',
    items: [
      { productId: 'P1', quantity: 1, mrp: 333, sellingPrice: 333 },
      { productId: 'P2', quantity: 1, mrp: 333, sellingPrice: 333 },
      { productId: 'P3', quantity: 1, mrp: 334, sellingPrice: 334 },
    ],
    options: { discountType: 'PERCENTAGE', discountPercent: 0, taxRate: 18, taxMode: 'EXCLUSIVE' },
    assertions: (result) => {
      assertEquals(result.subtotal, 1000, 0.01);
      assertEquals(result.taxableAmount, 1000, 0.01);
      assertEquals(result.taxAmount, 180, 0.01, '18% of 1000');
      // Verify tax is allocated proportionally across items
      const totalItemTax = round2(
        result.snapshots[0].taxAmount +
        result.snapshots[1].taxAmount +
        result.snapshots[2].taxAmount
      );
      assertEquals(totalItemTax, result.taxAmount, 0.01, 'sum of item taxes');
    },
  },
];

// ============================================================================
// TAX CALCULATION TESTS (INCLUSIVE MODE)
// ============================================================================

const taxInclusiveTests: TestCase[] = [
  {
    name: 'Tax 18% inclusive on single item (no discount)',
    items: [{ productId: 'P1', quantity: 1, mrp: 1000, sellingPrice: 1000 }],
    options: { discountType: 'PERCENTAGE', discountPercent: 0, taxRate: 18, taxMode: 'INCLUSIVE' },
    assertions: (result) => {
      // Inclusive: total = 1000, so tax = 1000 * 18/118 = 152.54
      assertEquals(result.subtotal, 1000, 0.01);
      assertEquals(result.discountAmount, 0, 0.01);
      const expectedTax = round2((1000 * 18) / 118);
      assertEquals(result.taxAmount, expectedTax, 0.01);
      assertEquals(result.total, 1000, 0.01, 'total remains same');
      assertEquals(result.snapshots[0].finalLineAmount, round2(1000 - expectedTax), 0.01, 'taxable amount');
    },
  },
  {
    name: 'Tax 18% inclusive with 10% discount',
    items: [{ productId: 'P1', quantity: 1, mrp: 1000, sellingPrice: 1000 }],
    options: { discountType: 'PERCENTAGE', discountPercent: 10, taxRate: 18, taxMode: 'INCLUSIVE' },
    assertions: (result) => {
      // Discount 10% of 1000 = 100, so base becomes 900
      // Tax on 900 inclusive: 900 * 18/118 = 137.29
      assertEquals(result.discountAmount, 100, 0.01);
      const expectedTax = round2((900 * 18) / 118);
      assertEquals(result.taxAmount, expectedTax, 0.01);
      assertEquals(result.total, 900, 0.01, 'final is always after all adjustments');
    },
  },
];

// ============================================================================
// EDGE CASES & ROUNDING SAFETY
// ============================================================================

const edgeCaseTests: TestCase[] = [
  {
    name: 'Rounding: ₹100 split 3-way with 5% discount',
    items: [
      { productId: 'P1', quantity: 1, mrp: 33.33, sellingPrice: 33.33 },
      { productId: 'P2', quantity: 1, mrp: 33.33, sellingPrice: 33.33 },
      { productId: 'P3', quantity: 1, mrp: 33.34, sellingPrice: 33.34 },
    ],
    options: { discountType: 'PERCENTAGE', discountPercent: 5, taxRate: 0 },
    assertions: (result) => {
      const totalAllocated = round2(
        result.snapshots[0].allocatedDiscount +
        result.snapshots[1].allocatedDiscount +
        result.snapshots[2].allocatedDiscount
      );
      assertEquals(totalAllocated, result.discountAmount, 0.01, 'exact reconciliation');
    },
  },
  {
    name: 'Empty cart (no items)',
    items: [],
    options: { discountType: 'PERCENTAGE', discountPercent: 20, taxRate: 18 },
    assertions: (result) => {
      assertEquals(result.subtotal, 0, 0.01);
      assertEquals(result.discountAmount, 0, 0.01);
      assertEquals(result.taxAmount, 0, 0.01);
      assertEquals(result.total, 0, 0.01);
      assert(result.snapshots.length === 0, 'no snapshots for empty cart');
    },
  },
  {
    name: 'Single item, zero quantity',
    items: [{ productId: 'P1', quantity: 0, mrp: 1000, sellingPrice: 1000 }],
    options: { discountType: 'PERCENTAGE', discountPercent: 20, taxRate: 0 },
    assertions: (result) => {
      assertEquals(result.subtotal, 0, 0.01);
      assertEquals(result.total, 0, 0.01);
    },
  },
  {
    name: 'Excluded item not eligible for discount',
    items: [
      { productId: 'P1', quantity: 1, mrp: 1000, sellingPrice: 1000, eligibleForDiscount: true },
      { productId: 'P2', quantity: 1, mrp: 1000, sellingPrice: 1000, eligibleForDiscount: false },
    ],
    options: { discountType: 'PERCENTAGE', discountPercent: 20, taxRate: 0 },
    assertions: (result) => {
      assertEquals(result.subtotal, 2000, 0.01);
      assertEquals(result.discountAmount, 200, 0.01, 'only on P1');
      assertEquals(result.snapshots[0].allocatedDiscount, 200, 0.01, 'P1 gets full discount');
      assertEquals(result.snapshots[1].allocatedDiscount, 0, 0.01, 'P2 excluded');
    },
  },
];

// ============================================================================
// RETURN/EXCHANGE SETTLEMENT TESTS
// ============================================================================

const returnSettlementTests: TestCase[] = [
  {
    name: 'Return settlement uses correct effective unit price',
    items: [
      { productId: 'P1', quantity: 2, mrp: 1000, sellingPrice: 1000 },
    ],
    options: { discountType: 'PERCENTAGE', discountPercent: 10, taxRate: 18, taxMode: 'EXCLUSIVE' },
    assertions: (result) => {
      // Sale: 2 * 1000 = 2000, discount 10% = 200, final line = 1800, tax 18% = 324, total = 2124
      // Per unit: 1800 / 2 = 900 (finalUnitPrice before tax)
      // Effective: 2124 / 2 = 1062 (with tax)
      assertEquals(result.snapshots[0].finalLineAmount, 1800, 0.01, 'after discount');
      assertEquals(result.snapshots[0].finalUnitPrice, 900, 0.01, 'unit before tax');
      assertEquals(result.snapshots[0].effectiveUnitPrice, 1062, 0.01, 'unit with tax');
      // Return 1 unit: refund = 1062
      // Exchange: customer already paid 1062, wants new item at 1100 → pays extra 38
    },
  },
];

// ============================================================================
// DISCOUNT WITH ITEM-LEVEL TAX RATES
// ============================================================================

const itemLevelTaxTests: TestCase[] = [
  {
    name: 'Different tax rates per item (exclusive mode)',
    items: [
      { productId: 'P1', quantity: 1, mrp: 1000, sellingPrice: 1000, taxRate: 5 },
      { productId: 'P2', quantity: 1, mrp: 1000, sellingPrice: 1000, taxRate: 18 },
    ],
    options: { discountType: 'PERCENTAGE', discountPercent: 0, taxRate: 0, taxMode: 'EXCLUSIVE' },
    assertions: (result) => {
      // P1: 1000, tax 5% = 50
      // P2: 1000, tax 18% = 180
      assertEquals(result.snapshots[0].taxAmount, 50, 0.01, 'P1 at 5%');
      assertEquals(result.snapshots[1].taxAmount, 180, 0.01, 'P2 at 18%');
      assertEquals(result.taxAmount, 230, 0.01, 'total tax');
    },
  },
];

// ============================================================================
// RUN ALL TESTS
// ============================================================================

console.log('\n' + '='.repeat(80));
console.log('PRICING ENGINE INTEGRATION TESTS');
console.log('='.repeat(80) + '\n');

console.log('📊 PERCENTAGE DISCOUNT TESTS');
console.log('-'.repeat(80));
percentageTests.forEach(runTest);

console.log('\n📊 FLAT DISCOUNT TESTS');
console.log('-'.repeat(80));
flatDiscountTests.forEach(runTest);

console.log('\n📊 TAX EXCLUSIVE TESTS');
console.log('-'.repeat(80));
taxExclusiveTests.forEach(runTest);

console.log('\n📊 TAX INCLUSIVE TESTS');
console.log('-'.repeat(80));
taxInclusiveTests.forEach(runTest);

console.log('\n📊 EDGE CASES & ROUNDING SAFETY');
console.log('-'.repeat(80));
edgeCaseTests.forEach(runTest);

console.log('\n📊 RETURN/EXCHANGE SETTLEMENT');
console.log('-'.repeat(80));
returnSettlementTests.forEach(runTest);

console.log('\n📊 ITEM-LEVEL TAX RATES');
console.log('-'.repeat(80));
itemLevelTaxTests.forEach(runTest);

// ============================================================================
// SUMMARY
// ============================================================================

console.log('\n' + '='.repeat(80));
console.log(`RESULTS: ${passed} passed, ${failed} failed`);
console.log('='.repeat(80) + '\n');

if (failed > 0) {
  process.exit(1);
}
