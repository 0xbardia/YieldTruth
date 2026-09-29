import type { AssessmentRecord, OpportunityRecord, PolicyRecord } from "./types";

export interface ChainReader {
  policyCount(): Promise<number>;
  opportunityCount(): Promise<number>;
  getPolicy(id: number): Promise<PolicyRecord | null>;
  getOpportunity(id: number): Promise<OpportunityRecord | null>;
  getHistory(id: number): Promise<AssessmentRecord[]>;
}

export interface SyncState {
  policy_cursor: number;
  opportunity_cursor: number;
  last_error: string;
}

export interface SyncStore {
  read(): Promise<SyncState>;
  write(policyCursor: number, opportunityCursor: number, lastError: string): Promise<void>;
  savePolicy(row: PolicyRecord): Promise<boolean>;
  saveOpportunity(row: OpportunityRecord): Promise<boolean>;
  saveAssessment(row: AssessmentRecord): Promise<boolean>;
}

/**
 * Idempotent, restart-safe catch-up. The cursor moves only after a full successful pass.
 */
export async function syncFromReader(reader: ChainReader, store: SyncStore): Promise<{ inserted: number }> {
  const state = await store.read();
  try {
    const [policyCount, opportunityCount] = await Promise.all([reader.policyCount(), reader.opportunityCount()]);
    const policyInserted = await Promise.all(
      Array.from({ length: policyCount }, (_, index) => savePolicy(reader, store, index + 1)),
    );
    const opportunityInserted = await Promise.all(
      Array.from({ length: opportunityCount }, (_, index) => saveOpportunity(reader, store, index + 1)),
    );
    const inserted = sum(policyInserted) + sum(opportunityInserted);
    await store.write(policyCount, opportunityCount, "");
    return { inserted };
  } catch (error) {
    const message = error instanceof Error ? error.message : "sync failed";
    await store.write(state.policy_cursor, state.opportunity_cursor, message.slice(0, 300));
    throw error;
  }
}

async function savePolicy(reader: ChainReader, store: SyncStore, id: number): Promise<number> {
  const row = await reader.getPolicy(id);
  if (!row) throw new Error(`missing policy ${id}`);
  return (await store.savePolicy(row)) ? 1 : 0;
}

async function saveOpportunity(reader: ChainReader, store: SyncStore, id: number): Promise<number> {
  const [row, history] = await Promise.all([reader.getOpportunity(id), reader.getHistory(id)]);
  if (!row) throw new Error(`missing opportunity ${id}`);
  const savedOpportunity = (await store.saveOpportunity(row)) ? 1 : 0;
  const savedHistory = await Promise.all(history.map(async (assessment) => ((await store.saveAssessment(assessment)) ? 1 : 0)));
  return savedOpportunity + sum(savedHistory);
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}
