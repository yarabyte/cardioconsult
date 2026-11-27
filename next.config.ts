import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Image Docker (P19) — sortie autonome pour runner non-root.
  output: "standalone",
  // Multi-tenant + RBAC headers (proxy) : Cache Components /
  // Partial Prefetching déclenchent des erreurs « instant » dès qu’un layout
  // appelle notFound()/cookies()/params hors Suspense. Désactivés volontairement.
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
