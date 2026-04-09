"use client";

import React, { useState, useMemo } from "react";
import { Spin } from "antd";
import { SearchOutlined, PlusOutlined, FlagOutlined, ClockCircleOutlined, ApartmentOutlined } from "@ant-design/icons";
import {
  PageTop, PageTitle, PageSubtitle, BtnPrimary,
  Toolbar, SearchBox, SearchInput, FilterSelect, ResultCount,
  FlagsGrid, FlagCard, FlagHeader, FlagHeaderLeft, FlagKey, FlagDesc, FlagMeta,
  Toggle, ScopeBadge, EmptyState,
} from "./PlatformAdminFeatureFlags.styled";
import { useFeatureFlags, useToggleFeatureFlag } from "../../hooks/usePlatformAdmin";
import type { FeatureFlagItem } from "../../types";

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function PlatformAdminFeatureFlags() {
  const { data: flags, isLoading } = useFeatureFlags();
  const toggleMut = useToggleFeatureFlag();

  const [search, setSearch] = useState("");
  const [scopeFilter, setScopeFilter] = useState("ALL");
  const [stateFilter, setStateFilter] = useState("ALL");

  const filtered = useMemo(() => {
    if (!flags) return [];
    return flags.filter((f) => {
      if (search && !f.key.toLowerCase().includes(search.toLowerCase()) &&
          !f.description.toLowerCase().includes(search.toLowerCase())) return false;
      if (scopeFilter !== "ALL" && f.scope !== scopeFilter) return false;
      if (stateFilter === "ON" && !f.value) return false;
      if (stateFilter === "OFF" && f.value) return false;
      return true;
    });
  }, [flags, search, scopeFilter, stateFilter]);

  if (isLoading) return <Spin size="large" style={{ display: "block", margin: "80px auto" }} />;

  return (
    <>
      <PageTop>
        <div>
          <PageTitle>Feature Flags</PageTitle>
          <PageSubtitle>Manage platform-wide feature toggles and rollouts</PageSubtitle>
        </div>
        <BtnPrimary><PlusOutlined /> Create Flag</BtnPrimary>
      </PageTop>

      <Toolbar>
        <SearchBox>
          <SearchOutlined style={{ color: "#aaa", fontSize: 14 }} />
          <SearchInput
            placeholder="Search flags…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </SearchBox>

        <FilterSelect value={scopeFilter} onChange={(e) => setScopeFilter(e.target.value)}>
          <option value="ALL">All Scopes</option>
          <option value="GLOBAL">Global</option>
          <option value="PER_ORG">Per-Org</option>
        </FilterSelect>

        <FilterSelect value={stateFilter} onChange={(e) => setStateFilter(e.target.value)}>
          <option value="ALL">All States</option>
          <option value="ON">Enabled</option>
          <option value="OFF">Disabled</option>
        </FilterSelect>

        <ResultCount>{filtered.length} flag{filtered.length !== 1 ? "s" : ""}</ResultCount>
      </Toolbar>

      <FlagsGrid>
        {filtered.length === 0 && <EmptyState>No feature flags match your filters</EmptyState>}

        {filtered.map((flag) => (
          <FlagCard key={flag.id}>
            <FlagHeader>
              <FlagHeaderLeft>
                <FlagKey>{flag.key}</FlagKey>
                <ScopeBadge scope={flag.scope as "GLOBAL" | "PER_ORG"}>
                  {flag.scope === "GLOBAL" ? "Global" : "Per-Org"}
                </ScopeBadge>
              </FlagHeaderLeft>
              <Toggle
                on={flag.value}
                onClick={() => toggleMut.mutate({ flagId: flag.id, value: !flag.value })}
              />
            </FlagHeader>

            <FlagDesc>{flag.description || "No description"}</FlagDesc>

            <FlagMeta>
              <FlagOutlined />
              <span>{flag.value ? "Enabled" : "Disabled"}</span>
              <span>·</span>
              <ApartmentOutlined />
              <span>{flag.affectedOrgs} org{flag.affectedOrgs !== 1 ? "s" : ""}</span>
              <span>·</span>
              <ClockCircleOutlined />
              <span>{timeAgo(flag.updatedAt)}</span>
            </FlagMeta>
          </FlagCard>
        ))}
      </FlagsGrid>
    </>
  );
}
