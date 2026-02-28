"use client";

import { AlertCircle, ArrowRight, FileText } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface ActionItem {
  count: number;
  description?: string;
  link: string;
  title: string;
  type: "urgent" | "action" | "normal";
}

interface ActionRequiredSectionProps {
  actions: ActionItem[];
}

export function ActionRequiredSection({ actions }: ActionRequiredSectionProps) {
  if (!actions.length) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-semibold text-lg">
          <span className="h-2 w-2 rounded-full bg-orange-500" />
          Action Required
        </h2>
        <Button
          asChild
          className="text-muted-foreground"
          size="sm"
          variant="ghost"
        >
          <Link href="/approvals">
            View all tasks <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {actions.map((action, index) => {
          const isUrgent = action.type === "urgent";
          return (
            <Card
              className="overflow-hidden border-l-4 border-l-transparent transition-all hover:border-l-primary"
              key={index}
            >
              <CardContent className="p-4 pt-5">
                <div className="mb-4 flex items-start justify-between">
                  <div
                    className={cn(
                      "rounded-lg p-2",
                      isUrgent
                        ? "bg-red-100 text-red-600"
                        : "bg-blue-100 text-blue-600",
                    )}
                  >
                    {isUrgent ? (
                      <AlertCircle className="h-5 w-5" />
                    ) : (
                      <FileText className="h-5 w-5" />
                    )}
                  </div>
                  {isUrgent && (
                    <span className="rounded-full bg-red-500 px-2 py-0.5 font-bold text-[10px] text-white uppercase">
                      Urgent
                    </span>
                  )}
                  {action.type === "action" && (
                    <span className="rounded-full bg-orange-500 px-2 py-0.5 font-bold text-[10px] text-white uppercase">
                      Action
                    </span>
                  )}
                  {action.type === "normal" && (
                    <span className="rounded-full bg-gray-500 px-2 py-0.5 font-bold text-[10px] text-white uppercase">
                      Due Soon
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="font-bold text-3xl">{action.count}</div>
                  <h3 className="font-medium text-foreground text-sm">
                    {action.title}
                  </h3>
                  <p className="text-muted-foreground text-xs">
                    {action.description || "Pending your review"}
                  </p>
                </div>

                <div className="mt-4 flex justify-end border-t pt-3">
                  <Link
                    className="flex items-center font-semibold text-primary text-xs hover:underline"
                    // biome-ignore lint/suspicious/noExplicitAny: generic link string
                    href={action.link as any}
                  >
                    Review Requests <ArrowRight className="ml-1 h-3 w-3" />
                  </Link>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
