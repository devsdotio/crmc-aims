import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;

// Bindings emulation for `next dev` only — must not run during CI/`next build`
// or Hyperdrive will require CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_*.
if (process.env.NODE_ENV === "development") {
  initOpenNextCloudflareForDev();
}
