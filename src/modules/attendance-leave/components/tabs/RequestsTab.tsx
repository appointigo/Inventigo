"use client";

import { useMemo, useState } from "react";
import { App, Button, Card, Empty, Flex, Form, Input, Modal, Popconfirm, Space, Table, Tag, Typography } from "antd";
import type { AttendanceLeaveModuleData, LeaveDecisionInput, UnifiedRequestRecord } from "../../types";

const STATUS_COLORS = {
  PENDING: "orange",
  APPROVED: "green",
  REJECTED: "red",
  CANCELLED: "default",
} as const;

export function RequestsTab({ module }: { module: AttendanceLeaveModuleData }) {
  const { message } = App.useApp();
  const [decisionForm] = Form.useForm<LeaveDecisionInput>();
  const [decisionOpen, setDecisionOpen] = useState<null | { request: UnifiedRequestRecord; action: "approve" | "reject" }>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const rows = useMemo(() => module.requestRecords, [module.requestRecords]);

  const submitDecision = async (values: LeaveDecisionInput) => {
    if (!decisionOpen) return;
    setActionLoadingId(decisionOpen.request.id);
    const payload: LeaveDecisionInput = {
      leaveRequestId: decisionOpen.request.sourceId,
      comment: values.comment,
    };

    try {
      if (decisionOpen.action === "approve") {
        await module.approveLeave(payload);
        message.success("Request approved");
      } else {
        await module.rejectLeave(payload);
        message.success("Request rejected");
      }
      setDecisionOpen(null);
      decisionForm.resetFields();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Request update failed");
    } finally {
      setActionLoadingId(null);
    }
  };

  const cancelRequest = async (request: UnifiedRequestRecord) => {
    setActionLoadingId(request.id);
    try {
      await module.cancelLeave({ leaveRequestId: request.sourceId });
      message.success("Request cancelled");
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Request cancellation failed");
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <>
      <Card
        title={module.canReviewRequests ? "Pending Requests" : "My Requests"}
        extra={(
          <Typography.Text type="secondary">
            {module.canReviewRequests
              ? "Managers and admins see only pending requests here so approval work stays focused."
              : "Track every request you have submitted and cancel any request that is still pending."}
          </Typography.Text>
        )}
      >
        <Table
          rowKey="id"
          dataSource={rows}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 720 }}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={module.canReviewRequests ? "No pending requests" : "No requests found"} /> }}
          columns={[
            ...(module.canReviewRequests ? [{ title: "User", dataIndex: "userName" }] : []),
            {
              title: "Request Type",
              dataIndex: "requestType",
              render: (requestType: UnifiedRequestRecord["requestType"]) => requestType === "LEAVE" ? "Leave" : "Attendance",
            },
            { title: "Date", dataIndex: "dateLabel" },
            {
              title: "Status",
              dataIndex: "status",
              render: (status: UnifiedRequestRecord["status"]) => <Tag color={STATUS_COLORS[status]}>{status}</Tag>,
            },
            { title: "Summary", dataIndex: "summary", ellipsis: true },
            {
              title: "Remarks",
              dataIndex: "remark",
              ellipsis: true,
              render: (remark: string | null) => remark || <Typography.Text type="secondary">No remarks</Typography.Text>,
            },
            {
              title: "Action",
              render: (_: unknown, record: UnifiedRequestRecord) => (
                module.canReviewRequests ? (
                  <Space>
                    <Button
                      size="small"
                      type="primary"
                      loading={actionLoadingId === record.id && decisionOpen?.action === "approve"}
                      onClick={() => {
                        setDecisionOpen({ request: record, action: "approve" });
                      }}
                    >
                      Approve
                    </Button>
                    <Button
                      size="small"
                      danger
                      loading={actionLoadingId === record.id && decisionOpen?.action === "reject"}
                      onClick={() => {
                        setDecisionOpen({ request: record, action: "reject" });
                      }}
                    >
                      Reject
                    </Button>
                  </Space>
                ) : record.canCancel ? (
                  <Popconfirm
                    title="Cancel this request?"
                    description="Only pending requests can be cancelled."
                    okText="Yes, cancel"
                    cancelText="Keep"
                    onConfirm={() => void cancelRequest(record)}
                  >
                    <Button size="small" danger loading={actionLoadingId === record.id}>Cancel Request</Button>
                  </Popconfirm>
                ) : (
                  <Typography.Text type="secondary">No action</Typography.Text>
                )
              ),
            },
          ]}
        />
      </Card>

      <Modal title={decisionOpen?.action === "approve" ? "Approve Request" : "Reject Request"} open={!!decisionOpen} footer={null} onCancel={() => setDecisionOpen(null)} destroyOnHidden>
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