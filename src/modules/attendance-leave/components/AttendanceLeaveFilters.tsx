"use client";

import { Card, DatePicker, Flex, Input, Select } from "antd";
import type { AttendanceLeaveModuleData } from "../types";

const ATTENDANCE_STATUS_OPTIONS = [
  { value: "PRESENT", label: "Present" },
  { value: "ABSENT", label: "Absent" },
  { value: "OFF", label: "Weekly Off" },
  { value: "LEAVE", label: "Leave" },
];

const LEAVE_STATUS_OPTIONS = [
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
];

export function AttendanceLeaveFilters({ module }: { module: AttendanceLeaveModuleData }) {
  const { activeTab, filters } = module;

  return (
    <Card size="small" style={{ marginBottom: 16 }}>
      <Flex wrap gap={12} align="center">
        <DatePicker.RangePicker
          value={filters.range}
          onChange={(values) => values && module.setRange(values as typeof filters.range)}
        />
        <Input.Search
          allowClear
          placeholder={activeTab === "calendar" ? "Search people or events" : "Search by user, reason, note, or status"}
          value={filters.search}
          onChange={(event) => module.setSearch(event.target.value)}
          style={{ minWidth: 240, flex: 1 }}
        />
        {module.isAdminView && module.userOptions.length > 0 ? (
          <Select
            allowClear
            placeholder="Filter user"
            value={filters.selectedUserId}
            onChange={(value) => module.setSelectedUserId(value ?? null)}
            style={{ width: 220 }}
            options={module.userOptions}
          />
        ) : null}
        {activeTab === "attendance" ? (
          <Select
            allowClear
            placeholder="Attendance status"
            value={filters.attendanceStatus}
            onChange={(value) => module.setAttendanceStatus((value ?? null) as typeof filters.attendanceStatus)}
            style={{ width: 200 }}
            options={ATTENDANCE_STATUS_OPTIONS}
          />
        ) : null}
        {activeTab === "leaves" ? (
          <Select
            allowClear
            placeholder="Leave status"
            value={filters.leaveStatus}
            onChange={(value) => module.setLeaveStatus((value ?? null) as typeof filters.leaveStatus)}
            style={{ width: 180 }}
            options={LEAVE_STATUS_OPTIONS}
          />
        ) : null}
        {activeTab === "requests" ? (
          <Select
            value={filters.requestType}
            onChange={(value) => module.setRequestType(value)}
            style={{ width: 180 }}
            options={[
              { value: "ALL", label: "All Requests" },
              { value: "LEAVE", label: "Leave Requests" },
              { value: "ATTENDANCE", label: "Attendance Requests" },
            ]}
          />
        ) : null}
      </Flex>
    </Card>
  );
}