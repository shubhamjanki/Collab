"use client";

import React from "react";

interface PageDotsProps {
  totalPages: number;
  currentPage: number;
  onPageClick: (page: number) => void;
  className?: string;
}

export const PageDots: React.FC<PageDotsProps> = ({
  totalPages,
  currentPage,
  onPageClick,
  className = "",
}) => {
  if (totalPages <= 1) return null;

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
        <button
          key={pageNum}
          onClick={() => onPageClick(pageNum)}
          className={`
            w-2 h-2 rounded-full transition-all duration-200 hover:scale-125
            ${
              currentPage === pageNum
                ? "bg-blue-600 scale-110 shadow-lg"
                : "bg-slate-300 hover:bg-slate-400"
            }
          `}
          aria-label={`Go to page ${pageNum}`}
          title={`Page ${pageNum}`}
        />
      ))}
    </div>
  );
};
