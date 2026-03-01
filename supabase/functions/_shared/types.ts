export interface TokenRecord {
  user_id: string;
  tenant_id: string;
  access_token: string;
  refresh_token: string;
  access_token_expires_at: string;
  refresh_token_expires_at: string;
  organisation_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface XeroTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number; // seconds
  token_type: string;
  scope: string;
  id_token?: string;
}

export interface XeroTenant {
  id: string;
  authEventId: string;
  tenantId: string;
  tenantType: string;
  tenantName: string;
}

export interface XeroBankTransaction {
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
  LineItems: XeroLineItem[];
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
  Url?: string;
  CurrencyCode: string;
}

export interface XeroLineItem {
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

export interface XeroAccount {
  AccountID: string;
  Code: string;
  Name: string;
  Type: string;
  TaxType: string;
  Class: string;
  Status: string;
  Description?: string;
  EnablePaymentsToAccount?: boolean;
}

export interface XeroAttachment {
  AttachmentID: string;
  FileName: string;
  Url: string;
  MimeType: string;
  ContentLength: number;
}

export interface XeroStatementLine {
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
  payments: unknown[];
  bankTransactions: unknown[];
}

export interface XeroStatementResponse {
  statementId: string;
  startDate: string;
  endDate: string;
  importedDateTimeUtc: string;
  importSource: string;
  startBalance: number;
  endBalance: number;
  indicativeOpeningBalance: number;
  indicativeClosingBalance: number;
  statementLines: XeroStatementLine[];
}

export interface XeroBankStatementsResponse {
  bankAccountId: string;
  bankAccountName: string;
  bankAccountCurrencyCode: string;
  statements: XeroStatementResponse[];
}

export interface SessionPayload {
  userId: string;
  tenantId: string;
  organisationName: string | null;
  exp: number;
}

export interface CacheRecord {
  key: string;
  value: unknown;
  expires_at: string;
}

// Receipt OCR types

export interface ReceiptOCRResult {
  merchant_name: string | null;
  transaction_date: string | null;
  total_amount: number | null;
  subtotal: number | null;
  tax_amount: number | null;
  currency: string;
  payment_method: string | null;
  abn: string | null;
  line_items: ReceiptOCRLineItem[];
}

export interface ReceiptOCRLineItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface ReceiptRecord {
  id: string;
  user_id: string;
  storage_path: string;
  original_filename: string | null;
  mime_type: string;
  file_size_bytes: number | null;
  status: string;
  error_message: string | null;
  merchant_name: string | null;
  total_amount: number | null;
  subtotal_amount: number | null;
  tax_amount: number | null;
  transaction_date: string | null;
  currency: string;
  payment_method: string | null;
  abn: string | null;
  line_items: ReceiptOCRLineItem[];
  raw_ocr_response: unknown;
  matched_transaction_id: string | null;
  match_confidence: number | null;
  match_candidates: MatchCandidate[];
  xero_attachment_id: string | null;
  created_at: string;
  updated_at: string;
  extracted_at: string | null;
  matched_at: string | null;
  uploaded_at: string | null;
}

export interface MatchCandidate {
  transactionId: string;
  contactName: string;
  amount: number;
  date: string;
  score: number;
  type: "SPEND" | "RECEIVE";
}
