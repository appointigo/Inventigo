"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  App,
  Button,
  Card,
  DatePicker,
  Drawer,
  Empty,
  Flex,
  Input,
  InputNumber,
  Progress,
  Select,
  Skeleton,
  Table,
  Tag,
  Typography,
} from "antd";
import {
  ArrowLeftOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  PlusOutlined,
  SaveOutlined,
  ShopOutlined,
  ShoppingCartOutlined,
  UserAddOutlined,
  UsergroupAddOutlined,
} from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { useStore } from "@/providers/StoreProvider";
import { useCategories } from "@/modules/categories/hooks/useCategories";
import { useBrands } from "@/modules/brands/hooks/useBrands";
import { useProducts } from "@/modules/products/hooks/useProducts";
import { useMobileViewport } from "@/modules/mobile-dashboard/hooks/useMobileViewport";
import { useCreateCustomerVisit, useDemandIntelligence } from "../hooks/useDemandIntelligence";
import type { DemandReasonCode, DemandRequestInput, VisitOutcome } from "../types";
import { DEMAND_REASON_LABELS } from "../types";
import styles from "./DemandIntelligencePage.module.css";

const stockReasons: DemandReasonCode[] = [
  "SIZE_UNAVAILABLE",
  "PRODUCT_UNAVAILABLE",
  "OUT_OF_STOCK",
  "VARIANT_UNAVAILABLE",
  "BRAND_UNAVAILABLE",
  "FEATURE_UNAVAILABLE",
  "PRICE_TOO_HIGH",
  "OTHER",
];
const prominentReasons: DemandReasonCode[] = [
  "SIZE_UNAVAILABLE",
  "PRODUCT_UNAVAILABLE",
  "PRICE_TOO_HIGH",
  "OTHER",
];
const newRequest = (reasonCode: DemandReasonCode): DemandRequestInput => ({
  requestedQuantity: 1,
  fulfilledQuantity: 0,
  status: "UNFULFILLED",
  reasonCode,
  attributes: {},
});
const signalColor = (signal: string) =>
  signal === "Critical Demand Gap"
    ? "red"
    : signal === "Replenishment Needed" || signal === "Overstock Risk"
      ? "orange"
      : signal === "Healthy"
        ? "green"
        : "blue";

function Field({
  label,
  required,
  children,
  wide = false,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <label className={wide ? styles.wideField : styles.field}>
      <span>
        {label}
        {required ? <b> *</b> : null}
      </span>
      {children}
    </label>
  );
}

