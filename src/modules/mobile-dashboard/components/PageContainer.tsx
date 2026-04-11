"use client";

import type { CSSProperties, ReactNode } from "react";

export function PageContainer({
  title,
  subtitle,
  headerExtra,
  stickySlot,
  children,
  style,
}: {
  title: string;
  subtitle?: string;
  headerExtra?: ReactNode;
  stickySlot?: ReactNode;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div style={{ padding: "16px 16px 128px", minHeight: "100%", width: "100%", maxWidth: 720, marginInline: "auto", overflowX: "hidden", ...style }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", gap: 12 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: 28, lineHeight: 1.05, letterSpacing: "-0.04em", color: "#0f172a" }}>{title}</h1>
            {subtitle ? (
              <p style={{ margin: "8px 0 0", color: "#64748b", fontSize: 14, lineHeight: 1.4 }}>{subtitle}</p>
            ) : null}
          </div>
          {headerExtra ? <div style={{ flex: "0 0 auto" }}>{headerExtra}</div> : null}
        </div>
      </div>
      {stickySlot ? (
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 8,
            background: "linear-gradient(180deg, #f4f7fb 0%, rgba(244,247,251,0.96) 80%, rgba(244,247,251,0) 100%)",
            paddingBottom: 12,
            marginBottom: 12,
            width: "100%",
          }}
        >
          {stickySlot}
        </div>
      ) : null}
      {children}
    </div>
  );
}
