"use client";

import React, { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { Editor, EditorState, convertFromRaw, ContentState } from "draft-js";
import dynamic from "next/dynamic";
import {
    FileText, ExternalLink, RefreshCw, Loader2,
    AlertCircle, ArrowLeft, MoreHorizontal, Share2, Copy, CheckCircle, Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { PageLetterhead } from "./PageLetterhead";
import { PageDots } from "./PageDots"; // New component for floating navigation

// Dynamic import for html-to-draftjs (only client-side)
let htmlToDraft: any = null;
if (typeof window !== "undefined") {
    import("html-to-draftjs").then(module => {
        htmlToDraft = module.default;
    });
}

// A4 dimensions
const A4_HEIGHT_PX = 1122;
const A4_WIDTH_PX = 794;
const A4_PADDING_PX = 60;

interface DocumentPreviewerProps {
    documentId: string;
    initialContent?: string;
    documentTitle?: string;
    googleDocUrl?: string | null;
    onSyncSuccess?: () => void;
    projectId?: string;
    projectName?: string;
}

export default function DocumentPreviewer({
    documentId,
    initialContent,
    documentTitle,
    googleDocUrl: initialGoogleDocUrl,
    onSyncSuccess,
    projectId,
    projectName,
}: DocumentPreviewerProps) {
    const router = useRouter();
    const editorContainerRef = useRef<HTMLDivElement>(null);
    const [googleDocUrl, setGoogleDocUrl] = useState<string | null>(initialGoogleDocUrl || null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isUpdatingUrl, setIsUpdatingUrl] = useState(false);
    const [tempUrl, setTempUrl] = useState(initialGoogleDocUrl || "");
    const [showShareDialog, setShowShareDialog] = useState(false);
    const [shareUrl, setShareUrl] = useState<string | null>(null);
    const [isGeneratingShare, setIsGeneratingShare] = useState(false);
    const [copied, setCopied] = useState(false);
    const [htmlCurrentPage, setHtmlCurrentPage] = useState(1);
    const [isLinkPopoverOpen, setIsLinkPopoverOpen] = useState(false);
    const [isHtmlToDraftReady, setIsHtmlToDraftReady] = useState(false);

    // Detect document type
    const isPDF = initialContent?.startsWith("data:application/pdf;base64,");

    // Wait for html-to-draftjs to load (if needed)
    useEffect(() => {
        if (typeof window !== "undefined" && !isPDF) {
            const checkReady = setInterval(() => {
                if (htmlToDraft) {
                    setIsHtmlToDraftReady(true);
                    clearInterval(checkReady);
                }
            }, 100);
            return () => clearInterval(checkReady);
        } else {
            setIsHtmlToDraftReady(true);
        }
    }, [isPDF]);

    // Parse content into Draft.js EditorState pages
    const parseContent = useCallback((content: string | undefined): EditorState[] => {
        if (!content || isPDF || content === "<p>Start typing here...</p>" || !isHtmlToDraftReady) {
            return [EditorState.createEmpty()];
        }

        try {
            const parsed = JSON.parse(content);
            if (Array.isArray(parsed)) {
                return parsed.map(raw => EditorState.createWithContent(convertFromRaw(raw)));
            }
            if (parsed.blocks) {
                return [EditorState.createWithContent(convertFromRaw(parsed))];
            }
        } catch (e) {
            if (htmlToDraft) {
                try {
                    const contentBlock = htmlToDraft(content);
                    if (contentBlock) {
                        const contentState = ContentState.createFromBlockArray(contentBlock.contentBlocks);
                        return [EditorState.createWithContent(contentState)];
                    }
                } catch (htmlError) {
                    console.warn("HTML parsing failed", htmlError);
                }
            }
        }
        return [EditorState.createEmpty()];
    }, [isPDF, isHtmlToDraftReady]);

    const [pageStates, setPageStates] = useState<EditorState[]>(() => parseContent(initialContent));

    useEffect(() => {
        if (!isPDF && isHtmlToDraftReady) {
            setPageStates(parseContent(initialContent));
        }
    }, [initialContent, isPDF, isHtmlToDraftReady, parseContent]);

    // Scroll tracking for HTML pages
    useEffect(() => {
        if (isPDF || pageStates.length <= 1) return;

        const container = editorContainerRef.current;
        if (!container) return;

        const handleScroll = () => {
            const pages = container.querySelectorAll(".editor-page");
            const scrollPos = container.scrollTop;
            const containerHeight = container.clientHeight;

            for (let i = 0; i < pages.length; i++) {
                const page = pages[i] as HTMLElement;
                const offsetTop = page.offsetTop - container.offsetTop;
                const pageHeight = page.offsetHeight;

                if (scrollPos >= offsetTop - containerHeight / 3 && scrollPos < offsetTop + pageHeight - containerHeight / 3) {
                    setHtmlCurrentPage(i + 1);
                    break;
                }
            }
        };

        container.addEventListener("scroll", handleScroll);
        handleScroll(); // initial set
        return () => container.removeEventListener("scroll", handleScroll);
    }, [isPDF, pageStates.length]);

    const handleOpenGoogleDoc = () => {
        if (googleDocUrl) {
            window.open(googleDocUrl, "_blank");
        } else {
            setIsLinkPopoverOpen(true);
        }
    };

    const handleUpdateGoogleDocUrl = async () => {
        if (!tempUrl.includes("docs.google.com")) {
            toast.error("Please enter a valid Google Docs URL");
            return;
        }

        setIsUpdatingUrl(true);
        try {
            const res = await fetch(`/api/documents/${documentId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ googleDocUrl: tempUrl }),
            });

            if (!res.ok) throw new Error("Failed to update URL");

            setGoogleDocUrl(tempUrl);
            setIsLinkPopoverOpen(false);
            toast.success("Google Doc linked! Click Sync to update PDF.");
        } catch (error) {
            toast.error("Failed to link Google Doc");
        } finally {
            setIsUpdatingUrl(false);
        }
    };

    const handleSyncContent = async () => {
        setIsSyncing(true);
        const syncToastId = toast.loading("Syncing latest changes from Google Docs...");

        try {
            const res = await fetch(`/api/documents/${documentId}/sync`, { method: "POST" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Sync failed");

            toast.success("Document updated successfully!", { id: syncToastId });
            if (onSyncSuccess) onSyncSuccess();
            else window.location.reload();
        } catch (error: any) {
            toast.error(error.message || "Failed to sync", { id: syncToastId });
        } finally {
            setIsSyncing(false);
        }
    };

    const handleGenerateShareLink = async () => {
        setIsGeneratingShare(true);
        try {
            const res = await fetch(`/api/documents/${documentId}/share`);
            if (!res.ok) throw new Error("Failed to generate share link");

            const data = await res.json();
            setShareUrl(data.shareUrl);
            setShowShareDialog(true);
        } catch (error: any) {
            toast.error(error.message || "Failed to generate share link");
        } finally {
            setIsGeneratingShare(false);
        }
    };

    const handleCopyShareLink = async () => {
        if (shareUrl) {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            toast.success("Share link copied to clipboard!");
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleDownload = () => {
        if (isPDF && initialContent) {
            // Download PDF from base64 data URL
            const link = document.createElement('a');
            link.href = initialContent;
            link.download = `${documentTitle || 'document'}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success("PDF downloaded successfully!");
        } else if (googleDocUrl) {
            // For linked Google Docs, open the export URL
            const downloadUrl = googleDocUrl.replace('/edit', '/export?format=pdf');
            window.open(downloadUrl, '_blank');
            toast.success("Opening download in new tab...");
        } else {
            // For HTML/Draft documents, show info
            toast.info("This document can be exported from the editor view.");
        }
    };

    // Determine document type badge
    const DocumentBadge = useMemo(() => {
        if (isPDF) {
            return <span className="bg-blue-500/10 text-blue-400 text-[10px] px-2 py-0.5 rounded-full border border-blue-500/20 font-semibold">PDF</span>;
        }
        return <span className="bg-purple-500/10 text-purple-400 text-[10px] px-2 py-0.5 rounded-full border border-purple-500/20 font-semibold">Draft</span>;
    }, [isPDF]);

    return (
        <div className="flex flex-col h-full bg-slate-50">
            {/* Top Navigation */}
            <nav className="h-16 flex-shrink-0 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-20 shadow-sm">
                <div className="flex items-center gap-4 min-w-0">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                        onClick={() => projectId ? router.push(`/projects/${projectId}`) : router.push("/dashboard")}
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Button>

                    <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs font-medium text-slate-500 truncate max-w-[200px]">
                                {projectName || "Internal Document"}
                            </span>
                            {DocumentBadge}
                        </div>
                        <h1 className="text-slate-900 font-semibold text-base truncate max-w-[300px]">
                            {documentTitle || "Untitled Document"}
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Share button (available for all types) */}
                    <Button
                        size="sm"
                        variant="outline"
                        className="h-9 px-4 gap-2 border-slate-200 text-slate-700 hover:bg-slate-100"
                        onClick={handleGenerateShareLink}
                        disabled={isGeneratingShare}
                    >
                        {isGeneratingShare ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
                        <span className="hidden sm:inline">Share</span>
                    </Button>

                    {/* Download button (available for all types) */}
                    <Button
                        size="sm"
                        variant="outline"
                        className="h-9 px-4 gap-2 border-slate-200 text-slate-700 hover:bg-slate-100"
                        onClick={handleDownload}
                    >
                        <Download className="h-4 w-4" />
                        <span className="hidden sm:inline">Download</span>
                    </Button>

                    {/* Conditional Google Docs actions */}
                    {googleDocUrl && (
                        <>
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-9 px-4 gap-2 border-slate-200 text-slate-700 hover:bg-slate-100"
                                onClick={handleOpenGoogleDoc}
                            >
                                <ExternalLink className="h-4 w-4" />
                                <span className="hidden sm:inline">Open in Google Docs</span>
                            </Button>
                            <Button
                                size="sm"
                                className="h-9 px-4 gap-2 bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
                                onClick={handleSyncContent}
                                disabled={isSyncing}
                            >
                                {isSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                                <span className="hidden sm:inline">Sync</span>
                            </Button>
                        </>
                    )}

                    {/* Link popover for connecting a Google Doc */}
                    {!googleDocUrl && (
                        <Popover open={isLinkPopoverOpen} onOpenChange={setIsLinkPopoverOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    size="sm"
                                    className="h-9 px-4 gap-2 bg-orange-600 text-white hover:bg-orange-700 shadow-sm"
                                >
                                    <FileText className="h-4 w-4" />
                                    <span className="hidden sm:inline">Connect Google Doc</span>
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-96 p-4" align="end">
                                <div className="space-y-3">
                                    <h4 className="font-medium text-sm">Link Google Docs URL</h4>
                                    <Input
                                        placeholder="https://docs.google.com/document/d/..."
                                        value={tempUrl}
                                        onChange={(e) => setTempUrl(e.target.value)}
                                        className="w-full"
                                    />
                                    <div className="flex justify-end gap-2">
                                        <Button variant="outline" size="sm" onClick={() => setIsLinkPopoverOpen(false)}>
                                            Cancel
                                        </Button>
                                        <Button size="sm" onClick={handleUpdateGoogleDocUrl} disabled={isUpdatingUrl}>
                                            {isUpdatingUrl && <Loader2 className="h-3 w-3 animate-spin mr-2" />}
                                            Link Document
                                        </Button>
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>
                    )}

                    <Button variant="ghost" size="icon" className="text-slate-500 hover:text-slate-900 hover:bg-slate-100">
                        <MoreHorizontal className="h-5 w-5" />
                    </Button>
                </div>
            </nav>

            {/* Main Content Area */}
            <div className="flex-1 flex overflow-hidden relative bg-slate-100">
                {/* Floating Page Dots (for HTML multi-page) */}
                {!isPDF && pageStates.length > 1 && (
                    <PageDots
                        totalPages={pageStates.length}
                        currentPage={htmlCurrentPage}
                        onPageClick={(page: number) => {
                            const pages = document.querySelectorAll(".editor-page");
                            if (pages[page - 1]) {
                                pages[page - 1].scrollIntoView({ behavior: "smooth", block: "start" });
                            }
                        }}
                        className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10"
                    />
                )}

                {/* Document Workspace */}
                <div
                    ref={editorContainerRef}
                    className="flex-1 overflow-auto flex justify-center p-6"
                >
                    {isPDF ? (
                        <div className="w-full h-full bg-white rounded-xl shadow-lg overflow-hidden">
                            <iframe
                                src={initialContent || ""}
                                className="w-full h-full border-0"
                                title={documentTitle || "PDF Document"}
                            />
                        </div>
                    ) : (
                        <div className="space-y-8" style={{ width: `${A4_WIDTH_PX}px` }}>
                            {pageStates.map((state, index) => (
                                <div
                                    key={index}
                                    className="editor-page bg-white shadow-xl rounded-sm overflow-hidden relative mx-auto border border-slate-200"
                                    style={{
                                        width: `${A4_WIDTH_PX}px`,
                                        minHeight: `${A4_HEIGHT_PX}px`,
                                        padding: `${A4_PADDING_PX}px`,
                                    }}
                                >
                                    <PageLetterhead pageNumber={index + 1} />
                                    <div className="mt-20 pointer-events-none select-none">
                                        <Editor
                                            editorState={state}
                                            onChange={() => {}}
                                            readOnly={true}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Share Dialog */}
            <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Share Document</DialogTitle>
                        <DialogDescription>
                            Anyone with this link can view the document.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col gap-4 py-4">
                        <div className="flex items-center gap-2">
                            <Input
                                type="text"
                                readOnly
                                value={shareUrl || "Generating..."}
                                className="flex-1 bg-slate-50"
                            />
                            <Button
                                size="sm"
                                onClick={handleCopyShareLink}
                                disabled={!shareUrl}
                                className="gap-2"
                            >
                                {copied ? (
                                    <>
                                        <CheckCircle className="h-4 w-4" />
                                        Copied!
                                    </>
                                ) : (
                                    <>
                                        <Copy className="h-4 w-4" />
                                        Copy
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}