import { describe, expect, it, mock } from "bun:test";
import { createDepartmentsService } from "./departments.service";

describe("DepartmentsService", () => {
  describe("create", () => {
    it("should throw error for duplicate cost center code", async () => {
      const mockDb = {
        select: mock(() => ({
          from: mock(() => ({
            where: mock(() => ({
              limit: mock(
                () => Promise.resolve([{ id: "existing-dept" }]), // Existing department
              ),
            })),
          })),
        })),
      } as any;

      const service = createDepartmentsService(mockDb);

      await expect(
        service.create({
          name: "New Department",
          costCenterCode: "CC-EXISTING",
        }),
      ).rejects.toThrow(
        "A department with this cost center code already exists",
      );
    });
  });

  describe("update", () => {
    it("should throw error for non-existent department", async () => {
      const mockDb = {
        select: mock(() => ({
          from: mock(() => ({
            where: mock(() => ({
              limit: mock(() => Promise.resolve([])),
            })),
          })),
        })),
      } as any;

      const service = createDepartmentsService(mockDb);

      await expect(
        service.update({
          id: "non-existent",
          name: "Updated Name",
        }),
      ).rejects.toThrow("Department not found");
    });
  });

  describe("delete", () => {
    it("should delete department without assigned users", async () => {
      let selectCallCount = 0;
      const mockDb = {
        select: mock(() => {
          selectCallCount++;
          if (selectCallCount === 1) {
            // Check department exists
            return {
              from: mock(() => ({
                where: mock(() => ({
                  limit: mock(() => Promise.resolve([{ id: "dept-1" }])),
                })),
              })),
            };
          }
          // Check for assigned users
          return {
            from: mock(() => ({
              where: mock(() => ({
                limit: mock(() => Promise.resolve([])), // No assigned users
              })),
            })),
          };
        }),
        delete: mock(() => ({
          where: mock(() => Promise.resolve()),
        })),
      } as any;

      const service = createDepartmentsService(mockDb);
      await expect(service.delete("dept-1")).resolves.toBeUndefined();
    });

    it("should throw error when department has assigned users", async () => {
      let selectCallCount = 0;
      const mockDb = {
        select: mock(() => {
          selectCallCount++;
          if (selectCallCount === 1) {
            // Check department exists
            return {
              from: mock(() => ({
                where: mock(() => ({
                  limit: mock(() => Promise.resolve([{ id: "dept-1" }])),
                })),
              })),
            };
          }
          // Check for assigned users
          return {
            from: mock(() => ({
              where: mock(() => ({
                limit: mock(() => Promise.resolve([{ id: "user-1" }])), // Has assigned users
              })),
            })),
          };
        }),
      } as any;

      const service = createDepartmentsService(mockDb);

      await expect(service.delete("dept-1")).rejects.toThrow(
        "Cannot delete department with assigned users",
      );
    });

    it("should throw error for non-existent department", async () => {
      const mockDb = {
        select: mock(() => ({
          from: mock(() => ({
            where: mock(() => ({
              limit: mock(() => Promise.resolve([])),
            })),
          })),
        })),
      } as any;

      const service = createDepartmentsService(mockDb);

      await expect(service.delete("non-existent")).rejects.toThrow(
        "Department not found",
      );
    });
  });

  describe("getAll", () => {
    it("should return all departments for dropdown", async () => {
      const mockDepartments = [
        { id: "dept-1", name: "Engineering" },
        { id: "dept-2", name: "Marketing" },
      ];

      const mockDb = {
        select: mock(() => ({
          from: mock(() => ({
            orderBy: mock(() => Promise.resolve(mockDepartments)),
          })),
        })),
      } as any;

      const service = createDepartmentsService(mockDb);
      const result = await service.getAll();

      expect(result).toEqual(mockDepartments);
    });
  });
});
