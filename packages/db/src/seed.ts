import { randomUUID } from "node:crypto";
import { db } from "./index";
import {
  department,
  separationChecklistTemplate,
  user,
  userClearanceLane,
} from "./schema";

async function seed() {
  const now = new Date();

  const hrDeptId = randomUUID();
  const financeDeptId = randomUUID();
  const itDeptId = randomUUID();
  const adminDeptId = randomUUID();

  const departments = [
    {
      id: hrDeptId,
      name: "Human Resources",
      costCenterCode: "CC-HR",
      headOfDepartmentId: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: financeDeptId,
      name: "Finance",
      costCenterCode: "CC-FIN",
      headOfDepartmentId: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: itDeptId,
      name: "IT",
      costCenterCode: "CC-IT",
      headOfDepartmentId: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: adminDeptId,
      name: "Administration",
      costCenterCode: "CC-ADM",
      headOfDepartmentId: null,
      createdAt: now,
      updatedAt: now,
    },
  ];

  const users = [
    {
      id: "seed-admin",
      name: "Super Admin",
      email: "admin@example.com",
      emailVerified: true,
      role: "ADMIN" as const,
      status: "ACTIVE" as const,
      sapNo: "SAP-0001",
      departmentId: hrDeptId,
      reportsToManagerId: null,
      passwordHash: null,
      signatureUrl: null,
      failedLoginAttempts: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "seed-hr",
      name: "HR Admin",
      email: "hr@example.com",
      emailVerified: true,
      role: "HR" as const,
      status: "ACTIVE" as const,
      sapNo: "SAP-0002",
      departmentId: hrDeptId,
      reportsToManagerId: "seed-admin",
      passwordHash: null,
      signatureUrl: null,
      failedLoginAttempts: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "seed-finance",
      name: "Finance Approver",
      email: "finance@example.com",
      emailVerified: true,
      role: "FINANCE" as const,
      status: "ACTIVE" as const,
      sapNo: "SAP-0003",
      departmentId: financeDeptId,
      reportsToManagerId: "seed-admin",
      passwordHash: null,
      signatureUrl: null,
      failedLoginAttempts: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "seed-ceo",
      name: "CEO",
      email: "ceo@example.com",
      emailVerified: true,
      role: "CEO" as const,
      status: "ACTIVE" as const,
      sapNo: "SAP-0004",
      departmentId: adminDeptId,
      reportsToManagerId: null,
      passwordHash: null,
      signatureUrl: null,
      failedLoginAttempts: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "seed-it",
      name: "IT Officer",
      email: "it@example.com",
      emailVerified: true,
      role: "IT" as const,
      status: "ACTIVE" as const,
      sapNo: "SAP-0005",
      departmentId: itDeptId,
      reportsToManagerId: "seed-admin",
      passwordHash: null,
      signatureUrl: null,
      failedLoginAttempts: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "seed-admin-dept",
      name: "Admin Officer",
      email: "admin-office@example.com",
      emailVerified: true,
      role: "ADMIN" as const,
      status: "ACTIVE" as const,
      sapNo: "SAP-0006",
      departmentId: adminDeptId,
      reportsToManagerId: "seed-admin",
      passwordHash: null,
      signatureUrl: null,
      failedLoginAttempts: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "seed-manager",
      name: "Line Manager",
      email: "manager@example.com",
      emailVerified: true,
      role: "MANAGER" as const,
      status: "ACTIVE" as const,
      sapNo: "SAP-0007",
      departmentId: hrDeptId,
      reportsToManagerId: "seed-admin",
      passwordHash: null,
      signatureUrl: null,
      failedLoginAttempts: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "seed-requester",
      name: "Employee Requester",
      email: "employee@example.com",
      emailVerified: true,
      role: "REQUESTER" as const,
      status: "ACTIVE" as const,
      sapNo: "SAP-0008",
      departmentId: hrDeptId,
      reportsToManagerId: "seed-manager",
      passwordHash: null,
      signatureUrl: null,
      failedLoginAttempts: 0,
      createdAt: now,
      updatedAt: now,
    },
  ];

  const separationChecklistTemplates = [
    // Operations
    {
      lane: "OPERATIONS" as const,
      title: "Handover company files / documents",
      description: "Return documents and complete handover notes.",
      required: true,
      defaultDueOffsetDays: 7,
      order: 0,
      active: true,
      createdAt: now,
      updatedAt: now,
    },
    // IT
    {
      lane: "IT" as const,
      title: "Disable email account",
      description: "Disable corporate email + forward if required.",
      required: true,
      defaultDueOffsetDays: 3,
      order: 0,
      active: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      lane: "IT" as const,
      title: "Disable SAP account",
      description: "Disable SAP / ERP access.",
      required: true,
      defaultDueOffsetDays: 3,
      order: 1,
      active: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      lane: "IT" as const,
      title: "Return laptop / computer",
      description: "Return issued laptop and accessories.",
      required: true,
      defaultDueOffsetDays: 5,
      order: 2,
      active: true,
      createdAt: now,
      updatedAt: now,
    },
    // Finance
    {
      lane: "FINANCE" as const,
      title: "Outstanding expenses",
      description: "Submit receipts / settle outstanding claims.",
      required: true,
      defaultDueOffsetDays: 5,
      order: 0,
      active: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      lane: "FINANCE" as const,
      title: "Tax clearance",
      description: "Finalize tax clearance requirements.",
      required: true,
      defaultDueOffsetDays: 2,
      order: 1,
      active: true,
      createdAt: now,
      updatedAt: now,
    },
    // Admin/Assets
    {
      lane: "ADMIN_ASSETS" as const,
      title: "Return access card / ID badge",
      description: "Collect badge and disable physical access.",
      required: true,
      defaultDueOffsetDays: 3,
      order: 0,
      active: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      lane: "ADMIN_ASSETS" as const,
      title: "Return office keys",
      description: "Collect keys (office, drawers, storage).",
      required: true,
      defaultDueOffsetDays: 3,
      order: 1,
      active: true,
      createdAt: now,
      updatedAt: now,
    },
    // Insurance
    {
      lane: "INSURANCE" as const,
      title: "Insurance transfer/cancellation",
      description: "Process insurance changes for employee/dependents.",
      required: false,
      defaultDueOffsetDays: 3,
      order: 0,
      active: true,
      createdAt: now,
      updatedAt: now,
    },
    // Used cars
    {
      lane: "USED_CARS" as const,
      title: "Company vehicle settlement (if applicable)",
      description: "Return or settle company vehicle obligations.",
      required: false,
      defaultDueOffsetDays: 7,
      order: 0,
      active: true,
      createdAt: now,
      updatedAt: now,
    },
    // HR/Payroll
    {
      lane: "HR_PAYROLL" as const,
      title: "Exit interview",
      description: "Complete exit interview and archive notes.",
      required: true,
      defaultDueOffsetDays: 2,
      order: 0,
      active: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      lane: "HR_PAYROLL" as const,
      title: "Final settlement",
      description: "Finalize EOSB, payroll, and repatriation (if any).",
      required: true,
      defaultDueOffsetDays: 0,
      order: 1,
      active: true,
      createdAt: now,
      updatedAt: now,
    },
  ];

  await db.transaction(async (tx) => {
    await tx.delete(user);
    await tx.delete(department);

    await tx.insert(department).values(departments);
    await tx.insert(user).values(users);

    // Reset and seed separation templates + lane memberships.
    await tx.delete(separationChecklistTemplate);
    await tx
      .insert(separationChecklistTemplate)
      .values(separationChecklistTemplates);

    await tx.delete(userClearanceLane);
    await tx.insert(userClearanceLane).values([
      { userId: "seed-it", lane: "IT", createdAt: now },
      { userId: "seed-finance", lane: "FINANCE", createdAt: now },
      { userId: "seed-admin-dept", lane: "ADMIN_ASSETS", createdAt: now },
      { userId: "seed-hr", lane: "HR_PAYROLL", createdAt: now },
    ]);
  });

  console.log("Seed data inserted.");
}

seed()
  .then(() => {
    console.log("Seeding completed.");
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
