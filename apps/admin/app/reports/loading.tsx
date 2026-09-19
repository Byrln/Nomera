import { Card, CardContent } from "@nomera/ui/components/card";
import { Skeleton } from "@nomera/ui/components/skeleton";
import { getTranslations } from "next-intl/server";
export default async function Loading() {
  const t = await getTranslations("Finance");
  return (
    <div
      role="status"
      aria-label={t("loading")}
      className="mx-auto flex w-full max-w-[68rem] flex-col gap-5"
    >
      <Skeleton className="h-8 w-36" />
      <Card>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
