import { ChevronRight } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EditPositionContent } from "./_components/edit-content";

export const metadata: Metadata = {
  title: "Edit Position",
  description: "Edit an existing position.",
};

interface EditPositionPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditPositionPage({
  params,
}: EditPositionPageProps) {
  const { id } = await params;

  return (
    <div className="mx-auto flex max-w-(--breakpoint-2xl) flex-col gap-8 p-8">
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <Button asChild className="h-auto p-0" mode="link" variant="ghost">
          <Link href={"/positions" as Route}>Positions</Link>
        </Button>
        <ChevronRight className="size-4" />
        <span>Edit</span>
      </div>

      <div>
        <h1 className="font-bold text-3xl text-black tracking-tight dark:text-white">
          Edit Position
        </h1>
        <p className="mt-1 text-muted-foreground">
          Update position details and hierarchy.
        </p>
      </div>

      <EditPositionContent id={id} />
    </div>
  );
}
