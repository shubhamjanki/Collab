"use client";

import React from "react";

interface PageLetterheadProps {
  pageNumber: number;
}

export const PageLetterhead: React.FC<PageLetterheadProps> = ({ pageNumber }) => {
  return (
    <div className="absolute top-0 left-0 right-0 h-16 border-b border-slate-200 bg-gradient-to-b from-slate-50 to-white">
      <div className="flex items-center justify-between h-full px-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
            <span className="text-white text-xs font-bold">DOC</span>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-800">Collaboration Platform</div>
            <div className="text-[10px] text-slate-500">Academic Document</div>
          </div>
        </div>
        <div className="text-xs text-slate-400 font-mono">
          Page {pageNumber}
        </div>
      </div>
    </div>
  );
};
