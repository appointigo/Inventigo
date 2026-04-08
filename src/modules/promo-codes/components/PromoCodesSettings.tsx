"use client";

import { useState, useMemo } from "react";
import { App, Button, Input, InputNumber, Modal, Form, DatePicker, Tooltip, Spin, Popconfirm, Flex } from "antd";
import { PlusOutlined, SearchOutlined, EditOutlined, CopyOutlined, PauseOutlined, PlayCircleOutlined, DeleteOutlined, EyeOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { usePromoCodes } from "../hooks/usePromoCodes";
import type { PromoCode, CreatePromoInput, UpdatePromoInput } from "../types";
import PromoUsageModal from "./PromoUsageModal";
import {
  Wrap,
  StatsRow,
  StatCard,
  StatIcon,
  StatVal,
  StatLbl,
  TopBar,
  PromoGrid,
  PromoCard,
  CardHeader,
  PromoBadge,
  PromoPct,
  CardBody,
  PromoDesc,
  MetaRow,
  Pill,
  CardActions,
  EmptyState,
  GRADIENTS,
  INACTIVE_GRADIENT,
} from "./PromoCodesSettings.styled";

type FormValues = {
  code: string;
  label: string;
  desc?: string;
  discountPct: number;
  maxUses?: number | null;
  expiresAt?: dayjs.Dayjs | null;
};

// ─── Main component ───────────────────────────────────────────────────────────

const PromoCodesSettings = () => {
  const { message } = App.useApp();
  const { promos, loading, createPromo, updatePromo, deletePromo } = usePromoCodes();

  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<PromoCode | null>(null);
  const [saving, setSaving] = useState(false);
  const [usagePromo, setUsagePromo] = useState<PromoCode | null>(null);
  const [usageModalOpen, setUsageModalOpen] = useState(false);

  const [form] = Form.useForm<FormValues>();

  // ─── Stats ──────────────────────────────────────────────────────────────────
  const totalPromos = promos.length;
  const activePromos = promos.filter((p) => p.isActive).length;
  const totalUses = promos.reduce((sum, p) => sum + p.usageCount, 0);

  // ─── Filtered list ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return promos;

    return promos.filter(
      (p) => p.code.toLowerCase().includes(q) || p.label.toLowerCase().includes(q)
    );
  }, [promos, search]);

  // ─── Modal open/close ────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditingPromo(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (promo: PromoCode) => {
    setEditingPromo(promo);
    form.setFieldsValue({
      code: promo.code,
      label: promo.label,
      desc: promo.desc,
      discountPct: promo.discountPct,
      maxUses: promo.maxUses ?? undefined,
      expiresAt: promo.expiresAt ? dayjs(promo.expiresAt) : null,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingPromo(null);
    form.resetFields();
  };

  // ─── Save ────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    let values: FormValues;
    try {
      values = await form.validateFields();
    } 
    catch (error) {
        console.error(error);
        message.error("Please fix the validation errors in the form.");
        return;
    }

    setSaving(true);
    try {
      const payload: CreatePromoInput = {
        code: values.code,
        label: values.label,
        desc: values.desc ?? "",
        discountPct: values.discountPct,
        maxUses: values.maxUses ?? null,
        expiresAt: values.expiresAt ? values.expiresAt.toISOString() : null,
      };

      if (editingPromo) {
        const { error } = await updatePromo(editingPromo.id, payload as UpdatePromoInput);
        if (error) {
          message.error(error);
          return;
        }
        message.success("Promo updated");
      } 
      else {
        const { error } = await createPromo(payload);
        if (error) {
          message.error(error);
          return;
        }
        message.success("Promo created");
      }
      closeModal();
    } 
    finally {
      setSaving(false);
    }
  };

  // ─── Toggle active ────────────────────────────────────────────────────────────
  const handleToggle = async (promo: PromoCode) => {
    const { error } = await updatePromo(promo.id, { isActive: !promo.isActive });
    if (error) message.error(error);

    else message.success(promo.isActive ? "Promo paused" : "Promo activated");
  };

  // ─── Delete ──────────────────────────────────────────────────────────────────
  const handleDelete = async (promo: PromoCode) => {
    const { error } = await deletePromo(promo.id);
    if (error) message.error(error);
    
    else message.success("Promo deleted");
  };

  // ─── Copy code to clipboard ───────────────────────────────────────────────────
  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code).then(() => message.success(`Copied: ${code}`));
  };

  // ─── View usage ───────────────────────────────────────────────────────────────
  const handleViewUsage = (promo: PromoCode) => {
    setUsagePromo(promo);
    setUsageModalOpen(true);
  };

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <Wrap>
      {/* Stats row */}
      <StatsRow>
        <StatCard>
          <StatIcon $color="blue">🏷️</StatIcon>
          <div>
            <StatVal>{totalPromos}</StatVal>
            <StatLbl>Total Promos</StatLbl>
          </div>
        </StatCard>
        <StatCard>
          <StatIcon $color="green">✅</StatIcon>
          <div>
            <StatVal>{activePromos}</StatVal>
            <StatLbl>Active</StatLbl>
          </div>
        </StatCard>
        <StatCard>
          <StatIcon $color="amber">📊</StatIcon>
          <div>
            <StatVal>{totalUses}</StatVal>
            <StatLbl>Times Used</StatLbl>
          </div>
        </StatCard>
      </StatsRow>

      {/* Top bar */}
      <TopBar>
        <h2>Promo Codes &amp; Offers</h2>
        <Input
          prefix={<SearchOutlined style={{ color: "#9ca3af" }} />}
          placeholder="Search by code or label…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          allowClear
          style={{ width: 220, borderRadius: 20 }}
        />
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={openCreate}
          style={{
            borderRadius: 20,
            background: "linear-gradient(135deg, #2563eb, #4f46e5)",
            border: "none",
            fontWeight: 600,
            boxShadow: "0 2px 8px rgba(37,99,235,.35)",
          }}
        >
          New Promo
        </Button>
      </TopBar>

      {/* Grid */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <Spin size="large" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState>
          <div className="icon">🏷️</div>
          <p>
            {search ? "No promo codes match your search" : "No promo codes yet — create your first one!"}
          </p>
        </EmptyState>
      ) : (
        <PromoGrid>
          {filtered.map((promo, idx) => {
            const gradient = promo.isActive
              ? GRADIENTS[idx % GRADIENTS.length]
              : INACTIVE_GRADIENT;
            const isExpired = promo.expiresAt
              ? new Date(promo.expiresAt) < new Date()
              : false;

            return (
              <PromoCard key={promo.id} $inactive={!promo.isActive}>
                <CardHeader $gradient={gradient}>
                  <PromoBadge>{promo.code}</PromoBadge>
                  <PromoPct>
                    {promo.discountPct}
                    <span>% OFF</span>
                  </PromoPct>
                </CardHeader>

                <CardBody>
                  <PromoDesc>
                    {promo.desc || promo.label}
                  </PromoDesc>
                  <MetaRow>
                    <Pill $variant={promo.isActive ? "active" : "inactive"}>
                      {promo.isActive ? "● Active" : "✕ Inactive"}
                    </Pill>
                    <Tooltip title="Click to view all sales that used this promo">
                      <Pill $variant="used" onClick={() => handleViewUsage(promo)}>
                        <EyeOutlined />
                        {promo.usageCount} use{promo.usageCount !== 1 ? "s" : ""}
                      </Pill>
                    </Tooltip>
                    {promo.maxUses !== null && (
                      <Pill $variant="exp">
                        Max: {promo.maxUses}
                      </Pill>
                    )}
                    {promo.expiresAt && (
                      <Pill $variant="exp">
                        {isExpired ? "Expired" : `Exp ${new Date(promo.expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`}
                      </Pill>
                    )}
                  </MetaRow>
                </CardBody>

                <CardActions>
                  <Tooltip title="Edit">
                    <Button
                      size="small"
                      icon={<EditOutlined />}
                      onClick={() => openEdit(promo)}
                      style={{ borderRadius: 7, fontSize: 12 }}
                    >
                      Edit
                    </Button>
                  </Tooltip>
                  <Tooltip title="Copy code">
                    <Button
                      size="small"
                      icon={<CopyOutlined />}
                      onClick={() => handleCopy(promo.code)}
                      style={{ borderRadius: 7, fontSize: 12 }}
                    >
                      Copy
                    </Button>
                  </Tooltip>
                  <Tooltip title={promo.isActive ? "Pause promo" : "Activate promo"} destroyOnHidden>
                    <Button
                      size="small"
                      icon={promo.isActive ? <PauseOutlined /> : <PlayCircleOutlined />}
                      onClick={() => handleToggle(promo)}
                      style={{ borderRadius: 7, fontSize: 12 }}
                      danger={promo.isActive}
                    >
                      {promo.isActive ? "Pause" : "Activate"}
                    </Button>
                  </Tooltip>
                  <Popconfirm
                    title="Delete this promo?"
                    description="This cannot be undone."
                    okText="Delete"
                    okType="danger"
                    cancelText="Cancel"
                    onConfirm={() => handleDelete(promo)}
                  >
                    <Tooltip title="Delete" destroyOnHidden>
                      <Button
                        size="small"
                        icon={<DeleteOutlined />}
                        danger
                        style={{ borderRadius: 7, fontSize: 12, marginLeft: "auto" }}
                      />
                    </Tooltip>
                  </Popconfirm>
                </CardActions>
              </PromoCard>
            );
          })}
        </PromoGrid>
      )}

      {/* Create / Edit modal */}
      <Modal
        open={modalOpen}
        onCancel={closeModal}
        onOk={handleSave}
        okText={editingPromo ? "Save Changes" : "💾 Create Promo"}
        cancelText="Cancel"
        okButtonProps={{ loading: saving, style: { borderRadius: 9, background: "linear-gradient(135deg,#2563eb,#4f46e5)", border: "none" } }}
        cancelButtonProps={{ style: { borderRadius: 9 } }}
        title={
          <Flex align="center" gap={10}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: "linear-gradient(135deg, #2563eb, #4f46e5)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 17,
              }}
            >
              🏷️
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>
                {editingPromo ? "Edit Promo Code" : "Create New Promo Code"}
              </div>
              <div style={{ fontSize: 12, color: "#9ca3af", fontWeight: 400 }}>
                Appears in the Available Offers dropdown on the billing page
              </div>
            </div>
          </Flex>
        }
        width={480}
        styles={{ body: { paddingTop: 8 } }}
      >
        <Form form={form} layout="vertical" size="middle">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Form.Item
              name="code"
              label="Code"
              rules={[
                { required: true, message: "Code is required" },
                { pattern: /^[A-Z0-9_-]+$/i, message: "Letters, numbers, _ and - only" },
              ]}
              normalize={(v: string) => v?.toUpperCase()}
              style={{ marginBottom: 0 }}
            >
              <Input placeholder="e.g. SUMMER20" style={{ fontFamily: "monospace", letterSpacing: 1 }} />
            </Form.Item>

            <Form.Item
              name="discountPct"
              label="Discount %"
              rules={[
                { required: true, message: "Required" },
                { type: "number", min: 1, max: 100, message: "1–100" },
              ]}
              style={{ marginBottom: 0 }}
            >
              <InputNumber
                min={1}
                max={100}
                placeholder="e.g. 20"
                suffix="%"
                style={{ width: "100%" }}
              />
            </Form.Item>
          </div>

          <Form.Item
            name="label"
            label="Display Label"
            rules={[{ required: true, message: "Label is required" }]}
            style={{ marginTop: 12, marginBottom: 0 }}
          >
            <Input placeholder='e.g. "20% Summer Sale"' />
          </Form.Item>

          <Form.Item
            name="desc"
            label="Description"
            style={{ marginTop: 12, marginBottom: 0 }}
          >
            <Input.TextArea
              rows={2}
              placeholder="Short description shown in the billing dropdown…"
              style={{ resize: "none" }}
            />
          </Form.Item>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
            <Form.Item name="expiresAt" label="Expiry Date" style={{ marginBottom: 0 }}>
              <DatePicker
                style={{ width: "100%" }}
                disabledDate={(d) => d && d.isBefore(dayjs(), "day")}
                placeholder="No expiry"
              />
            </Form.Item>

            <Form.Item name="maxUses" label="Usage Limit" style={{ marginBottom: 0 }}>
              <InputNumber
                min={1}
                placeholder="Unlimited"
                style={{ width: "100%" }}
              />
            </Form.Item>
          </div>
        </Form>
      </Modal>

      {/* Usage history modal */}
      <PromoUsageModal
        promo={usagePromo}
        open={usageModalOpen}
        onClose={() => {
          setUsageModalOpen(false);
          setUsagePromo(null);
        }}
      />
    </Wrap>
  );
}

export default PromoCodesSettings;