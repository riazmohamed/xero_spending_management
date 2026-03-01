export interface AuthSession {
  sessionToken: string;
  organisationName: string;
  tenantId: string;
}

export interface BankTransaction {
  BankTransactionID: string;
  Type: "SPEND" | "RECEIVE";
  Contact: {
    ContactID: string;
    Name: string;
  };
  DateString: string;
  Date: string;
  Status: string;
  LineAmountTypes: string;
  LineItems: LineItem[];
  SubTotal: number;
  TotalTax: number;
  Total: number;
  BankAccount: {
    AccountID: string;
    Code: string;
    Name: string;
  };
  IsReconciled: boolean;
  HasAttachments: boolean;
  UpdatedDateUTC: string;
  Reference?: string;
  CurrencyCode: string;
}

export interface LineItem {
  LineItemID: string;
  Description: string;
  Quantity: number;
  UnitAmount: number;
  AccountCode: string;
  AccountID?: string;
  TaxType: string;
  TaxAmount: number;
  LineAmount: number;
}

export interface Account {
  AccountID: string;
  Code: string;
  Name: string;
  Type: string;
  TaxType: string;
  Class: string;
  Status: string;
  Description?: string;
}

export interface Attachment {
  AttachmentID: string;
  FileName: string;
  Url: string;
  MimeType: string;
  ContentLength: number;
}

export interface StatementLine {
  statementLineId: string;
  postedDate: string;
  payee: string;
  reference: string;
  notes: string;
  chequeNo: string;
  amount: number;
  transactionDate: string;
  type: string;
  isReconciled: boolean;
  isDuplicate: boolean;
  isDeleted: boolean;
  bankAccountId: string;
  bankAccountName: string;
  currencyCode: string;
}

export interface StatementLinesResponse {
  statementLines: StatementLine[];
  totalCount: number;
  bankAccounts?: {
    accountId: string;
    accountName: string;
    unreconciledCount: number;
  }[];
}

export interface DashboardSummary {
  totalCount: number;
  bankTransactionCount: number;
  withAttachments: number;
  categorized: number;
  ready: number;
  totalSpend: number;
  totalReceive: number;
  currency: string;
}

export type ReceiptStatus =
  | "pending"
  | "processing"
  | "extracted"
  | "matched"
  | "confirmed"
  | "uploaded"
  | "failed";

export interface ReceiptLineItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface MatchCandidate {
  transactionId: string;
  contactName: string;
  amount: number;
  date: string;
  score: number;
  type: "SPEND" | "RECEIVE";
}

export interface Receipt {
  id: string;
  user_id: string;
  storage_path: string;
  original_filename: string | null;
  mime_type: string;
  status: ReceiptStatus;
  error_message: string | null;

  // OCR fields
  merchant_name: string | null;
  total_amount: number | null;
  subtotal_amount: number | null;
  tax_amount: number | null;
  transaction_date: string | null;
  currency: string;
  payment_method: string | null;
  abn: string | null;
  line_items: ReceiptLineItem[];

  // Match fields
  matched_transaction_id: string | null;
  match_confidence: number | null;
  match_candidates: MatchCandidate[];

  // Xero tracking
  xero_attachment_id: string | null;

  // Timestamps
  created_at: string;
  updated_at: string;
  extracted_at: string | null;
  matched_at: string | null;
  uploaded_at: string | null;

  // Signed URL (from list/detail endpoints)
  image_url?: string;
}

export interface ReceiptListResponse {
  receipts: Receipt[];
  totalCount: number;
}

export interface TransactionsResponse {
  BankTransactions: BankTransaction[];
}

export interface AccountsResponse {
  Accounts: Account[];
}
