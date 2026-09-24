import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
};

export default nextConfig;

// Do not call initOpenNextCloudflareForDev() during `next dev`.
// Wrangler would emulate Hyperdrive and throw unless
// CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE is set.
// Local Next uses DATABASE_URL via src/server/db/index.ts.
// Production Workers still bind Hyperdrive from wrangler.jsonc.
