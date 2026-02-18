import { Loader2 } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { CreateJobDescriptionContent } from "./_components/create-content";

export const metadata: Metadata = {
  title: "Create Job Description | Zenith HR",
  description:
    "Create a template that defines assigned role and default department for positions.",
};

export default function CreateJobDescriptionPage() {
  return (
    <div className="mx-auto flex max-w-(--breakpoint-md) flex-col gap-8 p-8">
      <div>
        <h1 className="font-bold text-3xl text-black tracking-tight dark:text-white">
          Create Job Description
        </h1>
        <p className="mt-1 text-muted-foreground">
          Create a template that sets assigned role and default department for
          linked positions.
        </p>
      </div>

      <Suspense
        fallback={
          <div className="flex items-center justify-center py-16">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        }
      >
        <CreateJobDescriptionContent />
      </Suspense>
    </div>
  );
}
