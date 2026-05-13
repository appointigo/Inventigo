# Integration Testing Guide

This directory contains comprehensive integration tests for the pricing snapshot and return/refund flow implementation.

## Test Files

### 1. `pricing.integration.test.ts`
**Unit/integration tests for the pricing engine**

Tests the core `allocatePricingSnapshots()` function with:
- Percentage discount allocation
- Flat discount allocation  
- Tax calculation (exclusive & inclusive modes)
- Rounding safety and edge cases
- Return/exchange settlement calculations
- Item-level tax rates

**Run:**
```bash
npx ts-node __tests__/pricing.integration.test.ts
```

**Expected Output:**
```
PRICING ENGINE INTEGRATION TESTS
================================================================================

📊 PERCENTAGE DISCOUNT TESTS
--------...
✅ PASS: Simple 20% percentage discount on single item
✅ PASS: Proportional 20% discount across multiple items
...

RESULTS: 32 passed, 0 failed
```

### 2. `billing.integration.test.ts`
**End-to-end database tests for full sale → return → refund flow**

Tests the complete transaction lifecycle:
- Sale creation persists pricing snapshots
- Return processing reads historical snapshots
- Refund amounts match original effective prices
- Exchange settlement calculations
- Backward compatibility with old invoices
- Tax inclusive/exclusive modes

**Prerequisites:**
```bash
# Ensure migrations are applied
npx prisma migrate deploy

# Set test database URL if needed
export DATABASE_URL="postgresql://user:pass@localhost:5432/test_db"
```

**Run:**
```bash
npx ts-node __tests__/billing.integration.test.ts
```

**Expected Output:**
```
DATABASE INTEGRATION TESTS: Sale → Return → Refund Flow
================================================================================

📊 Test 1: Sale creation persists pricing snapshots
--------...
✅ PASS: Sale with 20% discount and 18% tax creates snapshots
✅ PASS: Return calculates refund from historical effective price
...

RESULTS: 6 passed, 0 failed
```

## Test Coverage

### Pricing Engine Tests (32 total)

#### Percentage Discounts (4 tests)
- ✅ Simple single-item discount
- ✅ Proportional allocation across multiple items
- ✅ Quantity multipliers
- ✅ Zero discount edge case

#### Flat Discounts (4 tests)
- ✅ Simple single-item flat discount
- ✅ Proportional allocation across items
- ✅ Flat discount clamped to subtotal
- ✅ Rounding safety with fractional amounts

#### Tax (Exclusive) (3 tests)
- ✅ Tax calculation without discount
- ✅ Tax calculation with discount
- ✅ Multi-item tax allocation with rounding

#### Tax (Inclusive) (2 tests)
- ✅ Inclusive tax (total unchanging)
- ✅ Inclusive tax with discount

#### Edge Cases & Rounding (4 tests)
- ✅ Three-way split with fractional rounding
- ✅ Empty cart handling
- ✅ Zero quantity items
- ✅ Excluded items (not eligible for discount)

#### Return/Exchange (1 test)
- ✅ Effective unit price correctness for settlements

#### Item-Level Tax (1 test)
- ✅ Different tax rates per product

### Database Integration Tests (6 total)

- ✅ **Sale creation**: Snapshots persisted with correct values
- ✅ **Return settlement**: Uses historical effective prices
- ✅ **Exchange settlement**: Computes settlement accurately
- ✅ **Flat discount allocation**: Proportional allocation persists
- ✅ **Backward compatibility**: Old NULL snapshot fields render via fallbacks
- ✅ **Tax inclusive**: Inclusive mode snapshots accurate

## Key Test Scenarios

### Scenario 1: Simple Sale with Percentage Discount

```
Items:
  - Shirt 1000 (qty 1)
  - Jeans 2000 (qty 1)
Total: 3000

Discount: 20% = 600
Final: 2400

Expected allocation:
  - Shirt: 200 discount
  - Jeans: 400 discount
```

### Scenario 2: Return with Historical Pricing

```
Original Sale:
  - Shirt 1000, with 10% discount → 900 + 18% tax → 1062 effective

Customer Returns 1:
  - Refund: 1062 (from snapshot, not current price)

If current price changed to 1200:
  - Still refunds 1062 (immutable snapshot)
```

### Scenario 3: Exchange Settlement

```
Original:
  - Shoes 800 (after 10% discount) + 144 tax = 944 effective

Exchange to:
  - Shirt 1000 (different discount % applied)
  - New effective: 1188
  
Settlement:
  - Customer pays: 1188 - 944 = 244
```

