import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ConnexionClient } from "./ConnexionClient";

export default function ConnexionPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center p-8" aria-busy>
          <Skeleton className="h-64 w-full max-w-md rounded-2xl" />
        </div>
      }
    >
      <ConnexionClient />
    </Suspense>
  );
}
