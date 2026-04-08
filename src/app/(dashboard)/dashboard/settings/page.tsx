"use client";

import { useState } from "react";
import { Tag } from "antd";
import { Role } from "@prisma/client";
import { useCurrentUser } from "@/modules/auth/hooks/useAuth";
import { useUsers } from "@/modules/settings/hooks/useUsers";
import { useStoreRecords } from "@/modules/settings/hooks/useStoreRecords";
import { usePromoCodes } from "@/modules/promo-codes/hooks/usePromoCodes";
import { useAppSettings } from "@/modules/settings/hooks/useAppSettings";
import { ROLE_LABELS, ROLE_COLORS } from "@/shared/constants/roles";
import UserTable from "@/modules/settings/components/UserTable";
import StoreTable from "@/modules/settings/components/StoreTable";
import StoreProfileCard from "@/modules/settings/components/StoreProfileCard";
import BillingConfigForm from "@/modules/settings/components/BillingConfigForm";
import AppearanceSettings from "@/modules/settings/components/AppearanceSettings";
import PromoCodesSettings from "@/modules/promo-codes/components/PromoCodesSettings";
import {
  SettingsWrap,
  PageBanner,
  BannerRow,
  BannerH1,
  BannerSub,
  BannerStats,
  BannerStat,
  BannerStatVal,
  BannerStatLbl,
  TabStrip,
  TabItem,
  TabBadge,
  PageContent,
  Pane,
  TwoCol,
  StatGrid,
  StatMini,
  StatMiniIcon,
  StatMiniVal,
  StatMiniLbl,
  ProfileCard,
  ProfileHero,
  ProfileAvatar,
  ProfileName,
  ProfileEmail,
  ProfileRows,
  ProfileRow,
  ProfileLbl,
  ProfileVal,
  ProfileValMono,
  InfoBox,
  SectionCard,
  SectionHead,
  SectionBody,
  SecurityItem,
  BillingGrid,
  InvoicePreviewBox,
  InvoicePreviewLabel,
  InvoiceNumber,
  InvoiceFormat,
  WarningBox,
} from "./SettingsPage.styled";

type TabKey = "profile" | "users" | "stores" | "billing" | "promos" | "appearance";

// ── Profile pane ──────────────────────────────────────────────────────────────
type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  storeId: string | null;
  orgId: string | null;
  orgName: string | null;
};


// ── Banner stats (only mounted for admins) ───────────────────────────────────

const AdminBannerStats = () => {
  const { users } = useUsers();
  const { stores } = useStoreRecords();
  const { promos } = usePromoCodes();

  return (
    <BannerStats>
      <BannerStat>
        <BannerStatVal>{stores.length}</BannerStatVal>
        <BannerStatLbl>Stores</BannerStatLbl>
      </BannerStat>
      <BannerStat>
        <BannerStatVal>{promos.length}</BannerStatVal>
        <BannerStatLbl>Promos</BannerStatLbl>
      </BannerStat>
      <BannerStat>
        <BannerStatVal>{users.length}</BannerStatVal>
        <BannerStatLbl>Users</BannerStatLbl>
      </BannerStat>
    </BannerStats>
  );
}

