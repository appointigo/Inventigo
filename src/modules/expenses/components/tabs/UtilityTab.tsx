import { useMemo } from "react";
import { Card, Row, Col, Table, Typography, Flex } from "antd";
import dayjs from "dayjs";
import type { StoreExpense } from "../../types";
import { formatCurrency } from "@/shared/utils/formatCurrency";
import { UtilityCardWrapper, UtilityIconBox, UtilityTitle, UtilitySubtitle, UtilityAmount, NotRecordedBox } from "../ExpenseAdvancedTab.styled";

interface UtilityTabProps {
  expenses: StoreExpense[];
  monthLabel: string;
}

const { Text } = Typography;

const UTILITY_CATEGORIES = ["Electricity", "Water", "Internet/Broadband", "Internet", "Gas"];

const UTILITY_CARDS = [
  { icon: "⚡", name: "Electricity", color: "#fffbeb", textColor: "#d97706", unit: "kWh" },
  { icon: "💧", name: "Water", color: "#ecfeff", textColor: "#0891b2", unit: "kL" },
  { icon: "🌐", name: "Internet", color: "#f0f9ff", textColor: "#0369a1", unit: "Mbps" },
  { icon: "🔥", name: "Gas", color: "#fff7ed", textColor: "#ea580c", unit: "units" },
];

const UtilityTab = ({ expenses, monthLabel }: UtilityTabProps) => {
  const utilityExpenses = useMemo(
    () =>
      expenses.filter((e) =>
        UTILITY_CATEGORIES.some((u) =>
          e.category.toLowerCase().includes(u.toLowerCase())
        )
      ),
    [expenses]
  );

  const byCategory = useMemo(
    () =>
      utilityExpenses.reduce<Record<string, number>>((acc, e) => {
        acc[e.category] = (acc[e.category] ?? 0) + e.amount;
        return acc;
      }, {}),
    [utilityExpenses]
  );

  return (
    <>
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        {UTILITY_CARDS.map((u) => {
          const matchKey = Object.keys(byCategory).find((k) =>
            k.toLowerCase().includes(u.name.toLowerCase())
          );
          const amount = matchKey ? byCategory[matchKey] : null;

          return (
            <Col xs={24} sm={12} lg={6} key={u.name}>
              <UtilityCardWrapper
                size="small"
                className={u.name.toLowerCase().replace(/\s+/g, "")}
              >
                <Flex align="center" gap={12} style={{ marginBottom: 14 }}>
                  <UtilityIconBox bgColor={`${u.textColor}15`}>
                    {u.icon}
                  </UtilityIconBox>
                  <div>
                    <UtilityTitle textColor={u.textColor}>{u.name}</UtilityTitle>
                    <UtilitySubtitle>{monthLabel}</UtilitySubtitle>
                  </div>
                </Flex>

                {amount != null ? (
                  <>
                    <UtilityAmount textColor={u.textColor}>
                      {formatCurrency(amount)}
                    </UtilityAmount>
                    <Text style={{ fontSize: 12, color: "#64748b" }}>
                      Bill amount this month
                    </Text>
                  </>
                ) : (
                  <NotRecordedBox>
                    <div>🚨</div>
                    <div>Not recorded</div>
                    <Text style={{ fontSize: 12, color: "#64748b" }}>
                      No {u.name} bill this month
                    </Text>
                  </NotRecordedBox>
                )}
              </UtilityCardWrapper>
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
              {
                title: "Date",
                dataIndex: "date",
                render: (v: string) => dayjs(v).format("DD MMM YYYY"),
                width: 110,
              },
              {
                title: "Category",
                dataIndex: "category",
                width: 160,
              },
              {
                title: "Note",
                dataIndex: "note",
                render: (v: string | null) =>
                  v ?? <Text type="secondary">—</Text>,
              },
              {
                title: "Amount",
                dataIndex: "amount",
                render: (v: number) => formatCurrency(v),
                align: "right" as const,
                width: 120,
              },
              {
                title: "Payment",
                dataIndex: "paymentMode",
                render: (v: string | null) =>
                  v ?? <Text type="secondary">—</Text>,
                width: 140,
              },
            ]}
          />
        ) : (
          <Text type="secondary">
            No utility expenses for {monthLabel}. Add expenses in categories like
            Electricity, Water, Internet.
          </Text>
        )}
      </Card>
    </>
  );
};

export default UtilityTab;