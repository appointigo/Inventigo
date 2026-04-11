"use client";

import { useEffect, useMemo, useState } from "react";
import { App, Button, Checkbox, Drawer, Flex, InputNumber, Space, Typography } from "antd";
import type { AttendanceLeaveModuleData, LeaveType, UpdateStoreLeavePolicyInput } from "../types";

const WEEKDAY_OPTIONS = [
  { label: "Sunday", value: 0 },
  { label: "Monday", value: 1 },
  { label: "Tuesday", value: 2 },
  { label: "Wednesday", value: 3 },
  { label: "Thursday", value: 4 },
  { label: "Friday", value: 5 },
  { label: "Saturday", value: 6 },
];

export function AdminConfigDrawer({ module }: { module: AttendanceLeaveModuleData }) {
  const { message } = App.useApp();
  const selectedWeeklyOffs = module.weeklyOffConfig?.days.map((day) => day.dayOfWeek) ?? [];
  const [draftPolicies, setDraftPolicies] = useState<Record<LeaveType, number>>({
    CASUAL: 12,
    SICK: 12,
    PAID: 18,
  });

  useEffect(() => {
    if (module.leavePolicies.length === 0) {
      return;
    }

    setDraftPolicies(module.leavePolicies.reduce<Record<LeaveType, number>>((acc, policy) => {
      acc[policy.leaveType] = policy.allocated;
      return acc;
    }, {
      CASUAL: 12,
      SICK: 12,
      PAID: 18,
    }));
  }, [module.leavePolicies]);

  const policyPayload = useMemo<UpdateStoreLeavePolicyInput[]>(() => [
    { leaveType: "CASUAL", allocated: draftPolicies.CASUAL },
    { leaveType: "SICK", allocated: draftPolicies.SICK },
    { leaveType: "PAID", allocated: draftPolicies.PAID },
  ], [draftPolicies]);

  const saveLeavePolicy = async () => {
    try {
      await module.saveLeavePolicies(policyPayload);
      await module.refreshAll();
      message.success("Leave policy saved");
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Failed to save leave policy");
    }
  };

  return (
    <Drawer
      title="Attendance & Leave Settings"
      placement="right"
      size={420}
      open={module.settingsOpen}
      onClose={module.closeSettings}
    >
      <Space orientation="vertical" size={24} style={{ width: "100%" }}>
        <div>
          <Typography.Title level={5}>Weekly Off Days</Typography.Title>
          <Typography.Paragraph type="secondary">
            Configure weekly offs for {module.storeName || "the active store"}. These dates appear in the calendar and are excluded from leave charging.
          </Typography.Paragraph>
          <Checkbox.Group
            options={WEEKDAY_OPTIONS}
            value={selectedWeeklyOffs}
            onChange={(values) => void module.saveWeeklyOff(values.map((dayOfWeek) => ({ dayOfWeek: dayOfWeek as number, isOptional: false })))}
          />
        </div>

        <div>
          <Typography.Title level={5}>Leave Policy</Typography.Title>
          <Typography.Paragraph type="secondary">
            Only owners and admins can change leave days. The saved values are stored per store and used to calculate each user&apos;s yearly leave balance.
          </Typography.Paragraph>
          <Space orientation="vertical" size={16} style={{ width: "100%" }}>
            {(["CASUAL", "SICK", "PAID"] as LeaveType[]).map((leaveType) => (
              <Flex key={leaveType} justify="space-between" gap={12} align="center">
                <div style={{ flex: 1 }}>
                  <Typography.Text strong>{module.leaveTypeMeta[leaveType].label}</Typography.Text>
                  <br />
                  <Typography.Text type="secondary">Allocated days per year</Typography.Text>
                </div>
                <InputNumber
                  min={0}
                  precision={0}
                  value={draftPolicies[leaveType]}
                  onChange={(value) => setDraftPolicies((current) => ({ ...current, [leaveType]: Number(value ?? 0) }))}
                />
              </Flex>
            ))}
            <Button type="primary" onClick={() => void saveLeavePolicy()} loading={module.leavePoliciesLoading} disabled={!module.storeId}>
              Save Leave Policy
            </Button>
          </Space>
        </div>
      </Space>
    </Drawer>
  );
}