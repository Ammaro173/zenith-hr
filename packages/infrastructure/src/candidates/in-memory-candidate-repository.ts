import type {
  Candidate,
  ICandidateRepository,
} from "@zenith-hr/domain/candidates";

export class InMemoryCandidateRepository implements ICandidateRepository {
  private readonly storage = new Map<string, Candidate>();

  save(candidate: Candidate): Promise<void> {
    this.storage.set(candidate.id, candidate);
    return Promise.resolve();
  }

  findById(id: string): Promise<Candidate | null> {
    return Promise.resolve(this.storage.get(id) || null);
  }

  findByRequestId(requestId: string): Promise<Candidate[]> {
    return Promise.resolve(
      Array.from(this.storage.values()).filter((c) => c.requestId === requestId)
    );
  }
}
