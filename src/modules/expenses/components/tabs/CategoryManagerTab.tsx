import { useState, useMemo } from "react";
import { Card, Button, Input, Form, Modal, Row, Col, Table, Typography, Flex, Tag } from "antd";
import { PlusOutlined, TagOutlined } from "@ant-design/icons";
import type { StoreExpense } from "../../types";
import type { ExpenseCategoryOption } from "../../services/expenseCategoryService";
import { TipCard } from "../ExpenseAdvancedTab.styled";
import { COLOR_PALETTE } from "@/modules/categories/components/AttributeSchemaBuilder";

interface CategoryManagerTabProps {
  categories: ExpenseCategoryOption[];
  expenses: StoreExpense[];
  onAddCategory: (name: string, colorKey: string) => Promise<ExpenseCategoryOption | null>;
  onDeleteCategory: (id: string) => Promise<boolean>;
  canModify: boolean;
}

const CategoryManagerTab = ({ categories, expenses, onAddCategory, onDeleteCategory, canModify }: CategoryManagerTabProps) => {
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [selectedColor, setSelectedColor] = useState("blue");

  // Calculate category usage
  const categoryUsage = useMemo(() => {
    const usage: Record<string, number> = {};
    categories.forEach((cat) => {
      usage[cat.id] = expenses.filter((e) => e.category === cat.name).length;
    });
    return usage;
  }, [categories, expenses]);

  const handleAddCategory = async (values: { name: string }) => {
    const result = await onAddCategory(values.name, selectedColor);
    if (result) {
      form.resetFields();
      setSelectedColor("blue");
      setAddModalOpen(false);
    }
  };

  const handleDeleteCategory = (id: string, name: string) => {
    Modal.confirm({
      title: "Delete Category?",
      content: `Are you sure you want to delete "${name}"? This cannot be undone.`,
      okText: "Delete",
      okType: "danger",
      onOk: async () => {
        await onDeleteCategory(id);
      },
    });
  };

  const usageTableData = categories.map((cat) => ({
    key: cat.id,
    category: cat.name,
    used: categoryUsage[cat.id] ?? 0,
  }));

  return (
    <>
      {/* Two-Column Layout: Manage Categories (Left) + Usage Table (Right) */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        {/* Left Column: Manage Categories */}
        <Col xs={24} lg={14}>
          <Card
            size="small"
            title="🏷️ Manage Categories"
            extra={
              canModify && (
                <Button
                  type="primary"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() => setAddModalOpen(true)}
                >
                  Add Category
                </Button>
              )
            }
            style={{ background: "#f9fafb" }}
          >
            {/* All Categories */}
            <div style={{ marginBottom: 8, fontSize: 12.5, fontWeight: 600, color: "#94a3b8" }}>
              ALL CATEGORIES
            </div>
            <Flex wrap="wrap" gap={8} style={{ marginBottom: 18 }}>
              {categories.length > 0 ? (
                categories.map((cat) => {
                  const colorHex =
                    COLOR_PALETTE.find((c) => c.key === cat.colorKey)?.hex || "#1890ff";

                  return (
                    <Tag
                      key={cat.id}
                      color={colorHex}
                      closable={canModify}
                      onClose={(e) => {
                        e.preventDefault();
                        handleDeleteCategory(cat.id, cat.name);
                      }}
                      variant="outlined"
                      style={{ padding: "6px 10px", fontSize: "14px" }}
                      icon={<TagOutlined />}
                    >
                      {cat.name}
                    </Tag>
                  );
                })
              ) : (
                <Typography.Text type="secondary">
                  No categories yet. Add your first category!
                </Typography.Text>
              )}
            </Flex>
          </Card>
        </Col>

        {/* Right Column: Category Usage Table */}
        <Col xs={24} lg={10}>
          <Card size="small" title="📊 Category Usage — This Month">
            {categories.length > 0 ? (
              <Table
                dataSource={usageTableData}
                rowKey="key"
                pagination={false}
                size="small"
                columns={[
                  {
                    title: "Category",
                    dataIndex: "category",
                    width: "60%",
                    render: (text: string, record: any) => {
                      const category = categories.find((c) => c.id === record.key);
                      const colorHex =
                        COLOR_PALETTE.find((c) => c.key === category?.colorKey)?.hex || "#1890ff";
                      return (
                        <Flex align="center" gap={8}>
                          <div
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              backgroundColor: colorHex,
                            }}
                          />
                          <span>{text}</span>
                        </Flex>
                      );
                    },
                  },
                  {
                    title: "Used",
                    dataIndex: "used",
                    align: "right" as const,
                    width: "40%",
                    render: (count: number) => (
                      <Typography.Text strong>{count}</Typography.Text>
                    ),
                  },
                ]}
              />
            ) : (
              <Typography.Text type="secondary">
                No categories created yet. Create a category to start organizing your expenses.
              </Typography.Text>
            )}
          </Card>
        </Col>
      </Row>

      {/* Add Category Modal */}
      <Modal
        title={<><PlusOutlined /> Add New Category</>}
        open={addModalOpen}
        onCancel={() => {
          setAddModalOpen(false);
          form.resetFields();
          setSelectedColor("blue");
        }}
        footer={null}
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleAddCategory}
          style={{ marginTop: 20 }}
        >
          <Form.Item
            name="name"
            label="Category Name"
            rules={[
              { required: true, message: "Please enter category name" },
              { min: 3, message: "Category name must be at least 3 characters" },
            ]}
          >
            <Input placeholder="e.g., Office Supplies, Travel, etc." />
          </Form.Item>

          <Form.Item label="Select Color">
            <Flex gap={8} wrap>
              {COLOR_PALETTE.map((color) => (
                <Tag
                  key={color.key}
                  color={color.hex}
                  onClick={() => setSelectedColor(color.key)}
                  style={{
                    cursor: "pointer",
                    padding: "6px 12px",
                    border: selectedColor === color.key ? "2px solid #000" : "1px solid transparent",
                  }}
                >
                  {color.key}
                </Tag>
              ))}
            </Flex>
          </Form.Item>

          <Flex justify="flex-end" gap={8} style={{ marginTop: 20 }}>
            <Button
              onClick={() => {
                setAddModalOpen(false);
                form.resetFields();
                setSelectedColor("blue");
              }}
            >
              Cancel
            </Button>
            <Button type="primary" htmlType="submit">
              Create Category
            </Button>
          </Flex>
        </Form>
      </Modal>

      {/* Tip Card */}
      <TipCard size="small" style={{ marginTop: 16 }}>
        <Typography.Text style={{ fontSize: 13, color: "#065f46" }}>
          💡 <strong>Tip:</strong> Create custom categories to organize your expenses better. 
          You can change category colors for visual organization.
        </Typography.Text>
      </TipCard>
    </>
  );
};

export default CategoryManagerTab;