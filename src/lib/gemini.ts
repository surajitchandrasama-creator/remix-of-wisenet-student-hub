import { GoogleGenerativeAI, FunctionDeclaration, SchemaType } from "@google/generative-ai";
import { fetchUpcomingAssignments, fetchSchedule, fetchAttendanceFromSheets } from "./dataIndexer";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// Tool declarations for Gemini
const assignmentDeclaration: FunctionDeclaration = {
    name: "getUpcomingAssignments",
    description: "Reads local Wisenet prototype files to find assignment due dates.",
};

const scheduleDeclaration: FunctionDeclaration = {
    name: "getClassSchedules",
    description: "Reads local Wisenet prototype files to find class schedules.",
};

const attendanceDeclaration: FunctionDeclaration = {
    name: "fetchAttendanceFromSheets",
    description: "Fetches live attendance data from linked Google Sheets for the logged-in user, ignoring local JSON.",
};

const tools = [
    {
        functionDeclarations: [assignmentDeclaration, scheduleDeclaration, attendanceDeclaration],
    },
];

export async function askGemini(prompt: string, messageHistory: any[] = []): Promise<string> {
    if (!genAI) {
        return "System Warning: Gemini API Key is missing. I'm currently unable to assist you. Please add `VITE_GEMINI_API_KEY` to the `.env.local` prototype environment and restart the server.";
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash", tools });
        const chat = model.startChat({
            history: messageHistory,
        });
        const result = await chat.sendMessage(prompt);

        let responseValue = "";
        try {
            responseValue = result.response.text();
        } catch {
            // SDK throws if response only contains a function call
        }

        // Check if there are function calls
        if (result.response.functionCalls && result.response.functionCalls.length > 0) {
            const call = result.response.functionCalls[0];
            let apiResponse = null;

            if (call.name === "getUpcomingAssignments") {
                apiResponse = await fetchUpcomingAssignments();
            } else if (call.name === "getClassSchedules") {
                apiResponse = await fetchSchedule();
            } else if (call.name === "fetchAttendanceFromSheets") {
                apiResponse = await fetchAttendanceFromSheets();
            }

            // Send the function response back to the model
            const functionResult = await chat.sendMessage([
                {
                    functionResponse: {
                        name: call.name,
                        response: { result: apiResponse },
                    },
                },
            ]);

            return functionResult.response.text();
        }

        return responseValue;
    } catch (e: any) {
        console.error("Gemini Assistant error:", e);
        return `I encountered an error: ${e?.message || e}`;
    }
}
