"use client";

import React, { useState, useMemo } from "react";
import { Spin } from "antd";
import { SearchOutlined, ExportOutlined } from "@ant-design/icons";
import { useAuditLog } from "../../hooks/usePlatformAdmin";
import {
  PageTop, PageTitle, PageSubtitle, ActionButtons, BtnGhost, FilterSelect,
  Toolbar, SearchBox, SearchInput, ResultCount,
  TimelinePanel, Timeline, TLItem, TLDotCol, TLDot, TLLine, TLBody,
  TLAction, TLTarget, TLMeta, TLBy, TLDetail, TLCode,
  Badge, Pagination, PageBtns, PageBtn, EmptyState,
} from "./PlatformAdminAuditLog.styled";

const ACTION_COLORS: Record<string, string> = {
  ORG_CREATED:      "#16a34a",
  ADMIN_LOGIN:      "#1677ff",
  PLAN_CHANGED:     "#d97706",
  ORG_SUSPENDED:    "#dc2626",
  USER_DEACTIVATED: "#dc2626",
  USER_REACTIVATED: "#16a34a",
  PLAN_EDITED:      "#7c3aed",
  FLAG_CREATED:     "#1677ff",
  FLAG_TOGGLED:     "#d97706",
};

const ACTION_BADGES: Record<string, "green" | "red" | "blue" | "purple" | "orange" | "gray"> = {
  ORG_CREATED:      "green",
  ADMIN_LOGIN:      "blue",
  PLAN_CHANGED:     "orange",
  ORG_SUSPENDED:    "red",
  USER_DEACTIVATED: "red",
  USER_REACTIVATED: "green",
  PLAN_EDITED:      "purple",
  FLAG_CREATED:     "blue",
  FLAG_TOGGLED:     "orange",
};

const ACTION_LABELS: Record<string, (targetName: string | null) => React.ReactNode> = {
  ORG_CREATED:      (n) => <>Organization <TLTarget>{n}</TLTarget> was created</>,
  ADMIN_LOGIN:      (n) => <>Admin <TLTarget>{n}</TLTarget> logged in</>,
  PLAN_CHANGED:     (n) => <>Plan changed for <TLTarget>{n}</TLTarget></>,
  ORG_SUSPENDED:    (n) => <>Organization <TLTarget>{n}</TLTarget> was suspended</>,
  USER_DEACTIVATED: (n) => <>User <TLTarget>{n}</TLTarget> was deactivated</>,
  USER_REACTIVATED: (n) => <>User <TLTarget>{n}</TLTarget> was reactivated</>,
  PLAN_EDITED:      (n) => <>Plan definition <TLTarget>{n}</TLTarget> was edited</>,
  FLAG_CREATED:     (n) => <>Feature flag <TLTarget>{n}</TLTarget> was created</>,
  FLAG_TOGGLED:     (n) => <>Feature flag <TLTarget>{n}</TLTarget> was toggled</>,
};

const PAGE_SIZE = 10;

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

