import styled from "@emotion/styled";
import { keyframes } from "@emotion/react";
import { Global, css } from "@emotion/react";
import Link from "next/link";

// ─── Keyframes ───────────────────────────────────────────────────────────────

const blink = keyframes`
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.2; }
`;

const floatUp = keyframes`
  0%, 100% { transform: translateY(0); }
  50%       { transform: translateY(-10px); }
`;

const fadeDown = keyframes`
  from { opacity: 0; transform: translateY(-20px); }
  to   { opacity: 1; transform: none; }
`;

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: none; }
`;

// ─── Reveal animation class names (used by IntersectionObserver) ─────────────
// These are injected as global CSS since classList.add() requires known names.

export const REVEAL_CLASS = "lp-reveal";
export const REVEAL_R_CLASS = "lp-reveal-r";
export const VISIBLE_CLASS = "lp-visible";

export const LandingGlobalStyles = () => (
  <Global
    styles={css`
      .${REVEAL_CLASS} {
        opacity: 0;
        transform: translateY(28px);
        transition: opacity 0.65s ease, transform 0.65s ease;
      }
      .${REVEAL_R_CLASS} {
        opacity: 0;
        transform: translateX(28px);
        transition: opacity 0.65s ease, transform 0.65s ease;
      }
      .${VISIBLE_CLASS} {
        opacity: 1 !important;
        transform: none !important;
      }
    `}
  />
);

// ─── Page root ───────────────────────────────────────────────────────────────

export const Page = styled.div`
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  min-height: 100vh;
  color: #fff;
  overflow-x: hidden;
  background:
    linear-gradient(160deg, rgba(0,0,0,0.72) 0%, rgba(0,20,30,0.65) 60%, rgba(0,0,0,0.82) 100%),
    url('/stockiva_banner.png') center / cover no-repeat fixed;
`;

// ─── Scroll progress bar ──────────────────────────────────────────────────────

export const ProgBar = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  height: 2px;
  width: 0;
  background: linear-gradient(90deg, #06b6d4, #a78bfa);
  z-index: 999;
  transition: width 0.1s;
  pointer-events: none;
`;

// ─── Header ───────────────────────────────────────────────────────────────────

export const Header = styled.header`
  position: fixed;
  top: 1.2rem;
  left: 50%;
  transform: translateX(-50%);
  width: calc(100% - 4rem);
  max-width: 1100px;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.85rem 1.5rem;
  background: rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 1rem;
  transition: all 0.3s;

  @media (max-width: 600px) {
    width: calc(100% - 2rem);
  }
`;

export const LogoAnchor = styled.a`
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 1.3rem;
  font-weight: 700;
  letter-spacing: -0.5px;
  color: #fff;
  text-decoration: none;
`;

export const LogoIconBox = styled.div`
  width: 30px;
  height: 30px;
  background: linear-gradient(135deg, #06b6d4, #3b82f6);
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
`;

export const NavBar = styled.nav`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

export const NavRegLink = styled(Link)`
  padding: 0.5rem 1.1rem;
  border-radius: 2rem;
  font-size: 0.85rem;
  font-weight: 500;
  border: 1px solid rgba(255, 255, 255, 0.25);
  color: #e2e8f0;
  text-decoration: none;
  transition: all 0.2s;
  cursor: pointer;
  background: transparent;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.4);
    color: #fff;
  }
`;

export const NavLoginLink = styled(Link)<{ href: string }>`
  padding: 0.5rem 1.3rem;
  border-radius: 2rem;
  font-size: 0.85rem;
  font-weight: 600;
  background: #06b6d4;
  color: #fff;
  text-decoration: none;
  border: 1px solid #06b6d4;
  transition: all 0.2s;
  cursor: pointer;

  &:hover {
    background: #0891b2;
    box-shadow: 0 4px 20px rgba(6, 182, 212, 0.5);
  }
`;

// ─── Hero ──────────────────────────────────────────────────────────────────────

export const HeroSection = styled.section`
  min-height: 100vh;
  padding: 9rem 4vw 4rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  position: relative;
`;

export const HeroEyebrow = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1.75rem;
  background: rgba(6, 182, 212, 0.12);
  border: 1px solid rgba(6, 182, 212, 0.35);
  color: #67e8f9;
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 1px;
  padding: 0.4rem 1rem;
  border-radius: 2rem;
  animation: ${fadeDown} 0.6s ease both;
`;

export const LiveDot = styled.span`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #06b6d4;
  animation: ${blink} 1.4s infinite;
`;

