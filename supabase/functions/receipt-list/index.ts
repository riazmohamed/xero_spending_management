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
    const status = url.searchParams.get("status");
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const limit = parseInt(url.searchParams.get("limit") || "20", 10);
    const offset = (page - 1) * limit;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let query = supabase
      .from("receipts")
      .select("*", { count: "exact" })
      .eq("user_id", session.userId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq("status", status);
    }

    const { data: receipts, count, error } = await query;

    if (error) {
      return errorResponse(`Failed to fetch receipts: ${error.message}`, 500);
    }

    // Generate signed URLs for images
    const receiptsWithUrls = await Promise.all(
      (receipts || []).map(async (receipt) => {
        const { data: signedUrl } = await supabase.storage
          .from("receipts")
          .createSignedUrl(receipt.storage_path, 3600);

        return {
          ...receipt,
          image_url: signedUrl?.signedUrl || null,
        };
      }),
    );

    return jsonResponse({
      receipts: receiptsWithUrls,
      totalCount: count || 0,
    });
  } catch (err) {
    console.error("Receipt list error:", err);
    return errorResponse(
      err instanceof Error ? err.message : "Internal error",
      500,
    );
  }
});
