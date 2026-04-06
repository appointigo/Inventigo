"use client";

import { Button, Input, Select, Switch, Space, Card, Empty, Tag, Flex } from "antd";
import { PlusOutlined, DeleteOutlined, HolderOutlined } from "@ant-design/icons";
import type { AttributeField } from "../types";

interface AttributeSchemaBuilderProps {
  value?: AttributeField[];
  onChange?: (fields: AttributeField[]) => void;
}

const FIELD_TYPES = [
  { label: "Text", value: "text" },
  { label: "Select (Dropdown)", value: "select" },
  { label: "Number", value: "number" },
] as const;

const COLOR_PALETTE = [
  { name: "Red", hex: "#E53E3E" },
  { name: "Coral", hex: "#FF6B6B" },
  { name: "Orange", hex: "#F6863A" },
  { name: "Amber", hex: "#F59E0B" },
  { name: "Yellow", hex: "#F6E05E" },
  { name: "Lime", hex: "#84CC16" },
  { name: "Green", hex: "#48BB78" },
  { name: "Teal", hex: "#38B2AC" },
  { name: "Cyan", hex: "#4FD1C5" },
  { name: "Sky Blue", hex: "#63B3ED" },
  { name: "Blue", hex: "#4299E1" },
  { name: "Navy", hex: "#2A4A7F" },
  { name: "Indigo", hex: "#5A67D8" },
  { name: "Violet", hex: "#805AD5" },
  { name: "Purple", hex: "#9F7AEA" },
  { name: "Pink", hex: "#F687B3" },
  { name: "Rose", hex: "#FC8181" },
  { name: "Maroon", hex: "#742A2A" },
  { name: "Brown", hex: "#92400E" },
  { name: "Tan", hex: "#D2B48C" },
  { name: "Beige", hex: "#F5F5DC" },
  { name: "Cream", hex: "#FFFDD0" },
  { name: "Olive", hex: "#808000" },
  { name: "Gold", hex: "#FFD700" },
  { name: "Silver", hex: "#C0C0C0" },
  { name: "White", hex: "#FFFFFF" },
  { name: "Light Grey", hex: "#E2E8F0" },
  { name: "Grey", hex: "#718096" },
  { name: "Dark Grey", hex: "#4A5568" },
  { name: "Black", hex: "#1A202C" },
];

const colorHex = (name: string) =>
  COLOR_PALETTE.find((c) => c.name.toLowerCase() === name.toLowerCase())?.hex;

const AttributeSchemaBuilder = ({ value: fields = [], onChange }: AttributeSchemaBuilderProps) => {
  const updateField = (index: number, patch: Partial<AttributeField>) => {
    const updated = fields.map((f, i) => (i === index ? { ...f, ...patch } : f));
    onChange?.(updated);
  };

  const addField = () => {
    onChange?.([...fields, { name: "", type: "text", required: false }]);
  };

  const removeField = (index: number) => {
    onChange?.(fields.filter((_, i) => i !== index));
  };

  const isColorField = (field: AttributeField) =>
    field.name.trim().toLowerCase() === "color" && field.type === "select";

  return (
    <div>
      {fields.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="No attribute fields defined"
          style={{ margin: "12px 0" }}
        />
      ) 
      : (
        <Flex vertical gap={8}>
          {fields.map((field, index) => (
            <Card
              key={index}
              size="small"
              styles={{ body: { padding: "8px 12px" } }}
            >
              <Flex gap={8} align="start" wrap>
                <HolderOutlined style={{ color: "#bbb", marginTop: 8, cursor: "grab" }} />
                <Input
                  placeholder="Field name"
                  value={field.name}
                  onChange={(e) => updateField(index, { name: e.target.value })}
                  style={{ width: 140 }}
                />
                <Select
                  value={field.type}
                  onChange={(type) => {
                    const patch: Partial<AttributeField> = { type: type as AttributeField["type"] };
                    if (type !== "select") patch.options = undefined;
                    updateField(index, patch);
                  }}
                  options={[...FIELD_TYPES]}
                  style={{ width: 150 }}
                />
                {field.type === "select" && isColorField(field) && (
                  <Select
                    mode="multiple"
                    placeholder="Select colors…"
                    value={field.options ?? []}
                    onChange={(opts) => updateField(index, { options: opts })}
                    style={{ minWidth: 220, flex: 1 }}
                    optionRender={(opt) => {
                      const hex = colorHex(String(opt.value));
                      return (
                        <Space size={6}>
                          <span
                            style={{
                              display: "inline-block",
                              width: 14,
                              height: 14,
                              borderRadius: "50%",
                              background: hex ?? "#ccc",
                              border: "1px solid rgba(0,0,0,0.15)",
                              flexShrink: 0,
                              verticalAlign: "middle",
                            }}
                          />
                          {String(opt.label)}
                        </Space>
                      );
                    }}
                    tagRender={(props) => {
                      const hex = colorHex(String(props.value));
                      return (
                        <Tag
                          closable={props.closable}
                          onClose={props.onClose}
                          style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
                        >
                          <span
                            style={{
                              display: "inline-block",
                              width: 10,
                              height: 10,
                              borderRadius: "50%",
                              background: hex ?? "#ccc",
                              border: "1px solid rgba(0,0,0,0.15)",
                              flexShrink: 0,
                            }}
                          />
                          {String(props.value)}
                        </Tag>
                      );
                    }}
                    options={COLOR_PALETTE.map((c) => ({ label: c.name, value: c.name }))}
                  />
                )}
                {field.type === "select" && !isColorField(field) && (
                  <Select
                    mode="tags"
                    placeholder="Type options and press Enter"
                    value={field.options ?? []}
                    onChange={(options) => updateField(index, { options })}
                    style={{ minWidth: 200, flex: 1 }}
                    tokenSeparators={[","]}
                  />
                )}
                <Space size={4} style={{ marginTop: 4 }}>
                  <Switch
                    size="small"
                    checked={field.required}
                    onChange={(required) => updateField(index, { required })}
                  />
                  <span style={{ fontSize: 12, color: "#888" }}>Required</span>
                </Space>
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => removeField(index)}
                  style={{ marginLeft: "auto" }}
                />
              </Flex>
            </Card>
          ))}
        </Flex>
      )}
      <Button
        type="dashed"
        onClick={addField}
        icon={<PlusOutlined />}
        block
        style={{ marginTop: 8 }}
      >
        Add Attribute Field
      </Button>
    </div>
  );
}

export default AttributeSchemaBuilder;