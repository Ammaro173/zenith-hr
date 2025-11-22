export type DashboardStats = {
  totalRequests: number;
  pendingRequests: number;
  approvedRequests: number;
  signedContracts: number;
  averageTimeToHire: number;
};

export type IDashboardRepository = {
  getStats(): Promise<DashboardStats>;
  getPendingRequestsCount(): Promise<number>;
  getAverageTimeToHire(): Promise<number>;
};
