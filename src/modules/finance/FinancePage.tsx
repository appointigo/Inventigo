"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Alert, App, Button, DatePicker, Form, Input, InputNumber, Modal, Select, Space, Table, Tabs, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useCurrentUser } from "@/modules/auth/hooks/useAuth";
import { useStore } from "@/providers/StoreProvider";
import { formatCurrency } from "@/shared/utils/formatCurrency";
import type { FinanceSummary } from "./types";
import styles from "./FinancePage.module.css";

type Account = { id: string; name: string; type: string; storeId: string | null; openingBalance: number; openingBalanceAsOf: string | null; store?: { name: string } | null; paymentMappings: Array<{ paymentMethod: string; store: { name: string } }> };
type Payable = { id: string; supplier: { name: string }; store: { name: string }; supplierInvoiceNumber: string | null; dueDate: string | null; originalAmount: number; paidAmount: number; outstandingAmount: number; status: string; agingBucket: string | null };
type Refund = { id: string; store: { name: string }; returnTransaction: { referenceNumber: string; businessDate: string }; liabilityAmount: number; settledAmount: number; outstandingAmount: number; status: string };
type LedgerRow = { id: string; businessDate: string; direction: string; amount: number; category: string; description: string | null; referenceType: string; account: { name: string } | null; store: { name: string } | null };
type FinanceData = { summary: FinanceSummary; accounts: Account[]; payables: Payable[]; refunds: Refund[]; ledger: { items: LedgerRow[]; total: number } };

