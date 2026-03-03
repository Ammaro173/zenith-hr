"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

interface DashboardHeaderProps {
  canCreateRequest: boolean;
}

export function DashboardHeader({ canCreateRequest }: DashboardHeaderProps) {
  const [currentDate, setCurrentDate] = useState("");

  useEffect(() => {
    setCurrentDate(
      new Date().toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    );
  }, []);

  return (
    <div className="flex items-center justify-between pb-6">
      <div className="space-y-1">
        <h1 className="font-bold text-3xl tracking-tight">Dashboard</h1>
        <div className="flex items-center text-muted-foreground">
          {currentDate}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {canCreateRequest && (
          <Button asChild>
            <Link href="/requests/new">
              <Plus className="mr-2 h-4 w-4" />
              New Request
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
