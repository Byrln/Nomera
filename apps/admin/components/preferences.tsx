import { Button } from "@nomera/ui";
import { getLocale, getTranslations } from "next-intl/server";
import { setLocale } from "@/app/actions";
import { ThemeToggle } from "@/components/theme-toggle";
export async function Preferences() {
  const locale = await getLocale();
  const t = await getTranslations("Common");
  return (
    <div className="flex items-center gap-2">
      <form action={setLocale}>
        <Button
          type="submit"
          variant="ghost"
          name="locale"
          value={locale === "mn" ? "en" : "mn"}
          aria-label={t("language")}
        >
          {locale === "mn" ? "EN" : "МН"}
        </Button>
      </form>
      <ThemeToggle />
    </div>
  );
}
