"use client";

import { useMemo, useState } from "react";
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
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from "antd";
import { PlusOutlined, UserAddOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { useStore } from "@/providers/StoreProvider";
import { useCategories } from "@/modules/categories/hooks/useCategories";
import { useBrands } from "@/modules/brands/hooks/useBrands";
import { useProducts } from "@/modules/products/hooks/useProducts";
import { useCreateCustomerVisit, useDemandIntelligence } from "../hooks/useDemandIntelligence";
import type { DemandReasonCode, DemandRequestInput, VisitOutcome } from "../types";
import { DEMAND_REASON_LABELS } from "../types";

const stockReasons: DemandReasonCode[] = [
  "OUT_OF_STOCK",
  "PRODUCT_UNAVAILABLE",
  "VARIANT_UNAVAILABLE",
  "BRAND_UNAVAILABLE",
  "FEATURE_UNAVAILABLE",
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

function VisitCapture({
  open,
  onClose,
  storeId,
}: {
  open: boolean;
  onClose: () => void;
  storeId: string;
}) {
  const { message } = App.useApp();
  const { categories } = useCategories(storeId);
  const { brands } = useBrands(storeId);
  const { products } = useProducts(
    { storeId, page: 1, pageSize: 200, isActive: true },
    { enabled: open }
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

  return (
    <Drawer
      title="Record Customer Visit"
      open={open}
      onClose={close}
      size="min(680px, 100vw)"
      destroyOnHidden
    >
      <Space orientation="vertical" size={18} style={{ width: "100%" }}>
        <div>
          <Typography.Title level={4} style={{ marginTop: 0 }}>
            Did the customer buy?
          </Typography.Title>
          <div className="demand-outcome-grid">
            {(
              [
                ["CONVERTED", "Yes"],
                ["NOT_CONVERTED", "No"],
                ["PARTIALLY_CONVERTED", "Partially"],
              ] as const
            ).map(([value, label]) => (
              <Button
                key={value}
                size="large"
                type={outcome === value ? "primary" : "default"}
                onClick={() => {
                  setOutcome(value);
                  setRequests(value === "CONVERTED" ? [] : requests);
                }}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>

        {outcome === "NOT_CONVERTED" ? (
          <Card size="small" title="Why was the sale not completed?">
            <Flex gap={8} wrap>
              <Button size="large" onClick={() => submit(false, true)} loading={mutation.isPending}>
                Just browsing
              </Button>
              {stockReasons.map((reason) => (
                <Button
                  key={reason}
                  size="large"
                  onClick={() => setRequests((current) => [...current, newRequest(reason)])}
                >
                  {DEMAND_REASON_LABELS[reason]}
                </Button>
              ))}
            </Flex>
          </Card>
        ) : null}

        {outcome === "PARTIALLY_CONVERTED" && requests.length === 0 ? (
          <Alert
            type="info"
            showIcon
            title="Record what the customer still wanted"
            action={
              <Button onClick={() => setRequests([newRequest("VARIANT_UNAVAILABLE")])}>
                Add request
              </Button>
            }
          />
        ) : null}

        {requests.map((request, index) => {
          const category = categories.find((item) => item.id === request.categoryId);
          const categoryProducts = products.filter(
            (product) => !request.categoryId || product.categoryId === request.categoryId
          );
          return (
            <Card
              key={index}
              size="small"
              title={`Demand request ${index + 1}`}
              extra={
                <Button
                  danger
                  type="text"
                  onClick={() =>
                    setRequests((current) =>
                      current.filter((_, requestIndex) => requestIndex !== index)
                    )
                  }
                >
                  Remove
                </Button>
              }
            >
              <div className="demand-form-grid">
                <Select
                  showSearch
                  optionFilterProp="label"
                  placeholder="Category *"
                  value={request.categoryId}
                  options={categories.map((item) => ({ value: item.id, label: item.name }))}
                  onChange={(categoryId) =>
                    updateRequest(index, { categoryId, productId: undefined, attributes: {} })
                  }
                />
                <Select
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  placeholder="Brand (optional)"
                  value={request.brandId}
                  options={brands.map((item) => ({ value: item.id, label: item.name }))}
                  onChange={(brandId) => updateRequest(index, { brandId })}
                />
                <Select
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  placeholder="Product (optional)"
                  value={request.productId}
                  options={categoryProducts.map((item) => ({
                    value: item.id,
                    label: `${item.name} (${item.sku})`,
                  }))}
                  onChange={(productId) => updateRequest(index, { productId })}
                />
                <Select
                  value={request.reasonCode}
                  options={Object.entries(DEMAND_REASON_LABELS).map(([value, label]) => ({
                    value,
                    label,
                  }))}
                  onChange={(reasonCode) => updateRequest(index, { reasonCode })}
                />
                <Select
                  value={request.status}
                  options={[
                    { value: "UNFULFILLED", label: "Unfulfilled" },
                    { value: "PARTIALLY_FULFILLED", label: "Partially fulfilled" },
                    { value: "FULFILLED", label: "Fulfilled" },
                    { value: "ABANDONED", label: "Abandoned" },
                  ]}
                  onChange={(status) => {
                    if (status === "FULFILLED") {
                      updateRequest(index, {
                        status,
                        fulfilledQuantity: request.requestedQuantity,
                      });
                    } else if (status === "PARTIALLY_FULFILLED") {
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
                    } else {
                      updateRequest(index, { status, fulfilledQuantity: 0 });
                    }
                  }}
                />
                <InputNumber
                  min={request.status === "PARTIALLY_FULFILLED" ? 2 : 1}
                  max={999}
                  value={request.requestedQuantity}
                  addonBefore="Wanted"
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
                <InputNumber
                  min={0}
                  max={request.requestedQuantity}
                  value={request.fulfilledQuantity}
                  addonBefore="Fulfilled"
                  style={{ width: "100%" }}
                  onChange={(value) => updateRequest(index, { fulfilledQuantity: value ?? 0 })}
                />
                {category?.sizes.length ? (
                  <Select
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    placeholder="Size"
                    value={request.attributes?.size as string | undefined}
                    options={category.sizes.map((size) => ({
                      value: size.label,
                      label: size.label,
                    }))}
                    onChange={(size) =>
                      updateRequest(index, { attributes: { ...request.attributes, size } })
                    }
                  />
                ) : null}
                {category?.attributeSchema.fields
                  .filter((field) => field.name.toLocaleLowerCase("en-IN") !== "size")
                  .map((field) =>
                    field.type === "select" || field.type === "multi-select" ? (
                      <Select
                        key={field.name}
                        mode={field.type === "multi-select" ? "multiple" : undefined}
                        allowClear={!field.required}
                        showSearch
                        optionFilterProp="label"
                        placeholder={field.name}
                        value={request.attributes?.[field.name] as string | string[] | undefined}
                        options={(field.options ?? []).map((option) => ({
                          value: option,
                          label: option,
                        }))}
                        onChange={(value) =>
                          updateRequest(index, {
                            attributes: { ...request.attributes, [field.name]: value },
                          })
                        }
                      />
                    ) : field.type === "number" ? (
                      <InputNumber
                        key={field.name}
                        placeholder={field.name}
                        style={{ width: "100%" }}
                        value={request.attributes?.[field.name] as number | undefined}
                        onChange={(value) =>
                          updateRequest(index, {
                            attributes: { ...request.attributes, [field.name]: value ?? "" },
                          })
                        }
                      />
                    ) : field.type === "boolean" ? (
                      <Select
                        key={field.name}
                        allowClear={!field.required}
                        placeholder={field.name}
                        value={request.attributes?.[field.name] as boolean | undefined}
                        options={[
                          { value: true, label: "Yes" },
                          { value: false, label: "No" },
                        ]}
                        onChange={(value) =>
                          updateRequest(index, {
                            attributes: { ...request.attributes, [field.name]: value },
                          })
                        }
                      />
                    ) : (
                      <Input
                        key={field.name}
                        placeholder={field.name}
                        value={request.attributes?.[field.name] as string | undefined}
                        onChange={(event) =>
                          updateRequest(index, {
                            attributes: { ...request.attributes, [field.name]: event.target.value },
                          })
                        }
                      />
                    )
                  )}
              </div>
            </Card>
          );
        })}

        {outcome && outcome !== "CONVERTED" ? (
          <Button
            icon={<PlusOutlined />}
            onClick={() => setRequests((current) => [...current, newRequest("OUT_OF_STOCK")])}
          >
            Add another request
          </Button>
        ) : null}
        {outcome ? (
          <Flex gap={8} wrap>
            <Button
              type="primary"
              size="large"
              onClick={() => submit(false)}
              loading={mutation.isPending}
              disabled={!canSave}
            >
              Save visit
            </Button>
            <Button
              size="large"
              onClick={() => submit(true)}
              disabled={mutation.isPending || !canSave}
            >
              Save & New
            </Button>
          </Flex>
        ) : null}
      </Space>
    </Drawer>
  );
}

export default function DemandIntelligencePage() {
  const { storeId } = useStore();
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
  const data = query.data;
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
  return (
    <div className="demand-intelligence-page">
      <Flex justify="space-between" align="flex-start" gap={12} wrap style={{ marginBottom: 16 }}>
        <div>
          <Typography.Title level={2} style={{ margin: 0 }}>
            Demand Intelligence
          </Typography.Title>
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
      </Flex>
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
            style={{ marginBottom: 14 }}
          />
          <div className="demand-summary-grid">
            {metricCards.map(([label, value]) => (
              <Card size="small" key={label}>
                <Statistic title={label} value={value} />
              </Card>
            ))}
          </div>
          <div className="demand-two-column">
            <Card title="Why Sales Were Lost">
              {data.reasons.length ? (
                data.reasons.map((reason) => (
                  <div key={reason.reasonCode} style={{ marginBottom: 12 }}>
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
          <Card title="Demand vs Availability" style={{ marginTop: 14 }}>
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
          <Card title="Category Demand" style={{ marginTop: 14 }}>
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
      <VisitCapture open={captureOpen} onClose={() => setCaptureOpen(false)} storeId={storeId} />
      <style jsx global>{`
        .demand-summary-grid {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 10px;
          margin-bottom: 14px;
        }
        .demand-two-column {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }
        .demand-outcome-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
        }
        .demand-form-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }
        @media (max-width: 1000px) {
          .demand-summary-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }
        @media (max-width: 767px) {
          .demand-summary-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .demand-two-column,
          .demand-form-grid {
            grid-template-columns: 1fr;
          }
          .demand-outcome-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
