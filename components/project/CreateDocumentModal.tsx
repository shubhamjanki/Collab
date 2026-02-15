"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus } from "lucide-react"
import { toast } from "sonner"

interface CreateDocumentModalProps {
    projectId: string
    onDocumentCreated: (doc: any) => void
}

export function CreateDocumentModal({ projectId, onDocumentCreated }: CreateDocumentModalProps) {
    const [open, setOpen] = useState(false)
    const [title, setTitle] = useState("")
    const [googleDocUrl, setGoogleDocUrl] = useState("")
    const [isLoading, setIsLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!title.trim()) return

        setIsLoading(true)
        try {
            const response = await fetch("/api/documents", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    projectId,
                    title,
                    googleDocUrl: googleDocUrl.trim() || undefined,
                }),
            })

            if (!response.ok) {
                throw new Error("Failed to create document")
            }

            const newDoc = await response.json()
            toast.success("Document created successfully")
            onDocumentCreated(newDoc)
            setOpen(false)
            setTitle("")
            setGoogleDocUrl("")
        } catch (error) {
            console.error(error)
            toast.error("An error occurred while creating the document")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="default" className="gap-2">
                    <Plus className="h-4 w-4" />
                    New Document
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Create Document</DialogTitle>
                        <DialogDescription>
                            Enter a title and e Doc link.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="title" className="text-right">
                                Title
                            </Label>
                            <Input
                                id="title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Project Specification"
                                className="col-span-3"
                                autoFocus
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="googleDocUrl" className="text-right text-xs">
                                Google Doc URL
                            </Label>
                            <Input
                                id="googleDocUrl"
                                value={googleDocUrl}
                                onChange={(e) => setGoogleDocUrl(e.target.value)}
                                placeholder="https://docs.google.com/..."
                                className="col-span-3"
                            />
                        </div>
                    </div>
                    create a new document in google docs and share the public link
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOpen(false)}
                            disabled={isLoading}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading || !title.trim()}>
                            {isLoading ? "Creating..." : "Create"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
