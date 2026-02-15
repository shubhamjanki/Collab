"use client";

import React, { useEffect, useState, useRef } from 'react';
import { FileText, Loader2 } from 'lucide-react';

// Dynamic import for pdfjs-dist to avoid SSR issues
let pdfjsLib: any = null;

if (typeof window !== 'undefined') {
  import('pdfjs-dist').then((module) => {
    pdfjsLib = module;
    // Use local worker file served from public folder
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.mjs';
    console.log('PDF.js version:', pdfjsLib.version);
    console.log('Worker URL:', pdfjsLib.GlobalWorkerOptions.workerSrc);
  });
}

interface PDFThumbnailSidebarProps {
  pdfDataUrl: string;
  currentPage?: number;
  onPageClick?: (pageNum: number) => void;
  className?: string;
}

interface PageThumbnail {
  pageNumber: number;
  thumbnail: string | null;
  isLoading: boolean;
}

export const PDFThumbnailSidebar: React.FC<PDFThumbnailSidebarProps> = ({
  pdfDataUrl,
  currentPage = 1,
  onPageClick,
  className = '',
}) => {
  const [thumbnails, setThumbnails] = useState<PageThumbnail[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Cleanup previous generation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    generateThumbnails();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [pdfDataUrl]);

  const generateThumbnails = async () => {
    if (!pdfDataUrl || !pdfDataUrl.startsWith('data:application/pdf')) {
      console.log('PDF Thumbnail: Invalid data URL', { 
        hasPdfDataUrl: !!pdfDataUrl, 
        startsWithCorrectPrefix: pdfDataUrl?.startsWith('data:application/pdf'),
        first100Chars: pdfDataUrl?.substring(0, 100)
      });
      return;
    }

    if (!pdfjsLib) {
      console.log('PDF Thumbnail: Waiting for pdfjs-dist to load...');
      // Wait for pdfjs to load
      setTimeout(generateThumbnails, 100);
      return;
    }

    console.log('PDF Thumbnail: Starting generation...');
    setIsGenerating(true);

    try {
      // Convert base64 to Uint8Array
      const base64 = pdfDataUrl.split(',')[1];
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Load PDF
      const loadingTask = pdfjsLib.getDocument({ data: bytes });
      const pdf = await loadingTask.promise;
      const numPages = pdf.numPages;

      console.log(`PDF Thumbnail: Successfully loaded PDF with ${numPages} pages`);

      setTotalPages(numPages);

      // Initialize thumbnails array
      const initialThumbnails: PageThumbnail[] = Array.from(
        { length: numPages },
        (_, i) => ({
          pageNumber: i + 1,
          thumbnail: null,
          isLoading: true,
        })
      );
      setThumbnails(initialThumbnails);

      // Generate thumbnails for each page
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        if (abortControllerRef.current?.signal.aborted) {
          break;
        }

        try {
          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale: 0.2 }); // Small scale for thumbnail

          // Create canvas
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          if (!context) continue;

          canvas.width = viewport.width;
          canvas.height = viewport.height;

          // Render page to canvas and wait for completion
          const renderTask = page.render({
            canvasContext: context,
            viewport: viewport,
            background: 'transparent',
          } as any);

          // Wait for render to complete before continuing
          try {
            await renderTask.promise;
          } catch (renderError: any) {
            // Skip if render was cancelled or failed
            if (renderError.name === 'RenderingCancelledException') {
              console.log(`Thumbnail render cancelled for page ${pageNum}`);
              continue;
            }
            throw renderError;
          }

          // Convert canvas to data URL only after render completes
          const thumbnailUrl = canvas.toDataURL('image/png');

          // Update thumbnail
          setThumbnails((prev) =>
            prev.map((t) =>
              t.pageNumber === pageNum
                ? { ...t, thumbnail: thumbnailUrl, isLoading: false }
                : t
            )
          );
        } catch (error) {
          console.error(`Error generating thumbnail for page ${pageNum}:`, error);
          setThumbnails((prev) =>
            prev.map((t) =>
              t.pageNumber === pageNum ? { ...t, isLoading: false } : t
            )
          );
        }
      }
    } catch (error) {
      console.error('PDF Thumbnail: Error loading PDF:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePageClick = (pageNum: number) => {
    if (onPageClick) {
      onPageClick(pageNum);
    }
  };

  return (
    <div className={`w-64 bg-slate-100 border-r border-slate-300 overflow-y-auto flex-shrink-0 ${className}`}>
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
            Pages
          </h3>
          {isGenerating && (
            <Loader2 className="h-3 w-3 animate-spin text-slate-400" />
          )}
        </div>

        <div className="space-y-3">
          {!pdfDataUrl && (
            <div className="text-center text-xs text-slate-400 py-8">
              <div className="mb-2">No PDF loaded</div>
              <div className="text-[10px] text-slate-300">
                PDF data is empty
              </div>
            </div>
          )}
          
          {pdfDataUrl && !pdfDataUrl.startsWith('data:application/pdf') && (
            <div className="text-center text-xs text-red-400 py-8">
              <div className="mb-2">Invalid PDF format</div>
              <div className="text-[10px] text-slate-300 break-all px-2">
                Data starts with: {pdfDataUrl.substring(0, 50)}...
              </div>
            </div>
          )}
          
          {pdfDataUrl && pdfDataUrl.startsWith('data:application/pdf') && thumbnails.length === 0 && !isGenerating && (
            <div className="text-center text-xs text-slate-400 py-8">
              <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
              <div className="mb-2">Loading PDF...</div>
              <div className="text-[10px] text-slate-300">
                Check console for details
              </div>
            </div>
          )}

          {thumbnails.map((thumb) => (
            <div
              key={thumb.pageNumber}
              className={`bg-white border-2 rounded-lg p-2 transition-all cursor-pointer group ${
                currentPage === thumb.pageNumber
                  ? 'border-blue-500 shadow-md ring-2 ring-blue-200'
                  : 'border-slate-200 hover:border-blue-400 hover:shadow-md'
              }`}
              onClick={() => handlePageClick(thumb.pageNumber)}
            >
              <div className="aspect-[8.5/11] bg-slate-50 border border-slate-200 rounded mb-2 flex items-center justify-center overflow-hidden relative">
                {thumb.isLoading ? (
                  <Loader2 className="h-6 w-6 text-slate-300 animate-spin" />
                ) : thumb.thumbnail ? (
                  <img
                    src={thumb.thumbnail}
                    alt={`Page ${thumb.pageNumber}`}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <FileText className="h-8 w-8 text-slate-300" />
                )}
              </div>
              <div className="text-center text-xs font-medium text-slate-600">
                Page {thumb.pageNumber}
              </div>
            </div>
          ))}
        </div>

        {totalPages > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-300">
            <div className="text-xs text-slate-500 text-center">
              {totalPages} {totalPages === 1 ? 'page' : 'pages'} total
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
