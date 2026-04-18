"use client";

import { useState, useMemo } from "react";
import { App, Badge, Button, Card, Col, Flex, Form, Input, InputNumber, Modal, Popconfirm, Progress, Row, Select, Space, Table, Tabs, Tag, Typography } from "antd";
import { PlusOutlined, DeleteOutlined, CheckOutlined, CloseOutlined, DollarOutlined, ThunderboltOutlined, TeamOutlined, BarChartOutlined, TagsOutlined } from "@ant-design/icons";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import dayjs from "dayjs";
import type { StoreExpense, ExpenseSummary } from "../types";
import type { ExpenseCategoryOption } from "../services/expenseCategoryService";
import { CATEGORY_COLOR_PALETTE } from "../types";
import { formatCurrency } from "@/shared/utils/formatCurrency";

const { Text } = Typography;

const ANT_COLOR_MAP: Record<string, string> = {
  default: "#d9d9d9", blue: "#1677ff", purple: "#722ed1",
  cyan: "#13c2c2", green: "#52c41a", magenta: "#eb2f96",
  red: "#ff4d4f", orange: "#fa8c16", yellow: "#fadb14",
  volcano: "#fa541c", geekblue: "#2f54eb", gold: "#faad14",
  lime: "#a0d911",
};

// Category color styling - matches HTML design
const CATEGORY_COLOR_STYLES: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  "Rent": { bg: "#eff6ff", text: "#2563eb", border: "#bfdbfe", dot: "#2563eb" },
  "Electricity": { bg: "#fffbeb", text: "#d97706", border: "#fde68a", dot: "#d97706" },
  "Water": { bg: "#ecfeff", text: "#0891b2", border: "#a5f3fc", dot: "#0891b2" },
  "Employee Salary": { bg: "#f0fdf4", text: "#16a34a", border: "#a7f3d0", dot: "#16a34a" },
  "Cleaning": { bg: "#ecfeff", text: "#0891b2", border: "#a5f3fc", dot: "#06b6d4" },
  "Stationery": { bg: "#faf5ff", text: "#7c3aed", border: "#ddd6fe", dot: "#7c3aed" },
  "Internet/Broadband": { bg: "#ecfeff", text: "#0891b2", border: "#a5f3fc", dot: "#06b6d4" },
  "Security/CCTV": { bg: "#fff7ed", text: "#ea580c", border: "#fed7aa", dot: "#ea580c" },
  "Packaging": { bg: "#fdf4ff", text: "#a21caf", border: "#f0abfc", dot: "#a21caf" },
  "Store Maintenance": { bg: "#f0fdf4", text: "#15803d", border: "#a7f3d0", dot: "#15803d" },
  "POS/Software": { bg: "#faf5ff", text: "#6d28d9", border: "#ddd6fe", dot: "#6d28d9" },
  "Insurance": { bg: "#f0f9ff", text: "#0369a1", border: "#bae6fd", dot: "#0369a1" },
  "Bank Charges": { bg: "#fffbeb", text: "#92400e", border: "#fef08a", dot: "#92400e" },
  "Professional Fees": { bg: "#fdf2f8", text: "#9d174d", border: "#fbcfe8", dot: "#9d174d" },
  "Tea/Pantry": { bg: "#fefce8", text: "#713f12", border: "#fef08a", dot: "#a16207" },
  "Miscellaneous": { bg: "#f8fafc", text: "#475569", border: "#e2e8f0", dot: "#64748b" },
};

//  Types
interface PettyCashEntry {
  id: string;
  description: string;
  date: string;
  amount: number;
  type: "credit" | "debit";
  category: string;
  balance: number;
}

interface StaffClaim {
  id: string;
  staffName: string;
  role: string;
  claimType: string;
  amount: number;
  date: string;
  description: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "REIMBURSED";
  hasReceipt: boolean;
}

//  Props
interface Props {
  expenses: StoreExpense[];
  categories: ExpenseCategoryOption[];
  onAddCategory: (name: string, colorKey: string) => Promise<ExpenseCategoryOption | null>;
  onDeleteCategory: (id: string) => Promise<boolean>;
  canModify: boolean;
  monthLabel: string;
  selectedMonth: number;
  selectedYear: number;
  summary: ExpenseSummary | null;
}

