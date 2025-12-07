"use client";

import { forwardRef } from "react";
import { CircleFlag } from "react-circle-flags";
import {
  NON_DIGIT_REGEX,
  QAT_PHONE_LOCAL_LENGTH,
  QAT_PHONE_PREFIX,
  STRIP_QAT_PHONE_PREFIX_REGEX,
} from "@/lib/constants";
import { cn, normalizePhoneInput } from "@/lib/utils";

type PhoneInputProps = Omit<
  React.ComponentProps<"input">,
  "onChange" | "value" | "type" | "inputMode" | "placeholder" | "maxLength"
> & {
  value?: string;
  onChange?: (value: string) => void;
};

const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ className, value = "", onChange, ...props }, ref) => {
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = normalizePhoneInput(event.target.value);
      onChange?.(formatted);
    };

    //! Extract only the local digits (8 digits) for display in input
    const displayValue = value.startsWith(QAT_PHONE_PREFIX)
      ? value.slice(QAT_PHONE_PREFIX.length)
      : value
          .replace(STRIP_QAT_PHONE_PREFIX_REGEX, "")
          .replace(NON_DIGIT_REGEX, "");

    return (
      <div
        className={cn(
          "flex h-9 w-full min-w-0 items-center gap-1 overflow-hidden rounded-md border border-input bg-transparent px-1.5 shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 sm:gap-2 sm:px-3",
          "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
          className
        )}
      >
        <div className="flex min-w-0 shrink items-center gap-0.5 whitespace-nowrap sm:gap-1">
          <div className="inline-flex size-4 shrink-0 items-center justify-center overflow-hidden rounded-full sm:size-5">
            <CircleFlag countryCode="qa" />
          </div>
          <span className="text-muted-foreground text-sm">
            {QAT_PHONE_PREFIX}
          </span>
        </div>
        <input
          autoComplete="tel"
          className={cn(
            "min-w-0 flex-1 bg-transparent text-base outline-none selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
          )}
          inputMode="tel"
          maxLength={QAT_PHONE_LOCAL_LENGTH}
          onChange={handleChange}
          placeholder={"0".repeat(QAT_PHONE_LOCAL_LENGTH)}
          ref={ref}
          value={displayValue}
          {...props}
        />
      </div>
    );
  }
);

PhoneInput.displayName = "PhoneInput";

export { PhoneInput };
