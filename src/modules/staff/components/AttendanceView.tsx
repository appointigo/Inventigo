"use client";

import { useMemo, useState } from "react";
import { App, Button, Card, Col, DatePicker, Empty, Flex, Form, Input, Modal, Row, Select, Space, Statistic, Table, Tag, Typography, Checkbox } from "antd";
import dayjs from "dayjs";
import { useCurrentUser } from "@/modules/auth/hooks/useAuth";
import { useStore } from "@/providers/StoreProvider";
import { useUsers } from "@/modules/settings/hooks/useUsers";
import { useAttendance, useWeeklyOffConfig } from "../hooks/useAttendance";
import type { AttendanceOverrideInput, AttendanceStatus, WeeklyOffDayConfig } from "../types";

const WEEKDAY_OPTIONS = [
  { label: "Sunday", value: 0 },
  { label: "Monday", value: 1 },
  { label: "Tuesday", value: 2 },
  { label: "Wednesday", value: 3 },
  { label: "Thursday", value: 4 },
  { label: "Friday", value: 5 },
  { label: "Saturday", value: 6 },
];

const STATUS_COLORS: Record<AttendanceStatus, string> = {
  PRESENT: "green",
  ABSENT: "default",
  OFF: "gold",
  LEAVE: "blue",
};

