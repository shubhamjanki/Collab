import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/invitations - List user's pending invitations
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const projectId = searchParams.get("projectId");

        // Get invitations sent to user's email
        const invitations = await prisma.invitation.findMany({
            where: {
                email: session.user.email,
                status: "PENDING",
                expiresAt: {
                    gt: new Date(), // Not expired
                },
                ...(projectId ? { projectId } : {}),
            },
            include: {
                project: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                    },
                },
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

        return NextResponse.json(invitations);
    } catch (error) {
        console.error("Error fetching invitations:", error);
        return NextResponse.json(
            { error: "Failed to fetch invitations" },
            { status: 500 }
        );
    }
}

// POST /api/invitations - Create new invitation
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { projectId, email, role = "MEMBER" } = body;

        if (!projectId || !email) {
            return NextResponse.json(
                { error: "Project ID and email are required" },
                { status: 400 }
            );
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json(
                { error: "Invalid email format" },
                { status: 400 }
            );
        }

        // Check if user is a member of the project
        const membership = await prisma.projectMember.findUnique({
            where: {
                projectId_userId: {
                    projectId,
                    userId: session.user.id,
                },
            },
        });

        if (!membership) {
            return NextResponse.json(
                { error: "You are not a member of this project" },
                { status: 403 }
            );
        }

        // Only OWNER and ADMIN can invite
        if (membership.role !== "OWNER" && membership.role !== "ADMIN") {
            return NextResponse.json(
                { error: "Only project owners and admins can invite members" },
                { status: 403 }
            );
        }

        // Check if user is already a member
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            const existingMember = await prisma.projectMember.findUnique({
                where: {
                    projectId_userId: {
                        projectId,
                        userId: existingUser.id,
                    },
                },
            });

            if (existingMember) {
                return NextResponse.json(
                    { error: "User is already a member of this project" },
                    { status: 400 }
                );
            }
        }

        // Check for existing pending invitation
        const existingInvitation = await prisma.invitation.findFirst({
            where: {
                projectId,
                email,
                status: "PENDING",
                expiresAt: {
                    gt: new Date(),
                },
            },
        });

        if (existingInvitation) {
            return NextResponse.json(
                { error: "An invitation has already been sent to this email" },
                { status: 400 }
            );
        }

        // Create invitation (expires in 7 days)
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        const invitation = await prisma.invitation.create({
            data: {
                projectId,
                email,
                role,
                invitedBy: session.user.id,
                expiresAt,
            },
            include: {
                project: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                    },
                },
                inviter: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });

        // TODO: Send email notification
        // await sendInvitationEmail(email, invitation);

        return NextResponse.json(invitation, { status: 201 });
    } catch (error) {
        console.error("Error creating invitation:", error);
        return NextResponse.json(
            { error: "Failed to create invitation" },
            { status: 500 }
        );
    }
}
