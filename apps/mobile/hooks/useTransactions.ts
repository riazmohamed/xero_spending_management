import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPut, apiUpload } from "../services/api";
import type {
  TransactionsResponse,
  BankTransaction,
  DashboardSummary,
  AccountsResponse,
  Attachment,
  LineItem,
  StatementLinesResponse,
  Receipt,
  ReceiptListResponse,
} from "../types";

export function useTransactions(page = 1) {
  return useQuery({
    queryKey: ["transactions", page],
    queryFn: () =>
      apiGet<TransactionsResponse>("transactions", {
        page: String(page),
      }),
  });
}

export function useTransaction(id: string) {
  return useQuery({
    queryKey: ["transaction", id],
    queryFn: () =>
      apiGet<BankTransaction>("transactions", { id }),
    enabled: !!id,
  });
}

export function useDashboardSummary() {
  return useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: () => apiGet<DashboardSummary>("transactions-summary"),
  });
}

export function useStatementLines(bankAccountId?: string) {
  return useQuery({
    queryKey: ["statement-lines", bankAccountId],
    queryFn: () =>
      apiGet<StatementLinesResponse>("statement-lines", {
        ...(bankAccountId ? { bankAccountId } : {}),
      }),
  });
}

export function useAccounts() {
  return useQuery({
    queryKey: ["accounts"],
    queryFn: () => apiGet<AccountsResponse>("accounts"),
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  });
}

export function useAttachments(transactionId: string) {
  return useQuery({
    queryKey: ["attachments", transactionId],
    queryFn: () =>
      apiGet<Attachment[]>("attachments-list", { transactionId }),
    enabled: !!transactionId,
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      transactionId,
      lineItems,
    }: {
      transactionId: string;
      lineItems: Partial<LineItem>[];
    }) =>
      apiPut<BankTransaction>("transactions-update", {
        transactionId,
        lineItems,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
  });
}

export function useUploadAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      transactionId,
      uri,
      fileName,
    }: {
      transactionId: string;
      uri: string;
      fileName: string;
    }) => {
      const formData = new FormData();
      formData.append("transactionId", transactionId);
      formData.append("fileName", fileName);
      formData.append("file", {
        uri,
        name: fileName,
        type: "image/jpeg",
      } as unknown as Blob);

      return apiUpload<Attachment>("attachments-upload", formData);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["attachments", variables.transactionId],
      });
      queryClient.invalidateQueries({
        queryKey: ["transaction", variables.transactionId],
      });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
  });
}

// --- Receipt hooks ---

export function useReceipts(status?: string) {
  return useQuery({
    queryKey: ["receipts", status],
    queryFn: () =>
      apiGet<ReceiptListResponse>("receipt-list", {
        ...(status ? { status } : {}),
      }),
  });
}

export function useReceiptDetail(id: string) {
  return useQuery({
    queryKey: ["receipt", id],
    queryFn: () => apiGet<Receipt>("receipt-detail", { receiptId: id }),
    enabled: !!id,
    refetchInterval: (query) => {
      const data = query.state.data;
      // Auto-refetch while still processing
      if (data && (data.status === "pending" || data.status === "processing")) {
        return 2000;
      }
      return false;
    },
  });
}

export function useUploadReceipt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      uri,
      fileName,
    }: {
      uri: string;
      fileName: string;
    }) => {
      const formData = new FormData();
      formData.append("fileName", fileName);
      formData.append("file", {
        uri,
        name: fileName,
        type: "image/jpeg",
      } as unknown as Blob);

      return apiUpload<Receipt>("receipt-upload", formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receipts"] });
    },
  });
}

export function useConfirmMatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      receiptId,
      transactionId,
    }: {
      receiptId: string;
      transactionId: string;
    }) =>
      apiPost<Receipt>("receipt-confirm", { receiptId, transactionId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receipts"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
  });
}

export function useRetryReceipt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ receiptId }: { receiptId: string }) =>
      apiPost<Receipt>("receipt-extract", { receiptId }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["receipt", variables.receiptId],
      });
      queryClient.invalidateQueries({ queryKey: ["receipts"] });
    },
  });
}
