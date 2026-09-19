import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { TourEditor } from "@/features/tours/editor";
import { tourPageContext } from "@/features/tours/server";

export async function generateMetadata() {
  const t = await getTranslations("Tours");
  return { title: `${t("newTour")} · NOMERA` };
}
export default async function NewTourPage() {
  const context = await tourPageContext();
  if (!context.canManage) redirect("/tours");
  return (
    <TourEditor
      tenantId={context.tenantId}
      userId={context.userId}
      canManage={context.canManage}
      canPublish={context.canPublish}
    />
  );
}
