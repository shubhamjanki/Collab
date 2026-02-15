"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import DocumentPreviewer from "@/components/editor/DocumentPreviewer";
import { toast } from "sonner";

type DocumentData = {
  id: string;
  title: string;
  content: string | null;
  googleDocUrl?: string | null;
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

  useEffect(() => {
    if (documentId) {
      loadDocument();
    }
  }, [documentId]);

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
    <div className="h-screen flex flex-col overflow-hidden bg-slate-900">
      <main className="flex-1 overflow-hidden">
        <DocumentPreviewer
          documentId={documentId}
          initialContent={documentData.content || "<p>Start typing here...</p>"}
          documentTitle={documentData.title}
          googleDocUrl={documentData.googleDocUrl}
          onSyncSuccess={loadDocument}
          projectId={documentData.project?.id}
          projectName={documentData.project?.name}
        />
      </main>
    </div>
  );
}
