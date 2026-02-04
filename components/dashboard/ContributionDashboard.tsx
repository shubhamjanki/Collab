"use client";

import { useEffect, useState } from "react";

interface ContributionData {
    user: {
        id: string;
        name: string | null;
        email: string;
    };
    editsCount: number;
    charactersAdded: number;
    charactersRemoved: number;
    contributionPercentage: number;
    characterPercentage: number;
}

interface ContributionDashboardProps {
    projectId: string;
}

export default function ContributionDashboard({ projectId }: ContributionDashboardProps) {
    const [contributions, setContributions] = useState<ContributionData[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetch(`/api/projects/${projectId}/contributions`)
            .then((res) => res.json())
            .then((data) => {
                // Filter out any contributions with null users
                const validContributions = data.filter((c: ContributionData) => c && c.user);
                setContributions(validContributions);
                setIsLoading(false);
            })
            .catch((error) => {
                console.error("Failed to load contributions:", error);
                setIsLoading(false);
            });
    }, [projectId]);

    if (isLoading) {
        return (
            <div className="border border-gray-200 rounded-lg p-6 bg-white shadow-sm">
                <div className="animate-pulse">
                    <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                    <div className="space-y-3">
                        <div className="h-4 bg-gray-200 rounded"></div>
                        <div className="h-4 bg-gray-200 rounded"></div>
                        <div className="h-4 bg-gray-200 rounded"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="border border-gray-200 rounded-lg bg-white shadow-sm">
            <div className="bg-gradient-to-r from-green-600 to-teal-600 text-white px-6 py-4 rounded-t-lg">
                <h3 className="text-lg font-semibold">Team Contributions</h3>
                <p className="text-sm opacity-90">Track individual contributions to the project</p>
            </div>

            <div className="p-6">
                {contributions.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                        No contributions yet. Start collaborating!
                    </div>
                ) : (
                    <div className="space-y-4">
                        {contributions.map((contrib) => (
                            <div key={contrib.user.id} className="border-b border-gray-100 pb-4 last:border-0">
                                <div className="flex items-center justify-between mb-2">
                                    <div>
                                        <h4 className="font-semibold text-gray-900">
                                            {contrib.user.name || "Anonymous"}
                                        </h4>
                                        <p className="text-sm text-gray-500">{contrib.user.email}</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-2xl font-bold text-indigo-600">
                                            {contrib.contributionPercentage}%
                                        </div>
                                        <div className="text-xs text-gray-500">of total edits</div>
                                    </div>
                                </div>

                                {/* Progress bar */}
                                <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                                    <div
                                        className="bg-gradient-to-r from-indigo-600 to-purple-600 h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${contrib.contributionPercentage}%` }}
                                    ></div>
                                </div>

                                {/* Stats */}
                                <div className="grid grid-cols-3 gap-4 text-sm">
                                    <div className="text-center">
                                        <div className="font-semibold text-gray-900">{contrib.editsCount}</div>
                                        <div className="text-gray-500">Edits</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="font-semibold text-green-600">
                                            +{contrib.charactersAdded.toLocaleString()}
                                        </div>
                                        <div className="text-gray-500">Chars Added</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="font-semibold text-red-600">
                                            -{contrib.charactersRemoved.toLocaleString()}
                                        </div>
                                        <div className="text-gray-500">Chars Removed</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
