"use client";

import { useEffect, useState, useRef } from "react";
import { Save, Download, Upload, Minimize2, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { pusherClient } from "@/lib/pusher";

interface TeamMember {
    id: string;
    name: string;
    email: string;
}

interface ExcalidrawInVideoCallProps {
    isVisible: boolean;
    onClose: () => void;
    projectId: string;
    userName: string;
}

export function ExcalidrawInVideoCall({ isVisible, onClose, projectId, userName }: ExcalidrawInVideoCallProps) {
    const { data: session } = useSession();
    const [Excalidraw, setExcalidraw] = useState<any>(null);
    const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [scene, setScene] = useState<any>(null);
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [activeDrawer, setActiveDrawer] = useState<string | null>(null);
    const [showAssignMenu, setShowAssignMenu] = useState(false);
    const [viewOnlyMode, setViewOnlyMode] = useState(false);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const isUpdatingFromPusherRef = useRef(false);
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const lastUpdateTimeRef = useRef<number>(Date.now());

    // Load Excalidraw component dynamically
    useEffect(() => {
        if (!isVisible) return;

        import("@excalidraw/excalidraw").then((module) => {
            setExcalidraw(() => module.Excalidraw);
            setIsLoading(false);
        });
    }, [isVisible]);

    // Load team members
    useEffect(() => {
        if (!isVisible || !projectId) return;

        const loadTeamMembers = async () => {
            try {
                const response = await fetch(`/api/projects/${projectId}/members`);
                if (response.ok) {
                    const data = await response.json();
                    setTeamMembers(data.members || []);
                }
            } catch (error) {
                console.error("Failed to load team members:", error);
            }
        };

        loadTeamMembers();
    }, [isVisible, projectId]);

    // Load saved drawing when component is visible
    useEffect(() => {
        if (!isVisible || !projectId) return;

        const loadDrawing = async () => {
            try {
                const response = await fetch(`/api/excalidraw/${projectId}`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.elements) {
                        setScene({
                            elements: data.elements,
                            appState: data.appState || {},
                        });
                    }
                }
            } catch (error) {
                console.error("Failed to load Excalidraw data:", error);
            }
        };

        loadDrawing();
    }, [isVisible, projectId]);

    // Check if current user can draw
    useEffect(() => {
        if (!session?.user?.id || !activeDrawer) {
            setViewOnlyMode(false);
            return;
        }
        
        // If someone is assigned and it's not the current user, enable view-only mode
        setViewOnlyMode(activeDrawer !== session.user.id);
    }, [activeDrawer, session?.user?.id]);

    // Auto-save every 30 seconds
    useEffect(() => {
        if (!isVisible || !excalidrawAPI) return;

        intervalRef.current = setInterval(() => {
            handleSave(true);
        }, 30000);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [isVisible, excalidrawAPI]);

    // Real-time sync with Pusher or Polling fallback
    useEffect(() => {
        if (!isVisible || !projectId || !excalidrawAPI || !session?.user?.id) return;

        // Try to use Pusher for real-time sync
        if (pusherClient) {
            console.log("🔴 Initializing Pusher real-time sync for project:", projectId);
            const channel = pusherClient.subscribe(`project-${projectId}`);

            channel.bind("excalidraw-update", (data: any) => {
                console.log("📥 Received Pusher update from user:", data.userId);
                // Ignore updates from the current user
                if (data.userId === session.user.id) return;

                // Update the scene with data from other users
                isUpdatingFromPusherRef.current = true;
                excalidrawAPI.updateScene({
                    elements: data.elements,
                    appState: data.appState,
                });
                lastUpdateTimeRef.current = Date.now();
                setTimeout(() => {
                    isUpdatingFromPusherRef.current = false;
                }, 100);
            });

            return () => {
                channel.unbind("excalidraw-update");
                if (pusherClient) {
                    pusherClient.unsubscribe(`project-${projectId}`);
                }
                if (debounceTimerRef.current) {
                    clearTimeout(debounceTimerRef.current);
                }
            };
        } else {
            // Fallback to polling if Pusher is not configured
            console.log("⚠️ Pusher not configured, using polling fallback");
            
            const pollForUpdates = async () => {
                try {
                    const response = await fetch(`/api/excalidraw/${projectId}`);
                    if (response.ok) {
                        const data = await response.json();
                        // Only update if we're not currently drawing
                        if (!viewOnlyMode && data.elements && data.elements.length > 0) {
                            const currentElements = excalidrawAPI.getSceneElements();
                            // Simple check: update if element count differs
                            if (currentElements.length !== data.elements.length) {
                                isUpdatingFromPusherRef.current = true;
                                excalidrawAPI.updateScene({
                                    elements: data.elements,
                                    appState: data.appState || {},
                                });
                                setTimeout(() => {
                                    isUpdatingFromPusherRef.current = false;
                                }, 100);
                            }
                        }
                    }
                } catch (error) {
                    console.error("Failed to poll for updates:", error);
                }
            };

            // Poll every 2 seconds
            pollingIntervalRef.current = setInterval(pollForUpdates, 2000);

            return () => {
                if (pollingIntervalRef.current) {
                    clearInterval(pollingIntervalRef.current);
                }
                if (debounceTimerRef.current) {
                    clearTimeout(debounceTimerRef.current);
                }
            };
        }
    }, [isVisible, projectId, excalidrawAPI, session?.user?.id, viewOnlyMode]);

    const handleSave = async (isAutoSave = false) => {
        if (!excalidrawAPI) {
            if (!isAutoSave) toast.error("Excalidraw not initialized yet");
            return;
        }

        setIsSaving(true);

        try {
            const elements = excalidrawAPI.getSceneElements();
            const appState = excalidrawAPI.getAppState();

            console.log(`📤 Saving drawing (${isAutoSave ? 'auto' : 'manual'}):`, elements.length, "elements");

            const response = await fetch(`/api/excalidraw/${projectId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    elements,
                    appState: {
                        viewBackgroundColor: appState.viewBackgroundColor,
                        currentItemFontFamily: appState.currentItemFontFamily,
                        currentItemStrokeColor: appState.currentItemStrokeColor,
                        currentItemBackgroundColor: appState.currentItemBackgroundColor,
                    },
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to save drawing");
            }

            console.log("✅ Drawing saved successfully");
            
            if (!isAutoSave) {
                toast.success("Drawing saved!");
            }
        } catch (error) {
            console.error("❌ Failed to save Excalidraw data:", error);
            if (!isAutoSave) {
                toast.error("Failed to save drawing");
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleExport = async () => {
        if (!excalidrawAPI) {
            toast.error("Excalidraw not initialized yet");
            return;
        }

        try {
            const elements = excalidrawAPI.getSceneElements();
            const appState = excalidrawAPI.getAppState();

            const blob = new Blob(
                [JSON.stringify({ elements, appState }, null, 2)],
                { type: "application/json" }
            );

            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `excalidraw-${projectId}-${Date.now()}.json`;
            link.click();
            URL.revokeObjectURL(url);

            toast.success("Drawing exported!");
        } catch (error) {
            console.error("Failed to export drawing:", error);
            toast.error("Failed to export drawing");
        }
    };

    const handleImport = () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".json";
        input.onchange = async (e: any) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                const text = await file.text();
                const data = JSON.parse(text);

                if (data.elements && excalidrawAPI) {
                    excalidrawAPI.updateScene(data);
                    toast.success("Drawing imported!");
                }
            } catch (error) {
                console.error("Failed to import drawing:", error);
                toast.error("Failed to import drawing");
            }
        };
        input.click();
    };

    const assignDrawingControl = (memberId: string | null) => {
        setActiveDrawer(memberId);
        setShowAssignMenu(false);
        
        if (memberId === null) {
            toast.success("Drawing control released - Everyone can draw!");
        } else {
            const member = teamMembers.find(m => m.id === memberId);
            if (member) {
                toast.success(`Drawing control assigned to ${member.name}`);
            }
        }
    };

    if (!isVisible) return null;

    return (
        <div className="flex flex-col h-full bg-white rounded-lg border border-gray-700 overflow-hidden">
            {/* Compact Header */}
            <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 border-b border-gray-700">
                <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-white">Collaborative Whiteboard</h3>
                    <span className="text-xs text-indigo-200">• {userName}</span>
                    {viewOnlyMode && (
                        <span className="text-xs bg-yellow-500 text-yellow-900 px-2 py-0.5 rounded font-semibold">
                            VIEW ONLY
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    {/* Drawing Control Assignment */}
                    <div className="relative">
                        <button
                            onClick={() => setShowAssignMenu(!showAssignMenu)}
                            className="flex items-center gap-1 px-2 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded transition text-xs font-medium"
                            title="Assign drawing control"
                        >
                            <UserPlus className="h-3.5 w-3.5" />
                            Control
                        </button>
                        
                        {showAssignMenu && (
                            <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 min-w-[200px] z-50">
                                <div className="p-2">
                                    <div className="text-xs font-semibold text-gray-700 mb-2 px-2 flex items-center gap-1">
                                        <Users className="h-3 w-3" />
                                        Assign Drawing Control
                                    </div>
                                    <button
                                        onClick={() => assignDrawingControl(null)}
                                        className={`w-full text-left px-3 py-2 text-xs rounded hover:bg-gray-100 transition ${
                                            activeDrawer === null ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-gray-700'
                                        }`}
                                    >
                                        🌐 Everyone (Free Mode)
                                    </button>
                                    <div className="border-t border-gray-200 my-1"></div>
                                    {teamMembers.map((member) => (
                                        <button
                                            key={member.id}
                                            onClick={() => assignDrawingControl(member.id)}
                                            className={`w-full text-left px-3 py-2 text-xs rounded hover:bg-gray-100 transition ${
                                                activeDrawer === member.id ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-gray-700'
                                            }`}
                                        >
                                            {activeDrawer === member.id && '✓ '}
                                            {member.name || member.email}
                                        </button>
                                    ))}
                                    {teamMembers.length === 0 && (
                                        <div className="px-3 py-2 text-xs text-gray-500 text-center">
                                            No team members found
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <button
                        onClick={handleImport}
                        className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded transition"
                        title="Import"
                    >
                        <Upload className="h-3.5 w-3.5" />
                    </button>
                    <button
                        onClick={handleExport}
                        className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded transition"
                        title="Export"
                    >
                        <Download className="h-3.5 w-3.5" />
                    </button>
                    <button
                        onClick={() => handleSave(false)}
                        disabled={isSaving}
                        className="flex items-center gap-1 px-2 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded transition disabled:opacity-50 text-xs font-medium"
                        title="Save"
                    >
                        <Save className="h-3.5 w-3.5" />
                        {isSaving ? "Saving..." : "Save"}
                    </button>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded transition"
                        title="Close whiteboard"
                    >
                        <Minimize2 className="h-3.5 w-3.5" />
                    </button>
                </div>
            </div>

            {/* Excalidraw Canvas */}
            <div className="flex-1 overflow-hidden relative">
                {viewOnlyMode && (
                    <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-10 bg-yellow-500 text-yellow-900 px-4 py-2 rounded-lg shadow-lg text-sm font-semibold flex items-center gap-2">
                        <span>🔒</span>
                        View Only Mode - {teamMembers.find(m => m.id === activeDrawer)?.name || 'Unknown'} has drawing control
                    </div>
                )}
                {isLoading ? (
                    <div className="h-full flex items-center justify-center bg-gray-50">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mx-auto mb-2"></div>
                            <p className="text-gray-600 text-sm">Loading whiteboard...</p>
                        </div>
                    </div>
                ) : Excalidraw ? (
                    <div className="h-full">
                        <Excalidraw
                            excalidrawAPI={(api: any) => setExcalidrawAPI(api)}
                            initialData={scene}
                            onChange={(elements: any, appState: any) => {
                                // Broadcast changes to other users in real-time with debouncing
                                if (!isUpdatingFromPusherRef.current && !viewOnlyMode) {
                                    // Clear existing timer
                                    if (debounceTimerRef.current) {
                                        clearTimeout(debounceTimerRef.current);
                                    }
                                    // Set new timer to save after 500ms of inactivity
                                    debounceTimerRef.current = setTimeout(() => {
                                        handleSave(true);
                                    }, 500);
                                }
                            }}
                            UIOptions={{
                                canvasActions: {
                                    loadScene: false,
                                },
                            }}
                            langCode="en"
                            name={userName}
                            viewModeEnabled={viewOnlyMode}
                        />
                    </div>
                ) : (
                    <div className="h-full flex items-center justify-center bg-gray-50">
                        <p className="text-gray-600 text-sm">Failed to load whiteboard</p>
                    </div>
                )}
            </div>

            {/* Compact Footer */}
            <div className="px-3 py-1.5 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 flex items-center justify-between">
                <span>Auto-save: 30s</span>
                <div className="flex items-center gap-3">
                    {activeDrawer && (
                        <span className="text-indigo-600 font-medium">
                            🎨 {teamMembers.find(m => m.id === activeDrawer)?.name || 'Someone'} drawing
                        </span>
                    )}
                    <span className="text-green-600 font-medium">● Live</span>
                </div>
            </div>
        </div>
    );
}
