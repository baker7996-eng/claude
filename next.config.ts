import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Write-ups are markdown files in /writeups, read at request time.
  outputFileTracingIncludes: {
    "/**": ["./writeups/**/*"],
  },
};

export default nextConfig;
