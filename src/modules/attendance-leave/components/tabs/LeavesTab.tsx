"use client";

import { useEffect, useMemo, useState } from "react";
import { App, Button, Card, Col, DatePicker, Empty, Flex, Form, Input, Modal, Row, Select, Space, Table, Tag, Typography } from "antd";
import dayjs from "dayjs";
import type { LeaveDecisionInput, AttendanceLeaveModuleData, LeaveRecord, LeaveStatus, LeaveType } from "../../types";

type LeaveApplicationFormValues = {
  leaveType: LeaveType;
  fromDate: dayjs.Dayjs;
  toDate?: dayjs.Dayjs;
  reason: string;
};

const STATUS_COLORS: Record<LeaveStatus, string> = {
  PENDING: "orange",
  APPROVED: "green",
  REJECTED: "red",
};

export function LeavesTab({ module }: { module: AttendanceLeaveModuleData }) {
  const { message } = App.useApp();
  const [applyForm] = Form.useForm<LeaveApplicationFormValues>();
  const [decisionForm] = Form.useForm<LeaveDecisionInput>();
  const [decisionOpen, setDecisionOpen] = useState<null | { leaveRequestId: string; action: "approve" | "reject" }>(null);
  const [optimisticLeaves, setOptimisticLeaves] = useState<LeaveRecord[]>([]);

  useEffect(() => {
    setOptimisticLeaves([]);
  }, [module.leaveRecords]);

  const leaveRows = useMemo(() => [...optimisticLeaves, ...module.leaveRecords], [module.leaveRecords, optimisticLeaves]);

  const submitLeave = async (values: LeaveApplicationFormValues) => {
    const fromDate = values.fromDate.startOf("day").format("YYYY-MM-DD");
    const toDate = (values.toDate ?? values.fromDate).startOf("day").format("YYYY-MM-DD");
    const tempId = `temp-${Date.now()}`;
    const optimisticRecord: LeaveRecord = {
      id: tempId,
      userId: module.user?.id ?? tempId,
      userName: module.user?.name ?? "You",
      storeId: module.storeId ?? "",
      storeName: module.storeName,
      leaveType: values.leaveType,
      startDate: fromDate,
      endDate: toDate,
      reason: values.reason,
      status: "PENDING",
      reviewerComment: null,
      reviewedByName: null,
      decidedAt: null,
      createdAt: new Date().toISOString(),
    };

    setOptimisticLeaves((current) => [optimisticRecord, ...current]);

    try {
      await module.applyLeave({
        leaveType: values.leaveType,
        fromDate,
        toDate,
        reason: values.reason,
        storeId: module.storeId ?? undefined,
      });
      message.success("Leave applied");
      applyForm.resetFields();
      setOptimisticLeaves((current) => current.filter((item) => item.id !== tempId));
    } catch (error) {
      setOptimisticLeaves((current) => current.filter((item) => item.id !== tempId));
      message.error(error instanceof Error ? error.message : "Leave request failed");
    }
  };

  const submitDecision = async (values: LeaveDecisionInput) => {
    if (!decisionOpen) return;
    const payload: LeaveDecisionInput = {
      leaveRequestId: decisionOpen.leaveRequestId,
      comment: values.comment,
    };
    try {
      if (decisionOpen.action === "approve") {
        await module.approveLeave(payload);
        message.success("Leave approved");
      } else {
        await module.rejectLeave(payload);
        message.success("Leave rejected");
      }
      setDecisionOpen(null);
      decisionForm.resetFields();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Decision failed");
    }
  };

  return (
    <>
      <Row gutter={[16, 16]}>
        <Col xs={24} xl={9}>
          <Card title="Apply Leave">
            <Form form={applyForm} layout="vertical" onFinish={(values) => void submitLeave(values)} initialValues={{ leaveType: module.leaveTypeOptions[0]?.value ?? "CASUAL" }}>
              <Form.Item name="leaveType" label="Leave Type" rules={[{ required: true }]}> 
                <Select options={module.leaveTypeOptions} />
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
                extra="Keep the same date for single-day leave."
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

          <Card title="Balances" style={{ marginTop: 16 }} loading={module.loading}>
            {module.ownLeaveBalances.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Balances appear after your first leave record" />
            ) : (
              <Space orientation="vertical" size={12} style={{ width: "100%" }}>
                {module.ownLeaveBalances.map((balance) => (
                  <Flex key={balance.leaveType} justify="space-between" align="center">
                    <div>
                      <Typography.Text strong>{module.leaveTypeMeta[balance.leaveType]?.label ?? balance.leaveType}</Typography.Text>
                      <br />
                      <Typography.Text type="secondary">Used {balance.used} / {balance.allocated}</Typography.Text>
                    </div>
                    <Tag color={module.leaveTypeMeta[balance.leaveType]?.color ?? "blue"}>{balance.remaining} left</Tag>
                  </Flex>
                ))}
              </Space>
            )}
          </Card>
        </Col>

        <Col xs={24} xl={15}>
          <Card title={module.isAdminView ? "Leave Register" : "My Leaves"} loading={module.loading}>
            <Table
              rowKey="id"
              dataSource={leaveRows}
              pagination={{ pageSize: 10 }}
              scroll={{ x: 760 }}
              columns={[
                ...(module.isAdminView ? [{ title: "User", dataIndex: "userName" }] : []),
                { title: "From Date", dataIndex: "startDate" },
                { title: "To Date", dataIndex: "endDate" },
                { title: "Leave Type", dataIndex: "leaveType", render: (leaveType: LeaveType) => module.leaveTypeMeta[leaveType]?.label ?? leaveType },
                { title: "Status", dataIndex: "status", render: (status: LeaveStatus) => <Tag color={STATUS_COLORS[status]}>{status}</Tag> },
                { title: "Reason", dataIndex: "reason", ellipsis: true },
                ...(module.canReviewRequests ? [{
                  title: "Action",
                  render: (_: unknown, record: LeaveRecord) => record.status === "PENDING" ? (
                    <Space>
                      <Button size="small" type="primary" onClick={() => { setDecisionOpen({ leaveRequestId: record.id, action: "approve" }); }}>Approve</Button>
                      <Button size="small" danger onClick={() => { setDecisionOpen({ leaveRequestId: record.id, action: "reject" }); }}>Reject</Button>
                    </Space>
                  ) : null,
                }] : []),
              ]}
            />
          </Card>
        </Col>
      </Row>

      <Modal title={decisionOpen?.action === "approve" ? "Approve Leave" : "Reject Leave"} open={!!decisionOpen} footer={null} onCancel={() => setDecisionOpen(null)} destroyOnHidden>
        <Form form={decisionForm} layout="vertical" onFinish={submitDecision}>
          <Form.Item name="comment" label="Remarks">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Flex justify="end" gap={8}>
            <Button onClick={() => setDecisionOpen(null)}>Cancel</Button>
            <Button type="primary" htmlType="submit">Submit</Button>
          </Flex>
        </Form>
      </Modal>
    </>
  );
}