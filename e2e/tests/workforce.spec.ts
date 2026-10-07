import { expect, test } from "@playwright/test";
import { apiFetch, expectJson } from "../helpers/business";
import { E2E_IDS, e2eDb } from "../helpers/database";

test.describe.configure({ mode: "serial" });

test.afterAll(async () => {
  await e2eDb.$disconnect();
});

test("attendance check-in/out persists once and rejects invalid repeats", async ({ page }) => {
  const checkIn = await apiFetch(page, "/api/attendance/check-in", {
    method: "POST",
    data: { storeId: E2E_IDS.store },
  });
  const attendance = await expectJson<{ id: string; status: string; checkInAt: string }>(checkIn, 201);
  expect(attendance.status).toBe("PRESENT");
  expect(attendance.checkInAt).toBeTruthy();

  await expectJson(
    await apiFetch(page, "/api/attendance/check-in", {
      method: "POST",
      data: { storeId: E2E_IDS.store },
    }),
    400,
  );

  const checkOut = await apiFetch(page, "/api/attendance/check-out", {
    method: "POST",
    data: { storeId: E2E_IDS.store },
  });
  const completed = await expectJson<{ id: string; checkOutAt: string; totalMinutes: number }>(
    checkOut,
    200,
  );
  expect(completed.id).toBe(attendance.id);
  expect(completed.checkOutAt).toBeTruthy();
  expect(completed.totalMinutes).toBeGreaterThanOrEqual(0);

  const history = await expectJson<{ today: { id: string }; records: Array<{ id: string }> }>(
    await apiFetch(page, "/api/attendance/history"),
    200,
  );
  expect(history.today.id).toBe(attendance.id);
  expect(history.records).toContainEqual(expect.objectContaining({ id: attendance.id }));
  expect(await e2eDb.staffAttendance.count({ where: { id: attendance.id } })).toBe(1);
});

test("leave application and approval update the request and balance exactly once", async ({ page }) => {
  const apply = await apiFetch(page, "/api/leave/apply", {
    method: "POST",
    data: {
      leaveType: "CASUAL",
      fromDate: "2099-01-05",
      toDate: "2099-01-05",
      reason: "E2E deterministic leave",
      storeId: E2E_IDS.store,
    },
  });
  const leave = await expectJson<{ id: string; status: string }>(apply, 201);
  expect(leave.status).toBe("PENDING");

  const overlap = await apiFetch(page, "/api/leave/apply", {
    method: "POST",
    data: {
      leaveType: "SICK",
      fromDate: "2099-01-05",
      toDate: "2099-01-05",
      reason: "Must overlap",
      storeId: E2E_IDS.store,
    },
  });
  await expectJson(overlap, 400);

  const approve = await apiFetch(page, "/api/leave/approve", {
    method: "POST",
    data: { leaveRequestId: leave.id, comment: "E2E approved" },
  });
  const approved = await expectJson<{ id: string; status: string; reviewerComment: string }>(
    approve,
    200,
  );
  expect(approved).toMatchObject({ id: leave.id, status: "APPROVED", reviewerComment: "E2E approved" });

  await expectJson(
    await apiFetch(page, "/api/leave/approve", {
      method: "POST",
      data: { leaveRequestId: leave.id },
    }),
    400,
  );

  const list = await expectJson<{
    records: Array<{ id: string; status: string }>;
    balances: Array<{ leaveType: string; used: number }>;
  }>(await apiFetch(page, "/api/leave/list?from=2099-01-01&to=2099-01-31"), 200);
  expect(list.records).toContainEqual(expect.objectContaining({ id: leave.id, status: "APPROVED" }));
  expect(list.balances).toContainEqual(expect.objectContaining({ leaveType: "CASUAL", used: 1 }));
});
