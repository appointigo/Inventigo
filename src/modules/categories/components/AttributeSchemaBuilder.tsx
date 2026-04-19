"use client";

import { Button, Input, Select, Switch, Space, Card, Empty, Tag, Flex } from "antd";
import { PlusOutlined, DeleteOutlined, HolderOutlined } from "@ant-design/icons";
import type { AttributeField } from "../types";
import { useAttributeColors } from "../hooks/useAttributeColors";

interface AttributeSchemaBuilderProps {
  value?: AttributeField[];
  onChange?: (fields: AttributeField[]) => void;
}

const FIELD_TYPES = [
  { label: "Text", value: "text" },
  { label: "Select (Dropdown)", value: "select" },
  { label: "Number", value: "number" },
] as const;

const AttributeSchemaBuilder = ({ value: fields = [], onChange }: AttributeSchemaBuilderProps) => {
  // Get colors from service (memoized, no re-renders on prop changes)
  const { colors, getHex } = useAttributeColors();

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
    (field.name ?? "").trim().toLowerCase() === "color" && field.type === "select";

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
                    onChange={(opts) => {
                      // If Select All is chosen, select all colors
                      if (opts.includes("__ALL__")) {
                        updateField(index, { options: colors.map((c) => c.name) });
                      } else {
                        updateField(index, { options: opts });
                      }
                    }}
                    style={{ minWidth: 220, flex: 1 }}
                    optionRender={(opt) => {
                      if (opt.value === "__ALL__") {
                        return <b>Select All</b>;
                      }
                      const hex = getHex(String(opt.value));
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
                      if (props.value === "__ALL__") return <></>;
                      const hex = getHex(String(props.value));

                      return (
                        <Tag
                          closable={props.closable}
                          onClose={props.onClose}
                        >
                          <span
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: "50%",
                              background: hex ?? "#ccc",
                              display: "inline-block",
                              marginRight: 4,
                            }}
                          />
                          {props.label}
                        </Tag>
                      );
                    }}

                    options={[
                      { label: "Select All", value: "__ALL__" },
                      ...colors.map((c) => ({ label: c.name, value: c.name })),
                    ]}
                    maxTagCount={3}
                    maxTagPlaceholder={(omittedValues) => {
                      return `+${Array.isArray(omittedValues) ? omittedValues.length : 0} more`;
                    }}
                  />
                )}
                {field.type === "select" && !isColorField(field) && (
                  <Select
                    mode="tags"
                    placeholder="Type options and press Enter"
                    value={field.options ?? []}
                    onChange={(options) => {
                      // If Select All is chosen, select all available options (excluding __ALL__)
                      if (options.includes("__ALL__")) {
                        // All options are those already present in the dropdown (excluding __ALL__)
                        const allOpts = options.filter((o) => o !== "__ALL__");
                        updateField(index, { options: allOpts });
                      } else {
                        updateField(index, { options });
                      }
                    }}
                    style={{ minWidth: 200, flex: 1 }}
                    tokenSeparators={[","]}
                    options={[
                      { label: "Select All", value: "__ALL__" },
                      ...(field.options ?? []).map((o) => ({ label: o, value: o })),
                    ]}
                    maxTagCount={3}
                    maxTagPlaceholder={(omittedValues) => {
                      return `+${Array.isArray(omittedValues) ? omittedValues.length : 0} more`;
                    }}
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