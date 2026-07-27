#!/usr/bin/env node
/**
 * Pricing Engine Integration Tests (Standalone)
 * 
 * Run with: node __tests__/pricing.standalone.test.js
 *
 * This test file includes a copy of the pricing engine logic
 * to verify calculations independently without build/compile setup.
 */

const round2 = (value) => Math.round((value + Number.EPSILON) * 100) / 100;
const clamp0 = (value) => (Number.isFinite(value) && value > 0 ? value : 0);

const allocateRoundedShares = (total, bases) => {
  const roundedTotal = round2(total);
  const totalBase = bases.reduce((sum, base) => sum + clamp0(base), 0);

  if (roundedTotal <= 0 || totalBase <= 0) {
    return bases.map(() => 0);
  }

  let allocated = 0;
  return bases.map((base, index) => {
    if (index === bases.length - 1) {
      return round2(roundedTotal - allocated);
    }

    const share = round2((roundedTotal * clamp0(base)) / totalBase);
    allocated = round2(allocated + share);
    return share;
  });
};

function allocatePricingSnapshots(items, options = {}) {
  const pricingSnapshotDate = options.pricingSnapshotDate ?? new Date();
  const discountType = options.discountType ?? "PERCENTAGE";
  const discountPercent = clamp0(Number(options.discountPercent ?? 0));
  const totalDiscountInput = clamp0(Number(options.discountAmount ?? 0));
  const taxRate = clamp0(Number(options.taxRate ?? 0));
  const taxMode = options.taxMode ?? "EXCLUSIVE";

  const normalizedItems = items.map((item) => {
    const quantity = Math.max(0, Number(item.quantity ?? 0));
    const mrp = round2(Number(item.mrp ?? item.sellingPrice ?? 0));
    const sellingPrice = round2(Number(item.sellingPrice ?? 0));
    const baseLineAmount = round2(sellingPrice * quantity);

    return {
      ...item,
      quantity,
      mrp,
      sellingPrice,
      baseLineAmount,
      eligibleForDiscount: item.eligibleForDiscount !== false,
      taxRate: clamp0(Number(item.taxRate ?? taxRate)),
      costPrice: item.costPrice != null ? round2(Number(item.costPrice)) : undefined,
    };
  });

  const subtotal = round2(normalizedItems.reduce((sum, item) => sum + item.baseLineAmount, 0));
  const eligibleBases = normalizedItems.map((item) => (item.eligibleForDiscount ? item.baseLineAmount : 0));
  const eligibleSubtotal = round2(eligibleBases.reduce((sum, value) => sum + value, 0));

  const targetDiscountAmount = discountType === "PERCENTAGE"
    ? round2((eligibleSubtotal * discountPercent) / 100)
    : round2(Math.min(totalDiscountInput, eligibleSubtotal));

  const allocatedDiscounts = allocateRoundedShares(targetDiscountAmount, eligibleBases);

  const discountedLines = normalizedItems.map((item, index) => {
    const allocatedDiscount = round2(allocatedDiscounts[index] ?? 0);
    const discountedLineAmount = round2(Math.max(0, item.baseLineAmount - allocatedDiscount));
    return {
      ...item,
      allocatedDiscount,
      discountedLineAmount,
    };
  });

  const taxableBaseTotal = round2(discountedLines.reduce((sum, item) => sum + item.discountedLineAmount, 0));
  const totalTaxAmount = taxRate > 0
    ? taxMode === "INCLUSIVE"
      ? round2((taxableBaseTotal * taxRate) / (100 + taxRate))
      : round2((taxableBaseTotal * taxRate) / 100)
    : 0;

  const taxBases = discountedLines.map((item) => item.discountedLineAmount);
  const taxShares = taxRate > 0 ? allocateRoundedShares(totalTaxAmount, taxBases) : discountedLines.map(() => 0);

  const snapshots = discountedLines.map((item, index) => {
    const allocatedTax = round2(taxShares[index] ?? 0);
    const taxableAmount = taxMode === "INCLUSIVE"
      ? round2(Math.max(0, item.discountedLineAmount - allocatedTax))
      : round2(item.discountedLineAmount);
    const lineNetAmount = round2(item.discountedLineAmount);
    const finalUnitPrice = item.quantity > 0 ? round2(taxableAmount / item.quantity) : 0;
    const effectiveUnitPrice = item.quantity > 0
      ? round2((lineNetAmount + allocatedTax) / item.quantity)
      : 0;

    return {
      productId: item.productId,
      quantity: item.quantity,
      mrp: item.mrp,
      sellingPrice: item.sellingPrice,
      discountType,
      appliedDiscountPercent: item.baseLineAmount > 0 ? round2((item.allocatedDiscount / item.baseLineAmount) * 100) : 0,
      allocatedDiscount: item.allocatedDiscount,
      taxableAmount,
      taxAmount: allocatedTax,
      finalUnitPrice,
      finalLineAmount: lineNetAmount,
      effectiveUnitPrice,
      pricingSnapshotDate,
      costPrice: item.costPrice,
      eligibleForDiscount: item.eligibleForDiscount,
    };
  });

  // In inclusive mode, total = taxableBaseTotal (tax already included)
  // In exclusive mode, total = taxableBaseTotal + tax (tax added on top)
  const finalTotal = taxMode === "INCLUSIVE"
    ? round2(taxableBaseTotal)
    : round2(taxableBaseTotal + totalTaxAmount);

  return {
    snapshots,
    subtotal,
    discountAmount: targetDiscountAmount,
    taxableAmount: taxableBaseTotal,
    taxAmount: totalTaxAmount,
    total: finalTotal,
  };
}

