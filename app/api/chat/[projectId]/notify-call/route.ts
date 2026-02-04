import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pusherServer } from "@/lib/pusher";
import { prisma } from "@/lib/prisma";

export async function POST(
    request: NextRequest,
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

        const body = await request.json();
        const userName = body?.userName || session.user.name || "Team member";
        const userId = body?.userId || session.user.id;

        // Broadcast video call notification
        if (pusherServer) {
            try {
                await pusherServer.trigger(`project-${projectId}`, "video-call-started", {
                    userName,
                    userId,
                });
            } catch (err) {
                console.error("Pusher error:", err);
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error sending video call notification:", error);
        return NextResponse.json(
            { error: "Failed to send notification" },
            { status: 500 }
        );
    }
}
