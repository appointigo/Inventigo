export type AttendanceStatus = "PRESENT" | "ABSENT" | "OFF" | "LEAVE";
export type LeaveType = "SICK" | "CASUAL" | "PAID";
export type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED";

export type AttendanceRecord = {
  id: string | null;
  userId: string;
  userName: string;
  storeId: string | null;
  storeName: string | null;
  date: string;
  status: AttendanceStatus;
  checkInAt: string | null;
  checkOutAt: string | null;
  totalMinutes: number | null;
  totalHoursLabel: string;
  note: string | null;
  isOverride: boolean;
};

export type AttendanceHistoryResponse = {
  today: AttendanceRecord | null;
  records: AttendanceRecord[];
};

export type AttendanceOverrideInput = {
  userId: string;
  storeId?: string | null;
  date: string;
  status: AttendanceStatus;
  checkInAt?: string | null;
  checkOutAt?: string | null;
  note?: string;
  overrideReason: string;
};

export type WeeklyOffDayConfig = {
  dayOfWeek: number;
  isOptional: boolean;
};

export type WeeklyOffConfig = {
  storeId: string;
  storeName: string;
  days: WeeklyOffDayConfig[];
};

export type LeaveRecord = {
  id: string;
  userId: string;
  userName: string;
  storeId: string;
  storeName: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
  status: LeaveStatus;
  reviewerComment: string | null;
  reviewedByName: string | null;
  decidedAt: string | null;
  createdAt: string;
};

export type LeaveBalanceRecord = {
  leaveType: LeaveType;
  year: number;
  allocated: number;
  used: number;
  remaining: number;
};

export type LeaveListResponse = {
  records: LeaveRecord[];
  balances: LeaveBalanceRecord[];
};

export type LeaveApplicationInput = {
  leaveType: LeaveType;
  fromDate: string;
  toDate: string;
  reason: string;
  storeId?: string | null;
};

export type LeaveDecisionInput = {
  leaveRequestId: string;
  comment?: string;
};