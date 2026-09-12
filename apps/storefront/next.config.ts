import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const config: NextConfig = {
  transpilePackages: [
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
