import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/projects/[id]/request-join - Request to join a project
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id: projectId } = await params;

        // Check if user is already a member
        const existingMember = await prisma.projectMember.findUnique({
            where: {
                projectId_userId: {
                    projectId,
                    userId: session.user.id,
                },
            },
        });

        if (existingMember) {
            return NextResponse.json(
                { error: "You are already a member of this project" },
                { status: 400 }
            );
        }

        // Check if there's already a pending request
        const existingRequest = await prisma.invitation.findFirst({
            where: {
                projectId,
                email: session.user.email!,
                status: "PENDING",
            },
        });

        if (existingRequest) {
            return NextResponse.json(
                { error: "You already have a pending request for this project" },
                { status: 400 }
            );
        }

        // Get project owner to send the request to
        const projectOwner = await prisma.projectMember.findFirst({
            where: {
                projectId,
                role: "OWNER",
            },
        });

        if (!projectOwner) {
            return NextResponse.json(
                { error: "Project owner not found" },
                { status: 404 }
            );
        }

        // Create invitation/join request
        const invitation = await prisma.invitation.create({
            data: {
                projectId,
                email: session.user.email!,
                role: "MEMBER",
                status: "PENDING",
                invitedBy: session.user.id, // Self-initiated request
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
            },
        });

        return NextResponse.json({ 
            message: "Join request sent successfully",
            invitation 
        });
    } catch (error) {
        console.error("Error creating join request:", error);
        return NextResponse.json(
            { error: "Failed to send join request" },
            { status: 500 }
        );
    }
}
