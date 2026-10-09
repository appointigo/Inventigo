"use client";

import { useState } from "react";
import { Button, DatePicker, Select } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import type { AnalyticsDatePreset, AnalyticsDateRange } from "../utils/dateRange";
import styles from "./AnalyticsDateFilter.module.css";

export type AnalyticsDateFilterOption = {
  value: AnalyticsDatePreset;
  label: string;
};

export const STANDARD_ANALYTICS_DATE_OPTIONS: AnalyticsDateFilterOption[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "thisWeek", label: "This Week" },
  { value: "lastWeek", label: "Last Week" },
  { value: "thisMonth", label: "This Month" },
  { value: "lastMonth", label: "Last Month" },
  { value: "thisQuarter", label: "This Quarter" },
  { value: "lastQuarter", label: "Last Quarter" },
  { value: "thisYear", label: "This Year" },
  { value: "lastYear", label: "Last Year" },
  { value: "7d", label: "Last 7 Days" },
  { value: "30d", label: "Last 30 Days" },
  { value: "90d", label: "Last 90 Days" },
  { value: "12m", label: "Last 12 Months" },
  { value: "custom", label: "Custom" },
];

function AnalyticsDateFilterForm({
  range,
  onPreset,
  onCustom,
  options = STANDARD_ANALYTICS_DATE_OPTIONS,
}: {
  range: AnalyticsDateRange;
  onPreset: (preset: Exclude<AnalyticsDatePreset, "custom">) => void;
  onCustom: (from: string, to: string) => void;
  options?: AnalyticsDateFilterOption[];
}) {
  const [editingCustom, setEditingCustom] = useState(false);
  const [draft, setDraft] = useState<[Dayjs | null, Dayjs | null] | null>([
    dayjs(range.from), dayjs(range.to),
  ]);

  const selectedValue = editingCustom ? "custom" : range.preset;
  const apply = () => {
    if (!draft?.[0] || !draft[1] || draft[0].isAfter(draft[1], "day")) return;
    setEditingCustom(false);
    onCustom(draft[0].format("YYYY-MM-DD"), draft[1].format("YYYY-MM-DD"));
  };

  return (
    <div className={styles.filter}>
      <Select<AnalyticsDatePreset>
        className={styles.select}
        aria-label="Analytics date range"
        value={selectedValue}
        options={options}
        onSelect={(value) => {
          if (value === "custom") setEditingCustom(true);
        }}
        onChange={(value) => {
          if (value === "custom") {
            setEditingCustom(true);
            return;
          }
          setEditingCustom(false);
          onPreset(value);
        }}
      />
      {editingCustom ? (
        <div className={styles.custom}>
          <DatePicker.RangePicker
            className={styles.range}
            value={draft}
            format="DD MMM YYYY"
            allowClear={false}
            onChange={(value) => setDraft(value as [Dayjs | null, Dayjs | null] | null)}
          />
          <Button type="primary" onClick={apply} disabled={!draft?.[0] || !draft[1] || draft[0].isAfter(draft[1], "day")}>Apply</Button>
          <Button onClick={() => setEditingCustom(false)}>Cancel</Button>
        </div>
      ) : null}
    </div>
  );
}

export default function AnalyticsDateFilter(props: Parameters<typeof AnalyticsDateFilterForm>[0]) {
  return <AnalyticsDateFilterForm key={`${props.range.preset}:${props.range.from}:${props.range.to}`} {...props} />;
}
