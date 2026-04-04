import { NextRequest } from "next/server"
import { withAuth } from "@/lib/api-helpers"
import { ApiResponseHelper } from "@/lib/api-response"

export const GET = (_req: NextRequest) =>
  withAuth(_req, async (_req, user, supabase) => {
    const { data: connection } = await supabase
      .from("vinted_connections")
      .select("username, connected_at")
      .eq("user_id", user.id)
      .maybeSingle()

    return ApiResponseHelper.success({
      connected: !!connection,
      username: connection?.username ?? null,
      connectedAt: connection?.connected_at ?? null,
    })
  })
