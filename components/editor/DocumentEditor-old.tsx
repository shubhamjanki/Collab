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
import TextStyle from "@tiptap/extension-text-style";
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
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface DocumentEditorProps {
  documentId: string;
  initialContent?: string;
}

export default function DocumentEditor({ documentId, initialContent }: DocumentEditorProps) {
  const { data: session } = useSession();
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastEditor, setLastEditor] = useState<string | null>(null);
  const isLocalUpdate = useRef(false);
  const lastLocalEditAt = useRef<number>(0);

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
      StarterKit,
      Underline,
      Image.configure({ inline: false }),
      Link.configure({ openOnClick: false }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: initialContent || "",
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      lastLocalEditAt.current = Date.now();
      debouncedSave(editor.getHTML());
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
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const handleAddLink = () => {
    const url = window.prompt("Enter URL");
    if (!url) return;
    editor?.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
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

    return (
    <div className="border border-gray-200 rounded-lg bg-white shadow-sm overflow-hidden text-black">
      <div className="editor-toolbar flex flex-wrap items-center justify-between p-2 gap-2 border-b border-gray-200">
        <div className="flex flex-wrap gap-2">
          <div className="editor-toolbar-group">
            <button
              onClick={() => editor?.chain().focus().toggleBold().run()}
              className={`editor-toolbar-button font-bold ${editor?.isActive("bold") ? "active" : ""}`}
            >
              B
            </button>
            <button
              onClick={() => editor?.chain().focus().toggleItalic().run()}
              className={`editor-toolbar-button italic ${editor?.isActive("italic") ? "active" : ""}`}
            >
              I
            </button>
            <button
              onClick={() => editor?.chain().focus().toggleUnderline().run()}
              className={`editor-toolbar-button underline ${editor?.isActive("underline") ? "active" : ""}`}
            >
              U
            </button>
          </div>

          <div className="editor-toolbar-group">
            <button
              onClick={() => editor?.chain().focus().setTextAlign("left").run()}
              className={`editor-toolbar-button ${editor?.isActive({ textAlign: "left" }) ? "active" : ""}`}
            >
              <AlignLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => editor?.chain().focus().setTextAlign("center").run()}
              className={`editor-toolbar-button ${editor?.isActive({ textAlign: "center" }) ? "active" : ""}`}
            >
              <AlignCenter className="h-4 w-4" />
            </button>
            <button
              onClick={() => editor?.chain().focus().setTextAlign("right").run()}
              className={`editor-toolbar-button ${editor?.isActive({ textAlign: "right" }) ? "active" : ""}`}
            >
              <AlignRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => editor?.chain().focus().setTextAlign("justify").run()}
              className={`editor-toolbar-button ${editor?.isActive({ textAlign: "justify" }) ? "active" : ""}`}
            >
              <AlignJustify className="h-4 w-4" />
            </button>
          </div>

          <div className="editor-toolbar-group">
            <button
              onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
              className={`editor-toolbar-button ${editor?.isActive("heading", { level: 1 }) ? "active" : ""}`}
            >
              H1
            </button>
            <button
              onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
              className={`editor-toolbar-button ${editor?.isActive("heading", { level: 2 }) ? "active" : ""}`}
            >
              H2
            </button>
          </div>

          <div className="editor-toolbar-group">
            <button
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
              className={`editor-toolbar-button ${editor?.isActive("bulletList") ? "active" : ""}`}
            >
              * List
            </button>
            <button
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
              className={`editor-toolbar-button ${editor?.isActive("orderedList") ? "active" : ""}`}
            >
              1. List
            </button>
          </div>

          <div className="editor-toolbar-group">
            <button
              onClick={handleInsertImage}
              className="editor-toolbar-button"
            >
              <ImageIcon className="h-4 w-4" />
            </button>
            <button
              onClick={handleAddLink}
              className={`editor-toolbar-button ${editor?.isActive("link") ? "active" : ""}`}
            >
              <Link2 className="h-4 w-4" />
            </button>
            <button
              onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
              className="editor-toolbar-button"
            >
              <TableIcon className="h-4 w-4" />
            </button>
          </div>

          <div className="editor-toolbar-group">
            <button
              onClick={() => editor?.chain().focus().undo().run()}
              className="editor-toolbar-button"
            >
              <Undo2 className="h-4 w-4" />
            </button>
            <button
              onClick={() => editor?.chain().focus().redo().run()}
              className="editor-toolbar-button"
            >
              <Redo2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {lastEditor && (
            <div className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-md flex items-center gap-1">
              <Users className="h-3 w-3" />
              {lastEditor} just edited
            </div>
          )}
          <div className="text-xs text-gray-500 flex items-center gap-1.5">
            {isSaving ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Saving...
              </>
            ) : isUpdating ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
                <span className="text-blue-600">Syncing...</span>
              </>
            ) : lastSaved ? (
              <>
                <CheckCircle className="h-3 w-3 text-green-500" />
                Saved {lastSaved.toLocaleTimeString()}
              </>
            ) : null}
          </div>
          <Button
            size="sm"
            variant="default"
            className="gap-2 h-8"
            onClick={() => editor && handleSave(editor.getHTML())}
            disabled={isSaving}
          >
            <Save className="h-3.5 w-3.5" />
            Save Now
          </Button>
        </div>
      </div>
      <div className="p-4 bg-gray-100">
        <div className="editor-page bg-white shadow-sm border border-gray-200 rounded-md max-w-3xl mx-auto">
          <div className="editor-ruler" />
          <EditorContent
            editor={editor}
            className="editor-content min-h-[700px] max-w-none focus:outline-none p-10"
          />
        </div>
      </div>
    </div>
  );
}
