"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import DocumentEditor from "@/components/editor/DocumentEditorDraft";
import { DocumentEditHistory } from "@/components/editor/DocumentEditHistory";
import { toast } from "sonner";
import "../../draft-editor.css";

type DocumentData = {
  id: string;
  title: string;
  content: string | null;
  project?: {
    id: string;
    name: string;
  };
};

export default function DocumentPage() {
  const params = useParams();
  const router = useRouter();
  const documentId = params.id as string;

  const [documentData, setDocumentData] = useState<DocumentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showNavigation, setShowNavigation] = useState(true);
  const [headings, setHeadings] = useState<Array<{ id: string; text: string; level: number }>>([]);
  const [pageCount, setPageCount] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const loadDocument = async () => {
      try {
        const res = await fetch(`/api/documents/${documentId}`);
        if (!res.ok) {
          throw new Error("Failed to load document");
        }
        const data = await res.json();
        setDocumentData(data);
      } catch (error) {
        toast.error("Unable to load document");
      } finally {
        setIsLoading(false);
      }
    };

    if (documentId) {
      loadDocument();
    }
  }, [documentId]);

  useEffect(() => {
    // Calculate initial page count after document loads
    if (!isLoading && documentData) {
      const timer = setTimeout(() => {
        updatePageCount();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isLoading, documentData]);

  const updateNavigationHeadings = (content: HTMLElement) => {
    const headingElements = content.querySelectorAll("h1, h2, h3, h4, h5, h6");
    const extractedHeadings = Array.from(headingElements).map((heading, index) => ({
      id: `heading-${index}`,
      text: heading.textContent || "",
      level: parseInt(heading.tagName.substring(1)),
    }));
    setHeadings(extractedHeadings);
  };

  const scrollToHeading = (index: number) => {
    const content = document.querySelector(".draft-editor-content");
    if (content) {
      const headingElements = content.querySelectorAll("h1, h2, h3, h4, h5, h6");
      if (headingElements[index]) {
        headingElements[index].scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  const scrollToPage = (pageNum: number) => {
    const editorPage = document.querySelector(`.editor-page[data-page="${pageNum}"]`);
    if (editorPage) {
      editorPage.scrollIntoView({ behavior: "smooth", block: "start" });
      setCurrentPage(pageNum);
    }
  };

  const updatePageCount = () => {
    // Page count is now managed by the editor component
    const pages = document.querySelectorAll(".editor-page");
    if (pages.length > 0) {
      setPageCount(pages.length);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center text-gray-600">
          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
          Loading document...
        </div>
      </div>
    );
  }

  if (!documentData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center text-gray-600">Document not found.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() =>
              documentData.project?.id
                ? router.push(`/projects/${documentData.project.id}`)
                : router.push("/dashboard")
            }
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="text-sm text-gray-500">
              {documentData.project?.name || "Document"}
            </div>
            <h1 className="text-lg font-semibold text-gray-900">
              {documentData.title || "Untitled"}
            </h1>
          </div>
          <div className="ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowNavigation(!showNavigation)}
              className="gap-2"
            >
              {showNavigation ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              {showNavigation ? "Hide" : "Show"} Navigation
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Left Navigation Panel */}
          {showNavigation && (
            <div className="w-64 flex-shrink-0">
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm sticky top-6 max-h-[calc(100vh-120px)] overflow-y-auto">
                <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gray-600" />
                    <h2 className="text-sm font-semibold text-gray-700">Navigation</h2>
                  </div>
                </div>
                <div className="p-2">
                  {headings.length > 0 ? (
                    <div className="space-y-1">
                      {headings.map((heading, index) => (
                        <button
                          key={heading.id}
                          onClick={() => scrollToHeading(index)}
                          className={`w-full text-left px-3 py-2 rounded hover:bg-gray-100 transition-colors text-sm ${
                            heading.level === 1
                              ? "font-semibold text-gray-900"
                              : heading.level === 2
                              ? "font-medium text-gray-800 pl-6"
                              : "text-gray-700 pl-9"
                          }`}
                          style={{ paddingLeft: `${(heading.level - 1) * 12 + 12}px` }}
                        >
                          <div className="truncate">{heading.text || "Untitled Heading"}</div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="px-3 py-8 text-center text-sm text-gray-500">
                      <FileText className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <p>No headings yet</p>
                      <p className="text-xs mt-1">Add headings to see document structure</p>
                    </div>
                  )}
                </div>
                
                {/* Page Thumbnails Section */}
                <div className="border-t border-gray-200">
                  <div className="px-4 py-3 bg-gray-50">
                    <h3 className="text-xs font-semibold text-gray-600 uppercase">Pages ({pageCount})</h3>
                  </div>
                  <div className="p-2 space-y-2">
                    {Array.from({ length: pageCount }, (_, i) => i + 1).map((pageNum) => (
                      <button
                        key={pageNum}
                        onClick={() => scrollToPage(pageNum)}
                        className={`w-full border rounded bg-white p-2 hover:border-blue-400 cursor-pointer transition-colors ${
                          currentPage === pageNum ? "border-blue-500 ring-2 ring-blue-200" : "border-gray-300"
                        }`}
                      >
                        <div className="aspect-[8.5/11] bg-gray-50 rounded border border-gray-200 mb-1 flex items-center justify-center">
                          <span className="text-xs text-gray-400">Page {pageNum}</span>
                        </div>
                        <div className="text-xs text-center text-gray-600">Page {pageNum}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className={`flex-1 min-w-0 space-y-6 ${showNavigation ? "" : "mx-auto max-w-5xl"}`}>
            <DocumentEditor
              documentId={documentId}
              initialContent={documentData.content || "<p>Start typing here...</p>"}
              documentTitle={documentData.title}
              onContentChange={(content) => {
                const tempDiv = window.document.createElement("div");
                tempDiv.innerHTML = content;
                updateNavigationHeadings(tempDiv);
                // Update page count after a short delay to let content render
                setTimeout(() => updatePageCount(), 100);
              }}
            />
            <DocumentEditHistory documentId={documentId} />
          </div>
        </div>
      </main>
    </div>
  );
}
