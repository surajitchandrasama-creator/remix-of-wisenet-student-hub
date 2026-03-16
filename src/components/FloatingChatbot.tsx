import { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Bot, User, Loader2 } from "lucide-react";
import { format, addDays } from "date-fns";
import Papa from "papaparse";
import { cn } from "@/lib/utils";
import { askLlama } from "@/lib/hfAssistant";

type Message = {
    id: string;
    text: string;
    isBot: boolean;
};

// Reuse logic from Attendance.tsx
const getUserSession = () => {
    try {
        const session = localStorage.getItem("wisenet_session");
        const parsed = session ? JSON.parse(session) : null;
        return parsed || { fullName: "Surajit Chandra", rollNumber: "PGP-25-213" };
    } catch {
        return { fullName: "Surajit Chandra", rollNumber: "PGP-25-213" };
    }
};

const FloatingChatbot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: "init",
            text: "Hi! I'm your Wisenet assistant. Ask me about your classes today, your marks for a subject, or how many leaves you have!",
            isBot: true,
        },
    ]);
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, isOpen]);

    const handleSend = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!input.trim()) return;

        const userText = input.trim();
        const newMessage: Message = { id: Date.now().toString(), text: userText, isBot: false };
        setMessages((prev) => [...prev, newMessage]);
        setInput("");
        setIsTyping(true);

        // Simulate network delay / bot processing
        try {
            const responseText = await askLlama(userText);
            setMessages((prev) => [
                ...prev,
                { id: (Date.now() + 1).toString(), text: responseText, isBot: true },
            ]);
        } catch (err) {
            setMessages((prev) => [
                ...prev,
                { id: (Date.now() + 1).toString(), text: "An error occurred connecting to the assistant. Please try again.", isBot: true },
            ]);
        } finally {
            setIsTyping(false);
        }
    };



    return (
        <>
            {/* Bot Toggle Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-xl hover:bg-primary/90 hover:scale-105 active:scale-95 transition-all flex items-center justify-center z-50 group"
                >
                    <MessageSquare className="h-6 w-6" />
                    <span className="absolute -top-10 right-0 bg-popover text-popover-foreground text-xs font-semibold px-3 py-1.5 rounded-lg shadow-md border opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        Need help?
                    </span>
                </button>
            )}

            {/* Chat Window */}
            {isOpen && (
                <div className="fixed bottom-6 right-6 w-80 sm:w-96 bg-card border shadow-2xl rounded-2xl z-50 overflow-hidden flex flex-col transition-all animate-in slide-in-from-bottom-5 fade-in duration-300 h-[32rem] max-h-[80vh]">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 bg-primary text-primary-foreground">
                        <div className="flex items-center gap-2">
                            <Bot className="h-5 w-5" />
                            <h3 className="font-semibold tracking-tight">Wisenet Assistant</h3>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="text-primary-foreground/80 hover:text-white transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/20">
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={cn(
                                    "flex w-full",
                                    msg.isBot ? "justify-start" : "justify-end"
                                )}
                            >
                                <div
                                    className={cn(
                                        "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
                                        msg.isBot
                                            ? "bg-secondary text-secondary-foreground rounded-tl-sm border shadow-sm"
                                            : "bg-primary text-primary-foreground rounded-tr-sm shadow-sm"
                                    )}
                                >
                                    {msg.text.split("**").map((part, i) => (
                                        i % 2 === 1 ? <strong key={i}>{part}</strong> : part
                                    ))}
                                </div>
                            </div>
                        ))}
                        {isTyping && (
                            <div className="flex w-full justify-start">
                                <div className="bg-secondary text-secondary-foreground max-w-[85%] rounded-2xl rounded-tl-sm px-4 py-3 text-sm border shadow-sm flex gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }}></span>
                                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }}></span>
                                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }}></span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <form onSubmit={handleSend} className="p-3 bg-card border-t flex gap-2">
                        <input
                            type="text"
                            placeholder="Ask me anything..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            className="flex-1 rounded-full border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground"
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || isTyping}
                            className="h-10 w-10 flex border items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
                        >
                            <Send className="h-4 w-4" />
                        </button>
                    </form>
                </div>
            )}
        </>
    );
};

export default FloatingChatbot;
