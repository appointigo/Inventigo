"use client";

import { Form, Input, Button, Space } from "antd";

interface ResetPasswordModalProps {
  onSubmit: (newPassword: string) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export default function ResetPasswordModal({
  onSubmit,
  onCancel,
  loading,
}: ResetPasswordModalProps) {
  const [form] = Form.useForm<{ newPassword: string; confirm: string }>();

  const handleFinish = ({ newPassword }: { newPassword: string; confirm: string }) => {
    return onSubmit(newPassword);
  };

  return (
    <Form form={form} layout="vertical" onFinish={handleFinish}>
      <Form.Item
        name="newPassword"
        label="New Password"
        rules={[
          { required: true, message: "Please enter a new password" },
          { min: 6, message: "Password must be at least 6 characters" },
        ]}
      >
        <Input.Password placeholder="Min. 6 characters" />
      </Form.Item>

      <Form.Item
        name="confirm"
        label="Confirm Password"
        dependencies={["newPassword"]}
        rules={[
          { required: true, message: "Please confirm the password" },
          ({ getFieldValue }) => ({
            validator(_, value) {
              if (!value || getFieldValue("newPassword") === value) {
                return Promise.resolve();
              }
              return Promise.reject(new Error("Passwords do not match"));
            },
          }),
        ]}
      >
        <Input.Password placeholder="Repeat new password" />
      </Form.Item>

      <Form.Item style={{ marginBottom: 0, textAlign: "right" }}>
        <Space>
          <Button onClick={onCancel}>Cancel</Button>
          <Button type="primary" htmlType="submit" loading={loading} danger>
            Reset Password
          </Button>
        </Space>
      </Form.Item>
    </Form>
  );
}
