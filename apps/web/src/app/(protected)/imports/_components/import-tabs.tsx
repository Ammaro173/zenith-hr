"use client";

import { Building2, Users } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DepartmentImportTab } from "./department-import-tab";
import { UserImportTab } from "./user-import-tab";

/**
 * Props for the ImportTabs component
 */
export interface ImportTabsProps {
  /** Default tab to show on mount */
  defaultTab?: "users" | "departments";
}

/**
 * ImportTabs Component
 *
 * Main tabs component for the import page that separates Users and Departments
 * import flows. Each tab contains the complete import workflow including:
 * - File upload / paste
 * - Column mapping
 * - Data preview with validation
 * - Import execution
 *
 * Requirements: 7.2
 *
 * @example
 * ```tsx
 * <ImportTabs defaultTab="users" />
 * ```
 */
export function ImportTabs({ defaultTab = "users" }: ImportTabsProps) {
  return (
    <Tabs defaultValue={defaultTab}>
      <TabsList>
        <TabsTrigger value="users">
          <Users />
          Users
        </TabsTrigger>
        <TabsTrigger value="departments">
          <Building2 />
          Departments
        </TabsTrigger>
      </TabsList>

      <TabsContent value="users">
        <UserImportTab />
      </TabsContent>

      <TabsContent value="departments">
        <DepartmentImportTab />
      </TabsContent>
    </Tabs>
  );
}
