"use client";

import React from "react";
import styled from "@emotion/styled";
import { useThemeMode, type ThemeMode } from "@/providers/ThemeProvider";

// ── Styled ────────────────────────────────────────────────────────────────────

const Wrap = styled.div`
  max-width: 700px;
`;

const CardBox = styled.div`
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
`;

const CardHead = styled.div`
  padding: 18px 24px;
  border-bottom: 1px solid #f1f5f9;

  h3 {
    font-size: 14.5px;
    font-weight: 700;
    color: #0f172a;
    margin: 0;
  }

  p {
    font-size: 12px;
    color: #64748b;
    margin: 2px 0 0;
  }
`;

const CardBody = styled.div`
  padding: 24px;
`;

const ThemeGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
`;

const ThemeCard = styled.div<{ $selected: boolean }>`
  border: 2px solid ${(p) => (p.$selected ? "#2563eb" : "#e2e8f0")};
  background: ${(p) => (p.$selected ? "#f0f7ff" : "#fff")};
  box-shadow: ${(p) => (p.$selected ? "0 0 0 4px rgba(37,99,235,0.1)" : "none")};
  border-radius: 14px;
  padding: 18px;
  cursor: pointer;
  transition: all 0.22s;
  position: relative;

  &:hover {
    ${(p) =>
      !p.$selected &&
      `
      border-color: #93c5fd;
      transform: translateY(-2px);
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.07);
    `}
  }
`;

const Checkmark = styled.div<{ $visible: boolean }>`
  position: absolute;
  top: 12px;
  right: 12px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 11px;
  opacity: ${(p) => (p.$visible ? 1 : 0)};
  transition: opacity 0.2s;
  z-index: 1;
`;

const ThemePreview = styled.div`
  width: 100%;
  height: 64px;
  border-radius: 9px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  margin-bottom: 12px;
  display: flex;
  flex-direction: column;
`;

const PreviewBar = styled.div`
  height: 15px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  padding: 0 6px;
  gap: 3px;
`;

const PreviewDot = styled.div`
  width: 5px;
  height: 5px;
  border-radius: 50%;
`;

const PreviewBody = styled.div`
  flex: 1;
  display: flex;
  gap: 3px;
  padding: 3px;
`;

const PreviewSide = styled.div`
  width: 20px;
  border-radius: 3px;
  flex-shrink: 0;
`;

const PreviewMain = styled.div`
  flex: 1;
  border-radius: 3px;
`;

const ThemeName = styled.h4<{ $selected: boolean }>`
  font-size: 13px;
  font-weight: 700;
  color: ${(p) => (p.$selected ? "#2563eb" : "#0f172a")};
  margin: 0 0 2px;
`;

const ThemeDesc = styled.p`
  font-size: 11.5px;
  color: #64748b;
  margin: 0;
`;

// ── Theme definitions ─────────────────────────────────────────────────────────

const THEMES: { value: ThemeMode; label: string; desc: string; preview: React.ReactNode }[] = [
  {
    value: "light",
    label: "☀️ Light",
    desc: "Clean and minimal",
    preview: (
      <ThemePreview>
        <PreviewBar style={{ background: "#e2e8f0" }}>
          <PreviewDot style={{ background: "#94a3b8" }} />
          <PreviewDot style={{ background: "#94a3b8" }} />
        </PreviewBar>
        <PreviewBody style={{ background: "#f1f5f9" }}>
          <PreviewSide style={{ background: "#e2e8f0" }} />
          <PreviewMain style={{ background: "#fff" }} />
        </PreviewBody>
      </ThemePreview>
    ),
  },
  {
    value: "dark",
    label: "🌙 Dark",
    desc: "Easy on the eyes",
    preview: (
      <ThemePreview>
        <PreviewBar style={{ background: "#1e293b" }}>
          <PreviewDot style={{ background: "#334155" }} />
          <PreviewDot style={{ background: "#334155" }} />
        </PreviewBar>
        <PreviewBody style={{ background: "#0f172a" }}>
          <PreviewSide style={{ background: "#1e293b" }} />
          <PreviewMain style={{ background: "#1e293b" }} />
        </PreviewBody>
      </ThemePreview>
    ),
  },
  {
    value: "system",
    label: "🖥 System",
    desc: "Matches OS preference",
    preview: (
      <ThemePreview style={{ position: "relative", overflow: "hidden" }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(90deg, #0f172a 50%, #f1f5f9 50%)",
          }}
        />
      </ThemePreview>
    ),
  },
];

const AppearanceSettings = () => {
  const { mode, setMode } = useThemeMode();

  return (
    <Wrap>
      <CardBox>
        <CardHead>
          <h3>Theme</h3>
          <p>Choose how Stockiva looks for you. Saved in your browser.</p>
        </CardHead>
        <CardBody>
          <ThemeGrid>
            {THEMES.map((t) => (
              <ThemeCard key={t.value} $selected={mode === t.value} onClick={() => setMode(t.value)}>
                <Checkmark $visible={mode === t.value}>✓</Checkmark>
                {t.preview}
                <ThemeName $selected={mode === t.value}>{t.label}</ThemeName>
                <ThemeDesc>{t.desc}</ThemeDesc>
              </ThemeCard>
            ))}
          </ThemeGrid>
        </CardBody>
      </CardBox>
    </Wrap>
  );
}

export default AppearanceSettings;