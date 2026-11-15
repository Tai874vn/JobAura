import type { Metadata } from "next";
import { Suspense } from "react";
import { HiringPostsPage } from "@/features/hiring/hiring-posts-page";
import { Card, CardContent } from "@/shared/ui";

export const metadata: Metadata = { title: "Hiring posts" };

// The list reads its filters from the URL (useSearchParams), so it renders inside Suspense; the page around it
// can still be prerendered.
export default function Page() {
  return (
    <Suspense fallback={<HiringPostsLoading />}>
      <HiringPostsPage />
    </Suspense>
  );
}

function HiringPostsLoading() {
  return (
    <div className="container-page grid gap-4 py-8" aria-busy="true">
      {Array.from({ length: 3 }).map((_, index) => (
        <Card key={index}><CardContent className="h-44 animate-pulse bg-surface-muted" /></Card>
      ))}
    </div>
  );
}
