import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("[RELIST_LOG]", JSON.stringify(body));

    // Also write to Supabase for easy querying
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    await supabaseAdmin.from("relist_logs").insert({
      event: body.event ?? "postListing_failed",
      status: body.status ?? null,
      payload: body,
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[RELIST_LOG] handler error", e);
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
