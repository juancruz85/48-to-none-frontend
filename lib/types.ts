export type TxnStatus = "ok" | "cleared" | "suspicious" | "fraud";
export type Txn = {
  row: number;
  date: string | null;
  item: string;
  amount: number | null;
  type: string;
  status: TxnStatus;
  signals: string[];
  reason: string;
};
export type FeedbackLabel = "fraud" | "not_fraud";
export type FeedbackRecord = {
  profile_id: string;
  account_id: string;
  sheet_id: string;
  upload_version: string;
  row: number;
  label: FeedbackLabel;
  updated_at: string;
};
export type LocalFeedbackRecord = FeedbackRecord & {
  pending?: boolean;
  synced_label?: FeedbackLabel;
};
export type Pattern = {
  item: string;
  suspicious: boolean;
  reason: string;
  signal: string;
  charges: number;
  total: number;
  median_amount: number;
  first: string;
  last: string;
  rising_since: string;
  rising_charges: number;
  rising_total: number;
  months: { month: string; charges: number; total: number }[];
};
export type SheetStatus = "checking" | "done" | "failed" | "needs_fixing";
export type SheetReport = {
  sheet_id: string;
  upload_version: string | null;
  account_id: string | null;
  name: string;
  status: SheetStatus;
  stuck: boolean;
  error: string | null;
  vet: string[];
  totals: {
    transactions: number;
    paid: number;
    spent: number;
    irregular: number;
    sent_to_model: number;
    fraud: number;
    at_risk: number;
    suspicious: number;
    suspicious_amount: number;
  };
  patterns: Pattern[];
  baseline: {
    ready: boolean;
    as_of: string | null;
    overall: Record<string, number | null>;
  };
  analysis: string | null;
  transactions: Txn[];
};
export type Report = {
  state: string;
  busy: boolean;
  gave_up: boolean;
  last_error: string | null;
  generated_at: string;
  model: string;
  model_limit: number;
  data_dir: string | null;
  unreadable: Record<string, string>;
  sheets: SheetReport[];
};

export type ProfileTag = { tag_id: string; profile_id: string; name: string; is_default: boolean };
export type ProfileAccount = { account_id: string; tag_id: string; name: string; created_at: string };
export type Profile = {
  profile_id: string;
  created_at: string;
  default_tag_id: string;
  tags: ProfileTag[];
  accounts: ProfileAccount[];
};
export type Session = { email: string | null; profile: Profile };
