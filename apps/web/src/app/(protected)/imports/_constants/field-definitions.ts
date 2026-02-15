/**
 * Field definitions for import column mapping
 *
 * These definitions specify the expected fields for user and department imports,
 * including labels, descriptions, and whether they are required.
 */

import type { FieldDefinition } from "../_components/column-mapping";

/**
 * Field definitions for user imports
 */
export const USER_FIELD_DEFINITIONS: FieldDefinition[] = [
  {
    key: "name",
    label: "Full Name",
    required: true,
    description: "Employee's full name",
  },
  {
    key: "email",
    label: "Email Address",
    required: true,
    description: "Employee's email address",
  },
  {
    key: "sapNo",
    label: "SAP Number",
    required: true,
    description: "Employee's SAP identification number",
  },
  {
    key: "role",
    label: "Role",
    required: true,
    description: "User role (EMPLOYEE, MANAGER, HR, FINANCE, CEO, IT, ADMIN)",
  },
  {
    key: "status",
    label: "Status",
    required: false,
    description: "User status (ACTIVE, INACTIVE, ON_LEAVE). Defaults to ACTIVE",
  },
  {
    key: "departmentId",
    label: "Department ID",
    required: false,
    description: "UUID of the department",
  },
  {
    key: "reportsToSlotCode",
    label: "Reports To Slot Code",
    required: false,
    description: "Slot code of the manager position this employee reports to",
  },
  {
    key: "password",
    label: "Password",
    required: false,
    description:
      "Initial password. If not provided, a secure password will be generated",
  },
];

/**
 * Field definitions for department imports
 */
export const DEPARTMENT_FIELD_DEFINITIONS: FieldDefinition[] = [
  {
    key: "name",
    label: "Department Name",
    required: true,
    description: "Name of the department",
  },
  {
    key: "costCenterCode",
    label: "Cost Center Code",
    required: true,
    description: "Cost center code for the department",
  },
  {
    key: "headOfDepartmentId",
    label: "Head of Department ID",
    required: false,
    description: "UUID of the user who heads this department",
  },
];
