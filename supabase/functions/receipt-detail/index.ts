import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { extractSession } from "../_shared/token-manager.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req: Request) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  if (req.method !== "GET") {
    return errorResponse("Method not allowed", 405);
  }

  try {
    const session = await extractSession(req);
    const url = new URL(req.url);
    const receiptId = url.searchParams.get("receiptId");

    if (!receiptId) {
      return errorResponse("Missing receiptId");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: receipt, error } = await supabase
      .from("receipts")
      .select()
      .eq("id", receiptId)
      .eq("user_id", session.userId)
      .single();

    if (error || !receipt) {
      return errorResponse("Receipt not found", 404);
    }

    // Generate signed URL
    const { data: signedUrl } = await supabase.storage
      .from("receipts")
      .createSignedUrl(receipt.storage_path, 3600);

    return jsonResponse({
      ...receipt,
      image_url: signedUrl?.signedUrl || null,
    });
  } catch (err) {
    console.error("Receipt detail error:", err);
    return errorResponse(
      err instanceof Error ? err.message : "Internal error",
      500,
    );
  }
});
