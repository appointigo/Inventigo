import type { Metadata } from "next";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { AuthProvider } from "@/providers/AuthProvider";
import { QueryProvider } from "@/providers/QueryProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { EmotionRegistry } from "@/providers/EmotionRegistry";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stockiva — One Platform. Smarter Retail.",
  description:
    "Stockiva brings billing, inventory, customers, returns and business reporting together for modern clothing retailers.",
  applicationName: "Stockiva",
  openGraph: {
    title: "Stockiva — One Platform. Smarter Retail.",
    description: "Everyday retail operations, brought together in one clear platform.",
    type: "website",
  },
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
