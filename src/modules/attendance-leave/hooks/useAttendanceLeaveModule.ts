"use client";

import { useMemo } from "react";
import dayjs from "dayjs";
import { useCurrentUser } from "@/modules/auth/hooks/useAuth";
import { useUsers } from "@/modules/settings/hooks/useUsers";
import { useAttendance, useWeeklyOffConfig } from "@/modules/staff/hooks/useAttendance";
import { useLeaveManagement } from "@/modules/staff/hooks/useLeaveManagement";
import { useStore } from "@/providers/StoreProvider";
import { useAttendanceLeaveState } from "../context/AttendanceLeaveContext";
import { useStoreLeavePolicy } from "./useStoreLeavePolicy";
import type {
  AttendanceLeaveModuleData,
  AttendanceRecord,
  AttendanceStatus,
  CalendarEntry,
  LeaveRecord,
  RequestDisplayStatus,
  UnifiedRequestRecord,
  WeeklyOffDayConfig,
} from "../types";

const LEAVE_TYPE_META = {
  CASUAL: { type: "CASUAL", label: "Casual Leave", color: "gold" },
  SICK: { type: "SICK", label: "Sick Leave", color: "red" },
  PAID: { type: "PAID", label: "Paid Leave", color: "green" },
} as const;

const ATTENDANCE_COLORS: Record<AttendanceStatus, string> = {
  PRESENT: "green",
  ABSENT: "red",
  OFF: "default",
  LEAVE: "gold",
};

const ATTENDANCE_SHORT_LABELS: Record<AttendanceStatus, string> = {
  PRESENT: "P",
  ABSENT: "A",
  OFF: "WO",
  LEAVE: "L",
};

const CANCELLED_BY_REQUESTER_PREFIX = "Cancelled by requester";

function matchesSearch(value: string, search: string) {
  return value.toLowerCase().includes(search);
}

function filterAttendance(records: AttendanceRecord[], search: string) {
  if (!search) return records;
  return records.filter((record) =>
    [record.userName, record.storeName ?? "", record.note ?? "", record.date, record.status].some((value) => matchesSearch(value, search))
  );
}

function filterLeaves(records: LeaveRecord[], search: string) {
  if (!search) return records;
  return records.filter((record) =>
    [record.userName, record.storeName, record.reason, record.leaveType, record.startDate, record.endDate, record.status].some((value) => matchesSearch(value, search))
  );
}

function appendEntry(target: Record<string, CalendarEntry[]>, entry: CalendarEntry) {
  const current = target[entry.date] ?? [];
  target[entry.date] = [...current, entry];
}

