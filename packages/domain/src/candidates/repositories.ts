import type { Candidate } from "./entities";

export interface ICandidateRepository {
  save(candidate: Candidate): Promise<void>;
  findById(id: string): Promise<Candidate | null>;
  findByRequestId(requestId: string): Promise<Candidate[]>;
}
