"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function DashboardHeader() {
  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex items-center justify-between pb-6">
      <div className="space-y-1">
        <h1 className="font-bold text-3xl tracking-tight">Dashboard</h1>
        <div className="flex items-center text-muted-foreground">
          {currentDate}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {/* Could add generic actions here, but specific actions might be better in role views */}
        <Button asChild>
          <Link href="/requests/new">
            <Plus className="mr-2 h-4 w-4" />
            New Request
          </Link>
        </Button>
      </div>
    </div>
  );
}
