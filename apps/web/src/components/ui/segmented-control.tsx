"use client";

import type * as React from "react";

import { cn } from "@/lib/utils";
import { For } from "@/utils";
import { Button } from "./button";

type SegmentedControlOption<Value extends string> = {
  label: string;
  value: Value;
};

interface SegmentedControlProps<Value extends string>
  extends React.ComponentProps<"div"> {
  value: Value;
  onValueChange?: (value: Value) => void;
  options: SegmentedControlOption<Value>[];
}

export function SegmentedControl<Value extends string>(
  props: SegmentedControlProps<Value>
) {
  const { value, onValueChange, options, className, ...rest } = props;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-md bg-muted p-0.5 text-sm shadow-inner",
        className
      )}
      role="tablist"
      {...rest}
    >
      <For
        each={options}
        render={(option) => {
          const isActive = option.value === value;

          return (
            <Button
              aria-selected={isActive}
              className={cn(
                "relative rounded-md px-4 py-1.5 font-medium transition-colors",
                isActive
                  ? "bg-background text-foreground shadow-sm hover:bg-background"
                  : "text-muted-foreground hover:bg-muted-foreground/5 hover:text-foreground"
              )}
              key={option.value}
              onClick={() => onValueChange?.(option.value)}
              role="tab"
              type="button"
              variant="ghost"
            >
              {option.label}
            </Button>
          );
        }}
      />
    </div>
  );
}
