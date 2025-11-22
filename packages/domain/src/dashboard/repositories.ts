export interface DashboardStats {
  totalRequests: number;
  pendingRequests: number;
  approvedRequests: number;
  signedContracts: number;
  averageTimeToHire: number;
}

export interface IDashboardRepository {
  getStats(): Promise<DashboardStats>;
  getPendingRequestsCount(): Promise<number>;
  getAverageTimeToHire(): Promise<number>;
}
