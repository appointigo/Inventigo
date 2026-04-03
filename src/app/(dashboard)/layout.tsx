"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { App, Flex, Spin } from "antd";
import { StoreProvider } from "@/providers/StoreProvider";
import AppLayout from "@/modules/layout/components/AppLayout";

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  // On first load the JWT cookie may be stale (e.g. right after onboarding).
  // Attempt one DB-backed refresh before deciding to redirect to /onboarding.
  const orgRefreshAttempted = useRef(false);

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
        if (!orgRefreshAttempted.current) {
          // JWT may be stale — re-run the JWT callback against DB once
          orgRefreshAttempted.current = true;
          update();
          return;
        }
        // Already refreshed; user genuinely has no org
        router.replace("/onboarding");
      }
    }
  }, [session, status, router, update]);

  if (status === "loading") {
    return (
      <Flex justify="center" align="center" style={{ height: "100vh" }}>
        <Spin size="large" />
      </Flex>
    );
  }

  // Show spinner while waiting for the session refresh to settle
  if (
    status === "unauthenticated" ||
    (session?.user && !session.user.emailVerified) ||
    (session?.user && !session.user.orgId && session.user.role !== "SUPER_ADMIN")
  ) {
    return (
      <Flex justify="center" align="center" style={{ height: "100vh" }}>
        <Spin size="large" />
      </Flex>
    );
  }

  return (
    <App>
      <StoreProvider defaultStoreId={session?.user?.storeId ?? null}>
        <AppLayout>{children}</AppLayout>
      </StoreProvider>
    </App>
  );
}

export default DashboardLayout;
