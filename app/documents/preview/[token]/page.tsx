"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, Eye, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import DocumentPreviewer from "@/components/editor/DocumentPreviewer";
import { toast } from "sonner";

type PreviewData = {
  document: {
    id: string;
    title: string;
    content: string | null;
    googleDocUrl: string | null;
    updatedAt: string;
    project: {
      id: string;
      name: string;
    };
  };
};

export default function PublicPreviewPage() {
  const params = useParams();
  const token = params.token as string;

  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPreview = async () => {
      try {
        const res = await fetch(`/api/documents/preview/${token}`);
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to load preview");
        }
        const data = await res.json();
        setPreviewData(data);
      } catch (error: any) {
        setError(error.message);
        toast.error("Unable to load document preview");
      } finally {
        setIsLoading(false);
      }
    };

    if (token) {
      loadPreview();
    }
  }, [token]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center text-white">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-lg">Loading shared document...</p>
        </div>
      </div>
    );
  }

  if (error || !previewData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center text-white max-w-md px-4">
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 mb-4">
            <h2 className="text-xl font-semibold mb-2">Document Not Found</h2>
            <p className="text-sm text-slate-300">
              {error || "This share link may have expired or been removed."}
            </p>
          </div>
          <Button
            onClick={() => window.location.href = "/"}
            variant="outline"
            className="bg-white/10 border-white/20 text-white hover:bg-white/20"
          >
            Go to Homepage
          </Button>
        </div>
      </div>
    );
  }

  const { document } = previewData;
  const formattedDate = new Date(document.updatedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="h-screen flex flex-col bg-slate-900">
      {/* Public Preview Header */}
      <header className="h-16 flex-shrink-0 bg-gradient-to-r from-slate-900 via-blue-900/20 to-slate-900 border-b border-slate-700/50 flex items-center justify-between px-6 shadow-lg">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-blue-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
              Shared Document
            </span>
          </div>
          <div className="h-6 w-px bg-slate-700/50" />
          <div>
            <p className="text-xs text-slate-400">
              From project: {document.project.name}
            </p>
            <h1 className="text-white font-semibold text-sm">
              {document.title}
            </h1>
          </div>
        </div>
        <Button
          size="sm"
          className="bg-blue-600 text-white hover:bg-blue-500 gap-2 font-semibold shadow-lg"
          onClick={() => window.location.href = "/"}
        >
          <Rocket className="h-4 w-4" />
          Explore Platform
        </Button>
      </header>

      {/* Document Preview */}
      <main className="flex-1 overflow-hidden">
        <DocumentPreviewer
          documentId={document.id}
          initialContent={document.content || "<p>No content available.</p>"}
          documentTitle={document.title}
          googleDocUrl={document.googleDocUrl}
          projectId={document.project.id}
          projectName={document.project.name}
        />
      </main>

      {/* Footer */}
      <footer className="h-10 flex-shrink-0 bg-slate-900 border-t border-slate-700/50 flex items-center justify-center">
        <p className="text-xs text-slate-500">
          Powered by Collab • Shared on {formattedDate}
        </p>
      </footer>
    </div>
  );
}
