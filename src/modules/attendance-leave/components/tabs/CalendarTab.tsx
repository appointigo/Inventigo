"use client";

import { CalendarOutlined, InfoCircleOutlined, LeftOutlined, RightOutlined } from "@ant-design/icons";
import { Button, Card, Col, Flex, Row, Select, Space, Tag, Typography } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import localeData from "dayjs/plugin/localeData";
dayjs.extend(localeData);
import { useEffect, useMemo, useState } from "react";
import type { AttendanceLeaveModuleData } from "../../types";

const LEGEND = {
  present: { label: "Present", short: "P", color: "#52c41a", background: "#f6ffed", border: "#d9f7be" },
  absent: { label: "Absent", short: "A", color: "#ff4d4f", background: "#fff1f0", border: "#ffccc7" },
  leave: { label: "Leave", short: "L", color: "#d48806", background: "#fffbe6", border: "#ffe58f" },
  "weekly-off": { label: "Weekly Off", short: "W", color: "#389e0d", background: "#f6ffed", border: "#d9f7be" },
} as const;

function buildCalendarDays(month: Dayjs) {
  const start = month.startOf("month").startOf("week");
  const end = month.endOf("month").endOf("week");
  const days: Dayjs[] = [];
  let cursor = start;

  while (cursor.isBefore(end, "day") || cursor.isSame(end, "day")) {
    days.push(cursor);
    cursor = cursor.add(1, "day");
  }

  return days;
}

