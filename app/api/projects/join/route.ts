import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { inviteCode } = await request.json();

        if (!inviteCode) {
            return NextResponse.json({ error: "Invite code is required" }, { status: 400 });
        }

        // Find project by invite code
        const project = await prisma.project.findUnique({
            where: { inviteCode },
            include: {
                members: {
                    where: { userId: session.user.id }
                }
            }
        });

        if (!project) {
            return NextResponse.json({ error: "Invalid invite code" }, { status: 404 });
        }

        // Check if user is already a member
        if (project.members.length > 0) {
            return NextResponse.json({
                error: "You are already a member of this project",
                projectId: project.id
            }, { status: 400 });
        }

        // Join the project
        const member = await prisma.projectMember.create({
            data: {
                projectId: project.id,
                userId: session.user.id,
                role: "MEMBER",
            },
        });

        return NextResponse.json({
            success: true,
            projectId: project.id,
            projectName: project.name
        });
    } catch (error: any) {
        console.error("Error joining project:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
