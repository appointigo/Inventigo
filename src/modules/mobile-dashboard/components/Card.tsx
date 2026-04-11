"use client";

import type { CSSProperties, ReactNode } from "react";

export function Card({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #e7ebf3",
        borderRadius: 20,
        boxShadow: "0 12px 28px rgba(15, 23, 42, 0.06)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
