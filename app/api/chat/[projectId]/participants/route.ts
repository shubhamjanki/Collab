import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { listParticipants } from "@/lib/videoCallStore";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ projectId: string }> }
) {
    try {
        const { projectId } = await params;
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
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        return NextResponse.json({
            participants: listParticipants(projectId),
        });
    } catch (error) {
        console.error("Error fetching participants:", error);
        return NextResponse.json(
            { error: "Failed to fetch participants" },
            { status: 500 }
        );
    }
}
