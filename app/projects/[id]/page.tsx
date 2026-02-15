"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import ChatWindow from "@/components/chat/ChatWindow";
import ContributionDashboard from "@/components/dashboard/ContributionDashboard";
import { TeamMemberList } from "@/components/project/TeamMemberList";
import { InvitationModal } from "@/components/project/InvitationModal";
import { JoinRequestsManager } from "@/components/project/JoinRequestsManager";
import { TaskBoard } from "@/components/tasks/TaskBoard";
import { CreateDocumentModal } from "@/components/project/CreateDocumentModal";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Trash2, Copy, Link as LinkIcon, RefreshCw, LogOut } from "lucide-react";

export default function ProjectPage() {
    const params = useParams();
    const projectId = params.id as string;
    const router = useRouter();
    const { data: session } = useSession();
    const [activeTab, setActiveTab] = useState("documents");
    const [project, setProject] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    const isOwner = project?.members?.some(
        (m: any) => m.userId === session?.user?.id && m.role === "OWNER"
    );
    const isMember = project?.members?.some(
        (m: any) => m.userId === session?.user?.id
    );

    const handleLeaveProject = async () => {
        if (!confirm("Are you sure you want to leave this project?")) return;

        try {
            const res = await fetch(`/api/projects/${projectId}/leave`, { method: "POST" });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Failed to leave project");
            }
            toast.success("You have left the project.");
            router.push("/dashboard");
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const handleDeleteDocument = async (e: React.MouseEvent, docId: string) => {
        e.stopPropagation();
        if (!confirm("Are you sure you want to delete this document?")) return;

        try {
            const res = await fetch(`/api/documents/${docId}`, { method: "DELETE" });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to delete document");
            }

            setProject((prev: any) => ({
                ...prev,
                documents: prev.documents.filter((d: any) => d.id !== docId),
            }));

            toast.success("Document deleted successfully");
        } catch (error: any) {
            console.error("Delete error:", error);
            toast.error(error.message || "Failed to delete document");
        }
    };

    const handleRegenerateInviteCode = async () => {
        if (!confirm("Are you sure? Old invite links will stop working.")) return;

        try {
            const res = await fetch(`/api/projects/${projectId}/invite-code`, { method: "POST" });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to regenerate invite code");
            }

            const data = await res.json();
            setProject((prev: any) => ({ ...prev, inviteCode: data.inviteCode }));
            toast.success("Invite code regenerated successfully");
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const fetchProject = async () => {
        try {
            const res = await fetch(`/api/projects/${projectId}`);
            const data = await res.json();
            setProject(data);
        } catch (error) {
            console.error("Failed to load project:", error);
        }
    };

    useEffect(() => {
        const loadProject = async () => {
            try {
                const res = await fetch(`/api/projects/${projectId}`);
                const data = await res.json();
                setProject(data);
                setIsLoading(false);
            } catch (error) {
                console.error("Failed to load project:", error);
                setIsLoading(false);
            }
        };
        loadProject();
    }, [projectId]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading project...</p>
                </div>
            </div>
        );
    }

    if (!project) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-6xl mb-4">❌</div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Project not found</h2>
                    <p className="text-gray-600">The project you're looking for doesn't exist.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="bg-white border-b border-gray-200">
                <div className="container mx-auto px-4 py-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">{project.name}</h1>
                        {project.description && (
                            <p className="text-gray-600">{project.description}</p>
                        )}
                    </div>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        {project.inviteCode && (
                            <div className="flex items-center gap-2 bg-indigo-50 px-4 py-2 rounded-lg border border-indigo-100">
                                <div className="text-xs text-indigo-600 font-bold uppercase tracking-wider">Invite Code:</div>
                                <code className="text-sm font-mono font-bold text-indigo-700">{project.inviteCode}</code>
                                <button
                                    onClick={() => {
                                        const link = `${window.location.origin}/join/${project.inviteCode}`;
                                        navigator.clipboard.writeText(link);
                                        toast.success("Invite link copied to clipboard!");
                                    }}
                                    className="p-1 hover:bg-indigo-100 rounded text-indigo-600 transition"
                                    title="Copy Join Link"
                                >
                                    <Copy className="h-4 w-4" />
                                </button>
                                {isOwner && (
                                    <button
                                        onClick={handleRegenerateInviteCode}
                                        className="p-1 hover:bg-indigo-100 rounded text-indigo-600 transition"
                                        title="Regenerate Invite Code"
                                    >
                                        <RefreshCw className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                        )}
                        <div className="flex gap-2">
                            <InvitationModal projectId={projectId} />
                            {isMember && !isOwner && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-2 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                                    onClick={handleLeaveProject}
                                >
                                    <LogOut className="h-4 w-4" />
                                    Leave Project
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-6">
                <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                    <button
                        onClick={() => setActiveTab("documents")}
                        className={`px-6 py-3 rounded-lg font-semibold transition whitespace-nowrap ${activeTab === "documents"
                            ? "bg-indigo-600 text-white shadow-md"
                            : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
                            }`}
                    >
                        📄 Documents
                    </button>
                    <button
                        onClick={() => setActiveTab("chat")}
                        className={`px-6 py-3 rounded-lg font-semibold transition whitespace-nowrap ${activeTab === "chat"
                            ? "bg-indigo-600 text-white shadow-md"
                            : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
                            }`}
                    >
                        💬 Chat
                    </button>
                    <button
                        onClick={() => setActiveTab("tasks")}
                        className={`px-6 py-3 rounded-lg font-semibold transition whitespace-nowrap ${activeTab === "tasks"
                            ? "bg-indigo-600 text-white shadow-md"
                            : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
                            }`}
                    >
                        ✅ Tasks
                    </button>
                    <button
                        onClick={() => setActiveTab("team")}
                        className={`px-6 py-3 rounded-lg font-semibold transition whitespace-nowrap ${activeTab === "team"
                            ? "bg-indigo-600 text-white shadow-md"
                            : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
                            }`}
                    >
                        👥 Team
                    </button>
                    <button
                        onClick={() => setActiveTab("contributions")}
                        className={`px-6 py-3 rounded-lg font-semibold transition whitespace-nowrap ${activeTab === "contributions"
                            ? "bg-indigo-600 text-white shadow-md"
                            : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
                            }`}
                    >
                        📊 Contributions
                    </button>
                </div>

                {activeTab === "documents" && (
                    <div className="space-y-4">
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold">Project Documents</h2>
                                <CreateDocumentModal
                                    projectId={projectId}
                                    onDocumentCreated={(doc) => {
                                        setProject((prev: any) => ({
                                            ...prev,
                                            documents: [doc, ...(prev.documents || [])],
                                        }));
                                    }}
                                />
                            </div>
                            {project.documents && project.documents.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {project.documents.map((doc: any) => (
                                        <div
                                            key={doc.id}
                                            onClick={() => router.push(`/documents/${doc.id}`)}
                                            className="p-4 border rounded-lg cursor-pointer transition relative group border-gray-200 hover:bg-gray-50"
                                        >
                                            <button
                                                onClick={(e) => handleDeleteDocument(e, doc.id)}
                                                className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition opacity-0 group-hover:opacity-100"
                                                title="Delete Document"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                            <h3 className="font-semibold text-gray-900 truncate mb-1 pr-6">{doc.title}</h3>
                                            <p className="text-xs text-gray-500 mb-4">
                                                Last updated {new Date(doc.updatedAt).toLocaleDateString()}
                                            </p>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="w-full pointer-events-none"
                                            >
                                                Open Document
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    <p>No documents yet. Create your first document to get started!</p>
                                </div>
                            )}
                        </div>

                    </div>
                )}

                {activeTab === "chat" && (
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                        <div className="lg:col-span-3">
                            <ChatWindow projectId={projectId} />
                        </div>
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                            <h3 className="font-semibold mb-4 text-gray-900">Team Members</h3>
                            <div className="space-y-3">
                                {project.members && project.members.filter((m: any) => m.user).map((member: { id: string; user: { name: string | null; }; role: string; }) => (
                                    <div key={member.id} className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-semibold text-lg">
                                            {member.user.name?.charAt(0).toUpperCase() || "?"}
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-medium text-gray-900">{member.user.name || "Anonymous"}</div>
                                            <div className="text-xs text-gray-500 uppercase tracking-wider">{member.role}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === "tasks" && (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <TaskBoard projectId={projectId} />
                    </div>
                )}

                {activeTab === "team" && (
                    <div className="space-y-6">
                        {isOwner && <JoinRequestsManager projectId={projectId} onRequestProcessed={fetchProject} />}

                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-gray-900">Team Management</h2>
                            </div>
                            <TeamMemberList members={project.members} />
                        </div>
                    </div>
                )}

                {activeTab === "contributions" && (
                    <ContributionDashboard projectId={projectId} />
                )}
            </div>
        </div>
    );
}
