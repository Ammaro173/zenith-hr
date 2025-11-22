import type { Contract } from "./entities";

export type IContractRepository = {
  create(contract: Contract): Promise<Contract>;
  findById(id: string): Promise<Contract | null>;
  update(contract: Contract): Promise<Contract>;
};
