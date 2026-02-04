import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PATCH /api/projects/[id]/join-requests/[requestId] - Approve or reject join request
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; requestId: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id: projectId, requestId } = await params;
        const { action } = await request.json(); // "approve" or "reject"

        // Check if user is owner/admin of the project
        const member = await prisma.projectMember.findUnique({
            where: {
                projectId_userId: {
                    projectId,
                    userId: session.user.id,
                },
            },
        });

        if (!member || (member.role !== "OWNER" && member.role !== "ADMIN")) {
            return NextResponse.json(
                { error: "Only project owners/admins can manage join requests" },
                { status: 403 }
            );
        }

        // Find the invitation/join request
        const invitation = await prisma.invitation.findUnique({
            where: { id: requestId },
        });

        if (!invitation || invitation.projectId !== projectId) {
            return NextResponse.json(
                { error: "Join request not found" },
                { status: 404 }
            );
        }

        if (invitation.status !== "PENDING") {
            return NextResponse.json(
                { error: "This request has already been processed" },
                { status: 400 }
            );
        }

        if (action === "reject") {
            const updated = await prisma.invitation.update({
                where: { id: requestId },
                data: { status: "REJECTED" },
            });
            return NextResponse.json({ 
                message: "Join request rejected",
                invitation: updated 
            });
        }

        if (action === "approve") {
            // Find the user who requested to join
            const user = await prisma.user.findUnique({
                where: { email: invitation.email },
            });

            if (!user) {
                return NextResponse.json(
                    { error: "User not found" },
                    { status: 404 }
                );
            }

            // Check if already a member
            const existingMember = await prisma.projectMember.findUnique({
                where: {
                    projectId_userId: {
                        projectId,
                        userId: user.id,
                    },
                },
            });

            if (existingMember) {
                await prisma.invitation.update({
                    where: { id: requestId },
                    data: { status: "ACCEPTED" },
                });
                return NextResponse.json({
                    message: "User is already a member",
                });
            }

            // Add user to project
            const [newMember, updatedInvitation] = await prisma.$transaction([
                prisma.projectMember.create({
                    data: {
                        projectId,
                        userId: user.id,
                        role: invitation.role,
                    },
                }),
                prisma.invitation.update({
                    where: { id: requestId },
                    data: { status: "ACCEPTED" },
                }),
            ]);

            return NextResponse.json({
                message: "Join request approved successfully",
                member: newMember,
                invitation: updatedInvitation,
            });
        }

        return NextResponse.json(
            { error: "Invalid action" },
            { status: 400 }
        );
    } catch (error) {
        console.error("Error processing join request:", error);
        return NextResponse.json(
            { error: "Failed to process join request" },
            { status: 500 }
        );
    }
}
