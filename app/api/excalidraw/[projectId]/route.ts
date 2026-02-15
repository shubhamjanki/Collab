import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { pusherServer } from "@/lib/pusher";

// GET - Retrieve Excalidraw data for a project
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string }> }
) {
    try {
        const session = await getServerSession();

        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { projectId } = await params;

        // Check if user has access to this project
        const project = await prisma.project.findFirst({
            where: {
                id: projectId,
                members: { some: { userId: session.user.id } },
            },
        });

        if (!project) {
            return NextResponse.json({ error: "Project not found or access denied" }, { status: 404 });
        }

        // Get Excalidraw data
        const excalidrawData = await prisma.excalidrawData.findUnique({
            where: { projectId },
        });

        if (!excalidrawData) {
            return NextResponse.json({ elements: [], appState: {} }, { status: 200 });
        }

        return NextResponse.json({
            elements: excalidrawData.elements,
            appState: excalidrawData.appState,
        });
    } catch (error) {
        console.error("Error fetching Excalidraw data:", error);
        return NextResponse.json(
            { error: "Failed to fetch Excalidraw data" },
            { status: 500 }
        );
    }
}

// POST - Save Excalidraw data for a project
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string }> }
) {
    try {
        const session = await getServerSession();

        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { projectId } = await params;
        const body = await request.json();
        const { elements, appState } = body;

        console.log(`📥 API: Saving ${elements?.length || 0} elements for project ${projectId}`);

        // Check if user has access to this project
        const project = await prisma.project.findFirst({
            where: {
                id: projectId,
                members: { some: { userId: session.user.id } },
            },
        });

        if (!project) {
            return NextResponse.json({ error: "Project not found or access denied" }, { status: 404 });
        }

        // Upsert Excalidraw data
        const excalidrawData = await prisma.excalidrawData.upsert({
            where: { projectId },
            update: {
                elements,
                appState,
                updatedAt: new Date(),
            },
            create: {
                projectId,
                elements,
                appState,
            },
        });

        // Broadcast the update via Pusher for real-time sync
        if (pusherServer) {
            console.log(`🔴 Broadcasting to Pusher channel: project-${projectId}`);
            await pusherServer.trigger(
                `project-${projectId}`,
                "excalidraw-update",
                {
                    elements,
                    appState,
                    userId: session.user.id,
                }
            );
            console.log(`✅ Pusher broadcast successful`);
        } else {
            console.log("⚠️ Pusher not configured, skipping broadcast");
        }

        return NextResponse.json({
            success: true,
            data: excalidrawData,
        });
    } catch (error) {
        console.error("Error saving Excalidraw data:", error);
        return NextResponse.json(
            { error: "Failed to save Excalidraw data" },
            { status: 500 }
        );
    }
}
