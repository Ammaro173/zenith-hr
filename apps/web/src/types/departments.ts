// Department types for the Department Management page

export interface DepartmentListItem {
  id: string;
  name: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface CreateDepartmentFormData {
  name: string;
}

export interface UpdateDepartmentFormData {
  id: string;
  name?: string;
}
