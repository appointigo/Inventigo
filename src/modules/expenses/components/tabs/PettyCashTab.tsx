import { useState, useMemo } from "react";
import { App, Button, Flex, Form, Input, InputNumber, Modal, Card, Row, Col, Progress, Select, Typography } from "antd";
import type { StoreExpense } from "../../types";
import { formatCurrency } from "@/shared/utils/formatCurrency";
import { HeroCard, HeroTitle, HeroValue, HeroSubtitle, MetricBox, LedgerRow, LedgerIcon, LedgerContent, LedgerAmount, LedgerBalance, ReconcileAlert } from "../ExpenseAdvancedTab.styled";
import dayjs from "dayjs";
import { PlusOutlined } from "@ant-design/icons";

interface PettyCashEntry {
  id: string;
  description: string;
  date: string;
  amount: number;
  type: "credit" | "debit";
  category: string;
  balance: number;
}

interface PettyCashTabProps {
  expenses: StoreExpense[];
  monthLabel: string;
}

const { Text } = Typography;

const PettyCashTab = ({ expenses, monthLabel }: PettyCashTabProps) => {
  const { message } = App.useApp();
  const [debitOpen, setDebitOpen] = useState(false);
  const [topupOpen, setTopupOpen] = useState(false);
  const [form] = Form.useForm();
  const [topupForm] = Form.useForm();

  const pettyCashExpenses = useMemo(
    () => expenses.filter((e) => e.paymentMode === "PETTY_CASH"),
    [expenses]
  );

  const { totalSpent, currentBalance, ledgerRows } = useMemo(() => {
    const openingBalance = 5000;
    const total = pettyCashExpenses.reduce((s, e) => s + e.amount, 0);
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

    return {
      totalSpent: total,
      currentBalance: openingBalance - total,
      ledgerRows: rows,
    };
  }, [pettyCashExpenses, expenses]);

  const handleAddDebit = async () => {
    const values = await form.validateFields();
    message.success("Petty cash entry recorded!");
    form.resetFields();
    setDebitOpen(false);
  };

  const handleTopUp = async () => {
    const values = await topupForm.validateFields();
    message.success("Petty cash topped up!");
    topupForm.resetFields();
    setTopupOpen(false);
  };

  const pettyCashMetrics = [
    { label: "Opening Balance", value: formatCurrency(5000) },
    { label: "Total Spent", value: formatCurrency(totalSpent) },
    { label: "Replenishments", value: "₹0" },
    {
      label: "Reconcile Due",
      value: dayjs().add(5, "day").format("DD MMM YYYY"),
    },
  ];

  return (
    <>
      {/* Balance Hero */}
      <HeroCard gradient="linear-gradient(135deg, #4f46e5, #7c3aed)" style={{ marginBottom: 20 }}>
        <HeroTitle>💵 Petty Cash Balance — {monthLabel}</HeroTitle>
        <HeroValue fontSize={42}>{formatCurrency(currentBalance)}</HeroValue>
        <HeroSubtitle>Updated {dayjs().format("DD MMM YYYY")}</HeroSubtitle>

        <Flex gap={12} wrap style={{ marginTop: 20}}>
          {pettyCashMetrics.map((m) => (
            <MetricBox key={m.label}>
              <div>{m.label}</div>
              <div>{m.value}</div>
            </MetricBox>
          ))}
        </Flex>
      </HeroCard>

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
                <Flex gap={8}>
                  <Button size="small" icon={<PlusOutlined />} onClick={() => setTopupOpen(true)}>
                     Top Up
                  </Button>
                  <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => setDebitOpen(true)}>
                    Debit
                  </Button>
                </Flex>
              </Flex>
            }
          >
            {ledgerRows.map((row) => (
              <LedgerRow key={row.id}>
                <LedgerIcon type={row.type}>
                  {row.type === "credit" ? "💰" : "💸"}
                </LedgerIcon>
                <LedgerContent>
                  <div>{row.description}</div>
                  <div>
                    {dayjs(row.date).format("DD MMM YYYY")} · {row.category}
                  </div>
                </LedgerContent>
                <LedgerAmount type={row.type}>
                  {row.type === "credit" ? "+" : "−"}
                  {formatCurrency(row.amount)}
                </LedgerAmount>
                <LedgerBalance>Bal: {formatCurrency(row.balance)}</LedgerBalance>
              </LedgerRow>
            ))}

            {pettyCashExpenses.length === 0 && (
              <Text type="secondary" style={{ padding: "12px 8px", display: "block" }}>
                No petty cash expenses this month. Add expenses with "Petty Cash" payment mode.
              </Text>
            )}

            <ReconcileAlert>
              <span>⚠️ Weekly reconciliation due in <strong>5 days</strong>.</span>
              <Button
                size="small"
                onClick={() => message.info("Reconciliation report generated")}
              >
                Reconcile
              </Button>
            </ReconcileAlert>
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card size="small" title="📊 Spending by Category">
            {(() => {
              const byCat = pettyCashExpenses.reduce<Record<string, number>>(
                (acc, e) => {
                  acc[e.category] = (acc[e.category] ?? 0) + e.amount;
                  return acc;
                },
                {}
              );
              const entries = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
              const total = entries.reduce((s, [, v]) => s + v, 0);
              const colors = [
                "#4f46e5",
                "#f59e0b",
                "#10b981",
                "#06b6d4",
                "#ef4444",
                "#8b5cf6",
              ];

              if (!entries.length)
                return <Text type="secondary">No petty cash spending yet.</Text>;

              return entries.map(([cat, amt], i) => (
                <div key={cat} style={{ marginBottom: 12 }}>
                  <Flex justify="space-between" style={{ marginBottom: 4 }}>
                    <Flex align="center" gap={6}>
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: colors[i % colors.length],
                          display: "inline-block",
                        }}
                      />
                      <Text style={{ fontSize: 13 }}>{cat}</Text>
                    </Flex>
                    <Text strong style={{ fontSize: 13 }}>
                      {formatCurrency(amt)}
                    </Text>
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

      {/* Debit Modal */}
      <Modal
        open={debitOpen}
        onCancel={() => {
          form.resetFields();
          setDebitOpen(false);
        }}
        title="💵 Record Petty Cash Expense"
        footer={null}
        width={440}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" style={{ marginTop: 8 }} onFinish={handleAddDebit}>
          <Form.Item name="desc" label="Description" rules={[{ required: true }]}>
            <Input placeholder="e.g. Daily chai vendor, courier" />
          </Form.Item>
          <Flex gap={12}>
            <Form.Item
              name="amount"
              label="Amount"
              rules={[{ required: true }]}
              style={{ flex: 1 }}
            >
              <InputNumber
                prefix="₹"
                min={0.01}
                precision={2}
                style={{ width: "100%" }}
                placeholder="0.00"
              />
            </Form.Item>
            <Form.Item
              name="date"
              label="Date"
              rules={[{ required: true }]}
              style={{ flex: 1 }}
            >
              <Input type="date" />
            </Form.Item>
          </Flex>
          <Flex justify="flex-end" gap={8} style={{ marginTop: 8 }}>
            <Button onClick={() => setDebitOpen(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit">
              Record
            </Button>
          </Flex>
        </Form>
      </Modal>

      {/* Top Up Modal */}
      <Modal
        open={topupOpen}
        onCancel={() => {
          topupForm.resetFields();
          setTopupOpen(false);
        }}
        title="💰 Top Up Petty Cash"
        footer={null}
        width={400}
        destroyOnHidden
      >
        <Form form={topupForm} layout="vertical" style={{ marginTop: 8 }} onFinish={handleTopUp}>
          <Form.Item
            name="amount"
            label="Top-up Amount"
            rules={[{ required: true }]}
          >
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
            <Button type="primary" htmlType="submit">
              Top Up
            </Button>
          </Flex>
        </Form>
      </Modal>
    </>
  );
};

export default PettyCashTab;