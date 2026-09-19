import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const config: NextConfig = {
  // Keep isolated local QA from sharing the active developer server's build cache.
  distDir: process.env.NOMERA_LOCAL_QA === "1" ? ".next-qa" : ".next",
  transpilePackages: [
    "@nomera/storefront-themes",
    "@nomera/ui",
    "@nomera/postgres",
    "@nomera/domain",
    "@nomera/config",
    "@nomera/schemas",
    "@nomera/i18n",
  ],
  poweredByHeader: false,
  devIndicators: false,
};
export default createNextIntlPlugin("./lib/i18n/request.ts")(config);