function VisitForm({
  storeId,
  inline,
  onClose,
}: {
  storeId: string;
  inline: boolean;
  onClose: () => void;
}) {
  const { message } = App.useApp();
  const { categories } = useCategories(storeId);
  const { brands } = useBrands(storeId);
  const { products } = useProducts(
    { storeId, page: 1, pageSize: 200, isActive: true },
    { enabled: true }
  );
  const mutation = useCreateCustomerVisit();
  const [outcome, setOutcome] = useState<VisitOutcome>();
  const [requests, setRequests] = useState<DemandRequestInput[]>([]);
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const canSave = outcome === "CONVERTED" || requests.length > 0;
  const reset = () => {
    setOutcome(undefined);
    setRequests([]);
    setIdempotencyKey(crypto.randomUUID());
  };
  const close = () => {
    if (mutation.isPending) return;
    reset();
    onClose();
  };
  const updateRequest = (index: number, patch: Partial<DemandRequestInput>) =>
    setRequests((current) =>
      current.map((request, requestIndex) =>
        requestIndex === index ? { ...request, ...patch } : request
      )
    );
  const addRequest = (reason: DemandReasonCode) =>
    setRequests((current) => [...current, newRequest(reason)]);
  const submit = async (saveAndNew = false, quickBrowsing = false) => {
    const finalOutcome = quickBrowsing ? "BROWSING" : outcome;
    const finalRequests = quickBrowsing ? [newRequest("JUST_BROWSING")] : requests;
    if (!finalOutcome) return;
    if (
      finalRequests.some(
        (request) =>
          !["JUST_BROWSING", "CUSTOMER_CHANGED_MIND"].includes(request.reasonCode) &&
          !request.categoryId
      )
    ) {
      message.warning("Choose a category for every meaningful demand request.");
      return;
    }
    try {
      await mutation.mutateAsync({
        storeId,
        outcome: finalOutcome,
        idempotencyKey,
        requests: finalRequests,
      });
      message.success("Customer visit recorded");
      reset();
      if (!saveAndNew) onClose();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Unable to save visit");
    }
  };

  const content = (
    <div className={styles.captureBody}>
      {inline ? (
        <div className={styles.captureTitle}>
          <span>
            <UserAddOutlined />
          </span>
          <div>
            <h2>Record Customer Visit</h2>
            <p>Add what the customer looked for and whether they bought.</p>
          </div>
        </div>
      ) : null}
      <section className={styles.formSection}>
        <div className={styles.stepTitle}>
          <span>1</span>
          <h3>
            Visit Outcome <b>*</b>
          </h3>
        </div>
        <div className={styles.outcomeGrid}>
          {(
            [
              ["CONVERTED", "Bought", <ShoppingCartOutlined key="b" />],
              ["NOT_CONVERTED", "Didn’t Buy", <CloseCircleOutlined key="n" />],
              [
                "PARTIALLY_CONVERTED",
                "Partially",
                <Progress type="circle" percent={66} size={24} showInfo={false} key="p" />,
              ],
            ] as const
          ).map(([value, label, icon]) => (
            <Button
              key={value}
              className={`${styles.outcomeButton} ${styles[`outcome${value}`]} ${outcome === value ? styles.outcomeSelected : ""}`}
              onClick={() => {
                setOutcome(value);
                setRequests(value === "CONVERTED" ? [] : requests);
              }}
            >
              {icon}
              <span>{label}</span>
            </Button>
          ))}
        </div>
      </section>

      {outcome === "NOT_CONVERTED" ? (
        <section className={styles.formSection}>
          <div className={styles.stepTitle}>
            <span>2</span>
            <h3>
              Reason (why didn’t they buy?) <b>*</b>
            </h3>
          </div>
          <div className={styles.reasonChips}>
            <Button onClick={() => submit(false, true)} loading={mutation.isPending}>
              Just browsing
            </Button>
            {stockReasons.map((reason) => (
              <Button
                key={reason}
                type={requests.some((item) => item.reasonCode === reason) ? "primary" : "default"}
                className={prominentReasons.includes(reason) ? "" : styles.secondaryReason}
                onClick={() => addRequest(reason)}
              >
                {DEMAND_REASON_LABELS[reason]}
              </Button>
            ))}
          </div>
        </section>
      ) : null}

      {outcome === "PARTIALLY_CONVERTED" && requests.length === 0 ? (
        <Alert
          className={styles.partialAlert}
          type="info"
          showIcon
          title="Record what the customer still wanted"
          action={<Button onClick={() => addRequest("VARIANT_UNAVAILABLE")}>Add request</Button>}
        />
      ) : null}

      {outcome && outcome !== "CONVERTED" ? (
        <section className={styles.formSection}>
          <div className={styles.stepTitle}>
            <span>3</span>
            <h3>Requested Item Details</h3>
          </div>
          {requests.length === 0 ? (
            <div className={styles.requestPrompt}>
              Choose a reason above to add the first requested item.
            </div>
          ) : null}
          <div className={styles.requests}>
            {requests.map((request, index) => {
              const category = categories.find((item) => item.id === request.categoryId);
              const categoryProducts = products.filter(
                (product) => !request.categoryId || product.categoryId === request.categoryId
              );
              return (
                <div className={styles.requestCard} key={index}>
                  {requests.length > 1 ? (
                    <div className={styles.requestCardHeader}>
                      <strong>Request {index + 1}</strong>
                      <Button
                        danger
                        type="text"
                        icon={<DeleteOutlined />}
                        onClick={() =>
                          setRequests((current) =>
                            current.filter((_, requestIndex) => requestIndex !== index)
                          )
                        }
                      >
                        Remove
                      </Button>
                    </div>
                  ) : null}
                  <div className={styles.formGrid}>
                    <Field label="Category" required>
                      <Select
                        showSearch
                        optionFilterProp="label"
                        placeholder="Choose category"
                        value={request.categoryId}
                        options={categories.map((item) => ({ value: item.id, label: item.name }))}
                        onChange={(categoryId) =>
                          updateRequest(index, { categoryId, productId: undefined, attributes: {} })
                        }
                      />
                    </Field>
                    <Field label="Product / Style">
                      <Select
                        allowClear
                        showSearch
                        optionFilterProp="label"
                        placeholder="Search product or style"
                        value={request.productId}
                        options={categoryProducts.map((item) => ({
                          value: item.id,
                          label: `${item.name} (${item.sku})`,
                        }))}
                        onChange={(productId) => updateRequest(index, { productId })}
                      />
                    </Field>
                    <Field label="Brand">
                      <Select
                        allowClear
                        showSearch
                        optionFilterProp="label"
                        placeholder="Optional"
                        value={request.brandId}
                        options={brands.map((item) => ({ value: item.id, label: item.name }))}
                        onChange={(brandId) => updateRequest(index, { brandId })}
                      />
                    </Field>
                    <Field label="Reason" required>
                      <Select
                        value={request.reasonCode}
                        options={Object.entries(DEMAND_REASON_LABELS).map(([value, label]) => ({
                          value,
                          label,
                        }))}
                        onChange={(reasonCode) => updateRequest(index, { reasonCode })}
                      />
                    </Field>
                    <Field label="Request Status" required>
                      <Select
                        value={request.status}
                        options={[
                          { value: "UNFULFILLED", label: "Unfulfilled" },
                          { value: "PARTIALLY_FULFILLED", label: "Partially fulfilled" },
                          { value: "FULFILLED", label: "Fulfilled" },
                          { value: "ABANDONED", label: "Abandoned" },
                        ]}
                        onChange={(status) => {
                          if (status === "FULFILLED")
                            updateRequest(index, {
                              status,
                              fulfilledQuantity: request.requestedQuantity,
                            });
                          else if (status === "PARTIALLY_FULFILLED")
                            updateRequest(index, {
                              status,
                              requestedQuantity: Math.max(2, request.requestedQuantity),
                              fulfilledQuantity: Math.max(
                                1,
                                Math.min(
                                  request.fulfilledQuantity,
                                  Math.max(1, request.requestedQuantity - 1)
                                )
                              ),
                            });
                          else updateRequest(index, { status, fulfilledQuantity: 0 });
                        }}
                      />
                    </Field>
                    <Field label="Quantity" required>
                      <InputNumber
                        min={request.status === "PARTIALLY_FULFILLED" ? 2 : 1}
                        max={999}
                        value={request.requestedQuantity}
                        style={{ width: "100%" }}
                        onChange={(value) =>
                          updateRequest(index, {
                            requestedQuantity: value ?? 1,
                            ...(request.status === "FULFILLED"
                              ? { fulfilledQuantity: value ?? 1 }
                              : request.status === "PARTIALLY_FULFILLED"
                                ? {
                                    fulfilledQuantity: Math.min(
                                      request.fulfilledQuantity,
                                      Math.max(1, (value ?? 1) - 1)
                                    ),
                                  }
                                : {}),
                          })
                        }
                      />
                    </Field>
                    {request.status === "PARTIALLY_FULFILLED" ? (
                      <Field label="Fulfilled Quantity" required>
                        <InputNumber
                          min={0}
                          max={request.requestedQuantity}
                          value={request.fulfilledQuantity}
                          style={{ width: "100%" }}
                          onChange={(value) =>
                            updateRequest(index, { fulfilledQuantity: value ?? 0 })
                          }
                        />
                      </Field>
                    ) : null}
                    {category?.sizes.length ? (
                      <Field label="Size / Attribute">
                        <Select
                          allowClear
                          showSearch
                          optionFilterProp="label"
                          placeholder="Choose size"
                          value={request.attributes?.size as string | undefined}
                          options={category.sizes.map((size) => ({
                            value: size.label,
                            label: size.label,
                          }))}
                          onChange={(size) =>
                            updateRequest(index, { attributes: { ...request.attributes, size } })
                          }
                        />
                      </Field>
                    ) : null}
                    {category?.attributeSchema.fields
                      .filter((field) => field.name.toLocaleLowerCase("en-IN") !== "size")
                      .map((attribute) => (
                        <Field
                          key={attribute.name}
                          label={attribute.name}
                          required={attribute.required}
                        >
                          {attribute.type === "select" || attribute.type === "multi-select" ? (
                            <Select
                              mode={attribute.type === "multi-select" ? "multiple" : undefined}
                              allowClear={!attribute.required}
                              showSearch
                              optionFilterProp="label"
                              placeholder={`Choose ${attribute.name.toLowerCase()}`}
                              value={
                                request.attributes?.[attribute.name] as
                                  | string
                                  | string[]
                                  | undefined
                              }
                              options={(attribute.options ?? []).map((option) => ({
                                value: option,
                                label: option,
                              }))}
                              onChange={(value) =>
                                updateRequest(index, {
                                  attributes: { ...request.attributes, [attribute.name]: value },
                                })
                              }
                            />
                          ) : attribute.type === "number" ? (
                            <InputNumber
                              placeholder={attribute.name}
                              style={{ width: "100%" }}
                              value={request.attributes?.[attribute.name] as number | undefined}
                              onChange={(value) =>
                                updateRequest(index, {
                                  attributes: {
                                    ...request.attributes,
                                    [attribute.name]: value ?? "",
                                  },
                                })
                              }
                            />
                          ) : attribute.type === "boolean" ? (
                            <Select
                              allowClear={!attribute.required}
                              placeholder={attribute.name}
                              value={request.attributes?.[attribute.name] as boolean | undefined}
                              options={[
                                { value: true, label: "Yes" },
                                { value: false, label: "No" },
                              ]}
                              onChange={(value) =>
                                updateRequest(index, {
                                  attributes: { ...request.attributes, [attribute.name]: value },
                                })
                              }
                            />
                          ) : (
                            <Input
                              placeholder={attribute.name}
                              value={request.attributes?.[attribute.name] as string | undefined}
                              onChange={(event) =>
                                updateRequest(index, {
                                  attributes: {
                                    ...request.attributes,
                                    [attribute.name]: event.target.value,
                                  },
                                })
                              }
                            />
                          )}
                        </Field>
                      ))}
                    <Field label="Notes" wide>
                      <Input.TextArea
                        autoSize={{ minRows: 1, maxRows: 3 }}
                        placeholder="Any additional details (e.g. colour, fit, occasion)"
                        value={request.notes}
                        onChange={(event) => updateRequest(index, { notes: event.target.value })}
                      />
                    </Field>
                  </div>
                </div>
              );
            })}
          </div>
          <Button
            className={styles.addRequestButton}
            icon={<PlusOutlined />}
            onClick={() => addRequest("OUT_OF_STOCK")}
          >
            <span>
              Add another request<small>Track multiple items from the same visit</small>
            </span>
          </Button>
        </section>
      ) : null}

      {outcome ? (
        <div className={`${styles.actionBar} ${inline ? styles.inlineActionBar : ""}`}>
          <Button
            size="large"
            onClick={() => submit(true)}
            disabled={mutation.isPending || !canSave}
          >
            Save &amp; New
          </Button>
          <Button
            type="primary"
            size="large"
            icon={<SaveOutlined />}
            onClick={() => submit(false)}
            loading={mutation.isPending}
            disabled={!canSave}
          >
            Save Visit
          </Button>
        </div>
      ) : null}
    </div>
  );

  if (inline)
    return (
      <Card className={styles.captureCard} styles={{ body: { padding: 0 } }}>
        {content}
      </Card>
    );
  return (
    <Drawer
      title="Record Customer Visit"
      open
      onClose={close}
      size="min(720px, 100vw)"
      destroyOnHidden
    >
      {content}
    </Drawer>
  );
}

