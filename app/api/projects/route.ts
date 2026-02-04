import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/projects - List user's projects
export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
                            id: true,
                            name: true,
                            email: true,
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
    });

    // Filter out members with null users
    const cleanedProjects = projects.map(project => ({
        ...project,
        members: project.members.filter(member => member.user),
    }));

    return NextResponse.json(cleanedProjects);
}

import { randomBytes } from "crypto";

// POST /api/projects - Create new project
export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, description, isPublic, evaluatorId } = await request.json();

    if (!name || name.trim().length === 0) {
        return NextResponse.json({ error: "Project name is required" }, { status: 400 });
    }

    const inviteCode = randomBytes(4).toString("hex");

    const project = await prisma.project.create({
        data: {
            name: name.trim(),
            description: description?.trim() || null,
            isPublic: isPublic || false,
            inviteCode,
            members: {
                create: {
                    userId: session.user.id,
                    role: "OWNER",
                },
            },
        },
        include: {
            members: {
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            image: true,
                        },
                    },
                },
            },
        },
    });

    // Create evaluation record if evaluator is assigned
    if (evaluatorId) {
        await prisma.evaluation.create({
            data: {
                projectId: project.id,
                evaluatorId: evaluatorId,
                scores: {},
                totalScore: 0,
                maxScore: 100,
                status: "DRAFT",
            },
        });
    }

    return NextResponse.json(project);
}
