"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useCallback, useState } from "react";
import { debounce } from "lodash";
import { saveDocument } from "@/lib/api/documents";
import { Save, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface DocumentEditorProps {
    documentId: string;
    initialContent?: string;
}

export default function DocumentEditor({ documentId, initialContent }: DocumentEditorProps) {
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);

    const handleSave = async (content: string) => {
        console.log(`[Editor] Saving document ${documentId}, content length: ${content.length}`);
        setIsSaving(true);
        try {
            await saveDocument(documentId, content);
            setLastSaved(new Date());

            // Track contribution (silently, so it doesn't block the UI if it fails)
            try {
                const changes = editor?.state.doc.textContent.length || 0;
                await fetch(`/api/documents/${documentId}/contribute`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ changes }),
                });
            } catch (contribError) {
                console.warn("Contribution tracking failed:", contribError);
                // We don't toast error here because the document DID save
            }
        } catch (error: any) {
            console.error("Critical save error:", error);
            toast.error(`Save failed: ${error.message || "Unknown error"}`);
        } finally {
            setIsSaving(false);
        }
    };

    const debouncedSave = useCallback(
        debounce((content: string) => {
            handleSave(content);
        }, 3000),
        [documentId]
    );

    const editor = useEditor({
        extensions: [StarterKit],
        content: initialContent || "",
        immediatelyRender: false,
        onUpdate: ({ editor }) => {
            debouncedSave(editor.getHTML());
        },
    });

    // Update editor content when initialContent changes (optional but good for consistency)
    useEffect(() => {
        if (editor && initialContent !== undefined && editor.getHTML() !== initialContent) {
            editor.commands.setContent(initialContent);
        }
    }, [initialContent, editor]);

    return (
        <div className="border border-gray-200 rounded-lg bg-white shadow-sm overflow-hidden text-black">
            <div className="flex flex-wrap items-center justify-between p-2 gap-2 border-b border-gray-200 bg-gray-50">
                <div className="flex flex-wrap gap-1">
                    <button
                        onClick={() => editor?.chain().focus().toggleBold().run()}
                        className={`px-3 py-1.5 rounded font-bold transition text-sm ${editor?.isActive("bold")
                            ? "bg-indigo-600 text-white"
                            : "bg-white border border-gray-200 hover:bg-gray-100 text-gray-700"
                            }`}
                    >
                        B
                    </button>
                    <button
                        onClick={() => editor?.chain().focus().toggleItalic().run()}
                        className={`px-3 py-1.5 rounded italic transition text-sm ${editor?.isActive("italic")
                            ? "bg-indigo-600 text-white"
                            : "bg-white border border-gray-200 hover:bg-gray-100 text-gray-700"
                            }`}
                    >
                        I
                    </button>
                    <button
                        onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
                        className={`px-3 py-1.5 rounded font-bold transition text-sm ${editor?.isActive("heading", { level: 1 })
                            ? "bg-indigo-600 text-white"
                            : "bg-white border border-gray-200 hover:bg-gray-100 text-gray-700"
                            }`}
                    >
                        H1
                    </button>
                    <button
                        onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                        className={`px-3 py-1.5 rounded font-semibold transition text-sm ${editor?.isActive("heading", { level: 2 })
                            ? "bg-indigo-600 text-white"
                            : "bg-white border border-gray-200 hover:bg-gray-100 text-gray-700"
                            }`}
                    >
                        H2
                    </button>
                    <button
                        onClick={() => editor?.chain().focus().toggleBulletList().run()}
                        className={`px-3 py-1.5 rounded transition text-sm ${editor?.isActive("bulletList")
                            ? "bg-indigo-600 text-white"
                            : "bg-white border border-gray-200 hover:bg-gray-100 text-gray-700"
                            }`}
                    >
                        • List
                    </button>
                </div>

                <div className="flex items-center gap-4">
                    <div className="text-xs text-gray-500 flex items-center gap-1.5">
                        {isSaving ? (
                            <>
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Saving...
                            </>
                        ) : lastSaved ? (
                            <>
                                <CheckCircle className="h-3 w-3 text-green-500" />
                                Saved {lastSaved.toLocaleTimeString()}
                            </>
                        ) : null}
                    </div>
                    <Button
                        size="sm"
                        variant="default"
                        className="gap-2 h-8"
                        onClick={() => editor && handleSave(editor.getHTML())}
                        disabled={isSaving}
                    >
                        <Save className="h-3.5 w-3.5" />
                        Save Now
                    </Button>
                </div>
            </div>
            <div className="p-4 bg-white">
                <EditorContent
                    editor={editor}
                    className="min-h-[500px] prose prose-sm max-w-none focus:outline-none"
                />
            </div>
        </div>
    );
}
