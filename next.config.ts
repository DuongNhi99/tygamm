import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Route types are generated into .next/types, which makes `tsc --noEmit`
  // depend on having run a build first. Plain TS types are enough here.
  typedRoutes: false,

  // Pin the workspace root. Without it Turbopack walks up and finds the
  // package-lock.json in the parent directory, then warns and resolves
  // modules from there.
  turbopack: {
    root: import.meta.dirname,
  },
};

export default nextConfig;
