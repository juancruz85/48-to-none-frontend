import type { NextConfig } from "next";

// Served at lafluke.com/48toNone via a rewrite in the lafluke project.
// (reactCompiler / cacheComponents / tailwind turbopack loader removed: those packages
// aren't installed, and they were never active before — the old empty next.config.js shadowed this file.)
const nextConfig: NextConfig = {
  basePath: "/48toNone",
};

export default nextConfig;
