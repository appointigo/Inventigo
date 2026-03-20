"use client";

import { Button, Input, Select, Switch, Space, Card, Empty } from "antd";
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

export default function AttributeSchemaBuilder({
  value: fields = [],
  onChange,
}: AttributeSchemaBuilderProps) {
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

  return (
    <div>
      {fields.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="No attribute fields defined"
          style={{ margin: "12px 0" }}
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {fields.map((field, index) => (
            <Card
              key={index}
              size="small"
              styles={{ body: { padding: "8px 12px" } }}
            >
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                }}
              >
                <HolderOutlined
                  style={{ color: "#bbb", marginTop: 8, cursor: "grab" }}
                />
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
                {field.type === "select" && (
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
              </div>
            </Card>
          ))}
        </div>
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
