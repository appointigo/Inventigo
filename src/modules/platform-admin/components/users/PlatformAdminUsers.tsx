"use client";

import React, { useState, useMemo, useCallback } from "react";
import { Spin } from "antd";
import {
  SearchOutlined,
  UserOutlined,
  CheckCircleOutlined,
  ThunderboltOutlined,
  BankOutlined,
  ExportOutlined,
  PlusOutlined,
  KeyOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  MoreOutlined,
} from "@ant-design/icons";
import { usePlatformUsers, useToggleUserActive } from "../../hooks/usePlatformAdmin";
import {
  PageTop, PageTitle, PageSubtitle, ActionButtons, BtnPrimary, BtnGhost,
  KPIGrid, KPICard, KPIShine, KPIIcon, KPILabel, KPIValue, KPIDelta,
  Toolbar, SearchBox, SearchInput, FilterSelect, ResultCount,
  TablePanel, StyledTable, THead, TBody,
  UserCell, UserAvatar, UserName, UserEmail,
  Badge, ActionBtn, MoreBtn,
  Pagination, PageBtns, PageBtn, FaintText, OrgNameText,
} from "./PlatformAdminUsers.styled";

const ROLE_BADGE: Record<string, { variant: "purple" | "blue" | "orange" | "gray"; label: string }> = {
  SUPER_ADMIN: { variant: "purple", label: "SUPER ADMIN" },
  OWNER:       { variant: "purple", label: "OWNER" },
  ADMIN:       { variant: "blue",   label: "ADMIN" },
  MANAGER:     { variant: "orange", label: "MANAGER" },
  STAFF:       { variant: "gray",   label: "STAFF" },
};

const AVATAR_GRADIENTS = [
  "linear-gradient(135deg, #1677ff, #38bdf8)",
  "linear-gradient(135deg, #16a34a, #4ade80)",
  "linear-gradient(135deg, #d97706, #fbbf24)",
  "linear-gradient(135deg, #7c3aed, #a78bfa)",
  "linear-gradient(135deg, #dc2626, #f87171)",
  "linear-gradient(135deg, #0891b2, #22d3ee)",
];

const PAGE_SIZE = 10;

