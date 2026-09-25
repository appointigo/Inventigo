"use client";
import Link from "next/link";
import { FilterOutlined, PlusOutlined, SearchOutlined, UserOutlined } from "@ant-design/icons";
import {
  Avatar,
  Button,
  Card,
  Empty,
  Grid,
  Input,
  InputNumber,
  List,
  Popover,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import type { ColumnsType, TableProps } from "antd/es/table";
import type { CustomerListItemDto, CustomerSortField, SortDirection } from "../types";
import type { CustomerDatePreset } from "../utils/customerDateWindow";
import { shouldApplyCustomerSort } from "../customerPagination";

export type DirectoryFilters = {
  lastPurchaseDays?: CustomerDatePreset;
  minSpend?: number;
  maxSpend?: number;
  minOrders?: number;
  maxOrders?: number;
};
type Props = {
  customers: CustomerListItemDto[];
  loading: boolean;
  total: number;
  page: number;
  pageSize: number;
  search: string;
  heading: string;
  selectedCustomerId?: string | null;
  sortBy: CustomerSortField;
  sortDirection: SortDirection;
  filters: DirectoryFilters;
  onSearchChange: (value: string) => void;
  onFiltersChange: (filters: DirectoryFilters) => void;
  onSortChange: (field: CustomerSortField, direction: SortDirection) => void;
  onPageChange: (page: number, pageSize: number) => void;
  onSelectCustomer: (id: string) => void;
  onCreateCustomer: () => void;
  onClearFilters: () => void;
  compact?: boolean;
  profileHref: (customerId: string) => string;
};
const groupColor: Record<string, string> = {
  "Recently Purchased": "blue",
  "Repeat Customer": "purple",
  "High Spender": "gold",
  "Need Attention": "red",
  "Never Purchased": "default",
};
const statusColor: Record<string, string> = {
  "Recently purchased": "green",
  "Past customer": "orange",
  "Never purchased": "default",
};
const money = (value: number) =>
  `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function CustomerList(props: Props) {
  const screens = Grid.useBreakpoint();
  const sorter = (): TableProps<CustomerListItemDto>["sortDirections"] => ["ascend", "descend"];
  const sortOrder = (field: CustomerSortField) =>
    props.sortBy === field ? (props.sortDirection === "asc" ? "ascend" : "descend") : undefined;
  const customerCell = (_: unknown, row: CustomerListItemDto) => (
    <Space style={{ minWidth: 0 }}>
      <Avatar
        style={{ flex: "0 0 auto", background: "#e8f1ff", color: "#2563eb" }}
        icon={!row.name ? <UserOutlined /> : undefined}
      >
        {row.name?.slice(0, 1).toUpperCase()}
      </Avatar>
      <div style={{ minWidth: 0 }}>
        <Link
          href={props.profileHref(row.id)}
          onClick={(event) => event.stopPropagation()}
          title={row.name || "Unnamed customer"}
          style={{
            display: "block",
            maxWidth: screens.lg && !props.compact ? 220 : 190,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            fontWeight: 600,
          }}
        >
          {row.name || "Unnamed customer"}
        </Link>
        {!screens.lg || props.compact ? (
          <Typography.Text
            type="secondary"
            style={{ display: "block", fontSize: 12, whiteSpace: "nowrap" }}
          >
            {row.mobile}
          </Typography.Text>
        ) : null}
      </div>
    </Space>
  );
  const columns: ColumnsType<CustomerListItemDto> = [
    {
      title: "Customer",
      dataIndex: "name",
      width: screens.lg && !props.compact ? 250 : 230,
      sorter: true,
      sortDirections: sorter(),
      sortOrder: sortOrder("name"),
      render: customerCell,
    },
    ...(screens.lg && !props.compact
      ? [
          {
            title: "Mobile",
            dataIndex: "mobile",
            width: 130,
            render: (value) => <span style={{ whiteSpace: "nowrap" }}>{value}</span>,
          } as ColumnsType<CustomerListItemDto>[number],
        ]
      : []),
    {
      title: "Total spent",
      dataIndex: "totalSpent",
      width: 130,
      align: "right",
      sorter: true,
      sortOrder: sortOrder("spend"),
      render: (value) => <span style={{ whiteSpace: "nowrap" }}>{money(value)}</span>,
    },
    {
      title: "Orders",
      dataIndex: "totalOrders",
      width: 90,
      align: "right",
      sorter: true,
      sortOrder: sortOrder("orders"),
    },
    {
      title: "Last purchase",
      dataIndex: "lastPurchaseAt",
      width: 130,
      sorter: true,
      sortOrder: sortOrder("lastPurchase"),
      render: (value) => (
        <span style={{ whiteSpace: "nowrap" }}>
          {value ? new Date(value).toLocaleDateString("en-IN") : "Never"}
        </span>
      ),
    },
    ...(screens.xl && !props.compact
      ? [
          {
            title: "Preferred store",
            dataIndex: "preferredStoreName",
            width: 150,
            ellipsis: true,
            render: (value) => value || "Not assigned",
          } as ColumnsType<CustomerListItemDto>[number],
        ]
      : []),
    ...(!props.compact
      ? [
          {
            title: "Customer group",
            dataIndex: "groups",
            width: 245,
            render: (groups: string[]) => (
              <div
                style={{
                  display: "flex",
                  gap: 4,
                  alignItems: "center",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                }}
              >
                {groups.slice(0, 2).map((group) => (
                  <Tag key={group} color={groupColor[group]} style={{ marginInlineEnd: 0 }}>
                    {group}
                  </Tag>
                ))}
                {groups.length > 2 ? (
                  <Tooltip title={groups.slice(2).join(", ")}>
                    <Tag style={{ marginInlineEnd: 0 }}>+{groups.length - 2}</Tag>
                  </Tooltip>
                ) : null}
              </div>
            ),
          } as ColumnsType<CustomerListItemDto>[number],
        ]
      : []),
    ...(screens.xl && !props.compact
      ? [
          {
            title: "Activity",
            dataIndex: "activityStatus",
            width: 145,
            render: (value) => (
              <Tag color={statusColor[value]} style={{ whiteSpace: "nowrap" }}>
                {value}
              </Tag>
            ),
          } as ColumnsType<CustomerListItemDto>[number],
        ]
      : []),
  ];
  const advanced = (
    <div style={{ width: 280 }}>
      <Typography.Text strong>More filters</Typography.Text>
      <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
        <Select
          aria-label="Last purchase period"
          value={props.filters.lastPurchaseDays ?? "all"}
          onChange={(value) =>
            props.onFiltersChange({
              ...props.filters,
              lastPurchaseDays: value === "all" ? undefined : (value as CustomerDatePreset),
            })
          }
          options={[
            { value: "all", label: "All time" },
            { value: 7, label: "Last 7 days" },
            { value: 30, label: "Last 30 days" },
            { value: 90, label: "Last 90 days" },
            { value: 180, label: "Last 180 days" },
          ]}
        />
        <Space.Compact>
          <InputNumber
            min={0}
            placeholder="Min spend"
            value={props.filters.minSpend}
            onChange={(value) =>
              props.onFiltersChange({ ...props.filters, minSpend: value ?? undefined })
            }
          />
          <InputNumber
            min={0}
            placeholder="Max spend"
            value={props.filters.maxSpend}
            onChange={(value) =>
              props.onFiltersChange({ ...props.filters, maxSpend: value ?? undefined })
            }
          />
        </Space.Compact>
        <Space.Compact>
          <InputNumber
            min={0}
            placeholder="Min orders"
            value={props.filters.minOrders}
            onChange={(value) =>
              props.onFiltersChange({ ...props.filters, minOrders: value ?? undefined })
            }
          />
          <InputNumber
            min={0}
            placeholder="Max orders"
            value={props.filters.maxOrders}
            onChange={(value) =>
              props.onFiltersChange({ ...props.filters, maxOrders: value ?? undefined })
            }
          />
        </Space.Compact>
        <Button onClick={props.onClearFilters}>Clear filters</Button>
      </div>
    </div>
  );
  return (
    <Card
      styles={{ body: { padding: 0 } }}
      style={{ borderRadius: 14, overflow: "hidden", boxShadow: "0 8px 30px rgba(15,23,42,.05)" }}
    >
      <div style={{ padding: 18 }}>
        <Typography.Title level={5} style={{ margin: 0 }}>
          {props.heading}
        </Typography.Title>
        <Typography.Text type="secondary">
          Find customers and view their shopping history.
        </Typography.Text>
        <Space style={{ width: "100%", justifyContent: "space-between", marginTop: 14 }} wrap>
          <Input
            value={props.search}
            onChange={(event) => props.onSearchChange(event.target.value)}
            prefix={<SearchOutlined />}
            placeholder="Search by name or mobile number"
            allowClear
            style={{ width: "min(100%, 330px)" }}
          />
          <Space>
            <Popover trigger="click" content={advanced} placement="bottomRight">
              <Button icon={<FilterOutlined />}>More filters</Button>
            </Popover>
            <Button type="primary" icon={<PlusOutlined />} onClick={props.onCreateCustomer}>
              Add customer
            </Button>
          </Space>
        </Space>
      </div>
      {screens.md ? (
        <Table
          rowKey="id"
          size="middle"
          columns={columns}
          dataSource={props.customers}
          loading={props.loading}
          scroll={{ x: "max-content", y: props.compact ? "calc(100vh - 410px)" : undefined }}
          onChange={(_, __, sorterValue, extra) => {
            if (!shouldApplyCustomerSort(extra.action)) return;
            const sorterItem = Array.isArray(sorterValue) ? sorterValue[0] : sorterValue;
            if (!sorterItem?.order) return;
            const field =
              sorterItem.field === "name"
                ? "name"
                : sorterItem.field === "totalSpent"
                  ? "spend"
                  : sorterItem.field === "totalOrders"
                    ? "orders"
                    : "lastPurchase";
            props.onSortChange(field, sorterItem.order === "ascend" ? "asc" : "desc");
          }}
          onRow={(row) => ({
            onClick: () => props.onSelectCustomer(row.id),
            onKeyDown: (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                props.onSelectCustomer(row.id);
              }
            },
            tabIndex: 0,
            "aria-label": `Quick view for ${row.name || row.mobile}`,
            style: {
              cursor: "pointer",
              background: row.id === props.selectedCustomerId ? "#f0f6ff" : undefined,
            },
          })}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  props.search
                    ? "No customers match the current search and filters."
                    : "No customers match the current filters."
                }
              >
                <Button size="small" onClick={props.onClearFilters}>
                  Clear filters
                </Button>
              </Empty>
            ),
          }}
          pagination={{
            current: props.page,
            pageSize: props.pageSize,
            total: props.total,
            showSizeChanger: true,
            showLessItems: true,
            showTotal: (count) => `${count} customers`,
            onChange: props.onPageChange,
          }}
        />
      ) : (
        <List
          loading={props.loading}
          dataSource={props.customers}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No customers match the current filters."
              >
                <Button size="small" onClick={props.onClearFilters}>
                  Clear filters
                </Button>
              </Empty>
            ),
          }}
          pagination={{
            current: props.page,
            pageSize: props.pageSize,
            total: props.total,
            onChange: (page) => props.onPageChange(page, props.pageSize),
          }}
          renderItem={(row) => (
            <List.Item
              onClick={() => props.onSelectCustomer(row.id)}
              style={{
                paddingInline: 16,
                cursor: "pointer",
                background: row.id === props.selectedCustomerId ? "#f0f6ff" : undefined,
              }}
              extra={<Typography.Text strong>{money(row.totalSpent)}</Typography.Text>}
            >
              <List.Item.Meta
                avatar={<Avatar>{row.name?.slice(0, 1) || <UserOutlined />}</Avatar>}
                title={
                  <Link
                    href={props.profileHref(row.id)}
                    onClick={(event) => event.stopPropagation()}
                  >
                    {row.name || "Unnamed customer"}
                  </Link>
                }
                description={
                  <>
                    {row.mobile}
                    <br />
                    {row.groups.slice(0, 2).map((group) => (
                      <Tag key={group} color={groupColor[group]}>
                        {group}
                      </Tag>
                    ))}
                    {row.groups.length > 2 ? <Tag>+{row.groups.length - 2}</Tag> : null}
                  </>
                }
              />
            </List.Item>
          )}
        />
      )}
    </Card>
  );
}
