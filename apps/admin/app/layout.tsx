import type { Metadata } from "next";
import { Noto_Sans, Noto_Serif } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { Providers } from "./providers";
import "@nomera/ui/styles.css";

const sans = Noto_Sans({
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  variable: "--font-nomera-sans",
  display: "swap",
});
const serif = Noto_Serif({
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  variable: "--font-nomera-serif",
  display: "swap",
});
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Page");
  return {
    title: `NOMERA · ${t("title")}`,
    description: t("description"),
    robots: { index: false, follow: false },
  };
}
export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  const t = await getTranslations("Common");
  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${sans.variable} ${serif.variable} font-sans antialiased`}
      >
        <a className="skip-link" href="#main">
          {t("skip")}
        </a>
        <NextIntlClientProvider>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
