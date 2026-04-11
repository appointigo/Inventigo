"use client";

import { useMemo, useState } from "react";
import { App, Button, Card, Col, DatePicker, Empty, Flex, Form, Input, Modal, Row, Select, Space, Table, Tag, Typography } from "antd";
import dayjs from "dayjs";
import { useCurrentUser } from "@/modules/auth/hooks/useAuth";
import { useStore } from "@/providers/StoreProvider";
import { useLeaveManagement } from "../hooks/useLeaveManagement";
import type { LeaveDecisionInput, LeaveStatus, LeaveType } from "../types";

type LeaveApplicationFormValues = {
  leaveType: LeaveType;
  fromDate: dayjs.Dayjs;
  toDate?: dayjs.Dayjs;
  reason: string;
};

const LEAVE_TYPES: LeaveType[] = ["SICK", "CASUAL", "PAID"];
const LEAVE_STATUS_COLORS: Record<LeaveStatus, string> = {
  PENDING: "orange",
  APPROVED: "green",
  REJECTED: "red",
};

export default function LeaveManagementView() {
  const { message } = App.useApp();
  const { user } = useCurrentUser();
  const { storeId } = useStore();
  const now = dayjs();
  const [range, setRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([now.startOf("month"), now.endOf("month")]);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [decisionOpen, setDecisionOpen] = useState<null | { leaveRequestId: string; action: "approve" | "reject" }>(null);
  const [decisionForm] = Form.useForm<LeaveDecisionInput>();
  const [applyForm] = Form.useForm<LeaveApplicationFormValues>();

  const isAdminView = user?.role === "OWNER" || user?.role === "ADMIN" || user?.role === "MANAGER";

  const ownLeaves = useLeaveManagement({
    from: range[0].format("YYYY-MM-DD"),
    to: range[1].format("YYYY-MM-DD"),
  });

  const adminLeaves = useLeaveManagement({
    storeId: isAdminView ? (storeId ?? undefined) : undefined,
    from: range[0].format("YYYY-MM-DD"),
    to: range[1].format("YYYY-MM-DD"),
    status: statusFilter,
  });

  const balances = ownLeaves.data.balances;
  const ownRecords = useMemo(() => ownLeaves.data.records.filter((record) => record.userId === user?.id), [ownLeaves.data.records, user?.id]);

  const submitDecision = async (values: LeaveDecisionInput) => {
    if (!decisionOpen) return;
    try {
      if (decisionOpen.action === "approve") {
        await adminLeaves.approveLeave(values);
        message.success("Leave approved");
      } else {
        await adminLeaves.rejectLeave(values);
        message.success("Leave rejected");
      }
      setDecisionOpen(null);
      decisionForm.resetFields();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Decision failed");
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <Flex justify="space-between" align="center" wrap gap={12} style={{ marginBottom: 18 }}>
        <div>
          <Typography.Title level={3} style={{ margin: 0 }}>Leave Management</Typography.Title>
          <Typography.Text type="secondary">
            Apply leave, track approvals, and manage store-level leave requests.
          </Typography.Text>
        </div>
        <DatePicker.RangePicker value={range} onChange={(values) => values && setRange(values as [dayjs.Dayjs, dayjs.Dayjs])} />
      </Flex>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={10}>
          <Card title="Apply Leave">
            <Form
              form={applyForm}
              layout="vertical"
              onFinish={(values) => {
                const startDate = values.fromDate.startOf("day");
                const endDate = (values.toDate ?? values.fromDate).startOf("day");

                return ownLeaves.applyLeave({
                  leaveType: values.leaveType,
                  fromDate: startDate.format("YYYY-MM-DD"),
                  toDate: endDate.format("YYYY-MM-DD"),
                  reason: values.reason,
                  storeId: storeId ?? undefined,
                }).then(() => {
                  message.success("Leave applied");
                  applyForm.resetFields();
                }).catch((error: Error) => message.error(error.message));
              }}
              initialValues={{ leaveType: "CASUAL" }}
            >
              <Form.Item name="leaveType" label="Leave Type" rules={[{ required: true }]}>
                <Select options={LEAVE_TYPES.map((type) => ({ value: type, label: type }))} />
              </Form.Item>
              <Form.Item name="fromDate" label="From Date" rules={[{ required: true }]}>
                <DatePicker
                  format="DD/MM/YYYY"
                  style={{ width: "100%" }}
                  onChange={(value) => {
                    const currentEndDate = applyForm.getFieldValue("toDate");
                    if (!value) {
                      applyForm.setFieldValue("toDate", undefined);
                      return;
                    }

                    if (!currentEndDate || currentEndDate.isBefore(value, "day")) {
                      applyForm.setFieldValue("toDate", value);
                    }
                  }}
                />
              </Form.Item>
              <Form.Item
                name="toDate"
                label="To Date"
                extra="Leave this as-is for a single-day leave, or choose a later date for multiple days."
                rules={[
                  ({ getFieldValue }) => ({
                    validator(_, value?: dayjs.Dayjs) {
                      const fromDate = getFieldValue("fromDate") as dayjs.Dayjs | undefined;
                      if (!value || !fromDate || !value.isBefore(fromDate, "day")) {
                        return Promise.resolve();
                      }

                      return Promise.reject(new Error("To date cannot be before From date"));
                    },
                  }),
                ]}
              >
                <DatePicker
                  format="DD/MM/YYYY"
                  style={{ width: "100%" }}
                  disabledDate={(current) => {
                    const fromDate = applyForm.getFieldValue("fromDate") as dayjs.Dayjs | undefined;
                    return !!(fromDate && current && current.isBefore(fromDate, "day"));
                  }}
                />
              </Form.Item>
              <Form.Item name="reason" label="Reason" rules={[{ required: true }]}>
                <Input.TextArea rows={3} maxLength={500} />
              </Form.Item>
              <Button type="primary" htmlType="submit">Apply Leave</Button>
            </Form>
          </Card>
        </Col>

        <Col xs={24} lg={14}>
          <Card title="Leave Balances" loading={ownLeaves.loading}>
            {balances.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Balances will appear after your first leave record" />
            ) : (
              <Row gutter={[12, 12]}>
                {balances.map((balance) => (
                  <Col xs={24} sm={8} key={balance.leaveType}>
                    <Card size="small">
                      <Typography.Title level={5} style={{ marginTop: 0 }}>{balance.leaveType}</Typography.Title>
                      <Typography.Text>Allocated: {balance.allocated}</Typography.Text><br />
                      <Typography.Text>Used: {balance.used}</Typography.Text><br />
                      <Typography.Text strong>Remaining: {balance.remaining}</Typography.Text>
                    </Card>
                  </Col>
                ))}
              </Row>
            )}
          </Card>
        </Col>
      </Row>

      <Card title="My Leave History" style={{ marginTop: 16 }} loading={ownLeaves.loading}>
        <Table
          dataSource={ownRecords}
          rowKey="id"
          size="small"
          pagination={{ pageSize: 8 }}
          columns={[
            { title: "Type", dataIndex: "leaveType" },
            { title: "Dates", render: (_, record) => `${record.startDate} - ${record.endDate}` },
            { title: "Reason", dataIndex: "reason" },
            { title: "Status", dataIndex: "status", render: (status: LeaveStatus) => <Tag color={LEAVE_STATUS_COLORS[status]}>{status}</Tag> },
            { title: "Comment", dataIndex: "reviewerComment", render: (value: string | null) => value ?? "--" },
          ]}
        />
      </Card>

      {isAdminView && (
        <Card title="Leave Approval Panel" style={{ marginTop: 16 }} extra={
          <Select
            allowClear
            placeholder="Filter status"
            value={statusFilter}
            onChange={(value) => setStatusFilter(value)}
            style={{ width: 160 }}
            options={Object.keys(LEAVE_STATUS_COLORS).map((status) => ({ value: status, label: status }))}
          />
        }>
          <Table
            dataSource={adminLeaves.data.records}
            rowKey="id"
            size="small"
            pagination={{ pageSize: 10 }}
            columns={[
              { title: "Member", dataIndex: "userName" },
              { title: "Store", dataIndex: "storeName" },
              { title: "Type", dataIndex: "leaveType" },
              { title: "Dates", render: (_, record) => `${record.startDate} - ${record.endDate}` },
              { title: "Reason", dataIndex: "reason" },
              { title: "Status", dataIndex: "status", render: (status: LeaveStatus) => <Tag color={LEAVE_STATUS_COLORS[status]}>{status}</Tag> },
              {
                title: "Actions",
                render: (_, record) => record.status === "PENDING" ? (
                  <Space>
                    <Button size="small" type="primary" onClick={() => { setDecisionOpen({ leaveRequestId: record.id, action: "approve" }); decisionForm.setFieldsValue({ leaveRequestId: record.id }); }}>Approve</Button>
                    <Button size="small" danger onClick={() => { setDecisionOpen({ leaveRequestId: record.id, action: "reject" }); decisionForm.setFieldsValue({ leaveRequestId: record.id }); }}>Reject</Button>
                  </Space>
                ) : null,
              },
            ]}
          />
        </Card>
      )}

      <Modal title={decisionOpen?.action === "approve" ? "Approve Leave" : "Reject Leave"} open={!!decisionOpen} footer={null} onCancel={() => setDecisionOpen(null)} destroyOnHidden>
        <Form form={decisionForm} layout="vertical" onFinish={submitDecision}>
          <Form.Item name="leaveRequestId" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="comment" label="Comment">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Flex justify="end" gap={8}>
            <Button onClick={() => setDecisionOpen(null)}>Cancel</Button>
            <Button type="primary" htmlType="submit">Submit</Button>
          </Flex>
        </Form>
      </Modal>
    </div>
  );
}