"use client";

import { Descriptions, Tag, Typography, Card, Empty } from "antd";
import { formatDate } from "@/shared/utils/formatDate";
import type { Supplier } from "../types";

interface SupplierDetailProps {
  supplier: Supplier;
}

export default function SupplierDetail({ supplier }: SupplierDetailProps) {
  return (
    <Card>
      <Descriptions
        column={{ xs: 1, sm: 2 }}
        bordered
        size="small"
      >
        <Descriptions.Item label="Name">{supplier.name}</Descriptions.Item>
        <Descriptions.Item label="Status">
          <Tag color={supplier.isActive ? "success" : "default"}>
            {supplier.isActive ? "Active" : "Inactive"}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Contact Person">
          {supplier.contactPerson || "—"}
        </Descriptions.Item>
        <Descriptions.Item label="Email">
          {supplier.email || "—"}
        </Descriptions.Item>
        <Descriptions.Item label="Phone">
          {supplier.phone || "—"}
        </Descriptions.Item>
        <Descriptions.Item label="Purchase Orders">
          {supplier.poCount}
        </Descriptions.Item>
        <Descriptions.Item label="Address" span={2}>
          {supplier.address || "—"}
        </Descriptions.Item>
        <Descriptions.Item label="Created">
          {formatDate(supplier.createdAt)}
        </Descriptions.Item>
        <Descriptions.Item label="Updated">
          {formatDate(supplier.updatedAt)}
        </Descriptions.Item>
      </Descriptions>
    </Card>
  );
}
