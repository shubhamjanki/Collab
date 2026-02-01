"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Check, X, Mail } from "lucide-react";

interface Project {
    id: string;
    name: string;
}

interface Inviter {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
}

interface Invitation {
    id: string;
    projectId: string;
    project: Project;
    inviter: Inviter;
    role: string;
    createdAt: string;
}

export function PendingInvitations() {
    const [invitations, setInvitations] = useState<Invitation[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    const fetchInvitations = async () => {
        try {
            const response = await fetch("/api/invitations");
            if (!response.ok) throw new Error("Failed to fetch invitations");
            const data = await response.json();
            setInvitations(data);
        } catch (error) {
            console.error("Error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchInvitations();
    }, []);

    const handleAction = async (id: string, action: "accept" | "reject") => {
        setProcessingId(id);
        try {
            const response = await fetch(`/api/invitations/${id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ action }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to process invitation");
            }

            toast.success(data.message || `Invitation ${action}ed`);
            setInvitations((prev) => prev.filter((inv) => inv.id !== id));
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setProcessingId(null);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (invitations.length === 0) {
        return null;
    }

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Pending Invitations
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {invitations.map((invitation) => (
                    <Card key={invitation.id} className="overflow-hidden">
                        <CardHeader className="bg-muted/50 pb-4">
                            <CardTitle className="text-base">
                                {invitation.project.name}
                            </CardTitle>
                            <CardDescription>
                                Invited by {invitation.inviter.name || invitation.inviter.email}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                            <div className="flex items-center justify-between text-sm">
                                <Badge variant="secondary">{invitation.role}</Badge>
                                <span className="text-muted-foreground">
                                    {formatDistanceToNow(new Date(invitation.createdAt), {
                                        addSuffix: true,
                                    })}
                                </span>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    className="flex-1"
                                    size="sm"
                                    onClick={() => handleAction(invitation.id, "accept")}
                                    disabled={processingId === invitation.id}
                                >
                                    {processingId === invitation.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <>
                                            <Check className="mr-2 h-4 w-4" />
                                            Accept
                                        </>
                                    )}
                                </Button>
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    size="sm"
                                    onClick={() => handleAction(invitation.id, "reject")}
                                    disabled={processingId === invitation.id}
                                >
                                    <X className="mr-2 h-4 w-4" />
                                    Reject
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
