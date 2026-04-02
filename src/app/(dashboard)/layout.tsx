"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { App, Flex, Spin } from "antd";
import { StoreProvider } from "@/providers/StoreProvider";
import AppLayout from "@/modules/layout/components/AppLayout";

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }

    if (session?.user) {
      if (!session.user.emailVerified) {
        router.replace("/verify-email");
        return;
      }
      if (!session.user.orgId && session.user.role !== "SUPER_ADMIN") {
        router.replace("/onboarding");
        return;
      }
    }
  }, [session, status, router]);

  if (status === "loading") {
    return (
      <Flex justify="center" align="center" style={{ height: "100vh" }}>
        <Spin size="large" />
      </Flex>
    );
  }

  // Prevent flash of dashboard content while redirecting
  if (
    status === "unauthenticated" ||
    (session?.user && !session.user.emailVerified) ||
    (session?.user && !session.user.orgId && session.user.role !== "SUPER_ADMIN")
  ) {
    return null;
  }

  return (
    <App>
      <StoreProvider defaultStoreId={null}>
        <AppLayout>{children}</AppLayout>
      </StoreProvider>
    </App>
  );
}

export default DashboardLayout;