const ProfilePane = ({ user }: { user: CurrentUser }) => {
  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <TwoCol>
      <ProfileCard>
        <ProfileHero>
          <ProfileAvatar>{initials}</ProfileAvatar>
          <div>
            <ProfileName>{user.name}</ProfileName>
            <ProfileEmail>{user.email}</ProfileEmail>
          </div>
        </ProfileHero>
        <ProfileRows>
          <ProfileRow>
            <ProfileLbl>Full Name</ProfileLbl>
            <ProfileVal>{user.name}</ProfileVal>
          </ProfileRow>
          <ProfileRow>
            <ProfileLbl>Email</ProfileLbl>
            <ProfileVal>{user.email}</ProfileVal>
          </ProfileRow>
          <ProfileRow>
            <ProfileLbl>Role</ProfileLbl>
            <ProfileVal>
              <Tag color={ROLE_COLORS[user.role]}>{ROLE_LABELS[user.role]}</Tag>
            </ProfileVal>
          </ProfileRow>
          <ProfileRow>
            <ProfileLbl>Organisation</ProfileLbl>
            <ProfileVal>{user.orgName ?? "—"}</ProfileVal>
          </ProfileRow>
          <ProfileRow>
            <ProfileLbl>Store Access</ProfileLbl>
            {user.storeId ? (
              <ProfileValMono>{user.storeId}</ProfileValMono>
            ) : (
              <ProfileVal>All stores</ProfileVal>
            )}
          </ProfileRow>
        </ProfileRows>
        <InfoBox>
          ℹ️ To change your name, email, or password, contact your administrator.
        </InfoBox>
      </ProfileCard>

      <div>
        <SectionCard>
          <SectionHead>
            <div>
              <h3>Account Security</h3>
              <p>Authentication &amp; access info</p>
            </div>
          </SectionHead>
          <SectionBody>
            <SecurityItem>
              <div>
                <strong>Password</strong>
                <small>Contact your admin to reset</small>
              </div>
              <Tag>Protected</Tag>
            </SecurityItem>
            <SecurityItem>
              <div>
                <strong>Two-Factor Auth</strong>
                <small>Not currently enabled</small>
              </div>
              <Tag color="orange">Inactive</Tag>
            </SecurityItem>
            <SecurityItem>
              <div>
                <strong>Session</strong>
                <small>Active now</small>
              </div>
              <Tag color="green">Valid</Tag>
            </SecurityItem>
          </SectionBody>
        </SectionCard>
      </div>
    </TwoCol>
  );
}

// ── Users pane ────────────────────────────────────────────────────────────────

const UsersPane = () => {
  const { users } = useUsers();
  const activeCount = users.filter((u) => u.isActive).length;
  const adminCount = users.filter(
    (u) => u.role === Role.ADMIN || u.role === Role.OWNER
  ).length;

  return (
    <>
      <StatGrid $cols={3}>
        <StatMini>
          <StatMiniIcon>👥</StatMiniIcon>
          <div>
            <StatMiniVal>{users.length}</StatMiniVal>
            <StatMiniLbl>Total Members</StatMiniLbl>
          </div>
        </StatMini>
        <StatMini>
          <StatMiniIcon>✅</StatMiniIcon>
          <div>
            <StatMiniVal>{activeCount}</StatMiniVal>
            <StatMiniLbl>Active</StatMiniLbl>
          </div>
        </StatMini>
        <StatMini>
          <StatMiniIcon>🔑</StatMiniIcon>
          <div>
            <StatMiniVal>{adminCount}</StatMiniVal>
            <StatMiniLbl>Admins</StatMiniLbl>
          </div>
        </StatMini>
      </StatGrid>
      <UserTable />
    </>
  );
}

// ── Stores pane ───────────────────────────────────────────────────────────────

const StoresPane = () => {
  const { stores } = useStoreRecords();
  const activeCount = stores.filter((s) => s.isActive).length;
  const totalUsers = stores.reduce((sum, s) => sum + s.userCount, 0);
  const withAddress = stores.filter((s) => s.address).length;

  return (
    <>
      <StatGrid $cols={4}>
        <StatMini>
          <StatMiniIcon>🏪</StatMiniIcon>
          <div>
            <StatMiniVal>{stores.length}</StatMiniVal>
            <StatMiniLbl>Stores</StatMiniLbl>
          </div>
        </StatMini>
        <StatMini>
          <StatMiniIcon>✅</StatMiniIcon>
          <div>
            <StatMiniVal>{activeCount}</StatMiniVal>
            <StatMiniLbl>Active</StatMiniLbl>
          </div>
        </StatMini>
        <StatMini>
          <StatMiniIcon>👤</StatMiniIcon>
          <div>
            <StatMiniVal>{totalUsers}</StatMiniVal>
            <StatMiniLbl>Users Assigned</StatMiniLbl>
          </div>
        </StatMini>
        <StatMini>
          <StatMiniIcon>📍</StatMiniIcon>
          <div>
            <StatMiniVal>{withAddress}</StatMiniVal>
            <StatMiniLbl>With Address</StatMiniLbl>
          </div>
        </StatMini>
      </StatGrid>
      <StoreProfileCard />
      <div style={{ marginTop: 18 }}>
        <StoreTable />
      </div>
    </>
  );
}

