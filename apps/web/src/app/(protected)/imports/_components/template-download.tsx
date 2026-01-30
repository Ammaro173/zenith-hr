"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  downloadDepartmentTemplate,
  downloadUserTemplate,
} from "../_utils/template-generator";

/**
 * Template Download Component
 *
 * Provides download buttons for CSV import templates.
 * Templates include column headers, example data, and field documentation.
 *
 * Features:
 * - User import template with all required and optional fields
 * - Department import template with all required and optional fields
 * - Example rows demonstrating valid data formats
 * - Comment rows explaining field requirements
 *
 * @example
 * ```tsx
 * <TemplateDownload />
 * ```
 */
export function TemplateDownload() {
  return (
    <div className="flex flex-col gap-4 rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
      <div>
        <h3 className="font-semibold text-base">Download Templates</h3>
        <p className="text-muted-foreground text-sm">
          Download CSV templates with example data and field descriptions to
          help you format your import files correctly.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button onClick={downloadUserTemplate} type="button" variant="outline">
          <Download className="mr-2 size-4" />
          User Template
        </Button>

        <Button
          onClick={downloadDepartmentTemplate}
          type="button"
          variant="outline"
        >
          <Download className="mr-2 size-4" />
          Department Template
        </Button>
      </div>
    </div>
  );
}
