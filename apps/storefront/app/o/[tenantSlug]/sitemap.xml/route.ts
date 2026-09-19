import { getPublishedStorefront } from "@nomera/postgres/server/storefront";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ tenantSlug: string }> },
) {
  const store = await getPublishedStorefront((await params).tenantSlug);
  if (!store) return new Response("Not found", { status: 404 });
  const base =
    store.data.seo.canonicalUrl.replace(/\/$/, "") ||
    `${new URL(request.url).origin}/o/${store.slug}`;
  const paths = store.data.seo.indexing
    ? ["", "/tours", "/policies", ...store.tours.map((t) => `/tours/${t.id}`)]
    : [];
  const escapeXml = (text: string) =>
    text
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&apos;");
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map((path) => `<url><loc>${escapeXml(base + path)}</loc></url>`).join("")}</urlset>`,
    {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "no-store",
      },
    },
  );
}
