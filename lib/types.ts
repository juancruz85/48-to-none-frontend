export type Txn = {
  id: string;
  time: string;       // ISO timestamp
  merchant: string;
  amount: number;
  country: string;
  score: number;      // fraud score 0..1
};
export const THRESHOLD = 0.7;
