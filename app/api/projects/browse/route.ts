import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/projects/browse - Get all public projects or all projects for browsing
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const projects = await prisma.project.findMany({
            include: {
                members: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                image: true,
                                role: true,
                            },
                        },
                    },
                },
                course: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                    },
                },
                _count: {
                    select: {
                        documents: true,
                        chat: true,
                        tasks: true,
                    },
                },
            },
            orderBy: {
                updatedAt: "desc",
            },
        });

        // Filter out projects where the current user is already a member
        const availableProjects = projects
            .map(project => ({
                ...project,
                members: project.members.filter(member => member.user),
            }))
            .filter(project => 
                !project.members.some(member => member.userId === session.user.id)
            );

        return NextResponse.json(availableProjects);
    } catch (error) {
        console.error("Error fetching projects:", error);
        return NextResponse.json(
            { error: "Failed to fetch projects" },
            { status: 500 }
        );
    }
}
