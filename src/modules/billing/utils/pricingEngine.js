"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.allocatePricingSnapshots = allocatePricingSnapshots;
var money_1 = require("@/shared/utils/money");
var clamp0 = function (value) { return (Number.isFinite(value) && value > 0 ? value : 0); };
function allocatePricingSnapshots(items, options) {
    var _a, _b, _c, _d, _e, _f;
    if (options === void 0) { options = {}; }
    var pricingSnapshotDate = (_a = options.pricingSnapshotDate) !== null && _a !== void 0 ? _a : new Date();
    var discountType = (_b = options.discountType) !== null && _b !== void 0 ? _b : "PERCENTAGE";
    var discountPercent = clamp0(Number((_c = options.discountPercent) !== null && _c !== void 0 ? _c : 0));
    var totalDiscountInput = clamp0(Number((_d = options.discountAmount) !== null && _d !== void 0 ? _d : 0));
    var taxRate = clamp0(Number((_e = options.taxRate) !== null && _e !== void 0 ? _e : 0));
    var taxMode = (_f = options.taxMode) !== null && _f !== void 0 ? _f : "EXCLUSIVE";
    var normalizedItems = items.map(function (item) {
        var _a, _b, _c, _d, _e;
        var quantity = Math.max(0, Number((_a = item.quantity) !== null && _a !== void 0 ? _a : 0));
        var mrpCents = (0, money_1.toCents)(Number((_c = (_b = item.mrp) !== null && _b !== void 0 ? _b : item.sellingPrice) !== null && _c !== void 0 ? _c : 0));
        var sellingPriceCents = (0, money_1.toCents)(Number((_d = item.sellingPrice) !== null && _d !== void 0 ? _d : 0));
        var baseLineAmountCents = sellingPriceCents * quantity;
        return __assign(__assign({}, item), { quantity: quantity, mrp: (0, money_1.fromCents)(mrpCents), sellingPrice: (0, money_1.fromCents)(sellingPriceCents), baseLineAmountCents: baseLineAmountCents, eligibleForDiscount: item.eligibleForDiscount !== false, taxRate: clamp0(Number((_e = item.taxRate) !== null && _e !== void 0 ? _e : taxRate)), costPrice: item.costPrice != null ? (0, money_1.fromCents)((0, money_1.toCents)(Number(item.costPrice))) : undefined });
    });
    var subtotalCents = normalizedItems.reduce(function (sum, item) { return sum + item.baseLineAmountCents; }, 0);
    var eligibleBasesCents = normalizedItems.map(function (item) { return (item.eligibleForDiscount ? item.baseLineAmountCents : 0); });
    var eligibleSubtotalCents = eligibleBasesCents.reduce(function (sum, value) { return sum + value; }, 0);
    var targetDiscountCents = discountType === "PERCENTAGE"
        ? Math.round((eligibleSubtotalCents * discountPercent) / 100)
        : Math.min((0, money_1.toCents)(totalDiscountInput), eligibleSubtotalCents);
    var allocatedDiscounts = (0, money_1.allocateRoundedSharesCents)(targetDiscountCents, eligibleBasesCents);
    var discountedLines = normalizedItems.map(function (item, index) {
        var _a;
        var allocatedDiscountCents = (_a = allocatedDiscounts[index]) !== null && _a !== void 0 ? _a : 0;
        var discountedLineAmountCents = Math.max(0, item.baseLineAmountCents - allocatedDiscountCents);
        return __assign(__assign({}, item), { allocatedDiscountCents: allocatedDiscountCents, discountedLineAmountCents: discountedLineAmountCents });
    });
    var taxableBaseTotalCents = discountedLines.reduce(function (sum, item) { return sum + item.discountedLineAmountCents; }, 0);
    var totalTaxAmountCents = taxRate > 0
        ? taxMode === "INCLUSIVE"
            ? Math.round((taxableBaseTotalCents * taxRate) / (100 + taxRate))
            : Math.round((taxableBaseTotalCents * taxRate) / 100)
        : 0;
    var taxBasesCents = discountedLines.map(function (item) { return item.discountedLineAmountCents; });
    var taxSharesCents = taxRate > 0 ? (0, money_1.allocateRoundedSharesCents)(totalTaxAmountCents, taxBasesCents) : discountedLines.map(function () { return 0; });
    var snapshots = discountedLines.map(function (item, index) {
        var _a, _b, _c;
        var allocatedTaxCents = (_a = taxSharesCents[index]) !== null && _a !== void 0 ? _a : 0;
        var taxableAmountCents = taxMode === "INCLUSIVE"
            ? Math.max(0, item.discountedLineAmountCents - allocatedTaxCents)
            : item.discountedLineAmountCents;
        var lineNetAmountCents = item.discountedLineAmountCents;
        var finalUnitPrice = item.quantity > 0 ? (0, money_1.fromCents)(Math.round(taxableAmountCents / item.quantity)) : 0;
        var effectiveUnitPrice = item.quantity > 0
            ? (0, money_1.fromCents)(Math.round((lineNetAmountCents + allocatedTaxCents) / item.quantity))
            : 0;
        return {
            productId: item.productId,
            quantity: item.quantity,
            mrp: item.mrp,
            sellingPrice: item.sellingPrice,
            discountType: discountType,
            appliedDiscountPercent: item.baseLineAmountCents > 0
                ? (0, money_1.roundTo2)(((0, money_1.fromCents)((_b = allocatedDiscounts[index]) !== null && _b !== void 0 ? _b : 0) / (0, money_1.fromCents)(item.baseLineAmountCents)) * 100)
                : 0,
            allocatedDiscount: (0, money_1.fromCents)((_c = allocatedDiscounts[index]) !== null && _c !== void 0 ? _c : 0),
            taxableAmount: (0, money_1.fromCents)(taxableAmountCents),
            taxAmount: (0, money_1.fromCents)(allocatedTaxCents),
            finalUnitPrice: finalUnitPrice,
            finalLineAmount: (0, money_1.fromCents)(lineNetAmountCents),
            effectiveUnitPrice: effectiveUnitPrice,
            pricingSnapshotDate: pricingSnapshotDate,
            costPrice: item.costPrice,
            eligibleForDiscount: item.eligibleForDiscount,
        };
    });
    // In inclusive mode, total = taxableBaseTotal (tax already included)
    // In exclusive mode, total = taxableBaseTotal + tax (tax added on top)
    var finalTotal = taxMode === "INCLUSIVE"
        ? (0, money_1.fromCents)(taxableBaseTotalCents)
        : (0, money_1.fromCents)(taxableBaseTotalCents + totalTaxAmountCents);
    return {
        snapshots: snapshots,
        subtotal: (0, money_1.fromCents)(subtotalCents),
        discountAmount: (0, money_1.fromCents)(targetDiscountCents),
        taxableAmount: (0, money_1.fromCents)(taxableBaseTotalCents),
        taxAmount: (0, money_1.fromCents)(totalTaxAmountCents),
        total: finalTotal,
    };
}
