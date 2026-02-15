"use client";

import React, { useEffect, useState, useRef } from 'react';
import { ChevronLeft, ChevronRight, Maximize2, Loader2 } from 'lucide-react';

// Dynamic import for pdfjs-dist to avoid SSR issues
let pdfjsLib: any = null;

if (typeof window !== 'undefined') {
  import('pdfjs-dist').then((module) => {
    pdfjsLib = module;
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.mjs';
  });
}

interface PDFViewerProps {
  pdfDataUrl: string;
  currentPage: number;
  onPageChange?: (page: number) => void;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({
  pdfDataUrl,
  currentPage,
  onPageChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);
  const [pdf, setPdf] = useState<any>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRendering, setIsRendering] = useState(false);
  const [scale, setScale] = useState(1.5);

  // Load PDF document
  useEffect(() => {
    if (!pdfDataUrl || !pdfDataUrl.startsWith('data:application/pdf')) {
      return;
    }

    if (!pdfjsLib) {
      setTimeout(() => {
        setIsLoading(true);
      }, 100);
      return;
    }

    const loadPDF = async () => {
      try {
        setIsLoading(true);
        
        // Convert base64 to Uint8Array
        const base64 = pdfDataUrl.split(',')[1];
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        // Load PDF
        const loadingTask = pdfjsLib.getDocument({ data: bytes });
        const pdfDoc = await loadingTask.promise;
        
        setPdf(pdfDoc);
        setTotalPages(pdfDoc.numPages);
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading PDF:', error);
        setIsLoading(false);
      }
    };

    loadPDF();
  }, [pdfDataUrl]);

  // Render current page
  useEffect(() => {
    if (!pdf || !canvasRef.current || currentPage < 1 || currentPage > totalPages) {
      return;
    }

    const renderPage = async () => {
      try {
        // Cancel any ongoing render task
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
          } catch (e) {
            // Ignore cancellation errors
          }
          renderTaskRef.current = null;
        }

        setIsRendering(true);
        
        const page = await pdf.getPage(currentPage);
        const viewport = page.getViewport({ scale });
        
        const canvas = canvasRef.current;
        if (!canvas) {
          setIsRendering(false);
          return;
        }
        
        const context = canvas.getContext('2d');
        if (!context) {
          setIsRendering(false);
          return;
        }

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        // Store the render task so we can cancel it if needed
        renderTaskRef.current = page.render({
          canvasContext: context,
          viewport: viewport,
        } as any);

        await renderTaskRef.current.promise;
        renderTaskRef.current = null;
        setIsRendering(false);
      } catch (error: any) {
        renderTaskRef.current = null;
        // Only log if it's not a cancellation error
        if (error.name !== 'RenderingCancelledException') {
          console.error('Error rendering page:', error);
        }
        setIsRendering(false);
      }
    };

    renderPage();

    // Cleanup function to cancel render on unmount or page change
    return () => {
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch (e) {
          // Ignore cancellation errors
        }
        renderTaskRef.current = null;
      }
    };
  }, [pdf, currentPage, scale, totalPages]);

  const goToPrevPage = () => {
    if (currentPage > 1) {
      const newPage = currentPage - 1;
      onPageChange?.(newPage);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      const newPage = currentPage + 1;
      onPageChange?.(newPage);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-100">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400 mx-auto mb-2" />
          <p className="text-sm text-slate-600">Loading PDF...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-slate-100 relative group">
      {/* Controls Overlay */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-[#0f172a]/90 backdrop-blur-md px-4 py-2 rounded-full border border-slate-700/50 flex items-center gap-5 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-2xl">
        <button 
          onClick={goToPrevPage}
          disabled={currentPage <= 1}
          className="text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        
        <span className="text-xs font-bold text-white tracking-widest px-2">
          Page {currentPage} / {totalPages}
        </span>
        
        <button 
          onClick={goToNextPage}
          disabled={currentPage >= totalPages}
          className="text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        
        <div className="w-px h-3 bg-slate-700" />
        
        <button className="text-slate-400 hover:text-white">
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Canvas Container */}
      <div className="flex-1 overflow-auto flex items-start justify-center p-6">
        <div className="relative shadow-2xl">
          {isRendering && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-10">
              <Loader2 className="h-6 w-6 animate-spin text-slate-600" />
            </div>
          )}
          <canvas 
            ref={canvasRef}
            className="max-w-full h-auto bg-white"
          />
        </div>
      </div>
    </div>
  );
};
