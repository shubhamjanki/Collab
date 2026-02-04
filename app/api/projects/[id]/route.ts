import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const project = await prisma.project.findUnique({
            where: { id },
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
                documents: {
                    select: {
                        id: true,
                        title: true,
                        content: true,
                        createdAt: true,
                        updatedAt: true,
                        author: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                    orderBy: {
                        updatedAt: "desc",
                    },
                },
                _count: {
                    select: {
                        documents: true,
                        chat: true,
                    },
                },
            },
        });

        if (!project) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        // Lazy migration: Generate inviteCode if missing
        if (!project.inviteCode) {
            const inviteCode = randomBytes(4).toString("hex");
            await prisma.project.update({
                where: { id },
                data: { inviteCode }
            });
            project.inviteCode = inviteCode;
        }

        // Filter out members with null users
        const cleanedProject = {
            ...project,
            members: project.members.filter(member => member.user),
            documents: project.documents ? project.documents.filter(doc => doc.author) : [],
        };

        // Check if user is a member
        const isMember = cleanedProject.members.some((m: any) => m.userId === session.user.id);
        if (!isMember && !project.isPublic) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        return NextResponse.json(cleanedProject);
    } catch (error) {
        console.error("Error fetching project:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { name, description, isPublic } = await request.json();

        // Check if user is owner
        const membership = await prisma.projectMember.findUnique({
            where: {
                projectId_userId: {
                    projectId: id,
                    userId: session.user.id,
                },
            },
        });

        if (!membership || membership.role !== "OWNER") {
            return NextResponse.json({ error: "Only project owners can update project settings" }, { status: 403 });
        }

        const project = await prisma.project.update({
            where: { id },
            data: {
                name: name?.trim(),
                description: description?.trim(),
                isPublic,
            },
        });

        return NextResponse.json(project);
    } catch (error) {
        console.error("Error updating project:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Check if user is owner
        const membership = await prisma.projectMember.findUnique({
            where: {
                projectId_userId: {
                    projectId: id,
                    userId: session.user.id,
                },
            },
        });

        if (!membership || membership.role !== "OWNER") {
            return NextResponse.json({ error: "Only project owners can delete projects" }, { status: 403 });
        }

        await prisma.project.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting project:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
