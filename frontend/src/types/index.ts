export interface Participant {
  name: string;
  reg_no: string;
}

export interface DrawRecord {
  id: string;
  winner_name: string;
  winner_reg_no: string;
  drawn_at: string;
  pool_size: number;
}

export interface ValidationSummary {
  fileName?: string;
  totalFetched: number;
  eligibleCount: number;
  duplicateCount: number;
  invalidCount: number;
  poolHash: string;
  source: string;
}
