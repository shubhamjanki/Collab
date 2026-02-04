import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pusherServer } from "@/lib/pusher";
import { prisma } from "@/lib/prisma";
import { addParticipant, listParticipants, removeParticipant, touchParticipant } from "@/lib/videoCallStore";

// In-memory store for signaling messages (replace with Redis in production)
const signalingStore: Map<string, any[]> = new Map();

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
        const { type, ...data } = body;
        const actorId = data.userId || data.from;
        const actorName = data.userName || data.fromName || "Participant";
        const actorPeerId = data.peerId;

        if (actorId && type === "user-joined") {
            addParticipant(projectId, actorId, actorName, actorPeerId);
        } else if (actorId && type === "user-left") {
            removeParticipant(projectId, actorId);
        } else if (actorId) {
            touchParticipant(projectId, actorId, actorName, actorPeerId);
        }

        // Try Pusher first
        if (pusherServer) {
            try {
                await pusherServer.trigger(`video-call-${projectId}`, type, data);
                if (type === "user-joined" || type === "user-left") {
                    await pusherServer.trigger(`video-call-${projectId}`, "participants-update", {
                        participants: listParticipants(projectId),
                    });
                }
            } catch (err) {
                console.error("Pusher error:", err);
            }
        }

        // Also store in memory for polling fallback
        const key = `video-call-${projectId}`;
        if (!signalingStore.has(key)) {
            signalingStore.set(key, []);
        }
        
        const messages = signalingStore.get(key)!;
        messages.push({
            type,
            data,
            timestamp: Date.now(),
        });

        // Keep only last 100 messages
        if (messages.length > 100) {
            messages.shift();
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error in video call signaling:", error);
        return NextResponse.json(
            { error: "Failed to send signal" },
            { status: 500 }
        );
    }
}

export async function GET(
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

        const { searchParams } = new URL(request.url);
        const since = parseInt(searchParams.get("since") || "0");

        const key = `video-call-${projectId}`;
        const messages = signalingStore.get(key) || [];
        
        // Return messages newer than 'since' timestamp
        const newMessages = messages.filter(m => m.timestamp > since);

        return NextResponse.json({ 
            messages: newMessages,
            timestamp: Date.now(),
        });
    } catch (error) {
        console.error("Error fetching signals:", error);
        return NextResponse.json(
            { error: "Failed to fetch signals" },
            { status: 500 }
        );
    }
}
