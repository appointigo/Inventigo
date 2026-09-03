"use client";

import type { ReactNode } from "react";
import { Tabs, Typography } from "antd";
import { useRouter } from "next/navigation";
import { WHATSAPP_NAV_ITEMS } from "../ui";
import { HeaderRow, PageContainer, PageIntro, Surface } from "./WhatsAppSetupPage.styled";

const { Title, Paragraph } = Typography;

export default function WhatsAppShell({ status, children, activeKey = "setup" }: { status: ReactNode; children: ReactNode; activeKey?: string }) {
  const router = useRouter();
  return (
    <PageContainer>
      <HeaderRow>
        <PageIntro>
          <Title level={2}>WhatsApp</Title>
          <Paragraph type="secondary">Connect Meta and manage customer communication for your Stores.</Paragraph>
        </PageIntro>
        {status}
      </HeaderRow>
      <Surface $compact>
        <Tabs
          activeKey={activeKey}
          onChange={(key) => { const item = WHATSAPP_NAV_ITEMS.find(entry => entry.key === key); if (item?.enabled) router.push(item.href); }}
          items={WHATSAPP_NAV_ITEMS.map((item) => ({
            key: item.key,
            label: item.label,
            disabled: !item.enabled,
          }))}
        />
      </Surface>
      {children}
    </PageContainer>
  );
}
