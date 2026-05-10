"use client";

import React from "react";
import { Space, Button } from "antd";

interface Props {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
}

export default function PaginationBar({ page, totalPages, onChange }: Props) {
  const pages: number[] = [];
  const maxPills = 7;
  let start = Math.max(1, page - Math.floor(maxPills / 2));
  let end = Math.min(totalPages, start + maxPills - 1);
  if (end - start + 1 < maxPills) start = Math.max(1, end - maxPills + 1);
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <div style={{ display: "flex", justifyContent: "center", marginTop: 12 }}>
      <Space>
        <Button onClick={() => onChange(Math.max(1, page - 1))} disabled={page <= 1}>{"‹"}</Button>
        {start > 1 && <Button onClick={() => onChange(1)}>1</Button>}
        {start > 2 && <span>…</span>}
        {pages.map((p) => (
          <Button key={p} onClick={() => onChange(p)} style={p === page ? { background: "#111827", color: "#fff" } : {}}>{p}</Button>
        ))}
        {end < totalPages - 1 && <span>…</span>}
        {end < totalPages && <Button onClick={() => onChange(totalPages)}>{totalPages}</Button>}
        <Button onClick={() => onChange(Math.min(totalPages, page + 1))} disabled={page >= totalPages}>{"›"}</Button>
      </Space>
    </div>
  );
}
