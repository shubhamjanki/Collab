import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Pusher from "pusher";
import { trackContribution } from "@/lib/contributions";

// Initialize Pusher server if configured
const pusherConfigured =
    process.env.PUSHER_APP_ID &&
    process.env.PUSHER_KEY &&
    process.env.PUSHER_SECRET &&
    process.env.PUSHER_CLUSTER;

const pusher = pusherConfigured
    ? new Pusher({
          appId: process.env.PUSHER_APP_ID!,
          key: process.env.PUSHER_KEY!,
          secret: process.env.PUSHER_SECRET!,
          cluster: process.env.PUSHER_CLUSTER!,
          useTLS: true,
      })
    : null;

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

        const messages = await prisma.chatMessage.findMany({
            where: { projectId },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        image: true,
                    },
                },
            },
            orderBy: {
                createdAt: "asc",
            },
            take: 100, // Limit to last 100 messages
        });

        return NextResponse.json(messages);
    } catch (error) {
        console.error("Error fetching messages:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

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

        const { content } = await request.json();

        if (!content || !content.trim()) {
            return NextResponse.json({ error: "Message content is required" }, { status: 400 });
        }

        // Create message
        const message = await prisma.chatMessage.create({
            data: {
                content: content.trim(),
                projectId: projectId,
                userId: session.user.id,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        image: true,
                    },
                },
            },
        });

        // Track contribution
        await trackContribution(session.user.id, projectId, "chat");

        // Broadcast to Pusher
        if (pusher) {
            try {
                await pusher.trigger(`project-${projectId}`, "new-message", message);
            } catch (error) {
                console.error("Pusher new-message trigger failed:", error);
            }
        }

        return NextResponse.json(message);
    } catch (error) {
        console.error("Error creating message:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string }> }
) {
    try {
        const { projectId } = await params;
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        let messageId = searchParams.get("messageId");
        if (!messageId) {
            try {
                const body = await request.json();
                if (typeof body?.messageId === "string") {
                    messageId = body.messageId;
                }
            } catch {
                // Ignore malformed/empty JSON body
            }
        }

        if (!messageId) {
            return NextResponse.json({ error: "Message ID is required" }, { status: 400 });
        }

        if (!/^[a-fA-F0-9]{24}$/.test(messageId)) {
            return NextResponse.json({ error: "Invalid message ID" }, { status: 400 });
        }

        const existing = await prisma.chatMessage.findUnique({
            where: { id: messageId },
            select: { id: true, userId: true, projectId: true },
        });

        if (!existing || existing.projectId !== projectId) {
            return NextResponse.json({ error: "Message not found" }, { status: 404 });
        }

        if (existing.userId !== session.user.id) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await prisma.chatMessage.delete({
            where: { id: messageId },
        });

        if (pusher) {
            try {
                await pusher.trigger(`project-${projectId}`, "delete-message", { id: messageId });
            } catch (error) {
                console.error("Pusher delete-message trigger failed:", error);
            }
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("Error deleting message:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