const request = async (url: string, init?: RequestInit) => {
  const response = await fetch(url, init);
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error ?? "Finance request failed");
  return data;
};
const json = (body: unknown): RequestInit => ({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
const agingLabel: Record<string, string> = { NOT_DUE: "Not due", DUE_TODAY: "Due today", OVERDUE_0_7: "0–7 overdue", OVERDUE_8_30: "8–30 overdue", OVERDUE_31_60: "31–60 overdue", OVERDUE_61_90: "61–90 overdue", OVERDUE_90_PLUS: "90+ overdue", DUE_DATE_MISSING: "Due date missing" };

export default function FinancePage() {
  const { message } = App.useApp();
  const { user } = useCurrentUser();
  const { storeId } = useStore();
  const fixedStore = user?.storeId ?? null;
  const [scope, setScope] = useState<"organization" | "store">(fixedStore ? "store" : "organization");
  const [dialog, setDialog] = useState<"account" | "mapping" | "payable" | "payment" | "refund" | "transfer" | "adjustment" | null>(null);
  const [selected, setSelected] = useState<Payable | Refund | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const scopedStoreId = fixedStore ?? (scope === "store" ? storeId : null);
  const queryString = scopedStoreId ? `?storeId=${encodeURIComponent(scopedStoreId)}` : "";
  const query = useQuery({
    queryKey: ["finance", scopedStoreId],
    enabled: Boolean(user && (scope === "organization" || scopedStoreId)),
    queryFn: async (): Promise<FinanceData> => {
      const [summary, accounts, payables, refunds, ledger] = await Promise.all([
        request(`/api/finance/summary${queryString}`), request(`/api/finance/accounts${queryString}`), request(`/api/finance/payables${queryString}`), request(`/api/finance/refunds${queryString}`), request(`/api/finance/ledger${queryString}`),
      ]);
      return { summary, accounts, payables, refunds, ledger };
    },
  });
  const data = query.data;
  const accountOptions = useMemo(() => (data?.accounts ?? []).map((a) => ({ value: a.id, label: `${a.name}${a.store ? ` · ${a.store.name}` : " · Organization"}` })), [data?.accounts]);

  const open = (next: typeof dialog, row?: Payable | Refund) => {
    form.resetFields();
    setSelected(row ?? null);
    setDialog(next);
  };
  const submit = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      const dates = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, dayjs.isDayjs(value) ? value.format("YYYY-MM-DD") : value]));
      if (["payment", "refund", "transfer", "adjustment"].includes(dialog ?? "")) dates.idempotencyKey = crypto.randomUUID();
      const target = dialog === "account" ? "/api/finance/accounts"
        : dialog === "mapping" ? "/api/finance/accounts/mappings"
        : dialog === "payable" ? "/api/finance/payables"
        : dialog === "payment" ? `/api/finance/payables/${selected?.id}/payments`
        : dialog === "refund" ? `/api/finance/refunds/${selected?.id}/settlements`
        : dialog === "adjustment" ? "/api/finance/adjustments"
        : "/api/finance/transfers";
      if (dialog === "account") dates.storeId = scopedStoreId;
      if (dialog === "mapping") dates.storeId = scopedStoreId;
      await request(target, json(dates));
      message.success("Finance record saved");
      setDialog(null);
      await query.refetch();
    } catch (error) {
      if (error instanceof Error && error.message) message.error(error.message);
    } finally { setSaving(false); }
  };

  const payableColumns: ColumnsType<Payable> = [
    { title: "Supplier", dataIndex: ["supplier", "name"] }, { title: "Invoice", dataIndex: "supplierInvoiceNumber", render: (v) => v || "—" }, { title: "Due", dataIndex: "dueDate", render: (v) => v ? new Date(v).toLocaleDateString("en-IN") : "Missing" },
    { title: "Aging", dataIndex: "agingBucket", render: (v) => v ? <Tag color={v.startsWith("OVERDUE") ? "red" : v === "DUE_DATE_MISSING" ? "gold" : "default"}>{agingLabel[v] ?? v}</Tag> : "—" },
    { title: "Original", dataIndex: "originalAmount", render: formatCurrency }, { title: "Paid", dataIndex: "paidAmount", render: formatCurrency }, { title: "Outstanding", dataIndex: "outstandingAmount", render: (v) => <strong>{formatCurrency(v)}</strong> },
    { title: "", render: (_, row) => row.outstandingAmount > 0 ? <Button size="small" onClick={() => open("payment", row)}>Record payment</Button> : null },
  ];
  const refundColumns: ColumnsType<Refund> = [
    { title: "Return", dataIndex: ["returnTransaction", "referenceNumber"] }, { title: "Store", dataIndex: ["store", "name"] }, { title: "Liability", dataIndex: "liabilityAmount", render: formatCurrency }, { title: "Settled", dataIndex: "settledAmount", render: formatCurrency }, { title: "Outstanding", dataIndex: "outstandingAmount", render: (v) => <strong>{formatCurrency(v)}</strong> }, { title: "Status", dataIndex: "status", render: (v) => <Tag>{v}</Tag> },
    { title: "", render: (_, row) => row.outstandingAmount > 0 ? <Button size="small" onClick={() => open("refund", row)}>Settle refund</Button> : null },
  ];
  const ledgerColumns: ColumnsType<LedgerRow> = [
    { title: "Business date", dataIndex: "businessDate", render: (v) => new Date(v).toLocaleDateString("en-IN") }, { title: "Account", render: (_, r) => r.account?.name ?? <Tag color="gold">Unmapped</Tag> }, { title: "Category", dataIndex: "category" }, { title: "Description", dataIndex: "description" }, { title: "Direction", dataIndex: "direction", render: (v) => <Tag color={v === "INFLOW" ? "green" : "red"}>{v}</Tag> }, { title: "Amount", dataIndex: "amount", render: formatCurrency },
  ];

  return <main className={styles.page}>
    <header className={styles.header}><div><h1>Cash & Financial Planning</h1><p>Actual settlement evidence, supplier obligations, refund liabilities and short-term cash coverage. Profitability remains separate from cash.</p></div><Space wrap>{!fixedStore && <Select value={scope} onChange={setScope} options={[{ value: "organization", label: "Organization" }, { value: "store", label: "Current store" }]} /> }<Button onClick={() => query.refetch()} loading={query.isFetching}>Refresh</Button></Space></header>
    {query.error && <Alert showIcon type="error" message={query.error.message} />}
    {scope === "store" && !scopedStoreId && <Alert showIcon type="warning" message="Select a store to view store finance." />}
    {data && <>
      {data.summary.completeness.length > 0 && <Alert showIcon type="warning" message="Finance data is incomplete" description={`No values were fabricated. Evidence gaps: ${data.summary.completeness.join(", ")}.`} />}
      <section className={styles.metrics}>{[
        ["Available cash", formatCurrency(data.summary.cash.total)], ["Month inflows", formatCurrency(data.summary.movement.inflows)], ["Month outflows", formatCurrency(data.summary.movement.outflows)], ["Supplier payables", formatCurrency(data.summary.payables.outstanding)], ["Pending refunds", formatCurrency(data.summary.refunds.outstanding)],
      ].map(([label, value]) => <article className={styles.metric} key={label}><span>{label}</span><strong>{value}</strong></article>)}</section>
      <section className={`${styles.surface} ${styles.coverage}`}>{(["sevenDay", "thirtyDay"] as const).map((key) => { const item = data.summary.coverage[key]; return <article key={key}><h3>{key === "sevenDay" ? "7-day" : "30-day"} obligation coverage</h3><dl><dt>Available cash</dt><dd>{formatCurrency(data.summary.cash.total)}</dd><dt>Known obligations</dt><dd>{formatCurrency(item.obligations)}</dd><dt>{item.isCovered ? "Cash buffer" : "Cash gap"}</dt><dd className={item.isCovered ? "" : styles.danger}>{formatCurrency(item.isCovered ? item.buffer : item.gap)}</dd></dl></article>; })}</section>
      <section className={styles.surface}><Tabs items={[
        { key: "accounts", label: "Cash & accounts", children: <><Space wrap style={{ marginBottom: 12 }}><Button type="primary" onClick={() => open("account")}>New account</Button>{scopedStoreId && <Button onClick={() => open("mapping")}>Map payment method</Button>}<Button onClick={() => open("adjustment")} disabled={!data.accounts.length}>Adjustment</Button><Button onClick={() => open("transfer")} disabled={data.accounts.length < 2}>Transfer</Button></Space><Table rowKey="id" dataSource={data.accounts} pagination={false} columns={[{ title: "Account", dataIndex: "name" }, { title: "Scope", render: (_, r) => r.store?.name ?? "Organization" }, { title: "Type", dataIndex: "type" }, { title: "Opening evidence", render: (_, r) => r.openingBalanceAsOf ? `${formatCurrency(r.openingBalance)} · ${new Date(r.openingBalanceAsOf).toLocaleDateString("en-IN")}` : <Tag color="gold">Missing</Tag> }, { title: "Mapped methods", render: (_, r) => r.paymentMappings.map((m) => `${m.paymentMethod} · ${m.store.name}`).join(", ") || "None" }]} /></> },
        { key: "movement", label: "Cash movement", children: <Table rowKey="id" dataSource={data.ledger.items} columns={ledgerColumns} scroll={{ x: 900 }} /> },
        { key: "payables", label: `Payables (${data.summary.payables.count})`, children: <><Button type="primary" onClick={() => open("payable")} style={{ marginBottom: 12 }}>Create from receipt</Button><Table rowKey="id" dataSource={data.payables} columns={payableColumns} scroll={{ x: 1050 }} /></> },
        { key: "refunds", label: `Refunds (${data.summary.refunds.count})`, children: <Table rowKey="id" dataSource={data.refunds} columns={refundColumns} scroll={{ x: 900 }} /> },
        { key: "capital", label: "Working capital", children: <><div className={styles.metrics}>{[["Receivables", data.summary.receivables], ["Inventory", data.summary.workingCapital.inventoryValue], ["Payables", data.summary.payables.outstanding], ["Excess inventory", data.summary.workingCapital.excessInventoryValue], ["Inbound inventory", data.summary.workingCapital.inboundInventoryValue]].map(([label, value]) => <article className={styles.metric} key={label}><span>{label}</span><strong>{formatCurrency(Number(value))}</strong></article>)}</div><p><strong>Retail operating working capital snapshot: {formatCurrency(data.summary.workingCapital.operatingWorkingCapital)}</strong></p>{data.summary.workingCapital.limitations.map((x) => <div className={styles.muted} key={x}>• {x}</div>)}</> },
        { key: "actions", label: `Finance actions (${data.summary.actions.length})`, children: data.summary.actions.length ? data.summary.actions.map((a) => <div className={styles.action} key={a.code}><strong>{a.title}{a.amount != null ? ` · ${formatCurrency(a.amount)}` : ""}</strong><span>{a.reason}</span></div>) : <span className={styles.muted}>No finance actions from current evidence.</span> },
      ]} /></section>
    </>}
    <Modal open={Boolean(dialog)} title={{ account: "New financial account", mapping: "Map payment method", payable: "Create supplier payable", payment: "Record supplier payment", refund: "Settle refund", transfer: "Transfer between accounts", adjustment: "Cash adjustment" }[dialog ?? "account"]} onCancel={() => setDialog(null)} onOk={submit} confirmLoading={saving} destroyOnHidden>
      <Form form={form} layout="vertical" initialValues={{ type: "BANK", currency: "INR", paymentDate: dayjs(), settledAt: dayjs(), businessDate: dayjs(), invoiceDate: dayjs() }}>
        {dialog === "account" && <><Form.Item name="name" label="Account name" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="type" label="Type" rules={[{ required: true }]}><Select options={["CASH", "BANK", "UPI_SETTLEMENT", "OTHER"].map((v) => ({ value: v, label: v }))} /></Form.Item><Form.Item name="openingBalance" label="Opening balance"><InputNumber min={0} style={{ width: "100%" }} /></Form.Item><Form.Item name="openingBalanceAsOf" label="Opening balance as of"><DatePicker style={{ width: "100%" }} /></Form.Item><Form.Item name="currency" label="Currency"><Input /></Form.Item></>}
        {dialog === "mapping" && <><Form.Item name="paymentMethod" label="Payment method" rules={[{ required: true }]}><Select options={["CASH", "CARD", "UPI"].map((v) => ({ value: v, label: v }))} /></Form.Item><Form.Item name="accountId" label="Financial account" rules={[{ required: true }]}><Select options={accountOptions} /></Form.Item></>}
        {dialog === "payable" && <><Form.Item name="receiptId" label="Goods receipt ID" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="supplierInvoiceNumber" label="Supplier invoice number"><Input /></Form.Item><Form.Item name="invoiceDate" label="Invoice date" rules={[{ required: true }]}><DatePicker style={{ width: "100%" }} /></Form.Item><Form.Item name="dueDate" label="Due date"><DatePicker style={{ width: "100%" }} /></Form.Item><Form.Item name="originalAmount" label="Invoice amount" rules={[{ required: true }]}><InputNumber min={0.01} style={{ width: "100%" }} /></Form.Item></>}
        {(dialog === "payment" || dialog === "refund") && <><Alert type="info" showIcon message={`Outstanding: ${formatCurrency(Number(selected && "outstandingAmount" in selected ? selected.outstandingAmount : 0))}`} style={{ marginBottom: 12 }} /><Form.Item name="amount" label="Settlement amount" rules={[{ required: true }]}><InputNumber min={0.01} style={{ width: "100%" }} /></Form.Item><Form.Item name="accountId" label="Financial account"><Select allowClear options={accountOptions} /></Form.Item><Form.Item name="method" label="Method"><Input /></Form.Item><Form.Item name={dialog === "payment" ? "paymentDate" : "settledAt"} label="Settlement date" rules={[{ required: true }]}><DatePicker style={{ width: "100%" }} /></Form.Item><Form.Item name="reference" label="Reference"><Input /></Form.Item></>}
        {dialog === "transfer" && <><Form.Item name="sourceAccountId" label="From" rules={[{ required: true }]}><Select options={accountOptions} /></Form.Item><Form.Item name="destinationAccountId" label="To" rules={[{ required: true }]}><Select options={accountOptions} /></Form.Item><Form.Item name="amount" label="Amount" rules={[{ required: true }]}><InputNumber min={0.01} style={{ width: "100%" }} /></Form.Item><Form.Item name="businessDate" label="Business date" rules={[{ required: true }]}><DatePicker style={{ width: "100%" }} /></Form.Item><Form.Item name="reference" label="Reference"><Input /></Form.Item></>}
        {dialog === "adjustment" && <><Form.Item name="accountId" label="Account" rules={[{ required: true }]}><Select options={accountOptions} /></Form.Item><Form.Item name="direction" label="Direction" rules={[{ required: true }]}><Select options={[{ value: "INFLOW", label: "Inflow" }, { value: "OUTFLOW", label: "Outflow" }]} /></Form.Item><Form.Item name="amount" label="Amount" rules={[{ required: true }]}><InputNumber min={0.01} style={{ width: "100%" }} /></Form.Item><Form.Item name="businessDate" label="Business date" rules={[{ required: true }]}><DatePicker style={{ width: "100%" }} /></Form.Item><Form.Item name="category" label="Category"><Input /></Form.Item><Form.Item name="description" label="Reason / evidence"><Input.TextArea /></Form.Item></>}
      </Form>
    </Modal>
  </main>;
}
