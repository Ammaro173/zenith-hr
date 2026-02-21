import { Loader2 } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { EditJobDescriptionContent } from "./_components/edit-content";

export const metadata: Metadata = {
  title: "Edit Job Description",
  description:
    "Update assigned role and default department rules used by linked positions.",
};

interface EditJobDescriptionPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditJobDescriptionPage({
  params,
}: EditJobDescriptionPageProps) {
  const { id } = await params;

  return (
    <div className="mx-auto flex max-w-(--breakpoint-lg) flex-col gap-8 p-8">
      <div>
        <h1 className="font-bold text-3xl text-black tracking-tight dark:text-white">
          Edit Job Description
        </h1>
        <p className="mt-1 text-muted-foreground">
          Update role and department defaults applied through linked positions.
        </p>
      </div>

      <Suspense
        fallback={
          <div className="flex items-center justify-center py-16">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        }
      >
        <EditJobDescriptionContent id={id} />
      </Suspense>
    </div>
  );
}
