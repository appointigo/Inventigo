"use client";

import { useState, useMemo } from "react";
import {
  Card,
  Col,
  DatePicker,
  Flex,
  Row,
  Statistic,
  Table,
  Tag,
  Typography,
} from "antd";
import { PercentageOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useStore } from "@/providers/StoreProvider";
import { useExpenses } from "@/modules/expenses/hooks/useExpenses";
import { formatCurrency } from "@/shared/utils/formatCurrency";

const { Title, Text } = Typography;

export default function ExpenseGstPage() {
  const { storeId } = useStore();

  const now = dayjs();
  const [selectedMonth, setSelectedMonth] = useState(now.month() + 1);
  const [selectedYear, setSelectedYear] = useState(now.year());

  const { expenses, loading } = useExpenses({
    storeId: storeId ?? undefined,
    month: selectedMonth,
    year: selectedYear,
  });

  const monthLabel = dayjs(`${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`).format("MMM YYYY");

  const gstTotal = useMemo(() => expenses.reduce((s, e) => s + (e.gstAmount ?? 0), 0), [expenses]);
  const itcTotal = useMemo(
    () => expenses.filter((e) => e.isItcEligible).reduce((s, e) => s + (e.gstAmount ?? 0), 0),
    [expenses]
  );
  const vendorGstinCount = useMemo(
    () => new Set(expenses.filter((e) => e.vendorGstin).map((e) => e.vendorGstin)).size,
    [expenses]
  );
  const expensesWithGst = useMemo(
    () => expenses.filter((e) => e.gstAmount != null && e.gstAmount > 0),
    [expenses]
  );

  return (
    <div style={{ padding: 24 }}>
      {/* ── Header ───────────────────────────────────── */}
      <Flex justify="space-between" align="center" style={{ marginBottom: 20 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            <PercentageOutlined style={{ marginRight: 8, color: "#6366f1" }} />
            GST &amp; ITC Register
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Track GST paid and Input Tax Credit across all expenses
          </Text>
        </div>
      </Flex>

      {/* ── Period selector ──────────────────────────── */}
      <Flex gap={12} align="center" style={{ marginBottom: 20 }}>
        <DatePicker.MonthPicker
          value={dayjs(`${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`)}
          onChange={(date) => {
            if (date) { setSelectedMonth(date.month() + 1); setSelectedYear(date.year()); }
          }}
          format="MMM YYYY"
          allowClear={false}
        />
        <Text type="secondary" style={{ fontSize: 13 }}>
          Showing GST data for <Text strong>{monthLabel}</Text>
        </Text>
      </Flex>

      {/* ── KPI cards ────────────────────────────────── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card size="small">
            <Statistic
              title="Total GST Paid"
              value={gstTotal}
              formatter={(v) => formatCurrency(Number(v))}
              styles={{ content: { fontSize: 22, fontWeight: 700 } }}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>{monthLabel}</Text>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small">
            <Statistic
              title="ITC Claimable"
              value={itcTotal}
              formatter={(v) => formatCurrency(Number(v))}
              styles={{ content: { fontSize: 22, fontWeight: 700, color: "#10b981" } }}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>Input Tax Credit eligible</Text>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small">
            <Statistic
              title="Vendors with GSTIN"
              value={vendorGstinCount}
              styles={{ content: { fontSize: 22, fontWeight: 700 } }}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>Registered vendors</Text>
          </Card>
        </Col>
      </Row>

      {/* ── GST register table ───────────────────────── */}
      <Card title={`GST Register — ${monthLabel}`} size="small">
        {expensesWithGst.length === 0 ? (
          <Text type="secondary" style={{ fontSize: 13 }}>
            No GST entries for {monthLabel}. Add GST details per expense via &ldquo;Add Expense → GST Details&rdquo;.
          </Text>
        ) : (
          <Table
            dataSource={expensesWithGst}
            rowKey="id"
            size="small"
            loading={loading}
            pagination={{ pageSize: 20, showTotal: (t) => `${t} entries` }}
            columns={[
              {
                title: "Date",
                dataIndex: "date",
                render: (v: string) => dayjs(v).format("DD MMM YYYY"),
                width: 110,
                sorter: (a, b) => a.date.localeCompare(b.date),
              },
              {
                title: "Category",
                dataIndex: "category",
                width: 140,
              },
              {
                title: "Expense Amount",
                dataIndex: "amount",
                render: (v: number) => formatCurrency(v),
                align: "right" as const,
                width: 140,
                sorter: (a, b) => a.amount - b.amount,
              },
              {
                title: "Vendor GSTIN",
                dataIndex: "vendorGstin",
                render: (v: string | null) =>
                  v ? <Text code style={{ fontSize: 12 }}>{v}</Text> : <Text type="secondary">—</Text>,
              },
              {
                title: "GST %",
                dataIndex: "gstRate",
                render: (v: number | null) =>
                  v != null ? <Tag color="blue">{v}%</Tag> : <Text type="secondary">—</Text>,
                align: "center" as const,
                width: 80,
              },
              {
                title: "GST Amount",
                dataIndex: "gstAmount",
                render: (v: number | null) =>
                  v != null ? <Text strong>{formatCurrency(v)}</Text> : <Text type="secondary">—</Text>,
                align: "right" as const,
                width: 130,
                sorter: (a, b) => (a.gstAmount ?? 0) - (b.gstAmount ?? 0),
              },
              {
                title: "ITC",
                dataIndex: "isItcEligible",
                render: (v: boolean) => (
                  <Tag color={v ? "success" : "default"}>{v ? "Eligible" : "Not eligible"}</Tag>
                ),
                align: "center" as const,
                width: 120,
                filters: [
                  { text: "Eligible", value: true },
                  { text: "Not eligible", value: false },
                ],
                onFilter: (value, record) => record.isItcEligible === value,
              },
              {
                title: "Note",
                dataIndex: "note",
                ellipsis: true,
                render: (v: string | null) =>
                  v ? <Text>{v}</Text> : <Text type="secondary">—</Text>,
              },
            ]}
            summary={() => (
              <Table.Summary fixed>
                <Table.Summary.Row style={{ background: "#fafafa" }}>
                  <Table.Summary.Cell index={0} colSpan={2}>
                    <Text strong>Total</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={2} align="right">
                    <Text strong>{formatCurrency(expensesWithGst.reduce((s, e) => s + e.amount, 0))}</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={3} />
                  <Table.Summary.Cell index={4} />
                  <Table.Summary.Cell index={5} align="right">
                    <Text strong style={{ color: "#10b981" }}>{formatCurrency(gstTotal)}</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={6} align="center">
                    <Text strong style={{ color: "#10b981" }}>{formatCurrency(itcTotal)} ITC</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={7} />
                </Table.Summary.Row>
              </Table.Summary>
            )}
          />
        )}
      </Card>
    </div>
  );
}
