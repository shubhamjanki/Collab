"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { X, Save, Download, Upload } from "lucide-react";
import { toast } from "sonner";

interface ExcalidrawModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: string;
    userName: string;
}

export function ExcalidrawModal({ isOpen, onClose, projectId, userName }: ExcalidrawModalProps) {
    const [Excalidraw, setExcalidraw] = useState<any>(null);
    const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [scene, setScene] = useState<any>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    // Load Excalidraw component dynamically
    useEffect(() => {
        if (!isOpen) return;

        import("@excalidraw/excalidraw").then((module) => {
            setExcalidraw(() => module.Excalidraw);
            setIsLoading(false);
        });
    }, [isOpen]);

    // Load saved drawing when modal opens
    useEffect(() => {
        if (!isOpen || !projectId) return;

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
    }, [isOpen, projectId]);

    // Auto-save every 30 seconds
    useEffect(() => {
        if (!isOpen || !excalidrawAPI) return;

        intervalRef.current = setInterval(() => {
            handleSave(true);
        }, 30000);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [isOpen, excalidrawAPI]);

    const handleSave = async (isAutoSave = false) => {
        if (!excalidrawAPI) {
            if (!isAutoSave) toast.error("Excalidraw not initialized yet");
            return;
        }

        setIsSaving(true);

        try {
            const elements = excalidrawAPI.getSceneElements();
            const appState = excalidrawAPI.getAppState();

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

            if (!isAutoSave) {
                toast.success("Drawing saved successfully!");
            }
        } catch (error) {
            console.error("Failed to save Excalidraw data:", error);
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

            toast.success("Drawing exported successfully!");
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
                    toast.success("Drawing imported successfully!");
                }
            } catch (error) {
                console.error("Failed to import drawing:", error);
                toast.error("Failed to import drawing");
            }
        };
        input.click();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg w-full max-w-7xl h-[90vh] flex flex-col shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">Collaborative Whiteboard</h2>
                        <p className="text-sm text-gray-600">Draw, sketch, and collaborate with your team</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleImport}
                            className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition"
                            title="Import drawing"
                        >
                            <Upload className="h-4 w-4" />
                            Import
                        </button>
                        <button
                            onClick={handleExport}
                            className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition"
                            title="Export drawing"
                        >
                            <Download className="h-4 w-4" />
                            Export
                        </button>
                        <button
                            onClick={() => handleSave(false)}
                            disabled={isSaving}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition disabled:opacity-50"
                            title="Save drawing"
                        >
                            <Save className="h-4 w-4" />
                            {isSaving ? "Saving..." : "Save"}
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded-lg transition"
                            title="Close whiteboard"
                        >
                            <X className="h-5 w-5 text-gray-600" />
                        </button>
                    </div>
                </div>

                {/* Excalidraw Area */}
                <div className="flex-1 overflow-hidden">
                    {isLoading ? (
                        <div className="h-full flex items-center justify-center bg-gray-50">
                            <div className="text-center">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
                                <p className="text-gray-600 text-lg">Loading whiteboard...</p>
                            </div>
                        </div>
                    ) : Excalidraw ? (
                        <div className="h-full" style={{ fontFamily: "inherit" }}>
                            <Excalidraw
                                excalidrawAPI={(api: any) => setExcalidrawAPI(api)}
                                initialData={scene}
                                UIOptions={{
                                    canvasActions: {
                                        loadScene: false,
                                    },
                                }}
                                langCode="en"
                                name={userName}
                            />
                        </div>
                    ) : (
                        <div className="h-full flex items-center justify-center bg-gray-50">
                            <p className="text-gray-600">Failed to load whiteboard. Please try refreshing.</p>
                        </div>
                    )}
                </div>

                {/* Footer info */}
                <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 flex items-center justify-between">
                    <span>Auto-save enabled (every 30 seconds)</span>
                    <span>Collaborating as: {userName}</span>
                </div>
            </div>
        </div>
    );
}
