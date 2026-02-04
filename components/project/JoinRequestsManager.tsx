"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { UserPlus, Check, X, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface JoinRequest {
    id: string;
    email: string;
    role: string;
    status: string;
    createdAt: string;
    invitedBy: string;
    project: {
        id: string;
        name: string;
    };
}

interface JoinRequestsManagerProps {
    projectId: string;
    onRequestProcessed?: () => void;
}

export function JoinRequestsManager({ projectId, onRequestProcessed }: JoinRequestsManagerProps) {
    const [requests, setRequests] = useState<JoinRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    const fetchRequests = async () => {
        try {
            const response = await fetch(`/api/projects/${projectId}/join-requests`);
            if (!response.ok) {
                if (response.status === 403) {
                    // Not owner/admin, just show nothing
                    setRequests([]);
                    return;
                }
                throw new Error("Failed to fetch requests");
            }
            const data = await response.json();
            setRequests(data);
        } catch (error) {
            console.error("Error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, [projectId]);

    const handleAction = async (requestId: string, action: "approve" | "reject") => {
        setProcessingId(requestId);
        try {
            const response = await fetch(
                `/api/projects/${projectId}/join-requests/${requestId}`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ action }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to process request");
            }

            toast.success(data.message || `Request ${action}d successfully`);
            setRequests((prev) => prev.filter((req) => req.id !== requestId));
            
            // Trigger parent component refresh to update team members list
            if (onRequestProcessed) {
                onRequestProcessed();
            }
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setProcessingId(null);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
        );
    }

    if (requests.length === 0) {
        return null;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                    <UserPlus className="h-5 w-5 text-orange-600" />
                    Pending Join Requests ({requests.length})
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {requests.map((request) => (
                        <div
                            key={request.id}
                            className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg"
                        >
                            <div>
                                <div className="font-medium text-gray-900">{request.email}</div>
                                <div className="text-xs text-gray-500">
                                    Requested {new Date(request.createdAt).toLocaleDateString()}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleAction(request.id, "approve")}
                                    disabled={processingId === request.id}
                                    className="gap-1 bg-green-50 hover:bg-green-100 text-green-700 border-green-300"
                                >
                                    {processingId === request.id ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                        <Check className="h-3 w-3" />
                                    )}
                                    Approve
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleAction(request.id, "reject")}
                                    disabled={processingId === request.id}
                                    className="gap-1 bg-red-50 hover:bg-red-100 text-red-700 border-red-300"
                                >
                                    <X className="h-3 w-3" />
                                    Reject
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
