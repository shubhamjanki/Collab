"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History, User, Clock, Loader2 } from "lucide-react";

interface EditHistoryUser {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
}

interface Revision {
    id: string;
    userId: string;
    user: EditHistoryUser;
    createdAt: string;
}

interface EditSummary {
    userId: string;
    user: EditHistoryUser;
    date: string;
    count: number;
    lastEdit: string;
}

interface DocumentEditHistoryProps {
    documentId: string;
}

export function DocumentEditHistory({ documentId }: DocumentEditHistoryProps) {
    const [revisions, setRevisions] = useState<Revision[]>([]);
    const [summary, setSummary] = useState<EditSummary[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showAll, setShowAll] = useState(false);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const response = await fetch(`/api/documents/${documentId}/history`);
                if (!response.ok) throw new Error("Failed to fetch history");
                const data = await response.json();
                setRevisions(data.revisions);
                setSummary(data.summary);
            } catch (error) {
                console.error("Error:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchHistory();
        
        // Refresh every 5 seconds for real-time updates
        const interval = setInterval(fetchHistory, 5000);
        return () => clearInterval(interval);
    }, [documentId]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
        );
    }

    if (revisions.length === 0) {
        return null;
    }

    const displayedRevisions = showAll ? revisions : revisions.slice(0, 10);

    return (
        <Card className="mt-4">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                    <History className="h-4 w-4 text-indigo-600" />
                    Edit History
                    <Badge variant="secondary" className="ml-auto">
                        {revisions.length} {revisions.length === 1 ? "edit" : "edits"}
                    </Badge>
                </CardTitle>
            </CardHeader>
            <CardContent>
                {/* Summary by contributor */}
                <div className="mb-4 pb-4 border-b">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Contributors</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {summary.map((item) => (
                            <div
                                key={`${item.userId}-${item.date}`}
                                className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg"
                            >
                                <div className="flex-shrink-0">
                                    {item.user.image ? (
                                        <img
                                            src={item.user.image}
                                            alt={item.user.name || "User"}
                                            className="w-8 h-8 rounded-full"
                                        />
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-semibold">
                                            {(item.user.name || item.user.email).charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-gray-900 truncate">
                                        {item.user.name || item.user.email}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {item.count} {item.count === 1 ? "edit" : "edits"} • {item.date}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recent edits timeline */}
                <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Recent Activity</h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                        {displayedRevisions.map((revision, index) => (
                            <div
                                key={revision.id}
                                className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded-lg transition"
                            >
                                <div className="flex-shrink-0 mt-0.5">
                                    {revision.user.image ? (
                                        <img
                                            src={revision.user.image}
                                            alt={revision.user.name || "User"}
                                            className="w-6 h-6 rounded-full"
                                        />
                                    ) : (
                                        <div className="w-6 h-6 rounded-full bg-gray-400 text-white flex items-center justify-center text-xs font-semibold">
                                            {(revision.user.name || revision.user.email).charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-gray-900 truncate">
                                            {revision.user.name || revision.user.email}
                                        </span>
                                        <span className="text-xs text-gray-500">edited</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                                        <Clock className="h-3 w-3" />
                                        {formatDistanceToNow(new Date(revision.createdAt), {
                                            addSuffix: true,
                                        })}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    {revisions.length > 10 && (
                        <button
                            onClick={() => setShowAll(!showAll)}
                            className="mt-3 w-full text-center text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                        >
                            {showAll ? "Show Less" : `Show All ${revisions.length} Edits`}
                        </button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
