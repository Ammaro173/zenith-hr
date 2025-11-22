import type {
  Candidate,
  ICandidateRepository,
} from "@zenith-hr/domain/candidates";

export class InMemoryCandidateRepository implements ICandidateRepository {
  private readonly storage = new Map<string, Candidate>();

  async save(candidate: Candidate): Promise<void> {
    this.storage.set(candidate.id, candidate);
  }

  async findById(id: string): Promise<Candidate | null> {
    return this.storage.get(id) || null;
  }

  async findByRequestId(requestId: string): Promise<Candidate[]> {
    return Array.from(this.storage.values()).filter(
      (c) => c.requestId === requestId
    );
  }
}
