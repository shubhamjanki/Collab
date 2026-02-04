"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { LiveKitRoom, VideoConference, RoomAudioRenderer } from "@livekit/components-react";
import "@livekit/components-styles";

interface WebRTCVideoCallProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: string;
    userName: string;
    userId: string;
}

interface Peer {
    id: string;
    name: string;
    peerId: string;
    stream?: MediaStream;
}

interface RoomParticipant {
    userId: string;
    userName: string;
    peerId?: string;
    joinedAt?: number;
}

export function WebRTCVideoCall({ isOpen, onClose, projectId, userName, userId }: WebRTCVideoCallProps) {
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [peers, setPeers] = useState<Map<string, Peer>>(new Map());
    const [isAudioEnabled, setIsAudioEnabled] = useState(true);
    const [isVideoEnabled, setIsVideoEnabled] = useState(true);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isConnecting, setIsConnecting] = useState(true);
    const [roomParticipants, setRoomParticipants] = useState<RoomParticipant[]>([]);
    const [connectionStatus, setConnectionStatus] = useState<Map<string, string>>(new Map());

    const localVideoRef = useRef<HTMLVideoElement>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const peerRef = useRef<PeerJS | null>(null);
    const callsRef = useRef<Map<string, MediaConnection>>(new Map());
    const peersRef = useRef<Map<string, Peer>>(new Map());
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const isInitializedRef = useRef(false);
    const peerReadyRef = useRef(false);
    const screenStreamRef = useRef<MediaStream | null>(null);

    useEffect(() => {
        peersRef.current = peers;
    }, [peers]);

    const updatePeers = useCallback((updater: (current: Map<string, Peer>) => Map<string, Peer>) => {
        const updated = updater(new Map(peersRef.current));
        peersRef.current = updated;
        setPeers(updated);
    }, []);

    const updateStatus = useCallback((peerUserId: string, status: string) => {
        setConnectionStatus((prev) => {
            const updated = new Map(prev);
            updated.set(peerUserId, status);
            return updated;
        });
    }, []);

    const makePeerId = useCallback(() => {
        const raw = `${projectId}-${userId}`;
        return raw.replace(/[^a-zA-Z0-9_-]/g, "");
    }, [projectId, userId]);

    const getPeerOptions = () => {
        const host = process.env.NEXT_PUBLIC_PEERJS_HOST;
        if (!host) return undefined;

        const portEnv = process.env.NEXT_PUBLIC_PEERJS_PORT;
        const port = portEnv ? Number.parseInt(portEnv, 10) : undefined;
        const path = process.env.NEXT_PUBLIC_PEERJS_PATH || "/peerjs";
        const secureEnv = process.env.NEXT_PUBLIC_PEERJS_SECURE;
        const secure = secureEnv ? secureEnv === "true" : undefined;

        return {
            host,
            port,
            path,
            secure,
        };
    };

    useEffect(() => {
        if (!isOpen || isInitializedRef.current) return;
        initializeCall();

        return () => {
            if (!isOpen) {
                cleanup();
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    const initializeCall = async () => {
        try {
            setIsConnecting(true);
            setError(null);
            isInitializedRef.current = true;

            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    frameRate: { ideal: 30 },
                },
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
            });

            localStreamRef.current = stream;
            setLocalStream(stream);
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
            }

            initializePeer();
        } catch (err: any) {
            console.error("Error initializing call:", err);
            setError(err.message || "Failed to access camera/microphone");
            if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
                setError("Camera or microphone not found. Please check your devices.");
            } else if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
                setError("Permission denied. Please allow camera and microphone access.");
            } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
                setError("Device is already in use by another application.");
            }
            setIsConnecting(false);
        }
    };

    const initializePeer = () => {
        const peerId = makePeerId();
        const options = getPeerOptions();
        const peer = options ? new PeerJS(peerId, options) : new PeerJS(peerId);
        peerRef.current = peer;

        peer.on("open", () => {
            peerReadyRef.current = true;
            announcePresence(peerId);
            fetchParticipants();
            startParticipantsPolling();
            setIsConnecting(false);
        });

        peer.on("call", (call) => {
            handleIncomingCall(call);
        });

        peer.on("error", (err) => {
            console.error("PeerJS error:", err);
            setError("Video call connection error. Please retry.");
        });
    };

    const announcePresence = async (peerId: string, retryCount = 0) => {
        try {
            await fetch(`/api/chat/${projectId}/signal`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: "user-joined",
                    userId,
                    userName,
                    peerId,
                    timestamp: Date.now(),
                }),
            });
        } catch (err) {
            if (retryCount < 3) {
                setTimeout(() => announcePresence(peerId, retryCount + 1), 1000);
            } else {
                console.error("Failed to announce presence after 3 retries");
            }
        }
    };

    const fetchParticipants = async () => {
        if (!peerReadyRef.current) return;
        try {
            const response = await fetch(`/api/chat/${projectId}/participants`);
            const data = await response.json();
            if (data.participants) {
                setRoomParticipants(data.participants);
                data.participants.forEach((participant: RoomParticipant) => {
                    connectToParticipant(participant);
                });
            }
        } catch (err) {
            console.error("Error fetching participants:", err);
        }
    };

    const startParticipantsPolling = () => {
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
        }

        pollingIntervalRef.current = setInterval(() => {
            fetchParticipants();
        }, 5000);
    };

    const registerCall = (participant: RoomParticipant, call: MediaConnection) => {
        const targetId = participant.userId;
        const targetName = participant.userName || "Participant";
        const targetPeerId = participant.peerId || call.peer;

        const existing = callsRef.current.get(targetId);
        if (existing && existing !== call) {
            try {
                existing.close();
            } catch {
                // ignore
            }
        }

        callsRef.current.set(targetId, call);
        updateStatus(targetId, "connecting");

        updatePeers((current) => {
            const existingPeer = current.get(targetId);
            current.set(targetId, {
                id: targetId,
                name: targetName,
                peerId: targetPeerId,
                stream: existingPeer?.stream,
            });
            return current;
        });

        call.on("stream", (remoteStream) => {
            updatePeers((current) => {
                current.set(targetId, {
                    id: targetId,
                    name: targetName,
                    peerId: targetPeerId,
                    stream: remoteStream,
                });
                return current;
            });
            updateStatus(targetId, "connected");
        });

        call.on("close", () => {
            cleanupRemote(targetId);
        });

        call.on("error", (err) => {
            console.error("Media call error:", err);
            updateStatus(targetId, "failed");
        });
    };

    const cleanupRemote = (peerUserId: string) => {
        callsRef.current.delete(peerUserId);
        updatePeers((current) => {
            current.delete(peerUserId);
            return current;
        });
        setConnectionStatus((prev) => {
            const updated = new Map(prev);
            updated.delete(peerUserId);
            return updated;
        });
    };

    const handleIncomingCall = (call: MediaConnection) => {
        const stream = localStreamRef.current;
        if (!stream) {
            call.close();
            return;
        }

        const metadata = (call.metadata || {}) as { userId?: string; userName?: string };
        const remoteUserId = metadata.userId || call.peer;
        const remoteUserName = metadata.userName || "Participant";

        call.answer(stream);
        registerCall(
            {
                userId: remoteUserId,
                userName: remoteUserName,
                peerId: call.peer,
            },
            call
        );
    };

    const connectToParticipant = (participant: RoomParticipant, force = false) => {
        const peer = peerRef.current;
        const stream = localStreamRef.current;
        if (!peer || !peer.open || !stream) return;
        if (!participant.peerId) return;
        if (participant.userId === userId) return;
        if (callsRef.current.has(participant.userId)) return;

        const shouldInitiate = userId.localeCompare(participant.userId) > 0;
        if (!force && !shouldInitiate) return;

        const call = peer.call(participant.peerId, stream, {
            metadata: {
                userId,
                userName,
            },
        });

        registerCall(participant, call);
    };

    useEffect(() => {
        const stream = localStreamRef.current || localStream;
        if (!stream) return;

        callsRef.current.forEach((call) => {
            const pc = (call as any).peerConnection as RTCPeerConnection | undefined;
            if (!pc) return;

            const audioTrack = stream.getAudioTracks()[0];
            const videoTrack = stream.getVideoTracks()[0];
            const senders = pc.getSenders();

            if (audioTrack) {
                const audioSender = senders.find((s) => s.track?.kind === "audio");
                if (audioSender) {
                    audioSender.replaceTrack(audioTrack);
                }
            }

            if (videoTrack) {
                const videoSender = senders.find((s) => s.track?.kind === "video");
                if (videoSender) {
                    videoSender.replaceTrack(videoTrack);
                }
            }
        });
    }, [localStream]);

    const toggleAudio = () => {
        const stream = localStreamRef.current || localStream;
        if (stream) {
            const audioTracks = stream.getAudioTracks();
            if (audioTracks.length > 0) {
                audioTracks[0].enabled = !audioTracks[0].enabled;
                setIsAudioEnabled(audioTracks[0].enabled);
            }
        }
    };

    const toggleVideo = () => {
        const stream = localStreamRef.current || localStream;
        if (stream) {
            const videoTracks = stream.getVideoTracks();
            if (videoTracks.length > 0) {
                videoTracks[0].enabled = !videoTracks[0].enabled;
                setIsVideoEnabled(videoTracks[0].enabled);
            }
        }
    };

    const replaceVideoTrackInCalls = (track: MediaStreamTrack) => {
        callsRef.current.forEach((call) => {
            const pc = (call as any).peerConnection as RTCPeerConnection | undefined;
            if (!pc) return;
            const sender = pc.getSenders().find((s) => s.track?.kind === "video");
            if (sender) {
                sender.replaceTrack(track);
            }
        });
    };

    const toggleScreenShare = async () => {
        try {
            if (!isScreenSharing) {
                const screenStream = await navigator.mediaDevices.getDisplayMedia({
                    video: {
                        cursor: "always",
                        displaySurface: "monitor",
                    } as any,
                    audio: false,
                });

                screenStreamRef.current = screenStream;
                const screenTrack = screenStream.getVideoTracks()[0];
                replaceVideoTrackInCalls(screenTrack);

                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = screenStream;
                }

                screenTrack.onended = () => {
                    if (isScreenSharing) {
                        toggleScreenShare();
                    }
                };

                setIsScreenSharing(true);
            } else {
                const stream = localStreamRef.current || localStream;
                if (stream) {
                    const videoTrack = stream.getVideoTracks()[0];
                    if (videoTrack) {
                        replaceVideoTrackInCalls(videoTrack);
                    }
                    if (localVideoRef.current) {
                        localVideoRef.current.srcObject = stream;
                    }
                }

                if (screenStreamRef.current) {
                    screenStreamRef.current.getTracks().forEach((track) => track.stop());
                    screenStreamRef.current = null;
                }
                setIsScreenSharing(false);
            }
        } catch (err) {
            console.error("Error toggling screen share:", err);
        }
    };

    const sendLeaveSignal = async () => {
        try {
            await fetch(`/api/chat/${projectId}/signal`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: "user-left",
                    userId,
                    timestamp: Date.now(),
                }),
            });
        } catch (err) {
            console.error("Failed to notify leave:", err);
        }
    };

    const cleanup = () => {
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
        }

        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((track) => track.stop());
        }

        if (screenStreamRef.current) {
            screenStreamRef.current.getTracks().forEach((track) => track.stop());
            screenStreamRef.current = null;
        }

        callsRef.current.forEach((call) => {
            try {
                call.close();
            } catch {
                // ignore
            }
        });
        callsRef.current.clear();

        if (peerRef.current) {
            try {
                peerRef.current.destroy();
            } catch {
                // ignore
            }
            peerRef.current = null;
        }

        sendLeaveSignal();

        setPeers(new Map());
        setLocalStream(null);
        localStreamRef.current = null;
        isInitializedRef.current = false;
        setIsConnecting(false);
    };

    const handleClose = () => {
        cleanup();
        onClose();
    };

    const reconnectPeer = async (peerUserId: string) => {
        const participant = roomParticipants.find((p) => p.userId === peerUserId);
        if (!participant) return;

        const existing = callsRef.current.get(peerUserId);
        if (existing) {
            try {
                existing.close();
            } catch {
                // ignore
            }
            callsRef.current.delete(peerUserId);
        }

        connectToParticipant(participant, true);
    };

    const getConnectionStatus = (peerId: string) => {
        return connectionStatus.get(peerId) || "connecting";
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
            <div className="bg-gray-900 rounded-lg w-full h-full max-w-7xl max-h-[90vh] flex flex-col m-4">
                <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-800 rounded-t-lg">
                    <div className="flex items-center gap-3">
                        <Video className="h-5 w-5 text-indigo-400" />
                        <h2 className="text-lg font-semibold text-white">Video Call</h2>
                        <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-400">
                                {peers.size + 1} participant{peers.size !== 0 ? "s" : ""}
                            </span>
                        </div>
                        {isConnecting && (
                            <div className="flex items-center gap-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                <span className="text-sm text-yellow-400">Connecting...</span>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 hover:bg-gray-700 rounded-lg transition"
                        title="Leave Call"
                    >
                        <X className="h-5 w-5 text-gray-400" />
                    </button>
                </div>

                <div className="flex-1 p-4 overflow-auto">
                    {error ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-center text-white">
                                <VideoOff className="h-16 w-16 mx-auto mb-4 text-red-400" />
                                <p className="text-lg mb-2">{error}</p>
                                <div className="space-y-2">
                                    <button
                                        onClick={initializeCall}
                                        className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition block w-full"
                                    >
                                        Retry
                                    </button>
                                    <button
                                        onClick={handleClose}
                                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition block w-full"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div
                            className={`grid gap-4 h-full ${
                                peers.size === 0
                                    ? "grid-cols-1 max-w-2xl mx-auto"
                                    : peers.size === 1
                                        ? "grid-cols-2"
                                        : peers.size <= 3
                                            ? "grid-cols-2"
                                            : "grid-cols-3"
                            }`}
                        >
                            <div className="relative bg-gray-800 rounded-lg overflow-hidden aspect-video border-2 border-indigo-500">
                                <video
                                    ref={localVideoRef}
                                    autoPlay
                                    muted
                                    playsInline
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute top-2 left-2 bg-black bg-opacity-60 px-3 py-1 rounded text-white text-sm flex items-center gap-2">
                                    <div
                                        className={`h-2 w-2 rounded-full ${
                                            isAudioEnabled ? "bg-green-500" : "bg-red-500"
                                        }`}
                                    ></div>
                                    {userName} (You)
                                </div>
                                {!isVideoEnabled && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-gray-700">
                                        <div className="text-center">
                                            <div className="w-20 h-20 rounded-full bg-indigo-600 flex items-center justify-center text-white text-3xl font-bold mx-auto">
                                                {userName[0]?.toUpperCase()}
                                            </div>
                                            <p className="mt-2 text-sm text-gray-300">Camera off</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {Array.from(peers.values()).map((peer) => (
                                <RemoteVideo
                                    key={peer.id}
                                    peer={peer}
                                    connectionStatus={getConnectionStatus(peer.id)}
                                    onReconnect={() => reconnectPeer(peer.id)}
                                />
                            ))}

                            {peers.size === 0 && !isConnecting && (
                                <div className="flex flex-col items-center justify-center h-full text-center">
                                    <Users className="h-16 w-16 text-gray-600 mb-4" />
                                    <h3 className="text-xl font-semibold text-white mb-2">Waiting for others to join</h3>
                                    <p className="text-gray-400">Share this call link with others to start the video call</p>
                                    <div className="mt-4 p-3 bg-gray-800 rounded-lg">
                                        <code className="text-sm text-indigo-300">Room: {projectId}</code>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="p-4 bg-gray-800 border-t border-gray-700 rounded-b-lg">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                            <div
                                className={`h-2 w-2 rounded-full ${
                                    isConnecting ? "bg-yellow-500 animate-pulse" : "bg-green-500"
                                }`}
                            ></div>
                            {isConnecting ? "Connecting..." : "Connected"}
                        </div>

                        <div className="flex items-center justify-center gap-4">
                            <button
                                onClick={toggleAudio}
                                className={`p-4 rounded-full transition flex items-center gap-2 ${
                                    isAudioEnabled
                                        ? "bg-gray-700 hover:bg-gray-600 text-white"
                                        : "bg-red-600 hover:bg-red-700 text-white"
                                }`}
                                title={isAudioEnabled ? "Mute" : "Unmute"}
                            >
                                {isAudioEnabled ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
                            </button>

                            <button
                                onClick={toggleVideo}
                                className={`p-4 rounded-full transition flex items-center gap-2 ${
                                    isVideoEnabled
                                        ? "bg-gray-700 hover:bg-gray-600 text-white"
                                        : "bg-red-600 hover:bg-red-700 text-white"
                                }`}
                                title={isVideoEnabled ? "Turn off camera" : "Turn on camera"}
                            >
                                {isVideoEnabled ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
                            </button>

                            <button
                                onClick={toggleScreenShare}
                                className={`p-4 rounded-full transition flex items-center gap-2 ${
                                    isScreenSharing
                                        ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                                        : "bg-gray-700 hover:bg-gray-600 text-white"
                                }`}
                                title={isScreenSharing ? "Stop sharing" : "Share screen"}
                            >
                                {isScreenSharing ? <MonitorOff className="h-6 w-6" /> : <Monitor className="h-6 w-6" />}
                            </button>

                            <button
                                onClick={handleClose}
                                className="p-4 rounded-full bg-red-600 hover:bg-red-700 text-white transition flex items-center gap-2"
                                title="Leave call"
                            >
                                <PhoneOff className="h-6 w-6" />
                                <span className="hidden sm:inline">Leave</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function RemoteVideo({
    peer,
    connectionStatus,
    onReconnect,
}: {
    peer: Peer;
    connectionStatus: string;
    onReconnect: () => void;
}) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [hasVideo, setHasVideo] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);

    useEffect(() => {
        if (videoRef.current && peer.stream) {
            videoRef.current.srcObject = peer.stream;
            videoRef.current.play().catch(() => {
                // Autoplay might be blocked; user interaction will start playback
            });

            const updateTrackState = () => {
                const videoTracks = peer.stream?.getVideoTracks() || [];
                setHasVideo(videoTracks.length > 0 && videoTracks.some((track) => track.enabled));

                const audioTracks = peer.stream?.getAudioTracks() || [];
                if (audioTracks.length > 0 && !audioContextRef.current) {
                    setupAudioAnalysis(peer.stream as MediaStream);
                }
            };

            updateTrackState();

            const handleAddTrack = () => updateTrackState();
            const handleRemoveTrack = () => updateTrackState();

            peer.stream.addEventListener("addtrack", handleAddTrack);
            peer.stream.addEventListener("removetrack", handleRemoveTrack);

            return () => {
                peer.stream?.removeEventListener("addtrack", handleAddTrack);
                peer.stream?.removeEventListener("removetrack", handleRemoveTrack);
            };
        }
    }, [peer.stream]);

    const setupAudioAnalysis = (stream: MediaStream) => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            analyserRef.current = audioContextRef.current.createAnalyser();

            const source = audioContextRef.current.createMediaStreamSource(stream);
            source.connect(analyserRef.current);

            const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);

            const checkAudio = () => {
                if (!analyserRef.current) return;

                analyserRef.current.getByteFrequencyData(dataArray);
                const average = dataArray.reduce((a, b) => a + b) / dataArray.length;

                setIsSpeaking(average > 10);
                requestAnimationFrame(checkAudio);
            };

            checkAudio();
        }
    };

    return (
        <div
            className={`relative bg-gray-800 rounded-lg overflow-hidden aspect-video border-2 ${
                isSpeaking ? "border-green-500" : "border-transparent"
            }`}
        >
            {peer.stream ? (
                <>
                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                    {!hasVideo && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-700">
                            <div className="text-center">
                                <div className="w-20 h-20 rounded-full bg-purple-600 flex items-center justify-center text-white text-3xl font-bold mx-auto">
                                    {peer.name[0]?.toUpperCase()}
                                </div>
                                <p className="mt-2 text-sm text-gray-300">Camera off</p>
                            </div>
                        </div>
                    )}
                    <div className="absolute top-2 left-2 bg-black bg-opacity-60 px-3 py-1 rounded text-white text-sm flex items-center gap-2">
                        <div
                            className={`h-2 w-2 rounded-full ${
                                connectionStatus === "connected"
                                    ? "bg-green-500"
                                    : connectionStatus === "connecting"
                                        ? "bg-yellow-500 animate-pulse"
                                        : "bg-red-500"
                            }`}
                        ></div>
                        {peer.name}
                    </div>

                    {connectionStatus !== "connected" && (
                        <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center">
                            <div className="text-center">
                                <WifiOff className="h-8 w-8 text-yellow-400 mx-auto mb-2" />
                                <p className="text-white text-sm mb-2">{connectionStatus}</p>
                                <button
                                    onClick={onReconnect}
                                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 rounded text-xs transition"
                                >
                                    Reconnect
                                </button>
                            </div>
                        </div>
                    )}
                </>
            ) : (
                <div className="flex items-center justify-center h-full bg-gray-700">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                        <p className="text-white text-sm">Connecting to {peer.name}...</p>
                        <p className="text-xs text-gray-400 mt-1">{connectionStatus}</p>
                    </div>
                </div>
            )}
        </div>
    );
}
