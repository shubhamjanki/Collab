"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { LiveKitRoom, VideoConference, RoomAudioRenderer } from "@livekit/components-react";
import { toast } from "sonner";

interface LiveKitVideoCallProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: string;
    userName: string;
    userId: string;
}

export function LiveKitVideoCall({ isOpen, onClose, projectId, userName, userId }: LiveKitVideoCallProps) {
    const [token, setToken] = useState<string>("");
    const [wsUrl, setWsUrl] = useState<string>("");
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) return;

        const fetchToken = async () => {
            try {
                setIsLoading(true);
                setError(null);

                const response = await fetch("/api/livekit/token", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        roomName: `project-${projectId}`,
                        participantName: userName,
                    }),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || "Failed to get token");
                }

                const data = await response.json();
                setToken(data.token);
                setWsUrl(data.wsUrl);
            } catch (err: any) {
                console.error("Error fetching LiveKit token:", err);
                setError(err.message);
                toast.error("Failed to join video call: " + err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchToken();
    }, [isOpen, projectId, userName]);

    const handleDisconnect = () => {
        setToken("");
        setWsUrl("");
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 rounded-lg w-full max-w-7xl h-[90vh] flex flex-col shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-700">
                    <div>
                        <h2 className="text-xl font-semibold text-white">Video Call</h2>
                        <p className="text-sm text-gray-400">Project Room</p>
                    </div>
                    <button
                        onClick={handleDisconnect}
                        className="p-2 hover:bg-gray-800 rounded-full transition"
                        title="Leave call"
                    >
                        <X className="h-6 w-6 text-white" />
                    </button>
                </div>

                {/* Video Conference Area */}
                <div className="flex-1 overflow-hidden">
                    {isLoading ? (
                        <div className="h-full flex items-center justify-center">
                            <div className="text-center">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
                                <p className="text-white text-lg">Connecting to video call...</p>
                            </div>
                        </div>
                    ) : error ? (
                        <div className="h-full flex items-center justify-center">
                            <div className="text-center max-w-md">
                                <div className="bg-red-900 bg-opacity-50 border border-red-500 rounded-lg p-6">
                                    <p className="text-red-200 text-lg font-semibold mb-2">Connection Error</p>
                                    <p className="text-red-300 text-sm mb-4">{error}</p>
                                    <button
                                        onClick={onClose}
                                        className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded transition text-white"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : token && wsUrl ? (
                        <LiveKitRoom
                            token={token}
                            serverUrl={wsUrl}
                            connect={true}
                            onDisconnected={handleDisconnect}
                            data-lk-theme="default"
                            style={{ height: "100%" }}
                        >
                            <VideoConference />
                            <RoomAudioRenderer />
                        </LiveKitRoom>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
