import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import ProjectCard from "@/components/dashboard/ProjectCard";
import QuickActions from "@/components/dashboard/QuickActions";
import { PendingInvitations } from "@/components/project/PendingInvitations";

export default async function DashboardPage() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        redirect("/login");
    }

    const projects = await prisma.project.findMany({
        where: {
            members: {
                some: {
                    userId: session.user.id,
                },
            },
        },
        include: {
            members: {
                include: {
                    user: {
                        select: {
                            name: true,
                            image: true,
                        },
                    },
                },
            },
            _count: {
                select: {
                    documents: true,
                    chat: true,
                },
            },
        },
        orderBy: {
            updatedAt: "desc",
        },
        take: 10,
    });

    const contributions = await prisma.contributionSnapshot.findMany({
        where: {
            userId: session.user.id,
            date: {
                gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
            },
        },
        orderBy: {
            date: "asc",
        },
    });

    const totalCharsAdded = contributions.reduce((sum: number, c: any) => sum + (c.charactersAdded || 0), 0);
    const totalEdits = contributions.reduce((sum: number, c: any) => sum + (c.documentsEdited || 0), 0);
    const totalMessages = contributions.reduce((sum: number, c: any) => sum + (c.chatMessages || 0), 0);

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="container mx-auto px-4 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Welcome back, {session.user.name || "User"}!
                    </h1>
                    <p className="text-gray-600">Here's what's happening with your projects</p>
                </div>

                <QuickActions />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                        <PendingInvitations />

                        <div>
                            <h2 className="text-xl font-semibold mb-4 text-gray-900">Your Projects</h2>
                            {projects.length === 0 ? (
                                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                                    <div className="text-6xl mb-4">📁</div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No projects yet</h3>
                                    <p className="text-gray-600 mb-4">Create your first project to get started</p>
                                </div>
                            ) : (
                                <div>
                                    {projects.map((project: any) => (
                                        <ProjectCard key={project.id} project={project} />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div>
                        <h2 className="text-xl font-semibold mb-4 text-gray-900">Your Activity (Last 7 days)</h2>

                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-4">
                            <div className="grid grid-cols-3 gap-4 text-center">
                                <div>
                                    <div className="text-2xl font-bold text-indigo-600">{totalEdits}</div>
                                    <div className="text-xs text-gray-500">Edits</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-green-600">{totalCharsAdded.toLocaleString()}</div>
                                    <div className="text-xs text-gray-500">Chars</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-purple-600">{totalMessages}</div>
                                    <div className="text-xs text-gray-500">Messages</div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <h3 className="font-semibold mb-4 text-gray-900">Daily Breakdown</h3>
                            {contributions.length === 0 ? (
                                <p className="text-gray-500 text-sm text-center py-4">No activity this week</p>
                            ) : (
                                <div className="space-y-3">
                                    {contributions.map((contribution: any) => (
                                        <div key={contribution.id}>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className="text-gray-600">
                                                    {new Date(contribution.date).toLocaleDateString("en-US", {
                                                        month: "short",
                                                        day: "numeric"
                                                    })}
                                                </span>
                                                <span className="font-semibold text-gray-900">
                                                    {(contribution.charactersAdded || 0).toLocaleString()} chars
                                                </span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div
                                                    className="bg-gradient-to-r from-indigo-600 to-purple-600 h-2 rounded-full transition-all"
                                                    style={{
                                                        width: `${Math.min(((contribution.charactersAdded || 0) / 1000) * 100, 100)}%`
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
