import { DomainError } from "@nomera/domain/errors";
import { getTourDetail } from "@nomera/postgres/server/tours";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { TourEditor } from "@/features/tours/editor";
import { tourPageContext } from "@/features/tours/server";

export async function generateMetadata() {
  const t = await getTranslations("Tours");
  return { title: `${t("editTour")} · NOMERA` };
}

export default async function EditTourPage({
  params,
}: {
  params: Promise<{ tourId: string }>;
}) {
  const context = await tourPageContext();
  try {
    const detail = await getTourDetail(
      context.secret,
      context.tenantId,
      (await params).tourId,
    );
    return (
      <TourEditor
        tenantId={context.tenantId}
        userId={context.userId}
        key={detail.id}
        initial={detail}
        canManage={context.canManage}
        canPublish={context.canPublish}
      />
    );
  } catch (error) {
    if (
      error instanceof DomainError &&
      (error.code === "NOT_FOUND" || error.code === "VALIDATION_ERROR")
    )
      notFound();
    throw error;
  }
}
