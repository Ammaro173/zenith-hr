import type { IDashboardRepository } from "@zenith-hr/domain/dashboard/repositories";
import type { GetDashboardStatsOutput } from "../dtos";

export class GetDashboardStatsUseCase {
  private readonly dashboardRepository: IDashboardRepository;

  constructor(dashboardRepository: IDashboardRepository) {
    this.dashboardRepository = dashboardRepository;
  }

  execute(): Promise<GetDashboardStatsOutput> {
    return this.dashboardRepository.getStats();
  }
}
