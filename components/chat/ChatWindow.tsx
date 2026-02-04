import React, { useEffect, useState, useRef } from "react";
import Pusher from "pusher-js";
import { useSession } from "next-auth/react";
import { Send, User as UserIcon, MessageSquare, Trash2, Video } from "lucide-react";
import { LiveKitVideoCall } from "./LiveKitVideoCall";

interface Message {
    id: string;
    content: string;
    createdAt: string;
    user: {
        id: string;
        name: string | null;
        image: string | null;
    };
}

interface ChatWindowProps {
    projectId: string;
}

export default function ChatWindow({ projectId }: ChatWindowProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isCallOpen, setIsCallOpen] = useState(false);
    const [incomingCall, setIncomingCall] = useState<{ userId: string; userName: string } | null>(null);
    const [isStartingCall, setIsStartingCall] = useState(false);
    const { data: session } = useSession();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Initialize Pusher only if keys are provided and not placeholders
        const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY;
        const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
        const isConfigured = pusherKey && pusherKey !== "your-key" && cluster;

        let channel: any = null;
        let pollInterval: NodeJS.Timeout | null = null;

        if (isConfigured) {
            const pusher = new Pusher(pusherKey, {
                cluster: cluster,
            });

            channel = pusher.subscribe(`project-${projectId}`);
            channel.bind("new-message", (data: Message) => {
                setMessages((prev) => {
                    if (prev.find(m => m.id === data.id)) return prev;
                    return [...prev, data];
                });
                scrollToBottom();
            });
            channel.bind("delete-message", (data: { id: string }) => {
                setMessages((prev) => prev.filter((m) => m.id !== data.id));
            });
            channel.bind("video-call-started", (data: { userId: string; userName: string }) => {
                if (!data || data.userId === session?.user?.id) return;
                setIncomingCall({
                    userId: data.userId,
                    userName: data.userName || "Team member",
                });
            });
        } else {
            console.warn("Pusher keys not configured. Falling back to polling.");
            // Fallback polling for hackathon demo stability
            pollInterval = setInterval(() => {
                fetch(`/api/chat/${projectId}`)
                    .then((res) => res.json())
                    .then((data) => {
                        setMessages((prev) => {
                            // Only update if we have new messages to avoid jumpy UI
                            if (data.length > prev.length) {
                                return data;
                            }
                            return prev;
                        });
                    })
                    .catch(console.error);
            }, 5000);
        }

        // Load initial messages
        fetch(`/api/chat/${projectId}`)
            .then((res) => res.json())
            .then((data) => {
                setMessages(data);
                setIsLoading(false);
                setTimeout(scrollToBottom, 100);
            })
            .catch((error) => {
                console.error("Failed to load messages:", error);
                setIsLoading(false);
            });

        return () => {
            if (channel) {
                channel.unbind_all();
                channel.unsubscribe();
            }
            if (pollInterval) clearInterval(pollInterval);
        };
    }, [projectId, session?.user?.id]);

    useEffect(() => {
        if (!session?.user || isCallOpen) return;

        let isActive = true;
        const poll = async () => {
            try {
                const response = await fetch(`/api/chat/${projectId}/participants`);
                if (!response.ok) return;
                const data = await response.json();
                if (!isActive) return;

                const participants = Array.isArray(data.participants) ? data.participants : [];
                const other = participants.find(
                    (p: { userId: string; userName?: string }) => p.userId !== session.user?.id
                );

                if (other) {
                    setIncomingCall({
                        userId: other.userId,
                        userName: other.userName || "Team member",
                    });
                } else {
                    setIncomingCall(null);
                }
            } catch {
                // Ignore polling errors; Pusher will still handle real-time updates
            }
        };

        poll();
        const interval = setInterval(poll, 5000);
        return () => {
            isActive = false;
            clearInterval(interval);
        };
    }, [projectId, session?.user, isCallOpen]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const sendMessage = async () => {
        if (!newMessage.trim() || !session?.user) return;

        try {
            await fetch(`/api/chat/${projectId}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    content: newMessage,
                    userId: session.user.id,
                }),
            });

            setNewMessage("");
        } catch (error) {
            console.error("Failed to send message:", error);
        }
    };

    const deleteMessage = async (messageId: string) => {
        if (!session?.user) return;
        const confirmed = window.confirm("Delete this message? This cannot be undone.");
        if (!confirmed) return;

        try {
            const response = await fetch(`/api/chat/${projectId}?messageId=${messageId}`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ messageId }),
            });

            if (!response.ok) {
                let errorDetails = "";
                try {
                    const data = await response.json();
                    if (data?.error) errorDetails = `: ${data.error}`;
                } catch { }
                console.error(`Failed to delete message (status ${response.status})${errorDetails}`);
                return;
            }

            setMessages((prev) => prev.filter((m) => m.id !== messageId));
        } catch (error) {
            console.error("Failed to delete message:", error);
        }
    };

    const startCall = async () => {
        if (!session?.user) return;
        setIsStartingCall(true);

        try {
            await fetch(`/api/chat/${projectId}/notify-call`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: session.user.id,
                    userName: session.user.name || "Team member",
                }),
            });
        } catch (error) {
            console.error("Failed to notify call:", error);
        } finally {
            setIsStartingCall(false);
        }

        setIncomingCall(null);
        setIsCallOpen(true);
    };

    const joinCall = () => {
        setIncomingCall(null);
        setIsCallOpen(true);
    };

    return (
        <div className="border border-gray-200 rounded-xl bg-white shadow-lg flex flex-col h-[600px] overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-lg">
                        <MessageSquare className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="font-bold">Team Workspace Chat</h3>
                        <p className="text-[10px] text-indigo-100 uppercase tracking-widest font-semibold">Real-time Sync Active</p>
                    </div>
                </div>
                <button
                    onClick={startCall}
                    disabled={!session?.user || isStartingCall || isCallOpen}
                    className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold px-3 py-2 rounded-lg transition disabled:opacity-50"
                    title="Start video call"
                >
                    <Video className="h-4 w-4" />
                    {isCallOpen ? "In Call" : isStartingCall ? "Starting..." : "Start Call"}
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/50">
                {incomingCall && !isCallOpen && (
                    <div className="flex items-center justify-between gap-3 bg-indigo-50 border border-indigo-200 text-indigo-900 px-4 py-3 rounded-xl">
                        <div className="text-sm">
                            <span className="font-semibold">{incomingCall.userName}</span> started a video call.
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={joinCall}
                                className="bg-indigo-600 text-white text-xs font-semibold px-3 py-2 rounded-lg hover:bg-indigo-700 transition"
                            >
                                Join
                            </button>
                            <button
                                onClick={() => setIncomingCall(null)}
                                className="text-xs font-semibold px-3 py-2 rounded-lg border border-indigo-200 text-indigo-700 hover:bg-indigo-100 transition"
                            >
                                Dismiss
                            </button>
                        </div>
                    </div>
                )}
                {isLoading ? (
                    <div className="flex items-center justify-center h-full text-gray-500">
                        Loading messages...
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-500">
                        No messages yet. Start the conversation!
                    </div>
                ) : (
                    messages.map((msg) => {
                        const isMe = msg.user.id === session?.user?.id;
                        return (
                            <div
                                key={msg.id}
                                className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                            >
                                <div className={`flex items-end gap-2 max-w-[85%] ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 border border-indigo-200 shadow-sm overflow-hidden">
                                        {msg.user.image ? (
                                            <img src={msg.user.image} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <UserIcon className="h-4 w-4 text-indigo-600" />
                                        )}
                                    </div>
                                    <div
                                        className={`rounded-2xl px-4 py-2 shadow-sm ${isMe
                                            ? "bg-indigo-600 text-white rounded-br-none"
                                            : "bg-white text-gray-900 border border-gray-100 rounded-bl-none"
                                            }`}
                                    >
                                        {!isMe && (
                                            <div className="text-[10px] font-bold text-indigo-600 mb-1">
                                                {msg.user.name || "Anonymous Member"}
                                            </div>
                                        )}
                                        <div className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</div>
                                        <div className={`text-[9px] mt-1 text-right ${isMe ? "text-indigo-200" : "text-gray-400"}`}>
                                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                    {isMe && (
                                        <button
                                            onClick={() => deleteMessage(msg.id)}
                                            className="text-gray-400 hover:text-red-500 transition p-1"
                                            aria-label="Delete message"
                                            title="Delete message"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="p-4 bg-white border-t border-gray-100">
                <div className="flex gap-2 bg-gray-50 p-2 rounded-2xl border border-gray-200 focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-50 transition-all">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                        className="flex-1 bg-transparent border-none focus:outline-none px-3 py-2 text-sm text-gray-900"
                        placeholder="Share something with the team..."
                    />
                    <button
                        onClick={sendMessage}
                        disabled={!newMessage.trim()}
                        className="bg-indigo-600 text-white p-2 rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-indigo-200 flex items-center justify-center aspect-square"
                    >
                        <Send className="h-4 w-4" />
                    </button>
                </div>
            </div>
            {session?.user && (
                <LiveKitVideoCall
                    isOpen={isCallOpen}
                    onClose={() => setIsCallOpen(false)}
                    projectId={projectId}
                    userName={session.user.name || "Team member"}
                    userId={session.user.id}
                />
            )}
        </div>
    );
}
