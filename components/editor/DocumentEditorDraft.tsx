"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { Editor, EditorState, RichUtils, convertToRaw, convertFromRaw, ContentState, Modifier } from "draft-js";
// @ts-ignore - no types available
import { convertToHTML } from "draft-convert";
// @ts-ignore - no types available
import htmlToDraft from "html-to-draftjs";
import { debounce } from "lodash";
import { saveDocument } from "@/lib/api/documents";
import { 
  Save, CheckCircle, Loader2, Users, FileDown, FileText,
  Bold, Italic, Underline as UnderlineIcon, List, ListOrdered,
  AlignLeft, AlignCenter, AlignRight, Type
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

// A4 Page Constants
const A4_HEIGHT_PX = 1122; // 29.7cm @ 96dpi
const A4_WIDTH_PX = 794;   // 21cm @ 96dpi
const A4_PADDING_PX = 60;  // 2.54cm margins

interface DocumentEditorProps {
  documentId: string;
  initialContent?: string;
  documentTitle?: string;
  onContentChange?: (content: string) => void;
}

export default function DocumentEditorDraft({
  documentId,
  initialContent,
  documentTitle,
  onContentChange,
}: DocumentEditorProps) {
  const { data: session } = useSession();
  const editorRef = useRef<Editor>(null);
  const [editorState, setEditorState] = useState(() => {
    if (initialContent && initialContent !== "<p>Start typing here...</p>") {
      try {
        const contentBlock = htmlToDraft(initialContent);
        if (contentBlock) {
          const contentState = ContentState.createFromBlockArray(contentBlock.contentBlocks);
          return EditorState.createWithContent(contentState);
        }
      } catch (error) {
        console.error("Error parsing initial content:", error);
      }
    }
    return EditorState.createEmpty();
  });

  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastEditor, setLastEditor] = useState<string | null>(null);
  const isLocalUpdate = useRef(false);
  const lastLocalEditAt = useRef<number>(0);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [pageCount, setPageCount] = useState(1);

  const handleSave = async (htmlContent: string) => {
    setIsSaving(true);
    isLocalUpdate.current = true;
    try {
      await saveDocument(documentId, htmlContent);
      setLastSaved(new Date());
      
      localStorage.removeItem(`doc_draft_${documentId}`);
      localStorage.removeItem(`doc_draft_time_${documentId}`);
      setHasUnsavedChanges(false);

      try {
        const changes = htmlContent.length || 0;
        await fetch(`/api/documents/${documentId}/contribute`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ changes }),
        });
      } catch (contribError) {
        console.warn("Contribution tracking failed:", contribError);
      }
      
      toast.success("Document saved to database!");
    } catch (error: any) {
      console.error("Critical save error:", error);
      toast.error(`Save failed: ${error.message || "Unknown error"}`);
    } finally {
      setIsSaving(false);
      setTimeout(() => {
        isLocalUpdate.current = false;
      }, 1000);
    }
  };

  const convertToHtml = useCallback((editorState: EditorState) => {
    const contentState = editorState.getCurrentContent();
    return convertToHTML(contentState);
  }, []);

  const saveToLocalStorage = useCallback(
    debounce((html: string) => {
      try {
        localStorage.setItem(`doc_draft_${documentId}`, html);
        localStorage.setItem(`doc_draft_time_${documentId}`, new Date().toISOString());
        setHasUnsavedChanges(true);
      } catch (error) {
        console.warn("Failed to save to localStorage:", error);
      }
    }, 1000),
    [documentId]
  );

  const handleEditorChange = (newEditorState: EditorState) => {
    setEditorState(newEditorState);
    lastLocalEditAt.current = Date.now();
    
    const html = convertToHtml(newEditorState);
    saveToLocalStorage(html);
    
    if (onContentChange) {
      onContentChange(html);
    }

    // Calculate page count
    setTimeout(() => calculatePageCount(), 100);
  };

  const calculatePageCount = useCallback(() => {
    const editorElement = document.querySelector('.draft-editor-content');
    if (editorElement) {
      const contentHeight = editorElement.scrollHeight;
      const effectiveHeight = A4_HEIGHT_PX - (A4_PADDING_PX * 2);
      const calculatedPages = Math.max(1, Math.ceil(contentHeight / effectiveHeight));
      setPageCount(calculatedPages);
    }
  }, []);

  const handleKeyCommand = (command: string, editorState: EditorState) => {
    const newState = RichUtils.handleKeyCommand(editorState, command);
    if (newState) {
      setEditorState(newState);
      return 'handled';
    }
    return 'not-handled';
  };

  const toggleInlineStyle = (style: string) => {
    setEditorState(RichUtils.toggleInlineStyle(editorState, style));
  };

  const toggleBlockType = (blockType: string) => {
    setEditorState(RichUtils.toggleBlockType(editorState, blockType));
  };

  const exportToPDF = async () => {
    try {
      toast.info("Generating PDF...");
      const content = document.querySelector('.draft-editor-content');
      if (content) {
        const canvas = await html2canvas(content as HTMLElement, {
          scale: 2,
          useCORS: true,
          logging: false,
        });

        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF({
          orientation: "portrait",
          unit: "mm",
          format: "a4",
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);

        pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, imgHeight * ratio);
        pdf.save(`${documentTitle || "document"}.pdf`);
        toast.success("PDF exported successfully!");
      }
    } catch (error) {
      console.error("PDF export error:", error);
      toast.error("Failed to export PDF");
    }
  };

  const exportToWord = () => {
    try {
      const html = convertToHtml(editorState);
      const blob = new Blob(
        [
          `<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset='utf-8'><title>${documentTitle || "Document"}</title></head>
<body>${html}</body>
</html>`,
        ],
        {
          type: "application/msword",
        }
      );

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${documentTitle || "document"}.doc`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Word document exported successfully!");
    } catch (error) {
      console.error("Word export error:", error);
      toast.error("Failed to export to Word");
    }
  };

  // Load from localStorage on mount
  useEffect(() => {
    const draft = localStorage.getItem(`doc_draft_${documentId}`);
    const draftTime = localStorage.getItem(`doc_draft_time_${documentId}`);
    
    if (draft && draftTime) {
      const draftDate = new Date(draftTime);
      toast.info(
        `Draft found from ${draftDate.toLocaleString()}. Click to restore or continue editing.`,
        {
          action: {
            label: "Restore",
            onClick: () => {
              try {
                const contentBlock = htmlToDraft(draft);
                if (contentBlock) {
                  const contentState = ContentState.createFromBlockArray(contentBlock.contentBlocks);
                  setEditorState(EditorState.createWithContent(contentState));
                  setHasUnsavedChanges(true);
                  toast.success("Draft restored!");
                }
              } catch (error) {
                console.error("Error restoring draft:", error);
                toast.error("Failed to restore draft");
              }
            },
          },
          duration: 10000,
        }
      );
    }
  }, [documentId]);

  useEffect(() => {
    calculatePageCount();
  }, [calculatePageCount]);

  return (
    <div className="border border-gray-300 rounded-lg bg-white shadow-lg overflow-hidden">
      {/* Top Bar */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-white" />
          <span className="text-white font-semibold">{documentTitle || "Document"}</span>
        </div>
        <div className="flex items-center gap-3">
          {lastEditor && (
            <div className="text-xs bg-white/20 text-white px-3 py-1 rounded-full flex items-center gap-1.5">
              <Users className="h-3 w-3" />
              {lastEditor} editing
            </div>
          )}
          <div className="text-xs text-white/90 flex items-center gap-1.5">
            {isSaving ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Saving...
              </>
            ) : isUpdating ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Syncing...
              </>
            ) : hasUnsavedChanges ? (
              <>
                <span className="h-2 w-2 bg-yellow-300 rounded-full animate-pulse"></span>
                Unsaved changes (stored locally)
              </>
            ) : lastSaved ? (
              <>
                <CheckCircle className="h-3 w-3" />
                Saved {lastSaved.toLocaleTimeString()}
              </>
            ) : null}
          </div>
          <Button
            size="sm"
            variant="secondary"
            className={`gap-2 h-7 text-xs ${hasUnsavedChanges ? 'bg-yellow-400 hover:bg-yellow-500 text-gray-900' : ''}`}
            onClick={() => handleSave(convertToHtml(editorState))}
            disabled={isSaving}
          >
            <Save className="h-3 w-3" />
            {hasUnsavedChanges ? 'Save to Database' : 'Save'}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="gap-2 h-7 text-xs"
            onClick={exportToPDF}
          >
            <FileDown className="h-3 w-3" />
            PDF
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="gap-2 h-7 text-xs"
            onClick={exportToWord}
          >
            <FileText className="h-3 w-3" />
            Word
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-2 flex-wrap">
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0"
          onClick={() => toggleInlineStyle('BOLD')}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0"
          onClick={() => toggleInlineStyle('ITALIC')}
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0"
          onClick={() => toggleInlineStyle('UNDERLINE')}
        >
          <UnderlineIcon className="h-4 w-4" />
        </Button>
        <div className="w-px h-6 bg-gray-300 mx-1"></div>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 px-2 text-xs"
          onClick={() => toggleBlockType('header-one')}
        >
          H1
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 px-2 text-xs"
          onClick={() => toggleBlockType('header-two')}
        >
          H2
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 px-2 text-xs"
          onClick={() => toggleBlockType('header-three')}
        >
          H3
        </Button>
        <div className="w-px h-6 bg-gray-300 mx-1"></div>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0"
          onClick={() => toggleBlockType('unordered-list-item')}
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0"
          onClick={() => toggleBlockType('ordered-list-item')}
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
      </div>

      {/* Ruler */}
      <div className="bg-white border-b border-gray-200 h-6 flex items-end relative overflow-hidden">
        <div className="flex items-end h-full w-full px-16">
          {Array.from({ length: 17 }, (_, i) => (
            <div key={i} className="flex-1 relative h-full flex items-end justify-center">
              <div className="absolute bottom-0 w-px h-2 bg-gray-400"></div>
              {i > 0 && i < 16 && (
                <span className="absolute bottom-2 text-[9px] text-gray-500">{i}</span>
              )}
              {i < 16 && (
                <>
                  <div className="absolute bottom-0 left-1/4 w-px h-1 bg-gray-300"></div>
                  <div className="absolute bottom-0 left-1/2 w-px h-1.5 bg-gray-300"></div>
                  <div className="absolute bottom-0 left-3/4 w-px h-1 bg-gray-300"></div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Editor Container with Multiple Pages */}
      <div className="bg-gray-100 overflow-auto" style={{ maxHeight: '800px' }}>
        <div className="py-4">
          <div className="space-y-6 relative">
            {Array.from({ length: pageCount }, (_, pageIndex) => (
              <div
                key={pageIndex}
                className="editor-page mx-auto bg-white shadow-md relative"
                data-page={pageIndex + 1}
                style={{
                  width: `${A4_WIDTH_PX}px`,
                  minHeight: `${A4_HEIGHT_PX}px`,
                  boxSizing: 'border-box'
                }}
              >
                <div className="absolute top-2 right-4 text-xs text-gray-400 z-10 pointer-events-none">
                  Page {pageIndex + 1}
                </div>
                
                <div 
                  className="draft-editor-content relative"
                  style={{
                    padding: `${A4_PADDING_PX}px`,
                    minHeight: `${A4_HEIGHT_PX}px`,
                  }}
                />
              </div>
            ))}
            
            {/* Continuous Editor Overlay */}
            <div 
              className="absolute top-0 left-1/2 pointer-events-auto"
              style={{ 
                width: `${A4_WIDTH_PX}px`,
                transform: 'translateX(-50%)',
                paddingTop: '0px'
              }}
            >
              <div style={{ padding: `${A4_PADDING_PX}px` }}>
                <Editor
                  ref={editorRef}
                  editorState={editorState}
                  onChange={handleEditorChange}
                  handleKeyCommand={handleKeyCommand}
                  placeholder="Start typing here..."
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