export default function PlatformAdminUsers() {
  const { data, isLoading } = usePlatformUsers();
  const toggleUser = useToggleUserActive();

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);

  const users = data?.users ?? [];
  const stats = data?.stats;

  const filtered = useMemo(() => {
    let result = users;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
      );
    }
    if (roleFilter !== "ALL") result = result.filter((u) => u.role === roleFilter);
    if (statusFilter !== "ALL") result = result.filter((u) => (statusFilter === "Active" ? u.isActive : !u.isActive));
    return result;
  }, [users, search, roleFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleToggle = useCallback(
    (userId: string, isActive: boolean) => {
      toggleUser.mutate({ userId, isActive });
    },
    [toggleUser]
  );

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  if (isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <>
      <PageTop>
        <div>
          <PageTitle>Platform Users</PageTitle>
          <PageSubtitle>Manage all users across every organization. Deactivate, reset passwords, and monitor activity.</PageSubtitle>
        </div>
        <ActionButtons>
          <BtnGhost><ExportOutlined style={{ marginRight: 4 }} /> Export CSV</BtnGhost>
          <BtnPrimary><PlusOutlined /> Invite User</BtnPrimary>
        </ActionButtons>
      </PageTop>

      {/* KPI Row */}
      <KPIGrid>
        <KPICard delay={0}>
          <KPIShine color="#1677ff" />
          <KPIIcon bg="#eff6ff" color="#1677ff"><UserOutlined /></KPIIcon>
          <KPILabel>Total Users</KPILabel>
          <KPIValue>{stats?.totalUsers ?? 0}</KPIValue>
          <KPIDelta variant="up">↑ Platform-wide</KPIDelta>
        </KPICard>
        <KPICard delay={0.05}>
          <KPIShine color="#16a34a" />
          <KPIIcon bg="#f0fdf4" color="#16a34a"><CheckCircleOutlined /></KPIIcon>
          <KPILabel>Active Users</KPILabel>
          <KPIValue>{stats?.activeUsers ?? 0}</KPIValue>
          <KPIDelta variant="up">
            {stats && stats.totalUsers > 0
              ? `${Math.round((stats.activeUsers / stats.totalUsers) * 100)}% active`
              : "—"}
          </KPIDelta>
        </KPICard>
        <KPICard delay={0.1}>
          <KPIShine color="#d97706" />
          <KPIIcon bg="#fffbeb" color="#d97706"><ThunderboltOutlined /></KPIIcon>
          <KPILabel>Admin Users</KPILabel>
          <KPIValue>{stats?.adminUsers ?? 0}</KPIValue>
          <KPIDelta variant="warn">
            {stats && stats.totalUsers > 0
              ? `${Math.round((stats.adminUsers / stats.totalUsers) * 100)}% of total`
              : "—"}
          </KPIDelta>
        </KPICard>
        <KPICard delay={0.15}>
          <KPIShine color="#7c3aed" />
          <KPIIcon bg="#f5f3ff" color="#7c3aed"><BankOutlined /></KPIIcon>
          <KPILabel>Organizations</KPILabel>
          <KPIValue>{stats?.totalOrgs ?? 0}</KPIValue>
          <KPIDelta variant="up">
            {stats && stats.totalOrgs > 0
              ? `↑ ${Math.round(stats.totalUsers / stats.totalOrgs)} avg users/org`
              : "—"}
          </KPIDelta>
        </KPICard>
      </KPIGrid>

      {/* Toolbar */}
      <Toolbar>
        <SearchBox>
          <SearchOutlined style={{ color: "#9ca3af" }} />
          <SearchInput
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </SearchBox>
        <FilterSelect value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}>
          <option value="ALL">All Roles</option>
          <option value="OWNER">OWNER</option>
          <option value="ADMIN">ADMIN</option>
          <option value="MANAGER">MANAGER</option>
          <option value="STAFF">STAFF</option>
        </FilterSelect>
        <FilterSelect value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="ALL">All Status</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </FilterSelect>
        <ResultCount>{filtered.length} users</ResultCount>
      </Toolbar>

      {/* Data Table */}
      <TablePanel>
        <StyledTable>
          <THead>
            <tr>
              <th>User</th>
              <th>Organization</th>
              <th>Role</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </THead>
          <TBody>
            {paginated.map((user, idx) => {
              const roleBadge = ROLE_BADGE[user.role] || ROLE_BADGE.STAFF;
              const avatarBg = AVATAR_GRADIENTS[idx % AVATAR_GRADIENTS.length];
              return (
                <tr key={user.id}>
                  <td>
                    <UserCell>
                      <UserAvatar bg={avatarBg}>{user.name.charAt(0).toUpperCase()}</UserAvatar>
                      <div>
                        <UserName>{user.name}</UserName>
                        <UserEmail>{user.email}</UserEmail>
                      </div>
                    </UserCell>
                  </td>
                  <td><OrgNameText>{user.orgName ?? "—"}</OrgNameText></td>
                  <td><Badge variant={roleBadge.variant}>{roleBadge.label}</Badge></td>
                  <td>
                    <Badge variant={user.isActive ? "green" : "red"}>
                      {user.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td><FaintText>{formatDate(user.createdAt)}</FaintText></td>
                  <td>
                    {user.role === "SUPER_ADMIN" ? (
                      <MoreBtn><MoreOutlined /></MoreBtn>
                    ) : (
                      <>
                        <ActionBtn><KeyOutlined style={{ marginRight: 3 }} /> Reset</ActionBtn>
                        {user.isActive ? (
                          <ActionBtn
                            danger
                            onClick={() => handleToggle(user.id, false)}
                          >
                            <PauseCircleOutlined style={{ marginRight: 3 }} /> Deactivate
                          </ActionBtn>
                        ) : (
                          <ActionBtn
                            onClick={() => handleToggle(user.id, true)}
                            style={{ borderColor: "#bbf7d0", color: "#16a34a" }}
                          >
                            <PlayCircleOutlined style={{ marginRight: 3 }} /> Activate
                          </ActionBtn>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
            {paginated.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}>
                  No users found
                </td>
              </tr>
            )}
          </TBody>
        </StyledTable>
        <Pagination>
          <span>Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} users</span>
          <PageBtns>
            <PageBtn onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}>‹</PageBtn>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
              <PageBtn key={p} active={p === page} onClick={() => setPage(p)}>{p}</PageBtn>
            ))}
            <PageBtn onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}>›</PageBtn>
          </PageBtns>
        </Pagination>
      </TablePanel>
    </>
  );
}
