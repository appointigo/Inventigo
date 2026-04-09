import styled from "@emotion/styled";
import { SIDEBAR_TOKENS as S } from "../../constants";

// ── Root shell ─────────────────────────────────────────────────────────────

export const AdminShell = styled.div`
  display: flex;
  height: 100vh;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
`;

// ── Sidebar ────────────────────────────────────────────────────────────────

export const Sidebar = styled.aside`
  width: 220px;
  min-width: 220px;
  background: ${S.bg};
  display: flex;
  flex-direction: column;
  border-right: 1px solid ${S.border};
  overflow-y: auto;
  overflow-x: hidden;
`;

export const SidebarBrand = styled.div`
  padding: 18px 20px 15px;
  border-bottom: 1px solid ${S.border};
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
`;

export const BrandIcon = styled.div`
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #1677ff, #38bdf8);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 15px;
  box-shadow: 0 0 10px #1677ff44;
  flex-shrink: 0;
`;

export const BrandTextWrap = styled.div``;

export const BrandName = styled.div`
  color: #f1f5f9;
  font-size: 14.5px;
  font-weight: 700;
  line-height: 1.2;
`;

export const BrandBadge = styled.div`
  display: inline-block;
  background: #1677ff22;
  color: #60a5fa;
  font-size: 8.5px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 20px;
  border: 1px solid #1677ff44;
  letter-spacing: 0.5px;
  margin-top: 2px;
`;

export const NavSectionLabel = styled.div`
  font-size: 9.5px;
  font-weight: 700;
  color: ${S.textLabel};
  text-transform: uppercase;
  letter-spacing: 1.2px;
  padding: 14px 20px 5px;
`;

export const NavItem = styled.a<{ active?: boolean; disabled?: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 16px 9px 20px;
  color: ${({ active }) => (active ? S.activeText : S.textMuted)};
  font-size: 13px;
  font-weight: 500;
  cursor: ${({ disabled }) => (disabled ? "default" : "pointer")};
  transition: background 0.12s, color 0.12s;
  border-left: 3px solid ${({ active }) => (active ? S.activeBorder : "transparent")};
  background: ${({ active }) => (active ? S.activeBg : "transparent")};
  text-decoration: none;
  opacity: ${({ disabled }) => (disabled ? 0.45 : 1)};

  &:hover {
    background: ${({ active, disabled }) => (disabled ? "transparent" : active ? S.activeBg : S.hover)};
    color: ${({ active, disabled }) => (disabled ? S.textMuted : active ? S.activeText : "#e2e8f0")};
  }
`;

export const NavIcon = styled.span`
  font-size: 14px;
  width: 16px;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

export const NavBadge = styled.span`
  margin-left: auto;
  background: #ef4444;
  color: #fff;
  font-size: 9.5px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 20px;
  min-width: 18px;
  text-align: center;
`;

export const SidebarFooter = styled.div`
  margin-top: auto;
  border-top: 1px solid ${S.border};
  flex-shrink: 0;
`;

export const FooterProfile = styled.div`
  padding: 13px 18px;
  display: flex;
  align-items: center;
  gap: 10px;
`;

export const FooterAvatar = styled.div`
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: linear-gradient(135deg, #1677ff, #7c3aed);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
`;

export const FooterTextWrap = styled.div`
  min-width: 0;
  flex: 1;
`;

export const FooterName = styled.div`
  color: #e2e8f0;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const FooterRole = styled.div`
  color: ${S.textLabel};
  font-size: 10.5px;
`;

export const FooterActions = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 18px 12px;
`;

export const FooterIconBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 6px;
  border: 1px solid ${S.border};
  background: transparent;
  color: ${S.textMuted};
  font-size: 14px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;

  &:hover {
    background: ${S.hover};
    color: #e2e8f0;
    border-color: #475569;
  }
`;

export const SignOutBtn = styled.button`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 6px 0;
  border-radius: 6px;
  border: 1px solid ${S.border};
  background: transparent;
  color: ${S.textMuted};
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;

  &:hover {
    background: #ef444422;
    color: #f87171;
    border-color: #ef444466;
  }
`;

// ── Main area ──────────────────────────────────────────────────────────────

export const MainArea = styled.main`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
`;

export const TopBar = styled.div`
  height: 56px;
  background: ${({ theme }) => theme.bg.surface};
  border-bottom: 1px solid ${({ theme }) => theme.border.primary};
  padding: 0 28px;
  display: flex;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
`;

export const Breadcrumb = styled.div`
  font-size: 13px;
  color: ${({ theme }) => theme.text.faint};
`;

export const BreadcrumbCurrent = styled.span`
  color: ${({ theme }) => theme.text.primary};
  font-weight: 600;
`;

export const TopBarSpacer = styled.div`
  flex: 1;
`;

export const TopBarChip = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  background: ${({ theme }) => theme.bg.layout};
  border: 1px solid ${({ theme }) => theme.border.primary};
  border-radius: 20px;
  padding: 5px 12px;
  font-size: 12px;
  color: ${({ theme }) => theme.text.muted};
  cursor: pointer;
  transition: border-color 0.15s;
  white-space: nowrap;

  &:hover {
    border-color: #1677ff;
  }
`;

export const LiveDot = styled.div`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #16a34a;
  animation: livePulse 2s infinite;

  @keyframes livePulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.27); }
    50%      { box-shadow: 0 0 0 5px rgba(22, 163, 74, 0); }
  }
`;

export const ContentArea = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 28px 28px 60px;
  background: ${({ theme }) => theme.bg.layout};
`;
