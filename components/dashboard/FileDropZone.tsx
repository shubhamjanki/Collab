"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";

interface FileDropZoneProps {
    projectId?: string;
}

export default function FileDropZone({ projectId }: FileDropZoneProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const router = useRouter();
    const { data: session } = useSession();

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isDragging) setIsDragging(true);
    }, [isDragging]);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        // Only stop dragging if we leave the main container
        if (e.currentTarget === e.target) {
            setIsDragging(false);
        }
    }, []);

    const onDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const files = e.dataTransfer.files;
        if (files.length === 0) return;

        const file = files[0];
        // Now using Google Conversion Engine, so we can support .doc and .docx!
        if (!file.name.toLowerCase().endsWith(".docx") && !file.name.toLowerCase().endsWith(".doc")) {
            toast.error("Please drop a Word document (.docx or .doc)");
            return;
        }

        if (!projectId) {
            toast.error("Please select or enter a project first");
            return;
        }

        uploadFile(file);
    }, [projectId]);

    const uploadFile = async (file: File) => {
        setIsUploading(true);
        setUploadProgress(10);

        const formData = new FormData();
        formData.append("file", file);
        formData.append("projectId", projectId!);

        try {
            toast.info(`Uploading ${file.name} to Google Drive...`);
            setUploadProgress(30);

            const res = await fetch("/api/documents/upload", {
                method: "POST",
                body: formData,
            });

            setUploadProgress(80);
            const data = await res.json();

            if (!res.ok) {
                // Handle specific error types
                if (res.status === 507) {
                    toast.error("Google Drive Storage Quota Exceeded", {
                        description: "Your organization's Drive storage is full. Contact your administrator to increase quota or delete unused files.",
                        duration: 6000,
                    });
                    throw new Error("Storage quota exceeded");
                } else if (res.status === 429) {
                    toast.error("Too Many Uploads", {
                        description: "Please wait a moment before uploading again.",
                        duration: 4000,
                    });
                    throw new Error("Rate limit exceeded");
                } else {
                    throw new Error(data.error || "Upload failed");
                }
            }

            setUploadProgress(100);
            toast.success("Document uploaded to Google Drive!", {
                description: "Opening in Google Docs for editing..."
            });

            // Redirect directly to Google Docs for editing
            if (data.document?.googleDocUrl) {
                // Open Google Docs in a new tab
                window.open(data.document.googleDocUrl, '_blank');
                
                // Optional: Also save document reference in app
                // Redirect to project page or stay on dashboard
                setTimeout(() => {
                    toast.success("Document opened in Google Docs!", {
                        description: "You can now edit it online."
                    });
                }, 500);
            } else if (data.document?.id) {
                // Fallback: if no Google Doc URL, go to app's preview
                router.push(`/documents/${data.document.id}`);
            }
        } catch (error: any) {
            console.error("Upload error:", error);
            // Only show toast if we haven't already shown a specific error toast
            if (!error.message?.includes("quota") && !error.message?.includes("Rate limit")) {
                toast.error(error.message || "Failed to process document", {
                    duration: 5000,
                });
            }
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
        }
    };

    useEffect(() => {
        // Add global drag and drop listeners
        const handleWindowDragOver = (e: DragEvent) => {
            e.preventDefault();
            setIsDragging(true);
        };

        const handleWindowDrop = (e: DragEvent) => {
            e.preventDefault();
            setIsDragging(false);
        };

        window.addEventListener("dragover", handleWindowDragOver);
        window.addEventListener("drop", handleWindowDrop);

        return () => {
            window.removeEventListener("dragover", handleWindowDragOver);
            window.removeEventListener("drop", handleWindowDrop);
        };
    }, []);

    if (!isDragging && !isUploading) return null;

    return (
        <div
            className={`fixed inset-0 z-[100] flex items-center justify-center p-6 transition-all duration-300 ${isDragging ? "bg-indigo-600/90 backdrop-blur-sm" : "bg-black/40 pointer-events-none"
                }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={onDrop}
        >
            <div className={`max-w-xl w-full bg-white rounded-3xl shadow-2xl p-12 text-center transform transition-transform duration-500 ${isDragging ? "scale-100 translate-y-0" : "scale-95 translate-y-4"
                }`}>
                {isUploading ? (
                    <div className="space-y-6">
                        <div className="relative w-24 h-24 mx-auto">
                            <Loader2 className="w-24 h-24 text-indigo-600 animate-spin" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <FileText className="w-10 h-10 text-indigo-500" />
                            </div>
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">Creating Google Doc</h2>
                            <p className="text-gray-600">Uploading to Google Drive cloud storage...</p>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                            <div
                                className="bg-indigo-600 h-full transition-all duration-500 ease-out"
                                style={{ width: `${uploadProgress}%` }}
                            />
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Upload className="w-12 h-12 text-indigo-600 animate-bounce" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-bold text-gray-900 mb-2">Drop to Collaborate</h2>
                            <p className="text-lg text-gray-600">
                                Your document will be uploaded to <span className="font-semibold text-green-600">Google Drive</span> for live collaboration.
                            </p>
                        </div>
                        <div className="border-2 border-dashed border-indigo-200 rounded-2xl p-6 bg-indigo-50/50">
                            <p className="text-sm text-indigo-600 font-medium">Supporting .docx and .doc files</p>
                        </div>
                        <button
                            onClick={() => setIsDragging(false)}
                            className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
