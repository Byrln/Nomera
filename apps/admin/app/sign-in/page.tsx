import { getTranslations } from "next-intl/server";
import { AuthForm } from "@/components/auth-form";
import { AuthShell } from "@/components/auth-shell";

export async function generateMetadata() {
  const t = await getTranslations("Auth");
  return { title: `${t("signIn")} · NOMERA` };
}
export default async function SignInPage() {
  const t = await getTranslations("Auth");
  return (
    <AuthShell>
      <h1>{t("title")}</h1>
      <p className="auth-intro">{t("description")}</p>
      <AuthForm />
      <p className="auth-help">{t("help")}</p>
    </AuthShell>
  );
}