// ============================================================================
// TEST FRAMEWORK
// ============================================================================

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEquals(actual, expected, tolerance = 0.01, message = '') {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(
      `Expected ${expected} but got ${actual} (diff: ${actual - expected})${message ? ': ' + message : ''}`
    );
  }
}

function runTest(name, testFn) {
  try {
    testFn();
    console.log(`✅ PASS: ${name}`);
    passed++;
  } catch (error) {
    console.log(`❌ FAIL: ${name}`);
    console.log(`   Error: ${error.message}`);
    failed++;
  }
}

// ============================================================================
// TEST CASES
// ============================================================================

console.log('\n' + '='.repeat(80));
console.log('PRICING ENGINE INTEGRATION TESTS (STANDALONE)');
console.log('='.repeat(80) + '\n');

// Percentage Discounts
console.log('📊 PERCENTAGE DISCOUNT TESTS');
console.log('-'.repeat(80));

runTest('Simple 20% percentage discount on single item', () => {
  const result = allocatePricingSnapshots(
    [{ productId: 'P1', quantity: 1, mrp: 1000, sellingPrice: 1000 }],
    { discountType: 'PERCENTAGE', discountPercent: 20, taxRate: 0 }
  );
  assertEquals(result.subtotal, 1000, 0.01, 'subtotal');
  assertEquals(result.discountAmount, 200, 0.01, 'discount');
  assertEquals(result.snapshots[0].allocatedDiscount, 200, 0.01, 'item discount');
  assertEquals(result.snapshots[0].finalLineAmount, 800, 0.01, 'final line');
  assertEquals(result.total, 800, 0.01, 'total');
});

runTest('Proportional 20% discount across multiple items', () => {
  const result = allocatePricingSnapshots(
    [
      { productId: 'P1', quantity: 1, mrp: 1000, sellingPrice: 1000 },
      { productId: 'P2', quantity: 1, mrp: 1500, sellingPrice: 1500 },
      { productId: 'P3', quantity: 1, mrp: 500, sellingPrice: 500 },
    ],
    { discountType: 'PERCENTAGE', discountPercent: 20, taxRate: 0 }
  );
  assertEquals(result.subtotal, 3000, 0.01, 'subtotal');
  assertEquals(result.discountAmount, 600, 0.01, 'total discount');
  assertEquals(result.snapshots[0].allocatedDiscount, 200, 0.01, 'P1 discount');
  assertEquals(result.snapshots[1].allocatedDiscount, 300, 0.01, 'P2 discount');
  assertEquals(result.snapshots[2].allocatedDiscount, 100, 0.01, 'P3 discount');
  const totalAllocated = round2(
    result.snapshots[0].allocatedDiscount +
    result.snapshots[1].allocatedDiscount +
    result.snapshots[2].allocatedDiscount
  );
  assertEquals(totalAllocated, result.discountAmount, 0.01, 'total allocated matches');
});