export function CalendarTab({ module }: { module: AttendanceLeaveModuleData }) {
  const monthValue = module.filters.range[0].startOf("month");
  const [selectedDate, setSelectedDate] = useState(monthValue);

  useEffect(() => {
    if (!selectedDate.isSame(monthValue, "month")) {
      setSelectedDate(monthValue);
    }
  }, [monthValue, selectedDate]);

  const days = useMemo(() => buildCalendarDays(monthValue), [monthValue]);
  const selectedEntries = module.calendarEntriesByDate[selectedDate.format("YYYY-MM-DD")] ?? [];
  const eventGroups = useMemo(() => Object.entries(module.calendarEntriesByDate)
    .sort(([left], [right]) => dayjs(left).valueOf() - dayjs(right).valueOf())
    .map(([date, entries]) => ({ date, entries })), [module.calendarEntriesByDate]);

  const totals = useMemo(() => Object.values(module.calendarEntriesByDate)
    .flat()
    .reduce<Record<keyof typeof LEGEND, number>>((acc, entry) => {
      acc[entry.badge] += 1;
      return acc;
    }, { present: 0, absent: 0, leave: 0, "weekly-off": 0 }), [module.calendarEntriesByDate]);

  const updateMonth = (nextMonth: Dayjs) => {
    module.setRange([nextMonth.startOf("month"), nextMonth.endOf("month")]);
  };

  const yearOptions = Array.from({ length: 7 }, (_, index) => {
    const year = dayjs().year() - 3 + index;
    return { label: String(year), value: year };
  });
  const monthOptions = Array.from({ length: 12 }, (_, index) => ({
    label: monthValue.month(index).format("MMMM"),
    value: index,
  }));

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} xl={17}>
        <Card styles={{ body: { padding: 0 } }}>
          <Flex justify="space-between" align="center" wrap gap={12} style={{ padding: "18px 18px 0" }}>
            <div>
              <Typography.Title level={3} style={{ margin: 0 }}>{monthValue.format("MMMM YYYY")}</Typography.Title>
              <Typography.Text type="secondary">
                Monthly overview • {module.storeName || "All stores"}
              </Typography.Text>
            </div>
            <Space wrap>
              <Button onClick={() => updateMonth(dayjs().startOf("month"))}>Today</Button>
              <Button icon={<LeftOutlined />} onClick={() => updateMonth(monthValue.subtract(1, "month"))} />
              <Button icon={<RightOutlined />} onClick={() => updateMonth(monthValue.add(1, "month"))} />
              <Select
                value={monthValue.month()}
                onChange={(value) => updateMonth(monthValue.month(value))}
                options={monthOptions}
                style={{ width: 120 }}
              />
              <Select
                value={monthValue.year()}
                onChange={(value) => updateMonth(monthValue.year(value))}
                options={yearOptions}
                style={{ width: 96 }}
              />
              <Space.Compact>
                <Button type="primary">Month</Button>
                <Button disabled>Week</Button>
              </Space.Compact>
            </Space>
          </Flex>

          <div style={{ padding: 18 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", borderTop: "1px solid #f0f0f0", borderLeft: "1px solid #f0f0f0" }}>
              {dayjs.weekdaysShort().map((day) => (
                <div
                  key={day}
                  style={{
                    padding: "10px 12px",
                    borderRight: "1px solid #f0f0f0",
                    borderBottom: "1px solid #f0f0f0",
                    background: "#fafafa",
                    fontWeight: 500,
                    color: "#667085",
                  }}
                >
                  {day}
                </div>
              ))}

              {days.map((day) => {
                const entries = module.calendarEntriesByDate[day.format("YYYY-MM-DD")] ?? [];
                const counts = entries.reduce<Record<keyof typeof LEGEND, number>>((acc, entry) => {
                  acc[entry.badge] += 1;
                  return acc;
                }, { present: 0, absent: 0, leave: 0, "weekly-off": 0 });
                const chips = Object.entries(counts)
                  .filter(([, value]) => value > 0)
                  .map(([key, value]) => ({ key: key as keyof typeof LEGEND, value }));
                const isCurrentMonth = day.isSame(monthValue, "month");
                const isSelected = day.isSame(selectedDate, "day");
                const isToday = day.isSame(dayjs(), "day");

                return (
                  <button
                    key={day.format("YYYY-MM-DD")}
                    type="button"
                    onClick={() => setSelectedDate(day)}
                    style={{
                      minHeight: 138,
                      padding: 12,
                      border: 0,
                      borderRight: "1px solid #f0f0f0",
                      borderBottom: "1px solid #f0f0f0",
                      background: isSelected ? "#f5f8ff" : "#ffffff",
                      textAlign: "left",
                      opacity: isCurrentMonth ? 1 : 0.46,
                      cursor: "pointer",
                    }}
                  >
                    <Flex justify="space-between" align="center">
                      <Typography.Text strong style={{ color: isToday ? "#1677ff" : undefined }}>
                        {day.date()}
                      </Typography.Text>
                      {isToday ? <Tag color="blue" style={{ marginInlineEnd: 0 }}>Today</Tag> : null}
                    </Flex>

                    <Space orientation="vertical" size={6} style={{ width: "100%", marginTop: 10 }}>
                      {chips.slice(0, 3).map((chip) => (
                        <div
                          key={chip.key}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "4px 8px",
                            borderRadius: 8,
                            background: LEGEND[chip.key].background,
                            border: `1px solid ${LEGEND[chip.key].border}`,
                            color: LEGEND[chip.key].color,
                            fontSize: 12,
                            lineHeight: 1.2,
                          }}
                        >
                          <strong>{LEGEND[chip.key].short}</strong>
                          <span>{LEGEND[chip.key].label}</span>
                          <span>• {chip.value}</span>
                        </div>
                      ))}
                      {chips.length > 3 ? <Typography.Text type="secondary">+{chips.length - 3} more</Typography.Text> : null}
                    </Space>
                  </button>
                );
              })}
            </div>

            <Flex wrap gap={12} style={{ marginTop: 14 }}>
              {(Object.keys(LEGEND) as Array<keyof typeof LEGEND>).map((key) => (
                <div key={key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: LEGEND[key].color, display: "inline-block" }} />
                  <Typography.Text>
                    {LEGEND[key].label}
                  </Typography.Text>
                  <Tag style={{ marginInlineEnd: 0 }}>{totals[key]}</Tag>
                </div>
              ))}
              {selectedEntries.length > 3 ? (
                <Typography.Text type="secondary">
                  +{selectedEntries.length - 3} more on selected day
                </Typography.Text>
              ) : null}
            </Flex>
          </div>
        </Card>
      </Col>

      <Col xs={24} xl={7}>
        <Card
          title={<Space><InfoCircleOutlined /><span>Legend</span></Space>}
          extra={module.canConfigureSettings ? <Button size="small" onClick={module.openSettings}>Manage</Button> : null}
        >
          <Space wrap>
            {(Object.keys(LEGEND) as Array<keyof typeof LEGEND>).map((key) => (
              <Tag
                key={key}
                style={{
                  marginInlineEnd: 0,
                  color: LEGEND[key].color,
                  background: LEGEND[key].background,
                  borderColor: LEGEND[key].border,
                }}
              >
                {LEGEND[key].short} {LEGEND[key].label}
              </Tag>
            ))}
          </Space>
        </Card>

        <Card
          title={<Space><CalendarOutlined /><span>Events in Range</span></Space>}
          extra={<Tag style={{ marginInlineEnd: 0 }}>{eventGroups.reduce((total, group) => total + group.entries.length, 0)}</Tag>}
          style={{ marginTop: 16 }}
          styles={{ body: { display: "grid", gap: 12 } }}
        >
          {eventGroups.length === 0 ? (
            <Typography.Text type="secondary">No calendar items in this range</Typography.Text>
          ) : eventGroups.map((group) => (
            <div key={group.date} style={{ border: "1px solid #f0f0f0", borderRadius: 12, padding: 12 }}>
              <Typography.Text strong>{dayjs(group.date).format("ddd, D MMM YYYY")}</Typography.Text>
              <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                {group.entries.map((entry) => (
                  <div key={entry.id} style={{ display: "flex", gap: 10, alignItems: "start" }}>
                    <span style={{ width: 8, height: 8, borderRadius: 999, background: LEGEND[entry.badge].color, marginTop: 6, flex: "0 0 auto" }} />
                    <div style={{ minWidth: 0 }}>
                      <Typography.Text strong>{LEGEND[entry.badge].label}</Typography.Text>
                      <br />
                      <Typography.Text type="secondary">{entry.detail}</Typography.Text>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </Card>
      </Col>
    </Row>
  );
}