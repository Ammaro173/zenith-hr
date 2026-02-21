/**
 * Template Generator Utility
 *
 * Generates and downloads CSV templates for user and department imports.
 * Templates include headers and example rows demonstrating valid formats.
 */

/**
 * User import template headers
 */
const USER_TEMPLATE_HEADERS = [
  "name",
  "email",
  "sapNo",
  "role",
  "status",
  "departmentId",
  "jobDescriptionId",
  "password",
] as const;

/**
 * Department import template headers
 */
const DEPARTMENT_TEMPLATE_HEADERS = ["name"] as const;

/**
 * Example row for user import template demonstrating valid formats.
 * Comments in parentheses explain field requirements.
 */
const USER_EXAMPLE_ROW = [
  "John Doe",
  "john.doe@company.com",
  "SAP001",
  "EMPLOYEE",
  "ACTIVE",
  "",
  "",
  "",
];

/**
 * Example row for department import template demonstrating valid formats.
 */
const DEPARTMENT_EXAMPLE_ROW = ["Engineering"];

/**
 * Comment row explaining user fields (optional vs required)
 */
const USER_COMMENT_ROW = [
  "(Required: Full name)",
  "(Required: Valid email)",
  "(Required: SAP number)",
  "(Required: EMPLOYEE|MANAGER|HR|FINANCE|CEO|IT|ADMIN)",
  "(Optional: ACTIVE|INACTIVE|ON_LEAVE - defaults to ACTIVE)",
  "(Optional: Department UUID)",
  "(Optional: Job description UUID)",
  "(Optional: Min 8 chars - auto-generated if empty)",
];

/**
 * Comment row explaining department fields (optional vs required)
 */
const DEPARTMENT_COMMENT_ROW = ["(Required: Department name)"];

/**
 * Escapes a CSV value by wrapping in quotes if it contains special characters.
 * Also escapes internal quotes by doubling them.
 *
 * @param value - The value to escape
 * @returns The escaped value safe for CSV
 */
function escapeCSVValue(value: string): string {
  // If value contains comma, newline, or quote, wrap in quotes
  if (value.includes(",") || value.includes("\n") || value.includes('"')) {
    // Escape internal quotes by doubling them
    const escaped = value.replace(/"/g, '""');
    return `"${escaped}"`;
  }
  return value;
}

/**
 * Converts an array of values to a CSV row string.
 *
 * @param values - Array of values for the row
 * @returns CSV formatted row string
 */
function toCSVRow(values: readonly string[]): string {
  return values.map(escapeCSVValue).join(",");
}

/**
 * Generates CSV content from headers and rows.
 *
 * @param headers - Array of header names
 * @param rows - Array of row arrays
 * @returns Complete CSV content string
 */
function generateCSVContent(
  headers: readonly string[],
  rows: readonly (readonly string[])[],
): string {
  const headerRow = toCSVRow(headers);
  const dataRows = rows.map(toCSVRow);
  return [headerRow, ...dataRows].join("\n");
}

/**
 * Triggers a browser download for the given content.
 *
 * @param content - The file content to download
 * @param filename - The name for the downloaded file
 * @param mimeType - The MIME type of the file
 */
function triggerDownload(
  content: string,
  filename: string,
  mimeType = "text/csv",
): void {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";

  document.body.appendChild(link);
  link.click();

  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Downloads a CSV template for user imports.
 *
 * The template includes:
 * - Column headers matching expected fields
 * - A comment row explaining each field's requirements
 * - An example row with valid sample data
 *
 * @example
 * downloadUserTemplate()
 * // Downloads "user-import-template.csv"
 */
export function downloadUserTemplate(): void {
  const content = generateCSVContent(USER_TEMPLATE_HEADERS, [
    USER_COMMENT_ROW,
    USER_EXAMPLE_ROW,
  ]);

  triggerDownload(content, "user-import-template.csv");
}

/**
 * Downloads a CSV template for department imports.
 *
 * The template includes:
 * - Column headers matching expected fields
 * - A comment row explaining each field's requirements
 * - An example row with valid sample data
 *
 * @example
 * downloadDepartmentTemplate()
 * // Downloads "department-import-template.csv"
 */
export function downloadDepartmentTemplate(): void {
  const content = generateCSVContent(DEPARTMENT_TEMPLATE_HEADERS, [
    DEPARTMENT_COMMENT_ROW,
    DEPARTMENT_EXAMPLE_ROW,
  ]);

  triggerDownload(content, "department-import-template.csv");
}

/**
 * Generates user template CSV content without triggering download.
 * Useful for testing or displaying template preview.
 *
 * @returns CSV content string for user template
 */
export function generateUserTemplateContent(): string {
  return generateCSVContent(USER_TEMPLATE_HEADERS, [
    USER_COMMENT_ROW,
    USER_EXAMPLE_ROW,
  ]);
}

/**
 * Generates department template CSV content without triggering download.
 * Useful for testing or displaying template preview.
 *
 * @returns CSV content string for department template
 */
export function generateDepartmentTemplateContent(): string {
  return generateCSVContent(DEPARTMENT_TEMPLATE_HEADERS, [
    DEPARTMENT_COMMENT_ROW,
    DEPARTMENT_EXAMPLE_ROW,
  ]);
}
