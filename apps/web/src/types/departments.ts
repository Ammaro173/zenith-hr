// Department types for the Department Management page

export interface DepartmentListItem {
  createdAt: string | Date;
  id: string;
  name: string;
  updatedAt: string | Date;
}

export interface CreateDepartmentFormData {
  name: string;
}

export interface UpdateDepartmentFormData {
  id: string;
  name?: string;
}
