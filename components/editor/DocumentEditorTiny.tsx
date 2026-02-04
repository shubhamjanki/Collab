"use client";

import { Editor } from "@tinymce/tinymce-react";
import { useRef, useState, useEffect, useCallback } from "react";
import { debounce } from "lodash";
import { saveDocument } from "@/lib/api/documents";
import { Save, CheckCircle, Loader2, Users, FileDown, FileText } from "lucide-react";
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

export default function DocumentEditor({
  documentId,
  initialContent,
  documentTitle,
  onContentChange,
}: DocumentEditorProps) {
  const { data: session } = useSession();
  const editorRef = useRef<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastEditor, setLastEditor] = useState<string | null>(null);
  const isLocalUpdate = useRef(false);
  const lastLocalEditAt = useRef<number>(0);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [pageCount, setPageCount] = useState(1);
  const [currentPageInView, setCurrentPageInView] = useState(1);

  // Calculate page count based on content height
  const calculatePageCount = useCallback(() => {
    const editorBody = editorRef.current?.getBody();
    if (editorBody) {
      const contentHeight = editorBody.scrollHeight;
      const effectiveHeight = A4_HEIGHT_PX - (A4_PADDING_PX * 2);
      const calculatedPages = Math.max(1, Math.ceil(contentHeight / effectiveHeight));
      setPageCount(calculatedPages);
      
      // Notify parent component
      if (onContentChange) {
        const content = editorRef.current?.getContent() || "";
        onContentChange(content);
      }
    }
  }, [onContentChange]);

  // Load from localStorage on mount
  useEffect(() => {
    const draft = localStorage.getItem(`doc_draft_${documentId}`);
    const draftTime = localStorage.getItem(`doc_draft_time_${documentId}`);
    
    if (draft && draftTime && editorRef.current) {
      const draftDate = new Date(draftTime);
      toast.info(
        `Draft found from ${draftDate.toLocaleString()}. Click to restore or continue editing.`,
        {
          action: {
            label: "Restore",
            onClick: () => {
              if (editorRef.current) {
                editorRef.current.setContent(draft);
                setHasUnsavedChanges(true);
                toast.success("Draft restored!");
              }
            },
          },
          duration: 10000,
        }
      );
    }
  }, [documentId]);

  const handleSave = async (content: string) => {
    setIsSaving(true);
    isLocalUpdate.current = true;
    try {
      await saveDocument(documentId, content);
      setLastSaved(new Date());
      
      // Clear localStorage after successful database save
      localStorage.removeItem(`doc_draft_${documentId}`);
      localStorage.removeItem(`doc_draft_time_${documentId}`);
      setHasUnsavedChanges(false);

      try {
        const changes = content.length || 0;
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

  const saveToLocalStorage = useCallback(
    debounce((content: string) => {
      try {
        localStorage.setItem(`doc_draft_${documentId}`, content);
        localStorage.setItem(`doc_draft_time_${documentId}`, new Date().toISOString());
        setHasUnsavedChanges(true);
      } catch (error) {
        console.warn("Failed to save to localStorage:", error);
      }
    }, 1000),
    [documentId]
  );

  const handleEditorChange = (content: string) => {
    lastLocalEditAt.current = Date.now();
    saveToLocalStorage(content);
    
    // Calculate page count after content change
    setTimeout(() => calculatePageCount(), 100);
    
    if (onContentChange) {
      onContentChange(content);
    }
  };

  const exportToPDF = async () => {
    try {
      toast.info("Generating PDF...");
      if (editorRef.current) {
        const content = editorRef.current.getContent();
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = content;
        tempDiv.style.width = "21cm";
        tempDiv.style.padding = "2.54cm";
        tempDiv.style.fontFamily = "'Times New Roman', Times, serif";
        tempDiv.style.fontSize = "12pt";
        tempDiv.style.background = "white";
        document.body.appendChild(tempDiv);

        const canvas = await html2canvas(tempDiv, {
          scale: 2,
          useCORS: true,
          logging: false,
        });

        document.body.removeChild(tempDiv);

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
        const imgX = (pdfWidth - imgWidth * ratio) / 2;
        const imgY = 10;

        pdf.addImage(imgData, "PNG", imgX, imgY, imgWidth * ratio, imgHeight * ratio);
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
      const content = editorRef.current?.getContent() || "";
      const blob = new Blob(
        [
          `<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset='utf-8'><title>${documentTitle || "Document"}</title></head>
<body>${content}</body>
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

  // Real-time updates
  useEffect(() => {
    if (!editorRef.current || !documentId) return;

    const checkForUpdates = async () => {
      if (isSaving || isLocalUpdate.current) return;
      if (Date.now() - lastLocalEditAt.current < 4000) return;

      try {
        const response = await fetch(`/api/documents/${documentId}`);
        if (!response.ok) return;

        const data = await response.json();
        const serverContent = data.content || "";
        const currentContent = editorRef.current?.getContent() || "";

        if (serverContent && serverContent !== currentContent) {
          setIsUpdating(true);
          editorRef.current?.setContent(serverContent);

          if (data.author?.name && data.author.id !== session?.user?.id) {
            setLastEditor(data.author.name);
            setTimeout(() => setLastEditor(null), 3000);
          }

          setIsUpdating(false);
        }
      } catch (error) {
        console.error("Error checking for updates:", error);
      }
    };

    const interval = setInterval(checkForUpdates, 3000);
    return () => clearInterval(interval);
  }, [documentId, isSaving, session?.user?.id]);

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
            onClick={() => editorRef.current && handleSave(editorRef.current.getContent())}
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

      {/* Ruler */}
      <div className="bg-white border-b border-gray-200 h-6 flex items-end relative overflow-hidden">
        <div className="flex items-end h-full w-full px-16">
          {Array.from({ length: 17 }, (_, i) => (
            <div key={i} className="flex-1 relative h-full flex items-end justify-center">
              <div className="absolute bottom-0 w-px h-2 bg-gray-400"></div>
              {i > 0 && i < 16 && (
                <span className="absolute bottom-2 text-[9px] text-gray-500">{i}</span>
              )}
              {/* Half marks */}
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

      {/* Editor Container with Google Docs styling */}
      <div className="bg-gray-100 overflow-auto" style={{ maxHeight: '800px' }}>
        <div className="py-4">
          {/* Render multiple A4 pages visually */}
          <div className="space-y-6">
            {Array.from({ length: pageCount }, (_, i) => (
              <div
                key={i}
                className="editor-page mx-auto bg-white shadow-md relative"
                data-page={i + 1}
                style={{
                  width: `${A4_WIDTH_PX}px`,
                  minHeight: `${A4_HEIGHT_PX}px`,
                  padding: `${A4_PADDING_PX}px`,
                  boxSizing: 'border-box'
                }}
              >
                {/* Page number indicator */}
                <div className="absolute top-2 right-4 text-xs text-gray-400">
                  Page {i + 1}
                </div>
                
                {/* Render editor only on first page, content flows through CSS */}
                {i === 0 && (
                  <Editor
                    apiKey={process.env.NEXT_PUBLIC_TINYMCE_API_KEY || "no-api-key"}
                    onInit={(evt, editor) => {
                      editorRef.current = editor;
                      calculatePageCount();
                    }}
                    initialValue={initialContent || "<p>Start typing here...</p>"}
                    onEditorChange={handleEditorChange}
                    init={{
                      height: '100%',
                      menubar: true,
                      plugins: [
                        'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
                        'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                        'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount',
                        'pagebreak', 'save', 'print', 'hr', 'toc', 'visualchars', 'nonbreaking'
                      ],
                      toolbar: 'undo redo | blocks fontsize | ' +
                        'bold italic underline strikethrough | forecolor backcolor | ' +
                        'alignleft aligncenter alignright alignjustify | ' +
                        'bullist numlist outdent indent | ' +
                        'removeformat | table | image link | pagebreak | ' +
                        'subscript superscript | code | fullscreen | help',
                      content_style: `
                        body { 
                          font-family: Arial, Helvetica, sans-serif; 
                          font-size: 11pt; 
                          line-height: 1.6;
                          margin: 0;
                          padding: 0;
                          background: transparent;
                        }
                        
                        /* Page break styling */
                        .mce-pagebreak {
                          display: block;
                          height: 1px;
                          background: #ccc;
                          margin: 1.5cm 0;
                          border: none;
                          page-break-after: always;
                          position: relative;
                        }
                        
                        .mce-pagebreak::before {
                          content: 'Page Break';
                          position: absolute;
                          left: 50%;
                          transform: translateX(-50%);
                          top: -8px;
                          background: white;
                          padding: 0 8px;
                          font-size: 9px;
                          color: #999;
                          font-family: Arial, sans-serif;
                        }
                        
                        @media print {
                          .mce-pagebreak {
                            page-break-after: always;
                            background: none;
                            height: 0;
                            margin: 0;
                          }
                          .mce-pagebreak::before {
                            display: none;
                          }
                        }
                      `,
                      pagebreak_separator: '<hr class="mce-pagebreak" />',
                      pagebreak_split_block: true,
                      width: '100%',
                      resize: false,
                      branding: false,
                      statusbar: true,
                      elementpath: true,
                      paste_data_images: true,
                      automatic_uploads: true,
                      file_picker_types: 'image',
                      images_upload_handler: (blobInfo: any) => {
                        return new Promise((resolve) => {
                          const reader = new FileReader();
                          reader.onload = () => {
                            resolve(reader.result as string);
                          };
                          reader.readAsDataURL(blobInfo.blob());
                        });
                      },
                      setup: (editor) => {
                        editor.on('input', () => {
                          calculatePageCount();
                        });
                      }
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
