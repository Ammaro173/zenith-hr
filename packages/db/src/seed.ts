import { randomUUID } from "node:crypto";
import { db } from "./index";
import { department, user, userRoleEnum, userStatusEnum } from "./schema";

async function seed() {
  const now = new Date();

  const departments = [
    {
      id: randomUUID(),
      name: "Human Resources",
      costCenterCode: "CC-HR",
      headOfDepartmentId: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: randomUUID(),
      name: "Finance",
      costCenterCode: "CC-FIN",
      headOfDepartmentId: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: randomUUID(),
      name: "IT",
      costCenterCode: "CC-IT",
      headOfDepartmentId: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: randomUUID(),
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
      role: userRoleEnum.enumValues.ADMIN,
      status: userStatusEnum.enumValues.ACTIVE,
      sapNo: "SAP-0001",
      departmentId: departments[0].id,
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
      role: userRoleEnum.enumValues.HR,
      status: userStatusEnum.enumValues.ACTIVE,
      sapNo: "SAP-0002",
      departmentId: departments[0].id,
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
      role: userRoleEnum.enumValues.FINANCE,
      status: userStatusEnum.enumValues.ACTIVE,
      sapNo: "SAP-0003",
      departmentId: departments[1].id,
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
      role: userRoleEnum.enumValues.CEO,
      status: userStatusEnum.enumValues.ACTIVE,
      sapNo: "SAP-0004",
      departmentId: departments[3].id,
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
      role: userRoleEnum.enumValues.IT,
      status: userStatusEnum.enumValues.ACTIVE,
      sapNo: "SAP-0005",
      departmentId: departments[2].id,
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
      role: userRoleEnum.enumValues.ADMIN,
      status: userStatusEnum.enumValues.ACTIVE,
      sapNo: "SAP-0006",
      departmentId: departments[3].id,
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
      role: userRoleEnum.enumValues.MANAGER,
      status: userStatusEnum.enumValues.ACTIVE,
      sapNo: "SAP-0007",
      departmentId: departments[0].id,
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
      role: userRoleEnum.enumValues.REQUESTER,
      status: userStatusEnum.enumValues.ACTIVE,
      sapNo: "SAP-0008",
      departmentId: departments[0].id,
      reportsToManagerId: "seed-manager",
      passwordHash: null,
      signatureUrl: null,
      failedLoginAttempts: 0,
      createdAt: now,
      updatedAt: now,
    },
  ];

  await db.transaction(async (tx) => {
    await tx.delete(user);
    await tx.delete(department);

    await tx.insert(department).values(departments);
    await tx.insert(user).values(users);
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
