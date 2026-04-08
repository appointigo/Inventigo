import styled from "@emotion/styled";

export const Wrap = styled.div`
  max-width: 1040px;
`;

export const StatsRow = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
  margin-bottom: 24px;
`;

export const StatCard = styled.div`
  background: ${p => p.theme.bg.surface};
  border: 1px solid ${p => p.theme.border.primary};
  border-radius: 12px;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 14px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  transition: transform 0.18s, box-shadow 0.18s;
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  }
`;

export const StatIcon = styled.div<{ $color: "blue" | "green" | "amber" }>`
  width: 42px;
  height: 42px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
  background: ${({ $color }) =>
    $color === "blue" ? "#eff4ff" : $color === "green" ? "#f0fdf4" : "#fffbeb"};
`;

export const StatVal = styled.div`
  font-size: 22px;
  font-weight: 800;
  color: ${p => p.theme.text.primary};
`;

export const StatLbl = styled.div`
  font-size: 12px;
  color: ${p => p.theme.text.faint};
  margin-top: 2px;
`;

export const TopBar = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
  h2 {
    font-size: 16px;
    font-weight: 700;
    color: ${p => p.theme.text.primary};
    margin: 0;
    flex: 1;
  }
`;

export const PromoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
`;

export const PromoCard = styled.div<{ $inactive?: boolean }>`
  background: ${p => p.theme.bg.surface};
  border: 1.5px solid ${p => p.theme.border.primary};
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  transition: transform 0.2s, box-shadow 0.2s;
  opacity: ${({ $inactive }) => ($inactive ? 0.6 : 1)};
  display: flex;
  flex-direction: column;
  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  }
`;

export const CardHeader = styled.div<{ $gradient?: string }>`
  background: ${({ $gradient }) => $gradient ?? "linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)"};
  padding: 18px 20px 14px;
  position: relative;
  overflow: hidden;
  &::before {
    content: "";
    position: absolute;
    right: -20px;
    top: -20px;
    width: 80px;
    height: 80px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 50%;
  }
  &::after {
    content: "";
    position: absolute;
    right: 10px;
    bottom: -30px;
    width: 100px;
    height: 100px;
    background: rgba(255, 255, 255, 0.06);
    border-radius: 50%;
  }
`;

export const PromoBadge = styled.div`
  display: inline-flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.22);
  border: 1px solid rgba(255, 255, 255, 0.35);
  border-radius: 6px;
  padding: 4px 10px;
  font-size: 13px;
  font-weight: 800;
  color: #fff;
  letter-spacing: 1px;
  margin-bottom: 8px;
  position: relative;
  z-index: 1;
`;

export const PromoPct = styled.div`
  font-size: 36px;
  font-weight: 900;
  color: #fff;
  line-height: 1;
  letter-spacing: -1px;
  position: relative;
  z-index: 1;
  span {
    font-size: 18px;
    font-weight: 600;
    opacity: 0.8;
  }
`;

export const CardBody = styled.div`
  padding: 14px 20px 16px;
  flex: 1;
`;

export const PromoDesc = styled.div`
  font-size: 12.5px;
  color: ${p => p.theme.text.muted};
  line-height: 1.5;
  margin-bottom: 12px;
  min-height: 38px;
`;

export const MetaRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`;

export const Pill = styled.span<{ $variant: "active" | "inactive" | "used" | "exp" }>`
  font-size: 11px;
  font-weight: 600;
  border-radius: 5px;
  padding: 3px 8px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  cursor: ${({ $variant }) => ($variant === "used" ? "pointer" : "default")};
  ${({ $variant }) => {
    if ($variant === "active")
      return "background:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0;animation:pulse 2.5s ease-in-out infinite;";
    if ($variant === "inactive")
      return "background:#fff1f2;color:#dc2626;border:1px solid #fecaca;";
    if ($variant === "used")
      return "background:#f3f4f6;color:#6b7280;border:1px solid #e5e7eb;&:hover{background:#eff4ff;color:#2563eb;border-color:#bfdbfe;}";
    if ($variant === "exp")
      return "background:#fffbeb;color:#d97706;border:1px solid #fde68a;";
    return "";
  }}
  @keyframes pulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.4); }
    50% { box-shadow: 0 0 0 5px rgba(22, 163, 74, 0); }
  }
`;

export const CardActions = styled.div`
  display: flex;
  gap: 6px;
  padding: 10px 20px 14px;
  border-top: 1px solid ${p => p.theme.border.subtle};
  align-items: center;
`;

export const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: #9ca3af;
  .icon {
    font-size: 56px;
    opacity: 0.18;
    margin-bottom: 12px;
  }
  p {
    font-size: 14px;
  }
`;

// ─── Gradient palette (rotates for variety) ──────────────────────────────────

export const GRADIENTS = [
  "linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)",
  "linear-gradient(135deg, #059669 0%, #0d9488 100%)",
  "linear-gradient(135deg, #dc2626 0%, #e11d48 100%)",
  "linear-gradient(135deg, #d97706 0%, #b45309 100%)",
  "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)",
];

export const INACTIVE_GRADIENT = "linear-gradient(135deg, #6b7280 0%, #9ca3af 100%)";
