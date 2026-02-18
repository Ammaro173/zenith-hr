/**
 * Column Detector Utility
 *
 * Auto-detects column mappings from CSV headers to expected fields.
 * Supports case-insensitive matching and common naming variations.
 */

/**
 * Column mapping type: maps CSV column header to expected field name
 */
export type ColumnMapping = Record<string, string>;

/**
 * Expected fields for user imports
 */
export const USER_FIELDS = [
  "name",
  "email",
  "sapNo",
  "role",
  "status",
  "departmentId",
  "positionId",
  "password",
] as const;

/**
 * Expected fields for department imports
 */
export const DEPARTMENT_FIELDS = ["name", "costCenterCode"] as const;

/**
 * Common variations for field names.
 * Maps normalized variations to the canonical field name.
 */
const FIELD_VARIATIONS: Record<string, string> = {
  // User fields - name
  name: "name",
  fullname: "name",
  full_name: "name",
  username: "name",
  user_name: "name",
  employeename: "name",
  employee_name: "name",

  // User fields - email
  email: "email",
  emailaddress: "email",
  email_address: "email",
  mail: "email",
  useremail: "email",
  user_email: "email",

  // User fields - sapNo
  sapno: "sapNo",
  sap_no: "sapNo",
  sapnumber: "sapNo",
  sap_number: "sapNo",
  sapid: "sapNo",
  sap_id: "sapNo",
  employeeid: "sapNo",
  employee_id: "sapNo",
  employeeno: "sapNo",
  employee_no: "sapNo",
  employeenumber: "sapNo",
  employee_number: "sapNo",

  // User fields - role
  role: "role",
  userrole: "role",
  user_role: "role",
  jobrole: "role",
  job_role: "role",
  position: "role",

  // User fields - status
  status: "status",
  userstatus: "status",
  user_status: "status",
  employeestatus: "status",
  employee_status: "status",
  active: "status",

  // User fields - departmentId
  departmentid: "departmentId",
  department_id: "departmentId",
  department: "departmentId",
  dept: "departmentId",
  deptid: "departmentId",
  dept_id: "departmentId",

  // User fields - positionId
  positionid: "positionId",
  position_id: "positionId",
  jobpositionid: "positionId",
  job_position_id: "positionId",
  assignedpositionid: "positionId",
  assigned_position_id: "positionId",

  // User fields - password
  password: "password",
  pass: "password",
  pwd: "password",
  userpassword: "password",
  user_password: "password",

  // Department fields - costCenterCode
  costcentercode: "costCenterCode",
  cost_center_code: "costCenterCode",
  costcenter: "costCenterCode",
  cost_center: "costCenterCode",
  centercode: "costCenterCode",
  center_code: "costCenterCode",
  cc: "costCenterCode",
  cccode: "costCenterCode",
  cc_code: "costCenterCode",
};

/**
 * Normalizes a header string for matching.
 * Converts to lowercase and removes all non-alphanumeric characters.
 */
function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Normalizes a header string preserving underscores for variation matching.
 * Converts to lowercase and replaces spaces/special chars with underscores.
 */
function normalizeWithUnderscores(header: string): string {
  return header
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

/**
 * Attempts to match a header to an expected field.
 * Returns the matched field name or undefined if no match found.
 */
function matchHeader(
  header: string,
  expectedFields: readonly string[],
): string | undefined {
  const normalizedHeader = normalizeHeader(header);
  const normalizedWithUnderscores = normalizeWithUnderscores(header);

  // First, try exact match with normalized expected fields
  for (const field of expectedFields) {
    if (normalizeHeader(field) === normalizedHeader) {
      return field;
    }
  }

  // Second, try matching against known variations (without underscores)
  const variationMatch = FIELD_VARIATIONS[normalizedHeader];
  if (variationMatch && expectedFields.includes(variationMatch)) {
    return variationMatch;
  }

  // Third, try matching against known variations (with underscores)
  const variationMatchWithUnderscores =
    FIELD_VARIATIONS[normalizedWithUnderscores];
  if (
    variationMatchWithUnderscores &&
    expectedFields.includes(variationMatchWithUnderscores)
  ) {
    return variationMatchWithUnderscores;
  }

  return undefined;
}

/**
 * Detects column mappings for user import CSV headers.
 * Matches headers to expected user fields case-insensitively.
 *
 * @param headers - Array of CSV column headers
 * @returns Mapping object where keys are CSV headers and values are expected field names
 *
 * @example
 * detectUserColumns(['Name', 'EMAIL', 'sap_no', 'Role'])
 * // Returns: { 'Name': 'name', 'EMAIL': 'email', 'sap_no': 'sapNo', 'Role': 'role' }
 */
export function detectUserColumns(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  const usedFields = new Set<string>();

  for (const header of headers) {
    const trimmedHeader = header.trim();
    if (!trimmedHeader) {
      continue;
    }

    const matchedField = matchHeader(trimmedHeader, USER_FIELDS);
    if (matchedField && !usedFields.has(matchedField)) {
      mapping[trimmedHeader] = matchedField;
      usedFields.add(matchedField);
    }
  }

  return mapping;
}

/**
 * Detects column mappings for department import CSV headers.
 * Matches headers to expected department fields case-insensitively.
 *
 * @param headers - Array of CSV column headers
 * @returns Mapping object where keys are CSV headers and values are expected field names
 *
 * @example
 * detectDepartmentColumns(['Name', 'cost_center_code'])
 * // Returns: { 'Name': 'name', 'cost_center_code': 'costCenterCode' }
 */
export function detectDepartmentColumns(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  const usedFields = new Set<string>();

  for (const header of headers) {
    const trimmedHeader = header.trim();
    if (!trimmedHeader) {
      continue;
    }

    const matchedField = matchHeader(trimmedHeader, DEPARTMENT_FIELDS);
    if (matchedField && !usedFields.has(matchedField)) {
      mapping[trimmedHeader] = matchedField;
      usedFields.add(matchedField);
    }
  }

  return mapping;
}

/**
 * Gets unmapped required fields for user imports.
 *
 * @param mapping - Current column mapping
 * @returns Array of required field names that are not mapped
 */
export function getUnmappedUserRequiredFields(
  mapping: ColumnMapping,
): string[] {
  const requiredFields = ["name", "email", "sapNo", "role"];
  const mappedFields = new Set(Object.values(mapping));
  return requiredFields.filter((field) => !mappedFields.has(field));
}

/**
 * Gets unmapped required fields for department imports.
 *
 * @param mapping - Current column mapping
 * @returns Array of required field names that are not mapped
 */
export function getUnmappedDepartmentRequiredFields(
  mapping: ColumnMapping,
): string[] {
  const requiredFields = ["name", "costCenterCode"];
  const mappedFields = new Set(Object.values(mapping));
  return requiredFields.filter((field) => !mappedFields.has(field));
}