export const HeroTitle = styled.h1`
  font-size: clamp(3rem, 6.5vw, 5.5rem);
  font-weight: 900;
  line-height: 1.05;
  letter-spacing: -2.5px;
  margin-bottom: 1.25rem;
  animation: ${fadeDown} 0.7s 0.05s ease both;

  span {
    color: #06b6d4;
  }
`;

export const HeroSub = styled.p`
  max-width: 540px;
  font-size: 1.05rem;
  color: rgba(255, 255, 255, 0.65);
  line-height: 1.75;
  margin: 0 auto 2.5rem;
  animation: ${fadeDown} 0.8s 0.1s ease both;
`;

export const HeroBtnRow = styled.div`
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  justify-content: center;
  animation: ${fadeDown} 0.9s 0.15s ease both;
`;

export const BtnTeal = styled.a`
  display: inline-block;
  padding: 0.9rem 2.2rem;
  background: #06b6d4;
  color: #fff;
  font-weight: 700;
  font-size: 0.95rem;
  border-radius: 0.75rem;
  text-decoration: none;
  transition: all 0.25s;
  box-shadow: 0 4px 24px rgba(6, 182, 212, 0.45);
  border: none;
  cursor: pointer;

  &:hover {
    background: #0891b2;
    transform: translateY(-2px);
    box-shadow: 0 8px 32px rgba(6, 182, 212, 0.55);
    color: #fff;
  }
`;

export const BtnGlass = styled.a`
  display: inline-block;
  padding: 0.9rem 2.2rem;
  font-size: 0.95rem;
  font-weight: 600;
  border-radius: 0.75rem;
  text-decoration: none;
  color: #e2e8f0;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: all 0.25s;

  &:hover {
    background: rgba(255, 255, 255, 0.14);
    border-color: rgba(255, 255, 255, 0.35);
    color: #fff;
  }
`;

// ─── Floating stat widgets ────────────────────────────────────────────────────

export const StatFloat = styled.div<{ $pos: "left" | "right-top" | "right-bottom" }>`
  position: absolute;
  padding: 1rem 1.3rem;
  border-radius: 1rem;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.15);
  pointer-events: none;
  animation: ${floatUp} 6s ease-in-out infinite;

  ${({ $pos }) =>
    $pos === "left" &&
    `left: 3vw; top: 42%; animation-delay: 0s;`}
  ${({ $pos }) =>
    $pos === "right-top" &&
    `right: 3vw; top: 28%; animation-delay: -2s;`}
  ${({ $pos }) =>
    $pos === "right-bottom" &&
    `right: 3vw; top: 52%; animation-delay: -4s;`}

  @media (max-width: 900px) {
    display: none;
  }
`;

export const StatValue = styled.div`
  font-size: 1.8rem;
  font-weight: 800;
  line-height: 1;
  margin-bottom: 0.25rem;
`;

export const StatLabel = styled.div`
  font-size: 0.72rem;
  color: rgba(255, 255, 255, 0.6);
  font-weight: 500;
`;

export const MiniBarsRow = styled.div`
  display: flex;
  gap: 2px;
  align-items: flex-end;
  margin-top: 0.4rem;
`;

export const MiniBar = styled.div<{ $h: number }>`
  width: 4px;
  height: ${({ $h }) => $h}px;
  border-radius: 2px;
  background: #06b6d4;
  opacity: 0.7;
`;

// ─── Feature pill cards under hero ───────────────────────────────────────────

export const FeaturesGrid = styled.div`
  max-width: 900px;
  margin: 3rem auto 0;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.25rem;
  animation: ${fadeUp} 1s 0.4s ease both;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

export const FeatCard = styled.div`
  padding: 1.75rem 1.5rem;
  border-radius: 1.25rem;
  text-align: center;
  background: rgba(255, 255, 255, 0.07);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  transition: all 0.3s;
  cursor: default;

  &:hover {
    background: rgba(255, 255, 255, 0.12);
    border-color: rgba(6, 182, 212, 0.45);
    transform: translateY(-5px);
    box-shadow: 0 12px 32px rgba(6, 182, 212, 0.12);
  }

  h3 {
    font-size: 0.98rem;
    font-weight: 700;
    margin-bottom: 0.4rem;
  }

  p {
    font-size: 0.82rem;
    color: rgba(255, 255, 255, 0.55);
    line-height: 1.6;
    margin: 0;
  }
`;

export const FeatIconBox = styled.div`
  width: 52px;
  height: 52px;
  border-radius: 1rem;
  margin: 0 auto 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  background: rgba(6, 182, 212, 0.12);
  border: 1px solid rgba(6, 182, 212, 0.25);