function MobileSummary({
  visits,
  unfulfilled,
  conversion,
}: {
  visits: number | string;
  unfulfilled: number | string;
  conversion: number | string;
}) {
  const metrics = [
    {
      label: "Visits Today",
      value: visits,
      icon: <UsergroupAddOutlined />,
      tone: styles.summaryBlue,
    },
    {
      label: "Unfulfilled Requests",
      value: unfulfilled,
      icon: <CloseCircleOutlined />,
      tone: styles.summaryRed,
    },
    {
      label: "Conversion Rate",
      value: conversion,
      icon: <BarChartIcon />,
      tone: styles.summaryGreen,
    },
  ];
  return (
    <section className={styles.mobileSummary}>
      {metrics.map((metric) => (
        <div key={metric.label}>
          <span className={metric.tone}>{metric.icon}</span>
          <p>
            <small>{metric.label}</small>
            <strong>{metric.value}</strong>
          </p>
        </div>
      ))}
    </section>
  );
}

function BarChartIcon() {
  return (
    <span className={styles.miniBars} aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  );
}

export default function DemandIntelligencePage() {
  const router = useRouter();
  const { storeId, storeName } = useStore();
  const { isMobile, isReady } = useMobileViewport();
  const [captureOpen, setCaptureOpen] = useState(false);
  const [range, setRange] = useState<[Dayjs, Dayjs]>(() => [
    dayjs().subtract(29, "day").startOf("day"),
    dayjs().startOf("day"),
  ]);
  const query = useDemandIntelligence(
    storeId ?? undefined,
    range[0].toISOString(),
    range[1].add(1, "day").toISOString()
  );
  const todayQuery = useDemandIntelligence(
    storeId ?? undefined,
    dayjs().startOf("day").toISOString(),
    dayjs().add(1, "day").startOf("day").toISOString()
  );
  const data = query.data;
  const today = todayQuery.data;
  const metricCards = useMemo(
    () =>
      data
        ? [
            ["Customer Visits", data.visits.total],
            ["Converted", data.visits.converted + data.visits.partiallyConverted],
            ["Unfulfilled Demand", data.demand.unfulfilledQuantity],
            [
              "Demand Fulfilment",
              data.demand.fulfillmentRate === null ? "N/A" : `${data.demand.fulfillmentRate}%`,
            ],
            [
              "Conversion Rate",
              data.visits.conversionRate === null ? "N/A" : `${data.visits.conversionRate}%`,
            ],
          ]
        : [],
    [data]
  );
  if (!storeId)
    return <Alert type="info" showIcon title="Choose a store to use Demand Intelligence." />;
  if (!isReady) return <Skeleton active paragraph={{ rows: 12 }} />;

  if (isMobile)
    return (
      <main className={styles.mobilePage}>
        <header className={styles.mobileHeader}>
          <Button
            type="text"
            aria-label="Go back"
            icon={<ArrowLeftOutlined />}
            onClick={() => router.back()}
          />
          <div>
            <h1>Demand Intelligence</h1>
            <p>Capture customer visits and track demand</p>
          </div>
          <div className={styles.storeContext}>
            <ShopOutlined />
            <span>
              <strong>{storeName}</strong>
              <small>Current Store</small>
            </span>
          </div>
        </header>
        {todayQuery.isLoading ? (
          <Card className={styles.mobileSummary}>
            <Skeleton active paragraph={{ rows: 1 }} title={false} />
          </Card>
        ) : todayQuery.isError ? (
          <Alert type="error" showIcon title="Today’s summary could not be loaded" />
        ) : (
          <MobileSummary
            visits={today?.visits.total ?? 0}
            unfulfilled={today?.demand.unfulfilledRequests ?? 0}
            conversion={
              today?.visits.conversionRate === null || today?.visits.conversionRate === undefined
                ? "N/A"
                : `${today.visits.conversionRate}%`
            }
          />
        )}
        <VisitForm storeId={storeId} inline onClose={() => undefined} />
        <section className={styles.missedCard}>
          <div className={styles.missedHeader}>
            <span>
              <CloseCircleOutlined />
            </span>
            <div>
              <h2>Missed Customer Requests</h2>
              <p>Recent unmet demand at this store</p>
            </div>
          </div>
          {query.isLoading ? (
            <Skeleton active paragraph={{ rows: 3 }} />
          ) : query.isError ? (
            <Alert
              type="error"
              showIcon
              title="Missed requests could not be loaded"
              description={query.error.message}
            />
          ) : data?.requirements.length ? (
            <div className={styles.missedList}>
              {data.requirements
                .filter((row) => row.unfulfilled > 0)
                .slice(0, 3)
                .map((row) => (
                  <div key={row.key}>
                    <span className={styles.itemIcon}>
                      <ShoppingCartOutlined />
                    </span>
                    <p>
                      <strong>{row.requirement}</strong>
                      <small>
                        {row.unfulfilled} customer {row.unfulfilled === 1 ? "request" : "requests"}
                      </small>
                    </p>
                    <b>{row.currentStock} in stock</b>
                  </div>
                ))}
            </div>
          ) : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="No missed customer requests yet"
            />
          )}
        </section>
      </main>
    );

  return (
    <div className={styles.desktopPage}>
      <header className={styles.desktopHeader}>
        <div>
          <Typography.Title level={2}>Demand Intelligence</Typography.Title>
          <Typography.Text type="secondary">
            Record customer visits and turn unmet requirements into inventory decisions.
          </Typography.Text>
        </div>
        <Flex gap={8} wrap>
          <DatePicker.RangePicker
            value={range}
            onChange={(value) =>
              value?.[0] && value[1] && setRange([value[0].startOf("day"), value[1].startOf("day")])
            }
          />
          <Button
            type="primary"
            size="large"
            icon={<UserAddOutlined />}
            onClick={() => setCaptureOpen(true)}
          >
            Record Customer Visit
          </Button>
        </Flex>
      </header>
      {query.isError ? (
        <Alert
          type="error"
          showIcon
          title="Demand Intelligence could not be loaded"
          description={query.error.message}
        />
      ) : query.isLoading || !data ? (
        <Skeleton active paragraph={{ rows: 14 }} />
      ) : (
        <>
          <Alert
            type={data.evidence === "reliable" ? "success" : "info"}
            showIcon
            title={
              data.evidence === "reliable"
                ? "Observed-demand mode"
                : data.evidence === "early"
                  ? "Early demand signal"
                  : "No observed-demand sample yet"
            }
            description={data.evidenceNote}
          />
          <div className={styles.desktopSummary}>
            {metricCards.map(([label, value]) => (
              <Card size="small" key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </Card>
            ))}
          </div>
          <div className={styles.desktopColumns}>
            <Card title="Why Sales Were Lost">
              {data.reasons.length ? (
                data.reasons.map((reason) => (
                  <div key={reason.reasonCode} className={styles.reasonRow}>
                    <Flex justify="space-between">
                      <Typography.Text>{reason.label}</Typography.Text>
                      <Typography.Text strong>
                        {reason.count} · {reason.share}%
                      </Typography.Text>
                    </Flex>
                    <Progress percent={reason.share} showInfo={false} size="small" />
                  </div>
                ))
              ) : (
                <Empty description="No reasons recorded" />
              )}
            </Card>
            <Card title="Most Requested Missing Requirements">
              <Table
                size="small"
                pagination={false}
                rowKey="key"
                dataSource={data.requirements.slice(0, 8)}
                scroll={{ x: 620 }}
                columns={[
                  { title: "Requirement", dataIndex: "requirement", width: 230 },
                  { title: "Requests", dataIndex: "observedDemand" },
                  { title: "Lost", dataIndex: "unfulfilled" },
                  { title: "Stock", dataIndex: "currentStock" },
                  {
                    title: "Signal",
                    dataIndex: "signal",
                    render: (value: string) => <Tag color={signalColor(value)}>{value}</Tag>,
                  },
                ]}
              />
            </Card>
          </div>
          <Card title="Demand vs Availability" className={styles.desktopTable}>
            <Table
              size="small"
              pagination={{ pageSize: 10 }}
              rowKey="key"
              dataSource={data.requirements}
              scroll={{ x: 850 }}
              columns={[
                { title: "Requirement", dataIndex: "requirement", fixed: "left", width: 250 },
                { title: "Observed Demand", dataIndex: "observedDemand" },
                { title: "Fulfilled", dataIndex: "fulfilled" },
                { title: "Lost", dataIndex: "unfulfilled" },
                { title: "Current Stock", dataIndex: "currentStock" },
                {
                  title: "Fulfilment",
                  dataIndex: "fulfillmentRate",
                  render: (value: number | null) => (value === null ? "N/A" : `${value}%`),
                },
                {
                  title: "Signal",
                  dataIndex: "signal",
                  render: (value: string) => <Tag color={signalColor(value)}>{value}</Tag>,
                },
              ]}
            />
          </Card>
          <Card title="Category Demand" className={styles.desktopTable}>
            <Table
              size="small"
              pagination={false}
              rowKey="categoryId"
              dataSource={data.categories}
              scroll={{ x: 760 }}
              columns={[
                { title: "Category", dataIndex: "category", fixed: "left" },
                { title: "Sales Units", dataIndex: "sales" },
                { title: "Observed Demand", dataIndex: "observedDemand" },
                { title: "Lost Demand", dataIndex: "unfulfilledDemand" },
                {
                  title: "Fulfilment",
                  dataIndex: "fulfillmentRate",
                  render: (value: number | null) => (value === null ? "N/A" : `${value}%`),
                },
                { title: "Stock", dataIndex: "currentStock" },
                {
                  title: "Signal",
                  dataIndex: "signal",
                  render: (value: string) => <Tag color={signalColor(value)}>{value}</Tag>,
                },
              ]}
            />
          </Card>
        </>
      )}
      {captureOpen ? (
        <VisitForm storeId={storeId} inline={false} onClose={() => setCaptureOpen(false)} />
      ) : null}
    </div>
  );
}
