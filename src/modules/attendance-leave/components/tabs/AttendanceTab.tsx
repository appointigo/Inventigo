"use client";

import { useEffect, useMemo, useState } from "react";
import { App, Button, Card, Col, Empty, Flex, Form, Input, Modal, Row, Select, Space, Statistic, Table, Tag } from "antd";
import dayjs from "dayjs";
import type { AttendanceOverrideInput, AttendanceLeaveModuleData, AttendanceRecord, AttendanceStatus } from "../../types";

const STATUS_COLORS: Record<AttendanceStatus, string> = {
  PRESENT: "green",
  ABSENT: "red",
  OFF: "default",
  LEAVE: "gold",
};

export function AttendanceTab({ module }: { module: AttendanceLeaveModuleData }) {
  const { message } = App.useApp();
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideForm] = Form.useForm<AttendanceOverrideInput>();
  const [optimisticToday, setOptimisticToday] = useState<AttendanceRecord | null>(null);

  useEffect(() => {
    setOptimisticToday(null);
  }, [module.attendanceToday?.checkInAt, module.attendanceToday?.checkOutAt, module.attendanceToday?.status, module.attendanceToday?.date]);

  const today = optimisticToday ?? module.attendanceToday;
  const checkedIn = !!today?.checkInAt;
  const checkedOut = !!today?.checkOutAt;

  const visibleRecords = useMemo(() => module.attendanceRecords, [module.attendanceRecords]);

  const optimisticClockIn = async () => {
    const snapshot = today;
    const now = new Date().toISOString();
    setOptimisticToday(snapshot ? { ...snapshot, status: "PRESENT", checkInAt: now } : {
      id: null,
      userId: module.user?.id ?? "",
      userName: module.user?.name ?? "You",
      storeId: module.storeId,
      storeName: module.storeName || null,
      date: dayjs().format("YYYY-MM-DD"),
      status: "PRESENT",
      checkInAt: now,
      checkOutAt: null,
      totalMinutes: null,
      totalHoursLabel: "0h 0m",
      note: null,
      isOverride: false,
    });

    try {
      await module.checkIn(module.storeId);
      message.success("Attendance marked");
    } catch (error) {
      setOptimisticToday(snapshot ?? null);
      message.error(error instanceof Error ? error.message : "Clock in failed");
    }
  };

  const optimisticClockOut = async () => {
    const snapshot = today;
    const now = new Date().toISOString();
    if (snapshot) {
      setOptimisticToday({ ...snapshot, checkOutAt: now });
    }

    try {
      await module.checkOut(module.storeId);
      message.success("Clocked out");
    } catch (error) {
      setOptimisticToday(snapshot ?? null);
      message.error(error instanceof Error ? error.message : "Clock out failed");
    }
  };

  const handleOverride = async (values: AttendanceOverrideInput) => {
    try {
      await module.overrideAttendance(values);
      message.success("Attendance updated");
      setOverrideOpen(false);
      overrideForm.resetFields();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Override failed");
    }
  };

  return (
    <>
      <Row gutter={[16, 16]}>
        <Col xs={24} xl={9}>
          <Card title="Today" loading={module.loading}>
            {today ? (
              <Space orientation="vertical" size={16} style={{ width: "100%" }}>
                <Flex justify="space-between" align="center">
                  <Tag color={STATUS_COLORS[today.status]}>{today.status}</Tag>
                  <span>{today.date}</span>
                </Flex>
                <Row gutter={12}>
                  <Col span={8}><Statistic title="Punch In" value={today.checkInAt ? dayjs(today.checkInAt).format("hh:mm A") : "--"} /></Col>
                  <Col span={8}><Statistic title="Punch Out" value={today.checkOutAt ? dayjs(today.checkOutAt).format("hh:mm A") : "--"} /></Col>
                  <Col span={8}><Statistic title="Hours" value={today.totalHoursLabel} /></Col>
                </Row>
                <Flex gap={10} wrap>
                  <Button type="primary" onClick={() => void optimisticClockIn()} disabled={checkedIn || (!module.storeId && !module.user?.storeId)}>
                    Mark Present
                  </Button>
                  <Button onClick={() => void optimisticClockOut()} disabled={!checkedIn || checkedOut}>
                    Punch Out
                  </Button>
                  {module.canReviewRequests ? (
                    <Button onClick={() => setOverrideOpen(true)}>
                      Override Attendance
                    </Button>
                  ) : null}
                </Flex>
              </Space>
            ) : (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No attendance data yet" />
            )}
          </Card>
        </Col>

        <Col xs={24} xl={15}>
          <Card title={module.isAdminView ? "Attendance Register" : "My Attendance"} loading={module.loading}>
            <Table
              rowKey={(record) => `${record.userId}-${record.date}`}
              dataSource={visibleRecords}
              pagination={{ pageSize: 10 }}
              scroll={{ x: 720 }}
              columns={[
                { title: "Date", dataIndex: "date" },
                ...(module.isAdminView ? [{ title: "User", dataIndex: "userName" }] : []),
                { title: "Status", dataIndex: "status", render: (status: AttendanceStatus) => <Tag color={STATUS_COLORS[status]}>{status}</Tag> },
                { title: "Punch In", dataIndex: "checkInAt", render: (value: string | null) => value ? dayjs(value).format("hh:mm A") : "--" },
                { title: "Punch Out", dataIndex: "checkOutAt", render: (value: string | null) => value ? dayjs(value).format("hh:mm A") : "--" },
                { title: "Notes", dataIndex: "note", render: (value: string | null) => value ?? "--" },
              ]}
            />
          </Card>
        </Col>
      </Row>

      <Modal title="Attendance Override" open={overrideOpen} footer={null} onCancel={() => setOverrideOpen(false)} destroyOnHidden>
        <Form
          form={overrideForm}
          layout="vertical"
          onFinish={handleOverride}
          initialValues={{ date: dayjs().format("YYYY-MM-DD"), status: "PRESENT", storeId: module.storeId ?? undefined }}
        >
          <Form.Item name="userId" label="Staff Member" rules={[{ required: true }]}> 
            <Select options={module.userOptions} />
          </Form.Item>
          <Form.Item name="storeId" label="Store">
            <Input disabled value={module.storeName || undefined} />
          </Form.Item>
          <Form.Item name="date" label="Date" rules={[{ required: true }]}> 
            <Input type="date" />
          </Form.Item>
          <Form.Item name="status" label="Status" rules={[{ required: true }]}> 
            <Select
              options={[
                { value: "PRESENT", label: "Present" },
                { value: "ABSENT", label: "Absent" },
                { value: "OFF", label: "Weekly Off" },
                { value: "LEAVE", label: "Leave" },
              ]}
            />
          </Form.Item>
          <Form.Item name="checkInAt" label="Punch In (optional)">
            <Input type="datetime-local" />
          </Form.Item>
          <Form.Item name="checkOutAt" label="Punch Out (optional)">
            <Input type="datetime-local" />
          </Form.Item>
          <Form.Item name="note" label="Notes">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="overrideReason" label="Reason" rules={[{ required: true, message: "Please add a reason" }]}> 
            <Input.TextArea rows={2} />
          </Form.Item>
          <Flex justify="end" gap={8}>
            <Button onClick={() => setOverrideOpen(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit">Save</Button>
          </Flex>
        </Form>
      </Modal>
    </>
  );
}