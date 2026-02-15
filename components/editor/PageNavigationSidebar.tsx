import React, { useEffect, useRef, useState } from 'react';
import html2canvas from 'html2canvas';

interface PageThumbnail {
  pageNumber: number;
  thumbnail: string | null;
  isGenerating: boolean;
}

interface PageNavigationSidebarProps {
  pages: number;
  currentPage: number;
  onPageClick: (pageNumber: number) => void;
  containerRef?: React.RefObject<HTMLDivElement | null>;
}

export const PageNavigationSidebar: React.FC<PageNavigationSidebarProps> = ({
  pages,
  currentPage,
  onPageClick,
  containerRef,
}) => {
  const [thumbnails, setThumbnails] = useState<PageThumbnail[]>([]);
  const generationTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Initialize thumbnails array
  useEffect(() => {
    const newThumbnails: PageThumbnail[] = [];
    for (let i = 1; i <= pages; i++) {
      newThumbnails.push({
        pageNumber: i,
        thumbnail: null,
        isGenerating: false,
      });
    }
    setThumbnails(newThumbnails);
  }, [pages]);

  // Generate thumbnails with debounce
  useEffect(() => {
    if (generationTimeoutRef.current) {
      clearTimeout(generationTimeoutRef.current);
    }

    generationTimeoutRef.current = setTimeout(() => {
      generateThumbnails();
    }, 1000); // Debounce by 1 second

    return () => {
      if (generationTimeoutRef.current) {
        clearTimeout(generationTimeoutRef.current);
      }
    };
  }, [pages, containerRef?.current]);

  const generateThumbnails = async () => {
    if (!containerRef?.current) return;

    const pageElements = containerRef.current.querySelectorAll('.editor-page');
    
    for (let i = 0; i < pageElements.length; i++) {
      const pageElement = pageElements[i] as HTMLElement;
      
      try {
        setThumbnails(prev => 
          prev.map(t => 
            t.pageNumber === i + 1 ? { ...t, isGenerating: true } : t
          )
        );

        const canvas = await html2canvas(pageElement, {
          scale: 0.2, // Lower scale for thumbnail
          logging: false,
          useCORS: true,
          allowTaint: true,
        });

        const thumbnailUrl = canvas.toDataURL('image/png');

        setThumbnails(prev =>
          prev.map(t =>
            t.pageNumber === i + 1
              ? { ...t, thumbnail: thumbnailUrl, isGenerating: false }
              : t
          )
        );
      } catch (error) {
        console.error(`Error generating thumbnail for page ${i + 1}:`, error);
        setThumbnails(prev =>
          prev.map(t =>
            t.pageNumber === i + 1 ? { ...t, isGenerating: false } : t
          )
        );
      }
    }
  };

  return (
    <div className="page-navigation-sidebar">
      <div className="sidebar-header">
        <h3 className="sidebar-title">Pages</h3>
        <span className="page-count">{pages} {pages === 1 ? 'page' : 'pages'}</span>
      </div>

      <div className="thumbnails-container">
        {thumbnails.map((thumbnail) => (
          <div
            key={thumbnail.pageNumber}
            className={`thumbnail-item ${
              currentPage === thumbnail.pageNumber ? 'active' : ''
            }`}
            onClick={() => onPageClick(thumbnail.pageNumber)}
          >
            <div className="thumbnail-wrapper">
              {thumbnail.isGenerating ? (
                <div className="thumbnail-loading">
                  <div className="spinner"></div>
                </div>
              ) : thumbnail.thumbnail ? (
                <img
                  src={thumbnail.thumbnail}
                  alt={`Page ${thumbnail.pageNumber}`}
                  className="thumbnail-image"
                />
              ) : (
                <div className="thumbnail-placeholder">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <path d="M14 2v6h6" />
                  </svg>
                </div>
              )}
            </div>
            <span className="thumbnail-label">Page {thumbnail.pageNumber}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
