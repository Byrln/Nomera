import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const config: NextConfig = {
  distDir: process.env.NOMERA_LOCAL_QA === "1" ? ".next-qa" : ".next",
  transpilePackages: [
    "@nomera/storefront-themes",
    "@nomera/domain",
    "@nomera/ui",
    "@nomera/postgres",
    "@nomera/config",
    "@nomera/schemas",
    "@nomera/i18n",
  ],
  poweredByHeader: false,
  devIndicators: false,
};
export default createNextIntlPlugin("./lib/i18n/request.ts")(config);