### Scenario 4: Tax Inclusive Mode

```
Items: 1000 (price includes tax)
Tax Rate: 18%

Calculation:
  - Tax = 1000 * 18 / 118 = 152.54
  - Taxable = 1000 - 152.54 = 847.46
  - Final: 1000 (unchanged)

Use for GST where total is fixed.
```

## Running All Tests Together

```bash
#!/bin/bash

echo "Running Pricing Engine Tests..."
npx ts-node __tests__/pricing.integration.test.ts
PRICING_EXIT=$?

echo -e "\n\nRunning Database Integration Tests..."
npx ts-node __tests__/billing.integration.test.ts
DB_EXIT=$?

if [ $PRICING_EXIT -eq 0 ] && [ $DB_EXIT -eq 0 ]; then
  echo -e "\n✅ All tests passed!"
  exit 0
else
  echo -e "\n❌ Some tests failed"
  exit 1
fi
```

## Debugging Failed Tests

### Pricing Engine Test Failures

1. **Check assertion message**: Shows actual vs expected value
2. **Review formula**: Verify allocation math against user specs
3. **Common issue**: Rounding differences → adjust tolerance in test

Example:
```
Expected 152.54 but got 152.53 (diff: -0.01)
```
This is OK if tolerance is 0.01 or higher.

### Database Test Failures

1. **Check database connection**: 
   ```bash
   npx prisma db push  # Verify connection
   ```

2. **Check migrations**: 
   ```bash
   npx prisma migrate status
   ```

3. **Clean up test data** (if test hangs):
   ```bash
   npx prisma db execute --stdin < clean-test-data.sql
   ```

4. **Review assertion error**: 
   ```
   Assertion failed: Item 1 allocated discount
   Expected 200 but got 150
   ```
   Check if snapshot calculation matches expected allocation.

## Adding New Tests

### For Pricing Engine:

```typescript
const myTests: TestCase[] = [
  {
    name: 'My test case name',
    items: [
      { productId: 'P1', quantity: 1, mrp: 1000, sellingPrice: 1000 },
    ],
    options: { discountType: 'PERCENTAGE', discountPercent: 20, taxRate: 18 },
    assertions: (result) => {
      assertEquals(result.total, 944, 0.01, 'Expected total');
      assert(result.snapshots.length === 1, 'Expected 1 snapshot');
    },
  },
];

// Add to main: myTests.forEach(runTest);
```

### For Database Tests:

```typescript
async function testMyScenario(context: TestContext) {
  const billingService = require(...);
  
  const sale = await billingService.createSale(...);
  
  const saleItems = await prisma.saleItem.findMany({
    where: { saleId: sale.id },
  });
  
  assertEquals(Number(saleItems[0].field), expected, 0.01, 'message');
}

// Add to main: await runTest('My test', testMyScenario);
```

## Continuous Integration

Add to CI/CD pipeline:

```yaml
# .github/workflows/test.yml
name: Integration Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npx prisma migrate deploy
      - run: npx ts-node __tests__/pricing.integration.test.ts
      - run: npx ts-node __tests__/billing.integration.test.ts
```

## Troubleshooting

### "Cannot find module" errors

Make sure TypeScript configuration includes the test files:

```json
// tsconfig.json
{
  "include": ["src", "__tests__"],
  "compilerOptions": {
    "rootDir": ".",
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

### "Prisma client not generated" error

```bash
npx prisma generate
```

### "Database connection failed"

```bash
# Check DATABASE_URL
echo $DATABASE_URL

# Verify migrations
npx prisma migrate status

# If needed, create test database
createdb test_db  # PostgreSQL
```

### Tests pass locally but fail in CI

Common cause: Test cleanup not complete. In `cleanupTestData()`, verify all related records are deleted in correct order (foreign key constraints).

## Performance Notes

- Pricing engine tests: < 100ms total (in-memory calculations)
- Database tests: 2-5 seconds per test (includes DB operations)
- Full suite: ~30 seconds on typical machine

## Success Criteria

✅ All pricing allocation formulas match user specifications  
✅ Return settlements use stored snapshots (not current prices)  
✅ Exchange calculations accurate to paisa  
✅ Backward compatibility: old invoices render correctly  
✅ Rounding safety: totals reconcile exactly  
✅ Tax modes: exclusive and inclusive both work  
✅ Flat and percentage discounts both supported
