import type { ManpowerRequest } from "./entities";

export interface IRequestRepository {
  create(request: ManpowerRequest): Promise<ManpowerRequest>;
  findById(id: string): Promise<ManpowerRequest | null>;
  update(request: ManpowerRequest): Promise<ManpowerRequest>;
  findByRequesterId(requesterId: string): Promise<ManpowerRequest[]>;
  findByStatus(status: string): Promise<ManpowerRequest[]>;
}