export default function AttendanceView() {
  const { message } = App.useApp();
  const { user } = useCurrentUser();
  const { storeId, storeName } = useStore();
  const now = dayjs();
  const [range, setRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([now.subtract(13, "day"), now]);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideForm] = Form.useForm<AttendanceOverrideInput>();
  const { users } = useUsers();

  const isAdminView = user?.role === "OWNER" || user?.role === "ADMIN";
  const canOverride = isAdminView;
  const showWorkforceTable = user?.role === "OWNER" || user?.role === "ADMIN" || user?.role === "MANAGER";

  const selfAttendance = useAttendance({
    from: range[0].format("YYYY-MM-DD"),
    to: range[1].format("YYYY-MM-DD"),
  });

  const workforceAttendance = useAttendance({
    storeId: showWorkforceTable ? (storeId ?? undefined) : undefined,
    from: range[0].format("YYYY-MM-DD"),
    to: range[1].format("YYYY-MM-DD"),
    status: statusFilter,
  });

  const weeklyOff = useWeeklyOffConfig(isAdminView ? storeId : undefined);

  const today = selfAttendance.data.today;
  const checkedIn = !!today?.checkInAt;
  const checkedOut = !!today?.checkOutAt;

  const adminRecords = useMemo(() => workforceAttendance.data.records, [workforceAttendance.data.records]);
  const selfRecords = useMemo(
    () => selfAttendance.data.records.filter((record) => record.userId === user?.id),
    [selfAttendance.data.records, user?.id]
  );

  const selectedWeeklyOffs = weeklyOff.config?.days.map((day) => day.dayOfWeek) ?? [];

  const saveWeeklyOff = async (days: number[]) => {
    try {
      const payload: WeeklyOffDayConfig[] = days.map((dayOfWeek) => ({ dayOfWeek, isOptional: false }));
      await weeklyOff.save(payload);
      message.success("Weekly off configuration saved");
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Failed to save weekly off config");
    }
  };

  const handleOverride = async (values: AttendanceOverrideInput) => {
    try {
      await workforceAttendance.overrideAttendance(values);
      message.success("Attendance updated");
      setOverrideOpen(false);
      overrideForm.resetFields();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Override failed");
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <Flex justify="space-between" align="center" wrap gap={12} style={{ marginBottom: 18 }}>
        <div>
          <Typography.Title level={3} style={{ margin: 0 }}>Attendance</Typography.Title>
          <Typography.Text type="secondary">
            Track daily presence, shift timing, weekly offs, and manual corrections.
          </Typography.Text>
        </div>
        <DatePicker.RangePicker value={range} onChange={(values) => values && setRange(values as [dayjs.Dayjs, dayjs.Dayjs])} />
      </Flex>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={10}>
          <Card title="Today" loading={selfAttendance.loading}>
            {today ? (
              <Space orientation="vertical" size={16} style={{ width: "100%" }}>
                <Flex justify="space-between" align="center">
                  <Tag color={STATUS_COLORS[today.status]}>{today.status}</Tag>
                  <Typography.Text type="secondary">{today.date}</Typography.Text>
                </Flex>
                <Row gutter={12}>
                  <Col span={8}><Statistic title="Check In" value={today.checkInAt ? dayjs(today.checkInAt).format("hh:mm A") : "--"} /></Col>
                  <Col span={8}><Statistic title="Check Out" value={today.checkOutAt ? dayjs(today.checkOutAt).format("hh:mm A") : "--"} /></Col>
                  <Col span={8}><Statistic title="Hours" value={today.totalHoursLabel} /></Col>
                </Row>
                <Flex gap={10}>
                  <Button type="primary" onClick={() => selfAttendance.checkIn(storeId).then(() => message.success("Clocked in")).catch((error: Error) => message.error(error.message))} disabled={checkedIn || !storeId && !user?.storeId}>
                    Clock In
                  </Button>
                  <Button onClick={() => selfAttendance.checkOut(storeId).then(() => message.success("Clocked out")).catch((error: Error) => message.error(error.message))} disabled={!checkedIn || checkedOut}>
                    Clock Out
                  </Button>
                </Flex>
              </Space>
            ) : (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No attendance data yet" />
            )}
          </Card>
        </Col>

        <Col xs={24} lg={14}>
          <Card title="My Attendance History" loading={selfAttendance.loading}>
            <Table
              dataSource={selfRecords}
              rowKey={(record) => `${record.userId}-${record.date}`}
              pagination={{ pageSize: 8 }}
              size="small"
              columns={[
                { title: "Date", dataIndex: "date" },
                { title: "Status", dataIndex: "status", render: (status: AttendanceStatus) => <Tag color={STATUS_COLORS[status]}>{status}</Tag> },
                { title: "Check In", dataIndex: "checkInAt", render: (value: string | null) => value ? dayjs(value).format("hh:mm A") : "--" },
                { title: "Check Out", dataIndex: "checkOutAt", render: (value: string | null) => value ? dayjs(value).format("hh:mm A") : "--" },
                { title: "Hours", dataIndex: "totalHoursLabel" },
              ]}
            />
          </Card>
        </Col>
      </Row>

      {showWorkforceTable && (
        <Card title="Store Attendance" style={{ marginTop: 16 }} extra={
          <Flex gap={8}>
            <Select
              allowClear
              placeholder="Filter status"
              value={statusFilter}
              onChange={(value) => setStatusFilter(value)}
              style={{ width: 160 }}
              options={Object.keys(STATUS_COLORS).map((status) => ({ value: status, label: status }))}
            />
            {canOverride && (
              <Button type="primary" onClick={() => setOverrideOpen(true)}>Attendance Override</Button>
            )}
          </Flex>
        }>
          <Table
            dataSource={adminRecords}
            rowKey={(record) => `${record.userId}-${record.date}`}
            size="small"
            pagination={{ pageSize: 10 }}
            columns={[
              { title: "Date", dataIndex: "date" },
              { title: "Member", dataIndex: "userName" },
              { title: "Store", dataIndex: "storeName", render: (value: string | null) => value ?? "--" },
              { title: "Status", dataIndex: "status", render: (status: AttendanceStatus) => <Tag color={STATUS_COLORS[status]}>{status}</Tag> },
              { title: "Check In", dataIndex: "checkInAt", render: (value: string | null) => value ? dayjs(value).format("hh:mm A") : "--" },
              { title: "Check Out", dataIndex: "checkOutAt", render: (value: string | null) => value ? dayjs(value).format("hh:mm A") : "--" },
              { title: "Hours", dataIndex: "totalHoursLabel" },
              { title: "Source", dataIndex: "isOverride", render: (value: boolean) => value ? <Tag color="purple">Override</Tag> : <Tag>SYSTEM</Tag> },
            ]}
          />
        </Card>
      )}

      {isAdminView && (
        <Card title={`Weekly Off Configuration${storeName ? ` - ${storeName}` : ""}`} style={{ marginTop: 16 }} loading={weeklyOff.loading}>
          <Checkbox.Group options={WEEKDAY_OPTIONS} value={selectedWeeklyOffs} onChange={(values) => void saveWeeklyOff(values as number[])} />
          <Typography.Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0 }}>
            Weekly offs auto-mark attendance as OFF and block leave applications on those dates.
          </Typography.Paragraph>
        </Card>
      )}

      <Modal title="Attendance Override" open={overrideOpen} footer={null} onCancel={() => setOverrideOpen(false)} destroyOnHidden>
        <Form form={overrideForm} layout="vertical" onFinish={handleOverride} initialValues={{ date: dayjs().format("YYYY-MM-DD"), status: "PRESENT", storeId: storeId ?? undefined }}>
          <Form.Item name="userId" label="Staff Member" rules={[{ required: true }]}>
            <Select options={users.map((item) => ({ value: item.id, label: `${item.name} (${item.email})` }))} />
          </Form.Item>
          <Form.Item name="storeId" label="Store">
            <Input disabled value={storeName ?? undefined} />
          </Form.Item>
          <Form.Item name="date" label="Date" rules={[{ required: true }]}>
            <Input type="date" />
          </Form.Item>
          <Form.Item name="status" label="Status" rules={[{ required: true }]}>
            <Select options={Object.keys(STATUS_COLORS).map((status) => ({ value: status, label: status }))} />
          </Form.Item>
          <Form.Item name="checkInAt" label="Check In (optional)">
            <Input type="datetime-local" />
          </Form.Item>
          <Form.Item name="checkOutAt" label="Check Out (optional)">
            <Input type="datetime-local" />
          </Form.Item>
          <Form.Item name="note" label="Note">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="overrideReason" label="Override Reason" rules={[{ required: true, message: "Please provide an override reason" }]}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Flex justify="end" gap={8}>
            <Button onClick={() => setOverrideOpen(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit">Save Override</Button>
          </Flex>
        </Form>
      </Modal>
    </div>
  );
}