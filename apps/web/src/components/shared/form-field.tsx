import type { AnyFieldApi } from "@tanstack/react-form";
import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import FieldInfo from "./field-info";

interface FormFieldProps {
  children: ReactNode;
  description?: string;
  field: AnyFieldApi;
  label?: ReactNode;
  required?: boolean;
}

export function FormField({
  field,
  label,
  description,
  required,
  children,
}: FormFieldProps) {
  return (
    <div className="space-y-2">
      {label && (
        <Label htmlFor={field.name}>
          {label} {required && <span className="text-destructive">*</span>}
        </Label>
      )}
      {children}
      {description && (
        <p className="text-muted-foreground text-xs">{description}</p>
      )}
      <FieldInfo field={field} />
    </div>
  );
}
