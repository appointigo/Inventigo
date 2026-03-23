"use client";

import { Button, Card, Form, Input, Typography, App } from "antd";
import { LockOutlined, MailOutlined } from "@ant-design/icons";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

const { Title, Text } = Typography;

export default function LoginPage() {
  const router = useRouter();
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const { status } = useSession();

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/dashboard");
    }
  }, [status, router]);

  const onFinish = async (values: { email: string; password: string }) => {
    setLoading(true);
    try {
      const result = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
      });

      if (result?.error) {
        message.error("Invalid email or password");
      } else {
        router.push("/dashboard");
      }
    } catch {
      message.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f5f5f5",
      }}
    >
      <Card style={{ width: 400, boxShadow: "0 2px 8px rgba(0,0,0,0.09)" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <Title level={2} style={{ marginBottom: 4 }}>
            Inventigo
          </Title>
          <Text type="secondary">Sign in to your account</Text>
        </div>

        <Form layout="vertical" onFinish={onFinish} autoComplete="off">
          <Form.Item
            name="email"
            rules={[
              { required: true, message: "Please enter your email" },
              { type: "email", message: "Please enter a valid email" },
            ]}
          >
            <Input
              prefix={<MailOutlined />}
              placeholder="Email"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              { required: true, message: "Please enter your password" },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Password"
              size="large"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              size="large"
            >
              Sign In
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
