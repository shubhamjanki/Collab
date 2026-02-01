import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PATCH /api/invitations/:id - Accept or reject invitation
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { action } = body; // "accept" or "reject"

        if (!action || !["accept", "reject"].includes(action)) {
            return NextResponse.json(
                { error: "Action must be 'accept' or 'reject'" },
                { status: 400 }
            );
        }

        // Find invitation
        const invitation = await prisma.invitation.findUnique({
            where: { id },
            include: {
                project: true,
            },
        });

        if (!invitation) {
            return NextResponse.json(
                { error: "Invitation not found" },
                { status: 404 }
            );
        }

        // Verify invitation is for this user
        if (invitation.email !== session.user.email) {
            return NextResponse.json(
                { error: "This invitation is not for you" },
                { status: 403 }
            );
        }

        // Check if invitation is still valid
        if (invitation.status !== "PENDING") {
            return NextResponse.json(
                { error: "This invitation has already been processed" },
                { status: 400 }
            );
        }

        if (new Date() > invitation.expiresAt) {
            // Mark as expired
            await prisma.invitation.update({
                where: { id },
                data: { status: "EXPIRED" },
            });
            return NextResponse.json(
                { error: "This invitation has expired" },
                { status: 400 }
            );
        }

        if (action === "reject") {
            // Simply mark as rejected
            const updated = await prisma.invitation.update({
                where: { id },
                data: { status: "REJECTED" },
            });
            return NextResponse.json(updated);
        }

        // Accept invitation
        // Find or create user
        let user = await prisma.user.findUnique({
            where: { email: session.user.email },
        });

        if (!user) {
            return NextResponse.json(
                { error: "User account not found" },
                { status: 404 }
            );
        }

        // Check if already a member
        const existingMember = await prisma.projectMember.findUnique({
            where: {
                projectId_userId: {
                    projectId: invitation.projectId,
                    userId: user.id,
                },
            },
        });

        if (existingMember) {
            // Already a member, just mark invitation as accepted
            await prisma.invitation.update({
                where: { id },
                data: { status: "ACCEPTED" },
            });
            return NextResponse.json({
                message: "You are already a member of this project",
            });
        }

        // Add user to project and mark invitation as accepted
        const [member, updatedInvitation] = await prisma.$transaction([
            prisma.projectMember.create({
                data: {
                    projectId: invitation.projectId,
                    userId: user.id,
                    role: invitation.role,
                },
            }),
            prisma.invitation.update({
                where: { id },
                data: { status: "ACCEPTED" },
            }),
        ]);

        return NextResponse.json({
            message: "Invitation accepted successfully",
            member,
            invitation: updatedInvitation,
        });
    } catch (error) {
        console.error("Error processing invitation:", error);
        return NextResponse.json(
            { error: "Failed to process invitation" },
            { status: 500 }
        );
    }
}

// DELETE /api/invitations/:id - Cancel invitation (sender only)
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Find invitation
        const invitation = await prisma.invitation.findUnique({
            where: { id },
        });

        if (!invitation) {
            return NextResponse.json(
                { error: "Invitation not found" },
                { status: 404 }
            );
        }

        // Verify user is the sender
        if (invitation.invitedBy !== session.user.id) {
            return NextResponse.json(
                { error: "You can only cancel invitations you sent" },
                { status: 403 }
            );
        }

        // Delete invitation
        await prisma.invitation.delete({
            where: { id },
        });

        return NextResponse.json({ message: "Invitation cancelled successfully" });
    } catch (error) {
        console.error("Error deleting invitation:", error);
        return NextResponse.json(
            { error: "Failed to cancel invitation" },
            { status: 500 }
        );
    }
}
