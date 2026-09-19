import {
  getPublishedStorefront,
  getStorefrontAdmin,
} from "@nomera/postgres/server/storefront";
import { StorefrontEditor, type StorefrontPanel } from "./editor";
import { storefrontContext } from "./server";
export async function StorefrontPage({ panel }: { panel: StorefrontPanel }) {
  const context = await storefrontContext();
  const initial = await getStorefrontAdmin(context.secret, context.tenantId);
  const origin =
    process.env.NEXT_PUBLIC_STOREFRONT_URL ??
    (process.env.NODE_ENV !== "production" ? "http://localhost:3001" : "");
  return (
    <StorefrontEditor
      initial={initial}
      panel={panel}
      canManage={context.canManage}
      canPublish={context.canPublish}
      publicOrigin={origin}
      initialLive={
        initial.published
          ? await getPublishedStorefront(initial.published.slug)
          : null
      }
    />
  );
}
