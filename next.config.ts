import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Riders arrive as multi-page PDFs and photo sets; allow them through server actions.
    serverActions: { bodySizeLimit: "40mb" },
  },
  serverExternalPackages: ["@libsql/client", "mammoth"],
};

export default nextConfig;
