import "server-only";
import type { Election } from "@/lib/types";
import { fromDbError } from "./errors";
import { supabaseAdmin } from "./supabase";

// 公開中の選挙回（投票日が最も新しいもの）。なければ null
export async function getPublishedElection(): Promise<Election | null> {
  const { data, error } = await supabaseAdmin()
    .from("elections")
    .select(
      "id, name, description, vote_date, pledge_start_at, pledge_end_at, report_start_at, report_end_at",
    )
    .eq("status", "published")
    .order("vote_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw fromDbError(error);
  if (!data) return null;
  return {
    id: data.id,
    name: data.name,
    description: data.description,
    voteDate: data.vote_date,
    pledgeStartAt: data.pledge_start_at,
    pledgeEndAt: data.pledge_end_at,
    reportStartAt: data.report_start_at,
    reportEndAt: data.report_end_at,
  };
}
