"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, Loader2 } from "lucide-react";

export function JoinProjectModal() {
    const [inviteCode, setInviteCode] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleJoin = async (e: React.FormEvent) => {
        e.preventDefault();
        const code = inviteCode.trim();
        if (!code) return;

        setIsLoading(true);
        try {
            const response = await fetch("/api/projects/join", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ inviteCode: code }),
            });

            const data = await response.json();

            if (response.ok) {
                toast.success(`Joined ${data.projectName} successfully!`);
                setIsOpen(false);
                router.push(`/projects/${data.projectId}`);
                router.refresh();
            } else {
                // If already a member
                if (data.projectId && response.status === 400) {
                    toast.info(data.error);
                    setIsOpen(false);
                    router.push(`/projects/${data.projectId}`);
                } else {
                    throw new Error(data.error || "Failed to join project");
                }
            }
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <button className="bg-white border-2 border-dashed border-gray-300 p-6 rounded-lg hover:border-indigo-400 transition-colors group">
                    <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">👥</div>
                    <div className="font-semibold text-gray-700">Join Team</div>
                    <div className="text-sm text-gray-500">Enter invite code</div>
                </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-indigo-600" />
                        Join a Project Team
                    </DialogTitle>
                    <DialogDescription>
                        Enter the unique invite code shared by your teammate.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleJoin} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="code">Invite Code</Label>
                        <Input
                            id="code"
                            placeholder="e.g. a1b2c3d4"
                            value={inviteCode}
                            onChange={(e) => setInviteCode(e.target.value)}
                            className="font-mono text-center text-lg tracking-widest"
                            required
                        />
                    </div>
                    <div className="flex justify-end pt-4">
                        <Button type="submit" className="w-full" disabled={isLoading || !inviteCode.trim()}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Join Workspace
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
