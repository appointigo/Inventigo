import type { Dayjs } from "dayjs";
import type { AppUser } from "@/modules/settings/types";
import type {
  AttendanceOverrideInput,
  AttendanceRecord,
  AttendanceStatus,
  LeaveBalanceRecord,
  LeaveDecisionInput,
  LeaveRecord,
  LeaveStatus,
  StoreLeavePolicyRecord,
  UpdateStoreLeavePolicyInput,
  LeaveType,
  WeeklyOffConfig,
  WeeklyOffDayConfig,
} from "@/modules/staff/types";

export type { AttendanceOverrideInput, AttendanceRecord, AttendanceStatus, LeaveBalanceRecord, LeaveDecisionInput, LeaveRecord, LeaveStatus, LeaveType, WeeklyOffConfig, WeeklyOffDayConfig, StoreLeavePolicyRecord, UpdateStoreLeavePolicyInput };
export type { AppUser };

export type AttendanceLeaveTabKey = "attendance" | "leaves" | "requests" | "calendar";
export type UnifiedRequestType = "LEAVE" | "ATTENDANCE";
export type RequestDisplayStatus = LeaveStatus | "CANCELLED";

export type AttendanceLeaveFilters = {
  range: [Dayjs, Dayjs];
  search: string;
  selectedUserId: string | null;
  attendanceStatus: AttendanceStatus | null;
  leaveStatus: LeaveStatus | null;
  requestType: "ALL" | UnifiedRequestType;
};

export type UnifiedRequestRecord = {
  id: string;
  userId: string;
  userName: string;
  requestType: UnifiedRequestType;
  status: RequestDisplayStatus;
  dateLabel: string;
  summary: string;
  remark: string | null;
  sourceId: string;
  canCancel: boolean;
};

export type CalendarEntry = {
  id: string;
  date: string;
  label: string;
  color: string;
  kind: "attendance" | "leave" | "weekly-off";
  badge: "present" | "absent" | "leave" | "weekly-off";
  detail: string;
};

export type AttendanceLeaveSummary = {
  presentCount: number;
  leaveCount: number;
  pendingRequests: number;
  weeklyOffCount: number;
};

export type LeaveTypePresentation = {
  type: LeaveType;
  label: string;
  color: string;
};

export type AttendanceLeaveModuleData = {
  activeTab: AttendanceLeaveTabKey;
  setActiveTab: (tab: AttendanceLeaveTabKey) => void;
  filters: AttendanceLeaveFilters;
  setSearch: (value: string) => void;
  setRange: (value: [Dayjs, Dayjs]) => void;
  setSelectedUserId: (value: string | null) => void;
  setAttendanceStatus: (value: AttendanceStatus | null) => void;
  setLeaveStatus: (value: LeaveStatus | null) => void;
  setRequestType: (value: "ALL" | UnifiedRequestType) => void;
  settingsOpen: boolean;
  openSettings: () => void;
  closeSettings: () => void;
  isAdminView: boolean;
  canReviewRequests: boolean;
  canConfigureSettings: boolean;
  storeId: string | null;
  storeName: string;
  user: { id: string; name: string; role: string; storeId: string | null } | null;
  loading: boolean;
  selfAttendance: AttendanceRecord[];
  attendanceToday: AttendanceRecord | null;
  attendanceRecords: AttendanceRecord[];
  leaveRecords: LeaveRecord[];
  ownLeaveBalances: LeaveBalanceRecord[];
  requestRecords: UnifiedRequestRecord[];
  calendarEntriesByDate: Record<string, CalendarEntry[]>;
  summary: AttendanceLeaveSummary;
  userOptions: Array<{ value: string; label: string }>;
  leaveTypeOptions: Array<{ value: LeaveType; label: string }>;
  leaveTypeMeta: Record<LeaveType, LeaveTypePresentation>;
  leavePolicies: StoreLeavePolicyRecord[];
  leavePoliciesLoading: boolean;
  weeklyOffConfig: WeeklyOffConfig | null;
  weeklyOffLoading: boolean;
  saveLeavePolicies: (policies: UpdateStoreLeavePolicyInput[]) => Promise<void>;
  saveWeeklyOff: (days: WeeklyOffDayConfig[]) => Promise<void>;
  checkIn: (storeId?: string | null) => Promise<unknown>;
  checkOut: (storeId?: string | null) => Promise<unknown>;
  overrideAttendance: (input: AttendanceOverrideInput) => Promise<unknown>;
  applyLeave: (input: { leaveType: LeaveType; fromDate: string; toDate: string; reason: string; storeId?: string | null }) => Promise<unknown>;
  approveLeave: (input: LeaveDecisionInput) => Promise<unknown>;
  rejectLeave: (input: LeaveDecisionInput) => Promise<unknown>;
  cancelLeave: (input: LeaveDecisionInput) => Promise<unknown>;
  refreshAll: () => Promise<void>;
};