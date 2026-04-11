"use client";

import type { ReactNode } from "react";
import { Card } from "./Card";

export function ListItem({
  leading,
  title,
  subtitle,
  meta,
  action,
}: {
  leading?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  meta?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <Card style={{ padding: 14, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "start", gap: 12 }}>
        {leading ? <div style={{ flex: "0 0 auto" }}>{leading}</div> : null}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>{title}</div>
              {subtitle ? <div style={{ marginTop: 6, color: "#64748b", fontSize: 13 }}>{subtitle}</div> : null}
            </div>
            {meta ? <div style={{ flex: "0 0 auto", marginLeft: "auto" }}>{meta}</div> : null}
          </div>
          {action ? <div style={{ marginTop: 12 }}>{action}</div> : null}
        </div>
      </div>
    </Card>
  );
}
