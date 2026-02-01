"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { JoinProjectModal } from "./JoinProjectModal";

export default function QuickActions() {
    const router = useRouter();
    const [isCreating, setIsCreating] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [projectName, setProjectName] = useState("");
    const [projectDescription, setProjectDescription] = useState("");

    const handleCreateProject = async () => {
        if (!projectName.trim()) return;

        setIsCreating(true);
        try {
            const response = await fetch("/api/projects", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name: projectName,
                    description: projectDescription,
                    isPublic: false,
                }),
            });

            if (response.ok) {
                const project = await response.json();
                router.push(`/projects/${project.id}`);
                router.refresh();
            }
        } catch (error) {
            console.error("Failed to create project:", error);
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow"
                >
                    <div className="text-3xl mb-2">+</div>
                    <div className="font-semibold">New Project</div>
                    <div className="text-sm opacity-90">Start collaborating</div>
                </button>

                <button className="bg-white border-2 border-dashed border-gray-300 p-6 rounded-lg hover:border-indigo-400 transition-colors">
                    <div className="text-3xl mb-2">📁</div>
                    <div className="font-semibold text-gray-700">Browse Projects</div>
                    <div className="text-sm text-gray-500">Discover public projects</div>
                </button>

                <JoinProjectModal />
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                        <h2 className="text-2xl font-bold mb-4">Create New Project</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Project Name
                                </label>
                                <input
                                    type="text"
                                    value={projectName}
                                    onChange={(e) => setProjectName(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    placeholder="My Awesome Project"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Description (Optional)
                                </label>
                                <textarea
                                    value={projectDescription}
                                    onChange={(e) => setProjectDescription(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    rows={3}
                                    placeholder="What's this project about?"
                                />
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={handleCreateProject}
                                    disabled={isCreating || !projectName.trim()}
                                    className="flex-1 bg-indigo-600 text-white py-2 rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isCreating ? "Creating..." : "Create Project"}
                                </button>
                                <button
                                    onClick={() => {
                                        setShowModal(false);
                                        setProjectName("");
                                        setProjectDescription("");
                                    }}
                                    className="px-6 py-2 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
