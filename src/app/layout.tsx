import type { Metadata } from "next";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { AuthProvider } from "@/providers/AuthProvider";
import { QueryProvider } from "@/providers/QueryProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { EmotionRegistry } from "@/providers/EmotionRegistry";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stockiva — Inventory Management",
  description: "Clothing retail inventory management system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <EmotionRegistry>
          <AuthProvider>
            <QueryProvider>
              <AntdRegistry>
                <ThemeProvider>{children}</ThemeProvider>
              </AntdRegistry>
            </QueryProvider>
          </AuthProvider>
        </EmotionRegistry>
      </body>
    </html>
  );
}