runTest('Quantity multipliers in percentage discount', () => {
  const result = allocatePricingSnapshots(
    [
      { productId: 'P1', quantity: 2, mrp: 500, sellingPrice: 500 },
      { productId: 'P2', quantity: 3, mrp: 500, sellingPrice: 500 },
    ],
    { discountType: 'PERCENTAGE', discountPercent: 10, taxRate: 0 }
  );
  assertEquals(result.subtotal, 2500, 0.01, '2*500 + 3*500');
  assertEquals(result.discountAmount, 250, 0.01, '10% of 2500');
  assertEquals(result.snapshots[0].allocatedDiscount, 100, 0.01, 'P1 discount 40%');
  assertEquals(result.snapshots[1].allocatedDiscount, 150, 0.01, 'P2 discount 60%');
});

runTest('0% discount (no discount)', () => {
  const result = allocatePricingSnapshots(
    [{ productId: 'P1', quantity: 1, mrp: 1000, sellingPrice: 1000 }],
    { discountType: 'PERCENTAGE', discountPercent: 0, taxRate: 0 }
  );
  assertEquals(result.subtotal, 1000, 0.01);
  assertEquals(result.discountAmount, 0, 0.01);
  assertEquals(result.snapshots[0].allocatedDiscount, 0, 0.01);
  assertEquals(result.total, 1000, 0.01);
});

// Flat Discounts
console.log('\n📊 FLAT DISCOUNT TESTS');
console.log('-'.repeat(80));

runTest('Simple flat ₹100 discount on single item', () => {
  const result = allocatePricingSnapshots(
    [{ productId: 'P1', quantity: 1, mrp: 1000, sellingPrice: 1000 }],
    { discountType: 'FLAT', discountAmount: 100, taxRate: 0 }
  );
  assertEquals(result.subtotal, 1000, 0.01);
  assertEquals(result.discountAmount, 100, 0.01);
  assertEquals(result.snapshots[0].allocatedDiscount, 100, 0.01);
  assertEquals(result.total, 900, 0.01);
});

runTest('Proportional flat ₹300 discount across items', () => {
  const result = allocatePricingSnapshots(
    [
      { productId: 'P1', quantity: 1, mrp: 1000, sellingPrice: 1000 },
      { productId: 'P2', quantity: 1, mrp: 1500, sellingPrice: 1500 },
      { productId: 'P3', quantity: 1, mrp: 500, sellingPrice: 500 },
    ],
    { discountType: 'FLAT', discountAmount: 300, taxRate: 0 }
  );
  assertEquals(result.subtotal, 3000, 0.01);
  assertEquals(result.discountAmount, 300, 0.01);
  assertEquals(result.snapshots[0].allocatedDiscount, 100, 0.01, 'P1: 1/3');
  assertEquals(result.snapshots[1].allocatedDiscount, 150, 0.01, 'P2: 1/2');
  assertEquals(result.snapshots[2].allocatedDiscount, 50, 0.01, 'P3: 1/6');
});

runTest('Flat discount clamped to subtotal', () => {
  const result = allocatePricingSnapshots(
    [{ productId: 'P1', quantity: 1, mrp: 100, sellingPrice: 100 }],
    { discountType: 'FLAT', discountAmount: 500, taxRate: 0 }
  );
  assertEquals(result.discountAmount, 100, 0.01, 'clamped to subtotal');
  assertEquals(result.total, 0, 0.01, 'total is zero');
});

