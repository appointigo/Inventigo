"use client";

import React from "react";
import { Spin } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useAnnouncements, useToggleAnnouncement } from "../../hooks/usePlatformAdmin";
import {
  PageTop, PageTitle, PageSubtitle, BtnPrimary,
  AnnList, AnnCard, AnnStripe, AnnBody, AnnTop,
  SeverityBadge, Badge, AnnTitle, AnnMsg, AnnFooter,
  Divider, AnnActions, ActionBtn,
  EmptyState, EmptyIcon, EmptyTitle, EmptyDesc,
} from "./PlatformAdminAnnouncements.styled";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function PlatformAdminAnnouncements() {
  const { data: announcements, isLoading } = useAnnouncements();
  const toggleMut = useToggleAnnouncement();

  if (isLoading) {
    return <Spin size="large" style={{ display: "block", margin: "80px auto" }} />;
  }

  return (
    <>
      <PageTop>
        <div>
          <PageTitle>Announcements</PageTitle>
          <PageSubtitle>
            Platform-wide notices displayed to logged-in users. Supports scheduling and plan targeting.
          </PageSubtitle>
        </div>
        <BtnPrimary><PlusOutlined /> New Announcement</BtnPrimary>
      </PageTop>

      {(!announcements || announcements.length === 0) ? (
        <EmptyState>
          <EmptyIcon>📢</EmptyIcon>
          <EmptyTitle>No announcements yet</EmptyTitle>
          <EmptyDesc>Create your first platform-wide announcement.</EmptyDesc>
        </EmptyState>
      ) : (
        <AnnList>
          {announcements.map((ann) => {
            const isEnded = !ann.isActive;
            const untilStr = ann.activeUntil
              ? formatDate(ann.activeUntil)
              : "Permanent";

            return (
              <AnnCard key={ann.id} ended={isEnded}>
                <AnnStripe severity={ann.severity} />
                <AnnBody>
                  <AnnTop>
                    <SeverityBadge severity={ann.severity}>{ann.severity}</SeverityBadge>
                    <Badge variant="gray">
                      {ann.targetPlan ? `${ann.targetPlan} Plan` : "All Plans"}
                    </Badge>
                    <Badge variant={ann.isActive ? "green" : "gray"}>
                      {ann.isActive ? "Active" : "Ended"}
                    </Badge>
                  </AnnTop>

                  <AnnTitle>{ann.title}</AnnTitle>
                  <AnnMsg dangerouslySetInnerHTML={{ __html: ann.body }} />

                  <AnnFooter>
                    <span>
                      Created by <strong>{ann.creatorName ?? "Unknown"}</strong>
                    </span>
                    <Divider>·</Divider>
                    <span>
                      {ann.isActive
                        ? `Active: ${formatDate(ann.activeFrom)} – ${untilStr}`
                        : `Ended: ${formatDate(ann.createdAt)}`}
                    </span>
                    <AnnActions>
                      {ann.isActive ? (
                        <>
                          <ActionBtn>✎ Edit</ActionBtn>
                          <ActionBtn
                            danger
                            onClick={() =>
                              toggleMut.mutate({ id: ann.id, isActive: false })
                            }
                          >
                            ✕ End
                          </ActionBtn>
                        </>
                      ) : (
                        <ActionBtn
                          onClick={() =>
                            toggleMut.mutate({ id: ann.id, isActive: true })
                          }
                        >
                          ♻ Reactivate
                        </ActionBtn>
                      )}
                    </AnnActions>
                  </AnnFooter>
                </AnnBody>
              </AnnCard>
            );
          })}
        </AnnList>
      )}
    </>
  );
}
