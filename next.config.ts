import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["*.trycloudflare.com"],

  outputFileTracingIncludes: {
    "/api/billing": ["./node_modules/@sparticuz/chromium/bin/**/*"],
    "/api/billing/*": ["./node_modules/@sparticuz/chromium/bin/**/*"],
    "/api/barcode/export-pdf": ["./node_modules/@sparticuz/chromium/bin/**/*"],
    "/api/whatsapp/invoices": ["./node_modules/@sparticuz/chromium/bin/**/*"],
    "/api/cron/whatsapp-campaigns": ["./node_modules/@sparticuz/chromium/bin/**/*"],
  },

  transpilePackages: ["antd", "@ant-design/icons"],

  poweredByHeader: false,

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
