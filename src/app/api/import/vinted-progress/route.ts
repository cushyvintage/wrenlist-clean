import { NextRequest } from "next/server"
import { withAuth } from "@/lib/with-auth"
import { ApiResponseHelper } from "@/lib/api-response"
import { createSupabaseServerClient } from "@/lib/supabase-server"

export const GET = withAuth(async (req, user) => {
  const since = req.nextUrl.searchParams.get("since")
  if (!since) return ApiResponseHelper.badRequest("since param required")

  const supabase = await createSupabaseServerClient()
  const { count } = await supabase
    .from("finds")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", since)

  return ApiResponseHelper.success({ count: count ?? 0 })
})
