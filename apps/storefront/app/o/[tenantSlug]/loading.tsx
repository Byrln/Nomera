import { Skeleton } from "@nomera/ui/components/skeleton";
export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6" aria-busy="true">
      <Skeleton className="h-16 w-2/3" />
      <Skeleton className="h-80 w-full" />
    </div>
  );
}
