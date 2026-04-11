"use client";

import { useEffect } from "react";
import { Form, Input, Select, Switch, Button, Space } from "antd";
import { Role } from "@prisma/client";
import { ROLE_LABELS, ROLE_COLORS } from "@/shared/constants/roles";
import type { AppUser, CreateUserInput, UpdateUserInput } from "../types";
import type { StoreRecord } from "../types";

type UserFormValues = {
  name: string;
  email: string;
  password?: string;
  role: Role;
  storeId: string | null;
  isActive?: boolean;
};

interface UserFormProps {
  initialValues?: AppUser | null;
  stores: StoreRecord[];
  onSubmit: (values: CreateUserInput | UpdateUserInput) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export default function UserForm({
  initialValues,
  stores,
  onSubmit,
  onCancel,
  loading,
}: UserFormProps) {
  const [form] = Form.useForm<UserFormValues>();
  const isEdit = !!initialValues;
  const selectedRole = Form.useWatch("role", form);

  useEffect(() => {
    if (initialValues) {
      form.setFieldsValue({
        name: initialValues.name,
        email: initialValues.email,
        role: initialValues.role,
        storeId: initialValues.storeId,
        isActive: initialValues.isActive,
      });
    } 
    else {
      form.resetFields();
      form.setFieldsValue({ role: Role.STAFF, isActive: true, storeId: null });
    }
  }, [initialValues, form]);

  const handleFinish = (values: UserFormValues) => {
    if (isEdit) {
      const { password: _p, ...rest } = values;
      return onSubmit(rest as UpdateUserInput);
    }
    return onSubmit(values as CreateUserInput);
  };

    const roleOptions = [Role.ADMIN, Role.MANAGER, Role.STAFF].map((r) => ({
        value: r,
        label: (
            <span style={{ color: ROLE_COLORS[r], fontWeight: 500 }}>
                {ROLE_LABELS[r]}
            </span>
        ),
    }));

    const storeOptions = stores
        .filter((s) => s.isActive)
        .map((s) => ({ value: s.id, label: s.name }));

  const storeRequired = selectedRole === Role.MANAGER || selectedRole === Role.STAFF;
    
  return (
    <Form form={form} layout="vertical" onFinish={handleFinish}>
      <Form.Item
        name="name"
        label="Full Name"
        rules={[{ required: true, message: "Please enter a name" }]}
      >
        <Input placeholder="e.g. John Smith" />
      </Form.Item>

      <Form.Item
        name="email"
        label="Email"
        rules={[
          { required: true, message: "Please enter an email" },
          { type: "email", message: "Please enter a valid email" },
        ]}
      >
        <Input placeholder="email@example.com" />
      </Form.Item>

      {!isEdit && (
        <Form.Item
          name="password"
          label="Password"
          rules={[
            { required: true, message: "Please enter a password" },
            { min: 6, message: "Password must be at least 6 characters" },
          ]}
        >
          <Input.Password placeholder="Min. 6 characters" />
        </Form.Item>
      )}

      <Form.Item
        name="role"
        label="Role"
        rules={[{ required: true, message: "Please select a role" }]}
      >
        <Select options={roleOptions} />
      </Form.Item>

      <Form.Item
        name="storeId"
        label="Assigned Store"
        rules={storeRequired ? [{ required: true, message: "Please assign a store" }] : undefined}
      >
        <Select
          allowClear
          placeholder="All stores (Admin)"
          options={storeOptions}
        />
      </Form.Item>

      {isEdit && (
        <Form.Item name="isActive" label="Active" valuePropName="checked">
          <Switch />
        </Form.Item>
      )}

      <Form.Item style={{ marginBottom: 0, textAlign: "right" }}>
        <Space>
          <Button onClick={onCancel}>Cancel</Button>
          <Button type="primary" htmlType="submit" loading={loading}>
            {isEdit ? "Update User" : "Create User"}
          </Button>
        </Space>
      </Form.Item>
    </Form>
  );
}
