import { Skeleton } from "@/components/ui/skeleton";

export default function TenantAppLoading() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Chargement">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-96 max-w-full" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}
