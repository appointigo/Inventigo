"use client";

import { FilterOutlined, SearchOutlined } from "@ant-design/icons";
import { Button, Input, Space } from "antd";

export function SearchBar({
  value,
  placeholder,
  onChange,
  onFilterClick,
}: {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  onFilterClick?: () => void;
}) {
  return (
    <Space.Compact style={{ width: "100%" }}>
      <Input
        value={value}
        allowClear
        size="large"
        prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        style={{ minHeight: 46, borderRadius: onFilterClick ? "16px 0 0 16px" : 16 }}
      />
      {onFilterClick ? (
        <Button size="large" icon={<FilterOutlined />} onClick={onFilterClick} style={{ minWidth: 52, borderRadius: "0 16px 16px 0" }} />
      ) : null}
    </Space.Compact>
  );
}
