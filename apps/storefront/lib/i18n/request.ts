import { localeCookie, resolveLocale } from "@nomera/i18n";
import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
export default getRequestConfig(async () => {
  const locale = resolveLocale((await cookies()).get(localeCookie)?.value);
  return {
    locale,
    timeZone: "Asia/Ulaanbaatar",
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
