import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        let { id } = await params;

        // Fallback for ID extraction
        if (!id) {
            const url = new URL(request.url);
            id = url.pathname.split('/').pop() || "";
        }

        if (!id || id.length !== 24) {
            return NextResponse.json({ error: `Invalid document ID: ${id}` }, { status: 400 });
        }

        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const document = await prisma.document.findUnique({
            where: { id },
            include: {
                author: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                project: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });

        if (!document) {
            return NextResponse.json({ error: "Document not found" }, { status: 404 });
        }

        return NextResponse.json(document);
    } catch (error: any) {
        console.error("Error fetching document:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        let { id } = await params;

        // Fallback for ID extraction
        if (!id) {
            const url = new URL(request.url);
            id = url.pathname.split('/').pop() || "";
        }

        console.log(`[PATCH] Processing document ${id}`);

        if (!id || id.length !== 24) {
            return NextResponse.json({ error: `Invalid document ID: ${id}` }, { status: 400 });
        }

        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { content } = await request.json();

        if (content === undefined) {
            return NextResponse.json({ error: "Content is required" }, { status: 400 });
        }

        // Update document
        const document = await prisma.document.update({
            where: { id },
            data: {
                content,
                updatedAt: new Date(),
            },
        });

        // Save revision (Background-ish)
        try {
            await prisma.documentRevision.create({
                data: {
                    documentId: id,
                    content,
                    userId: session.user.id,
                },
            });
        } catch (revError) {
            console.error("Revision tracking failed:", revError);
        }

        // Notify real-time subscribers via Pusher if configured
        if (process.env.PUSHER_APP_ID && process.env.PUSHER_APP_ID !== "your-app-id") {
            try {
                const { pusherServer } = await import("@/lib/pusher");
                await pusherServer.trigger(`document-${id}`, "updated", {
                    userId: session.user.id,
                    content,
                    timestamp: new Date(),
                });
            } catch (pusherError) {
                console.error("Pusher update failed:", pusherError);
            }
        }

        return NextResponse.json(document);
    } catch (error: any) {
        console.error("Error updating document (PATCH):", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        let { id } = await params;

        // Fallback for ID extraction
        if (!id) {
            const url = new URL(request.url);
            id = url.pathname.split('/').pop() || "";
        }

        if (!id || id.length !== 24) {
            return NextResponse.json({ error: `Invalid document ID: ${id}` }, { status: 400 });
        }

        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // We delete revisions first manually to be safe until schema is updated
        await prisma.documentRevision.deleteMany({
            where: { documentId: id }
        });

        await prisma.document.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Error deleting document:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        let { id } = await params;

        // Fallback for ID extraction
        if (!id) {
            const url = new URL(request.url);
            id = url.pathname.split('/').pop() || "";
        }

        console.log(`[PUT] Processing document ${id}`);

        if (!id || id.length !== 24) {
            return NextResponse.json({ error: `Invalid document ID: ${id}` }, { status: 400 });
        }

        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { content } = await request.json();

        if (content === undefined) {
            return NextResponse.json({ error: "Content is required" }, { status: 400 });
        }

        // Update document
        const document = await prisma.document.update({
            where: { id },
            data: {
                content,
                updatedAt: new Date(),
            },
        });

        // Save revision (Background-ish)
        try {
            await prisma.documentRevision.create({
                data: {
                    documentId: id,
                    content,
                    userId: session.user.id,
                },
            });
        } catch (revError) {
            console.error("Revision tracking failed:", revError);
        }

        // Notify real-time subscribers via Pusher if configured
        if (process.env.PUSHER_APP_ID && process.env.PUSHER_APP_ID !== "your-app-id") {
            try {
                const { pusherServer } = await import("@/lib/pusher");
                await pusherServer.trigger(`document-${id}`, "updated", {
                    userId: session.user.id,
                    content,
                    timestamp: new Date(),
                });
            } catch (pusherError) {
                console.error("Pusher update failed:", pusherError);
            }
        }

        return NextResponse.json(document);
    } catch (error: any) {
        console.error("Error updating document (PUT):", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