export function useAttendanceLeaveModule(): AttendanceLeaveModuleData {
  const { user } = useCurrentUser();
  const { storeId, storeName } = useStore();
  const {
    activeTab,
    setActiveTab,
    filters,
    setSearch,
    setRange,
    setSelectedUserId,
    setAttendanceStatus,
    setLeaveStatus,
    setRequestType,
    settingsOpen,
    openSettings,
    closeSettings,
  } = useAttendanceLeaveState();

  const from = filters.range[0].format("YYYY-MM-DD");
  const to = filters.range[1].format("YYYY-MM-DD");
  const search = filters.search.trim().toLowerCase();
  const isAdminView = user?.role === "OWNER" || user?.role === "ADMIN" || user?.role === "MANAGER";
  const canReviewRequests = isAdminView;
  const canConfigureSettings = user?.role === "OWNER" || user?.role === "ADMIN";

  const selfAttendance = useAttendance({ from, to });
  const scopedAttendance = useAttendance({
    from,
    to,
    storeId: isAdminView ? (storeId ?? undefined) : undefined,
    userId: filters.selectedUserId ?? undefined,
    status: filters.attendanceStatus ?? undefined,
  });
  const ownLeaves = useLeaveManagement({ from, to });
  const scopedLeaves = useLeaveManagement({
    from,
    to,
    storeId: isAdminView ? (storeId ?? undefined) : undefined,
    userId: filters.selectedUserId ?? undefined,
    status: filters.leaveStatus ?? undefined,
  });
  const requestLeaves = useLeaveManagement({
    from,
    to,
    storeId: isAdminView ? (storeId ?? undefined) : undefined,
    userId: filters.selectedUserId ?? undefined,
    status: canReviewRequests ? "PENDING" : undefined,
  });
  const weeklyOff = useWeeklyOffConfig(storeId ?? user?.storeId ?? undefined);
  const leavePolicy = useStoreLeavePolicy(storeId ?? user?.storeId ?? undefined);
  const { users, refresh: refreshUsers } = useUsers({ enabled: isAdminView });

  const leaveTypeMeta = LEAVE_TYPE_META;

  const attendanceBase = useMemo(() => {
    const records = isAdminView
      ? scopedAttendance.data.records
      : selfAttendance.data.records.filter((record) => record.userId === user?.id);
    return filterAttendance(records, search);
  }, [isAdminView, scopedAttendance.data.records, search, selfAttendance.data.records, user?.id]);

  const leaveBase = useMemo(() => {
    const records = isAdminView
      ? scopedLeaves.data.records
      : ownLeaves.data.records.filter((record) => record.userId === user?.id);
    return filterLeaves(records, search);
  }, [isAdminView, ownLeaves.data.records, scopedLeaves.data.records, search, user?.id]);

  const requestRecords = useMemo<UnifiedRequestRecord[]>(() => {
    return filterLeaves(requestLeaves.data.records, search)
      .map((record) => {
        const cancelledByRequester = record.status === "REJECTED"
          && !record.reviewedByName
          && !!record.reviewerComment
          && record.reviewerComment.startsWith(CANCELLED_BY_REQUESTER_PREFIX);

        return {
          id: `leave-${record.id}`,
          userId: record.userId,
          userName: record.userName,
          requestType: "LEAVE" as const,
          status: (cancelledByRequester ? "CANCELLED" : record.status) as RequestDisplayStatus,
          dateLabel: record.startDate === record.endDate ? record.startDate : `${record.startDate} - ${record.endDate}`,
          summary: `${leaveTypeMeta[record.leaveType].label} • ${record.reason}`,
          remark: cancelledByRequester
            ? (record.reviewerComment!.slice(CANCELLED_BY_REQUESTER_PREFIX.length).replace(/^:\s*/, "") || null)
            : record.reviewerComment,
          sourceId: record.id,
          canCancel: !canReviewRequests && record.status === "PENDING",
        };
      })
      .filter((record) => filters.requestType === "ALL" || filters.requestType === record.requestType);
  }, [canReviewRequests, filters.requestType, leaveTypeMeta, requestLeaves.data.records, search]);

  const userOptions = useMemo(() => {
    if (users.length > 0) {
      return users.map((item) => ({
        value: item.id,
        label: item.storeName ? `${item.name} • ${item.storeName}` : item.name,
      }));
    }

    const unique = new Map<string, string>();
    [...scopedAttendance.data.records, ...scopedLeaves.data.records].forEach((record) => {
      if (!unique.has(record.userId)) {
        unique.set(record.userId, record.userName);
      }
    });

    return Array.from(unique.entries()).map(([value, label]) => ({ value, label }));
  }, [scopedAttendance.data.records, scopedLeaves.data.records, users]);

  const leaveTypeOptions = useMemo(() => leavePolicy.policies
    .map((item) => ({ value: item.leaveType, label: leaveTypeMeta[item.leaveType].label })), [leavePolicy.policies, leaveTypeMeta]);

  const calendarEntriesByDate = useMemo<Record<string, CalendarEntry[]>>(() => {
    const next: Record<string, CalendarEntry[]> = {};

    attendanceBase.forEach((record) => {
      appendEntry(next, {
        id: `attendance-${record.userId}-${record.date}`,
        date: record.date,
        label: ATTENDANCE_SHORT_LABELS[record.status],
        color: ATTENDANCE_COLORS[record.status],
        kind: "attendance",
        badge: record.status === "PRESENT"
          ? "present"
          : record.status === "ABSENT"
            ? "absent"
            : record.status === "LEAVE"
              ? "leave"
              : "weekly-off",
        detail: `${record.userName}: ${record.status}`,
      });
    });

    leaveBase.forEach((record) => {
      let cursor = dayjs(record.startDate);
      const endDate = dayjs(record.endDate);
      while (cursor.isSame(endDate) || cursor.isBefore(endDate, "day")) {
        appendEntry(next, {
          id: `leave-${record.id}-${cursor.format("YYYY-MM-DD")}`,
          date: cursor.format("YYYY-MM-DD"),
          label: leaveTypeMeta[record.leaveType].label.slice(0, 1),
          color: "gold",
          kind: "leave",
          badge: "leave",
          detail: `${record.userName}: ${leaveTypeMeta[record.leaveType].label}`,
        });
        cursor = cursor.add(1, "day");
      }
    });

    const weeklyOffDays = new Set((weeklyOff.config?.days ?? []).map((day) => day.dayOfWeek));
    let cursor = filters.range[0].startOf("day");
    const rangeEnd = filters.range[1].startOf("day");
    while (cursor.isSame(rangeEnd) || cursor.isBefore(rangeEnd, "day")) {
      if (weeklyOffDays.has(cursor.day())) {
        appendEntry(next, {
          id: `weekly-off-${cursor.format("YYYY-MM-DD")}`,
          date: cursor.format("YYYY-MM-DD"),
          label: "WO",
          color: "default",
          kind: "weekly-off",
          badge: "weekly-off",
          detail: "Weekly Off",
        });
      }
      cursor = cursor.add(1, "day");
    }

    return next;
  }, [attendanceBase, filters.range, leaveBase, leaveTypeMeta, weeklyOff.config?.days]);

  const summary = useMemo(() => ({
    presentCount: attendanceBase.filter((record) => record.status === "PRESENT").length,
    leaveCount: leaveBase.length,
    pendingRequests: requestRecords.filter((record) => record.status === "PENDING").length,
    weeklyOffCount: Object.values(calendarEntriesByDate).flat().filter((entry) => entry.kind === "weekly-off").length,
  }), [attendanceBase, calendarEntriesByDate, leaveBase.length, requestRecords]);

  const loading = selfAttendance.loading || scopedAttendance.loading || ownLeaves.loading || scopedLeaves.loading || requestLeaves.loading;

  return {
    activeTab,
    setActiveTab,
    filters,
    setSearch,
    setRange,
    setSelectedUserId,
    setAttendanceStatus,
    setLeaveStatus,
    setRequestType,
    settingsOpen,
    openSettings,
    closeSettings,
    isAdminView,
    canReviewRequests,
    canConfigureSettings,
    storeId,
    storeName,
    user: user ? { id: user.id, name: user.name, role: user.role, storeId: user.storeId } : null,
    loading,
    selfAttendance: selfAttendance.data.records.filter((record) => record.userId === user?.id),
    attendanceToday: selfAttendance.data.today,
    attendanceRecords: attendanceBase,
    leaveRecords: leaveBase,
    ownLeaveBalances: ownLeaves.data.balances,
    requestRecords,
    calendarEntriesByDate,
    summary,
    userOptions,
    leaveTypeOptions,
    leaveTypeMeta,
    leavePolicies: leavePolicy.policies,
    leavePoliciesLoading: leavePolicy.loading,
    weeklyOffConfig: weeklyOff.config,
    weeklyOffLoading: weeklyOff.loading,
    saveLeavePolicies: async (policies) => {
      await leavePolicy.save(policies);
    },
    saveWeeklyOff: async (days: WeeklyOffDayConfig[]) => {
      await weeklyOff.save(days);
    },
    checkIn: selfAttendance.checkIn,
    checkOut: selfAttendance.checkOut,
    overrideAttendance: scopedAttendance.overrideAttendance,
    applyLeave: async (input) => {
      const result = await ownLeaves.applyLeave(input);
      await requestLeaves.refresh();
      return result;
    },
    approveLeave: async (input) => {
      const result = await scopedLeaves.approveLeave(input);
      await Promise.all([ownLeaves.refresh(), requestLeaves.refresh()]);
      return result;
    },
    rejectLeave: async (input) => {
      const result = await scopedLeaves.rejectLeave(input);
      await Promise.all([ownLeaves.refresh(), requestLeaves.refresh()]);
      return result;
    },
    cancelLeave: async (input) => {
      const result = await requestLeaves.cancelLeave(input);
      await Promise.all([ownLeaves.refresh(), scopedLeaves.refresh()]);
      return result;
    },
    refreshAll: async () => {
      await Promise.all([
        selfAttendance.refresh(),
        scopedAttendance.refresh(),
        ownLeaves.refresh(),
        scopedLeaves.refresh(),
        requestLeaves.refresh(),
        weeklyOff.refresh(),
        leavePolicy.refresh(),
        refreshUsers(),
      ]);
    },
  };
}