import { describe, expect, it } from "bun:test";
import { buildOutboxKey, buildReminderKey } from "./background-jobs";

describe("background-jobs idempotency keys", () => {
  it("buildReminderKey is stable per day + scope (approval)", () => {
    const key1 = buildReminderKey({
      dateKey: "2026-01-24",
      separationId: "sep-1",
      scope: "approval",
      status: "PENDING_MANAGER",
    });

    const key2 = buildReminderKey({
      dateKey: "2026-01-24",
      separationId: "sep-1",
      scope: "approval",
      status: "PENDING_MANAGER",
    });

    expect(key1).toBe(key2);
    expect(key1).toContain("2026-01-24");
    expect(key1).toContain("sep-1");
  });

  it("buildReminderKey differs across days", () => {
    const k1 = buildReminderKey({
      dateKey: "2026-01-24",
      separationId: "sep-1",
      scope: "approval",
      status: "PENDING_HR",
    });
    const k2 = buildReminderKey({
      dateKey: "2026-01-25",
      separationId: "sep-1",
      scope: "approval",
      status: "PENDING_HR",
    });

    expect(k1).not.toBe(k2);
  });

  it("buildOutboxKey is deterministic per recipient", () => {
    const reminderKey = buildReminderKey({
      dateKey: "2026-01-24",
      separationId: "sep-1",
      scope: "item",
      checklistItemId: "chk-1",
      reminderType: "CHECKLIST_DUE_SOON",
    });

    const u1 = buildOutboxKey(reminderKey, "user-1");
    const u2 = buildOutboxKey(reminderKey, "user-2");

    expect(u1).not.toBe(u2);
    expect(u1).toContain("user-1");
  });
});
