"use client";

import styled from "@emotion/styled";
import { Segmented } from "antd";

export type DashboardTab = "overview" | "stock" | "sales";

interface DashboardTabsProps {
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
}

const TAB_ITEMS: Array<{ key: DashboardTab; label: string; mobileLabel: string }> = [
  { key: "overview", label: "Overview", mobileLabel: "Overview" },
  { key: "stock", label: "Stock", mobileLabel: "Stock" },
  { key: "sales", label: "Sales & Revenue", mobileLabel: "Sales" },
];

const TabsWrapper = styled.div`
  border-bottom: 0.5px solid #e5e7eb;
  background: #f3f4f6;
  margin-bottom: 16px;
  border-radius: 10px;
  padding: 6px 8px;
`;

const TabsScroll = styled.div`
  overflow-x: auto;
`;

const StyledSegmented = styled(Segmented)`
  background: transparent;
  background: #f3f4f6;

  .ant-segmented-thumb,
  .ant-segmented-item-selected {
    background: #000;
    box-shadow: none;
  }

  .ant-segmented-item-selected,
  .ant-segmented-item-selected .ant-segmented-item-label {
    color: #fff;
  }

  .ant-segmented-item {
    color: #4b5563;
    padding: 8px 14px;
    font-size: 12px;
    font-weight: 500;
  }

  .ant-segmented-item:hover:not(.ant-segmented-item-selected) {
    color: #111827;
  }
`;

const ResponsiveLabel = styled.span`
  display: inline;

  &.mobile {
    display: none;
  }

  @media (max-width: 767px) {
    &.desktop {
      display: none;
    }

    &.mobile {
      display: inline;
    }
  }
`;

const DashboardTabs = ({ activeTab, onTabChange }: DashboardTabsProps) => {
  const options = TAB_ITEMS.map((tab) => ({
    label: (
      <>
        <ResponsiveLabel className="desktop">{tab.label}</ResponsiveLabel>
        <ResponsiveLabel className="mobile">{tab.mobileLabel}</ResponsiveLabel>
      </>
    ),
    value: tab.key,
  }));

  return (
    <TabsWrapper >
      <TabsScroll>
        <StyledSegmented
          options={options}
          value={activeTab}
          onChange={(value) => onTabChange(value as DashboardTab)}
          size="small"
          shape="round"
        />
      </TabsScroll>
    </TabsWrapper>
  );
}

export default DashboardTabs;