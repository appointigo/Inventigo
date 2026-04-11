"use client";

import { Button, Card, Col, Flex, Row, Statistic, Tabs, Typography } from "antd";
import { SettingOutlined } from "@ant-design/icons";
import { AttendanceLeaveProvider } from "../context/AttendanceLeaveContext";
import { useAttendanceLeaveModule } from "../hooks/useAttendanceLeaveModule";
import type { AttendanceLeaveTabKey } from "../types";
import { AdminConfigDrawer } from "./AdminConfigDrawer";
import { AttendanceLeaveFilters } from "./AttendanceLeaveFilters";
import { AttendanceTab } from "./tabs/AttendanceTab";
import { CalendarTab } from "./tabs/CalendarTab";
import { LeavesTab } from "./tabs/LeavesTab";
import { RequestsTab } from "./tabs/RequestsTab";

function AttendanceLeavePageContent() {
  const module = useAttendanceLeaveModule();

  return (
    <div style={{ padding: 24 }}>
      <Flex justify="space-between" align="start" wrap gap={16} style={{ marginBottom: 18 }}>
        <div>
          <Typography.Title level={3} style={{ margin: 0 }}>Attendance & Leave</Typography.Title>
          <Typography.Text type="secondary">
            Manage daily attendance, leave planning, approvals, and the shared calendar from one workflow.
          </Typography.Text>
        </div>
        {module.canConfigureSettings ? (
          <Button icon={<SettingOutlined />} onClick={module.openSettings}>
            Settings
          </Button>
        ) : null}
      </Flex>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} md={6}><Card size="small"><Statistic title="Present Days" value={module.summary.presentCount} /></Card></Col>
        <Col xs={12} md={6}><Card size="small"><Statistic title="Leave Records" value={module.summary.leaveCount} /></Card></Col>
        <Col xs={12} md={6}><Card size="small"><Statistic title="Pending Requests" value={module.summary.pendingRequests} /></Card></Col>
        <Col xs={12} md={6}><Card size="small"><Statistic title="Weekly Offs" value={module.summary.weeklyOffCount} /></Card></Col>
      </Row>

      <AttendanceLeaveFilters module={module} />

      <Tabs
        activeKey={module.activeTab}
        onChange={(key) => module.setActiveTab(key as AttendanceLeaveTabKey)}
        items={[
          { key: "attendance", label: "Attendance", children: <AttendanceTab module={module} /> },
          { key: "leaves", label: "Leaves", children: <LeavesTab module={module} /> },
          { key: "requests", label: "Requests", children: <RequestsTab module={module} /> },
          { key: "calendar", label: "Calendar", children: <CalendarTab module={module} /> },
        ]}
      />

      <AdminConfigDrawer module={module} />
    </div>
  );
}

export function AttendanceLeavePage({ initialTab = "attendance" }: { initialTab?: AttendanceLeaveTabKey }) {
  return (
    <AttendanceLeaveProvider initialTab={initialTab}>
      <AttendanceLeavePageContent />
    </AttendanceLeaveProvider>
  );
}