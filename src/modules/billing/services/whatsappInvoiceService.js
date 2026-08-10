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
Object.defineProperty(exports, "__esModule", { value: true });
exports.whatsappInvoiceService = exports.sendInvoiceDeliveryDebug = void 0;
var node_buffer_1 = require("node:buffer");
var node_crypto_1 = require("node:crypto");
var db_1 = require("@/lib/db");
var puppeteer_1 = require("puppeteer");
var invoiceHtmlBuilder_1 = require("./invoiceHtmlBuilder");
var DEFAULT_TEMPLATE_NAME = "invoice_delivery";
var DEFAULT_API_URL = "https://graph.facebook.com/v22.0";
var normalizePhone = function (value) {
    if (!value)
        return null;
    var digits = value.replace(/\D/g, "");
    if (!digits)
        return null;
    if (digits.length === 10)
        return "+91".concat(digits);
    if (digits.length === 11 && digits.startsWith("0"))
        return "+91".concat(digits.slice(1));
    if (digits.length === 12 && digits.startsWith("91"))
        return "+".concat(digits);
    return "+".concat(digits);
};
var parseScopedConfig = function (raw, orgId, storeId) {
    var _a, _b, _c;
    if (!raw)
        return null;
    try {
        var parsed = JSON.parse(raw);
        var scoped = (_c = (_b = (_a = parsed === null || parsed === void 0 ? void 0 : parsed[orgId]) !== null && _a !== void 0 ? _a : parsed === null || parsed === void 0 ? void 0 : parsed[storeId]) !== null && _b !== void 0 ? _b : parsed === null || parsed === void 0 ? void 0 : parsed.default) !== null && _c !== void 0 ? _c : null;
        if (!scoped || typeof scoped !== "object")
            return null;
        return scoped;
    }
    catch (_d) {
        return null;
    }
};
var getWhatsAppConfig = function (orgId, storeId) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s;
    var scoped = parseScopedConfig(process.env.WHATSAPP_CONFIG_JSON, orgId, storeId);
    var enabled = ((_a = scoped === null || scoped === void 0 ? void 0 : scoped.enabled) !== null && _a !== void 0 ? _a : process.env.WHATSAPP_ENABLED) === true || ["1", "true", "yes"].includes(String((_c = (_b = scoped === null || scoped === void 0 ? void 0 : scoped.enabled) !== null && _b !== void 0 ? _b : process.env.WHATSAPP_ENABLED) !== null && _c !== void 0 ? _c : "").toLowerCase());
    var phoneNumberId = (_e = (_d = scoped === null || scoped === void 0 ? void 0 : scoped.phoneNumberId) !== null && _d !== void 0 ? _d : process.env.WHATSAPP_PHONE_NUMBER_ID) !== null && _e !== void 0 ? _e : process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
    var accessToken = (_f = scoped === null || scoped === void 0 ? void 0 : scoped.accessToken) !== null && _f !== void 0 ? _f : process.env.WHATSAPP_ACCESS_TOKEN;
    var provider = (_h = (_g = scoped === null || scoped === void 0 ? void 0 : scoped.provider) !== null && _g !== void 0 ? _g : process.env.WHATSAPP_PROVIDER) !== null && _h !== void 0 ? _h : "meta";
    var apiUrl = (_k = (_j = scoped === null || scoped === void 0 ? void 0 : scoped.apiUrl) !== null && _j !== void 0 ? _j : process.env.WHATSAPP_API_URL) !== null && _k !== void 0 ? _k : DEFAULT_API_URL;
    var templateName = (_m = (_l = scoped === null || scoped === void 0 ? void 0 : scoped.templateName) !== null && _l !== void 0 ? _l : process.env.WHATSAPP_TEMPLATE_NAME) !== null && _m !== void 0 ? _m : DEFAULT_TEMPLATE_NAME;
    var templateLanguage = (_p = (_o = scoped === null || scoped === void 0 ? void 0 : scoped.templateLanguage) !== null && _o !== void 0 ? _o : process.env.WHATSAPP_TEMPLATE_LANGUAGE) !== null && _p !== void 0 ? _p : "en_US";
    var testMode = ((_q = scoped === null || scoped === void 0 ? void 0 : scoped.testMode) !== null && _q !== void 0 ? _q : process.env.WHATSAPP_TEST_MODE) === true || ["1", "true", "yes"].includes(String((_s = (_r = scoped === null || scoped === void 0 ? void 0 : scoped.testMode) !== null && _r !== void 0 ? _r : process.env.WHATSAPP_TEST_MODE) !== null && _s !== void 0 ? _s : "").toLowerCase());
    console.log("[WHATSAPP_DEBUG] Configuration loaded. OrgId=".concat(orgId, " StoreId=").concat(storeId, " Enabled=").concat(enabled, " Provider=").concat(provider, " ApiUrl=").concat(apiUrl, " PhoneNumberId=").concat(phoneNumberId ? "***masked***" : "missing", " TemplateName=").concat(templateName, " AccessTokenPresent=").concat(Boolean(accessToken)));
    return {
        enabled: enabled,
        provider: provider,
        accessToken: accessToken,
        phoneNumberId: phoneNumberId,
        templateName: templateName,
        templateLanguage: templateLanguage,
        apiUrl: apiUrl,
        testMode: testMode,
    };
};
var maskToken = function (token) {
    if (!token)
        return "missing";
    return "".concat(token.slice(0, 6), "...").concat(token.slice(-6));
};
var TEMPLATE_DEFINITIONS = {
    invoice_delivery: {
        headerType: "document",
        bodyParameterNames: ["customer_name", "order_id", "order_date"],
        fallbackValues: {
            customer_name: "Customer",
            order_id: "N/A",
            order_date: new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date()),
        },
    },
};
var formatInvoiceDateForTemplate = function (value) {
    var date = value ? new Date(value) : new Date();
    if (Number.isNaN(date.getTime())) {
        return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date());
    }
    return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(date);
};
var getTemplateBodyParamValues = function (payload) {
    var _a, _b, _c, _d;
    var customerName = ((_a = payload.customerName) === null || _a === void 0 ? void 0 : _a.trim()) || "Customer";
    var orderId = ((_b = payload.invoiceNumber) === null || _b === void 0 ? void 0 : _b.trim()) || payload.saleId || "N/A";
    var orderDate = formatInvoiceDateForTemplate((_d = (_c = payload.transactionDate) !== null && _c !== void 0 ? _c : payload.saleDate) !== null && _d !== void 0 ? _d : new Date());
    return {
        customer_name: customerName,
        order_id: orderId,
        order_date: orderDate,
    };
};
var buildWhatsAppTemplatePayload = function (recipientPhone, mediaId, payload, config) {
    var definition = TEMPLATE_DEFINITIONS[config.templateName];
    if (!definition) {
        throw new Error("Unsupported WhatsApp template name: ".concat(config.templateName));
    }
    if (definition.headerType === "document" && !mediaId) {
        throw new Error("Template ".concat(config.templateName, " requires a document header media id."));
    }
    var filename = "".concat(payload.invoiceNumber || payload.saleId, ".pdf");
    var components = [];
    if (mediaId) {
        components.push({
            type: "header",
            parameters: [
                {
                    type: "document",
                    document: {
                        id: mediaId,
                        filename: filename,
                    },
                },
            ],
        });
    }
    var templateParameterValues = getTemplateBodyParamValues(payload);
    var bodyParameters = definition.bodyParameterNames.map(function (parameterName) {
        var resolvedValue = templateParameterValues[parameterName] || definition.fallbackValues[parameterName] || "N/A";
        return {
            type: "text",
            parameter_name: parameterName,
            text: resolvedValue,
        };
    });
    var expectedBodyParameterCount = definition.bodyParameterNames.length;
    if (bodyParameters.length !== expectedBodyParameterCount) {
        throw new Error("Template ".concat(config.templateName, " expects ").concat(expectedBodyParameterCount, " body parameters, but built ").concat(bodyParameters.length, "."));
    }
    var emptyParameters = bodyParameters.filter(function (param) { return !param.text.trim(); });
    if (emptyParameters.length > 0) {
        throw new Error("Template ".concat(config.templateName, " contains empty body parameters."));
    }
    console.log("[WHATSAPP_DEBUG] Template Parameters ".concat(JSON.stringify(templateParameterValues, null, 2)));
    console.log("[WHATSAPP_DEBUG] Final body parameters array: ".concat(JSON.stringify(bodyParameters, null, 2)));
    components.push({ type: "body", parameters: bodyParameters });
    var messagePayload = {
        messaging_product: "whatsapp",
        to: recipientPhone,
        type: "template",
        template: {
            name: config.templateName,
            language: { code: config.templateLanguage },
            components: components,
        },
    };
    console.log("[WHATSAPP_DEBUG] Final WhatsApp template payload: ".concat(JSON.stringify(__assign(__assign({}, messagePayload), { to: "***masked***" }))));
    return messagePayload;
};
var executeInvoiceDelivery = function (payload, config, recipientPhone, record) { return __awaiter(void 0, void 0, void 0, function () {
    var steps, pdfBuffer, errorMessage, mediaId, errorMessage, errorMessage, requestUrl, messagePayload, response, responseBody, errorMessage, messageId;
    var _a, _b, _c, _d, _e, _f;
    return __generator(this, function (_g) {
        switch (_g.label) {
            case 0:
                steps = {
                    pdfGenerated: false,
                    mediaUploaded: false,
                    messageSent: false,
                };
                console.log("[WHATSAPP_DEBUG] Recipient selected. Phone=".concat(recipientPhone));
                console.log("[WHATSAPP_DEBUG] Phone Number ID loaded. Present=".concat(Boolean(config.phoneNumberId), " Masked=").concat(config.phoneNumberId ? "***masked***" : "missing"));
                console.log("[WHATSAPP_DEBUG] Template selected. Name=".concat(config.templateName, " Language=").concat(config.templateLanguage));
                return [4 /*yield*/, renderPdfBuffer(payload)];
            case 1:
                pdfBuffer = _g.sent();
                if (!!pdfBuffer) return [3 /*break*/, 3];
                errorMessage = "Invoice PDF generation failed; WhatsApp invoice template requires a document header media.";
                steps.failedStep = "generatePdf";
                steps.error = { message: errorMessage };
                return [4 /*yield*/, updateDeliveryRecord(record.id, "FAILED", { error: errorMessage, metadata: { reason: "pdf_generation_failed" } })];
            case 2:
                _g.sent();
                return [2 /*return*/, { success: false, steps: steps, deliveryRecord: __assign(__assign({}, record), { status: "FAILED", error: errorMessage }) }];
            case 3:
                steps.pdfGenerated = true;
                steps.pdfSize = pdfBuffer.byteLength;
                console.log("[WHATSAPP_DEBUG] Media upload started. SaleId=".concat(payload.saleId, " InvoiceNumber=").concat(payload.invoiceNumber, " OrgId=").concat(payload.orgId));
                return [4 /*yield*/, uploadWhatsappMedia(config, payload, pdfBuffer)];
            case 4:
                mediaId = _g.sent();
                if (!!mediaId) return [3 /*break*/, 6];
                errorMessage = "WhatsApp media upload failed; invoice template requires uploaded document header media.";
                steps.failedStep = "uploadMedia";
                steps.error = { message: errorMessage };
                return [4 /*yield*/, updateDeliveryRecord(record.id, "FAILED", { error: errorMessage, metadata: { reason: "media_upload_failed" } })];
            case 5:
                _g.sent();
                return [2 /*return*/, { success: false, steps: steps, deliveryRecord: __assign(__assign({}, record), { status: "FAILED", error: errorMessage }) }];
            case 6:
                steps.mediaUploaded = true;
                steps.mediaId = mediaId;
                console.log("[WHATSAPP_DEBUG] Media upload completed. SaleId=".concat(payload.saleId, " InvoiceNumber=").concat(payload.invoiceNumber, " OrgId=").concat(payload.orgId, " MediaId=").concat(mediaId));
                if (!!config.phoneNumberId) return [3 /*break*/, 8];
                errorMessage = "WhatsApp Phone Number ID is missing.";
                steps.failedStep = "validateConfig";
                steps.error = { message: errorMessage };
                return [4 /*yield*/, updateDeliveryRecord(record.id, "FAILED", { error: errorMessage, metadata: { reason: "missing_phone_number_id" } })];
            case 7:
                _g.sent();
                return [2 /*return*/, { success: false, steps: steps, deliveryRecord: __assign(__assign({}, record), { status: "FAILED", error: errorMessage }) }];
            case 8:
                requestUrl = "".concat(config.apiUrl.replace(/\/$/, ""), "/").concat(encodeURIComponent(config.phoneNumberId), "/messages");
                console.log("[WHATSAPP_DEBUG] Graph API endpoint prepared. POST ".concat(requestUrl));
                messagePayload = buildWhatsAppTemplatePayload(recipientPhone, mediaId, payload, config);
                console.log("[WHATSAPP_DEBUG] Message payload created. Payload=".concat(JSON.stringify(messagePayload)));
                return [4 /*yield*/, sendWhatsappTemplate(requestUrl, messagePayload, config, "document_template")];
            case 9:
                response = _g.sent();
                return [4 /*yield*/, response.json().catch(function () { return null; })];
            case 10:
                responseBody = _g.sent();
                if (!!response.ok) return [3 /*break*/, 12];
                errorMessage = (_b = (_a = responseBody === null || responseBody === void 0 ? void 0 : responseBody.error) === null || _a === void 0 ? void 0 : _a.message) !== null && _b !== void 0 ? _b : "WhatsApp delivery failed with status ".concat(response.status);
                console.error("[WHATSAPP_DEBUG] Meta response failed. SaleId=".concat(payload.saleId, " InvoiceNumber=").concat(payload.invoiceNumber, " OrgId=").concat(payload.orgId, " HttpStatus=").concat(response.status, " ResponseBody=").concat(JSON.stringify(responseBody)));
                steps.failedStep = "sendMessage";
                steps.error = { code: (_c = responseBody === null || responseBody === void 0 ? void 0 : responseBody.error) === null || _c === void 0 ? void 0 : _c.code, message: errorMessage };
                return [4 /*yield*/, updateDeliveryRecord(record.id, "FAILED", { error: errorMessage, metadata: { responseBody: responseBody } })];
            case 11:
                _g.sent();
                return [2 /*return*/, { success: false, steps: steps, deliveryRecord: __assign(__assign({}, record), { status: "FAILED", error: errorMessage }) }];
            case 12:
                messageId = (_f = (_e = (_d = responseBody === null || responseBody === void 0 ? void 0 : responseBody.messages) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.id) !== null && _f !== void 0 ? _f : null;
                steps.messageSent = true;
                steps.messageId = messageId;
                console.log("[WHATSAPP_DEBUG] Meta response succeeded. SaleId=".concat(payload.saleId, " InvoiceNumber=").concat(payload.invoiceNumber, " OrgId=").concat(payload.orgId, " HttpStatus=").concat(response.status, " MessageId=").concat(messageId !== null && messageId !== void 0 ? messageId : "n/a", " ResponseBody=").concat(JSON.stringify(responseBody)));
                return [4 /*yield*/, updateDeliveryRecord(record.id, "SENT", { metadata: { messageId: messageId, mediaId: mediaId, recipientPhone: recipientPhone } })];
            case 13:
                _g.sent();
                return [2 /*return*/, { success: true, steps: steps, deliveryRecord: __assign(__assign({}, record), { status: "SENT", error: null }) }];
        }
    });
}); };
var sendInvoiceDeliveryDebug = function (payload) { return __awaiter(void 0, void 0, void 0, function () {
    var config, recipientPhone, record, result;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                config = getWhatsAppConfig(payload.orgId, payload.storeId);
                if (!config.enabled) {
                    return [2 /*return*/, {
                            success: false,
                            steps: {
                                pdfGenerated: false,
                                mediaUploaded: false,
                                messageSent: false,
                                failedStep: "validateConfig",
                                error: { message: "WhatsApp delivery disabled" },
                            },
                        }];
                }
                if (!config.accessToken) {
                    return [2 /*return*/, {
                            success: false,
                            steps: {
                                pdfGenerated: false,
                                mediaUploaded: false,
                                messageSent: false,
                                failedStep: "validateConfig",
                                error: { message: "Missing WhatsApp access token" },
                            },
                        }];
                }
                if (!config.phoneNumberId) {
                    return [2 /*return*/, {
                            success: false,
                            steps: {
                                pdfGenerated: false,
                                mediaUploaded: false,
                                messageSent: false,
                                failedStep: "validateConfig",
                                error: { message: "WhatsApp Phone Number ID is missing." },
                            },
                        }];
                }
                recipientPhone = normalizePhone(payload.customerPhone);
                if (!recipientPhone) {
                    return [2 /*return*/, upsertDeliveryRecord(payload, "SKIPPED", config.provider, { error: "Customer mobile number is missing. WhatsApp invoice delivery skipped.", metadata: { reason: "missing-customer-mobile" } })];
                }
                return [4 /*yield*/, upsertDeliveryRecord(payload, "PENDING", config.provider, { metadata: { phone: recipientPhone, originalPhone: normalizePhone(payload.customerPhone) } })];
            case 1:
                record = _a.sent();
                return [4 /*yield*/, executeInvoiceDelivery(payload, config, recipientPhone, record)];
            case 2:
                result = _a.sent();
                return [2 /*return*/, {
                        success: result.success,
                        steps: result.steps,
                        deliveryRecord: result.deliveryRecord,
                    }];
        }
    });
}); };
exports.sendInvoiceDeliveryDebug = sendInvoiceDeliveryDebug;
var sendWhatsappTemplate = function (requestUrl, messagePayload, config, messageType) { return __awaiter(void 0, void 0, void 0, function () {
    var startedAt, requestBody, requestConfig, response, responseHeaders_1, responseBody, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                startedAt = Date.now();
                requestBody = JSON.stringify(messagePayload);
                requestConfig = {
                    url: requestUrl,
                    method: "POST",
                    headers: {
                        Authorization: "Bearer ".concat(maskToken(config.accessToken)),
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(__assign(__assign({}, messagePayload), { to: "***masked***" })),
                };
                console.log("[WHATSAPP_DEBUG] Step 8 - Sending template. RequestUrl=".concat(requestUrl, " Method=POST MessageType=").concat(messageType));
                console.log("[WHATSAPP_DEBUG] WhatsApp /messages ".concat(messageType, " request config: ").concat(JSON.stringify(requestConfig)));
                _a.label = 1;
            case 1:
                _a.trys.push([1, 4, , 5]);
                return [4 /*yield*/, fetch(requestUrl, {
                        method: "POST",
                        headers: {
                            Authorization: "Bearer ".concat(config.accessToken),
                            "Content-Type": "application/json",
                        },
                        body: requestBody,
                    })];
            case 2:
                response = _a.sent();
                responseHeaders_1 = {};
                response.headers.forEach(function (value, key) {
                    responseHeaders_1[key] = value;
                });
                return [4 /*yield*/, response.clone().json().catch(function () { return null; })];
            case 3:
                responseBody = _a.sent();
                console.log("[WHATSAPP_DEBUG] Step 9 - Meta API responded. Status=".concat(response.status, " DurationMs=").concat(Date.now() - startedAt, " Headers=").concat(JSON.stringify(responseHeaders_1), " Body=").concat(JSON.stringify(responseBody)));
                return [2 /*return*/, response];
            case 4:
                error_1 = _a.sent();
                console.error("[WHATSAPP_DEBUG] Step 9 - Meta API failure. RequestUrl=".concat(requestUrl, " Error=").concat(error_1 instanceof Error ? error_1.message : String(error_1), " Stack=").concat(error_1 instanceof Error ? error_1.stack : ""));
                throw error_1;
            case 5: return [2 /*return*/];
        }
    });
}); };
var buildInvoiceHtml = function (payload) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    var normalizedTransactionDate = typeof payload.transactionDate === "string"
        ? payload.transactionDate
        : payload.transactionDate instanceof Date
            ? payload.transactionDate.toISOString()
            : typeof payload.saleDate === "string"
                ? payload.saleDate
                : payload.saleDate instanceof Date
                    ? payload.saleDate.toISOString()
                    : new Date().toISOString();
    return (0, invoiceHtmlBuilder_1.buildPrintableInvoiceHtml)({
        invoiceNumber: payload.invoiceNumber,
        customerName: payload.customerName,
        customerPhone: payload.customerPhone,
        customerEmail: payload.customerEmail,
        status: (_a = payload.status) !== null && _a !== void 0 ? _a : "COMPLETED",
        paymentMethod: (_b = payload.paymentMethod) !== null && _b !== void 0 ? _b : "CASH",
        paymentStatus: (_c = payload.paymentStatus) !== null && _c !== void 0 ? _c : "PAID",
        subtotal: (_d = payload.subtotal) !== null && _d !== void 0 ? _d : payload.amount,
        discountAmount: (_e = payload.discountAmount) !== null && _e !== void 0 ? _e : 0,
        taxAmount: (_f = payload.taxAmount) !== null && _f !== void 0 ? _f : 0,
        total: payload.amount,
        amountPaid: (_g = payload.amountPaid) !== null && _g !== void 0 ? _g : payload.amount,
        amountDue: (_h = payload.amountDue) !== null && _h !== void 0 ? _h : 0,
        items: (_j = payload.items) !== null && _j !== void 0 ? _j : [],
        returnTransactions: (_k = payload.returnTransactions) !== null && _k !== void 0 ? _k : [],
        transactionDate: normalizedTransactionDate,
    }, { storeName: payload.storeName });
};
var renderPdfBuffer = function (payload) { return __awaiter(void 0, void 0, void 0, function () {
    var html, startedAt, browser, page, pdfData, pdfBuffer, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                html = buildInvoiceHtml(payload);
                startedAt = Date.now();
                console.log("[WHATSAPP_DEBUG] Step 4 - PDF generation started. SaleId=".concat(payload.saleId, " InvoiceNumber=").concat(payload.invoiceNumber, " OrgId=").concat(payload.orgId));
                _a.label = 1;
            case 1:
                _a.trys.push([1, 10, , 11]);
                return [4 /*yield*/, puppeteer_1.default.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] })];
            case 2:
                browser = _a.sent();
                _a.label = 3;
            case 3:
                _a.trys.push([3, , 7, 9]);
                return [4 /*yield*/, browser.newPage()];
            case 4:
                page = _a.sent();
                return [4 /*yield*/, page.setContent(html, { waitUntil: "networkidle0" })];
            case 5:
                _a.sent();
                return [4 /*yield*/, page.pdf({ format: "A4", printBackground: true })];
            case 6:
                pdfData = _a.sent();
                pdfBuffer = node_buffer_1.Buffer.isBuffer(pdfData) ? pdfData : node_buffer_1.Buffer.from(pdfData);
                console.log("[WHATSAPP_DEBUG] Step 5 - PDF generated successfully. SaleId=".concat(payload.saleId, " InvoiceNumber=").concat(payload.invoiceNumber, " OrgId=").concat(payload.orgId, " PdfSize=").concat(pdfBuffer.byteLength, " DurationMs=").concat(Date.now() - startedAt));
                return [2 /*return*/, pdfBuffer];
            case 7: return [4 /*yield*/, browser.close()];
            case 8:
                _a.sent();
                return [7 /*endfinally*/];
            case 9: return [3 /*break*/, 11];
            case 10:
                error_2 = _a.sent();
                console.error("[WHATSAPP_DEBUG] Step 5 - PDF generation failed. SaleId=".concat(payload.saleId, " InvoiceNumber=").concat(payload.invoiceNumber, " OrgId=").concat(payload.orgId, " CustomerMobile=").concat(payload.customerPhone ? "***masked***" : "missing", " Error=").concat(error_2 instanceof Error ? error_2.message : String(error_2), " Stack=").concat(error_2 instanceof Error ? error_2.stack : "", " DurationMs=").concat(Date.now() - startedAt));
                return [2 /*return*/, null];
            case 11: return [2 /*return*/];
        }
    });
}); };
var uploadWhatsappMedia = function (config, payload, pdfBuffer) { return __awaiter(void 0, void 0, void 0, function () {
    var filename, startedAt, phoneNumberId, pdfBytes, formData, response, responseBody, mediaId, error_3;
    var _a, _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                filename = "".concat(payload.invoiceNumber || payload.saleId, ".pdf");
                startedAt = Date.now();
                phoneNumberId = config.phoneNumberId;
                if (!phoneNumberId) {
                    console.error("[WHATSAPP_DEBUG] Step 6 - Media upload aborted. SaleId=".concat(payload.saleId, " InvoiceNumber=").concat(payload.invoiceNumber, " OrgId=").concat(payload.orgId, " Reason=Missing phoneNumberId"));
                    return [2 /*return*/, null];
                }
                console.log("[WHATSAPP_DEBUG] Step 6 - Media upload started. SaleId=".concat(payload.saleId, " InvoiceNumber=").concat(payload.invoiceNumber, " OrgId=").concat(payload.orgId, " PhoneNumberId=").concat(phoneNumberId ? "***masked***" : "missing", " Filename=").concat(filename));
                _c.label = 1;
            case 1:
                _c.trys.push([1, 4, , 5]);
                pdfBytes = new Uint8Array(pdfBuffer);
                formData = new FormData();
                formData.append("messaging_product", "whatsapp");
                formData.append("file", new Blob([pdfBytes], { type: "application/pdf" }), filename);
                formData.append("type", "application/pdf");
                return [4 /*yield*/, fetch("".concat(config.apiUrl.replace(/\/$/, ""), "/").concat(encodeURIComponent(phoneNumberId), "/media"), {
                        method: "POST",
                        headers: {
                            Authorization: "Bearer ".concat(config.accessToken),
                        },
                        body: formData,
                    })];
            case 2:
                response = _c.sent();
                return [4 /*yield*/, response.json().catch(function () { return null; })];
            case 3:
                responseBody = _c.sent();
                if (!response.ok) {
                    console.error("[WHATSAPP_DEBUG] Step 6 - Media upload failed. SaleId=".concat(payload.saleId, " InvoiceNumber=").concat(payload.invoiceNumber, " OrgId=").concat(payload.orgId, " HttpStatus=").concat(response.status, " ResponseBody=").concat(JSON.stringify(responseBody), " DurationMs=").concat(Date.now() - startedAt));
                    return [2 /*return*/, null];
                }
                mediaId = (_b = (_a = responseBody === null || responseBody === void 0 ? void 0 : responseBody.id) !== null && _a !== void 0 ? _a : responseBody === null || responseBody === void 0 ? void 0 : responseBody.media_id) !== null && _b !== void 0 ? _b : null;
                if (!mediaId) {
                    console.error("[WHATSAPP_DEBUG] Step 6 - Media upload response missing media_id. SaleId=".concat(payload.saleId, " InvoiceNumber=").concat(payload.invoiceNumber, " OrgId=").concat(payload.orgId, " ResponseBody=").concat(JSON.stringify(responseBody), " DurationMs=").concat(Date.now() - startedAt));
                    return [2 /*return*/, null];
                }
                console.log("[WHATSAPP_DEBUG] Step 7 - Media upload completed. SaleId=".concat(payload.saleId, " InvoiceNumber=").concat(payload.invoiceNumber, " OrgId=").concat(payload.orgId, " MediaId=").concat(mediaId, " DurationMs=").concat(Date.now() - startedAt));
                return [2 /*return*/, mediaId];
            case 4:
                error_3 = _c.sent();
                console.warn("[WHATSAPP_DEBUG] Step 6 - Media upload error. SaleId=".concat(payload.saleId, " InvoiceNumber=").concat(payload.invoiceNumber, " OrgId=").concat(payload.orgId, " CustomerMobile=").concat(payload.customerPhone ? "***masked***" : "missing", " Error=").concat(error_3 instanceof Error ? error_3.message : String(error_3), " Stack=").concat(error_3 instanceof Error ? error_3.stack : ""));
                return [2 /*return*/, null];
            case 5: return [2 /*return*/];
        }
    });
}); };
var ensureDeliveryTable = function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, db_1.prisma.$executeRawUnsafe("\n    CREATE TABLE IF NOT EXISTS notification_deliveries (\n      id TEXT PRIMARY KEY,\n      org_id TEXT NOT NULL,\n      store_id TEXT NOT NULL,\n      sale_id TEXT NOT NULL,\n      channel TEXT NOT NULL,\n      status TEXT NOT NULL,\n      provider TEXT NOT NULL,\n      error TEXT,\n      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,\n      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,\n      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP\n    )\n  ")];
            case 1:
                _a.sent();
                return [4 /*yield*/, db_1.prisma.$executeRawUnsafe("\n    CREATE INDEX IF NOT EXISTS idx_notification_deliveries_org_store_sale\n    ON notification_deliveries (org_id, store_id, sale_id)\n  ")];
            case 2:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); };
