import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pre_read_id, prompt } = await req.json();

    if (!pre_read_id) {
      return new Response(
        JSON.stringify({ error: "pre_read_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Set status to generating
    await supabase
      .from("pre_reads")
      .update({ summary_status: "generating" })
      .eq("id", pre_read_id);

    // Fetch pre_read record
    const { data: preRead, error: fetchError } = await supabase
      .from("pre_reads")
      .select("*")
      .eq("id", pre_read_id)
      .single();

    if (fetchError || !preRead) {
      await supabase
        .from("pre_reads")
        .update({ summary_status: "error" })
        .eq("id", pre_read_id);
      return new Response(
        JSON.stringify({ error: "Pre-read not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!preRead.source_text || !preRead.source_text.trim()) {
      await supabase
        .from("pre_reads")
        .update({ summary_status: "error" })
        .eq("id", pre_read_id);
      return new Response(
        JSON.stringify({ error: "No source text available. Please re-upload the PDF." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const hfToken = Deno.env.get("LMS_improvement");
    if (!hfToken) {
      await supabase
        .from("pre_reads")
        .update({ summary_status: "error" })
        .eq("id", pre_read_id);
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Truncate to first 6000 characters
    const truncatedText = preRead.source_text.slice(0, 6000);

    const inputText = prompt
      ? `Instruction: ${prompt}\n\nContent:\n${truncatedText}`
      : truncatedText;

    const hfResponse = await fetch(
      "https://api-inference.huggingface.co/models/facebook/bart-large-cnn",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${hfToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: inputText,
          parameters: {
            max_length: 500,
            min_length: 50,
          },
        }),
      }
    );

    if (!hfResponse.ok) {
      const errorBody = await hfResponse.text();

      if (hfResponse.status === 503) {
        await supabase
          .from("pre_reads")
          .update({ summary_status: "error" })
          .eq("id", pre_read_id);
        return new Response(
          JSON.stringify({
            error: "AI is waking up, please try again in 20 seconds",
          }),
          { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await supabase
        .from("pre_reads")
        .update({ summary_status: "error" })
        .eq("id", pre_read_id);
      return new Response(
        JSON.stringify({ error: `AI service error: ${hfResponse.status}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await hfResponse.json();
    const summaryText =
      Array.isArray(result) && result[0]?.summary_text
        ? result[0].summary_text
        : typeof result === "string"
          ? result
          : "No summary generated.";

    // Save summary
    await supabase
      .from("pre_reads")
      .update({
        summary_text: summaryText,
        summary_status: "ready",
        summary_prompt: prompt || null,
      })
      .eq("id", pre_read_id);

    return new Response(
      JSON.stringify({ summary: summaryText }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Unexpected error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
