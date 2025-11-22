import type { IDashboardRepository } from "@zenith-hr/domain/dashboard/repositories";
import type { GetDashboardStatsOutput } from "../dtos";

export class GetDashboardStatsUseCase {
  constructor(private dashboardRepository: IDashboardRepository) {}

  async execute(): Promise<GetDashboardStatsOutput> {
    return this.dashboardRepository.getStats();
  }
}
