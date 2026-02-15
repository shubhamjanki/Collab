"use client";

import { useState } from "react";
import { ExternalLink, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type GoogleDocsEmbedProps = {
  embedUrl: string;
  editUrl: string;
  title: string;
  lastModified?: string;
};

export default function GoogleDocsEmbed({
  embedUrl,
  editUrl,
  title,
  lastModified,
}: GoogleDocsEmbedProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header with metadata */}
      <div className="border-b border-gray-200 bg-gray-50 px-6 py-3 flex items-center justify-between">
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          {lastModified && (
            <p className="text-sm text-gray-500">Last modified: {lastModified}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(editUrl, "_blank")}
            className="flex items-center gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Edit in Google Docs
          </Button>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-600" />
            <p className="text-sm text-gray-600">Loading Google Doc...</p>
          </div>
        </div>
      )}

      {/* Error state */}
      {hasError && (
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center max-w-md px-4">
            <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Unable to load embedded preview
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              The document couldn't be loaded in preview mode. This may happen due to browser
              security settings or document permissions.
            </p>
            <Button
              onClick={() => window.open(editUrl, "_blank")}
              className="flex items-center gap-2 mx-auto"
            >
              <ExternalLink className="h-4 w-4" />
              Open in Google Docs
            </Button>
          </div>
        </div>
      )}

      {/* Google Docs iframe */}
      {!hasError && (
        <iframe
          src={embedUrl}
          className="flex-1 w-full border-0"
          onLoad={handleIframeLoad}
          onError={handleIframeError}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
        />
      )}
    </div>
  );
}
