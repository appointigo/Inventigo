"use client";

import { BarChartOutlined, InfoCircleOutlined } from "@ant-design/icons";
import { Card, Empty, Tooltip, Typography } from "antd";
import type { ExpenseCategoryTotals } from "../types";
import { formatCurrency } from "@/shared/utils/formatCurrency";
import styles from "./ExpenseCategorySpendChart.module.css";

const { Text } = Typography;

type Props = {
  byCategory: ExpenseCategoryTotals;
  loading: boolean;
  monthLabel: string;
};

export default function ExpenseCategorySpendChart({ byCategory, loading, monthLabel }: Props) {
  const data = Object.entries(byCategory)
    .map(([category, amount]) => ({ category, amount: amount ?? 0 }))
    .filter((item) => item.amount > 0)
    .sort((a, b) => b.amount - a.amount);
  const total = data.reduce((sum, item) => sum + item.amount, 0);
  const maximum = data[0]?.amount ?? 0;

  return (
    <Card
      className={styles.card}
      loading={loading}
      title={
        <span className={styles.title}>
          <BarChartOutlined />
          Category Spend — {monthLabel}
          <Tooltip title="How this month’s expenses are distributed by category.">
            <InfoCircleOutlined className={styles.info} />
          </Tooltip>
        </span>
      }
    >
      {!data.length ? (
        <div className={styles.empty}>
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No expense data for this month." />
        </div>
      ) : (
        <div className={styles.chart}>
          <div className={styles.axis} aria-hidden="true">
            <span>₹0</span>
            <span>{formatCurrency(maximum / 2)}</span>
            <span>{formatCurrency(maximum)}</span>
          </div>
          <div className={styles.rows}>
            {data.map((item) => {
              const share = total > 0 ? (item.amount / total) * 100 : 0;
              const width = maximum > 0 ? (item.amount / maximum) * 100 : 0;
              return (
                <div className={styles.row} key={item.category}>
                  <div className={styles.rowLabel}>
                    <Text ellipsis={{ tooltip: item.category }} strong>{item.category}</Text>
                    <span>{formatCurrency(item.amount)} <b>{share.toFixed(share % 1 === 0 ? 0 : 1)}%</b></span>
                  </div>
                  <div className={styles.barTrack}>
                    <span className={styles.bar} style={{ width: `${width}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}
