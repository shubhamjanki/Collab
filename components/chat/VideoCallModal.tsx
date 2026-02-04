"use client";

import { useEffect, useRef, useState } from "react";
import { X, Video } from "lucide-react";

interface VideoCallModalProps {
    isOpen: boolean;
    onClose: () => void;
    roomName: string;
    userName: string;
}

export function VideoCallModal({ isOpen, onClose, roomName, userName }: VideoCallModalProps) {
    const [isLoading, setIsLoading] = useState(true);

    // Clean room name for URL
    const cleanRoomName = roomName.replace(/[^a-zA-Z0-9-_]/g, '');
    const encodedUserName = encodeURIComponent(userName);

    // Jitsi Meet URL with iframe - configure to skip moderator requirement
    const jitsiUrl = `https://meet.jit.si/${cleanRoomName}#userInfo.displayName="${encodedUserName}"&config.startWithAudioMuted=false&config.startWithVideoMuted=false&config.prejoinPageEnabled=false&config.requireDisplayName=false`;

    const handleIframeLoad = () => {
        setIsLoading(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg w-full h-full max-w-7xl max-h-[90vh] flex flex-col m-4">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b bg-gray-50 rounded-t-lg">
                    <div className="flex items-center gap-2">
                        <Video className="h-5 w-5 text-indigo-600" />
                        <h2 className="text-lg font-semibold text-gray-900">Video Call</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-200 rounded-lg transition"
                        title="Leave Call"
                    >
                        <X className="h-5 w-5 text-gray-600" />
                    </button>
                </div>

                {/* Video Container */}
                <div className="flex-1 relative bg-gray-900 rounded-b-lg overflow-hidden">
                    {isLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
                            <div className="text-center">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                                <p className="text-white">Loading video call...</p>
                            </div>
                        </div>
                    )}
                    <iframe
                        src={jitsiUrl}
                        allow="camera; microphone; fullscreen; display-capture; autoplay"
                        className="w-full h-full border-0"
                        onLoad={handleIframeLoad}
                    />
                </div>
            </div>
        </div>
    );
}
