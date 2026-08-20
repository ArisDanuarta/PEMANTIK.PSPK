import { createServerClient } from "@pemantik/supabase";

export async function GET() {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("communities")
      .select("id, name")
      .eq("is_active", true)
      .eq("is_sandbox", false)
      .order("name", { ascending: true });

    if (error) throw error;

    return Response.json({ communities: data || [] });
  } catch (err: any) {
    console.error("[communities-list] Error:", err);
    return Response.json({ communities: [] }, { status: 500 });
  }
}
