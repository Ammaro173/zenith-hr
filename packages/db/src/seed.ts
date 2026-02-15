import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { db } from "./index";
import {
  account,
  department,
  positionSlot,
  separationChecklistTemplate,
  slotAssignment,
  slotReportingLine,
  user,
  userClearanceLane,
} from "./schema";

async function seed() {
  const now = new Date();
  const defaultPasswordHash = await hashPassword("Test123!");

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
      passwordHash: null,
      signatureUrl: null,
      failedLoginAttempts: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "seed-employee",
      name: "Employee",
      email: "employee@example.com",
      emailVerified: true,
      role: "EMPLOYEE" as const,
      status: "ACTIVE" as const,
      sapNo: "SAP-0008",
      departmentId: hrDeptId,
      passwordHash: null,
      signatureUrl: null,
      failedLoginAttempts: 0,
      createdAt: now,
      updatedAt: now,
    },
  ];

  //TODO slot maybe like we did in MPR-0006 ?
  const ceoSlotId = randomUUID();
  const hrHodSlotId = randomUUID();
  const financeHodSlotId = randomUUID();
  const itHodSlotId = randomUUID();
  const adminHodSlotId = randomUUID();
  const hrManagerSlotId = randomUUID();
  const hrStaffSlotId = randomUUID();

  const slots = [
    {
      id: ceoSlotId,
      code: "CEO",
      name: "Chief Executive Officer",
      departmentId: adminDeptId,
      isDepartmentHead: false,
      isWorkflowStageOwner: true,
      active: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: hrHodSlotId,
      code: "HOD_HR",
      name: "Head of Human Resources",
      departmentId: hrDeptId,
      isDepartmentHead: true,
      isWorkflowStageOwner: true,
      active: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: financeHodSlotId,
      code: "HOD_FINANCE",
      name: "Head of Finance",
      departmentId: financeDeptId,
      isDepartmentHead: true,
      isWorkflowStageOwner: true,
      active: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: itHodSlotId,
      code: "HOD_IT",
      name: "Head of IT",
      departmentId: itDeptId,
      isDepartmentHead: true,
      isWorkflowStageOwner: false,
      active: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: adminHodSlotId,
      code: "HOD_ADMIN",
      name: "Head of Administration",
      departmentId: adminDeptId,
      isDepartmentHead: true,
      isWorkflowStageOwner: false,
      active: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: hrManagerSlotId,
      code: "MANAGER_HR",
      name: "HR Line Manager",
      departmentId: hrDeptId,
      isDepartmentHead: false,
      isWorkflowStageOwner: false,
      active: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: hrStaffSlotId,
      code: "STAFF_HR_1",
      name: "HR Staff",
      departmentId: hrDeptId,
      isDepartmentHead: false,
      isWorkflowStageOwner: false,
      active: true,
      createdAt: now,
      updatedAt: now,
    },
  ];

  const slotAssignments = [
    {
      slotId: ceoSlotId,
      userId: "seed-ceo",
      startsAt: now,
      endsAt: null,
      isPrimary: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      slotId: hrHodSlotId,
      userId: "seed-hr",
      startsAt: now,
      endsAt: null,
      isPrimary: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      slotId: financeHodSlotId,
      userId: "seed-finance",
      startsAt: now,
      endsAt: null,
      isPrimary: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      slotId: itHodSlotId,
      userId: "seed-it",
      startsAt: now,
      endsAt: null,
      isPrimary: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      slotId: adminHodSlotId,
      userId: "seed-admin-dept",
      startsAt: now,
      endsAt: null,
      isPrimary: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      slotId: hrManagerSlotId,
      userId: "seed-manager",
      startsAt: now,
      endsAt: null,
      isPrimary: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      slotId: hrStaffSlotId,
      userId: "seed-employee",
      startsAt: now,
      endsAt: null,
      isPrimary: true,
      createdAt: now,
      updatedAt: now,
    },
  ];

  const slotReportingLines = [
    {
      childSlotId: hrHodSlotId,
      parentSlotId: ceoSlotId,
      createdAt: now,
      updatedAt: now,
    },
    {
      childSlotId: financeHodSlotId,
      parentSlotId: ceoSlotId,
      createdAt: now,
      updatedAt: now,
    },
    {
      childSlotId: itHodSlotId,
      parentSlotId: ceoSlotId,
      createdAt: now,
      updatedAt: now,
    },
    {
      childSlotId: adminHodSlotId,
      parentSlotId: ceoSlotId,
      createdAt: now,
      updatedAt: now,
    },
    {
      childSlotId: hrManagerSlotId,
      parentSlotId: hrHodSlotId,
      createdAt: now,
      updatedAt: now,
    },
    {
      childSlotId: hrStaffSlotId,
      parentSlotId: hrManagerSlotId,
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

  const accounts = users.map((seedUser) => ({
    id: randomUUID(),
    accountId: seedUser.id,
    providerId: "credential",
    userId: seedUser.id,
    password: defaultPasswordHash,
    createdAt: now,
    updatedAt: now,
  }));

  await db.transaction(async (tx) => {
    await tx.delete(slotAssignment);
    await tx.delete(slotReportingLine);
    await tx.delete(positionSlot);
    await tx.delete(user);
    await tx.delete(department);

    await tx.insert(department).values(departments);
    await tx.insert(user).values(users);
    await tx.insert(account).values(accounts);
    await tx.insert(positionSlot).values(slots);
    await tx.insert(slotReportingLine).values(slotReportingLines);
    await tx.insert(slotAssignment).values(slotAssignments);

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
