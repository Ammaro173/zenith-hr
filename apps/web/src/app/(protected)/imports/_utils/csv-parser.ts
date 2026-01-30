/**
 * CSV Parser Utility
 *
 * Parses CSV content handling:
 * - Different line endings (CRLF, LF)
 * - Quoted values with commas inside
 * - Empty rows
 */

export interface ParsedCSVData {
  headers: string[];
  rows: string[][];
}

/**
 * Parses a single CSV line handling quoted values with commas inside.
 * Supports double-quote escaping (e.g., "value with ""quotes""")
 */
function parseLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        // Check for escaped quote (double quote)
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i += 2;
          continue;
        }
        // End of quoted value
        inQuotes = false;
        i++;
        continue;
      }
      current += char;
      i++;
    } else {
      if (char === '"') {
        // Start of quoted value
        inQuotes = true;
        i++;
        continue;
      }
      if (char === ",") {
        // End of field
        result.push(current.trim());
        current = "";
        i++;
        continue;
      }
      current += char;
      i++;
    }
  }

  // Push the last field
  result.push(current.trim());

  return result;
}

/**
 * Checks if a line is empty (only whitespace or empty string)
 */
function isEmptyLine(line: string): boolean {
  return line.trim().length === 0;
}

/**
 * Checks if a row is a comment row (starts with parenthesis indicating field description)
 */
function isCommentRow(row: string[]): boolean {
  return row.length > 0 && row[0].trim().startsWith("(");
}

/**
 * Parses CSV text content into headers and data rows.
 *
 * @param text - The CSV content as a string
 * @returns ParsedCSVData with headers (first row) and data rows
 *
 * Features:
 * - Handles CRLF (\r\n) and LF (\n) line endings
 * - Handles quoted values containing commas
 * - Handles escaped quotes within quoted values (double quotes)
 * - Filters out empty rows
 * - Filters out comment rows (rows starting with parenthesis)
 * - Trims whitespace from values
 */
export function parseCSV(text: string): ParsedCSVData {
  // Handle empty input
  if (!text || text.trim().length === 0) {
    return { headers: [], rows: [] };
  }

  // Normalize line endings: convert CRLF to LF, then split
  const normalizedText = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // Split by newlines and filter empty lines
  const lines = normalizedText.split("\n").filter((line) => !isEmptyLine(line));

  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  // First non-empty line is headers
  const headers = parseLine(lines[0]);

  // Remaining lines are data rows, filter out comment rows
  const rows = lines
    .slice(1)
    .map((line) => parseLine(line))
    .filter((row) => !isCommentRow(row));

  return { headers, rows };
}