runTest('Rounding safety with fractional flat discount', () => {
  const result = allocatePricingSnapshots(
    [
      { productId: 'P1', quantity: 1, mrp: 1000, sellingPrice: 1000 },
      { productId: 'P2', quantity: 1, mrp: 2000, sellingPrice: 2000 },
      { productId: 'P3', quantity: 1, mrp: 2000, sellingPrice: 2000 },
    ],
    { discountType: 'FLAT', discountAmount: 333, taxRate: 0 }
  );
  const totalAllocated = round2(
    result.snapshots[0].allocatedDiscount +
    result.snapshots[1].allocatedDiscount +
    result.snapshots[2].allocatedDiscount
  );
  assertEquals(totalAllocated, result.discountAmount, 0.01, 'total allocated exactly matches');
  assertEquals(result.total, 4667, 0.01, 'final total correct');
});

// Tax Exclusive
console.log('\n📊 TAX EXCLUSIVE TESTS');
console.log('-'.repeat(80));

runTest('Tax 18% exclusive on single item (no discount)', () => {
  const result = allocatePricingSnapshots(
    [{ productId: 'P1', quantity: 1, mrp: 1000, sellingPrice: 1000 }],
    { discountType: 'PERCENTAGE', discountPercent: 0, taxRate: 18, taxMode: 'EXCLUSIVE' }
  );
  assertEquals(result.subtotal, 1000, 0.01);
  assertEquals(result.discountAmount, 0, 0.01);
  assertEquals(result.taxableAmount, 1000, 0.01);
  assertEquals(result.taxAmount, 180, 0.01, '18% of 1000');
  assertEquals(result.total, 1180, 0.01);
});

runTest('Tax 18% exclusive with 20% discount', () => {
  const result = allocatePricingSnapshots(
    [{ productId: 'P1', quantity: 1, mrp: 1000, sellingPrice: 1000 }],
    { discountType: 'PERCENTAGE', discountPercent: 20, taxRate: 18, taxMode: 'EXCLUSIVE' }
  );
  assertEquals(result.subtotal, 1000, 0.01);
  assertEquals(result.discountAmount, 200, 0.01);
  assertEquals(result.taxableAmount, 800, 0.01, 'after discount');
  assertEquals(result.taxAmount, 144, 0.01, '18% of 800');
  assertEquals(result.total, 944, 0.01);
});

runTest('Tax exclusive across multiple items with rounding', () => {
  const result = allocatePricingSnapshots(
    [
      { productId: 'P1', quantity: 1, mrp: 333, sellingPrice: 333 },
      { productId: 'P2', quantity: 1, mrp: 333, sellingPrice: 333 },
      { productId: 'P3', quantity: 1, mrp: 334, sellingPrice: 334 },
    ],
    { discountType: 'PERCENTAGE', discountPercent: 0, taxRate: 18, taxMode: 'EXCLUSIVE' }
  );
  assertEquals(result.subtotal, 1000, 0.01);
  assertEquals(result.taxableAmount, 1000, 0.01);
  assertEquals(result.taxAmount, 180, 0.01, '18% of 1000');
  const totalItemTax = round2(
    result.snapshots[0].taxAmount +
    result.snapshots[1].taxAmount +
    result.snapshots[2].taxAmount
  );
  assertEquals(totalItemTax, result.taxAmount, 0.01, 'sum of item taxes');
});

// Tax Inclusive
console.log('\n📊 TAX INCLUSIVE TESTS');
console.log('-'.repeat(80));

runTest('Tax 18% inclusive on single item (no discount)', () => {
  const result = allocatePricingSnapshots(
    [{ productId: 'P1', quantity: 1, mrp: 1000, sellingPrice: 1000 }],
    { discountType: 'PERCENTAGE', discountPercent: 0, taxRate: 18, taxMode: 'INCLUSIVE' }
  );
  assertEquals(result.subtotal, 1000, 0.01);
  assertEquals(result.discountAmount, 0, 0.01);
  const expectedTax = round2((1000 * 18) / 118);
  assertEquals(result.taxAmount, expectedTax, 0.01);
  assertEquals(result.total, 1000, 0.01, 'total remains same (inclusive)');
  assertEquals(result.snapshots[0].taxableAmount, round2(1000 - expectedTax), 0.01, 'taxable amount net of tax');
});

