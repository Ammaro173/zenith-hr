// Department types for the Department Management page

export interface DepartmentListItem {
  id: string;
  name: string;
  costCenterCode: string;
  headOfDepartmentId: string | null;
  headOfDepartmentName: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface CreateDepartmentFormData {
  name: string;
  costCenterCode: string;
  headOfDepartmentId: string | null;
}

export interface UpdateDepartmentFormData {
  id: string;
  name?: string;
  costCenterCode?: string;
  headOfDepartmentId?: string | null;
}
