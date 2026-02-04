import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/projects/[id]/join-requests - Get pending join requests for a project
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id: projectId } = await params;

        // Check if user is owner or admin of the project
        const membership = await prisma.projectMember.findUnique({
            where: {
                projectId_userId: {
                    projectId,
                    userId: session.user.id,
                },
            },
        });

        if (!membership || (membership.role !== "OWNER" && membership.role !== "ADMIN")) {
            return NextResponse.json(
                { error: "Only project owners and admins can view join requests" },
                { status: 403 }
            );
        }

        // Fetch pending join requests (invitations where invitedBy is the same as email - self-initiated)
        const joinRequests = await prisma.invitation.findMany({
            where: {
                projectId,
                status: "PENDING",
            },
            include: {
                inviter: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        image: true,
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        return NextResponse.json(joinRequests);
    } catch (error) {
        console.error("Error fetching join requests:", error);
        return NextResponse.json(
            { error: "Failed to fetch join requests" },
            { status: 500 }
        );
    }
}