`;

// ─── Generic section wrapper ──────────────────────────────────────────────────

export const Section = styled.section`
  padding: 6rem 4vw;
  position: relative;
`;

export const Inner = styled.div`
  max-width: 1100px;
  margin: 0 auto;
`;

export const SectionTag = styled.div`
  display: inline-block;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: #06b6d4;
  margin-bottom: 0.75rem;
`;

export const SectionTitle = styled.h2`
  font-size: clamp(1.8rem, 3vw, 2.6rem);
  font-weight: 800;
  letter-spacing: -1px;
  margin-bottom: 0.75rem;
`;

export const SectionDesc = styled.p`
  color: rgba(255, 255, 255, 0.55);
  font-size: 1rem;
  line-height: 1.75;
  max-width: 480px;
`;

// ─── About section ────────────────────────────────────────────────────────────

export const AboutGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4rem;
  align-items: center;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

export const AboutCardsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-top: 2rem;

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

export const AboutCard = styled.div`
  padding: 1.5rem;
  border-radius: 1rem;
  background: rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s;

  &:hover {
    border-color: rgba(6, 182, 212, 0.4);
    transform: translateY(-3px);
  }
`;

export const AcIcon = styled.div`
  font-size: 1.5rem;
  margin-bottom: 0.6rem;
`;

export const AcTitle = styled.div`
  font-size: 0.9rem;
  font-weight: 700;
  margin-bottom: 0.35rem;
`;

export const AcDesc = styled.div`
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.5);
  line-height: 1.6;
`;

export const BigStatCard = styled.div`
  padding: 2rem;
  border-radius: 1.25rem;
  text-align: center;
  grid-column: span 2;
  background: linear-gradient(135deg, rgba(6,182,212,0.1), rgba(59,130,246,0.08));
  border: 1px solid rgba(6, 182, 212, 0.25);

  @media (max-width: 600px) {
    grid-column: span 1;
  }
`;

export const BigStatNum = styled.div`
  font-size: 3.5rem;
  font-weight: 900;
  color: #06b6d4;
  line-height: 1;
`;

export const BigStatLbl = styled.div`
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 0.4rem;
`;

// ─── About visual panel (right side mock dashboard) ───────────────────────────

export const AboutVisualPanel = styled.div`
  padding: 2rem;
  border-radius: 1.5rem;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

export const ScreenWidget = styled.div`
  background: rgba(0, 0, 0, 0.5);
  border-radius: 1rem;
  padding: 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
`;

export const ScreenWidgetTitle = styled.div`
  font-size: 0.72rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.4);
  letter-spacing: 1.5px;
  text-transform: uppercase;
  margin-bottom: 1rem;
`;

export const MetricsRow = styled.div`
  display: flex;
  gap: 0.8rem;
  margin-bottom: 0.8rem;
`;

export const MetricTile = styled.div`
  flex: 1;
  padding: 0.9rem;
  border-radius: 0.75rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
`;

export const MtVal = styled.div`
  font-size: 1.3rem;
  font-weight: 800;
`;

export const MtLbl = styled.div`
  font-size: 0.68rem;
  color: rgba(255, 255, 255, 0.4);
  margin-top: 0.15rem;
`;

export const MtChg = styled.div<{ $up?: boolean }>`
  font-size: 0.7rem;
  font-weight: 600;
  margin-top: 0.2rem;
  color: ${({ $up }) => ($up ? "#10b981" : "#ef4444")};
`;

export const StockRowsList = styled.div`
  margin-top: 0.8rem;
`;

export const StockRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.55rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  font-size: 0.8rem;

  &:last-child {
    border-bottom: none;
  }
`;

export const StockBadge = styled.span<{ $status: "low" | "ok" | "critical" }>`
  font-size: 0.68rem;
  font-weight: 700;
  padding: 0.2rem 0.55rem;
  border-radius: 0.4rem;

  ${({ $status }) =>
    $status === "low" &&
    `background: rgba(251,191,36,0.15); color: #fbbf24;`}
  ${({ $status }) =>
    $status === "ok" &&
    `background: rgba(16,185,129,0.15); color: #10b981;`}
  ${({ $status }) =>
    $status === "critical" &&
    `background: rgba(239,68,68,0.15); color: #ef4444;`}
`;

// ─── Pricing section ──────────────────────────────────────────────────────────

export const PricingSection = styled.section`
  padding: 6rem 4vw;
  background: rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(4px);
`;

export const PricingGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
  margin-top: 3rem;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
    max-width: 380px;
    margin: 3rem auto 0;
  }
`;

