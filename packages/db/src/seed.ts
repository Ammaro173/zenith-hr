import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { db } from "./index";
import {
  account,
  department,
  jobPosition,
  separationChecklistTemplate,
  user,
  userClearanceLane,
  userPositionAssignment,
} from "./schema";

async function seed() {
  const now = new Date();
  const defaultPasswordHash = await hashPassword("Test123!");

  //TODO slot maybe like we did in MPR-0006 ?
  const hrDeptId = randomUUID();
  const financeDeptId = randomUUID();
  const itDeptId = randomUUID();
  const adminDeptId = randomUUID();

  const departments = [
    {
      id: hrDeptId,
      name: "Human Resources",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: financeDeptId,
      name: "Finance",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: itDeptId,
      name: "IT",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: adminDeptId,
      name: "Administration",
      createdAt: now,
      updatedAt: now,
    },
  ];

  const users = [
    {
      id: "seed-employee",
      name: "Hassan Fadel",
      email: "hassan.fadel@q-auto.com",
      emailVerified: true,
      role: "EMPLOYEE" as const,
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
      id: "seed-user-02",
      name: "Dina Mahmoud",
      email: "dina.mahmoud@q-auto.com",
      emailVerified: true,
      role: "EMPLOYEE" as const,
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
      id: "seed-admin",
      name: "System Administrator",
      email: "admin@q-auto.com",
      emailVerified: true,
      role: "ADMIN" as const,
      status: "ACTIVE" as const,
      sapNo: "SAP-0003",
      departmentId: adminDeptId,
      passwordHash: null,
      signatureUrl: null,
      failedLoginAttempts: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "seed-ceo",
      name: "Ahmed Al-Rashid",
      email: "ceo@q-auto.com",
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
      id: "seed-finance",
      name: "Fatima Al-Mansour",
      email: "cfo@q-auto.com",
      emailVerified: true,
      role: "HOD_FINANCE" as const,
      status: "ACTIVE" as const,
      sapNo: "SAP-0005",
      departmentId: financeDeptId,
      passwordHash: null,
      signatureUrl: null,
      failedLoginAttempts: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "seed-hr",
      name: "Omar Hassan",
      email: "chro@q-auto.com",
      emailVerified: true,
      role: "HOD_HR" as const,
      status: "ACTIVE" as const,
      sapNo: "SAP-0006",
      departmentId: hrDeptId,
      passwordHash: null,
      signatureUrl: null,
      failedLoginAttempts: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "seed-it",
      name: "Sara Al-Fahd",
      email: "cto@q-auto.com",
      emailVerified: true,
      role: "HOD_IT" as const,
      status: "ACTIVE" as const,
      sapNo: "SAP-0008",
      departmentId: itDeptId,
      passwordHash: null,
      signatureUrl: null,
      failedLoginAttempts: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "seed-user-09",
      name: "Mona Al-Rashidi",
      email: "mona.rashidi@q-auto.com",
      emailVerified: true,
      role: "EMPLOYEE" as const,
      status: "ACTIVE" as const,
      sapNo: "SAP-0009",
      departmentId: hrDeptId,
      passwordHash: null,
      signatureUrl: null,
      failedLoginAttempts: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "seed-user-10",
      name: "Sami Khoury",
      email: "sami.khoury@q-auto.com",
      emailVerified: true,
      role: "EMPLOYEE" as const,
      status: "ACTIVE" as const,
      sapNo: "SAP-0010",
      departmentId: itDeptId,
      passwordHash: null,
      signatureUrl: null,
      failedLoginAttempts: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "seed-user-11",
      name: "Karim Zayed",
      email: "karim.zayed@q-auto.com",
      emailVerified: true,
      role: "EMPLOYEE" as const,
      status: "ACTIVE" as const,
      sapNo: "SAP-0011",
      departmentId: financeDeptId,
      passwordHash: null,
      signatureUrl: null,
      failedLoginAttempts: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "seed-user-12",
      name: "Mohammed Al-Qahtani",
      email: "finance.manager@q-auto.com",
      emailVerified: true,
      role: "MANAGER" as const,
      status: "ACTIVE" as const,
      sapNo: "SAP-0012",
      departmentId: financeDeptId,
      passwordHash: null,
      signatureUrl: null,
      failedLoginAttempts: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "seed-manager",
      name: "Layla Ahmed",
      email: "hr.manager@q-auto.com",
      emailVerified: true,
      role: "MANAGER" as const,
      status: "ACTIVE" as const,
      sapNo: "SAP-0013",
      departmentId: hrDeptId,
      passwordHash: null,
      signatureUrl: null,
      failedLoginAttempts: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "seed-user-14",
      name: "Amina Kareem",
      email: "amina.kareem@q-auto.com",
      emailVerified: true,
      role: "EMPLOYEE" as const,
      status: "ACTIVE" as const,
      sapNo: "SAP-0014",
      departmentId: hrDeptId,
      passwordHash: null,
      signatureUrl: null,
      failedLoginAttempts: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "seed-user-15",
      name: "Tariq Nasser",
      email: "tariq.nasser@q-auto.com",
      emailVerified: true,
      role: "EMPLOYEE" as const,
      status: "ACTIVE" as const,
      sapNo: "SAP-0015",
      departmentId: hrDeptId,
      passwordHash: null,
      signatureUrl: null,
      failedLoginAttempts: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "seed-user-16",
      name: "Noor Al-Said",
      email: "it.manager@q-auto.com",
      emailVerified: true,
      role: "MANAGER" as const,
      status: "ACTIVE" as const,
      sapNo: "SAP-0016",
      departmentId: itDeptId,
      passwordHash: null,
      signatureUrl: null,
      failedLoginAttempts: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "seed-user-17",
      name: "Bilal Hakim",
      email: "bilal.hakim@q-auto.com",
      emailVerified: true,
      role: "EMPLOYEE" as const,
      status: "ACTIVE" as const,
      sapNo: "SAP-0017",
      departmentId: itDeptId,
      passwordHash: null,
      signatureUrl: null,
      failedLoginAttempts: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "seed-user-18",
      name: "Rana Haddad",
      email: "rana.haddad@q-auto.com",
      emailVerified: true,
      role: "EMPLOYEE" as const,
      status: "ACTIVE" as const,
      sapNo: "SAP-0018",
      departmentId: itDeptId,
      passwordHash: null,
      signatureUrl: null,
      failedLoginAttempts: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "seed-user-19",
      name: "Waleed Mustafa",
      email: "waleed.mustafa@q-auto.com",
      emailVerified: true,
      role: "EMPLOYEE" as const,
      status: "ACTIVE" as const,
      sapNo: "SAP-0019",
      departmentId: financeDeptId,
      passwordHash: null,
      signatureUrl: null,
      failedLoginAttempts: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "seed-user-20",
      name: "Yasmin Othman",
      email: "yasmin.othman@q-auto.com",
      emailVerified: true,
      role: "EMPLOYEE" as const,
      status: "ACTIVE" as const,
      sapNo: "SAP-0020",
      departmentId: financeDeptId,
      passwordHash: null,
      signatureUrl: null,
      failedLoginAttempts: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "seed-user-21",
      name: "Yusuf Hamdan",
      email: "ops.manager@q-auto.com",
      emailVerified: true,
      role: "MANAGER" as const,
      status: "ACTIVE" as const,
      sapNo: "SAP-0021",
      departmentId: hrDeptId,
      passwordHash: null,
      signatureUrl: null,
      failedLoginAttempts: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "seed-user-22",
      name: "Lina Bashir",
      email: "lina.bashir@q-auto.com",
      emailVerified: true,
      role: "EMPLOYEE" as const,
      status: "ACTIVE" as const,
      sapNo: "SAP-0022",
      departmentId: financeDeptId,
      passwordHash: null,
      signatureUrl: null,
      failedLoginAttempts: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "seed-user-23",
      name: "Rania Saleh",
      email: "rania.saleh@q-auto.com",
      emailVerified: true,
      role: "EMPLOYEE" as const,
      status: "ACTIVE" as const,
      sapNo: "SAP-0023",
      departmentId: hrDeptId,
      passwordHash: null,
      signatureUrl: null,
      failedLoginAttempts: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "seed-user-24",
      name: "Hana Al-Omari",
      email: "sales.manager@q-auto.com",
      emailVerified: true,
      role: "MANAGER" as const,
      status: "ACTIVE" as const,
      sapNo: "SAP-0024",
      departmentId: itDeptId,
      passwordHash: null,
      signatureUrl: null,
      failedLoginAttempts: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "seed-user-25",
      name: "Nadia Kamal",
      email: "nadia.kamal@q-auto.com",
      emailVerified: true,
      role: "EMPLOYEE" as const,
      status: "ACTIVE" as const,
      sapNo: "SAP-0025",
      departmentId: hrDeptId,
      passwordHash: null,
      signatureUrl: null,
      failedLoginAttempts: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "seed-user-26",
      name: "Adel Samir",
      email: "adel.samir@q-auto.com",
      emailVerified: true,
      role: "EMPLOYEE" as const,
      status: "ACTIVE" as const,
      sapNo: "SAP-0026",
      departmentId: financeDeptId,
      passwordHash: null,
      signatureUrl: null,
      failedLoginAttempts: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "seed-user-27",
      name: "Faisal Al-Harbi",
      email: "faisal.harbi@q-auto.com",
      emailVerified: true,
      role: "EMPLOYEE" as const,
      status: "ACTIVE" as const,
      sapNo: "SAP-0027",
      departmentId: financeDeptId,
      passwordHash: null,
      signatureUrl: null,
      failedLoginAttempts: 0,
      createdAt: now,
      updatedAt: now,
    },
  ];

  // Hierarchy: CEO → Admin (solo), HOD_HR, HOD_FINANCE, HOD_IT. Finance Manager (Mohammed) → 6 staff. IT Manager (Noor) under HOD_IT.
  const ceoSlotId = randomUUID();
  const hrHodSlotId = randomUUID();
  const financeHodSlotId = randomUUID();
  const itHodSlotId = randomUUID();
  const adminSlotId = randomUUID();
  const financeManagerSlotId = randomUUID();
  const hrManagerSlotId = randomUUID();
  const hrStaffSlotId = randomUUID();

  const positions = [
    {
      id: ceoSlotId,
      code: "CEO",
      name: "Chief Executive Officer",
      description: "Leads company strategy and executive decision-making.",
      responsibilities: "Strategic direction, executive approvals, governance",
      departmentId: adminDeptId,
      role: "CEO" as const,
      reportsToPositionId: null,
      active: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: hrHodSlotId,
      code: "HOD_HR",
      name: "Head of Human Resources",
      description: "Owns HR operations, policy, and talent strategy.",
      responsibilities: "HR governance, workforce planning, policy approvals",
      departmentId: hrDeptId,
      role: "HOD_HR" as const,
      reportsToPositionId: ceoSlotId,
      active: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: financeHodSlotId,
      code: "HOD_FINANCE",
      name: "Head of Finance",
      description: "Owns finance operations, controls, and approvals.",
      responsibilities: "Budget controls, financial approvals, reporting",
      departmentId: financeDeptId,
      role: "HOD_FINANCE" as const,
      reportsToPositionId: ceoSlotId,
      active: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: itHodSlotId,
      code: "HOD_IT",
      name: "Head of IT",
      description: "Leads IT systems, security, and support operations.",
      responsibilities: "Infrastructure, security, service operations",
      departmentId: itDeptId,
      role: "HOD_IT" as const,
      reportsToPositionId: ceoSlotId,
      active: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: adminSlotId,
      code: "ADMIN",
      name: "Administrator",
      description: "Administrative and facilities operations, reports to CEO.",
      responsibilities: "Admin operations, facilities, shared services",
      departmentId: adminDeptId,
      role: "ADMIN" as const,
      reportsToPositionId: ceoSlotId,
      active: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: financeManagerSlotId,
      code: "MANAGER_FINANCE",
      name: "Finance Manager",
      description: "Manages finance team and financial operations.",
      responsibilities: "Financial oversight, team management, budget control",
      departmentId: financeDeptId,
      role: "MANAGER" as const,
      reportsToPositionId: financeHodSlotId,
      active: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: hrManagerSlotId,
      code: "MANAGER_HR",
      name: "HR Line Manager",
      description: "Manages HR team execution and day-to-day operations.",
      responsibilities: "Team management, execution, coaching",
      departmentId: hrDeptId,
      role: "MANAGER" as const,
      reportsToPositionId: hrHodSlotId,
      active: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: hrStaffSlotId,
      code: "STAFF_HR_1",
      name: "HR Staff",
      description: "Supports HR operations and employee lifecycle tasks.",
      responsibilities: "HR support, records, process execution",
      departmentId: hrDeptId,
      role: "EMPLOYEE" as const,
      reportsToPositionId: hrManagerSlotId,
      active: true,
      createdAt: now,
      updatedAt: now,
    },
  ];

  const positionAssignments = [
    {
      positionId: ceoSlotId,
      userId: "seed-ceo",
      createdAt: now,
      updatedAt: now,
    },
    {
      positionId: hrHodSlotId,
      userId: "seed-hr",
      createdAt: now,
      updatedAt: now,
    },
    {
      positionId: financeHodSlotId,
      userId: "seed-finance",
      createdAt: now,
      updatedAt: now,
    },
    {
      positionId: itHodSlotId,
      userId: "seed-it",
      createdAt: now,
      updatedAt: now,
    },
    {
      positionId: adminSlotId,
      userId: "seed-admin",
      createdAt: now,
      updatedAt: now,
    },
    {
      positionId: financeManagerSlotId,
      userId: "seed-user-12",
      createdAt: now,
      updatedAt: now,
    },
    {
      positionId: hrManagerSlotId,
      userId: "seed-manager",
      createdAt: now,
      updatedAt: now,
    },
    {
      positionId: hrStaffSlotId,
      userId: "seed-employee",
      createdAt: now,
      updatedAt: now,
    },
  ];

  const assignedUserIds = new Set(positionAssignments.map((x) => x.userId));
  const reportsToByDepartment: Record<string, string> = {
    [hrDeptId]: hrManagerSlotId,
    [financeDeptId]: financeHodSlotId,
    [itDeptId]: itHodSlotId,
    [adminDeptId]: adminSlotId,
  };
  const reportsToByDepartmentAndRole: Record<
    string,
    Partial<Record<string, string>>
  > = {
    [financeDeptId]: {
      EMPLOYEE: financeManagerSlotId,
      MANAGER: financeHodSlotId,
    },
  };

  // Shared position templates for auto-generated positions (one per role+department)
  const sharedTemplates = new Map<
    string,
    { name: string; description: string; responsibilities: string }
  >([
    [
      `EMPLOYEE:${financeDeptId}`,
      {
        name: "Finance Staff",
        description: "Supports financial operations and reporting.",
        responsibilities: "Financial processing, reconciliation, reporting",
      },
    ],
    [
      `MANAGER:${financeDeptId}`,
      {
        name: "Finance Manager",
        description: "Manages finance team and financial operations.",
        responsibilities:
          "Financial oversight, team management, budget control",
      },
    ],
    [
      `EMPLOYEE:${itDeptId}`,
      {
        name: "IT Staff",
        description: "Supports IT systems and infrastructure.",
        responsibilities:
          "Technical support, system maintenance, troubleshooting",
      },
    ],
    [
      `HOD_IT:${itDeptId}`,
      {
        name: "IT Specialist",
        description: "Leads IT systems, security, and support operations.",
        responsibilities: "Infrastructure, security, service operations",
      },
    ],
    [
      `MANAGER:${itDeptId}`,
      {
        name: "IT Manager",
        description: "Manages IT team and technology operations.",
        responsibilities: "IT operations, team management, project delivery",
      },
    ],
    [
      `MANAGER:${hrDeptId}`,
      {
        name: "HR Manager",
        description: "Manages HR team execution and day-to-day operations.",
        responsibilities: "Team management, execution, coaching",
      },
    ],
    [
      `EMPLOYEE:${hrDeptId}`,
      {
        name: "HR Staff",
        description: "Supports HR operations and employee lifecycle tasks.",
        responsibilities: "HR support, records, process execution",
      },
    ],
  ]);

  const generatedPositions = users
    .filter((seedUser) => !assignedUserIds.has(seedUser.id))
    .map((seedUser) => {
      const departmentKey = seedUser.departmentId ?? adminDeptId;
      const byRole = reportsToByDepartmentAndRole[departmentKey];
      const reportsToPositionId =
        byRole?.[seedUser.role] ??
        reportsToByDepartment[departmentKey] ??
        adminSlotId;

      const template = sharedTemplates.get(
        `${seedUser.role}:${departmentKey}`,
      ) ?? {
        name: `${seedUser.name} Position`,
        description: "",
        responsibilities: "",
      };

      return {
        id: randomUUID(),
        code: `AUTO_${seedUser.sapNo.replace(/[^A-Z0-9]/g, "_")}`,
        name: `${seedUser.name} Position`,
        description: template.description || null,
        responsibilities: template.responsibilities || null,
        departmentId: seedUser.departmentId,
        role: seedUser.role,
        reportsToPositionId,
        active: true,
        createdAt: now,
        updatedAt: now,
        userId: seedUser.id,
      };
    });

  const generatedPositionRows = generatedPositions.map(
    ({ userId, ...row }) => row,
  );
  const generatedAssignmentRows = generatedPositions.map((row) => ({
    positionId: row.id,
    userId: row.userId,
    createdAt: now,
    updatedAt: now,
  }));

  const allPositions = [...positions, ...generatedPositionRows];
  const allPositionAssignments = [
    ...positionAssignments,
    ...generatedAssignmentRows,
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
      lane: "HOD_IT" as const,
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
      lane: "HOD_IT" as const,
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
      lane: "HOD_IT" as const,
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
      lane: "HOD_FINANCE" as const,
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
      lane: "HOD_FINANCE" as const,
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
    await tx.delete(userPositionAssignment);
    await tx.delete(jobPosition);
    await tx.delete(user);
    await tx.delete(department);

    await tx.insert(department).values(departments);
    await tx.insert(user).values(users);
    await tx.insert(account).values(accounts);
    await tx.insert(jobPosition).values(allPositions);
    await tx.insert(userPositionAssignment).values(allPositionAssignments);

    // Reset and seed separation templates + lane memberships.
    await tx.delete(separationChecklistTemplate);
    await tx
      .insert(separationChecklistTemplate)
      .values(separationChecklistTemplates);

    await tx.delete(userClearanceLane);
    await tx.insert(userClearanceLane).values([
      { userId: "seed-it", lane: "HOD_IT", createdAt: now },
      { userId: "seed-finance", lane: "HOD_FINANCE", createdAt: now },
      { userId: "seed-admin", lane: "ADMIN_ASSETS", createdAt: now },
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
