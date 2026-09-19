import { Skeleton } from "@nomera/ui/components/skeleton";
import { getTranslations } from "next-intl/server";
export default async function Loading() {
  const t = await getTranslations("Journey");
  return (
    <div role="status" aria-label={t("loading")} className="space-y-5">
      <Skeleton className="h-8 w-52" />
      <Skeleton className="h-10 w-full max-w-xl" />
      <div className="grid gap-4 xl:grid-cols-[15rem_minmax(0,1fr)_18rem]">
        <Skeleton className="h-64" />
        <Skeleton className="h-96" />
        <Skeleton className="h-64" />
      </div>
    </div>
  );
}