export const PricingCard = styled.div<{ $featured?: boolean }>`
  padding: 2rem;
  border-radius: 1.5rem;
  display: flex;
  flex-direction: column;
  background: ${({ $featured }) =>
    $featured ? "rgba(6,182,212,0.1)" : "rgba(255,255,255,0.07)"};
  backdrop-filter: blur(20px);
  border: 1px solid
    ${({ $featured }) =>
      $featured ? "rgba(6,182,212,0.45)" : "rgba(255,255,255,0.1)"};
  box-shadow: ${({ $featured }) =>
    $featured ? "0 0 40px rgba(6,182,212,0.1)" : "none"};
  transition: all 0.3s;
  position: ${({ $featured }) => ($featured ? "relative" : "static")};

  ${({ $featured }) =>
    $featured &&
    `
    &::before {
      content: 'POPULAR';
      position: absolute;
      top: -12px;
      left: 50%;
      transform: translateX(-50%);
      background: #06b6d4;
      color: #fff;
      font-size: 0.65rem;
      font-weight: 800;
      letter-spacing: 1.5px;
      padding: 0.25rem 0.8rem;
      border-radius: 2rem;
    }
  `}

  &:hover {
    transform: translateY(-6px);
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.3);
  }
`;

export const PcPlanName = styled.div<{ $teal?: boolean }>`
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: ${({ $teal }) => ($teal ? "#06b6d4" : "rgba(255,255,255,0.45)")};
  margin-bottom: 0.75rem;
`;

export const PcPrice = styled.div`
  font-size: 3rem;
  font-weight: 900;
  line-height: 1;
  letter-spacing: -2px;
  margin-bottom: 0.25rem;
`;

export const PcPeriod = styled.div`
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.45);
  margin-bottom: 1rem;
`;

export const PcDescText = styled.div`
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.5);
  line-height: 1.6;
  margin-bottom: 1.5rem;
  flex: 1;
`;

export const PcFeatsList = styled.ul`
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  margin-bottom: 2rem;
  padding: 0;
`;

export const PcFeatsItem = styled.li`
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.7);
  display: flex;
  gap: 0.6rem;
  align-items: flex-start;
`;

export const CheckMark = styled.span`
  color: #06b6d4;
  font-weight: 700;
  flex-shrink: 0;
`;

