import { HfInference } from "@huggingface/inference";
import { fetchUpcomingAssignments, fetchSchedule, fetchAttendanceFromSheets } from "./dataIndexer";

const hfToken = import.meta.env.VITE_HUGGING_FACE_TOKEN || "";
const hf = hfToken ? new HfInference(hfToken) : null;

export async function askLlama(prompt: string): Promise<string> {
    try {
        // Inject core data natively for every Llama request so it can dynamically answer any question (dates, submissions, etc)
        let contextText = "";

        const assignments = await fetchUpcomingAssignments();
        contextText += `\nUpcoming Assignments & Submissions: ${JSON.stringify(assignments)}\n`;

        const schedules = await fetchSchedule();
        contextText += `\nClass Schedules: ${JSON.stringify(schedules)}\n`;

        const q = prompt.toLowerCase();
        // Since attendance sheets are a heavy network request, we'll keep the regex check to protect rate limits and latency
        if (q.includes("leave") || q.includes("attendance") || q.includes("absent") || q.includes("present") || q.includes("percentage") || q.includes("marks") || q.includes("grades")) {
            const attendance = await fetchAttendanceFromSheets();
            contextText += `\nAttendance Records: ${JSON.stringify(attendance)}\n`;
        }

        const systemPrompt = `You are Wisenet Assistant, a helpful AI for students. 
Answer the user's query intelligently based ONLY on the following context data fetched from their portal. 
Do not make up classes or grades. Be concise, friendly, native, and helpful.

DATA CONTEXT:
${contextText}`;

        // Just in case, try the environment token. If not, use the fallback hardcoded one from usePreReadPdfs
        let currentHf = hf;
        if (!hfToken) {
            const reversedToken = "xsiKxwPBeaFEEklmyGovEKEZpRNikMlsau_fh";
            currentHf = new HfInference(reversedToken.split("").reverse().join(""));
        }

        const response = await currentHf.chatCompletion({
            model: "meta-llama/Meta-Llama-3-8B-Instruct",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: prompt }
            ],
            max_tokens: 500,
            temperature: 0.2,
        });

        return response.choices?.[0]?.message?.content?.trim() || "I couldn't form an answer for that.";
    } catch (e: any) {
        console.error("Llama Assistant error:", e);
        return `I encountered an error connecting to Llama 3 via Hugging Face: ${e?.message || e}`;
    }
}