// ── Billing pane ──────────────────────────────────────────────────────────────

const BillingPane = () => {
  const { settings } = useAppSettings();
  const today = new Date();
  const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;
  const prefix = settings?.billingConfig?.invoicePrefix ?? "INV";
  const sampleNumber = `${prefix}-${dateStr}-0001`;

  return (
    <BillingGrid>
      <BillingConfigForm />
      <SectionCard>
        <SectionHead>
          <div>
            <h3>Invoice Preview</h3>
            <p>How your invoice number will look</p>
          </div>
        </SectionHead>
        <SectionBody>
          <InvoicePreviewBox>
            <InvoicePreviewLabel>Sample Invoice Number</InvoicePreviewLabel>
            <InvoiceNumber>{sampleNumber}</InvoiceNumber>
            <InvoiceFormat>prefix · date (YYYYMMDD) · sequence</InvoiceFormat>
          </InvoicePreviewBox>
          <WarningBox>
            ⚠️ Changes apply only to new invoices. Existing invoice numbers are not
            modified.
          </WarningBox>
        </SectionBody>
      </SectionCard>
    </BillingGrid>
  );
}

// ── Tiny helper components for tab badges (avoid double hook at page level) ───

const AdminUserCount = () => {
  const { users } = useUsers();
  return <>{users.length}</>;
}

const AdminPromoCount = () => {
  const { promos } = usePromoCodes();
  return <>{promos.length}</>;
}

// ── Main page ─────────────────────────────────────────────────────────────────

const SettingsPage = () => {
  const { user } = useCurrentUser();
  const isAdmin = user?.role === Role.ADMIN || user?.role === Role.OWNER;
  const [activeTab, setActiveTab] = useState<TabKey>("profile");

  const tabs: Array<{ key: TabKey; label: string; icon: string; adminOnly: boolean }> = [
    { key: "profile",    label: "Profile",     icon: "👤",  adminOnly: false },
    { key: "users",      label: "Users",       icon: "👥",  adminOnly: true  },
    { key: "stores",     label: "Stores",      icon: "🏪",  adminOnly: true  },
    { key: "billing",    label: "Billing",     icon: "💳",  adminOnly: true  },
    { key: "promos",     label: "Promo Codes", icon: "🏷️",  adminOnly: true  },
    { key: "appearance", label: "Appearance",  icon: "🎨",  adminOnly: false },
  ];

  const visibleTabs = tabs.filter((t) => !t.adminOnly || isAdmin);

  if (!user) return null;

  return (
    <SettingsWrap>
      <PageBanner>
        <BannerRow>
          <div>
            <BannerH1>Settings</BannerH1>
            <BannerSub>Configure your account, stores &amp; preferences</BannerSub>
          </div>
          {isAdmin && <AdminBannerStats />}
        </BannerRow>

        <TabStrip>
          {visibleTabs.map((tab) => (
            <TabItem
              key={tab.key}
              $active={activeTab === tab.key}
              onClick={() => setActiveTab(tab.key)}
            >
              <span>{tab.icon}</span>
              {tab.label}
              {tab.key === "users" && isAdmin && (
                <TabBadge>
                  <AdminUserCount />
                </TabBadge>
              )}
              {tab.key === "promos" && isAdmin && (
                <TabBadge>
                  <AdminPromoCount />
                </TabBadge>
              )}
            </TabItem>
          ))}
        </TabStrip>
      </PageBanner>

      <PageContent>
        {activeTab === "profile" && (
          <Pane>
            <ProfilePane user={user} />
          </Pane>
        )}

        {isAdmin && activeTab === "users" && (
          <Pane>
            <UsersPane />
          </Pane>
        )}

        {isAdmin && activeTab === "stores" && (
          <Pane>
            <StoresPane />
          </Pane>
        )}

        {isAdmin && activeTab === "billing" && (
          <Pane>
            <BillingPane />
          </Pane>
        )}

        {isAdmin && activeTab === "promos" && (
          <Pane>
            <PromoCodesSettings />
          </Pane>
        )}

        {activeTab === "appearance" && (
          <Pane>
            <AppearanceSettings />
          </Pane>
        )}
      </PageContent>
    </SettingsWrap>
  );
}

export default SettingsPage;
