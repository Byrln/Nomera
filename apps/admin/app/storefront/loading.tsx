import { Skeleton } from "@nomera/ui/components/skeleton";
export default function Loading() {
  return (
    <div className="space-y-4" aria-busy="true">
      <Skeleton className="h-9 w-48" />
      <Skeleton className="h-96 w-full" />
    </div>
  );
}
