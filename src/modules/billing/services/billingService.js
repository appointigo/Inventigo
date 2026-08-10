"use strict";
var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
};
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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.billingService = void 0;
var db_1 = require("@/lib/db");
var client_1 = require("@prisma/client");
var customerService_1 = require("@/modules/customers/services/customerService");
var whatsappInvoiceService_1 = require("./whatsappInvoiceService");
var pricingEngine_1 = require("../utils/pricingEngine");
// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
var generateInvoiceNumber = function (storeId_1) {
    var args_1 = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        args_1[_i - 1] = arguments[_i];
    }
    return __awaiter(void 0, __spreadArray([storeId_1], args_1, true), void 0, function (storeId, attempt) {
        var today, dateStr, storeToken, prefix, startOfDay, endOfDay, latest, latestSeq, nextSeq, randomSuffix;
        var _a;
        if (attempt === void 0) { attempt = 0; }
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    today = new Date();
                    dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
                    storeToken = storeId.replace(/-/g, "").slice(0, 6).toUpperCase();
                    prefix = "INV-".concat(dateStr, "-").concat(storeToken, "-");
                    startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                    endOfDay = new Date(startOfDay.getTime() + 86400000);
                    return [4 /*yield*/, db_1.prisma.sale.findFirst({
                            where: {
                                storeId: storeId,
                                createdAt: { gte: startOfDay, lt: endOfDay },
                                invoiceNumber: { startsWith: prefix },
                            },
                            orderBy: { createdAt: "desc" },
                            select: { invoiceNumber: true },
                        })];
                case 1:
                    latest = _b.sent();
                    latestSeq = Number((_a = latest === null || latest === void 0 ? void 0 : latest.invoiceNumber.split("-").at(-1)) !== null && _a !== void 0 ? _a : "0");
                    nextSeq = Number.isFinite(latestSeq) ? latestSeq + 1 : 1;
                    // On retry attempts, add a random suffix to avoid race-condition duplicates
                    if (attempt > 0) {
                        randomSuffix = Math.floor(Math.random() * 1000);
                        nextSeq = (nextSeq * 1000) + randomSuffix;
                    }
                    return [2 /*return*/, "".concat(prefix).concat(String(nextSeq).padStart(4, "0"))];
            }
        });
    });
};
var isInvoiceNumberConflict = function (error, depth) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    if (depth === void 0) { depth = 0; }
    // Prisma wraps errors inside transactions. Recursively check nested
    // causes. Be permissive: treat P2002 or any message/meta mentioning
    // invoiceNumber as a conflict.
    if (depth > 5)
        return false; // Prevent infinite recursion
    var e = error;
    // Check common code locations
    var code = (_d = (_b = (_a = e === null || e === void 0 ? void 0 : e.code) !== null && _a !== void 0 ? _a : e === null || e === void 0 ? void 0 : e.errorCode) !== null && _b !== void 0 ? _b : (_c = e === null || e === void 0 ? void 0 : e.error) === null || _c === void 0 ? void 0 : _c.code) !== null && _d !== void 0 ? _d : undefined;
    if (code === "P2002")
        return true;
    // Check explicit meta/target fields
    var target = (_g = (_f = (_e = e === null || e === void 0 ? void 0 : e.meta) === null || _e === void 0 ? void 0 : _e.target) !== null && _f !== void 0 ? _f : e === null || e === void 0 ? void 0 : e.meta) !== null && _g !== void 0 ? _g : e === null || e === void 0 ? void 0 : e.target;
    if (target) {
        var t = Array.isArray(target) ? target.join(" ") : String(target);
        if (t.includes("invoiceNumber"))
            return true;
    }
    // Check error message for invoiceNumber or unique constraint
    var msg = String((_j = (_h = e === null || e === void 0 ? void 0 : e.message) !== null && _h !== void 0 ? _h : e) !== null && _j !== void 0 ? _j : "");
    if (msg.includes("invoiceNumber") || msg.includes("referenceNumber") || msg.includes("Unique constraint failed"))
        return true;
    // Recursively check nested cause (errors wrapped inside transactions)
    if (e === null || e === void 0 ? void 0 : e.cause) {
        if (isInvoiceNumberConflict(e.cause, depth + 1))
            return true;
    }
    // Also check originalError
    if (e === null || e === void 0 ? void 0 : e.originalError) {
        if (isInvoiceNumberConflict(e.originalError, depth + 1))
            return true;
    }
    // Last resort: stringify and search
    try {
        var json = JSON.stringify(e);
        if (json.includes("invoiceNumber"))
            return true;
    }
    catch (err) {
        // ignore stringify errors
    }
    return false;
};
var generateReturnReferenceNumber = function (storeId_1) {
    var args_1 = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        args_1[_i - 1] = arguments[_i];
    }
    return __awaiter(void 0, __spreadArray([storeId_1], args_1, true), void 0, function (storeId, attempt) {
        var today, dateStr, storeToken, prefix, startOfDay, endOfDay, latest, latestSeq, nextSeq, randomSuffix;
        var _a, _b;
        if (attempt === void 0) { attempt = 0; }
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    today = new Date();
                    dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
                    storeToken = storeId.replace(/-/g, "").slice(0, 6).toUpperCase();
                    prefix = "RET-".concat(dateStr, "-").concat(storeToken, "-");
                    startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                    endOfDay = new Date(startOfDay.getTime() + 86400000);
                    return [4 /*yield*/, db_1.prisma.returnTransaction.findFirst({
                            where: {
                                storeId: storeId,
                                createdAt: { gte: startOfDay, lt: endOfDay },
                                referenceNumber: { startsWith: prefix },
                            },
                            orderBy: { createdAt: "desc" },
                            select: { referenceNumber: true },
                        })];
                case 1:
                    latest = _c.sent();
                    latestSeq = Number((_b = (_a = latest === null || latest === void 0 ? void 0 : latest.referenceNumber) === null || _a === void 0 ? void 0 : _a.split("-").at(-1)) !== null && _b !== void 0 ? _b : "0");
                    nextSeq = Number.isFinite(latestSeq) ? latestSeq + 1 : 1;
                    if (attempt > 0) {
                        randomSuffix = Math.floor(Math.random() * 1000);
                        nextSeq = (nextSeq * 1000) + randomSuffix;
                    }
                    return [2 /*return*/, "".concat(prefix).concat(String(nextSeq).padStart(4, "0"))];
            }
        });
    });
};
var EPSILON = 0.01;
var VALID_PAYMENT_METHODS = new Set(["CASH", "CARD", "UPI"]);
var round2 = function (value) { return Math.round(value * 100) / 100; };
var clamp0 = function (value) { return (Number.isFinite(value) && value > 0 ? value : 0); };
var derivePresentationPaymentMethod = function (fallbackMethod, payments) {
    var _a;
    var nonZeroMethods = new Set((payments !== null && payments !== void 0 ? payments : [])
        .filter(function (p) { var _a; return Number((_a = p.amount) !== null && _a !== void 0 ? _a : 0) > 0; })
        .map(function (p) { var _a; return String((_a = p.method) !== null && _a !== void 0 ? _a : ""); })
        .filter(function (m) { return VALID_PAYMENT_METHODS.has(m); }));
    if (nonZeroMethods.size > 1) {
        return "SPLIT";
    }
    if (nonZeroMethods.size === 1) {
        return __spreadArray([], nonZeroMethods, true)[0];
    }
    return (_a = fallbackMethod) !== null && _a !== void 0 ? _a : "CASH";
};
var normalizePaymentEntries = function (splitPayments, fallbackMethod, fallbackAmount) {
    if (Array.isArray(splitPayments) && splitPayments.length > 0) {
        var normalized = splitPayments
            .map(function (entry) {
            var _a, _b;
            return ({
                method: String((_a = entry === null || entry === void 0 ? void 0 : entry.method) !== null && _a !== void 0 ? _a : "").toUpperCase(),
                amount: round2(Number((_b = entry === null || entry === void 0 ? void 0 : entry.amount) !== null && _b !== void 0 ? _b : 0)),
            });
        })
            .filter(function (entry) { return entry.amount > 0; });
        if (normalized.length === 0) {
            throw new Error("At least one split payment entry with amount is required");
        }
        for (var _i = 0, normalized_1 = normalized; _i < normalized_1.length; _i++) {
            var entry = normalized_1[_i];
            if (!VALID_PAYMENT_METHODS.has(entry.method)) {
                throw new Error("Invalid payment method: ".concat(entry.method));
            }
            if (entry.amount <= 0) {
                throw new Error("Payment amount must be greater than zero");
            }
        }
        return normalized;
    }
    if (fallbackAmount <= 0) {
        return [];
    }
    var method = String(fallbackMethod !== null && fallbackMethod !== void 0 ? fallbackMethod : "CASH").toUpperCase();
    if (!VALID_PAYMENT_METHODS.has(method)) {
        throw new Error("Invalid payment method");
    }
    return [{ method: method, amount: round2(fallbackAmount) }];
};
var extractHistoricalUnitAmount = function (item) {
    var _a, _b, _c, _d, _e, _f, _g;
    var effectiveUnit = Number((_d = (_c = (_b = (_a = item === null || item === void 0 ? void 0 : item.effectiveUnitPrice) !== null && _a !== void 0 ? _a : item === null || item === void 0 ? void 0 : item.finalUnitPrice) !== null && _b !== void 0 ? _b : item === null || item === void 0 ? void 0 : item.sellingPrice) !== null && _c !== void 0 ? _c : item === null || item === void 0 ? void 0 : item.unitPrice) !== null && _d !== void 0 ? _d : 0);
    if (effectiveUnit > 0) {
        return round2(effectiveUnit);
    }
    var quantity = Math.max(1, Number((_e = item === null || item === void 0 ? void 0 : item.quantity) !== null && _e !== void 0 ? _e : 1));
    var lineTotal = Number((_g = (_f = item === null || item === void 0 ? void 0 : item.finalLineAmount) !== null && _f !== void 0 ? _f : item === null || item === void 0 ? void 0 : item.total) !== null && _g !== void 0 ? _g : 0);
    return round2(lineTotal / quantity);
};
var getPrimaryPaymentMethod = function (entries, fallbackMethod) {
    if (entries.length === 0) {
        var method = String(fallbackMethod !== null && fallbackMethod !== void 0 ? fallbackMethod : "CASH").toUpperCase();
        return (VALID_PAYMENT_METHODS.has(method) ? method : "CASH");
    }
    var sorted = __spreadArray([], entries, true).sort(function (a, b) { return b.amount - a.amount; });
    return sorted[0].method;
};
function hasTable(tableName) {
    return __awaiter(this, void 0, void 0, function () {
        var result, _a;
        var _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    _d.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, db_1.prisma.$queryRaw(templateObject_1 || (templateObject_1 = __makeTemplateObject(["\n      SELECT EXISTS (\n        SELECT 1\n        FROM information_schema.tables\n        WHERE table_schema = current_schema()\n          AND table_name = ", "\n      ) AS has_table\n    "], ["\n      SELECT EXISTS (\n        SELECT 1\n        FROM information_schema.tables\n        WHERE table_schema = current_schema()\n          AND table_name = ", "\n      ) AS has_table\n    "])), tableName)];
                case 1:
                    result = _d.sent();
                    return [2 /*return*/, (_c = (_b = result[0]) === null || _b === void 0 ? void 0 : _b.has_table) !== null && _c !== void 0 ? _c : false];
                case 2:
                    _a = _d.sent();
                    return [2 /*return*/, false];
                case 3: return [2 /*return*/];
            }
        });
    });
}
function hasColumn(tableName, columnName) {
    return __awaiter(this, void 0, void 0, function () {
        var result, _a;
        var _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    _d.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, db_1.prisma.$queryRaw(templateObject_2 || (templateObject_2 = __makeTemplateObject(["\n      SELECT EXISTS (\n        SELECT 1\n        FROM information_schema.columns\n        WHERE table_schema = current_schema()\n          AND table_name = ", "\n          AND column_name = ", "\n      ) AS has_column\n    "], ["\n      SELECT EXISTS (\n        SELECT 1\n        FROM information_schema.columns\n        WHERE table_schema = current_schema()\n          AND table_name = ", "\n          AND column_name = ", "\n      ) AS has_column\n    "])), tableName, columnName)];
                case 1:
                    result = _d.sent();
                    return [2 /*return*/, (_c = (_b = result[0]) === null || _b === void 0 ? void 0 : _b.has_column) !== null && _c !== void 0 ? _c : false];
                case 2:
                    _a = _d.sent();
                    return [2 /*return*/, false];
                case 3: return [2 /*return*/];
            }
        });
    });
}
var supportsExchangedStatusCache = null;
function supportsExchangedSaleStatus() {
    return __awaiter(this, void 0, void 0, function () {
        var result, _a;
        var _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    if (supportsExchangedStatusCache !== null) {
                        return [2 /*return*/, supportsExchangedStatusCache];
                    }
                    _d.label = 1;
                case 1:
                    _d.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, db_1.prisma.$queryRaw(templateObject_3 || (templateObject_3 = __makeTemplateObject(["\n      SELECT EXISTS (\n        SELECT 1\n        FROM pg_type t\n        JOIN pg_enum e ON t.oid = e.enumtypid\n        WHERE t.typname = 'SaleStatus'\n          AND e.enumlabel = 'EXCHANGED'\n      ) AS has_value\n    "], ["\n      SELECT EXISTS (\n        SELECT 1\n        FROM pg_type t\n        JOIN pg_enum e ON t.oid = e.enumtypid\n        WHERE t.typname = 'SaleStatus'\n          AND e.enumlabel = 'EXCHANGED'\n      ) AS has_value\n    "])))];
                case 2:
                    result = _d.sent();
                    supportsExchangedStatusCache = (_c = (_b = result[0]) === null || _b === void 0 ? void 0 : _b.has_value) !== null && _c !== void 0 ? _c : false;
                    return [2 /*return*/, supportsExchangedStatusCache];
                case 3:
                    _a = _d.sent();
                    supportsExchangedStatusCache = false;
                    return [2 /*return*/, false];
                case 4: return [2 /*return*/];
            }
        });
    });
}
var normalizeLegacyTransactionItems = function (items) {
    return Array.isArray(items)
        ? items.map(function (item) {
            var _a, _b, _c, _d;
            var record = item && typeof item === "object" ? item : {};
            return {
                productId: String((_a = record.productId) !== null && _a !== void 0 ? _a : ""),
                sizeId: String((_b = record.sizeId) !== null && _b !== void 0 ? _b : ""),
                quantity: Number((_c = record.quantity) !== null && _c !== void 0 ? _c : 0),
                total: Number((_d = record.total) !== null && _d !== void 0 ? _d : 0),
                productName: typeof record.productName === "string" ? record.productName : undefined,
                sku: typeof record.sku === "string" ? record.sku : undefined,
                sizeLabel: typeof record.sizeLabel === "string" ? record.sizeLabel : undefined,
            };
        })
        : [];
};
var toReturnTransactionDto = function (rt, fallbackReturnedItems, fallbackExchangedItems) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
    if (fallbackReturnedItems === void 0) { fallbackReturnedItems = []; }
    if (fallbackExchangedItems === void 0) { fallbackExchangedItems = []; }
    var relationalItems = (_a = rt.items) !== null && _a !== void 0 ? _a : [];
    var returnedItems = relationalItems.length > 0
        ? relationalItems
            .filter(function (item) { return item.returnedProductId; })
            .map(function (item) {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
            return ({
                productId: String(item.returnedProductId),
                sizeId: String((_a = item.returnedSizeId) !== null && _a !== void 0 ? _a : ""),
                quantity: Number((_b = item.returnedQuantity) !== null && _b !== void 0 ? _b : 0),
                total: round2(Number((_c = item.returnedUnitPrice) !== null && _c !== void 0 ? _c : 0) * Number((_d = item.returnedQuantity) !== null && _d !== void 0 ? _d : 0)),
                productName: (_f = (_e = item.returnedProduct) === null || _e === void 0 ? void 0 : _e.name) !== null && _f !== void 0 ? _f : undefined,
                sku: (_h = (_g = item.returnedProduct) === null || _g === void 0 ? void 0 : _g.sku) !== null && _h !== void 0 ? _h : undefined,
                sizeLabel: (_k = (_j = item.returnedSize) === null || _j === void 0 ? void 0 : _j.label) !== null && _k !== void 0 ? _k : undefined,
            });
        })
        : fallbackReturnedItems.map(function (item) { return (__assign(__assign({}, item), { total: round2(item.total) })); });
    var exchangedItems = relationalItems.length > 0
        ? relationalItems
            .filter(function (item) { return item.newProductId; })
            .map(function (item) {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
            return ({
                productId: String(item.newProductId),
                sizeId: String((_a = item.newSizeId) !== null && _a !== void 0 ? _a : ""),
                quantity: Number((_b = item.newQuantity) !== null && _b !== void 0 ? _b : 0),
                total: round2(Number((_c = item.newUnitPrice) !== null && _c !== void 0 ? _c : 0) * Number((_d = item.newQuantity) !== null && _d !== void 0 ? _d : 0)),
                productName: (_f = (_e = item.newProduct) === null || _e === void 0 ? void 0 : _e.name) !== null && _f !== void 0 ? _f : undefined,
                sku: (_h = (_g = item.newProduct) === null || _g === void 0 ? void 0 : _g.sku) !== null && _h !== void 0 ? _h : undefined,
                sizeLabel: (_k = (_j = item.newSize) === null || _j === void 0 ? void 0 : _j.label) !== null && _k !== void 0 ? _k : undefined,
            });
        })
        : fallbackExchangedItems.map(function (item) { return (__assign(__assign({}, item), { total: round2(item.total) })); });
    return {
        id: rt.id,
        referenceNumber: rt.referenceNumber,
        originalSaleId: rt.originalSaleId,
        storeId: rt.storeId,
        customerId: (_b = rt.customerId) !== null && _b !== void 0 ? _b : null,
        type: rt.type,
        returnedItems: returnedItems,
        exchangedItems: exchangedItems,
        netAmount: Number((_c = rt.netAmount) !== null && _c !== void 0 ? _c : 0),
        offsetAmount: Number((_d = rt.offsetAmount) !== null && _d !== void 0 ? _d : 0),
        refundAmount: Number((_e = rt.refundAmount) !== null && _e !== void 0 ? _e : 0),
        refundMethod: (_f = rt.refundMethod) !== null && _f !== void 0 ? _f : undefined,
        reason: (_g = rt.reason) !== null && _g !== void 0 ? _g : undefined,
        condition: (_h = rt.condition) !== null && _h !== void 0 ? _h : undefined,
        notes: (_j = rt.notes) !== null && _j !== void 0 ? _j : undefined,
        transactionDate: rt.transactionDate instanceof Date ? rt.transactionDate.toISOString() : (_k = rt.transactionDate) !== null && _k !== void 0 ? _k : undefined,
        businessDate: rt.businessDate instanceof Date ? rt.businessDate.toISOString() : (_l = rt.businessDate) !== null && _l !== void 0 ? _l : undefined,
        createdAt: rt.createdAt instanceof Date ? rt.createdAt.toISOString() : rt.createdAt,
    };
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
var toSaleDto = function (s) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
    return ({
        id: s.id,
        invoiceNumber: s.invoiceNumber,
        customerId: (_a = s.customerId) !== null && _a !== void 0 ? _a : null,
        customerName: (_b = s.customerName) !== null && _b !== void 0 ? _b : null,
        customerPhone: (_c = s.customerPhone) !== null && _c !== void 0 ? _c : null,
        customerEmail: (_d = s.customerEmail) !== null && _d !== void 0 ? _d : null,
        subtotal: Number(s.subtotal),
        discountAmount: Number(s.discountAmount),
        taxAmount: Number(s.taxAmount),
        total: Number((_e = s.finalPayableAmount) !== null && _e !== void 0 ? _e : s.total),
        calculatedTotal: s.calculatedTotal != null ? Number(s.calculatedTotal) : undefined,
        roundOffAmount: Number((_f = s.roundOffAmount) !== null && _f !== void 0 ? _f : 0),
        finalPayableAmount: s.finalPayableAmount != null ? Number(s.finalPayableAmount) : undefined,
        amountPaid: Number((_g = s.amountPaid) !== null && _g !== void 0 ? _g : 0),
        amountDue: Number((_h = s.amountDue) !== null && _h !== void 0 ? _h : 0),
        paymentMethod: derivePresentationPaymentMethod(s.paymentMethod, s.payments),
        paymentStatus: s.paymentStatus,
        returnStatus: s.returnStatus,
        status: s.status,
        items: ((_j = s.items) !== null && _j !== void 0 ? _j : []).map(function (i) {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
            return ({
                id: i.id,
                productId: i.productId,
                productName: (_b = (_a = i.product) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : "",
                sku: (_d = (_c = i.product) === null || _c === void 0 ? void 0 : _c.sku) !== null && _d !== void 0 ? _d : "",
                sizeId: i.sizeId,
                sizeLabel: (_f = (_e = i.size) === null || _e === void 0 ? void 0 : _e.label) !== null && _f !== void 0 ? _f : "",
                attributes: (_h = (_g = i.product) === null || _g === void 0 ? void 0 : _g.attributes) !== null && _h !== void 0 ? _h : {},
                quantity: i.quantity,
                unitPrice: Number(i.unitPrice),
                total: Number(i.total),
                mrp: i.mrp != null ? Number(i.mrp) : Number(i.unitPrice),
                sellingPrice: i.sellingPrice != null ? Number(i.sellingPrice) : Number(i.unitPrice),
                discountType: (_j = i.discountType) !== null && _j !== void 0 ? _j : undefined,
                appliedDiscountPercent: i.appliedDiscountPercent != null ? Number(i.appliedDiscountPercent) : undefined,
                allocatedDiscount: i.allocatedDiscount != null ? Number(i.allocatedDiscount) : undefined,
                taxableAmount: i.taxableAmount != null ? Number(i.taxableAmount) : undefined,
                taxAmount: i.taxAmount != null ? Number(i.taxAmount) : undefined,
                finalUnitPrice: i.finalUnitPrice != null ? Number(i.finalUnitPrice) : Number(i.unitPrice),
                finalLineAmount: i.finalLineAmount != null ? Number(i.finalLineAmount) : Number(i.total),
                effectiveUnitPrice: i.effectiveUnitPrice != null ? Number(i.effectiveUnitPrice) : Number(i.unitPrice),
                costPrice: i.costPrice != null ? Number(i.costPrice) : undefined,
                pricingSnapshotDate: i.pricingSnapshotDate instanceof Date ? i.pricingSnapshotDate.toISOString() : (_k = i.pricingSnapshotDate) !== null && _k !== void 0 ? _k : undefined,
            });
        }),
        payments: ((_k = s.payments) !== null && _k !== void 0 ? _k : []).map(function (p) {
            var _a;
            return ({
                id: p.id,
                saleId: p.saleId,
                amount: Number(p.amount),
                method: p.method,
                businessDate: p.businessDate instanceof Date ? p.businessDate.toISOString() : p.businessDate,
                paidAt: p.paidAt instanceof Date ? p.paidAt.toISOString() : p.paidAt,
                note: (_a = p.note) !== null && _a !== void 0 ? _a : undefined,
                createdBy: p.createdBy,
            });
        }),
        returnTransactions: ((_l = s.returnTransactions) !== null && _l !== void 0 ? _l : []).map(function (rt) {
            var _a, _b, _c, _d, _e;
            var relationalItems = (_a = rt.items) !== null && _a !== void 0 ? _a : [];
            var providedReturnedItems = normalizeLegacyTransactionItems(rt.returnedItems);
            var providedExchangedItems = normalizeLegacyTransactionItems(rt.exchangedItems);
            // ── Backward-compatibility: old return transactions (created before the
            // return_transaction_items relational table was introduced) store their
            // item lists as JSONB in returnedItems / exchangedItems columns.  When the
            // relational table is empty we fall back to those JSONB arrays so legacy
            // records render correctly.
            var relationalReturnedItems = relationalItems
                .filter(function (it) { return it.returnedProductId; })
                .map(function (item) {
                var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
                return ({
                    productId: String(item.returnedProductId),
                    sizeId: String((_a = item.returnedSizeId) !== null && _a !== void 0 ? _a : ""),
                    quantity: Number(item.returnedQuantity),
                    total: Number((_b = item.returnedUnitPrice) !== null && _b !== void 0 ? _b : 0) * Number((_c = item.returnedQuantity) !== null && _c !== void 0 ? _c : 0),
                    productName: (_f = (_e = (_d = item.returnedProduct) === null || _d === void 0 ? void 0 : _d.name) !== null && _e !== void 0 ? _e : item.productName) !== null && _f !== void 0 ? _f : undefined,
                    sku: (_j = (_h = (_g = item.returnedProduct) === null || _g === void 0 ? void 0 : _g.sku) !== null && _h !== void 0 ? _h : item.sku) !== null && _j !== void 0 ? _j : undefined,
                    sizeLabel: (_m = (_l = (_k = item.returnedSize) === null || _k === void 0 ? void 0 : _k.label) !== null && _l !== void 0 ? _l : item.sizeLabel) !== null && _m !== void 0 ? _m : undefined,
                });
            });
            var returnedItems = relationalReturnedItems.length > 0
                ? (providedReturnedItems.length === relationalReturnedItems.length &&
                    providedReturnedItems.some(function (item) { return item.productName || item.sku || item.sizeLabel; })
                    ? providedReturnedItems
                    : relationalReturnedItems)
                : providedReturnedItems;
            var relationalExchangedItems = relationalItems
                .filter(function (it) { return it.newProductId; })
                .map(function (item) {
                var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
                return ({
                    productId: String(item.newProductId),
                    sizeId: String((_a = item.newSizeId) !== null && _a !== void 0 ? _a : ""),
                    quantity: Number((_b = item.newQuantity) !== null && _b !== void 0 ? _b : 0),
                    total: Number((_c = item.newUnitPrice) !== null && _c !== void 0 ? _c : 0) * Number((_d = item.newQuantity) !== null && _d !== void 0 ? _d : 0),
                    productName: (_g = (_f = (_e = item.newProduct) === null || _e === void 0 ? void 0 : _e.name) !== null && _f !== void 0 ? _f : item.productName) !== null && _g !== void 0 ? _g : undefined,
                    sku: (_k = (_j = (_h = item.newProduct) === null || _h === void 0 ? void 0 : _h.sku) !== null && _j !== void 0 ? _j : item.sku) !== null && _k !== void 0 ? _k : undefined,
                    sizeLabel: (_o = (_m = (_l = item.newSize) === null || _l === void 0 ? void 0 : _l.label) !== null && _m !== void 0 ? _m : item.sizeLabel) !== null && _o !== void 0 ? _o : undefined,
                });
            });
            var exchangedItems = relationalExchangedItems.length > 0
                ? (providedExchangedItems.length === relationalExchangedItems.length &&
                    providedExchangedItems.some(function (item) { return item.productName || item.sku || item.sizeLabel; })
                    ? providedExchangedItems
                    : relationalExchangedItems)
                : providedExchangedItems;
            return {
                id: rt.id,
                type: rt.type,
                returnedItems: returnedItems,
                exchangedItems: exchangedItems,
                netAmount: Number(rt.netAmount),
                offsetAmount: Number(rt.offsetAmount),
                refundAmount: Number(rt.refundAmount),
                refundMethod: (_b = rt.refundMethod) !== null && _b !== void 0 ? _b : undefined,
                reason: (_c = rt.reason) !== null && _c !== void 0 ? _c : undefined,
                condition: (_d = rt.condition) !== null && _d !== void 0 ? _d : undefined,
                notes: (_e = rt.notes) !== null && _e !== void 0 ? _e : undefined,
                createdAt: rt.createdAt instanceof Date ? rt.createdAt.toISOString() : rt.createdAt,
            };
        }),
        transactionDate: s.transactionDate instanceof Date ? s.transactionDate.toISOString() : s.transactionDate,
        createdAt: s.createdAt instanceof Date ? s.createdAt.toISOString() : s.createdAt,
    });
};
var saleInclude = {
    items: {
        include: {
            product: {
                select: {
                    name: true,
                    sku: true,
                    attributes: true,
                    brand: { select: { name: true } },
                    category: { select: { name: true } },
                },
            },
            size: { select: { label: true } },
        },
    },
    payments: true,
};
// ─────────────────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────────────────
exports.billingService = {
    createSale: function (orgId, storeId, userId, input) {
        return __awaiter(this, void 0, void 0, function () {
            var startedAt, subtotal, customer, discountAmount, resolvedPromoCodeId, promo, transactionDate, productIds, products, _a, productMap, pricing, taxAmount, calculatedTotal, finalPayableAmount, roundOffAmount, requestedAmountPaid, paymentEntries, splitCollected, overpayment, singleCashPaymentEntry, amountPaid, amountDue, paymentStatus, primaryPaymentMethod, _loop_1, attempt, state_1;
            var _this = this;
            var _b, _c, _d, _e, _f, _g, _h;
            return __generator(this, function (_j) {
                switch (_j.label) {
                    case 0:
                        startedAt = Date.now();
                        // TODO: Remove temporary debug logs before production
                        console.log("[WHATSAPP_DEBUG] Billing flow started. OrgId=".concat(orgId, " StoreId=").concat(storeId, " UserId=").concat(userId, " CustomerPhone=").concat(input.customerPhone ? "***masked***" : "missing"));
                        if (!((_b = input.customerPhone) === null || _b === void 0 ? void 0 : _b.trim())) {
                            // TODO: Remove temporary debug logs before production
                            console.error("[WHATSAPP_DEBUG] Billing flow validation failed. Stage=CustomerMobileRequired OrgId=".concat(orgId, " StoreId=").concat(storeId, " Error=Customer mobile number is required"));
                            throw new Error("Customer mobile number is required");
                        }
                        subtotal = input.items.reduce(function (sum, it) { return sum + it.unitPrice * it.quantity; }, 0);
                        return [4 /*yield*/, customerService_1.customerService.getOrCreateCustomer(orgId, input.customerPhone, input.customerName, input.customerEmail)];
                    case 1:
                        customer = _j.sent();
                        // TODO: Remove temporary debug logs before production
                        console.log("[WHATSAPP_DEBUG] Sale creation in progress. OrgId=".concat(orgId, " StoreId=").concat(storeId, " CustomerId=").concat(customer.id, " CustomerMobile=").concat(input.customerPhone ? "***masked***" : "missing"));
                        discountAmount = input.discountAmount;
                        resolvedPromoCodeId = null;
                        if (!input.promoCodeId) return [3 /*break*/, 3];
                        return [4 /*yield*/, db_1.prisma.promoCode.findFirst({
                                where: { id: input.promoCodeId, orgId: orgId },
                            })];
                    case 2:
                        promo = _j.sent();
                        if (!promo) {
                            throw new Error("Promo code not found");
                        }
                        if (!promo.isActive) {
                            throw new Error("Promo code is inactive");
                        }
                        if (promo.expiresAt && promo.expiresAt < new Date()) {
                            throw new Error("Promo code has expired");
                        }
                        if (promo.maxUses !== null && promo.usageCount >= promo.maxUses) {
                            throw new Error("Promo code usage limit reached");
                        }
                        // Recompute discount server-side from promo.discountPct
                        discountAmount = Math.round((subtotal * Number(promo.discountPct)) / 100);
                        resolvedPromoCodeId = promo.id;
                        _j.label = 3;
                    case 3:
                        transactionDate = input.transactionDate ? new Date(input.transactionDate) : new Date();
                        productIds = __spreadArray([], new Set(input.items.map(function (item) { return item.productId; })), true);
                        if (!(productIds.length > 0)) return [3 /*break*/, 5];
                        return [4 /*yield*/, db_1.prisma.product.findMany({
                                where: { id: { in: productIds } },
                                select: { id: true, mrp: true, costPrice: true },
                            })];
                    case 4:
                        _a = _j.sent();
                        return [3 /*break*/, 6];
                    case 5:
                        _a = [];
                        _j.label = 6;
                    case 6:
                        products = _a;
                        productMap = new Map(products.map(function (product) { return [product.id, product]; }));
                        pricing = (0, pricingEngine_1.allocatePricingSnapshots)(input.items.map(function (item) {
                            var _a;
                            var product = productMap.get(item.productId);
                            return {
                                productId: item.productId,
                                quantity: item.quantity,
                                mrp: Number((_a = product === null || product === void 0 ? void 0 : product.mrp) !== null && _a !== void 0 ? _a : item.unitPrice),
                                sellingPrice: Number(item.unitPrice),
                                costPrice: (product === null || product === void 0 ? void 0 : product.costPrice) != null ? Number(product.costPrice) : undefined,
                                eligibleForDiscount: true,
                            };
                        }), {
                            discountType: (_c = input.discountType) !== null && _c !== void 0 ? _c : "PERCENTAGE",
                            discountPercent: (_d = input.discountPercent) !== null && _d !== void 0 ? _d : 0,
                            discountAmount: discountAmount,
                            taxRate: (_e = input.taxRate) !== null && _e !== void 0 ? _e : 0,
                            taxMode: (_f = input.taxMode) !== null && _f !== void 0 ? _f : "EXCLUSIVE",
                            pricingSnapshotDate: transactionDate,
                        });
                        discountAmount = pricing.discountAmount;
                        taxAmount = pricing.taxAmount;
                        calculatedTotal = pricing.total;
                        finalPayableAmount = Math.round(calculatedTotal);
                        roundOffAmount = round2(finalPayableAmount - calculatedTotal);
                        requestedAmountPaid = round2(Math.max(0, Number((_g = input.amountPaid) !== null && _g !== void 0 ? _g : finalPayableAmount)));
                        paymentEntries = normalizePaymentEntries(input.splitPayments, input.paymentMethod, requestedAmountPaid);
                        splitCollected = round2(paymentEntries.reduce(function (sum, entry) { return sum + entry.amount; }, 0));
                        overpayment = round2(splitCollected - finalPayableAmount);
                        singleCashPaymentEntry = paymentEntries.length === 1 && paymentEntries[0].method === "CASH";
                        if (overpayment > EPSILON) {
                            if (singleCashPaymentEntry && overpayment <= 1) {
                                // Accept minor cash tendering differences by clamping the recorded payment
                                // to the invoice total. The actual cash drawer can handle the change.
                                paymentEntries[0].amount = finalPayableAmount;
                                splitCollected = finalPayableAmount;
                                requestedAmountPaid = finalPayableAmount;
                            }
                            else {
                                throw new Error("Collected amount cannot exceed total invoice amount of \u20B9".concat(finalPayableAmount.toFixed(2)));
                            }
                        }
                        if (Math.abs(splitCollected - requestedAmountPaid) > EPSILON) {
                            throw new Error("Split payment total must match amount paid");
                        }
                        amountPaid = splitCollected;
                        amountDue = Math.max(finalPayableAmount - amountPaid, 0);
                        paymentStatus = amountPaid >= finalPayableAmount ? "PAID" : amountPaid > 0 ? "PARTIAL" : "PENDING";
                        primaryPaymentMethod = getPrimaryPaymentMethod(paymentEntries, input.paymentMethod);
                        _loop_1 = function (attempt) {
                            var invoiceNumber, sale_1, error_1;
                            return __generator(this, function (_k) {
                                switch (_k.label) {
                                    case 0: return [4 /*yield*/, generateInvoiceNumber(storeId, attempt - 1)];
                                    case 1:
                                        invoiceNumber = _k.sent();
                                        _k.label = 2;
                                    case 2:
                                        _k.trys.push([2, 4, , 5]);
                                        return [4 /*yield*/, db_1.prisma.$transaction(function (tx) { return __awaiter(_this, void 0, void 0, function () {
                                                var created, _i, _a, it, entry, visitDate;
                                                var _b;
                                                return __generator(this, function (_c) {
                                                    switch (_c.label) {
                                                        case 0: return [4 /*yield*/, tx.sale.create({
                                                                data: {
                                                                    storeId: storeId,
                                                                    invoiceNumber: invoiceNumber,
                                                                    customerId: customer.id,
                                                                    customerName: customer.name,
                                                                    customerPhone: customer.mobile,
                                                                    customerEmail: customer.email,
                                                                    subtotal: subtotal,
                                                                    discountAmount: discountAmount,
                                                                    taxAmount: taxAmount,
                                                                    total: finalPayableAmount,
                                                                    calculatedTotal: calculatedTotal,
                                                                    roundOffAmount: roundOffAmount,
                                                                    finalPayableAmount: finalPayableAmount,
                                                                    amountPaid: amountPaid,
                                                                    amountDue: amountDue,
                                                                    paymentMethod: primaryPaymentMethod,
                                                                    paymentStatus: paymentStatus,
                                                                    status: "COMPLETED",
                                                                    createdBy: userId,
                                                                    transactionDate: transactionDate,
                                                                    promoCodeId: resolvedPromoCodeId,
                                                                    items: {
                                                                        create: input.items.map(function (it, index) {
                                                                            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
                                                                            var snapshot = pricing.snapshots[index];
                                                                            return {
                                                                                productId: it.productId,
                                                                                sizeId: it.sizeId,
                                                                                quantity: it.quantity,
                                                                                unitPrice: it.unitPrice,
                                                                                total: it.unitPrice * it.quantity,
                                                                                mrp: (_a = snapshot === null || snapshot === void 0 ? void 0 : snapshot.mrp) !== null && _a !== void 0 ? _a : it.unitPrice,
                                                                                sellingPrice: (_b = snapshot === null || snapshot === void 0 ? void 0 : snapshot.sellingPrice) !== null && _b !== void 0 ? _b : it.unitPrice,
                                                                                discountType: (_c = snapshot === null || snapshot === void 0 ? void 0 : snapshot.discountType) !== null && _c !== void 0 ? _c : null,
                                                                                appliedDiscountPercent: (_d = snapshot === null || snapshot === void 0 ? void 0 : snapshot.appliedDiscountPercent) !== null && _d !== void 0 ? _d : null,
                                                                                allocatedDiscount: (_e = snapshot === null || snapshot === void 0 ? void 0 : snapshot.allocatedDiscount) !== null && _e !== void 0 ? _e : 0,
                                                                                taxableAmount: (_f = snapshot === null || snapshot === void 0 ? void 0 : snapshot.taxableAmount) !== null && _f !== void 0 ? _f : 0,
                                                                                taxAmount: (_g = snapshot === null || snapshot === void 0 ? void 0 : snapshot.taxAmount) !== null && _g !== void 0 ? _g : 0,
                                                                                finalUnitPrice: (_h = snapshot === null || snapshot === void 0 ? void 0 : snapshot.finalUnitPrice) !== null && _h !== void 0 ? _h : it.unitPrice,
                                                                                finalLineAmount: (_j = snapshot === null || snapshot === void 0 ? void 0 : snapshot.finalLineAmount) !== null && _j !== void 0 ? _j : it.unitPrice * it.quantity,
                                                                                effectiveUnitPrice: (_k = snapshot === null || snapshot === void 0 ? void 0 : snapshot.effectiveUnitPrice) !== null && _k !== void 0 ? _k : it.unitPrice,
                                                                                costPrice: (_l = snapshot === null || snapshot === void 0 ? void 0 : snapshot.costPrice) !== null && _l !== void 0 ? _l : null,
                                                                                pricingSnapshotDate: (_m = snapshot === null || snapshot === void 0 ? void 0 : snapshot.pricingSnapshotDate) !== null && _m !== void 0 ? _m : transactionDate,
                                                                            };
                                                                        }),
                                                                    },
                                                                    payments: paymentEntries.length > 0
                                                                        ? {
                                                                            create: paymentEntries.map(function (entry) { return ({
                                                                                amount: entry.amount,
                                                                                method: entry.method,
                                                                                businessDate: transactionDate,
                                                                                createdBy: userId,
                                                                            }); }),
                                                                        }
                                                                        : undefined,
                                                                },
                                                                include: saleInclude,
                                                            })];
                                                        case 1:
                                                            created = _c.sent();
                                                            if (!resolvedPromoCodeId) return [3 /*break*/, 3];
                                                            return [4 /*yield*/, tx.promoCode.update({
                                                                    where: { id: resolvedPromoCodeId },
                                                                    data: { usageCount: { increment: 1 } },
                                                                })];
                                                        case 2:
                                                            _c.sent();
                                                            _c.label = 3;
                                                        case 3:
                                                            _i = 0, _a = input.items;
                                                            _c.label = 4;
                                                        case 4:
                                                            if (!(_i < _a.length)) return [3 /*break*/, 9];
                                                            it = _a[_i];
                                                            return [4 /*yield*/, tx.stockEntry.findUnique({
                                                                    where: { productId_sizeId_storeId: { productId: it.productId, sizeId: it.sizeId, storeId: storeId } },
                                                                })];
                                                        case 5:
                                                            entry = _c.sent();
                                                            if (!entry || entry.quantity < it.quantity) {
                                                                throw new Error("Insufficient stock: only ".concat((_b = entry === null || entry === void 0 ? void 0 : entry.quantity) !== null && _b !== void 0 ? _b : 0, " available for size ").concat(it.sizeId));
                                                            }
                                                            return [4 /*yield*/, tx.stockEntry.update({
                                                                    where: { productId_sizeId_storeId: { productId: it.productId, sizeId: it.sizeId, storeId: storeId } },
                                                                    data: { quantity: { decrement: it.quantity } },
                                                                })];
                                                        case 6:
                                                            _c.sent();
                                                            return [4 /*yield*/, tx.stockMovement.create({
                                                                    data: {
                                                                        productId: it.productId,
                                                                        sizeId: it.sizeId,
                                                                        storeId: storeId,
                                                                        type: "SALE",
                                                                        quantity: it.quantity,
                                                                        reason: "Sale ".concat(invoiceNumber),
                                                                        referenceType: "SALE",
                                                                        referenceId: created.id,
                                                                        movementDate: input.transactionDate ? new Date(input.transactionDate) : new Date(),
                                                                        createdBy: userId,
                                                                    },
                                                                })];
                                                        case 7:
                                                            _c.sent();
                                                            _c.label = 8;
                                                        case 8:
                                                            _i++;
                                                            return [3 /*break*/, 4];
                                                        case 9:
                                                            visitDate = input.transactionDate ? new Date(input.transactionDate) : new Date();
                                                            return [4 /*yield*/, tx.customer.update({
                                                                    where: { id: customer.id },
                                                                    data: {
                                                                        lastVisitAt: visitDate,
                                                                        totalSpent: { increment: finalPayableAmount },
                                                                        totalVisits: { increment: 1 },
                                                                    },
                                                                })];
                                                        case 10:
                                                            _c.sent();
                                                            return [2 /*return*/, created];
                                                    }
                                                });
                                            }); })];
                                    case 3:
                                        sale_1 = _k.sent();
                                        // TODO: Remove temporary debug logs before production
                                        console.log("[WHATSAPP_DEBUG] Sale created successfully. SaleId=".concat(sale_1.id, " InvoiceNumber=").concat(sale_1.invoiceNumber, " CustomerId=").concat((_h = sale_1.customerId) !== null && _h !== void 0 ? _h : customer.id, " OrgId=").concat(orgId, " CustomerMobile=").concat(sale_1.customerPhone ? "***masked***" : "missing"));
                                        // TODO: Remove temporary debug logs before production
                                        console.log("[WHATSAPP_DEBUG] WhatsApp queue initiated. SaleId=".concat(sale_1.id, " InvoiceNumber=").concat(sale_1.invoiceNumber, " OrgId=").concat(orgId, " CustomerMobile=").concat(sale_1.customerPhone ? "***masked***" : "missing"));
                                        if (process.env.NODE_ENV !== "development") {
                                            setTimeout(function () {
                                                var _a, _b, _c, _d;
                                                // TODO: Remove temporary debug logs before production
                                                console.log("[WHATSAPP_DEBUG] Background task started. SaleId=".concat(sale_1.id, " InvoiceNumber=").concat(sale_1.invoiceNumber, " OrgId=").concat(orgId));
                                                var backgroundStartedAt = Date.now();
                                                void whatsappInvoiceService_1.whatsappInvoiceService.queueInvoiceDelivery({
                                                    orgId: orgId,
                                                    storeId: storeId,
                                                    saleId: sale_1.id,
                                                    invoiceNumber: sale_1.invoiceNumber,
                                                    customerName: sale_1.customerName,
                                                    customerPhone: sale_1.customerPhone,
                                                    customerEmail: sale_1.customerEmail,
                                                    amount: Number((_b = (_a = sale_1.finalPayableAmount) !== null && _a !== void 0 ? _a : sale_1.total) !== null && _b !== void 0 ? _b : 0),
                                                    currency: "INR",
                                                    saleDate: (_c = sale_1.transactionDate) !== null && _c !== void 0 ? _c : sale_1.createdAt,
                                                    items: ((_d = sale_1.items) !== null && _d !== void 0 ? _d : []).map(function (item) {
                                                        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
                                                        var attributes = (_b = (_a = item.product) === null || _a === void 0 ? void 0 : _a.attributes) !== null && _b !== void 0 ? _b : {};
                                                        return {
                                                            id: item.id,
                                                            productId: item.productId,
                                                            productName: (_d = (_c = item.product) === null || _c === void 0 ? void 0 : _c.name) !== null && _d !== void 0 ? _d : "",
                                                            sku: (_f = (_e = item.product) === null || _e === void 0 ? void 0 : _e.sku) !== null && _f !== void 0 ? _f : "",
                                                            sizeId: item.sizeId,
                                                            sizeLabel: (_h = (_g = item.size) === null || _g === void 0 ? void 0 : _g.label) !== null && _h !== void 0 ? _h : "",
                                                            attributes: attributes,
                                                            description: typeof attributes.description === "string" ? attributes.description : undefined,
                                                            brandName: (_l = (_k = (_j = item.product) === null || _j === void 0 ? void 0 : _j.brand) === null || _k === void 0 ? void 0 : _k.name) !== null && _l !== void 0 ? _l : undefined,
                                                            categoryName: (_p = (_o = (_m = item.product) === null || _m === void 0 ? void 0 : _m.category) === null || _o === void 0 ? void 0 : _o.name) !== null && _p !== void 0 ? _p : undefined,
                                                            quantity: item.quantity,
                                                            unitPrice: Number(item.unitPrice),
                                                            total: Number(item.total),
                                                            mrp: item.mrp != null ? Number(item.mrp) : Number(item.unitPrice),
                                                            sellingPrice: item.sellingPrice != null ? Number(item.sellingPrice) : Number(item.unitPrice),
                                                            discountType: item.discountType === "PERCENTAGE" || item.discountType === "FLAT" ? item.discountType : undefined,
                                                            appliedDiscountPercent: item.appliedDiscountPercent != null ? Number(item.appliedDiscountPercent) : undefined,
                                                            allocatedDiscount: item.allocatedDiscount != null ? Number(item.allocatedDiscount) : undefined,
                                                            taxableAmount: item.taxableAmount != null ? Number(item.taxableAmount) : undefined,
                                                            taxAmount: item.taxAmount != null ? Number(item.taxAmount) : undefined,
                                                            finalUnitPrice: item.finalUnitPrice != null ? Number(item.finalUnitPrice) : Number(item.unitPrice),
                                                            finalLineAmount: item.finalLineAmount != null ? Number(item.finalLineAmount) : Number(item.total),
                                                            effectiveUnitPrice: item.effectiveUnitPrice != null ? Number(item.effectiveUnitPrice) : Number(item.unitPrice),
                                                            costPrice: item.costPrice != null ? Number(item.costPrice) : undefined,
                                                            pricingSnapshotDate: item.pricingSnapshotDate instanceof Date ? item.pricingSnapshotDate.toISOString() : (_q = item.pricingSnapshotDate) !== null && _q !== void 0 ? _q : undefined,
                                                        };
                                                    }),
                                                }).catch(function (error) {
                                                    // TODO: Remove temporary debug logs before production
                                                    console.error("[WHATSAPP_DEBUG] Background task exception. Stage=QueueInvoiceDelivery SaleId=".concat(sale_1.id, " InvoiceNumber=").concat(sale_1.invoiceNumber, " OrgId=").concat(orgId, " CustomerMobile=").concat(sale_1.customerPhone ? "***masked***" : "missing", " Error=").concat(error instanceof Error ? error.message : String(error), " Stack=").concat(error instanceof Error ? error.stack : ""));
                                                }).finally(function () {
                                                    // TODO: Remove temporary debug logs before production
                                                    console.log("[WHATSAPP_DEBUG] Background task completed. SaleId=".concat(sale_1.id, " InvoiceNumber=").concat(sale_1.invoiceNumber, " OrgId=").concat(orgId, " DurationMs=").concat(Date.now() - backgroundStartedAt));
                                                });
                                            }, 0);
                                        }
                                        else {
                                            console.log("[WHATSAPP_DEBUG] WhatsApp background queue suppressed in development. SaleId=".concat(sale_1.id, " InvoiceNumber=").concat(sale_1.invoiceNumber, " OrgId=").concat(orgId));
                                        }
                                        return [2 /*return*/, { value: toSaleDto(sale_1) }];
                                    case 4:
                                        error_1 = _k.sent();
                                        // TODO: Remove temporary debug logs before production
                                        console.error("[WHATSAPP_DEBUG] Billing flow exception. Stage=CreateSaleAttempt SaleId=unknown InvoiceNumber=".concat(invoiceNumber, " OrgId=").concat(orgId, " CustomerMobile=").concat(input.customerPhone ? "***masked***" : "missing", " Error=").concat(error_1 instanceof Error ? error_1.message : String(error_1), " Stack=").concat(error_1 instanceof Error ? error_1.stack : ""));
                                        if (attempt < 5 && isInvoiceNumberConflict(error_1)) {
                                            return [2 /*return*/, "continue"];
                                        }
                                        throw error_1;
                                    case 5: return [2 /*return*/];
                                }
                            });
                        };
                        attempt = 1;
                        _j.label = 7;
                    case 7:
                        if (!(attempt <= 5)) return [3 /*break*/, 10];
                        return [5 /*yield**/, _loop_1(attempt)];
                    case 8:
                        state_1 = _j.sent();
                        if (typeof state_1 === "object")
                            return [2 /*return*/, state_1.value];
                        _j.label = 9;
                    case 9:
                        attempt += 1;
                        return [3 /*break*/, 7];
                    case 10: throw new Error("Could not generate a unique invoice number. Please retry.");
                }
            });
        });
    },
    getSaleById: function (orgId, id) {
        return __awaiter(this, void 0, void 0, function () {
            var hasReturnItemsTable, _a, hasLegacyReturnedItemsColumn, hasLegacyExchangedItemsColumn, sale, returnTransactions, historyItems, returnTransactionIds, legacyItemsRows, _b, legacyItemsByTransactionId, legacyHistoryItems, saleLineMap, productIds, sizeIds, _c, products, sizes, stockEntries, _d, productMap, sizeMap, stockEntryByIdMap, stockEntryByVariantMap, enrichHistoryItems, saleWithHistory;
            var _e, _f;
            return __generator(this, function (_g) {
                switch (_g.label) {
                    case 0: return [4 /*yield*/, hasTable("return_transaction_items")];
                    case 1:
                        hasReturnItemsTable = _g.sent();
                        return [4 /*yield*/, Promise.all([
                                hasColumn("return_transactions", "returnedItems"),
                                hasColumn("return_transactions", "exchangedItems"),
                            ])];
                    case 2:
                        _a = _g.sent(), hasLegacyReturnedItemsColumn = _a[0], hasLegacyExchangedItemsColumn = _a[1];
                        return [4 /*yield*/, db_1.prisma.sale.findFirst({
                                where: { id: id, store: { orgId: orgId } },
                                include: __assign(__assign({}, saleInclude), { payments: true, returnTransactions: hasReturnItemsTable
                                        ? {
                                            include: {
                                                items: {
                                                    include: {
                                                        returnedProduct: { select: { name: true, sku: true } },
                                                        returnedSize: { select: { label: true } },
                                                        newProduct: { select: { name: true, sku: true } },
                                                        newSize: { select: { label: true } },
                                                    },
                                                },
                                            },
                                        }
                                        : true }),
                            })];
                    case 3:
                        sale = _g.sent();
                        if (!sale) {
                            return [2 /*return*/, null];
                        }
                        returnTransactions = ((_e = sale.returnTransactions) !== null && _e !== void 0 ? _e : []);
                        historyItems = returnTransactions.flatMap(function (rt) { var _a; return ((_a = rt.items) !== null && _a !== void 0 ? _a : []); });
                        returnTransactionIds = returnTransactions.map(function (rt) { return String(rt.id); }).filter(Boolean);
                        if (!(hasLegacyReturnedItemsColumn && hasLegacyExchangedItemsColumn && returnTransactionIds.length > 0)) return [3 /*break*/, 5];
                        return [4 /*yield*/, db_1.prisma.$queryRaw(templateObject_4 || (templateObject_4 = __makeTemplateObject(["\n            SELECT \"id\", \"returnedItems\", \"exchangedItems\"\n            FROM \"return_transactions\"\n            WHERE \"id\" IN (", ")\n          "], ["\n            SELECT \"id\", \"returnedItems\", \"exchangedItems\"\n            FROM \"return_transactions\"\n            WHERE \"id\" IN (", ")\n          "])), client_1.Prisma.join(returnTransactionIds))];
                    case 4:
                        _b = _g.sent();
                        return [3 /*break*/, 6];
                    case 5:
                        _b = [];
                        _g.label = 6;
                    case 6:
                        legacyItemsRows = _b;
                        legacyItemsByTransactionId = new Map(legacyItemsRows.map(function (row) { return [
                            row.id,
                            {
                                returnedItems: normalizeLegacyTransactionItems(row.returnedItems),
                                exchangedItems: normalizeLegacyTransactionItems(row.exchangedItems),
                            },
                        ]; }));
                        legacyHistoryItems = __spreadArray([], legacyItemsByTransactionId.values(), true).flatMap(function (items) { return __spreadArray(__spreadArray([], items.returnedItems, true), items.exchangedItems, true); });
                        saleLineMap = new Map(((_f = sale.items) !== null && _f !== void 0 ? _f : []).map(function (item) {
                            var _a, _b, _c, _d, _e, _f;
                            return [
                                "".concat(item.productId, ":").concat(item.sizeId),
                                {
                                    productName: (_b = (_a = item.product) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : undefined,
                                    sku: (_d = (_c = item.product) === null || _c === void 0 ? void 0 : _c.sku) !== null && _d !== void 0 ? _d : undefined,
                                    sizeLabel: (_f = (_e = item.size) === null || _e === void 0 ? void 0 : _e.label) !== null && _f !== void 0 ? _f : undefined,
                                },
                            ];
                        }));
                        productIds = __spreadArray([], new Set(__spreadArray(__spreadArray([], historyItems.flatMap(function (item) { return [item.returnedProductId, item.newProductId].filter(Boolean).map(String); }), true), legacyHistoryItems.map(function (item) { return item.productId; }).filter(Boolean), true)), true);
                        sizeIds = __spreadArray([], new Set(__spreadArray(__spreadArray([], historyItems.flatMap(function (item) { return [item.returnedSizeId, item.newSizeId].filter(Boolean).map(String); }), true), legacyHistoryItems.map(function (item) { return item.sizeId; }).filter(Boolean), true)), true);
                        return [4 /*yield*/, Promise.all([
                                productIds.length > 0
                                    ? db_1.prisma.product.findMany({
                                        where: { id: { in: productIds } },
                                        select: { id: true, name: true, sku: true },
                                    })
                                    : [],
                                sizeIds.length > 0
                                    ? db_1.prisma.size.findMany({
                                        where: { id: { in: sizeIds } },
                                        select: { id: true, label: true },
                                    })
                                    : [],
                            ])];
                    case 7:
                        _c = _g.sent(), products = _c[0], sizes = _c[1];
                        if (!(productIds.length > 0)) return [3 /*break*/, 9];
                        return [4 /*yield*/, db_1.prisma.stockEntry.findMany({
                                where: {
                                    OR: [
                                        { id: { in: productIds } },
                                        { productId: { in: productIds } },
                                    ],
                                },
                                include: {
                                    product: { select: { id: true, name: true, sku: true } },
                                    size: { select: { id: true, label: true } },
                                },
                            })];
                    case 8:
                        _d = _g.sent();
                        return [3 /*break*/, 10];
                    case 9:
                        _d = [];
                        _g.label = 10;
                    case 10:
                        stockEntries = _d;
                        productMap = Object.fromEntries(products.map(function (product) { return [product.id, product]; }));
                        sizeMap = Object.fromEntries(sizes.map(function (size) { return [size.id, size.label]; }));
                        stockEntryByIdMap = Object.fromEntries(stockEntries.map(function (entry) { return [entry.id, entry]; }));
                        stockEntryByVariantMap = Object.fromEntries(stockEntries.map(function (entry) { return ["".concat(entry.productId, ":").concat(entry.sizeId), entry]; }));
                        enrichHistoryItems = function (items) {
                            return items.map(function (item) {
                                var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u;
                                var saleLine = saleLineMap.get("".concat(item.productId, ":").concat(item.sizeId));
                                var stockEntryById = stockEntryByIdMap[item.productId];
                                var stockEntryByVariant = stockEntryByVariantMap["".concat(item.productId, ":").concat(item.sizeId)];
                                var stockEntry = stockEntryById !== null && stockEntryById !== void 0 ? stockEntryById : stockEntryByVariant;
                                return __assign(__assign({}, item), { productId: (_a = stockEntry === null || stockEntry === void 0 ? void 0 : stockEntry.productId) !== null && _a !== void 0 ? _a : item.productId, sizeId: (_b = stockEntry === null || stockEntry === void 0 ? void 0 : stockEntry.sizeId) !== null && _b !== void 0 ? _b : item.sizeId, productName: (_h = (_f = (_d = (_c = item.productName) !== null && _c !== void 0 ? _c : saleLine === null || saleLine === void 0 ? void 0 : saleLine.productName) !== null && _d !== void 0 ? _d : (_e = stockEntry === null || stockEntry === void 0 ? void 0 : stockEntry.product) === null || _e === void 0 ? void 0 : _e.name) !== null && _f !== void 0 ? _f : (_g = productMap[item.productId]) === null || _g === void 0 ? void 0 : _g.name) !== null && _h !== void 0 ? _h : item.productId, sku: (_p = (_m = (_k = (_j = item.sku) !== null && _j !== void 0 ? _j : saleLine === null || saleLine === void 0 ? void 0 : saleLine.sku) !== null && _k !== void 0 ? _k : (_l = stockEntry === null || stockEntry === void 0 ? void 0 : stockEntry.product) === null || _l === void 0 ? void 0 : _l.sku) !== null && _m !== void 0 ? _m : (_o = productMap[item.productId]) === null || _o === void 0 ? void 0 : _o.sku) !== null && _p !== void 0 ? _p : item.productId, sizeLabel: (_u = (_t = (_r = (_q = item.sizeLabel) !== null && _q !== void 0 ? _q : saleLine === null || saleLine === void 0 ? void 0 : saleLine.sizeLabel) !== null && _r !== void 0 ? _r : (_s = stockEntry === null || stockEntry === void 0 ? void 0 : stockEntry.size) === null || _s === void 0 ? void 0 : _s.label) !== null && _t !== void 0 ? _t : sizeMap[item.sizeId]) !== null && _u !== void 0 ? _u : item.sizeId });
                            });
                        };
                        saleWithHistory = __assign(__assign({}, sale), { returnTransactions: returnTransactions.map(function (rt) {
                                var _a, _b, _c;
                                var items = (_a = rt.items) !== null && _a !== void 0 ? _a : [];
                                var legacyItems = legacyItemsByTransactionId.get(String(rt.id));
                                var returnedItems = enrichHistoryItems(items
                                    .filter(function (it) { return it.returnedProductId; })
                                    .map(function (item) {
                                    var _a, _b, _c, _d, _e, _f, _g;
                                    return ({
                                        productId: String(item.returnedProductId),
                                        sizeId: String(item.returnedSizeId),
                                        quantity: Number(item.returnedQuantity),
                                        total: Number((_a = item.returnedUnitPrice) !== null && _a !== void 0 ? _a : 0) * Number((_b = item.returnedQuantity) !== null && _b !== void 0 ? _b : 0),
                                        productName: (_d = (_c = productMap[String(item.returnedProductId)]) === null || _c === void 0 ? void 0 : _c.name) !== null && _d !== void 0 ? _d : undefined,
                                        sku: (_f = (_e = productMap[String(item.returnedProductId)]) === null || _e === void 0 ? void 0 : _e.sku) !== null && _f !== void 0 ? _f : undefined,
                                        sizeLabel: (_g = sizeMap[String(item.returnedSizeId)]) !== null && _g !== void 0 ? _g : undefined,
                                    });
                                }));
                                var exchangedItems = enrichHistoryItems(items
                                    .filter(function (it) { return it.newProductId; })
                                    .map(function (item) {
                                    var _a, _b, _c, _d, _e, _f, _g;
                                    return ({
                                        productId: String(item.newProductId),
                                        sizeId: String(item.newSizeId),
                                        quantity: Number(item.newQuantity),
                                        total: Number((_a = item.newUnitPrice) !== null && _a !== void 0 ? _a : 0) * Number((_b = item.newQuantity) !== null && _b !== void 0 ? _b : 0),
                                        productName: (_d = (_c = productMap[String(item.newProductId)]) === null || _c === void 0 ? void 0 : _c.name) !== null && _d !== void 0 ? _d : undefined,
                                        sku: (_f = (_e = productMap[String(item.newProductId)]) === null || _e === void 0 ? void 0 : _e.sku) !== null && _f !== void 0 ? _f : undefined,
                                        sizeLabel: (_g = sizeMap[String(item.newSizeId)]) !== null && _g !== void 0 ? _g : undefined,
                                    });
                                }));
                                return __assign(__assign({}, rt), { returnedItems: returnedItems.length > 0 ? returnedItems : enrichHistoryItems((_b = legacyItems === null || legacyItems === void 0 ? void 0 : legacyItems.returnedItems) !== null && _b !== void 0 ? _b : []), exchangedItems: exchangedItems.length > 0 ? exchangedItems : enrichHistoryItems((_c = legacyItems === null || legacyItems === void 0 ? void 0 : legacyItems.exchangedItems) !== null && _c !== void 0 ? _c : []) });
                            }) });
                        return [2 /*return*/, toSaleDto(saleWithHistory)];
                }
            });
        });
    },
    getSales: function (orgId, filters) {
        return __awaiter(this, void 0, void 0, function () {
            var hasReturnItemsTable, supportsExchangedStatus, saleWhere, dateFilters, from, end, from, from, rtWhere, end, _a, sales, returnTxns, salesRows, rtRows, unified;
            var _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        console.log("billingService.getSales called", { orgId: orgId, filters: filters });
                        try {
                            // proceed
                        }
                        catch (err) {
                            console.error("billingService.getSales error:", err);
                            throw err;
                        }
                        return [4 /*yield*/, hasTable("return_transaction_items")];
                    case 1:
                        hasReturnItemsTable = _d.sent();
                        return [4 /*yield*/, supportsExchangedSaleStatus()];
                    case 2:
                        supportsExchangedStatus = _d.sent();
                        saleWhere = { store: { orgId: orgId } };
                        if (filters === null || filters === void 0 ? void 0 : filters.status) {
                            if (filters.status === "EXCHANGED" && !supportsExchangedStatus) {
                                // Legacy DBs may not have EXCHANGED in SaleStatus enum yet.
                                // Degrade gracefully to COMPLETED instead of throwing P2007.
                                saleWhere.status = "COMPLETED";
                            }
                            else {
                                saleWhere.status = filters.status;
                            }
                        }
                        if (filters === null || filters === void 0 ? void 0 : filters.paymentMethod)
                            saleWhere.paymentMethod = filters.paymentMethod;
                        // Date range filter: use transactionDate (canonical for backdated billing) with
                        // an OR fallback to createdAt so records created before the transactionDate
                        // migration (20260509000000) are still included.
                        if ((filters === null || filters === void 0 ? void 0 : filters.startDate) || (filters === null || filters === void 0 ? void 0 : filters.endDate)) {
                            dateFilters = [];
                            if (filters.startDate) {
                                from = new Date(filters.startDate);
                                dateFilters.push({ transactionDate: { gte: from } });
                                dateFilters.push({ createdAt: { gte: from } });
                            }
                            if (filters.endDate) {
                                end = new Date(filters.endDate);
                                end.setDate(end.getDate() + 1);
                                // Combine start + end into the same OR clause
                                if (filters.startDate) {
                                    from = new Date(filters.startDate);
                                    saleWhere.OR = [
                                        { transactionDate: { gte: from, lt: end } },
                                        { createdAt: { gte: from, lt: end } },
                                    ];
                                }
                                else {
                                    saleWhere.OR = [
                                        { transactionDate: { lt: end } },
                                        { createdAt: { lt: end } },
                                    ];
                                }
                            }
                            else if (filters.startDate) {
                                from = new Date(filters.startDate);
                                saleWhere.OR = [
                                    { transactionDate: { gte: from } },
                                    { createdAt: { gte: from } },
                                ];
                            }
                        }
                        if (filters === null || filters === void 0 ? void 0 : filters.search) {
                            saleWhere.OR = [
                                { invoiceNumber: { contains: filters.search, mode: "insensitive" } },
                                { customerName: { contains: filters.search, mode: "insensitive" } },
                            ];
                        }
                        rtWhere = { store: { orgId: orgId } };
                        if (filters === null || filters === void 0 ? void 0 : filters.startDate)
                            rtWhere.businessDate = __assign(__assign({}, ((_b = rtWhere.businessDate) !== null && _b !== void 0 ? _b : {})), { gte: new Date(filters.startDate) });
                        if (filters === null || filters === void 0 ? void 0 : filters.endDate) {
                            end = new Date(filters.endDate);
                            end.setDate(end.getDate() + 1);
                            rtWhere.businessDate = __assign(__assign({}, ((_c = rtWhere.businessDate) !== null && _c !== void 0 ? _c : {})), { lt: end });
                        }
                        if (filters === null || filters === void 0 ? void 0 : filters.search) {
                            rtWhere.OR = [
                                { referenceNumber: { contains: filters.search, mode: "insensitive" } },
                                { sale: { invoiceNumber: { contains: filters.search, mode: "insensitive" } } },
                                { customer: { name: { contains: filters.search, mode: "insensitive" } } },
                            ];
                        }
                        // Apply type filter constraints on return transactions when requested
                        if ((filters === null || filters === void 0 ? void 0 : filters.type) === "EXCHANGE")
                            rtWhere.type = "EXCHANGE";
                        if ((filters === null || filters === void 0 ? void 0 : filters.type) === "RETURN")
                            rtWhere.type = { in: ["RETURN", "RETURN_EXCHANGE"] };
                        return [4 /*yield*/, Promise.all([
                                db_1.prisma.sale.findMany({
                                    where: saleWhere,
                                    include: { items: { include: { product: true, size: true } }, customer: true, payments: { include: { user: { select: { name: true } } } }, user: { select: { name: true } } },
                                    orderBy: { createdAt: "desc" },
                                }),
                                db_1.prisma.returnTransaction.findMany({
                                    where: rtWhere,
                                    include: hasReturnItemsTable
                                        ? {
                                            items: {
                                                include: {
                                                    returnedProduct: { select: { name: true, sku: true } },
                                                    returnedSize: { select: { label: true } },
                                                    newProduct: { select: { name: true, sku: true } },
                                                    newSize: { select: { label: true } },
                                                },
                                            },
                                            sale: { select: { invoiceNumber: true, id: true } },
                                            customer: true,
                                            user: { select: { name: true } },
                                        }
                                        : {
                                            sale: { select: { invoiceNumber: true, id: true } },
                                            customer: true,
                                            user: { select: { name: true } },
                                        },
                                    orderBy: { businessDate: "desc" },
                                }),
                            ])];
                    case 3:
                        _a = _d.sent(), sales = _a[0], returnTxns = _a[1];
                        salesRows = sales.map(function (s) {
                            var _a, _b, _c;
                            return (__assign(__assign({}, s), { rowType: "SALE", paymentMethod: derivePresentationPaymentMethod(s.paymentMethod, s.payments), payments: ((_a = s.payments) !== null && _a !== void 0 ? _a : []).map(function (p) {
                                    var _a;
                                    return (__assign(__assign({}, p), { amount: Number((_a = p.amount) !== null && _a !== void 0 ? _a : 0), businessDate: p.businessDate instanceof Date ? p.businessDate.toISOString() : p.businessDate, paidAt: p.paidAt instanceof Date ? p.paidAt.toISOString() : p.paidAt }));
                                }), transactionDate: s.transactionDate instanceof Date ? s.transactionDate.toISOString() : s.transactionDate, createdAt: s.createdAt instanceof Date ? s.createdAt.toISOString() : s.createdAt, userName: (_c = (_b = s.user) === null || _b === void 0 ? void 0 : _b.name) !== null && _c !== void 0 ? _c : null }));
                        });
                        rtRows = returnTxns.map(function (r) {
                            var _a, _b, _c, _d, _e, _f;
                            return (__assign(__assign({}, r), { rowType: "RETURN_TRANSACTION", businessDate: r.businessDate instanceof Date ? r.businessDate.toISOString() : r.businessDate, createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt, saleInvoiceNumber: (_b = (_a = r.sale) === null || _a === void 0 ? void 0 : _a.invoiceNumber) !== null && _b !== void 0 ? _b : undefined, customerName: (_d = (_c = r.customer) === null || _c === void 0 ? void 0 : _c.name) !== null && _d !== void 0 ? _d : null, userName: (_f = (_e = r.user) === null || _e === void 0 ? void 0 : _e.name) !== null && _f !== void 0 ? _f : null }));
                        });
                        unified = __spreadArray(__spreadArray([], salesRows, true), rtRows, true);
                        // Apply top-level type filter (if user explicitly asked for SALES only)
                        if ((filters === null || filters === void 0 ? void 0 : filters.type) === "SALE") {
                            unified = unified.filter(function (r) { return r.rowType === "SALE"; });
                        }
                        // If user asked for only EXCHANGE rows (return transactions of type EXCHANGE)
                        if ((filters === null || filters === void 0 ? void 0 : filters.type) === "EXCHANGE") {
                            unified = unified.filter(function (r) { return r.rowType === "RETURN_TRANSACTION" && r.type === "EXCHANGE"; });
                        }
                        // If user asked for RETURNS only, include RETURN and RETURN_EXCHANGE rows
                        if ((filters === null || filters === void 0 ? void 0 : filters.type) === "RETURN") {
                            unified = unified.filter(function (r) { return r.rowType === "RETURN_TRANSACTION" && (r.type === "RETURN" || r.type === "RETURN_EXCHANGE"); });
                        }
                        // Sort by createdAt desc
                        unified.sort(function (a, b) { var _a, _b; return new Date((_a = b.businessDate) !== null && _a !== void 0 ? _a : b.createdAt).getTime() - new Date((_b = a.businessDate) !== null && _b !== void 0 ? _b : a.createdAt).getTime(); });
                        return [2 /*return*/, unified];
                }
            });
        });
    },
    refundSale: function (orgId, saleId) {
        return __awaiter(this, void 0, void 0, function () {
            var existing, updated;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.prisma.sale.findFirst({
                            where: { id: saleId, store: { orgId: orgId } },
                            include: saleInclude,
                        })];
                    case 1:
                        existing = _a.sent();
                        if (!existing || existing.status === "REFUNDED")
                            return [2 /*return*/, null];
                        return [4 /*yield*/, db_1.prisma.$transaction(function (tx) { return __awaiter(_this, void 0, void 0, function () {
                                var sale, _i, _a, it, spend, visits, latestCompletedSale;
                                var _b, _c;
                                return __generator(this, function (_d) {
                                    switch (_d.label) {
                                        case 0: return [4 /*yield*/, tx.sale.update({
                                                where: { id: saleId },
                                                data: {
                                                    status: "REFUNDED",
                                                    returnStatus: "FULL",
                                                    amountDue: 0,
                                                },
                                                include: saleInclude,
                                            })];
                                        case 1:
                                            sale = _d.sent();
                                            _i = 0, _a = existing.items;
                                            _d.label = 2;
                                        case 2:
                                            if (!(_i < _a.length)) return [3 /*break*/, 6];
                                            it = _a[_i];
                                            return [4 /*yield*/, tx.stockEntry.updateMany({
                                                    where: { productId: it.productId, sizeId: it.sizeId, storeId: existing.storeId },
                                                    data: { quantity: { increment: it.quantity } },
                                                })];
                                        case 3:
                                            _d.sent();
                                            return [4 /*yield*/, tx.stockMovement.create({
                                                    data: {
                                                        productId: it.productId,
                                                        sizeId: it.sizeId,
                                                        storeId: existing.storeId,
                                                        type: "RETURN",
                                                        quantity: it.quantity,
                                                        reason: "Refund for sale ".concat(existing.invoiceNumber),
                                                        referenceType: "SALE",
                                                        referenceId: saleId,
                                                        createdBy: existing.createdBy,
                                                    },
                                                })];
                                        case 4:
                                            _d.sent();
                                            _d.label = 5;
                                        case 5:
                                            _i++;
                                            return [3 /*break*/, 2];
                                        case 6:
                                            if (!existing.customerId) return [3 /*break*/, 11];
                                            return [4 /*yield*/, tx.sale.aggregate({
                                                    where: {
                                                        customerId: existing.customerId,
                                                        status: "COMPLETED",
                                                        store: { orgId: orgId },
                                                    },
                                                    _sum: { total: true },
                                                })];
                                        case 7:
                                            spend = _d.sent();
                                            return [4 /*yield*/, tx.sale.count({
                                                    where: {
                                                        customerId: existing.customerId,
                                                        status: "COMPLETED",
                                                        store: { orgId: orgId },
                                                    },
                                                })];
                                        case 8:
                                            visits = _d.sent();
                                            return [4 /*yield*/, tx.sale.findFirst({
                                                    where: {
                                                        customerId: existing.customerId,
                                                        status: "COMPLETED",
                                                        store: { orgId: orgId },
                                                    },
                                                    orderBy: { transactionDate: "desc" },
                                                    select: { transactionDate: true },
                                                })];
                                        case 9:
                                            latestCompletedSale = _d.sent();
                                            return [4 /*yield*/, tx.customer.update({
                                                    where: { id: existing.customerId },
                                                    data: {
                                                        totalSpent: Number((_b = spend._sum.total) !== null && _b !== void 0 ? _b : 0),
                                                        totalVisits: visits,
                                                        lastVisitAt: (_c = latestCompletedSale === null || latestCompletedSale === void 0 ? void 0 : latestCompletedSale.transactionDate) !== null && _c !== void 0 ? _c : null,
                                                    },
                                                })];
                                        case 10:
                                            _d.sent();
                                            _d.label = 11;
                                        case 11: return [2 /*return*/, sale];
                                    }
                                });
                            }); })];
                    case 2:
                        updated = _a.sent();
                        return [2 /*return*/, toSaleDto(updated)];
                }
            });
        });
    },
    recordSalePayment: function (orgId, saleId, userId, input) {
        return __awaiter(this, void 0, void 0, function () {
            var sale, normalizedEntries, paymentDelta, currentAmountDue, amountPaid, finalPayableAmount, amountDue, paymentStatus, primaryMethodForSale, updated;
            var _this = this;
            var _a, _b, _c, _d, _e;
            return __generator(this, function (_f) {
                switch (_f.label) {
                    case 0: return [4 /*yield*/, db_1.prisma.sale.findFirst({
                            where: { id: saleId, store: { orgId: orgId } },
                        })];
                    case 1:
                        sale = _f.sent();
                        if (!sale || sale.status !== "COMPLETED") {
                            throw new Error("Sale not found or not eligible for payment updates");
                        }
                        if (sale.paymentStatus === "PAID") {
                            throw new Error("This sale is already fully paid");
                        }
                        normalizedEntries = normalizePaymentEntries(input.splitPayments, input.method, Number((_a = input.amount) !== null && _a !== void 0 ? _a : 0));
                        paymentDelta = round2(normalizedEntries.reduce(function (sum, entry) { return sum + entry.amount; }, 0));
                        if (paymentDelta <= 0)
                            throw new Error("Payment amount must be greater than zero");
                        currentAmountDue = Number((_b = sale.amountDue) !== null && _b !== void 0 ? _b : 0);
                        if (paymentDelta > currentAmountDue + EPSILON) {
                            throw new Error("Payment cannot exceed outstanding balance of \u20B9".concat(currentAmountDue.toFixed(2)));
                        }
                        amountPaid = Number((_c = sale.amountPaid) !== null && _c !== void 0 ? _c : 0) + paymentDelta;
                        finalPayableAmount = Number((_d = sale.finalPayableAmount) !== null && _d !== void 0 ? _d : sale.total);
                        amountDue = Math.max(finalPayableAmount - amountPaid, 0);
                        paymentStatus = amountPaid >= finalPayableAmount ? "PAID" : "PARTIAL";
                        primaryMethodForSale = getPrimaryPaymentMethod(normalizedEntries, (_e = input.method) !== null && _e !== void 0 ? _e : sale.paymentMethod);
                        return [4 /*yield*/, db_1.prisma.$transaction(function (tx) { return __awaiter(_this, void 0, void 0, function () {
                                var updatedSale;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, tx.salePayment.createMany({
                                                data: normalizedEntries.map(function (entry) { return ({
                                                    saleId: saleId,
                                                    amount: entry.amount,
                                                    method: entry.method,
                                                    note: input.note,
                                                    businessDate: input.businessDate ? new Date(input.businessDate) : new Date(),
                                                    createdBy: userId,
                                                }); }),
                                            })];
                                        case 1:
                                            _a.sent();
                                            return [4 /*yield*/, tx.sale.update({
                                                    where: { id: saleId },
                                                    data: {
                                                        amountPaid: { increment: paymentDelta },
                                                        amountDue: amountDue,
                                                        paymentStatus: paymentStatus,
                                                        paymentMethod: primaryMethodForSale,
                                                    },
                                                    include: {
                                                        items: { include: { product: true, size: true } },
                                                        customer: true,
                                                        payments: { include: { user: { select: { name: true } } }, orderBy: { paidAt: "desc" } },
                                                        user: { select: { name: true } },
                                                    },
                                                })];
                                        case 2:
                                            updatedSale = _a.sent();
                                            if (!sale.customerId) return [3 /*break*/, 4];
                                            return [4 /*yield*/, tx.customer.update({
                                                    where: { id: sale.customerId },
                                                    data: { totalSpent: { increment: paymentDelta } },
                                                })];
                                        case 3:
                                            _a.sent();
                                            _a.label = 4;
                                        case 4: return [2 /*return*/, updatedSale];
                                    }
                                });
                            }); })];
                    case 2:
                        updated = _f.sent();
                        return [2 /*return*/, toSaleDto(updated)];
                }
            });
        });
    },
    createReturnTransaction: function (orgId, saleId, userId, input) {
        return __awaiter(this, void 0, void 0, function () {
            var supportsExchangedStatus, hasReturnItemsTable, _a, hasLegacyReturnedItemsColumn, hasLegacyExchangedItemsColumn, sale, exchangeWindowMs, saleItemsByKey, _i, _b, item, returnedLineItems, exchangedLineItems, returnedItemsJson, exchangedItemsJson, returnedQty, _c, _d, item, key, existingSaleItem, _e, _f, item, totalQty, returnStatus, returnedTotal, exchangedTotal, baseForDiscount, discountType, discountPercent, discountAmountInput, discountAmount, calculatedTotal, taxRate, taxAmount, calculatedWithTax, finalPayable, roundOffAmount, netAmount, offsetAmount, refundAmount, businessDate, transactionDate, _loop_2, attempt, state_2;
            var _this = this;
            var _g, _h, _j, _k, _l, _m;
            return __generator(this, function (_o) {
                switch (_o.label) {
                    case 0: return [4 /*yield*/, supportsExchangedSaleStatus()];
                    case 1:
                        supportsExchangedStatus = _o.sent();
                        return [4 /*yield*/, hasTable("return_transaction_items")];
                    case 2:
                        hasReturnItemsTable = _o.sent();
                        return [4 /*yield*/, Promise.all([
                                hasColumn("return_transactions", "returnedItems"),
                                hasColumn("return_transactions", "exchangedItems"),
                            ])];
                    case 3:
                        _a = _o.sent(), hasLegacyReturnedItemsColumn = _a[0], hasLegacyExchangedItemsColumn = _a[1];
                        return [4 /*yield*/, db_1.prisma.sale.findFirst({
                                where: { id: saleId, store: { orgId: orgId } },
                                include: { items: true },
                            })];
                    case 4:
                        sale = _o.sent();
                        if (!sale) {
                            throw new Error("Sale not found");
                        }
                        if (sale.status !== "COMPLETED") {
                            throw new Error("Only completed sales can be returned or exchanged");
                        }
                        exchangeWindowMs = 30 * 24 * 60 * 60 * 1000;
                        if (Date.now() - sale.createdAt.getTime() > exchangeWindowMs) {
                            throw new Error("Exchange/return window has expired for this sale");
                        }
                        saleItemsByKey = new Map();
                        for (_i = 0, _b = sale.items; _i < _b.length; _i++) {
                            item = _b[_i];
                            saleItemsByKey.set("".concat(item.productId, ":").concat(item.sizeId), item);
                        }
                        returnedLineItems = input.returnedItems.map(function (item) {
                            var historicalSaleItem = saleItemsByKey.get("".concat(item.productId, ":").concat(item.sizeId));
                            var historicalUnitAmount = historicalSaleItem
                                ? extractHistoricalUnitAmount(historicalSaleItem)
                                : round2(Number(item.total) / Math.max(1, item.quantity));
                            return __assign(__assign({}, item), { historicalUnitAmount: historicalUnitAmount, total: round2(historicalUnitAmount * item.quantity) });
                        });
                        exchangedLineItems = ((_g = input.exchangedItems) !== null && _g !== void 0 ? _g : []).map(function (item) {
                            var _a;
                            return (__assign(__assign({}, item), { total: round2(Number((_a = item.total) !== null && _a !== void 0 ? _a : 0)) }));
                        });
                        returnedItemsJson = returnedLineItems.map(function (item) { return ({
                            productId: item.productId,
                            sizeId: item.sizeId,
                            quantity: item.quantity,
                            total: item.total,
                        }); });
                        exchangedItemsJson = exchangedLineItems.map(function (item) { return ({
                            productId: item.productId,
                            sizeId: item.sizeId,
                            quantity: item.quantity,
                            total: item.total,
                        }); });
                        returnedQty = input.returnedItems.reduce(function (sum, item) { return sum + item.quantity; }, 0);
                        for (_c = 0, _d = input.returnedItems; _c < _d.length; _c++) {
                            item = _d[_c];
                            key = "".concat(item.productId, ":").concat(item.sizeId);
                            existingSaleItem = saleItemsByKey.get(key);
                            if (!existingSaleItem) {
                                throw new Error("Returned item not found in original sale: ".concat(item.productId, " / ").concat(item.sizeId));
                            }
                            if (item.quantity <= 0 || item.quantity > existingSaleItem.quantity) {
                                throw new Error("Invalid returned quantity for item ".concat(item.productId, " / ").concat(item.sizeId));
                            }
                        }
                        for (_e = 0, _f = (_h = input.exchangedItems) !== null && _h !== void 0 ? _h : []; _e < _f.length; _e++) {
                            item = _f[_e];
                            if (item.quantity <= 0) {
                                throw new Error("Invalid exchanged quantity for item ".concat(item.productId, " / ").concat(item.sizeId));
                            }
                        }
                        totalQty = sale.items.reduce(function (sum, item) { return sum + item.quantity; }, 0);
                        returnStatus = returnedQty === 0 ? "NONE" : returnedQty >= totalQty ? "FULL" : "PARTIAL";
                        returnedTotal = returnedLineItems.reduce(function (sum, item) { return sum + item.total; }, 0);
                        exchangedTotal = exchangedLineItems.reduce(function (sum, item) { return sum + item.total; }, 0);
                        baseForDiscount = Math.max(exchangedTotal, 0);
                        discountType = (_j = input.discountType) !== null && _j !== void 0 ? _j : "PERCENTAGE";
                        discountPercent = clamp0(Number((_k = input.discountPercent) !== null && _k !== void 0 ? _k : 0));
                        discountAmountInput = clamp0(Number((_l = input.discountAmount) !== null && _l !== void 0 ? _l : 0));
                        discountAmount = 0;
                        if (discountType === "PERCENTAGE") {
                            discountAmount = round2((baseForDiscount * discountPercent) / 100);
                        }
                        else {
                            discountAmount = Math.min(discountAmountInput, baseForDiscount);
                        }
                        calculatedTotal = exchangedTotal - discountAmount;
                        taxRate = clamp0(Number((_m = input.taxRate) !== null && _m !== void 0 ? _m : 0));
                        taxAmount = taxRate > 0 ? round2((calculatedTotal * taxRate) / 100) : 0;
                        calculatedWithTax = calculatedTotal + taxAmount;
                        finalPayable = Math.round(calculatedWithTax);
                        roundOffAmount = round2(finalPayable - calculatedWithTax);
                        netAmount = Math.max(finalPayable - returnedTotal, 0);
                        offsetAmount = netAmount;
                        refundAmount = Math.max(returnedTotal - finalPayable, 0);
                        businessDate = input.businessDate ? new Date(input.businessDate) : new Date();
                        transactionDate = input.transactionDate ? new Date(input.transactionDate) : new Date();
                        _loop_2 = function (attempt) {
                            var referenceNumber, transaction, error_2;
                            return __generator(this, function (_p) {
                                switch (_p.label) {
                                    case 0: return [4 /*yield*/, generateReturnReferenceNumber(sale.storeId, attempt - 1)];
                                    case 1:
                                        referenceNumber = _p.sent();
                                        _p.label = 2;
                                    case 2:
                                        _p.trys.push([2, 4, , 5]);
                                        return [4 /*yield*/, db_1.prisma.$transaction(function (tx) { return __awaiter(_this, void 0, void 0, function () {
                                                var returnTransactionData, returnTransaction, topUpEntries, topUpTotal, refundEntries, refundTotal, isExchangeFlow, _i, _a, item, stockEntry, _b, _c, item, entry, saleStatus;
                                                var _d, _e, _f, _g;
                                                return __generator(this, function (_h) {
                                                    switch (_h.label) {
                                                        case 0:
                                                            returnTransactionData = {
                                                                referenceNumber: referenceNumber,
                                                                originalSaleId: saleId,
                                                                storeId: sale.storeId,
                                                                customerId: (_d = sale.customerId) !== null && _d !== void 0 ? _d : undefined,
                                                                type: input.type,
                                                                netAmount: new client_1.Prisma.Decimal(netAmount),
                                                                offsetAmount: new client_1.Prisma.Decimal(offsetAmount),
                                                                refundAmount: new client_1.Prisma.Decimal(refundAmount),
                                                                refundMethod: input.refundMethod,
                                                                reason: input.reason,
                                                                condition: input.condition,
                                                                notes: input.notes,
                                                                discountType: discountType || undefined,
                                                                discountPercent: discountPercent > 0 ? new client_1.Prisma.Decimal(discountPercent) : undefined,
                                                                discountAmount: discountAmount > 0 ? new client_1.Prisma.Decimal(discountAmount) : undefined,
                                                                taxRate: taxRate > 0 ? new client_1.Prisma.Decimal(taxRate) : undefined,
                                                                calculatedTotal: new client_1.Prisma.Decimal(calculatedWithTax),
                                                                roundOffAmount: new client_1.Prisma.Decimal(roundOffAmount),
                                                                finalPayable: new client_1.Prisma.Decimal(finalPayable),
                                                                splitPaymentData: (input.topUpPayments || input.refundPayments) ? JSON.stringify({
                                                                    topUpPayments: input.topUpPayments,
                                                                    refundPayments: input.refundPayments,
                                                                }) : undefined,
                                                                transactionDate: transactionDate,
                                                                businessDate: businessDate,
                                                                createdBy: userId,
                                                            };
                                                            if (hasReturnItemsTable) {
                                                                returnTransactionData.items = {
                                                                    create: __spreadArray(__spreadArray([], returnedLineItems.map(function (ri) { return ({
                                                                        returnedProductId: ri.productId,
                                                                        returnedSizeId: ri.sizeId,
                                                                        returnedQuantity: ri.quantity,
                                                                        returnedUnitPrice: new client_1.Prisma.Decimal(ri.historicalUnitAmount),
                                                                    }); }), true), exchangedLineItems.map(function (ei) { return ({
                                                                        returnedQuantity: 0,
                                                                        returnedUnitPrice: new client_1.Prisma.Decimal(0),
                                                                        newProductId: ei.productId,
                                                                        newSizeId: ei.sizeId,
                                                                        newQuantity: ei.quantity,
                                                                        newUnitPrice: new client_1.Prisma.Decimal(Number(ei.total) / (ei.quantity || 1)),
                                                                    }); }), true),
                                                                };
                                                            }
                                                            return [4 /*yield*/, tx.returnTransaction.create(__assign({ data: returnTransactionData }, (hasReturnItemsTable
                                                                    ? {
                                                                        include: {
                                                                            items: {
                                                                                include: {
                                                                                    returnedProduct: { select: { name: true, sku: true } },
                                                                                    returnedSize: { select: { label: true } },
                                                                                    newProduct: { select: { name: true, sku: true } },
                                                                                    newSize: { select: { label: true } },
                                                                                },
                                                                            },
                                                                        },
                                                                    }
                                                                    : {})))];
                                                        case 1:
                                                            returnTransaction = _h.sent();
                                                            if (!(hasLegacyReturnedItemsColumn && hasLegacyExchangedItemsColumn)) return [3 /*break*/, 3];
                                                            return [4 /*yield*/, tx.$executeRaw(templateObject_5 || (templateObject_5 = __makeTemplateObject(["\n              UPDATE \"return_transactions\"\n              SET\n                \"returnedItems\" = CAST(", " AS jsonb),\n                \"exchangedItems\" = CAST(", " AS jsonb)\n              WHERE \"id\" = ", "\n            "], ["\n              UPDATE \"return_transactions\"\n              SET\n                \"returnedItems\" = CAST(", " AS jsonb),\n                \"exchangedItems\" = CAST(", " AS jsonb)\n              WHERE \"id\" = ", "\n            "])), JSON.stringify(returnedItemsJson), JSON.stringify(exchangedItemsJson), returnTransaction.id)];
                                                        case 2:
                                                            _h.sent();
                                                            _h.label = 3;
                                                        case 3:
                                                            if (!(netAmount > 0)) return [3 /*break*/, 5];
                                                            topUpEntries = normalizePaymentEntries(input.topUpPayments, input.refundMethod, netAmount);
                                                            topUpTotal = round2(topUpEntries.reduce(function (sum, entry) { return sum + entry.amount; }, 0));
                                                            if (topUpTotal - netAmount > EPSILON) {
                                                                throw new Error("Top-up split payment total cannot exceed exchange payable amount");
                                                            }
                                                            return [4 /*yield*/, tx.salePayment.createMany({
                                                                    data: topUpEntries.map(function (entry) { return ({
                                                                        saleId: saleId,
                                                                        amount: entry.amount,
                                                                        method: entry.method,
                                                                        note: "Exchange top-up payment for ".concat(returnTransaction.id),
                                                                        businessDate: businessDate,
                                                                        createdBy: userId,
                                                                    }); }),
                                                                })];
                                                        case 4:
                                                            _h.sent();
                                                            _h.label = 5;
                                                        case 5:
                                                            if (!(refundAmount > 0)) return [3 /*break*/, 7];
                                                            refundEntries = normalizePaymentEntries(input.refundPayments, input.refundMethod, refundAmount);
                                                            refundTotal = round2(refundEntries.reduce(function (sum, entry) { return sum + entry.amount; }, 0));
                                                            if (refundTotal - refundAmount > EPSILON) {
                                                                throw new Error("Refund split payment total cannot exceed refund amount");
                                                            }
                                                            return [4 /*yield*/, tx.salePayment.createMany({
                                                                    data: refundEntries.map(function (entry) { return ({
                                                                        saleId: saleId,
                                                                        amount: -entry.amount,
                                                                        method: entry.method,
                                                                        note: "Refund for return ".concat(returnTransaction.id),
                                                                        businessDate: businessDate,
                                                                        createdBy: userId,
                                                                    }); }),
                                                                })];
                                                        case 6:
                                                            _h.sent();
                                                            _h.label = 7;
                                                        case 7:
                                                            if (!sale.customerId) return [3 /*break*/, 9];
                                                            return [4 /*yield*/, tx.customer.update({
                                                                    where: { id: sale.customerId },
                                                                    data: {
                                                                        totalSpent: { increment: netAmount },
                                                                    },
                                                                })];
                                                        case 8:
                                                            _h.sent();
                                                            _h.label = 9;
                                                        case 9:
                                                            isExchangeFlow = ((_f = (_e = input.exchangedItems) === null || _e === void 0 ? void 0 : _e.length) !== null && _f !== void 0 ? _f : 0) > 0;
                                                            _i = 0, _a = input.returnedItems;
                                                            _h.label = 10;
                                                        case 10:
                                                            if (!(_i < _a.length)) return [3 /*break*/, 15];
                                                            item = _a[_i];
                                                            return [4 /*yield*/, tx.stockEntry.findUnique({
                                                                    where: {
                                                                        productId_sizeId_storeId: {
                                                                            productId: item.productId,
                                                                            sizeId: item.sizeId,
                                                                            storeId: sale.storeId,
                                                                        },
                                                                    },
                                                                })];
                                                        case 11:
                                                            stockEntry = _h.sent();
                                                            if (!stockEntry) {
                                                                throw new Error("Stock entry not found for returned item ".concat(item.productId, " / ").concat(item.sizeId));
                                                            }
                                                            return [4 /*yield*/, tx.stockEntry.update({
                                                                    where: {
                                                                        productId_sizeId_storeId: {
                                                                            productId: item.productId,
                                                                            sizeId: item.sizeId,
                                                                            storeId: sale.storeId,
                                                                        },
                                                                    },
                                                                    data: { quantity: { increment: item.quantity } },
                                                                })];
                                                        case 12:
                                                            _h.sent();
                                                            return [4 /*yield*/, tx.stockMovement.create({
                                                                    data: {
                                                                        productId: item.productId,
                                                                        sizeId: item.sizeId,
                                                                        storeId: sale.storeId,
                                                                        type: "RETURN",
                                                                        quantity: item.quantity,
                                                                        reason: "Return for sale ".concat(sale.invoiceNumber),
                                                                        referenceType: "SALE",
                                                                        referenceId: returnTransaction.id,
                                                                        movementDate: businessDate,
                                                                        createdBy: userId,
                                                                    },
                                                                })];
                                                        case 13:
                                                            _h.sent();
                                                            _h.label = 14;
                                                        case 14:
                                                            _i++;
                                                            return [3 /*break*/, 10];
                                                        case 15:
                                                            _b = 0, _c = (_g = input.exchangedItems) !== null && _g !== void 0 ? _g : [];
                                                            _h.label = 16;
                                                        case 16:
                                                            if (!(_b < _c.length)) return [3 /*break*/, 21];
                                                            item = _c[_b];
                                                            return [4 /*yield*/, tx.stockEntry.findUnique({
                                                                    where: {
                                                                        productId_sizeId_storeId: {
                                                                            productId: item.productId,
                                                                            sizeId: item.sizeId,
                                                                            storeId: sale.storeId,
                                                                        },
                                                                    },
                                                                })];
                                                        case 17:
                                                            entry = _h.sent();
                                                            if (!entry || entry.quantity < item.quantity) {
                                                                throw new Error("Insufficient stock for exchange item ".concat(item.productId, " size ").concat(item.sizeId));
                                                            }
                                                            return [4 /*yield*/, tx.stockEntry.update({
                                                                    where: {
                                                                        productId_sizeId_storeId: {
                                                                            productId: item.productId,
                                                                            sizeId: item.sizeId,
                                                                            storeId: sale.storeId,
                                                                        },
                                                                    },
                                                                    data: { quantity: { decrement: item.quantity } },
                                                                })];
                                                        case 18:
                                                            _h.sent();
                                                            return [4 /*yield*/, tx.stockMovement.create({
                                                                    data: {
                                                                        productId: item.productId,
                                                                        sizeId: item.sizeId,
                                                                        storeId: sale.storeId,
                                                                        type: "SALE",
                                                                        quantity: item.quantity,
                                                                        reason: "Exchange for sale ".concat(sale.invoiceNumber),
                                                                        referenceType: "SALE",
                                                                        referenceId: returnTransaction.id,
                                                                        movementDate: businessDate,
                                                                        createdBy: userId,
                                                                    },
                                                                })];
                                                        case 19:
                                                            _h.sent();
                                                            _h.label = 20;
                                                        case 20:
                                                            _b++;
                                                            return [3 /*break*/, 16];
                                                        case 21:
                                                            saleStatus = input.type === "RETURN"
                                                                ? returnStatus === "FULL"
                                                                    ? "REFUNDED"
                                                                    : sale.status
                                                                : supportsExchangedStatus
                                                                    ? "EXCHANGED"
                                                                    : "COMPLETED";
                                                            return [4 /*yield*/, tx.sale.update({
                                                                    where: { id: saleId },
                                                                    data: {
                                                                        returnStatus: returnStatus,
                                                                        status: saleStatus,
                                                                    },
                                                                })];
                                                        case 22:
                                                            _h.sent();
                                                            return [2 /*return*/, returnTransaction];
                                                    }
                                                });
                                            }); })];
                                    case 3:
                                        transaction = _p.sent();
                                        return [2 /*return*/, { value: toReturnTransactionDto(transaction, returnedLineItems, exchangedLineItems) }];
                                    case 4:
                                        error_2 = _p.sent();
                                        if (attempt < 5 && isInvoiceNumberConflict(error_2)) {
                                            return [2 /*return*/, "continue"];
                                        }
                                        throw error_2;
                                    case 5: return [2 /*return*/];
                                }
                            });
                        };
                        attempt = 1;
                        _o.label = 5;
                    case 5:
                        if (!(attempt <= 5)) return [3 /*break*/, 8];
                        return [5 /*yield**/, _loop_2(attempt)];
                    case 6:
                        state_2 = _o.sent();
                        if (typeof state_2 === "object")
                            return [2 /*return*/, state_2.value];
                        _o.label = 7;
                    case 7:
                        attempt += 1;
                        return [3 /*break*/, 5];
                    case 8: return [2 /*return*/];
                }
            });
        });
    },
    getSalesKPIs: function (orgId) {
        return __awaiter(this, void 0, void 0, function () {
            var today, startOfMonth, endOfMonth, startOfPrevMonth, endOfPrevMonth, _a, thisMonthPayments, prevMonthPayments, receivables, partialSalesByCustomer, allExchanges, refundedSales, returnRefunds, thisMonthReturnRefunds, prevMonthReturnRefunds, pendingRefunds, pendingRefundCount, totalCollected, totalCollectedLastMonth, growthPercent, amountReceivable, receivableCustomerCount, refundGrowthPercent, pendingRefundAmount, refundCount;
            var _b, _c, _d, _e;
            return __generator(this, function (_f) {
                switch (_f.label) {
                    case 0:
                        today = new Date();
                        startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                        endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);
                        startOfPrevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                        endOfPrevMonth = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59);
                        return [4 /*yield*/, Promise.all([
                                db_1.prisma.salePayment.aggregate({
                                    where: { businessDate: { gte: startOfMonth, lte: endOfMonth }, sale: { store: { orgId: orgId } } },
                                    _sum: { amount: true },
                                }),
                                db_1.prisma.salePayment.aggregate({
                                    where: { businessDate: { gte: startOfPrevMonth, lte: endOfPrevMonth }, sale: { store: { orgId: orgId } } },
                                    _sum: { amount: true },
                                }),
                                db_1.prisma.sale.aggregate({
                                    where: { store: { orgId: orgId }, status: { not: "REFUNDED" }, paymentStatus: "PARTIAL", amountDue: { gt: 0 } },
                                    _sum: { amountDue: true },
                                }),
                                db_1.prisma.sale.groupBy({
                                    by: ["customerId"],
                                    where: { store: { orgId: orgId }, status: { not: "REFUNDED" }, paymentStatus: "PARTIAL", amountDue: { gt: 0 } },
                                }),
                                db_1.prisma.returnTransaction.count({
                                    where: { store: { orgId: orgId }, type: { in: ["EXCHANGE", "RETURN_EXCHANGE"] } },
                                }),
                                db_1.prisma.sale.count({
                                    where: { store: { orgId: orgId }, status: "REFUNDED" },
                                }),
                                db_1.prisma.returnTransaction.count({
                                    where: { store: { orgId: orgId }, refundAmount: { gt: 0 } },
                                }),
                                db_1.prisma.returnTransaction.count({
                                    where: { store: { orgId: orgId }, businessDate: { gte: startOfMonth, lte: endOfMonth }, refundAmount: { gt: 0 } },
                                }),
                                db_1.prisma.returnTransaction.count({
                                    where: { store: { orgId: orgId }, businessDate: { gte: startOfPrevMonth, lte: endOfPrevMonth }, refundAmount: { gt: 0 } },
                                }),
                                db_1.prisma.returnTransaction.aggregate({
                                    where: { store: { orgId: orgId }, refundAmount: { gt: 0 } },
                                    _sum: { refundAmount: true },
                                }),
                                db_1.prisma.returnTransaction.count({
                                    where: { store: { orgId: orgId }, refundAmount: { gt: 0 } },
                                }),
                            ])];
                    case 1:
                        _a = _f.sent(), thisMonthPayments = _a[0], prevMonthPayments = _a[1], receivables = _a[2], partialSalesByCustomer = _a[3], allExchanges = _a[4], refundedSales = _a[5], returnRefunds = _a[6], thisMonthReturnRefunds = _a[7], prevMonthReturnRefunds = _a[8], pendingRefunds = _a[9], pendingRefundCount = _a[10];
                        totalCollected = Number((_b = thisMonthPayments._sum.amount) !== null && _b !== void 0 ? _b : 0);
                        totalCollectedLastMonth = Number((_c = prevMonthPayments._sum.amount) !== null && _c !== void 0 ? _c : 0);
                        growthPercent = totalCollectedLastMonth === 0
                            ? totalCollected > 0
                                ? 100
                                : 0
                            : ((totalCollected - totalCollectedLastMonth) / totalCollectedLastMonth) * 100;
                        amountReceivable = Number((_d = receivables._sum.amountDue) !== null && _d !== void 0 ? _d : 0);
                        receivableCustomerCount = partialSalesByCustomer.filter(function (row) { return row.customerId; }).length;
                        refundGrowthPercent = prevMonthReturnRefunds === 0
                            ? thisMonthReturnRefunds > 0
                                ? 100
                                : 0
                            : ((thisMonthReturnRefunds - prevMonthReturnRefunds) / prevMonthReturnRefunds) * 100;
                        pendingRefundAmount = Number((_e = pendingRefunds._sum.refundAmount) !== null && _e !== void 0 ? _e : 0);
                        refundCount = refundedSales + returnRefunds;
                        return [2 /*return*/, {
                                totalCollected: totalCollected,
                                totalCollectedLastMonth: totalCollectedLastMonth,
                                growthPercent: Math.round(growthPercent * 100) / 100,
                                exchangeCount: allExchanges,
                                exchangesFlaggedForReview: 0, // To be implemented with review status field
                                refundCount: refundCount,
                                refundGrowthPercent: Math.round(refundGrowthPercent * 100) / 100,
                                amountReceivable: amountReceivable,
                                receivableCustomerCount: receivableCustomerCount,
                                pendingRefundAmount: pendingRefundAmount,
                                pendingRefundCount: pendingRefundCount,
                            }];
                }
            });
        });
    },
    getSalesPaged: function (orgId_1, filters_1) {
        return __awaiter(this, arguments, void 0, function (orgId, filters, page, limit) {
            var supportsExchangedStatus, hasReturnItemsTable, saleWhere, dateFilters, from, to, transactionDateClause, createdAtClause, rtWhere, end, _a, sales, returnTxns, salesRows, rtRows, unified, total, totalPages, start, data, kpis;
            var _b, _c;
            if (page === void 0) { page = 1; }
            if (limit === void 0) { limit = 20; }
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0: return [4 /*yield*/, supportsExchangedSaleStatus()];
                    case 1:
                        supportsExchangedStatus = _d.sent();
                        return [4 /*yield*/, hasTable("return_transaction_items")];
                    case 2:
                        hasReturnItemsTable = _d.sent();
                        saleWhere = { store: { orgId: orgId } };
                        if (filters === null || filters === void 0 ? void 0 : filters.status) {
                            if (filters.status === "EXCHANGED" && !supportsExchangedStatus) {
                                saleWhere.status = "COMPLETED";
                            }
                            else {
                                saleWhere.status = filters.status;
                            }
                        }
                        if (filters === null || filters === void 0 ? void 0 : filters.paymentMethod)
                            saleWhere.paymentMethod = filters.paymentMethod;
                        if (filters === null || filters === void 0 ? void 0 : filters.search) {
                            saleWhere.OR = [
                                { invoiceNumber: { contains: filters.search, mode: "insensitive" } },
                                { customerName: { contains: filters.search, mode: "insensitive" } },
                            ];
                        }
                        if (filters === null || filters === void 0 ? void 0 : filters.sizeId) {
                            saleWhere.items = { some: { sizeId: filters.sizeId } };
                        }
                        // Date range filter: use transactionDate (canonical for backdated billing) with
                        // an OR fallback to createdAt so records created before the transactionDate
                        // migration are still included.
                        // MOVED HERE FROM IN-MEMORY FILTER TO FIX PAGINATION.
                        if ((filters === null || filters === void 0 ? void 0 : filters.startDate) || (filters === null || filters === void 0 ? void 0 : filters.endDate)) {
                            dateFilters = [];
                            from = filters.startDate ? new Date(filters.startDate) : null;
                            to = filters.endDate ? new Date(filters.endDate) : null;
                            if (to) {
                                to.setDate(to.getDate() + 1); // Make it inclusive of the end day
                            }
                            transactionDateClause = {};
                            if (from)
                                transactionDateClause.gte = from;
                            if (to)
                                transactionDateClause.lt = to;
                            createdAtClause = {};
                            if (from)
                                createdAtClause.gte = from;
                            if (to)
                                createdAtClause.lt = to;
                            // businessDate is an alias for transactionDate on sales
                            saleWhere.OR = [
                                { transactionDate: transactionDateClause },
                                { createdAt: createdAtClause },
                            ];
                        }
                        rtWhere = { store: { orgId: orgId } };
                        if (filters === null || filters === void 0 ? void 0 : filters.startDate)
                            rtWhere.businessDate = __assign(__assign({}, ((_b = rtWhere.businessDate) !== null && _b !== void 0 ? _b : {})), { gte: new Date(filters.startDate) });
                        if (filters === null || filters === void 0 ? void 0 : filters.endDate) {
                            end = new Date(filters.endDate);
                            end.setDate(end.getDate() + 1);
                            rtWhere.businessDate = __assign(__assign({}, ((_c = rtWhere.businessDate) !== null && _c !== void 0 ? _c : {})), { lt: end });
                        }
                        if (filters === null || filters === void 0 ? void 0 : filters.search) {
                            rtWhere.OR = [
                                { referenceNumber: { contains: filters.search, mode: "insensitive" } },
                                { sale: { invoiceNumber: { contains: filters.search, mode: "insensitive" } } },
                                { customer: { name: { contains: filters.search, mode: "insensitive" } } },
                            ];
                        }
                        if ((filters === null || filters === void 0 ? void 0 : filters.type) === "EXCHANGE")
                            rtWhere.type = "EXCHANGE";
                        if ((filters === null || filters === void 0 ? void 0 : filters.type) === "RETURN")
                            rtWhere.type = { in: ["RETURN", "RETURN_EXCHANGE"] };
                        return [4 /*yield*/, Promise.all([
                                db_1.prisma.sale.findMany({
                                    where: saleWhere,
                                    include: { items: { include: { product: true, size: true } }, customer: true, payments: true },
                                    orderBy: { createdAt: "desc" },
                                }),
                                db_1.prisma.returnTransaction.findMany({
                                    where: rtWhere,
                                    include: hasReturnItemsTable
                                        ? {
                                            items: {
                                                include: {
                                                    returnedProduct: { select: { name: true, sku: true } },
                                                    returnedSize: { select: { label: true } },
                                                    newProduct: { select: { name: true, sku: true } },
                                                    newSize: { select: { label: true } },
                                                },
                                            },
                                            sale: { select: { invoiceNumber: true, id: true } },
                                            customer: true,
                                        }
                                        : {
                                            sale: { select: { invoiceNumber: true, id: true } },
                                            customer: true,
                                        },
                                    orderBy: { businessDate: "desc" },
                                }),
                            ])];
                    case 3:
                        _a = _d.sent(), sales = _a[0], returnTxns = _a[1];
                        salesRows = sales.map(function (s) {
                            var _a, _b;
                            return (__assign(__assign({}, s), { rowType: "SALE", paymentMethod: derivePresentationPaymentMethod(s.paymentMethod, s.payments), payments: ((_a = s.payments) !== null && _a !== void 0 ? _a : []).map(function (p) {
                                    var _a;
                                    return (__assign(__assign({}, p), { amount: Number((_a = p.amount) !== null && _a !== void 0 ? _a : 0), businessDate: p.businessDate instanceof Date ? p.businessDate.toISOString() : p.businessDate, paidAt: p.paidAt instanceof Date ? p.paidAt.toISOString() : p.paidAt }));
                                }), transactionDate: s.transactionDate instanceof Date ? s.transactionDate.toISOString() : s.transactionDate, createdAt: s.createdAt instanceof Date ? s.createdAt.toISOString() : s.createdAt, businessDate: s.transactionDate instanceof Date ? s.transactionDate.toISOString() : (_b = s.transactionDate) !== null && _b !== void 0 ? _b : (s.createdAt instanceof Date ? s.createdAt.toISOString() : s.createdAt) }));
                        });
                        rtRows = returnTxns.map(function (r) {
                            var _a, _b, _c, _d;
                            return (__assign(__assign({}, r), { rowType: "RETURN_TRANSACTION", businessDate: r.businessDate instanceof Date ? r.businessDate.toISOString() : r.businessDate, createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt, saleInvoiceNumber: (_b = (_a = r.sale) === null || _a === void 0 ? void 0 : _a.invoiceNumber) !== null && _b !== void 0 ? _b : undefined, customerName: (_d = (_c = r.customer) === null || _c === void 0 ? void 0 : _c.name) !== null && _d !== void 0 ? _d : null }));
                        });
                        unified = __spreadArray(__spreadArray([], salesRows, true), rtRows, true);
                        if ((filters === null || filters === void 0 ? void 0 : filters.type) === "SALE") {
                            unified = unified.filter(function (r) { return r.rowType === "SALE"; });
                        }
                        if ((filters === null || filters === void 0 ? void 0 : filters.type) === "EXCHANGE") {
                            unified = unified.filter(function (r) { return r.rowType === "RETURN_TRANSACTION" && r.type === "EXCHANGE"; });
                        }
                        if ((filters === null || filters === void 0 ? void 0 : filters.type) === "RETURN") {
                            unified = unified.filter(function (r) { return r.rowType === "RETURN_TRANSACTION" && (r.type === "RETURN" || r.type === "RETURN_EXCHANGE"); });
                        }
                        unified.sort(function (a, b) { var _a, _b, _c, _d; return new Date((_b = (_a = b.businessDate) !== null && _a !== void 0 ? _a : b.transactionDate) !== null && _b !== void 0 ? _b : b.createdAt).getTime() - new Date((_d = (_c = a.businessDate) !== null && _c !== void 0 ? _c : a.transactionDate) !== null && _d !== void 0 ? _d : a.createdAt).getTime(); });
                        total = unified.length;
                        totalPages = Math.max(1, Math.ceil(total / limit));
                        start = Math.max(0, (page - 1) * limit);
                        data = unified.slice(start, start + limit);
                        return [4 /*yield*/, this.getSalesKPIs(orgId)];
                    case 4:
                        kpis = _d.sent();
                        return [2 /*return*/, {
                                data: data,
                                pagination: { page: page, limit: limit, total: total, totalPages: totalPages },
                                stats: kpis,
                            }];
                }
            });
        });
    },
};
var templateObject_1, templateObject_2, templateObject_3, templateObject_4, templateObject_5;
