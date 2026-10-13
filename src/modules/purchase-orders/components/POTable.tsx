"use client";

import { useMemo, useState } from "react";
import { Button, Dropdown, Empty, Input, Select, Space, Table, Tag } from "antd";
import { EyeOutlined, MoreOutlined, PlusOutlined, SearchOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type { PurchaseOrderStatus } from "@prisma/client";
import type { Supplier } from "@/modules/suppliers/types";
import { formatCurrency } from "@/shared/utils/formatCurrency";
import { formatDate } from "@/shared/utils/formatDate";
import type { PurchaseOrder } from "../types";
import styles from "./PurchaseWorkspace.module.css";

interface Props {
  purchaseOrders: PurchaseOrder[];
  suppliers: Supplier[];
  loading: boolean;
  statusFilter?: PurchaseOrderStatus;
  onStatusChange: (status?: PurchaseOrderStatus) => void;
  supplierFilter?: string;
  onSupplierChange: (supplierId?: string) => void;
  onAdd: () => void;
  onView: (po: PurchaseOrder) => void;
}

const statuses: Array<{ value?: PurchaseOrderStatus; label: string }> = [
  { label: "All" }, { value: "DRAFT", label: "Draft" }, { value: "ORDERED", label: "Issued" },
  { value: "PARTIALLY_RECEIVED", label: "Partially Received" }, { value: "RECEIVED", label: "Received" },
  { value: "CLOSED", label: "Closed Short" }, { value: "CANCELLED", label: "Cancelled" },
];
const tagColor: Record<PurchaseOrderStatus, string> = { DRAFT: "default", ORDERED: "blue", PARTIALLY_RECEIVED: "gold", RECEIVED: "green", CLOSED: "purple", CANCELLED: "red" };

export default function POTable(props: Props) {
  const [search, setSearch] = useState("");
  const visible = useMemo(() => props.purchaseOrders.filter((po) => {
    const query = search.trim().toLowerCase();
    return (!props.statusFilter || po.status === props.statusFilter)
      && (!query || [po.poNumber, po.supplierName, po.storeName].some((value) => value.toLowerCase().includes(query)));
  }), [props.purchaseOrders, props.statusFilter, search]);
  const count = (status?: PurchaseOrderStatus) => status ? props.purchaseOrders.filter((po) => po.status === status).length : props.purchaseOrders.length;
  const totals = (po: PurchaseOrder) => {
    const ordered = po.items.reduce((sum, item) => sum + item.quantity, 0);
    const accepted = po.items.reduce((sum, item) => sum + item.acceptedQuantity, 0);
    const received = po.items.reduce((sum, item) => sum + item.acceptedQuantity + item.rejectedQuantity + item.damagedQuantity, 0);
    return { ordered, received, accepted, pending: Math.max(0, ordered - accepted) };
  };
  const columns: ColumnsType<PurchaseOrder> = [
    { title: "PO Number", dataIndex: "poNumber", width: 160, fixed: "left", render: (value, row) => <Button type="link" onClick={() => props.onView(row)} style={{ padding: 0, fontWeight: 650 }}>{value}</Button> },
    { title: "Supplier", dataIndex: "supplierName", width: 180 },
    { title: "Store", dataIndex: "storeName", width: 150 },
    { title: "Expected Date", dataIndex: "expectedDeliveryDate", width: 130, render: (value) => value ? formatDate(value) : "—" },
    { title: "Ordered", width: 90, align: "right", render: (_, row) => totals(row).ordered },
    { title: "Received", width: 90, align: "right", render: (_, row) => totals(row).received },
    { title: "Accepted", width: 90, align: "right", render: (_, row) => totals(row).accepted },
    { title: "Pending", width: 90, align: "right", render: (_, row) => totals(row).pending },
    { title: "Total Amount", dataIndex: "totalAmount", width: 130, align: "right", render: formatCurrency },
    { title: "Status", dataIndex: "status", width: 150, render: (value: PurchaseOrderStatus) => <Tag color={tagColor[value]}>{statuses.find((item) => item.value === value)?.label}</Tag> },
    { title: "", width: 54, fixed: "right", render: (_, row) => <Dropdown menu={{ items: [
      { key: "view", label: "View details", icon: <EyeOutlined />, onClick: () => props.onView(row) },
      ...(["ORDERED", "PARTIALLY_RECEIVED"].includes(row.status) ? [{ key: "receive", label: "Start receiving", onClick: () => props.onView(row) }] : []),
    ] }}><Button type="text" icon={<MoreOutlined />} aria-label={`Actions for ${row.poNumber}`} /></Dropdown> },
  ];

  return <>
    <div className={styles.statusGrid} role="group" aria-label="Purchase order status filters">
      {statuses.map((item) => <button key={item.label} type="button" className={`${styles.statusButton} ${props.statusFilter === item.value ? styles.statusButtonActive : ""}`} onClick={() => props.onStatusChange(item.value)}>
        <span className={styles.statusCount}>{count(item.value)}</span>{item.label}
      </button>)}
    </div>
    <section className={styles.panel}>
      <div className={styles.toolbar}>
        <Space wrap>
          <Input value={search} onChange={(event) => setSearch(event.target.value)} allowClear prefix={<SearchOutlined />} placeholder="Search PO number, supplier or store" style={{ width: 290 }} />
          <Select value={props.supplierFilter} onChange={props.onSupplierChange} allowClear placeholder="All suppliers" style={{ width: 210 }} options={props.suppliers.map((supplier) => ({ value: supplier.id, label: supplier.name }))} />
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={props.onAdd}>Create Purchase Order</Button>
      </div>
      <div className={styles.tableWrap}><Table columns={columns} dataSource={visible} rowKey="id" loading={props.loading} scroll={{ x: 1320 }} pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `${total} purchase orders` }} locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No purchase orders match these filters"><Button type="primary" onClick={props.onAdd}>Create purchase order</Button></Empty> }} /></div>
    </section>
  </>;
}
