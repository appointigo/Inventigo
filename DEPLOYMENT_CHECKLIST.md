# DEPLOYMENT CHECKLIST - Barcode Scanning Fix

## Pre-Deployment Verification

- [x] **Build Status**: `npm run build` ✅ PASSED
- [x] **TypeScript**: No compilation errors ✅
- [x] **Dependencies**: bwip-js installed ✅
- [x] **Code Review**: All changes tested ✅

---

## Files Modified/Created

### ✅ Core Implementation
- [x] `src/shared/services/barcodeService.ts` (NEW)
- [x] `src/modules/barcode/components/BarcodeGenerator.tsx` (UPDATED)
- [x] `src/modules/products/services/productService.ts` (UPDATED)
- [x] `src/app/api/barcode/lookup/route.ts` (UPDATED)

### ✅ UI Components
- [x] `src/modules/billing/components/BillingView.tsx` (UPDATED)
- [x] `src/modules/stock/components/StockTable.tsx` (UPDATED)

### ✅ Data Migrations
- [x] `scripts/migrate-variant-skus.ts` (NEW)
- [x] `prisma/migrations/init/populate_variant_skus.sql` (NEW)

### ✅ Documentation
- [x] `BARCODE_FIX_COMPLETE.md` (NEW)
- [x] `BARCODE_FIX_QUICK_GUIDE.md` (NEW)
- [x] `SUMMARY.md` (NEW)
- [x] `DEPLOYMENT_CHECKLIST.md` (THIS FILE)

---

## Deployment Steps

### Step 1: Backup Database (OPTIONAL but RECOMMENDED)
```bash
# Create backup before running migration
pg_dump stockiva_db > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Step 2: Run Build
```bash
npm run build
# Expected: ✓ Compiled successfully
```

### Step 3: Deploy Code
```bash
# Using Vercel
vercel deploy --prod

# OR using your deployment method
git push main  # This should trigger auto-deploy if configured
```

### Step 4: Run Migration (AFTER deployment)
```bash
# SSH into production or run locally pointing to prod DB
npx ts-node scripts/migrate-variant-skus.ts

# Expected output:
# 🔄 Starting variantSku migration...
# 📊 Found X records with NULL variantSku
# ✓ Product-SKU - Size → 1234567890123
# ...
# 📈 Migration Summary:
#   ✅ Updated: X
#   ❌ Errors: 0
# ✨ Migration complete!
```

### Step 5: Verify Deployment
```bash
# Check that Billing & Stock pages are accessible
curl https://your-domain.com/dashboard/billing
curl https://your-domain.com/dashboard/stock

# Expected: 200 OK
```

---

## Post-Deployment Testing

### Billing Page Tests
- [ ] **Test 1**: Scan product SKU
  - Action: Open Billing page, click "Scan" button
  - Scan: Product SKU (e.g., NK-TSH-001)
  - Expected: Item added to cart immediately

- [ ] **Test 2**: Scan EAN-13 variant
  - Action: Open Billing page, click "Scan" button
  - Scan: Variant barcode (e.g., 1234567890123)
  - Expected: Correct size variant added to cart

- [ ] **Test 3**: Invalid barcode
  - Action: Open Billing page, click "Scan" button
  - Scan: Random text or invalid barcode
  - Expected: Error message displayed

- [ ] **Test 4**: Manual search + scan
  - Action: Type in search box, then scan
  - Expected: Both work independently

### Stock Page Tests
- [ ] **Test 5**: Scan and filter
  - Action: Open Stock page, click "Scan" button
  - Scan: Product SKU or EAN-13
  - Expected: Table filters to correct product/size

- [ ] **Test 6**: Adjust stock
  - Action: Scan, then click "Adjust"
  - Expected: Adjustment modal opens

- [ ] **Test 7**: Error handling
  - Action: Scan invalid barcode
  - Expected: Error message, no crash

### General Tests
- [ ] **Test 8**: Mobile compatibility
  - Action: Test barcode scanning on mobile device
  - Expected: Camera opens, scans work

- [ ] **Test 9**: Chrome/Safari/Firefox
  - Action: Test on different browsers
  - Expected: All work consistently

- [ ] **Test 10**: Console check
  - Action: Open browser DevTools console
  - Expected: No errors, only info logs

---

## Rollback Plan (If Issues Occur)

### Immediate Rollback
```bash
# Revert to previous deployment
vercel rollback

# OR re-deploy previous version
git revert HEAD  # Revert changes
npm run build
vercel deploy --prod
```

### Database Rollback
```bash
# Restore from backup if migration had issues
psql stockiva_db < backup_YYYYMMDD_HHMMSS.sql
```

### Quick Fixes
- If barcodes not scanning: Check `variantSku` in DB
- If labels not printing: Verify bwip-js library imported
- If case sensitivity issues: Check `.toUpperCase()` calls
- If whitespace issues: Check `sanitizeScannedBarcode()` usage

---

## Monitoring Post-Deployment

### Logs to Monitor
```bash
# Watch for barcode-related errors
tail -f logs/barcode-errors.log
tail -f logs/api-lookup.log

# Check database
SELECT COUNT(*) FROM stock_entries WHERE variantSku IS NULL;
# Expected: 0 records after migration
```

### Key Metrics
- [ ] Barcode scan success rate (target: 100%)
- [ ] API response time (target: < 200ms)
- [ ] Migration completion time
- [ ] Error counts (target: 0)

---

## Communication

### Team Notification
- [ ] Notify team that barcode scanning fixed
- [ ] Share documentation links
- [ ] Schedule training if needed

### User Communication
- [ ] Update release notes
- [ ] Inform support team of changes
- [ ] Share FAQ (see BARCODE_FIX_QUICK_GUIDE.md)

---

## Troubleshooting During Deployment

### Issue: Build fails
```
Solution:
1. Check Node version: node --version (should be LTS)
2. Clear cache: npm ci (instead of npm install)
3. Check bwip-js import: grep -r "bwip-js" src/
```

### Issue: Migration fails
```
Solution:
1. Check DB connection: npm run db:check
2. Verify migration script has correct URL
3. Check database permissions
4. Run manually step-by-step with logging
```

### Issue: Barcode scanning doesn't work after deployment
```
Solution:
1. Check browser console for errors
2. Verify buildVariantSku matches database format
3. Run SELECT * FROM stock_entries LIMIT 1 to check
4. Clear browser cache: Ctrl+Shift+Delete
```

### Issue: Old barcodes don't match
```
Solution:
1. Verify migration ran successfully
2. Check variantSku format in DB
3. Re-run migration if needed
```

---

## Final Verification Checklist

Before marking as complete:

- [ ] All code deployed successfully
- [ ] Migration script completed without errors
- [ ] Database shows updated variantSku values
- [ ] Billing page barcode scanning works
- [ ] Stock page barcode scanning works
- [ ] Label printing works with EAN-13
- [ ] No console errors or warnings
- [ ] Performance meets requirements
- [ ] Mobile testing passed
- [ ] Team trained on new features

---

## Sign-Off

- **Deployed By**: _________________
- **Date**: _________________
- **Verified By**: _________________
- **Notes**: 

---

## Related Documentation

- 📄 [BARCODE_FIX_COMPLETE.md](BARCODE_FIX_COMPLETE.md) - Full technical guide
- 📄 [BARCODE_FIX_QUICK_GUIDE.md](BARCODE_FIX_QUICK_GUIDE.md) - Quick reference
- 📄 [SUMMARY.md](SUMMARY.md) - Executive summary

---

**Last Updated**: April 14, 2026  
**Status**: ✅ Ready for Deployment