var upsertDeliveryRecord = function (payload, status, provider, details) { return __awaiter(void 0, void 0, void 0, function () {
    var id, startedAt, metadata, result, deliveryRecord, error_4;
    var _a, _b, _c, _d;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                id = (0, node_crypto_1.randomUUID)();
                startedAt = Date.now();
                _e.label = 1;
            case 1:
                _e.trys.push([1, 5, , 6]);
                return [4 /*yield*/, ensureDeliveryTable()];
            case 2:
                _e.sent();
                console.log("[WHATSAPP_DEBUG] Step 2 - Delivery record created. SaleId=".concat(payload.saleId, " InvoiceNumber=").concat(payload.invoiceNumber, " OrgId=").concat(payload.orgId, " Status=").concat(status, " Provider=").concat(provider, " DeliveryId=").concat(id));
                metadata = JSON.stringify((_a = details === null || details === void 0 ? void 0 : details.metadata) !== null && _a !== void 0 ? _a : {});
                return [4 /*yield*/, db_1.prisma.$executeRawUnsafe("\n        INSERT INTO notification_deliveries (id, org_id, store_id, sale_id, channel, status, provider, error, metadata, created_at, updated_at)\n        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)\n      ", id, payload.orgId, payload.storeId, payload.saleId, "WHATSAPP", status, provider, (_b = details === null || details === void 0 ? void 0 : details.error) !== null && _b !== void 0 ? _b : null, metadata)];
            case 3:
                _e.sent();
                return [4 /*yield*/, db_1.prisma.$queryRawUnsafe("SELECT id, status, provider, error FROM notification_deliveries WHERE id = $1", id)];
            case 4:
                result = _e.sent();
                deliveryRecord = (result[0] ? { id: result[0].id, status: result[0].status, provider: result[0].provider, error: result[0].error } : { id: id, status: status, provider: provider, error: (_c = details === null || details === void 0 ? void 0 : details.error) !== null && _c !== void 0 ? _c : null });
                console.log("[WHATSAPP_DEBUG] Step 2 - Delivery record saved successfully. SaleId=".concat(payload.saleId, " InvoiceNumber=").concat(payload.invoiceNumber, " OrgId=").concat(payload.orgId, " Status=").concat(deliveryRecord.status, " DeliveryId=").concat(deliveryRecord.id, " DurationMs=").concat(Date.now() - startedAt));
                return [2 /*return*/, deliveryRecord];
            case 5:
                error_4 = _e.sent();
                console.warn("[WHATSAPP_DEBUG] Step 2 - Delivery record persistence skipped. SaleId=".concat(payload.saleId, " InvoiceNumber=").concat(payload.invoiceNumber, " OrgId=").concat(payload.orgId, " Status=").concat(status, " Error=").concat(error_4 instanceof Error ? error_4.message : String(error_4), " Stack=").concat(error_4 instanceof Error ? error_4.stack : "", " DurationMs=").concat(Date.now() - startedAt));
                return [2 /*return*/, { id: id, status: status, provider: provider, error: (_d = details === null || details === void 0 ? void 0 : details.error) !== null && _d !== void 0 ? _d : null }];
            case 6: return [2 /*return*/];
        }
    });
}); };
var updateDeliveryRecord = function (recordId, status, details) { return __awaiter(void 0, void 0, void 0, function () {
    var startedAt, metadata, error_5;
    var _a, _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                startedAt = Date.now();
                _c.label = 1;
            case 1:
                _c.trys.push([1, 4, , 5]);
                return [4 /*yield*/, ensureDeliveryTable()];
            case 2:
                _c.sent();
                metadata = JSON.stringify((_a = details === null || details === void 0 ? void 0 : details.metadata) !== null && _a !== void 0 ? _a : {});
                console.log("[WHATSAPP_DEBUG] Step 10 - Delivery record update started. RecordId=".concat(recordId, " Status=").concat(status));
                return [4 /*yield*/, db_1.prisma.$executeRawUnsafe("\n        UPDATE notification_deliveries\n        SET status = $2, error = $3, metadata = $4::jsonb, updated_at = CURRENT_TIMESTAMP\n        WHERE id = $1\n      ", recordId, status, (_b = details === null || details === void 0 ? void 0 : details.error) !== null && _b !== void 0 ? _b : null, metadata)];
            case 3:
                _c.sent();
                console.log("[WHATSAPP_DEBUG] Step 10 - Delivery record update completed. RecordId=".concat(recordId, " Status=").concat(status, " DurationMs=").concat(Date.now() - startedAt));
                return [3 /*break*/, 5];
            case 4:
                error_5 = _c.sent();
                console.warn("[WHATSAPP_DEBUG] Step 10 - Delivery record update skipped. RecordId=".concat(recordId, " Status=").concat(status, " Error=").concat(error_5 instanceof Error ? error_5.message : String(error_5), " Stack=").concat(error_5 instanceof Error ? error_5.stack : "", " DurationMs=").concat(Date.now() - startedAt));
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); };
exports.whatsappInvoiceService = {
    queueInvoiceDelivery: function (payload) {
        return __awaiter(this, void 0, void 0, function () {
            var startedAt, config, normalizedPhone, recipientPhone, record, pdfBuffer, mediaId, error, error, requestUrl, messagePayload, response, responseStartedAt, responseBody, error, error_6, message;
            var _a, _b, _c, _d, _e, _f, _g, _h;
            return __generator(this, function (_j) {
                switch (_j.label) {
                    case 0:
                        startedAt = Date.now();
                        // TODO: Remove temporary debug logs before production
                        console.log("[WHATSAPP_DEBUG] queueInvoiceDelivery entered. SaleId=".concat(payload.saleId, " InvoiceNumber=").concat(payload.invoiceNumber, " OrgId=").concat(payload.orgId, " CustomerMobile=").concat(payload.customerPhone ? "***masked***" : "missing"));
                        config = getWhatsAppConfig(payload.orgId, payload.storeId);
                        if (!config.enabled) {
                            // TODO: Remove temporary debug logs before production
                            console.log("[WHATSAPP_DEBUG] Validation failed. Stage=WhatsAppEnabled SaleId=".concat(payload.saleId, " InvoiceNumber=").concat(payload.invoiceNumber, " OrgId=").concat(payload.orgId, " Reason=WhatsApp delivery disabled"));
                            return [2 /*return*/, upsertDeliveryRecord(payload, "SKIPPED", config.provider, { error: "WhatsApp delivery disabled", metadata: { reason: "disabled" } })];
                        }
                        if (!config.accessToken || !config.phoneNumberId) {
                            // TODO: Remove temporary debug logs before production
                            console.log("[WHATSAPP_DEBUG] Validation failed. Stage=Credentials SaleId=".concat(payload.saleId, " InvoiceNumber=").concat(payload.invoiceNumber, " OrgId=").concat(payload.orgId, " Reason=Missing WhatsApp credentials"));
                            return [2 /*return*/, upsertDeliveryRecord(payload, "SKIPPED", config.provider, { error: "Missing WhatsApp credentials", metadata: { reason: "missing-config" } })];
                        }
                        normalizedPhone = normalizePhone(payload.customerPhone);
                        recipientPhone = normalizePhone(payload.customerPhone);
                        // TODO: Remove temporary debug logs before production
                        console.log("[WHATSAPP_DEBUG] Validation passed. SaleId=".concat(payload.saleId, " InvoiceNumber=").concat(payload.invoiceNumber, " OrgId=").concat(payload.orgId, " CustomerMobile=***masked*** RecipientSource=customer_record"));
                        return [4 /*yield*/, upsertDeliveryRecord(payload, "PENDING", config.provider, { metadata: { phone: recipientPhone, originalPhone: normalizedPhone } })];
                    case 1:
                        record = _j.sent();
                        _j.label = 2;
                    case 2:
                        _j.trys.push([2, 14, , 16]);
                        return [4 /*yield*/, renderPdfBuffer(payload)];
                    case 3:
                        pdfBuffer = _j.sent();
                        mediaId = null;
                        if (!!pdfBuffer) return [3 /*break*/, 5];
                        error = "Invoice PDF generation failed; WhatsApp invoice template requires a document header media.";
                        console.warn("[WHATSAPP_DEBUG] ".concat(error, " SaleId=").concat(payload.saleId, " InvoiceNumber=").concat(payload.invoiceNumber, " OrgId=").concat(payload.orgId));
                        return [4 /*yield*/, updateDeliveryRecord(record.id, "FAILED", { error: error, metadata: { reason: "pdf_generation_failed" } })];
                    case 4:
                        _j.sent();
                        return [2 /*return*/, __assign(__assign({}, record), { status: "FAILED", error: error })];
                    case 5: return [4 /*yield*/, uploadWhatsappMedia(config, payload, pdfBuffer)];
                    case 6:
                        mediaId = _j.sent();
                        if (!!mediaId) return [3 /*break*/, 8];
                        error = "WhatsApp media upload failed; invoice template requires uploaded document header media.";
                        console.warn("[WHATSAPP_DEBUG] ".concat(error, " SaleId=").concat(payload.saleId, " InvoiceNumber=").concat(payload.invoiceNumber, " OrgId=").concat(payload.orgId));
                        return [4 /*yield*/, updateDeliveryRecord(record.id, "FAILED", { error: error, metadata: { reason: "media_upload_failed" } })];
                    case 7:
                        _j.sent();
                        return [2 /*return*/, __assign(__assign({}, record), { status: "FAILED", error: error })];
                    case 8:
                        requestUrl = "".concat(config.apiUrl.replace(/\/$/, ""), "/").concat(encodeURIComponent(config.phoneNumberId), "/messages");
                        messagePayload = buildWhatsAppTemplatePayload(recipientPhone, mediaId, payload, config);
                        return [4 /*yield*/, sendWhatsappTemplate(requestUrl, messagePayload, config, "document_template")];
                    case 9:
                        response = _j.sent();
                        responseStartedAt = Date.now();
                        return [4 /*yield*/, response.clone().json().catch(function () { return null; })];
                    case 10:
                        responseBody = _j.sent();
                        if (!!response.ok) return [3 /*break*/, 12];
                        error = (_b = (_a = responseBody === null || responseBody === void 0 ? void 0 : responseBody.error) === null || _a === void 0 ? void 0 : _a.message) !== null && _b !== void 0 ? _b : "WhatsApp delivery failed with status ".concat(response.status);
                        // TODO: Remove temporary debug logs before production
                        console.error("[WHATSAPP_DEBUG] Meta API response failed. SaleId=".concat(payload.saleId, " InvoiceNumber=").concat(payload.invoiceNumber, " OrgId=").concat(payload.orgId, " HttpStatus=").concat(response.status, " ResponseBody=").concat(JSON.stringify(responseBody), " DurationMs=").concat(Date.now() - responseStartedAt));
                        return [4 /*yield*/, updateDeliveryRecord(record.id, "FAILED", { error: error, metadata: { responseBody: responseBody } })];
                    case 11:
                        _j.sent();
                        return [2 /*return*/, __assign(__assign({}, record), { status: "FAILED", error: error })];
                    case 12:
                        // TODO: Remove temporary debug logs before production
                        console.log("[WHATSAPP_DEBUG] Meta API response succeeded. SaleId=".concat(payload.saleId, " InvoiceNumber=").concat(payload.invoiceNumber, " OrgId=").concat(payload.orgId, " HttpStatus=").concat(response.status, " MessageId=").concat((_e = (_d = (_c = responseBody === null || responseBody === void 0 ? void 0 : responseBody.messages) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.id) !== null && _e !== void 0 ? _e : "n/a", " ResponseBody=").concat(JSON.stringify(responseBody), " DurationMs=").concat(Date.now() - responseStartedAt));
                        return [4 /*yield*/, updateDeliveryRecord(record.id, "SENT", { metadata: { messageId: (_h = (_g = (_f = responseBody === null || responseBody === void 0 ? void 0 : responseBody.messages) === null || _f === void 0 ? void 0 : _f[0]) === null || _g === void 0 ? void 0 : _g.id) !== null && _h !== void 0 ? _h : null, mediaId: mediaId, recipientPhone: recipientPhone } })];
                    case 13:
                        _j.sent();
                        return [2 /*return*/, __assign(__assign({}, record), { status: "SENT", error: null })];
                    case 14:
                        error_6 = _j.sent();
                        message = error_6 instanceof Error ? error_6.message : "Unexpected WhatsApp delivery failure";
                        // TODO: Remove temporary debug logs before production
                        console.error("[WHATSAPP_DEBUG] Background task exception. Stage=QueueInvoiceDelivery SaleId=".concat(payload.saleId, " InvoiceNumber=").concat(payload.invoiceNumber, " OrgId=").concat(payload.orgId, " CustomerMobile=").concat(payload.customerPhone ? "***masked***" : "missing", " Error=").concat(message, " Stack=").concat(error_6 instanceof Error ? error_6.stack : ""));
                        return [4 /*yield*/, updateDeliveryRecord(record.id, "FAILED", { error: message, metadata: { reason: "exception" } })];
                    case 15:
                        _j.sent();
                        return [2 /*return*/, __assign(__assign({}, record), { status: "FAILED", error: message })];
                    case 16: return [2 /*return*/];
                }
            });
        });
    },
};
