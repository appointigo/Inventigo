"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import dayjs from "dayjs";
import type { AttendanceLeaveFilters, AttendanceLeaveTabKey, AttendanceStatus, LeaveStatus, UnifiedRequestType } from "../types";

type AttendanceLeaveContextValue = {
  activeTab: AttendanceLeaveTabKey;
  setActiveTab: (tab: AttendanceLeaveTabKey) => void;
  filters: AttendanceLeaveFilters;
  setSearch: (value: string) => void;
  setRange: (value: [dayjs.Dayjs, dayjs.Dayjs]) => void;
  setSelectedUserId: (value: string | null) => void;
  setAttendanceStatus: (value: AttendanceStatus | null) => void;
  setLeaveStatus: (value: LeaveStatus | null) => void;
  setRequestType: (value: "ALL" | UnifiedRequestType) => void;
  settingsOpen: boolean;
  openSettings: () => void;
  closeSettings: () => void;
};

const AttendanceLeaveContext = createContext<AttendanceLeaveContextValue | null>(null);

export function AttendanceLeaveProvider({
  children,
  initialTab = "attendance",
}: {
  children: ReactNode;
  initialTab?: AttendanceLeaveTabKey;
}) {
  const now = dayjs();
  const [activeTab, setActiveTab] = useState<AttendanceLeaveTabKey>(initialTab);
  const [range, setRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([now.startOf("month"), now.endOf("month")]);
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [attendanceStatus, setAttendanceStatus] = useState<AttendanceStatus | null>(null);
  const [leaveStatus, setLeaveStatus] = useState<LeaveStatus | null>(null);
  const [requestType, setRequestType] = useState<"ALL" | UnifiedRequestType>("ALL");
  const [settingsOpen, setSettingsOpen] = useState(false);

  const value = useMemo<AttendanceLeaveContextValue>(() => ({
    activeTab,
    setActiveTab,
    filters: {
      range,
      search,
      selectedUserId,
      attendanceStatus,
      leaveStatus,
      requestType,
    },
    setSearch,
    setRange,
    setSelectedUserId,
    setAttendanceStatus,
    setLeaveStatus,
    setRequestType,
    settingsOpen,
    openSettings: () => setSettingsOpen(true),
    closeSettings: () => setSettingsOpen(false),
  }), [activeTab, attendanceStatus, leaveStatus, range, requestType, search, selectedUserId, settingsOpen]);

  return <AttendanceLeaveContext.Provider value={value}>{children}</AttendanceLeaveContext.Provider>;
}

export function useAttendanceLeaveState() {
  const context = useContext(AttendanceLeaveContext);
  if (!context) {
    throw new Error("useAttendanceLeaveState must be used within AttendanceLeaveProvider");
  }
  return context;
}