import { inArray, sql } from "drizzle-orm";
import { db } from "./index";
import { separationChecklistTemplate, user, userClearanceLane } from "./schema";

type Lane = "IT" | "FINANCE" | "ADMIN_ASSETS" | "HR_PAYROLL";

const DEFAULT_TEMPLATES = [
  // Operations
  {
    lane: "OPERATIONS" as const,
    title: "Handover company files / documents",
    description: "Return documents and complete handover notes.",
    required: true,
    defaultDueOffsetDays: 7,
    order: 0,
    active: true,
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
  },
  {
    lane: "IT" as const,
    title: "Disable SAP account",
    description: "Disable SAP / ERP access.",
    required: true,
    defaultDueOffsetDays: 3,
    order: 1,
    active: true,
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
  },
  {
    lane: "HR_PAYROLL" as const,
    title: "Final settlement",
    description: "Finalize EOSB, payroll, and repatriation (if any).",
    required: true,
    defaultDueOffsetDays: 0,
    order: 1,
    active: true,
  },
];

const ROLE_TO_LANE: Record<string, Lane> = {
  IT: "IT",
  FINANCE: "FINANCE",
  ADMIN: "ADMIN_ASSETS",
  HR: "HR_PAYROLL",
};

async function main() {
  const now = new Date();

  const [templateCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(separationChecklistTemplate);

  if ((templateCount?.count ?? 0) === 0) {
    await db.insert(separationChecklistTemplate).values(
      DEFAULT_TEMPLATES.map((t) => ({
        ...t,
        createdAt: now,
        updatedAt: now,
      })),
    );
    console.log("[backfill] seeded separation checklist templates");
  } else {
    console.log("[backfill] templates already present; skipping");
  }

  const roleUsers = await db
    .select({ id: user.id, role: user.role })
    .from(user)
    .where(inArray(user.role, ["IT", "FINANCE", "ADMIN", "HR"]));

  const existing = await db
    .select({ userId: userClearanceLane.userId, lane: userClearanceLane.lane })
    .from(userClearanceLane)
    .where(
      inArray(userClearanceLane.lane, [
        "IT",
        "FINANCE",
        "ADMIN_ASSETS",
        "HR_PAYROLL",
      ]),
    );

  const existingSet = new Set(existing.map((r) => `${r.userId}:${r.lane}`));

  const toInsert = roleUsers
    .map((u) => {
      const lane = ROLE_TO_LANE[u.role as string];
      return lane ? { userId: u.id, lane, createdAt: now } : null;
    })
    .filter((v): v is { userId: string; lane: Lane; createdAt: Date } =>
      Boolean(v),
    )
    .filter((v) => !existingSet.has(`${v.userId}:${v.lane}`));

  if (toInsert.length > 0) {
    await db.insert(userClearanceLane).values(toInsert);
    console.log(`[backfill] inserted ${toInsert.length} lane memberships`);
  } else {
    console.log("[backfill] lane memberships already present; skipping");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