export const PcButton = styled("a", {
  shouldForwardProp: (prop) => prop !== "$primary",
})<{ $primary?: boolean }>`
  display: block;
  text-align: center;
  padding: 0.8rem;
  border-radius: 0.75rem;
  font-weight: 700;
  font-size: 0.9rem;
  text-decoration: none;
  transition: all 0.2s;
  cursor: pointer;

  ${({ $primary }) =>
    $primary
      ? `
    background: #06b6d4;
    border: 1px solid #06b6d4;
    color: #fff;
    box-shadow: 0 4px 20px rgba(6,182,212,0.35);
    &:hover { background: #0891b2; color: #fff; }
  `
      : `
    border: 1px solid rgba(255,255,255,0.2);
    color: #e2e8f0;
    &:hover { border-color: #06b6d4; color: #06b6d4; }
  `}
`;

export const PcButtonLink = styled(Link, {
  shouldForwardProp: (prop) => prop !== "$primary",
})<{ $primary?: boolean }>`
  display: block;
  text-align: center;
  padding: 0.8rem;
  border-radius: 0.75rem;
  font-weight: 700;
  font-size: 0.9rem;
  text-decoration: none;
  transition: all 0.2s;
  cursor: pointer;

  ${({ $primary }) =>
    $primary
      ? `
    background: #06b6d4;
    border: 1px solid #06b6d4;
    color: #fff;
    box-shadow: 0 4px 20px rgba(6,182,212,0.35);
    &:hover { background: #0891b2; color: #fff; }
  `
      : `
    border: 1px solid rgba(255,255,255,0.2);
    color: #e2e8f0;
    &:hover { border-color: #06b6d4; color: #06b6d4; }
  `}
`;

// ─── Contact section ──────────────────────────────────────────────────────────

export const ContactGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1.3fr;
  gap: 4rem;
  align-items: start;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

export const ContactLeft = styled.div`
  h2 {
    font-size: 2.2rem;
    font-weight: 800;
    letter-spacing: -1px;
    margin-bottom: 1rem;
  }
  p {
    color: rgba(255, 255, 255, 0.55);
    line-height: 1.75;
    margin-bottom: 2rem;
    font-size: 0.95rem;
  }
`;

export const ContactDetail = styled.div`
  display: flex;
  gap: 1rem;
  align-items: flex-start;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.75rem;
  margin-bottom: 0.75rem;
`;

export const CIco = styled.div`
  font-size: 1.2rem;
  flex-shrink: 0;
`;

export const CLabel = styled.div`
  font-size: 0.72rem;
  color: rgba(255, 255, 255, 0.4);
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

export const CVal = styled.div`
  font-size: 0.88rem;
  font-weight: 600;
  margin-top: 0.15rem;
`;

export const ContactFormCard = styled.div`
  padding: 2.5rem;
  border-radius: 1.5rem;
  background: rgba(255, 255, 255, 0.07);
  backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.13);
`;

export const FormRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

export const FormGroup = styled.div`
  margin-bottom: 1rem;
`;

export const FormLabel = styled.label`
  display: block;
  font-size: 0.78rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.5);
  letter-spacing: 0.5px;
  text-transform: uppercase;
  margin-bottom: 0.45rem;
`;

export const FormInput = styled.input`
  width: 100%;
  padding: 0.8rem 1rem;
  border-radius: 0.6rem;
  outline: none;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #fff;
  font-family: inherit;
  font-size: 0.9rem;
  transition: border-color 0.2s, box-shadow 0.2s;
  box-sizing: border-box;

  &::placeholder {
    color: rgba(255, 255, 255, 0.3);
  }
  &:focus {
    border-color: #06b6d4;
    box-shadow: 0 0 0 3px rgba(6, 182, 212, 0.15);
  }
`;

export const FormTextarea = styled.textarea`
  width: 100%;
  padding: 0.8rem 1rem;
  border-radius: 0.6rem;
  outline: none;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #fff;
  font-family: inherit;
  font-size: 0.9rem;
  transition: border-color 0.2s, box-shadow 0.2s;
  resize: vertical;
  min-height: 110px;
  box-sizing: border-box;

  &::placeholder {
    color: rgba(255, 255, 255, 0.3);
  }
  &:focus {
    border-color: #06b6d4;
    box-shadow: 0 0 0 3px rgba(6, 182, 212, 0.15);
  }
`;

export const SendBtn = styled.button`
  width: 100%;
  padding: 0.95rem;
  background: #06b6d4;
  color: #fff;
  border: none;
  cursor: pointer;
  border-radius: 0.75rem;
  font-weight: 700;
  font-size: 1rem;
  font-family: inherit;
  margin-top: 0.5rem;
  transition: all 0.25s;
  box-shadow: 0 4px 20px rgba(6, 182, 212, 0.35);

  &:hover {
    background: #0891b2;
    transform: translateY(-2px);
  }
`;

// ─── Footer ───────────────────────────────────────────────────────────────────

export const FooterSection = styled.footer`
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(20px);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  padding: 3rem 6vw 1.5rem;
`;

export const FooterInner = styled.div`
  max-width: 1100px;
  margin: 0 auto;
`;

export const FooterTopGrid = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: 3rem;
  margin-bottom: 2.5rem;

  @media (max-width: 900px) {
    grid-template-columns: 1fr 1fr;
  }
  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

export const FooterLogo = styled.div`
  font-size: 1.4rem;
  font-weight: 800;
  color: #fff;
  margin-bottom: 0.6rem;

  span {
    color: #06b6d4;
  }
`;

export const FooterDesc = styled.div`
  font-size: 0.82rem;
  color: rgba(255, 255, 255, 0.4);
  line-height: 1.7;
  max-width: 200px;
`;

export const FooterColHeader = styled.div`
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.35);
  margin-bottom: 0.9rem;
`;

export const FooterLinks = styled.ul`
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0;

  a {
    color: rgba(255, 255, 255, 0.45);
    text-decoration: none;
    font-size: 0.85rem;
    transition: color 0.2s;

    &:hover {
      color: #06b6d4;
    }
  }
`;

export const FooterBottomRow = styled.div`
  border-top: 1px solid rgba(255, 255, 255, 0.07);
  padding-top: 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
`;

export const FooterCopy = styled.div`
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.3);
`;

export const FooterSocials = styled.div`
  display: flex;
  gap: 0.75rem;
`;

export const SocialLink = styled.a`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  text-decoration: none;
  color: rgba(255, 255, 255, 0.5);
  transition: all 0.2s;

  &:hover {
    border-color: #06b6d4;
    color: #06b6d4;
  }
`;

export const FooterLegal = styled.div`
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;

  a {
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.3);
    text-decoration: none;
    transition: color 0.2s;

    &:hover {
      color: rgba(255, 255, 255, 0.7);
    }
  }
`;
