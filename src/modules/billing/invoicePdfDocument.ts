import React from "react";
import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { buildInvoiceDocumentModel, type InvoiceDocumentInput, type InvoiceSection } from "./invoiceDocumentModel.ts";

const h = React.createElement;
const styles = StyleSheet.create({
  page: { paddingTop: 38, paddingBottom: 46, paddingHorizontal: 38, fontFamily: "Helvetica", fontSize: 9, color: "#172033", backgroundColor: "#ffffff" },
  header: { borderBottomWidth: 2, borderBottomColor: "#172033", paddingBottom: 12, marginBottom: 16, textAlign: "center" },
  merchantName: { fontFamily: "Helvetica-Bold", fontSize: 20, marginBottom: 4 },
  title: { color: "#667085", fontSize: 10 },
  merchantDetail: { color: "#667085", fontSize: 8, marginTop: 3 },
  meta: { flexDirection: "row", justifyContent: "space-between", gap: 20, marginBottom: 15 },
  metaColumn: { width: "48%", lineHeight: 1.55 },
  metaRight: { width: "48%", lineHeight: 1.55, textAlign: "right" },
  metaLine: { flexDirection: "row", flexWrap: "wrap" },
  label: { fontFamily: "Helvetica-Bold" },
  metaLabel: { fontFamily: "Helvetica-Bold", marginRight: 2 },
  section: { marginTop: 12 },
  sectionTitle: { fontFamily: "Helvetica-Bold", fontSize: 11, marginBottom: 6 },
  tableHeader: { flexDirection: "row", backgroundColor: "#f1f4f8", borderBottomWidth: 1, borderBottomColor: "#cfd6df", paddingVertical: 6 },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e1e6ed", paddingVertical: 7, minHeight: 28 },
  index: { width: "7%", paddingHorizontal: 4 },
  product: { width: "43%", paddingHorizontal: 4 },
  productWide: { width: "58%", paddingHorizontal: 4 },
  unit: { width: "20%", paddingHorizontal: 4, textAlign: "right" },
  quantity: { width: "10%", paddingHorizontal: 4, textAlign: "right" },
  total: { width: "20%", paddingHorizontal: 4, textAlign: "right" },
  productName: { fontFamily: "Helvetica-Bold", lineHeight: 1.25 },
  productDetail: { color: "#667085", fontSize: 7.5, marginTop: 2, lineHeight: 1.25 },
  totals: { width: 285, marginLeft: "auto", marginTop: 16 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", gap: 12, paddingVertical: 3 },
  totalLabel: { flexGrow: 1 },
  totalValue: { textAlign: "right" },
  grand: { borderTopWidth: 2, borderTopColor: "#172033", marginTop: 4, paddingTop: 7, fontFamily: "Helvetica-Bold", fontSize: 11 },
  footer: { position: "absolute", bottom: 22, left: 38, right: 38, flexDirection: "row", justifyContent: "space-between", color: "#667085", fontSize: 7.5 },
  policy: { marginTop: 18, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#d7dde5", color: "#566074", fontSize: 7.5, lineHeight: 1.45 },
  policyTitle: { fontFamily: "Helvetica-Bold", color: "#172033", marginBottom: 3 },
  policyBlock: { marginBottom: 7 },
});

const designStyles = StyleSheet.create({
  premiumPage: { paddingTop: 30, paddingHorizontal: 44, color: "#172554" },
  premiumHeader: { borderBottomColor: "#c59a3d", borderBottomWidth: 3, textAlign: "left", backgroundColor: "#f8f5ec", padding: 16 },
  premiumTableHeader: { backgroundColor: "#172554", color: "#ffffff", borderBottomColor: "#172554" },
  premiumGrand: { borderTopColor: "#c59a3d", color: "#172554" },
  compactPage: { paddingTop: 24, paddingBottom: 34, paddingHorizontal: 28, fontSize: 8 },
  compactHeader: { paddingBottom: 7, marginBottom: 10, textAlign: "left", borderBottomWidth: 1 },
  compactMeta: { marginBottom: 8 },
  compactTableHeader: { paddingVertical: 4 },
  compactTableRow: { paddingVertical: 4, minHeight: 20 },
  compactTotals: { marginTop: 10, width: 250 },
});

function textLine(label: string, value?: string) {
  if (!value) return null;
  return h(View, { style: styles.metaLine },
    h(Text, { style: styles.metaLabel }, `${label}:`),
    h(Text, null, value)
  );
}

function table(section: InvoiceSection, sectionIndex: number, designKey: string) {
  const productStyle = section.showUnitPrice ? styles.product : styles.productWide;
  const compact = designKey === "COMPACT";
  const premium = designKey === "PREMIUM";
  return h(View, { style: styles.section, key: `section-${sectionIndex}` },
    section.title ? h(Text, { style: styles.sectionTitle }, section.title) : null,
    h(View, { style: [styles.tableHeader, ...(premium ? [designStyles.premiumTableHeader] : []), ...(compact ? [designStyles.compactTableHeader] : [])], wrap: false },
      h(Text, { style: [styles.index, styles.label] }, "#"),
      h(Text, { style: [productStyle, styles.label] }, "Product"),
      section.showUnitPrice ? h(Text, { style: [styles.unit, styles.label] }, "Price") : null,
      h(Text, { style: [styles.quantity, styles.label] }, "Qty"),
      h(Text, { style: [styles.total, styles.label] }, "Total")
    ),
    ...section.rows.map(row => h(View, { style: [styles.tableRow, ...(compact ? [designStyles.compactTableRow] : [])], wrap: false, key: `${sectionIndex}-${row.index}` },
      h(Text, { style: styles.index }, String(row.index)),
      h(View, { style: productStyle },
        h(Text, { style: styles.productName }, row.name),
        row.detail ? h(Text, { style: styles.productDetail }, row.detail) : null
      ),
      section.showUnitPrice ? h(Text, { style: styles.unit }, row.unitPrice) : null,
      h(Text, { style: styles.quantity }, String(row.quantity)),
      h(Text, { style: styles.total }, row.total)
    ))
  );
}

export function InvoicePdfDocument(input: InvoiceDocumentInput) {
  const model = buildInvoiceDocumentModel(input);
  const merchantContact = [model.merchant.address, model.merchant.phone].filter(Boolean).join(" | ");
  const premium = model.designKey === "PREMIUM";
  const compact = model.designKey === "COMPACT";
  return h(Document, { title: `${model.title} ${model.reference}`, author: model.merchant.name },
    h(Page, { size: "A4", style: [styles.page, ...(premium ? [designStyles.premiumPage] : []), ...(compact ? [designStyles.compactPage] : [])], wrap: true },
      h(View, { style: [styles.header, ...(premium ? [designStyles.premiumHeader] : []), ...(compact ? [designStyles.compactHeader] : [])], wrap: false },
        h(Text, { style: styles.merchantName }, model.merchant.name),
        model.merchant.subtitle ? h(Text, { style: styles.merchantDetail }, model.merchant.subtitle) : null,
        h(Text, { style: styles.title }, model.title),
        merchantContact ? h(Text, { style: styles.merchantDetail }, merchantContact) : null
      ),
      h(View, { style: [styles.meta, ...(compact ? [designStyles.compactMeta] : [])], wrap: false },
        h(View, { style: styles.metaColumn },
          textLine("Reference", model.reference),
          textLine("Date", model.issuedAt),
          textLine("Original invoice", model.originalInvoice),
          textLine("Payment", model.paymentMethod)
        ),
        h(View, { style: styles.metaRight },
          textLine("Customer", model.customerName),
          textLine("Phone", model.customerPhone),
          textLine("Status", model.status)
        )
      ),
      ...model.sections.map((section, index) => table(section, index, model.designKey)),
      h(View, { style: [styles.totals, ...(compact ? [designStyles.compactTotals] : [])], wrap: false },
        ...model.totals.map((row, index) => h(View, {
          style: row.emphasis ? [styles.totalRow, styles.grand, ...(premium ? [designStyles.premiumGrand] : [])] : styles.totalRow,
          wrap: false,
          key: `total-${index}`,
        },
        h(Text, { style: styles.totalLabel }, row.label),
        h(Text, { style: styles.totalValue }, row.value)))
      ),
      model.termsText || model.returnPolicyText ? h(View, { style: styles.policy, wrap: false },
        model.termsText ? h(View, { style: styles.policyBlock },
          h(Text, { style: styles.policyTitle }, "Terms & Conditions"),
          h(Text, null, model.termsText)
        ) : null,
        model.returnPolicyText ? h(View, { style: styles.policyBlock },
          h(Text, { style: styles.policyTitle }, "Exchange / Return Policy"),
          h(Text, null, model.returnPolicyText)
        ) : null
      ) : null,
      h(View, { style: styles.footer, fixed: true },
        h(Text, null, [model.thankYouMessage || "Thank you for shopping with us.", model.signatureText, model.footerNote, model.qrHelperText].filter(Boolean).join(" | ")),
        h(Text, { render: ({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}` })
      )
    )
  );
}

export async function renderInvoicePdf(input: InvoiceDocumentInput): Promise<Buffer> {
  return Buffer.from(await renderToBuffer(InvoicePdfDocument(input)));
}
