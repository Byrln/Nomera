import type { StorefrontInput } from "@nomera/schemas/storefront";
import { Button } from "@nomera/ui/components/button";
import type { ReactNode } from "react";
import { themeTokens } from "../tokens";
import type { StorefrontLabels } from "../types";
import { MobileNavigation } from "./navigation";
import { PromotionDialog } from "./promotion-dialog";
import { ThemeProvider } from "./theme-context";
import { TravelImage } from "./travel-image";
export function StorefrontFrame({
  data,
  children,
}: {
  data: StorefrontInput;
  children: ReactNode;
}) {
  return (
    <ThemeProvider theme={data.theme} style={themeTokens(data)}>
      <div
        className={`nomera-storefront sf-${data.theme}`}
        style={themeTokens(data)}
      >
        {children}
      </div>
    </ThemeProvider>
  );
}
export function StorefrontHeader({
  data,
  base,
  labels,
  language,
}: {
  data: StorefrontInput;
  base: string;
  labels: StorefrontLabels;
  language?: ReactNode;
}) {
  const contact = data.sections.some(
    (section) =>
      section.kind === "contact" &&
      section.visible &&
      (section.body || data.email || data.phone),
  );
  const links = (
    <>
      <Button asChild variant="ghost">
        <a href={`${base}/tours`}>{labels.tours}</a>
      </Button>
      {data.sections.some(
        (section) =>
          section.kind === "about" && section.visible && section.body,
      ) && (
        <Button asChild variant="ghost">
          <a href={`${base}#about`}>{labels.sections.about}</a>
        </Button>
      )}
      {contact && (
        <Button asChild variant="outline">
          <a href={`${base}#contact`}>{labels.contact}</a>
        </Button>
      )}
      {language}
    </>
  );
  return (
    <header className="sf-header">
      <a className="sf-brand" href={base}>
        {data.logo && (
          <TravelImage
            src={data.logo}
            alt=""
            className="sf-logo"
            sizes="48px"
          />
        )}
        <span>{data.storeName}</span>
      </a>
      <nav className="sf-desktop-nav" aria-label={labels.ui.menu}>
        {links}
      </nav>
      <MobileNavigation
        data={{
          theme: data.theme,
          storeName: data.storeName,
          primaryColor: data.primaryColor,
          accentColor: data.accentColor,
          font: data.font,
        }}
        labels={labels}
      >
        {links}
      </MobileNavigation>
    </header>
  );
}
export function StorefrontFooter({
  data,
  base,
  labels,
}: {
  data: StorefrontInput;
  base: string;
  labels: StorefrontLabels;
}) {
  return (
    <footer className="sf-footer">
      <div className="sf-footer-main">
        <div className="sf-footer-brand">
          <a href={base}>{data.storeName}</a>
          {data.tagline && <p>{data.tagline}</p>}
        </div>
        <nav aria-label={labels.tours}>
          <h2>{labels.tours}</h2>
          <a href={`${base}/tours`}>{labels.ui.allTours}</a>
          {Object.values(data.policies).some(Boolean) && (
            <a href={`${base}/policies`}>{labels.policies}</a>
          )}
          <PromotionDialog
            title={labels.ui.promotion}
            description={labels.ui.promotionHelp}
            apply={labels.ui.continue}
            close={labels.ui.close}
            base={base}
          />
        </nav>
        {(data.email || data.phone) && (
          <div>
            <h2>{labels.contact}</h2>
            {data.email && <a href={`mailto:${data.email}`}>{data.email}</a>}
            {data.phone && <a href={`tel:${data.phone}`}>{data.phone}</a>}
          </div>
        )}
      </div>
      <div className="sf-footer-bottom">
        <span>© {data.storeName}</span>
        <span>NOMERA</span>
      </div>
    </footer>
  );
}
