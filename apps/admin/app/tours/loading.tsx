import { Card, CardContent } from "@nomera/ui/components/card";
import { Skeleton } from "@nomera/ui/components/skeleton";
import { getTranslations } from "next-intl/server";

export default async function LoadingTours() {
  const t = await getTranslations("Tours");
  return (
    <div
      role="status"
      aria-label={t("loading")}
      className="mx-auto flex w-full max-w-[68rem] flex-col gap-5"
    >
      <Skeleton className="h-8 w-36" />
      <Card>
        <CardContent className="flex flex-col gap-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