export default function PlatformAdminAuditLog() {
  const { data: entries, isLoading } = useAuditLog();

  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let result = entries ?? [];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (e) =>
          e.action.toLowerCase().includes(q) ||
          (e.targetName ?? "").toLowerCase().includes(q) ||
          (e.performerName ?? "").toLowerCase().includes(q)
      );
    }
    if (actionFilter !== "ALL") result = result.filter((e) => e.action === actionFilter);
    return result;
  }, [entries, search, actionFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  const renderMetadata = (entry: (typeof filtered)[0]) => {
    const m = entry.metadata;
    if (!m || Object.keys(m).length === 0) return null;

    const parts: React.ReactNode[] = [];
    if (m.oldPlan && m.newPlan) {
      parts.push(
        <span key="plan"><TLCode>{String(m.oldPlan)}</TLCode> → <TLCode>{String(m.newPlan)}</TLCode></span>
      );
    }
    if (m.reason) parts.push(<span key="reason">Reason: &quot;{String(m.reason)}&quot;</span>);
    if (m.value !== undefined) parts.push(<span key="val">Set to <TLCode>{String(m.value)}</TLCode></span>);

    // Generic fallback
    if (parts.length === 0) {
      Object.entries(m).forEach(([k, v]) => {
        parts.push(<span key={k}>{k}: <TLCode>{String(v)}</TLCode></span>);
      });
    }

    return <TLDetail>{parts}</TLDetail>;
  };

  return (
    <>
      <PageTop>
        <div>
          <PageTitle>Audit Log</PageTitle>
          <PageSubtitle>Every significant platform-level action, logged with full context and metadata.</PageSubtitle>
        </div>
        <ActionButtons>
          <FilterSelect>
            <option>Last 7 Days</option>
            <option>Last 30 Days</option>
            <option>All Time</option>
          </FilterSelect>
          <BtnGhost><ExportOutlined style={{ marginRight: 4 }} /> Export Log</BtnGhost>
        </ActionButtons>
      </PageTop>

      <Toolbar>
        <SearchBox>
          <SearchOutlined style={{ color: "#9ca3af" }} />
          <SearchInput
            placeholder="Search by action, user, or target…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </SearchBox>
        <FilterSelect value={actionFilter} onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}>
          <option value="ALL">All Actions</option>
          <option value="ORG_CREATED">ORG_CREATED</option>
          <option value="PLAN_CHANGED">PLAN_CHANGED</option>
          <option value="USER_DEACTIVATED">USER_DEACTIVATED</option>
          <option value="ADMIN_LOGIN">ADMIN_LOGIN</option>
          <option value="ORG_SUSPENDED">ORG_SUSPENDED</option>
          <option value="PLAN_EDITED">PLAN_EDITED</option>
          <option value="FLAG_CREATED">FLAG_CREATED</option>
          <option value="FLAG_TOGGLED">FLAG_TOGGLED</option>
        </FilterSelect>
        <ResultCount>{filtered.length} events</ResultCount>
      </Toolbar>

      <TimelinePanel>
        {paginated.length === 0 ? (
          <EmptyState>No audit log entries found</EmptyState>
        ) : (
          <Timeline>
            {paginated.map((entry, idx) => {
              const dotColor = ACTION_COLORS[entry.action] || "#9ca3af";
              const badgeVariant = ACTION_BADGES[entry.action] || "gray";
              const labelFn = ACTION_LABELS[entry.action];
              const isLast = idx === paginated.length - 1;

              return (
                <TLItem key={entry.id}>
                  <TLDotCol>
                    <TLDot color={dotColor} />
                    {!isLast && <TLLine />}
                  </TLDotCol>
                  <TLBody>
                    <TLAction>
                      {labelFn
                        ? labelFn(entry.targetName)
                        : <>{entry.action} — <TLTarget>{entry.targetName ?? entry.targetId}</TLTarget></>}
                    </TLAction>
                    <TLMeta>
                      <TLBy>by {entry.performerName ?? "System"}</TLBy>
                      · {timeAgo(entry.createdAt)} ·{" "}
                      <Badge variant={badgeVariant}>{entry.action}</Badge>
                    </TLMeta>
                    {renderMetadata(entry)}
                  </TLBody>
                </TLItem>
              );
            })}
          </Timeline>
        )}
        {filtered.length > 0 && (
          <Pagination>
            <span>Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} events</span>
            <PageBtns>
              <PageBtn onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}>‹</PageBtn>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
                <PageBtn key={p} active={p === page} onClick={() => setPage(p)}>{p}</PageBtn>
              ))}
              {totalPages > 5 && <PageBtn disabled>…</PageBtn>}
              <PageBtn onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}>›</PageBtn>
            </PageBtns>
          </Pagination>
        )}
      </TimelinePanel>
    </>
  );
}
