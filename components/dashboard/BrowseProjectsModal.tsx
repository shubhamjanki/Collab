"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, Users, FileText, MessageSquare, CheckSquare, Calendar } from "lucide-react";
import { toast } from "sonner";

interface BrowseProjectsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function BrowseProjectsModal({ isOpen, onClose }: BrowseProjectsModalProps) {
    const router = useRouter();
    const [projects, setProjects] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [filter, setFilter] = useState("");
    const [requestingJoin, setRequestingJoin] = useState<string | null>(null);
    const [requestedProjects, setRequestedProjects] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (isOpen) {
            fetchProjects();
        }
    }, [isOpen]);

    const fetchProjects = async () => {
        setIsLoading(true);
        try {
            const response = await fetch("/api/projects/browse");
            if (response.ok) {
                const data = await response.json();
                setProjects(data);
            } else {
                toast.error("Failed to load projects");
            }
        } catch (error) {
            console.error("Error fetching projects:", error);
            toast.error("Something went wrong");
        } finally {
            setIsLoading(false);
        }
    };

    const filteredProjects = projects.filter(project =>
        project.name.toLowerCase().includes(filter.toLowerCase()) ||
        project.description?.toLowerCase().includes(filter.toLowerCase())
    );

    const handleViewProject = (projectId: string) => {
        router.push(`/projects/${projectId}`);
        onClose();
    };

    const handleRequestJoin = async (projectId: string) => {
        setRequestingJoin(projectId);
        try {
            const response = await fetch(`/api/projects/${projectId}/request-join`, {
                method: "POST",
            });

            const data = await response.json();
            if (response.ok) {
                toast.success("Join request sent! Wait for admin approval.");
                setRequestedProjects(prev => new Set(prev).add(projectId));
            } else if (response.status === 400 && data.error?.includes("pending")) {
                toast.info("You already have a pending request for this project.");
                setRequestedProjects(prev => new Set(prev).add(projectId));
            } else {
                toast.error(data.error || "Failed to send join request");
            }
        } catch (error) {
            console.error("Error requesting to join:", error);
            toast.error("Something went wrong");
        } finally {
            setRequestingJoin(null);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Browse Projects</h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Discover and explore projects from other students
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition"
                    >
                        <X className="h-6 w-6 text-gray-500" />
                    </button>
                </div>

                {/* Search */}
                <div className="px-6 pt-4">
                    <input
                        type="text"
                        placeholder="Search projects..."
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                </div>

                {/* Projects List */}
                <div className="flex-1 overflow-y-auto p-6">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                        </div>
                    ) : filteredProjects.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="text-6xl mb-4">📁</div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                {filter ? "No projects found" : "No projects available"}
                            </h3>
                            <p className="text-gray-500">
                                {filter
                                    ? "Try adjusting your search"
                                    : "Check back later for new projects"}
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {filteredProjects.map((project) => {
                                const studentMembers = project.members.filter(
                                    (m: any) => m.user && m.user.role === "STUDENT"
                                );

                                return (
                                    <div
                                        key={project.id}
                                        className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex-1">
                                                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                                                    {project.name}
                                                </h3>
                                                {project.description && (
                                                    <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                                                        {project.description}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Course Badge */}
                                        {project.course && (
                                            <div className="mb-3">
                                                <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                                                    {project.course.code} - {project.course.name}
                                                </span>
                                            </div>
                                        )}

                                        {/* Stats */}
                                        <div className="grid grid-cols-4 gap-2 mb-3 text-xs text-gray-600">
                                            <div className="flex items-center gap-1">
                                                <Users className="h-3 w-3" />
                                                <span>{studentMembers.length}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <FileText className="h-3 w-3" />
                                                <span>{project._count.documents}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <MessageSquare className="h-3 w-3" />
                                                <span>{project._count.chat}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <CheckSquare className="h-3 w-3" />
                                                <span>{project._count.tasks}</span>
                                            </div>
                                        </div>

                                        {/* Team Members */}
                                        <div className="mb-3">
                                            <p className="text-xs text-gray-500 mb-1">Team Members:</p>
                                            <div className="flex flex-wrap gap-1">
                                                {studentMembers.slice(0, 3).map((member: any) => (
                                                    <span
                                                        key={member.user.id}
                                                        className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                                                    >
                                                        {member.user.name}
                                                    </span>
                                                ))}
                                                {studentMembers.length > 3 && (
                                                    <span className="inline-block px-2 py-1 text-xs text-gray-500">
                                                        +{studentMembers.length - 3} more
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Updated Date */}
                                        <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
                                            <Calendar className="h-3 w-3" />
                                            <span>
                                                Updated{" "}
                                                {new Date(project.updatedAt).toLocaleDateString("en-US", {
                                                    month: "short",
                                                    day: "numeric",
                                                })}
                                            </span>
                                        </div>

                                        {/* View Button */}
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                onClick={() => handleRequestJoin(project.id)}
                                                disabled={requestingJoin === project.id || requestedProjects.has(project.id)}
                                                className={`px-4 py-2 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${
                                                    requestedProjects.has(project.id)
                                                        ? "bg-gray-400 text-white"
                                                        : "bg-green-600 text-white hover:bg-green-700"
                                                }`}
                                            >
                                                {requestingJoin === project.id
                                                    ? "Sending..."
                                                    : requestedProjects.has(project.id)
                                                    ? "Requested"
                                                    : "Request to Join"}
                                            </button>
                                            <button
                                                onClick={() => handleViewProject(project.id)}
                                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition"
                                            >
                                                View Details
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t bg-gray-50">
                    <p className="text-sm text-gray-600 text-center">
                        Found {filteredProjects.length} project{filteredProjects.length !== 1 ? "s" : ""}
                    </p>
                </div>
            </div>
        </div>
    );
}
