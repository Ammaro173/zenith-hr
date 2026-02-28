import { Loader2 } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { CreatePositionContent } from "./_components/create-content";

export const metadata: Metadata = {
  title: "Create Position",
  description:
    "Create a position that defines hierarchy level and department assignment.",
};

export default function CreatePositionPage() {
  return (
    <div className="mx-auto flex max-w-(--breakpoint-lg) flex-col gap-8 p-8">
      <div>
        <h1 className="font-bold text-3xl text-black tracking-tight dark:text-white">
          Create Position
        </h1>
        <p className="mt-1 text-muted-foreground">
          Create a position with hierarchy level and department assignment.
        </p>
      </div>

      <Suspense
        fallback={
          <div className="flex items-center justify-center py-16">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        }
      >
        <CreatePositionContent />
      </Suspense>
    </div>
  );
}