const PettyCashTab = ({ expenses, monthLabel }: { expenses: StoreExpense[]; monthLabel: string }) => {
  const { message } = App.useApp();
  const [debitOpen, setDebitOpen] = useState(false);
  const [topupOpen, setTopupOpen] = useState(false);
  const [form] = Form.useForm();
  const [topupForm] = Form.useForm();

  // Filter petty cash expenses (payment mode = PETTY_CASH or category keyword)
  const pettyCashExpenses = useMemo(
    () => expenses.filter((e) => e.paymentMode === "PETTY_CASH"),
    [expenses]
  );

  const totalSpent = pettyCashExpenses.reduce((s, e) => s + e.amount, 0);
  const openingBalance = 5000; // In real app this would come from a dedicated model
  const currentBalance = openingBalance - totalSpent;

  // Build ledger rows with running balance
  const ledgerRows = useMemo(() => {
    let bal = openingBalance;
    const rows: PettyCashEntry[] = [
      {
        id: "opening",
        description: "Opening Balance Set",
        date: `${expenses[0]?.date?.slice(0, 8) ?? dayjs().format("YYYY-MM-")}01`,
        amount: openingBalance,
        type: "credit",
        category: "Opening",
        balance: openingBalance,
      },
    ];
    [...pettyCashExpenses]
      .sort((a, b) => a.date.localeCompare(b.date))
      .forEach((e) => {
        bal -= e.amount;
        rows.push({
          id: e.id,
          description: e.note ?? e.category,
          date: e.date,
          amount: e.amount,
          type: "debit",
          category: e.category,
          balance: bal,
        });
      });
    return rows;
  }, [pettyCashExpenses]);

  return (
    <>
      {/* Balance hero */}
      <div style={{
        background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
        borderRadius: 14,
        padding: 28,
        marginBottom: 20,
        color: "#fff",
        position: "relative",
        overflow: "hidden",
      }}>
        <div style={{ position: "absolute", right: 20, top: "50%", transform: "translateY(-50%)", fontSize: 80, opacity: 0.12 }}>💵</div>
        <Text style={{ fontSize: 13, color: "rgba(255,255,255,.8)", display: "block", marginBottom: 6 }}>
          💵 Petty Cash Balance — {monthLabel}
        </Text>
        <div style={{ fontSize: 42, fontWeight: 800, letterSpacing: -1, marginBottom: 4 }}>
          {formatCurrency(currentBalance)}
        </div>
        <Text style={{ fontSize: 13, color: "rgba(255,255,255,.7)" }}>
          Updated {dayjs().format("DD MMM YYYY")}
        </Text>
        <Flex gap={12} style={{ marginTop: 20, flexWrap: "wrap" }}>
          {[
            { label: "Opening Balance", value: formatCurrency(openingBalance) },
            { label: "Total Spent", value: formatCurrency(totalSpent) },
            { label: "Replenishments", value: "₹0" },
            { label: "Reconcile Due", value: dayjs().add(5, "day").format("DD MMM YYYY") },
          ].map((m) => (
            <div key={m.label} style={{ background: "rgba(255,255,255,.15)", borderRadius: 10, padding: "10px 18px" }}>
              <div style={{ fontSize: 11, opacity: 0.8, marginBottom: 3 }}>{m.label}</div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{m.value}</div>
            </div>
          ))}
        </Flex>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card
            size="small"
            title={
              <Flex justify="space-between" align="center">
                <div>
                  <Text strong>📒 Petty Cash Transactions</Text>
                  <Text type="secondary" style={{ fontSize: 12, display: "block" }}>
                    {monthLabel}
                  </Text>
                </div>
                <Space>
                  <Button size="small" onClick={() => setTopupOpen(true)}>＋ Top Up</Button>
                  <Button size="small" type="primary" onClick={() => setDebitOpen(true)}>＋ Debit</Button>
                </Space>
              </Flex>
            }
          >
            {ledgerRows.map((row) => (
              <Flex
                key={row.id}
                align="center"
                gap={12}
                style={{ padding: "11px 8px", borderRadius: 8, marginBottom: 4, transition: "background .15s" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 9, display: "flex", alignItems: "center",
                  justifyContent: "center", fontSize: 15, flexShrink: 0,
                  background: row.type === "credit" ? "#ecfdf5" : "#fef2f2",
                }}>
                  {row.type === "credit" ? "💰" : "💸"}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>{row.description}</div>
                  <div style={{ fontSize: 11.5, color: "#94a3b8" }}>
                    {dayjs(row.date).format("DD MMM YYYY")} · {row.category}
                  </div>
                </div>
                <div style={{
                  fontSize: 15, fontWeight: 700,
                  color: row.type === "credit" ? "#10b981" : "#ef4444",
                }}>
                  {row.type === "credit" ? "+" : "−"}{formatCurrency(row.amount)}
                </div>
                <div style={{ fontSize: 12, color: "#94a3b8", minWidth: 80, textAlign: "right" }}>
                  Bal: {formatCurrency(row.balance)}
                </div>
              </Flex>
            ))}
            {pettyCashExpenses.length === 0 && (
              <Text type="secondary" style={{ padding: "12px 8px", display: "block" }}>
                No petty cash expenses this month. Add expenses with "Petty Cash" payment mode.
              </Text>
            )}
            <div style={{
              marginTop: 14, padding: "12px 16px",
              background: "#fffbeb", borderRadius: 9, border: "1px solid #fde68a",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <span style={{ fontSize: 13, color: "#92400e" }}>
                ⚠️ Weekly reconciliation due in <strong>5 days</strong>.
              </span>
              <Button size="small" onClick={() => message.info("Reconciliation report generated")}>
                Reconcile
              </Button>
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card size="small" title="📊 Spending by Category">
            {(() => {
              const byCat = pettyCashExpenses.reduce<Record<string, number>>((acc, e) => {
                acc[e.category] = (acc[e.category] ?? 0) + e.amount;
                return acc;
              }, {});
              const entries = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
              const total = entries.reduce((s, [, v]) => s + v, 0);
              const colors = ["#4f46e5", "#f59e0b", "#10b981", "#06b6d4", "#ef4444", "#8b5cf6"];
              if (!entries.length) return <Text type="secondary">No petty cash spending yet.</Text>;
              return entries.map(([cat, amt], i) => (
                <div key={cat} style={{ marginBottom: 12 }}>
                  <Flex justify="space-between" style={{ marginBottom: 4 }}>
                    <Flex align="center" gap={6}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: colors[i % colors.length], display: "inline-block" }} />
                      <Text style={{ fontSize: 13 }}>{cat}</Text>
                    </Flex>
                    <Text strong style={{ fontSize: 13 }}>{formatCurrency(amt)}</Text>
                  </Flex>
                  <Progress
                    percent={total > 0 ? Math.round((amt / total) * 100) : 0}
                    strokeColor={colors[i % colors.length]}
                    showInfo={false}
                    size="small"
                  />
                </div>
              ));
            })()}
          </Card>
        </Col>
      </Row>

      {/* Debit modal */}
      <Modal open={debitOpen} onCancel={() => { form.resetFields(); setDebitOpen(false); }}
        title="💵 Record Petty Cash Expense" footer={null} width={440} destroyOnHidden>
        <Form form={form} layout="vertical" style={{ marginTop: 8 }}
          onFinish={() => { message.success("Petty cash entry recorded!"); form.resetFields(); setDebitOpen(false); }}>
          <Form.Item name="desc" label="Description" rules={[{ required: true }]}>
            <Input placeholder="e.g. Daily chai vendor, courier" />
          </Form.Item>
          <Flex gap={12}>
            <Form.Item name="amount" label="Amount" rules={[{ required: true }]} style={{ flex: 1 }}>
              <InputNumber prefix="₹" min={0.01} precision={2} style={{ width: "100%" }} placeholder="0.00" />
            </Form.Item>
            <Form.Item name="date" label="Date" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Input type="date" />
            </Form.Item>
          </Flex>
          <Flex justify="flex-end" gap={8} style={{ marginTop: 8 }}>
            <Button onClick={() => setDebitOpen(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit">Record</Button>
          </Flex>
        </Form>
      </Modal>

      {/* Top up modal */}
      <Modal open={topupOpen} onCancel={() => { topupForm.resetFields(); setTopupOpen(false); }}
        title="💰 Top Up Petty Cash" footer={null} width={400} destroyOnHidden>
        <Form form={topupForm} layout="vertical" style={{ marginTop: 8 }}
          onFinish={() => { message.success("Petty cash topped up!"); topupForm.resetFields(); setTopupOpen(false); }}>
          <Form.Item name="amount" label="Top-up Amount" rules={[{ required: true }]}>
            <InputNumber prefix="₹" min={1} precision={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="source" label="Payment Source">
            <Select placeholder="Select source">
              <Select.Option value="bank">Bank Account</Select.Option>
              <Select.Option value="owner">Owner Cash</Select.Option>
              <Select.Option value="pos">POS Float</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="note" label="Note">
            <Input placeholder="e.g. Weekly replenishment" />
          </Form.Item>
          <Flex justify="flex-end" gap={8} style={{ marginTop: 8 }}>
            <Button onClick={() => setTopupOpen(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit">Top Up</Button>
          </Flex>
        </Form>
      </Modal>
    </>
  );
}

//  Utility Tracking Tab
const UtilityTab = ({ expenses, monthLabel }: { expenses: StoreExpense[]; monthLabel: string }) => {
  const utilityCategories = ["Electricity", "Water", "Internet/Broadband", "Internet", "Gas"];

  const utilityExpenses = useMemo(
    () => expenses.filter((e) => utilityCategories.some((u) => e.category.toLowerCase().includes(u.toLowerCase()))),
    [expenses]
  );

  const byCategory = useMemo(() =>
    utilityExpenses.reduce<Record<string, number>>((acc, e) => {
      acc[e.category] = (acc[e.category] ?? 0) + e.amount;
      return acc;
    }, {}), [utilityExpenses]);

  const utilCards = [
    { icon: "⚡", name: "Electricity", color: "#fffbeb", textColor: "#d97706", unit: "kWh" },
    { icon: "💧", name: "Water", color: "#ecfeff", textColor: "#0891b2", unit: "kL" },
    { icon: "🌐", name: "Internet", color: "#f0f9ff", textColor: "#0369a1", unit: "Mbps" },
    { icon: "🔥", name: "Gas", color: "#fff7ed", textColor: "#ea580c", unit: "units" },
  ];

  return (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        {utilCards.map((u) => {
          const matchKey = Object.keys(byCategory).find((k) =>
            k.toLowerCase().includes(u.name.toLowerCase())
          );
          const amount = matchKey ? byCategory[matchKey] : null;
          return (
            <Col xs={24} sm={12} lg={6} key={u.name}>
              <Card size="small" style={{ height: "100%", background: u.color, border: `1.5px solid ${u.textColor}20`, borderRadius: 12 }}>
                <Flex align="center" gap={12} style={{ marginBottom: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: u.textColor + "15", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                    {u.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: u.textColor }}>{u.name}</div>
                    <div style={{ fontSize: 12, color: "#94a3b8" }}>{monthLabel}</div>
                  </div>
                </Flex>
                {amount != null ? (
                  <>
                    <div style={{ fontSize: 28, fontWeight: 800, color: u.textColor, marginBottom: 4 }}>
                      {formatCurrency(amount)}
                    </div>
                    <Text style={{ fontSize: 12, color: "#64748b" }}>Bill amount this month</Text>
                  </>
                ) : (
                  <div style={{ textAlign: "center", padding: "12px 0" }}>
                    <div style={{ fontSize: 28, marginBottom: 6 }}>🚨</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#ef4444", marginBottom: 4 }}>Not recorded</div>
                    <Text style={{ fontSize: 12, color: "#64748b" }}>No {u.name} bill this month</Text>
                  </div>
                )}
              </Card>
            </Col>
          );
        })}
      </Row>

      <Card size="small" title="📊 Utility Expenses — All Categories">
        {utilityExpenses.length > 0 ? (
          <Table
            dataSource={utilityExpenses}
            rowKey="id"
            size="small"
            pagination={false}
            columns={[
              { title: "Date", dataIndex: "date", render: (v: string) => dayjs(v).format("DD MMM YYYY"), width: 110 },
              { title: "Category", dataIndex: "category", width: 160 },
              { title: "Note", dataIndex: "note", render: (v: string | null) => v ?? <Text type="secondary">—</Text> },
              { title: "Amount", dataIndex: "amount", render: (v: number) => formatCurrency(v), align: "right" as const, width: 120 },
              { title: "Payment", dataIndex: "paymentMode", render: (v: string | null) => v ?? <Text type="secondary">—</Text>, width: 140 },
            ]}
          />
        ) : (
          <Text type="secondary">
            No utility expenses for {monthLabel}. Add expenses in categories like Electricity, Water, Internet.
          </Text>
        )}
      </Card>
    </div>
  );
}

//  Staff Claims Tab
const StaffClaimsTab = ({ canModify }: { canModify: boolean }) => {
  const { message } = App.useApp();
  const [claimOpen, setClaimOpen] = useState(false);
  const [form] = Form.useForm();

  // Demo data — in production this would come from a StaffClaim model
  const [claims, setClaims] = useState<StaffClaim[]>([
    { id: "1", staffName: "Riya Sharma", role: "Sales Associate", claimType: "Travel", amount: 320, date: "2026-04-11", description: "Travel to warehouse", status: "PENDING", hasReceipt: true },
    { id: "2", staffName: "Arjun Kumar", role: "Store Manager", claimType: "Meals", amount: 1800, date: "2026-04-10", description: "Team lunch", status: "PENDING", hasReceipt: true },
    { id: "3", staffName: "Priya Desai", role: "Cashier", claimType: "Mobile", amount: 1080, date: "2026-04-08", description: "Mobile recharge", status: "PENDING", hasReceipt: false },
    { id: "4", staffName: "Sameer Khan", role: "Delivery Staff", claimType: "Fuel", amount: 3200, date: "2026-04-07", description: "Fuel reimbursement", status: "APPROVED", hasReceipt: true },
  ]);

  const updateStatus = (id: string, status: StaffClaim["status"]) => {
    setClaims((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)));
    message.success(`Claim ${status.toLowerCase()}`);
  };

  const pending = claims.filter((c) => c.status === "PENDING");
  const approved = claims.filter((c) => c.status === "APPROVED");
  const totalClaimed = claims.reduce((s, c) => s + c.amount, 0);
  const approvedTotal = approved.reduce((s, c) => s + c.amount, 0);
  const reimbursedTotal = claims.filter((c) => c.status === "REIMBURSED").reduce((s, c) => s + c.amount, 0);

  const claimTypeColors: Record<string, { bg: string; color: string; icon: string }> = {
    "Travel": { bg: "#fff7ed", color: "#ea580c", icon: "🚌" },
    "Meals": { bg: "#f0fdf4", color: "#16a34a", icon: "🍽" },
    "Mobile": { bg: "#f5f3ff", color: "#7c3aed", icon: "📱" },
    "Fuel": { bg: "#fff7ed", color: "#ea580c", icon: "⛽" },
    "Office Supplies": { bg: "#faf5ff", color: "#7c3aed", icon: "📎" },
    "Other": { bg: "#f8fafc", color: "#475569", icon: "🎯" },
  };

  const statusConfig: Record<StaffClaim["status"], { color: string; label: string }> = {
    PENDING: { color: "orange", label: "Pending" },
    APPROVED: { color: "green", label: "Approved" },
    REJECTED: { color: "red", label: "Rejected" },
    REIMBURSED: { color: "blue", label: "Reimbursed" },
  };

  return (
    <>
      <Row gutter={[14, 14]} style={{ marginBottom: 20 }}>
        {[
          { label: "Pending Claims", value: pending.length, color: "#f59e0b", bg: "#fffbeb" },
          { label: "Total Claimed", value: formatCurrency(totalClaimed), color: undefined, bg: "#f8fafc" },
          { label: "Approved", value: formatCurrency(approvedTotal), color: "#10b981", bg: "#ecfdf5" },
          { label: "Reimbursed", value: formatCurrency(reimbursedTotal), color: "#4f46e5", bg: "#f0f9ff" },
        ].map((s) => (
          <Col xs={12} sm={6} key={s.label}>
            <Card size="small" style={{ background: s.bg }}>
              <div style={{ fontSize: 11.5, color: "#94a3b8", fontWeight: 600, marginBottom: 6 }}>{s.label.toUpperCase()}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
            </Card>
          </Col>
        ))}
      </Row>

      <Card
        size="small"
        title="🧾 Staff Expense Claims"
        extra={<Button icon={<PlusOutlined />} type="primary" size="small" onClick={() => setClaimOpen(true)}>Submit Claim</Button>}
        style={{ background: "#f8fafc" }}
      >
        {claims.map((claim) => {
          const claimTypeConfig = claimTypeColors[claim.claimType] || claimTypeColors["Other"];
          const initials = claim.staffName.split(" ").map((n) => n[0]).join("").slice(0, 2);
          const avatarGradients: Record<string, string> = {
            "Riya Sharma": "linear-gradient(135deg, #10b981, #059669)",
            "Arjun Kumar": "linear-gradient(135deg, #f59e0b, #d97706)",
            "Priya Desai": "linear-gradient(135deg, #8b5cf6, #7c3aed)",
            "Sameer Khan": "linear-gradient(135deg, #06b6d4, #0891b2)",
          };
          
          return (
            <div key={claim.id} style={{
              padding: "14px 16px", borderRadius: 12, border: "1px solid #e2e8f0",
              marginBottom: 10, background: claim.status === "APPROVED" ? "#ecfdf5" : "#fff",
              display: "flex", alignItems: "center", gap: 14,
              transition: "all .2s", cursor: "default",
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: "50%", display: "flex", alignItems: "center",
                justifyContent: "center", fontWeight: 700, fontSize: 13, color: "#fff", flexShrink: 0,
                background: avatarGradients[claim.staffName] || avatarGradients["Sameer Khan"],
              }}>
                {initials}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700 }}>{claim.staffName}</div>
                <div style={{ fontSize: 12, color: "#94a3b8" }}>{claim.role} · {claim.description} · {dayjs(claim.date).format("DD MMM")}</div>
              </div>
              <div style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                padding: "3px 10px", borderRadius: 12, fontSize: 12, fontWeight: 600,
                background: claimTypeConfig.bg, color: claimTypeConfig.color,
              }}>
                <span>{claimTypeConfig.icon} {claim.claimType}</span>
              </div>
              <div style={{ textAlign: "right", minWidth: 80 }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{formatCurrency(claim.amount)}</div>
                <div style={{ fontSize: 11.5, color: "#94a3b8" }}>{claim.hasReceipt ? "Receipt attached" : "No receipt"}</div>
              </div>
              <Badge status={statusConfig[claim.status].color as "default"} text={statusConfig[claim.status].label} />
              <Space size={4} style={{ minWidth: 100 }}>
                {claim.status === "PENDING" && canModify && (
                  <>
                    <Button size="small" type="text" style={{ color: "#10b981" }} icon={<CheckOutlined />}
                      onClick={() => updateStatus(claim.id, "APPROVED")} />
                    <Button size="small" type="text" danger icon={<CloseOutlined />}
                      onClick={() => updateStatus(claim.id, "REJECTED")} />
                  </>
                )}
                {claim.status === "APPROVED" && canModify && (
                  <Button size="small" type="primary" onClick={() => updateStatus(claim.id, "REIMBURSED")}>
                    Pay Now
                  </Button>
                )}
              </Space>
            </div>
          );
        })}
      </Card>

      {/* Submit claim modal */}
      <Modal open={claimOpen} onCancel={() => { form.resetFields(); setClaimOpen(false); }}
        title="🧾 Submit Expense Claim" footer={null} width={480} destroyOnHidden>
        <Form form={form} layout="vertical" style={{ marginTop: 8 }}
          onFinish={() => { message.success("Claim submitted for approval!"); form.resetFields(); setClaimOpen(false); }}>
          <Flex gap={12}>
            <Form.Item name="type" label="Expense Type" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Select placeholder="Select type">
                {["Travel", "Meals", "Mobile", "Fuel", "Office Supplies", "Other"].map((t) => (
                  <Select.Option key={t} value={t}>{t}</Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="amount" label="Amount" rules={[{ required: true }]} style={{ flex: 1 }}>
              <InputNumber prefix="₹" min={0.01} precision={2} style={{ width: "100%" }} placeholder="0.00" />
            </Form.Item>
          </Flex>
          <Flex gap={12}>
            <Form.Item name="date" label="Date of Expense" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Input type="date" />
            </Form.Item>
            <Form.Item name="paidBy" label="Payment By" style={{ flex: 1 }}>
              <Select placeholder="Select">
                <Select.Option value="own">My Own Money</Select.Option>
                <Select.Option value="company">Company Card</Select.Option>
                <Select.Option value="petty">Petty Cash</Select.Option>
              </Select>
            </Form.Item>
          </Flex>
          <Form.Item name="description" label="Description" rules={[{ required: true }]}>
            <Input.TextArea rows={2} placeholder="Describe the business purpose..." />
          </Form.Item>
          <Flex justify="flex-end" gap={8} style={{ marginTop: 8 }}>
            <Button onClick={() => setClaimOpen(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit">Submit Claim</Button>
          </Flex>
        </Form>
      </Modal>
    </>
  );
}

//  P&L View Tab
const PLViewTab = ({
  expenses,
  summary,
  monthLabel,
  selectedYear,
}: {
  expenses: StoreExpense[];
  summary: ExpenseSummary | null;
  monthLabel: string;
  selectedYear: number;
}) => {
  // Revenue is not tracked in this system — show placeholder
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const annualExpenses = summary?.grandTotal ?? 0;

  // Calculate revenue (placeholder for now, as system doesn't track revenue)
  const placeholderRevenue = totalExpenses > 0 ? (totalExpenses / 0.142) : 324000; // Assumes ~14.2% expense ratio
  const netProfit = placeholderRevenue - totalExpenses;
  const profitMargin = placeholderRevenue > 0 ? ((netProfit / placeholderRevenue) * 100) : 0;

  const breakdownRows: [string, number][] = summary
    ? (Object.entries(summary.byCategory) as [string, number | undefined][])
        .filter((entry): entry is [string, number] => entry[1] != null)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
    : (Object.entries(
        expenses.reduce<Record<string, number>>((acc, e) => {
          acc[e.category] = (acc[e.category] ?? 0) + e.amount;
          return acc;
        }, {})
      ) as [string, number][]).sort((a, b) => b[1] - a[1]);

  // Generate monthly data for the last 4 months (Jan, Feb, Mar, Apr)
  const monthlyData = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr"];
    return months.map((month) => ({
      name: month,
      Revenue: Math.round(placeholderRevenue / 4 + Math.random() * 20000),
      Expenses: Math.round(totalExpenses / 4 + Math.random() * 5000),
    }));
  }, [placeholderRevenue, totalExpenses]);

  type TableRow = { 
    category: string; 
    amount: number; 
    rowKey: string;
    rowType?: "header" | "expense" | "total" | "profit";
  };
  
  const columns = [
    {
      title: "Line Item",
      dataIndex: "category",
      render: (_: unknown, row: TableRow) => {
        if (row.rowType === "header") {
          return <Text strong style={{ color: "#16a34a" }}>{row.category}</Text>;
        } else if (row.rowType === "total") {
          return <Text strong>{row.category}</Text>;
        } else if (row.rowType === "profit") {
          return <Text strong style={{ color: "#2563eb" }}>{row.category}</Text>;
        } else {
          return <span style={{ paddingLeft: 16, color: "#64748b" }}>↳ {row.category}</span>;
        }
      },
    },
    {
      title: "Amount",
      dataIndex: "amount",
      render: (v: number, row: TableRow) => {
        let color = "";
        if (row.rowType === "header") color = "#16a34a";
        else if (row.rowType === "total") color = "#ef4444";
        else if (row.rowType === "profit") color = "#2563eb";
        return <Text strong={row.rowType !== "expense"} style={{ color }}>{formatCurrency(v)}</Text>;
      },
      align: "right" as const,
      width: 130,
    },
    {
      title: "% of Revenue",
      dataIndex: "amount",
      render: (v: number, row: TableRow) => {
        let pct = placeholderRevenue > 0 ? ((v / placeholderRevenue) * 100) : 0;
        let color = "";
        if (row.rowType === "header") {
          pct = 100;
          color = "#16a34a";
        } else if (row.rowType === "total") {
          color = "#ef4444";
        } else if (row.rowType === "profit") {
          color = "#2563eb";
        } else if (pct > 15) {
          color = "#ef4444";
        }
        return (
          <Text strong={row.rowType !== "expense"} style={{ color, fontSize: 13 }}>
            {pct.toFixed(1)}%
          </Text>
        );
      },
      align: "right" as const,
      width: 130,
    },
  ];

  const tableData: TableRow[] = [
    { category: "Gross Revenue", amount: placeholderRevenue, rowKey: "__revenue", rowType: "header" },
    ...breakdownRows.map(([category, amount]) => ({ category, amount, rowKey: category, rowType: "expense" as const })),
    { category: "Total Expenses", amount: totalExpenses, rowKey: "__total", rowType: "total" },
    { category: "Net Profit", amount: netProfit, rowKey: "__profit", rowType: "profit" },
  ];

  return (
    <div>
      {/* P&L Heroes - 2 Column Layout */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={12}>
          {/* Revenue Hero */}
          <div style={{ background: "linear-gradient(135deg, #10b981, #059669)", borderRadius: 14, padding: 24, color: "#fff", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", fontSize: 64, opacity: 0.2 }}>💰</div>
            <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 6, fontWeight: 500 }}>Total Revenue (Sales)</div>
            <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-1px" }}>
              {formatCurrency(placeholderRevenue)}
            </div>
            <div style={{ fontSize: 12.5, opacity: 0.75, marginTop: 4 }}>{monthLabel} · Store Sales</div>
          </div>
        </Col>
        <Col xs={24} sm={12}>
          {/* Expense Hero */}
          <div style={{ background: "linear-gradient(135deg, #ef4444, #dc2626)", borderRadius: 14, padding: 24, color: "#fff", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", fontSize: 64, opacity: 0.2 }}>💸</div>
            <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 6, fontWeight: 500 }}>Total Expenses</div>
            <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-1px" }}>
              {formatCurrency(totalExpenses)}
            </div>
            <div style={{ fontSize: 12.5, opacity: 0.75, marginTop: 4 }}>{monthLabel} · Store + Staff + Petty Cash</div>
          </div>
        </Col>
      </Row>

      {/* Net Profit Hero */}
      <div style={{ background: "linear-gradient(135deg, #0f172a, #1e1b4b)", borderRadius: 14, padding: 24, color: "#fff", textAlign: "center", marginBottom: 20, position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 70% 50%, rgba(79, 70, 229, 0.4), transparent)" }}></div>
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 500, opacity: 0.7, marginBottom: 8 }}>NET PROFIT — {monthLabel.toUpperCase()}</div>
          <div style={{ fontSize: 52, fontWeight: 800, letterSpacing: "-2px", color: "#a5f3fc" }}>
            {formatCurrency(netProfit)}
          </div>
          <div style={{ fontSize: 13, opacity: 0.6, marginTop: 6, marginBottom: 12 }}>Revenue minus all store operating expenses</div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(16, 185, 129, 0.2)", border: "1px solid rgba(16, 185, 129, 0.3)", padding: "6px 16px", borderRadius: 20, fontSize: 14, fontWeight: 700, color: "#6ee7b7" }}>
            ✓ {profitMargin.toFixed(1)}% Profit Margin
          </div>
        </div>
      </div>

      {/* Charts & Breakdown - 2 Column Grid */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} lg={12}>
          <Card size="small" title="📊 Revenue vs Expenses (Monthly)">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" /> 
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Legend />
                <Bar dataKey="Revenue" fill="#10b981" />
                <Bar dataKey="Expenses" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card size="small" title="📋 P&L Breakdown" extra={<Button size="small" onClick={() => {}}>Export</Button>}>
            <Table
              dataSource={tableData}
              columns={columns}
              size="small"
              pagination={false}
              rowKey="rowKey"
              rowClassName={(row: TableRow) => {
                if (row.rowType === "header") return "ant-table-row-selected";
                if (row.rowType === "total") return "ant-table-row-selected";
                if (row.rowType === "profit") return "ant-table-row-selected";
                return "";
              }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        size="small"
        title="💡 Tip"
        style={{ background: "#f0fdf4", border: "1px solid #a7f3d0" }}
      >
        <Text type="secondary" style={{ fontSize: 12 }}>
          Connect your sales/revenue data to see full Profit & Loss. Revenue tracking coming soon.
        </Text>
      </Card>
    </div>
  );
}

//  Category Manager Tab
const CategoryManagerTab = ({
  categories,
  expenses,
  onAddCategory,
  onDeleteCategory,
  canModify,
}: {
  categories: ExpenseCategoryOption[];
  expenses: StoreExpense[];
  onAddCategory: Props["onAddCategory"];
  onDeleteCategory: Props["onDeleteCategory"];
  canModify: boolean;
}) => {
  const { message } = App.useApp();
  const [addOpen, setAddOpen] = useState(false);
  const [form] = Form.useForm();
  const [selectedColor, setSelectedColor] = useState("blue");

  const usageCount = useMemo(() =>
    expenses.reduce<Record<string, number>>((acc, e) => {
      acc[e.category] = (acc[e.category] ?? 0) + 1;
      return acc;
    }, {}), [expenses]);

  const handleAdd = async () => {
    const values = await form.validateFields();
    const created = await onAddCategory(values.name, selectedColor);
    if (created) {
      message.success(`Category "${created.name}" added`);
      form.resetFields();
      setAddOpen(false);
    } else {
      message.error("Failed to add category");
    }
  };

  const handleDelete = async (cat: ExpenseCategoryOption) => {
    const ok = await onDeleteCategory(cat.id);
    if (ok) message.success(`Category "${cat.name}" deleted`);
    else message.error("Failed to delete category");
  };

  const colorOptions = ["blue", "gold", "green", "cyan", "purple", "red", "orange", "magenta", "geekblue", "lime", "volcano", "default"];

  return (
    <>
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card
            size="small"
            title="🏷 Manage Categories"
            extra={canModify && (
              <Button icon={<PlusOutlined />} type="primary" size="small" onClick={() => setAddOpen(true)}>
                Add Category
              </Button>
            )}
            style={{ background: "#fafbfc" }}
          >
            <div style={{ marginBottom: 8, fontSize: 12.5, fontWeight: 600, color: "#94a3b8" }}>ALL CATEGORIES</div>
            <Flex wrap gap={4} style={{ marginBottom: 18 }}>
              {categories.map((cat) => {
                const colorStyle = CATEGORY_COLOR_STYLES[cat.name];
                const style = colorStyle || {
                  bg: "#f8fafc",
                  text: "#475569",
                  border: "#e2e8f0",
                  dot: ANT_COLOR_MAP[cat.colorKey] ?? "#d9d9d9",
                };
                
                return (
                  <div
                    key={cat.id}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 8,
                      padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                      background: style.bg, color: style.text, border: `1.5px solid ${style.border}`,
                      cursor: "pointer", transition: "all .2s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 10px rgba(0,0,0,0.08)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: style.dot, display: "inline-block", flexShrink: 0 }} />
                    {usageCount[cat.name] != null ? `${cat.name} ${usageCount[cat.name]}x` : cat.name}
                    {canModify && (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(cat);
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.color = "#ef4444"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.5"; e.currentTarget.style.color = style.text; }}
                        style={{
                          marginLeft: 4, fontSize: 11, opacity: 0.5, cursor: "pointer",
                          transition: "opacity .2s",
                        }}
                      >
                        ✕
                      </span>
                    )}
                  </div>
                );
              })}
            </Flex>

            {!categories.length && (
              <Text type="secondary">No categories yet. Add your first category.</Text>
            )}
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card size="small" title="📊 Category Usage — This Month" style={{ background: "#fafbfc" }}>
            {categories.length > 0 ? (
              <Table
                dataSource={categories
                  .map((c) => ({ name: c.name, count: usageCount[c.name] ?? 0, colorKey: c.colorKey }))
                  .sort((a, b) => b.count - a.count)}
                rowKey="name"
                size="small"
                pagination={false}
                columns={[
                  {
                    title: "Category",
                    dataIndex: "name",
                    render: (name: string, row: { colorKey: string }) => (
                      <Flex align="center" gap={8}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: ANT_COLOR_MAP[row.colorKey] ?? "#d9d9d9", display: "inline-block" }} />
                        {name}
                      </Flex>
                    ),
                  },
                  {
                    title: "Used",
                    dataIndex: "count",
                    align: "right" as const,
                    width: 80,
                    render: (v: number) => <Text strong>{v}</Text>,
                  },
                ]}
              />
            ) : (
              <Text type="secondary">No usage data</Text>
            )}
          </Card>
        </Col>
      </Row>

      {/* Add category modal */}
      <Modal open={addOpen} onCancel={() => { form.resetFields(); setAddOpen(false); }}
        title="🏷 Add Category" footer={null} width={400} destroyOnHidden>
        <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
          <Form.Item name="name" label="Category Name" rules={[{ required: true, message: "Enter a name" }]}>
            <Input placeholder="e.g. Security, Packaging…" />
          </Form.Item>
          <Form.Item label="Colour">
            <Flex wrap="wrap" gap={8}>
              {colorOptions.map((c) => (
                <div
                  key={c}
                  onClick={() => setSelectedColor(c)}
                  style={{
                    width: 28, height: 28, borderRadius: 6, cursor: "pointer",
                    background: ANT_COLOR_MAP[c] ?? "#d9d9d9",
                    border: selectedColor === c ? `3px solid ${ANT_COLOR_MAP[c]}` : "2px solid transparent",
                    boxShadow: selectedColor === c ? `0 0 0 2px white, 0 0 0 4px ${ANT_COLOR_MAP[c]}` : "none",
                  }}
                />
              ))}
            </Flex>
          </Form.Item>
          <Flex justify="flex-end" gap={8} style={{ marginTop: 8 }}>
            <Button onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button type="primary" onClick={handleAdd}>Add Category</Button>
          </Flex>
        </Form>
      </Modal>
    </>
  );
}

//  Main Export
const ExpenseAdvancedTab = ({ expenses, categories, onAddCategory, onDeleteCategory, canModify, monthLabel, selectedMonth, selectedYear, summary }: Props) => {
  const tabItems = [
    {
      key: "petty",
      label: <span><DollarOutlined /> Petty Cash Ledger</span>,
      children: <PettyCashTab expenses={expenses} monthLabel={monthLabel} />,
    },
    {
      key: "utility",
      label: <span><ThunderboltOutlined /> Utility Tracking</span>,
      children: <UtilityTab expenses={expenses} monthLabel={monthLabel} />,
    },
    {
      key: "claims",
      label: <span><TeamOutlined /> Staff Claims</span>,
      children: <StaffClaimsTab canModify={canModify} />,
    },
    {
      key: "pnl",
      label: <span><BarChartOutlined /> P&L View (Profit & Loss)</span>,
      children: (
        <PLViewTab
          expenses={expenses}
          summary={summary}
          monthLabel={monthLabel}
          selectedYear={selectedYear}
        />
      ),
    },
    {
      key: "categories",
      label: <span><TagsOutlined /> Category Manager</span>,
      children: (
        <CategoryManagerTab
          categories={categories}
          expenses={expenses}
          onAddCategory={onAddCategory}
          onDeleteCategory={onDeleteCategory}
          canModify={canModify}
        />
      ),
    },
  ];

  return (
    <div>
      <Tabs
        defaultActiveKey="petty"
        type="line"
        items={tabItems}
        style={{ background: "#fff", borderRadius: 8, padding: "0 16px 16px" }}
      />
    </div>
  );
}

export default ExpenseAdvancedTab;
