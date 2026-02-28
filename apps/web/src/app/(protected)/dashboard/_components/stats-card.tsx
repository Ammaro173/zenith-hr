"use client";

import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  className?: string; // Allow custom styling
  description?: string;
  icon?: LucideIcon;
  title: string;
  trend?: {
    value: number;
    label: string;
    positive?: boolean;
  };
  value: number | string;
  variant?: "default" | "highlight";
}

export function StatsCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  className,
  variant = "default",
}: StatsCardProps) {
  return (
    <Card
      className={cn(
        "overflow-hidden transition-all hover:shadow-md",
        className,
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="font-medium text-muted-foreground text-sm">
          {title}
        </CardTitle>
        {Icon && (
          <div
            className={cn(
              "rounded-full p-2",
              variant === "highlight"
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="font-bold text-2xl">{value}</div>
        {(description || trend) && (
          <div className="mt-1 flex items-center text-muted-foreground text-xs">
            {trend && (
              <span
                className={cn(
                  "mr-2 font-medium",
                  trend.positive ? "text-green-600" : "text-red-600",
                )}
              >
                {trend.positive ? "+" : ""}
                {trend.value}%
              </span>
            )}
            {description}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
