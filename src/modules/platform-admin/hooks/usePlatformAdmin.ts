"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { PlatformStats, OrgSummary, OrgDetail, PlatformUser, PlatformUserStats, AnalyticsData, AuditLogEntry, FeatureFlagItem, AnnouncementItem } from "../types";

const STALE_MS  = 30_000; // 30 s
const REFETCH_MS= 30_000;

// ── Platform stats ─────────────────────────────────────────────────────────

export const usePlatformStats = () =>
  useQuery<PlatformStats>({
    queryKey: ["platform-admin", "stats"],
    queryFn: async () => {
      const res = await fetch("/api/admin/stats");
      if (!res.ok) throw new Error("Failed to load platform stats");
      return res.json();
    },
    staleTime:       STALE_MS,
    refetchInterval: REFETCH_MS,
  });

// ── Organizations list ─────────────────────────────────────────────────────

export const usePlatformOrgs = () =>
  useQuery<OrgSummary[]>({
    queryKey: ["platform-admin", "orgs"],
    queryFn: async () => {
      const res = await fetch("/api/admin/organizations");
      if (!res.ok) throw new Error("Failed to load organizations");
      return res.json();
    },
    staleTime:       STALE_MS,
    refetchInterval: REFETCH_MS,
  });

// ── Single org detail ──────────────────────────────────────────────────────

export const usePlatformOrgDetail = (orgId: string | null) =>
  useQuery<OrgDetail>({
    queryKey: ["platform-admin", "org", orgId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/organizations/${orgId}`);
      if (!res.ok) throw new Error("Failed to load org detail");
      return res.json();
    },
    enabled: !!orgId,
    staleTime: STALE_MS,
  });

// ── Platform Users ─────────────────────────────────────────────────────────

export const usePlatformUsers = () =>
  useQuery<{ users: PlatformUser[]; stats: PlatformUserStats }>({
    queryKey: ["platform-admin", "users"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users");
      if (!res.ok) throw new Error("Failed to load users");
      return res.json();
    },
    staleTime: STALE_MS,
    refetchInterval: REFETCH_MS,
  });

export const useToggleUserActive = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      if (!res.ok) throw new Error("Failed to update user");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform-admin", "users"] });
    },
  });
};

// ── Analytics ──────────────────────────────────────────────────────────────

export const usePlatformAnalytics = () =>
  useQuery<AnalyticsData>({
    queryKey: ["platform-admin", "analytics"],
    queryFn: async () => {
      const res = await fetch("/api/admin/analytics");
      if (!res.ok) throw new Error("Failed to load analytics");
      return res.json();
    },
    staleTime: STALE_MS,
    refetchInterval: REFETCH_MS,
  });

// ── Audit Log ──────────────────────────────────────────────────────────────

export const useAuditLog = () =>
  useQuery<AuditLogEntry[]>({
    queryKey: ["platform-admin", "audit-log"],
    queryFn: async () => {
      const res = await fetch("/api/admin/audit-log");
      if (!res.ok) throw new Error("Failed to load audit log");
      return res.json();
    },
    staleTime: STALE_MS,
    refetchInterval: REFETCH_MS,
  });

// ── Feature Flags ──────────────────────────────────────────────────────────

export const useFeatureFlags = () =>
  useQuery<FeatureFlagItem[]>({
    queryKey: ["platform-admin", "feature-flags"],
    queryFn: async () => {
      const res = await fetch("/api/admin/feature-flags");
      if (!res.ok) throw new Error("Failed to load feature flags");
      return res.json();
    },
    staleTime: STALE_MS,
    refetchInterval: REFETCH_MS,
  });

export const useToggleFeatureFlag = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ flagId, value }: { flagId: string; value: boolean }) => {
      const res = await fetch(`/api/admin/feature-flags/${flagId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
      });
      if (!res.ok) throw new Error("Failed to toggle flag");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform-admin", "feature-flags"] });
    },
  });
};

// ── Announcements ──────────────────────────────────────────────────────────

export const useAnnouncements = () =>
  useQuery<AnnouncementItem[]>({
    queryKey: ["platform-admin", "announcements"],
    queryFn: async () => {
      const res = await fetch("/api/admin/announcements");
      if (!res.ok) throw new Error("Failed to load announcements");
      return res.json();
    },
    staleTime: STALE_MS,
    refetchInterval: REFETCH_MS,
  });

export const useToggleAnnouncement = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await fetch(`/api/admin/announcements/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      if (!res.ok) throw new Error("Failed to toggle announcement");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform-admin", "announcements"] });
    },
  });
};
