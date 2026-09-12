import { Layers } from "lucide-react";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Preferences } from "@/components/preferences";
import "./auth.css";

export async function AuthShell({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("Auth");
  return (
    <main id="main" className="auth-shell">
      <section className="auth-entry" aria-label={t("access")}>
        <div className="auth-brand">
          <span className="auth-mark">
            <Layers aria-hidden="true" size={22} />
          </span>
          <span>NOMERA</span>
        </div>
        <div className="auth-content">{children}</div>
        <footer className="auth-footer">
          <span>{t("platform")}</span>
          <Preferences />
        </footer>
      </section>
      <aside className="auth-story" aria-label={t("travel")}>
        <div className="auth-story-heading">
          <p>{t("storyEyebrow")}</p>
          <h2>{t("storyTitle")}</h2>
        </div>
        <Image
          className="auth-art"
          src="/images/nomera-travel.webp"
          alt=""
          width={1448}
          height={1086}
          sizes="(max-width: 767px) 100vw, 63vw"
          priority
        />
        <p className="auth-story-caption">{t("storyCaption")}</p>
      </aside>
    </main>
  );
}
