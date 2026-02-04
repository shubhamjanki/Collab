"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableCell } from "@tiptap/extension-table-cell";
import { Color } from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import { useEffect, useCallback, useState, useRef } from "react";
import { debounce } from "lodash";
import { saveDocument } from "@/lib/api/documents";
import {
  Save,
  CheckCircle,
  Loader2,
  Users,
  Image as ImageIcon,
  Link2,
  Undo2,
  Redo2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Table as TableIcon,
  FileDown,
  FileText,
  Type,
  Palette,
  Highlighter,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  List,
  ListOrdered,
  Minus,
  Plus,
  Heading1,
  Heading2,
  Heading3,
  Code,
  Quote,
  Strikethrough,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

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
  onContentChange
}: DocumentEditorProps) {
  const { data: session } = useSession();
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastEditor, setLastEditor] = useState<string | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [pages, setPages] = useState(1);
  const isLocalUpdate = useRef(false);
  const lastLocalEditAt = useRef<number>(0);
  const editorContentRef = useRef<HTMLDivElement>(null);

  const colors = [
    "#000000", "#FF0000", "#00FF00", "#0000FF", "#FFFF00",
    "#FF00FF", "#00FFFF", "#FFA500", "#800080", "#008000",
    "#808080", "#C0C0C0", "#800000", "#808000", "#000080"
  ];

  const handleSave = async (content: string) => {
    setIsSaving(true);
    isLocalUpdate.current = true;
    try {
      await saveDocument(documentId, content);
      setLastSaved(new Date());

      try {
        const changes = editor?.state.doc.textContent.length || 0;
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

  const debouncedSave = useCallback(
    debounce((content: string) => {
      handleSave(content);
    }, 2000),
    [documentId]
  );

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
      }),
      Underline,
      Image.configure({ inline: false }),
      Link.configure({ openOnClick: false }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Subscript,
      Superscript,
    ],
    content: initialContent || "",
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      lastLocalEditAt.current = Date.now();
      const html = editor.getHTML();
      debouncedSave(html);
      if (onContentChange) {
        onContentChange(html);
      }
      // Calculate pages based on content height
      setTimeout(() => {
        if (editorContentRef.current) {
          const contentHeight = editorContentRef.current.scrollHeight;
          const pageHeight = 29.7 * 37.795; // A4 height in pixels (96 DPI)
          const padding = 2.54 * 37.795 * 2; // Top and bottom padding
          const availableHeight = pageHeight - padding;
          const calculatedPages = Math.max(1, Math.ceil(contentHeight / availableHeight));
          setPages(calculatedPages);
        }
      }, 100);
    },
    editorProps: {
      handlePaste: (_view, event) => {
        const clipboard = event.clipboardData;
        if (!clipboard) return false;
        const items = Array.from(clipboard.items || []);
        const imageItem = items.find((item) => item.type.startsWith("image/"));
        if (!imageItem) return false;

        const file = imageItem.getAsFile();
        if (!file) return false;

        const reader = new FileReader();
        reader.onload = () => {
          const src = reader.result as string;
          editor?.chain().focus().setImage({ src }).run();
        };
        reader.readAsDataURL(file);
        return true;
      },
    },
  });

  const handleInsertImage = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const src = reader.result as string;
        editor?.chain().focus().setImage({ src }).run();
        toast.success("Image inserted successfully");
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const handleAddLink = () => {
    const url = window.prompt("Enter URL");
    if (!url) return;
    editor?.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    toast.success("Link added successfully");
  };

  const exportToPDF = async () => {
    try {
      toast.info("Generating PDF...");
      const content = editorContentRef.current;
      if (!content) return;

      const canvas = await html2canvas(content, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

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
    } catch (error) {
      console.error("PDF export error:", error);
      toast.error("Failed to export PDF");
    }
  };

  const exportToWord = () => {
    try {
      const content = editor?.getHTML() || "";
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

  // Real-time updates - Poll for changes from other users
  useEffect(() => {
    if (!editor || !documentId) return;

    const checkForUpdates = async () => {
      if (isSaving || isLocalUpdate.current) return;
      if (Date.now() - lastLocalEditAt.current < 4000) return;

      try {
        const response = await fetch(`/api/documents/${documentId}`);
        if (!response.ok) return;

        const data = await response.json();
        const serverContent = data.content || "";
        const currentContent = editor.getHTML();

        if (serverContent && serverContent !== currentContent) {
          setIsUpdating(true);
          const { from, to } = editor.state.selection;
          editor.commands.setContent(serverContent, false);
          try {
            editor.commands.setTextSelection({ from, to });
          } catch (e) {
            // ignore
          }

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
  }, [documentId, editor, isSaving, session?.user?.id]);

  useEffect(() => {
    if (editor && initialContent !== undefined && editor.getHTML() !== initialContent) {
      editor.commands.setContent(initialContent);
    }
  }, [initialContent, editor]);

  const ToolbarButton = ({ 
    onClick, 
    active, 
    disabled, 
    children, 
    title 
  }: { 
    onClick: () => void; 
    active?: boolean; 
    disabled?: boolean; 
    children: React.ReactNode;
    title: string;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-2 rounded hover:bg-gray-100 transition-colors ${
        active ? "bg-blue-100 text-blue-600" : "text-gray-700"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      {children}
    </button>
  );

  return (
    <div className="border border-gray-300 rounded-lg bg-white shadow-lg overflow-hidden">
      {/* Main Toolbar */}
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
            ) : lastSaved ? (
              <>
                <CheckCircle className="h-3 w-3" />
                Saved {lastSaved.toLocaleTimeString()}
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* Formatting Toolbar */}
      <div className="bg-gray-50 border-b border-gray-200 px-3 py-2">
        <div className="flex flex-wrap items-center gap-1">
          {/* File Operations */}
          <div className="flex items-center gap-1 pr-2 border-r border-gray-300">
            <ToolbarButton
              onClick={() => editor && handleSave(editor.getHTML())}
              disabled={isSaving}
              title="Save Document"
            >
              <Save className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton onClick={exportToPDF} title="Export to PDF">
              <FileDown className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton onClick={exportToWord} title="Export to Word">
              <FileText className="h-4 w-4" />
            </ToolbarButton>
          </div>

          {/* Undo/Redo */}
          <div className="flex items-center gap-1 pr-2 border-r border-gray-300">
            <ToolbarButton
              onClick={() => editor?.chain().focus().undo().run()}
              disabled={!editor?.can().undo()}
              title="Undo"
            >
              <Undo2 className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().redo().run()}
              disabled={!editor?.can().redo()}
              title="Redo"
            >
              <Redo2 className="h-4 w-4" />
            </ToolbarButton>
          </div>

          {/* Headings */}
          <div className="flex items-center gap-1 pr-2 border-r border-gray-300">
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
              active={editor?.isActive("heading", { level: 1 })}
              title="Heading 1"
            >
              <Heading1 className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
              active={editor?.isActive("heading", { level: 2 })}
              title="Heading 2"
            >
              <Heading2 className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
              active={editor?.isActive("heading", { level: 3 })}
              title="Heading 3"
            >
              <Heading3 className="h-4 w-4" />
            </ToolbarButton>
          </div>

          {/* Text Formatting */}
          <div className="flex items-center gap-1 pr-2 border-r border-gray-300">
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleBold().run()}
              active={editor?.isActive("bold")}
              title="Bold"
            >
              <span className="font-bold text-sm">B</span>
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleItalic().run()}
              active={editor?.isActive("italic")}
              title="Italic"
            >
              <span className="italic text-sm">I</span>
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleUnderline().run()}
              active={editor?.isActive("underline")}
              title="Underline"
            >
              <span className="underline text-sm">U</span>
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleStrike().run()}
              active={editor?.isActive("strike")}
              title="Strikethrough"
            >
              <Strikethrough className="h-4 w-4" />
            </ToolbarButton>
          </div>

          {/* Text Color & Highlight */}
          <div className="flex items-center gap-1 pr-2 border-r border-gray-300 relative">
            <div className="relative">
              <ToolbarButton
                onClick={() => setShowColorPicker(!showColorPicker)}
                title="Text Color"
              >
                <Palette className="h-4 w-4" />
              </ToolbarButton>
              {showColorPicker && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-2 z-10 grid grid-cols-5 gap-1">
                  {colors.map((color) => (
                    <button
                      key={color}
                      onClick={() => {
                        editor?.chain().focus().setColor(color).run();
                        setShowColorPicker(false);
                      }}
                      className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              )}
            </div>
            <div className="relative">
              <ToolbarButton
                onClick={() => setShowHighlightPicker(!showHighlightPicker)}
                title="Highlight"
              >
                <Highlighter className="h-4 w-4" />
              </ToolbarButton>
              {showHighlightPicker && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-2 z-10 grid grid-cols-5 gap-1">
                  {colors.map((color) => (
                    <button
                      key={color}
                      onClick={() => {
                        editor?.chain().focus().toggleHighlight({ color }).run();
                        setShowHighlightPicker(false);
                      }}
                      className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                  <button
                    onClick={() => {
                      editor?.chain().focus().unsetHighlight().run();
                      setShowHighlightPicker(false);
                    }}
                    className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform bg-white"
                    title="Remove highlight"
                  >
                    <Minus className="h-3 w-3 mx-auto" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Subscript/Superscript */}
          <div className="flex items-center gap-1 pr-2 border-r border-gray-300">
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleSubscript().run()}
              active={editor?.isActive("subscript")}
              title="Subscript"
            >
              <SubscriptIcon className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleSuperscript().run()}
              active={editor?.isActive("superscript")}
              title="Superscript"
            >
              <SuperscriptIcon className="h-4 w-4" />
            </ToolbarButton>
          </div>

          {/* Alignment */}
          <div className="flex items-center gap-1 pr-2 border-r border-gray-300">
            <ToolbarButton
              onClick={() => editor?.chain().focus().setTextAlign("left").run()}
              active={editor?.isActive({ textAlign: "left" })}
              title="Align Left"
            >
              <AlignLeft className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().setTextAlign("center").run()}
              active={editor?.isActive({ textAlign: "center" })}
              title="Align Center"
            >
              <AlignCenter className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().setTextAlign("right").run()}
              active={editor?.isActive({ textAlign: "right" })}
              title="Align Right"
            >
              <AlignRight className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().setTextAlign("justify").run()}
              active={editor?.isActive({ textAlign: "justify" })}
              title="Justify"
            >
              <AlignJustify className="h-4 w-4" />
            </ToolbarButton>
          </div>

          {/* Lists */}
          <div className="flex items-center gap-1 pr-2 border-r border-gray-300">
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
              active={editor?.isActive("bulletList")}
              title="Bullet List"
            >
              <List className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
              active={editor?.isActive("orderedList")}
              title="Numbered List"
            >
              <ListOrdered className="h-4 w-4" />
            </ToolbarButton>
          </div>

          {/* Insert */}
          <div className="flex items-center gap-1 pr-2 border-r border-gray-300">
            <ToolbarButton onClick={handleInsertImage} title="Insert Image">
              <ImageIcon className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton onClick={handleAddLink} title="Insert Link">
              <Link2 className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
              title="Insert Table"
            >
              <TableIcon className="h-4 w-4" />
            </ToolbarButton>
          </div>

          {/* Code & Quote */}
          <div className="flex items-center gap-1">
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleCode().run()}
              active={editor?.isActive("code")}
              title="Code"
            >
              <Code className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleBlockquote().run()}
              active={editor?.isActive("blockquote")}
              title="Quote"
            >
              <Quote className="h-4 w-4" />
            </ToolbarButton>
          </div>
        </div>
      </div>

      {/* Editor Content - Multiple Pages */}
      <div className="p-6 bg-gray-100 min-h-[600px]">
        <div className="space-y-6 max-w-[21cm] mx-auto">
          <div
            ref={editorContentRef}
            className="editor-page bg-white shadow-lg border border-gray-300 w-[21cm] min-h-[29.7cm] p-[2.54cm]"
          >
            <EditorContent
              editor={editor}
              className="prose prose-sm sm:prose lg:prose-lg max-w-none focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="bg-gray-50 border-t border-gray-200 px-4 py-2 text-xs text-gray-600 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span>Words: {editor?.state.doc.textContent.split(/\s+/).filter(Boolean).length || 0}</span>
          <span>Characters: {editor?.state.doc.textContent.length || 0}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-500">Ready</span>
        </div>
      </div>

      <style jsx global>{`
        .ProseMirror {
          outline: none;
          font-family: 'Times New Roman', Times, serif;
          font-size: 12pt;
          line-height: 1.6;
          color: #000;
          min-height: 100%;
          background-image: repeating-linear-gradient(
            to bottom,
            transparent 0,
            transparent calc(29.7cm - 2.54cm * 2 - 1px),
            #e0e0e0 calc(29.7cm - 2.54cm * 2 - 1px),
            #e0e0e0 calc(29.7cm - 2.54cm * 2),
            transparent calc(29.7cm - 2.54cm * 2),
            transparent calc(29.7cm - 2.54cm * 2 + 1.5cm)
          );
          background-size: 100% calc(29.7cm - 2.54cm * 2 + 1.5cm);
        }

        .ProseMirror p {
          margin: 0 0 12pt 0;
          page-break-inside: avoid;
        }

        .ProseMirror h1 {
          font-size: 24pt;
          font-weight: bold;
          margin: 24pt 0 12pt 0;
          page-break-after: avoid;
        }

        .ProseMirror h2 {
          font-size: 18pt;
          font-weight: bold;
          margin: 18pt 0 12pt 0;
          page-break-after: avoid;
        }

        .ProseMirror h3 {
          font-size: 14pt;
          font-weight: bold;
          margin: 14pt 0 12pt 0;
          page-break-after: avoid;
        }

        .ProseMirror table {
          border-collapse: collapse;
          width: 100%;
          margin: 12pt 0;
          page-break-inside: avoid;
        }

        .ProseMirror table td,
        .ProseMirror table th {
          border: 1px solid #ddd;
          padding: 8px;
          min-width: 50px;
        }

        .ProseMirror table th {
          background-color: #f2f2f2;
          font-weight: bold;
        }

        .ProseMirror img {
          max-width: 100%;
          height: auto;
          display: block;
          margin: 12pt 0;
          page-break-inside: avoid;
        }

        .ProseMirror blockquote {
          border-left: 4px solid #ddd;
          padding-left: 16px;
          margin: 12pt 0;
          color: #666;
        }

        .ProseMirror code {
          background-color: #f4f4f4;
          padding: 2px 6px;
          border-radius: 3px;
          font-family: 'Courier New', monospace;
        }

        .ProseMirror pre {
          background-color: #f4f4f4;
          padding: 12px;
          border-radius: 4px;
          overflow-x: auto;
        }

        .ProseMirror ul,
        .ProseMirror ol {
          padding-left: 24pt;
          margin: 12pt 0;
        }

        .ProseMirror li {
          margin: 4pt 0;
        }

        .ProseMirror a {
          color: #0066cc;
          text-decoration: underline;
        }

        .editor-page {
          box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
          position: relative;
        }

        @media print {
          .editor-page {
            box-shadow: none;
            border: none;
            margin: 0;
            padding: 0;
          }
          
          .ProseMirror {
            background: none;
          }
          
          /* Force page breaks at A4 height intervals */
          .ProseMirror::before {
            content: '';
            display: block;
            height: 0;
            page-break-before: always;
          }
        }

        /* Ensure proper spacing */
        .editor-page {
          overflow: visible;
        }
      `}</style>
    </div>
  );
}