runTest('Tax 18% inclusive with 10% discount', () => {
  const result = allocatePricingSnapshots(
    [{ productId: 'P1', quantity: 1, mrp: 1000, sellingPrice: 1000 }],
    { discountType: 'PERCENTAGE', discountPercent: 10, taxRate: 18, taxMode: 'INCLUSIVE' }
  );
  assertEquals(result.discountAmount, 100, 0.01);
  const expectedTax = round2((900 * 18) / 118);
  assertEquals(result.taxAmount, expectedTax, 0.01);
  assertEquals(result.total, 900, 0.01, 'final is after all adjustments');
});

// Edge Cases
console.log('\n📊 EDGE CASES & ROUNDING SAFETY');
console.log('-'.repeat(80));

runTest('Rounding: ₹100 split 3-way with 5% discount', () => {
  const result = allocatePricingSnapshots(
    [
      { productId: 'P1', quantity: 1, mrp: 33.33, sellingPrice: 33.33 },
      { productId: 'P2', quantity: 1, mrp: 33.33, sellingPrice: 33.33 },
      { productId: 'P3', quantity: 1, mrp: 33.34, sellingPrice: 33.34 },
    ],
    { discountType: 'PERCENTAGE', discountPercent: 5, taxRate: 0 }
  );
  const totalAllocated = round2(
    result.snapshots[0].allocatedDiscount +
    result.snapshots[1].allocatedDiscount +
    result.snapshots[2].allocatedDiscount
  );
  assertEquals(totalAllocated, result.discountAmount, 0.01, 'exact reconciliation');
});

runTest('Empty cart (no items)', () => {
  const result = allocatePricingSnapshots(
    [],
    { discountType: 'PERCENTAGE', discountPercent: 20, taxRate: 18 }
  );
  assertEquals(result.subtotal, 0, 0.01);
  assertEquals(result.discountAmount, 0, 0.01);
  assertEquals(result.taxAmount, 0, 0.01);
  assertEquals(result.total, 0, 0.01);
  assert(result.snapshots.length === 0, 'no snapshots for empty cart');
});

runTest('Single item, zero quantity', () => {
  const result = allocatePricingSnapshots(
    [{ productId: 'P1', quantity: 0, mrp: 1000, sellingPrice: 1000 }],
    { discountType: 'PERCENTAGE', discountPercent: 20, taxRate: 0 }
  );
  assertEquals(result.subtotal, 0, 0.01);
  assertEquals(result.total, 0, 0.01);
});

runTest('Excluded item not eligible for discount', () => {
  const result = allocatePricingSnapshots(
    [
      { productId: 'P1', quantity: 1, mrp: 1000, sellingPrice: 1000, eligibleForDiscount: true },
      { productId: 'P2', quantity: 1, mrp: 1000, sellingPrice: 1000, eligibleForDiscount: false },
    ],
    { discountType: 'PERCENTAGE', discountPercent: 20, taxRate: 0 }
  );
  assertEquals(result.subtotal, 2000, 0.01);
  assertEquals(result.discountAmount, 200, 0.01, 'only on P1');
  assertEquals(result.snapshots[0].allocatedDiscount, 200, 0.01, 'P1 gets full discount');
  assertEquals(result.snapshots[1].allocatedDiscount, 0, 0.01, 'P2 excluded');
});

// Return/Exchange
console.log('\n📊 RETURN/EXCHANGE SETTLEMENT');
console.log('-'.repeat(80));

runTest('Return settlement uses correct effective unit price', () => {
  const result = allocatePricingSnapshots(
    [{ productId: 'P1', quantity: 2, mrp: 1000, sellingPrice: 1000 }],
    { discountType: 'PERCENTAGE', discountPercent: 10, taxRate: 18, taxMode: 'EXCLUSIVE' }
  );
  assertEquals(result.snapshots[0].finalLineAmount, 1800, 0.01, 'after discount');
  assertEquals(result.snapshots[0].finalUnitPrice, 900, 0.01, 'unit before tax');
  assertEquals(result.snapshots[0].effectiveUnitPrice, 1062, 0.01, 'unit with tax');
});

// Summary
console.log('\n' + '='.repeat(80));
console.log(`RESULTS: ${passed} passed, ${failed} failed`);
console.log('='.repeat(80) + '\n');

if (failed > 0) {
  process.exit(1);
}
