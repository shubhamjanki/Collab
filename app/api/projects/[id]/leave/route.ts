import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/projects/[id]/leave - Leave a project
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: projectId } = await params;
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

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
                { status: 400 }
            );
        }

        if (membership.role === "OWNER") {
            return NextResponse.json(
                { error: "Project owners cannot leave. Transfer ownership or delete the project instead." },
                { status: 400 }
            );
        }

        await prisma.projectMember.delete({
            where: {
                projectId_userId: {
                    projectId,
                    userId: session.user.id,
                },
            },
        });

        return NextResponse.json({ message: "You have left the project" });
    } catch (error) {
        console.error("Error leaving project:", error);
        return NextResponse.json(
            { error: "Failed to leave project" },
            { status: 500 }
        );
    }
}
