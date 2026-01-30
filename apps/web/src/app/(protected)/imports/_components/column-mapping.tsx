"use client";

import { AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ColumnMapping as ColumnMappingType } from "@/types/imports";

/**
 * Field definition for column mapping
 */
export interface FieldDefinition {
  key: string;
  label: string;
  required: boolean;
  description?: string;
}

/**
 * Props for the ColumnMapping component
 */
export interface ColumnMappingProps {
  /**
   * CSV column headers from the uploaded file
   */
  headers: string[];
  /**
   * Expected fields for the import type
   */
  expectedFields: FieldDefinition[];
  /**
   * Current column mapping (CSV column -> field key)
   */
  mapping: ColumnMappingType;
  /**
   * Callback when mapping changes
   */
  onMappingChange: (csvColumn: string, field: string | null) => void;
  /**
   * List of unmapped required fields
   */
  unmappedRequiredFields?: string[];
}

/**
 * Column Mapping Component
 *
 * Displays expected fields with required/optional indicators and allows
 * users to map CSV columns to expected fields via Select dropdowns.
 *
 * Features:
 * - Display expected fields with required/optional indicators
 * - Show auto-detected mappings
 * - Allow manual mapping via Select dropdowns
 * - Highlight unmapped required fields
 */
export function ColumnMapping({
  headers,
  expectedFields,
  mapping,
  onMappingChange,
  unmappedRequiredFields = [],
}: ColumnMappingProps) {
  // Create reverse mapping (field -> CSV column) for easier lookup
  const reverseMapping: Record<string, string> = {};
  for (const [csvColumn, field] of Object.entries(mapping)) {
    reverseMapping[field] = csvColumn;
  }

  // Get available headers for a specific field (excluding already mapped headers)
  const getAvailableHeaders = (currentField: string): string[] => {
    return headers.filter((header) => {
      const mappedField = mapping[header];
      // Include if unmapped or if it's the current field's mapping
      return !mappedField || mappedField === currentField;
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Column Mapping</CardTitle>
        <p className="text-muted-foreground text-sm">
          Map your CSV columns to the expected fields. Required fields must be
          mapped before importing.
        </p>
      </CardHeader>
      <CardContent>
        {/* Show warning if there are unmapped required fields */}
        {unmappedRequiredFields.length > 0 && (
          <div className="mb-4 flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
            <div className="flex-1">
              <p className="font-medium text-sm">Required fields not mapped</p>
              <p className="text-muted-foreground text-sm">
                The following required fields must be mapped:{" "}
                {unmappedRequiredFields.join(", ")}
              </p>
            </div>
          </div>
        )}

        {/* Field mapping list */}
        <div className="space-y-4">
          {expectedFields.map((field) => {
            const mappedColumn = reverseMapping[field.key];
            const availableHeaders = getAvailableHeaders(field.key);
            const isUnmapped =
              field.required && unmappedRequiredFields.includes(field.key);

            return (
              <div
                className={
                  isUnmapped
                    ? "rounded-md border border-destructive/50 bg-destructive/5 p-3"
                    : ""
                }
                key={field.key}
              >
                <div className="mb-2 flex items-center gap-2">
                  <Label className="text-sm" htmlFor={`mapping-${field.key}`}>
                    {field.label}
                  </Label>
                  {field.required ? (
                    <Badge appearance="light" size="sm" variant="destructive">
                      Required
                    </Badge>
                  ) : (
                    <Badge appearance="light" size="sm" variant="secondary">
                      Optional
                    </Badge>
                  )}
                </div>

                {field.description && (
                  <p className="mb-2 text-muted-foreground text-xs">
                    {field.description}
                  </p>
                )}

                <Select
                  onValueChange={(value) => {
                    if (value === "__none__") {
                      // Remove mapping if "None" is selected
                      if (mappedColumn) {
                        onMappingChange(mappedColumn, null);
                      }
                    } else {
                      // Update mapping
                      onMappingChange(value, field.key);
                    }
                  }}
                  value={mappedColumn ?? "__none__"}
                >
                  <SelectTrigger
                    className={isUnmapped ? "border-destructive" : ""}
                    id={`mapping-${field.key}`}
                  >
                    <SelectValue placeholder="Select CSV column..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">
                      <span className="text-muted-foreground">
                        None (skip this field)
                      </span>
                    </SelectItem>
                    {availableHeaders.map((header) => (
                      <SelectItem key={header} value={header}>
                        {header}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="mt-4 rounded-md bg-muted p-3">
          <p className="text-muted-foreground text-sm">
            <span className="font-medium">
              {Object.keys(mapping).length} of {expectedFields.length}
            </span>{" "}
            fields mapped
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
