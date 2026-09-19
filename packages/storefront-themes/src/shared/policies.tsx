import { policyKinds, type StorefrontInput } from "@nomera/schemas/storefront";
import { Button } from "@nomera/ui/components/button";
export function StorefrontPolicies({
  policies,
  titles,
  title,
  empty,
  base,
  back,
}: {
  policies: StorefrontInput["policies"];
  titles: Record<(typeof policyKinds)[number], string>;
  title: string;
  empty: string;
  base: string;
  back: string;
}) {
  const visible = policyKinds.filter((key) => policies[key]?.trim());
  return (
    <article className="sf-section">
      <Button asChild variant="link">
        <a href={`${base}/tours`}>{back}</a>
      </Button>
      <h1 className="sf-page-title">{title}</h1>
      {visible.length ? (
        <div className="sf-policy-layout">
          <nav className="sf-policy-nav" aria-label={title}>
            {visible.map((key) => (
              <a key={key} href={`#${key}`}>
                {titles[key]}
              </a>
            ))}
          </nav>
          <div>
            {visible.map((key) => (
              <section className="sf-detail-section" key={key} id={key}>
                <h2>{titles[key]}</h2>
                <p className="sf-copy">{policies[key]}</p>
              </section>
            ))}
          </div>
        </div>
      ) : (
        <p className="sf-copy">{empty}</p>
      )}
    </article>
  );
}
