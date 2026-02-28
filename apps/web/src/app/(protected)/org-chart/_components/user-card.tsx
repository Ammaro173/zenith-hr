"use client";

import {
  Briefcase,
  Building2,
  ChevronDown,
  ChevronRight,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  type HierarchyNode,
  ROLE_VARIANTS,
  type UserRole,
} from "@/types/users";

interface UserCardProps {
  className?: string;
  isExpanded?: boolean;
  onToggle?: () => void;
  user: HierarchyNode;
  variant?: "chart" | "compact";
}

export function UserCard({
  user,
  isExpanded,
  onToggle,
  variant = "chart",
  className,
}: UserCardProps) {
  const hasChildren = user.children.length > 0;
  const roleConfig = ROLE_VARIANTS[user.role as UserRole] ?? {
    variant: "secondary" as const,
    label: user.role,
  };

  // Get initials for avatar
  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (variant === "compact") {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/50",
          className,
        )}
      >
        {hasChildren ? (
          <Button
            className="h-5 w-5 p-0"
            onClick={onToggle}
            size="sm"
            variant="ghost"
          >
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </Button>
        ) : (
          <span className="w-5" />
        )}

        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 font-medium text-primary text-xs">
          {initials}
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="truncate font-medium text-sm">{user.name}</span>
          {user.positionName && (
            <span className="truncate text-muted-foreground text-xs">
              {" "}
              · {user.positionName}
            </span>
          )}
          <Badge
            appearance="light"
            className="shrink-0 text-[10px]"
            variant={roleConfig.variant}
          >
            {roleConfig.label}
          </Badge>
          {user.departmentName && (
            <span className="hidden items-center gap-1 truncate text-muted-foreground text-xs sm:flex">
              <Building2 className="h-3 w-3 shrink-0" />
              {user.departmentName}
            </span>
          )}
        </div>

        {hasChildren && (
          <span className="flex shrink-0 items-center gap-1 text-muted-foreground text-xs">
            <Users className="h-3 w-3" />
            {user.children.length}
          </span>
        )}
      </div>
    );
  }

  // Vacancy placeholder card — dashed ghost style, no personal data
  if (user.isVacancy) {
    return (
      <Card
        className={cn(
          "relative w-48 cursor-default border-2 border-muted-foreground/30 border-dashed bg-muted/10 p-3 transition-all",
          hasChildren && "cursor-pointer hover:border-muted-foreground/50",
          className,
        )}
        onClick={hasChildren ? onToggle : undefined}
      >
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-muted-foreground/30 border-dashed bg-muted">
            <Briefcase className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="w-full space-y-1">
            <p className="truncate font-semibold text-muted-foreground text-sm">
              {user.name}
            </p>
            {user.positionName && (
              <p className="truncate text-muted-foreground text-xs">
                {user.positionName}
              </p>
            )}
            <Badge
              appearance="light"
              className="text-[10px]"
              variant="secondary"
            >
              Vacant
            </Badge>
          </div>
          {hasChildren && (
            <div className="flex items-center gap-1 text-muted-foreground text-xs">
              {isExpanded ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
              <Users className="h-3 w-3" />
              <span>{user.children.length} reports</span>
            </div>
          )}
        </div>
      </Card>
    );
  }

  // Chart variant - full card
  return (
    <Card
      className={cn(
        "relative w-48 cursor-default border-2 p-3 transition-all",
        hasChildren && "cursor-pointer hover:border-primary/50",
        className,
      )}
      onClick={hasChildren ? onToggle : undefined}
    >
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-linear-to-br from-primary/20 to-primary/5 font-semibold text-lg text-primary">
          {initials}
        </div>

        <div className="w-full space-y-1">
          <p className="truncate font-semibold text-sm">{user.name}</p>
          {user.positionName && (
            <p className="truncate text-muted-foreground text-xs">
              {user.positionName}
            </p>
          )}
          <Badge
            appearance="light"
            className="text-[10px]"
            variant={roleConfig.variant}
          >
            {roleConfig.label}
          </Badge>
          {user.departmentName && (
            <p className="flex items-center justify-center gap-1.5 truncate text-muted-foreground text-xs">
              <Building2 className="h-3.5 w-3.5 shrink-0" />
              {user.departmentName}
            </p>
          )}
        </div>

        {hasChildren && (
          <div className="flex items-center gap-1 text-muted-foreground text-xs">
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
            <Users className="h-3 w-3" />
            <span>{user.children.length} reports</span>
          </div>
        )}
      </div>
    </Card>
  );
}
