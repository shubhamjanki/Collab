import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";

// GET /api/tasks - List tasks for a project
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const projectId = searchParams.get("projectId");

        if (!projectId) {
            return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
        }

        const tasks = await prisma.task.findMany({
            where: { projectId },
            include: {
                assignee: {
                    select: {
                        id: true,
                        name: true,
                        image: true,
                    },
                },
                creator: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
            orderBy: {
                order: "asc",
            },
        });

        return NextResponse.json(tasks);
    } catch (error) {
        console.error("Error fetching tasks:", error);
        return NextResponse.json(
            { error: "Failed to fetch tasks" },
            { status: 500 }
        );
    }
}

// POST /api/tasks - Create new task
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        console.log("[POST /api/tasks] Body:", body);
        let { projectId, title, description, status, assignedTo, dueDate } = body;

        // Handle "unassigned" from frontend
        if (assignedTo === "unassigned" || !assignedTo) {
            assignedTo = null;
        }

        if (!projectId || !title) {
            return NextResponse.json(
                { error: "Project ID and title are required" },
                { status: 400 }
            );
        }

        const taskStatus = status || "TODO";

        // Get max order to append
        const lastTask = await prisma.task.findFirst({
            where: { projectId, status: taskStatus },
            orderBy: { order: "desc" },
        });

        const task = await prisma.task.create({
            data: {
                projectId,
                title,
                description,
                status: status || "TODO",
                assignedTo,
                createdBy: session.user.id,
                order: (lastTask?.order || 0) + 1,
                dueDate: dueDate ? new Date(dueDate) : null,
            },
            include: {
                assignee: {
                    select: {
                        id: true,
                        name: true,
                        image: true,
                    },
                },
            },
        });

        // Track contribution
        try {
            const { trackContribution } = await import("@/lib/contributions");
            await trackContribution(session.user.id, projectId, "task");
        } catch (contribError) {
            console.error("[POST /api/tasks] Contribution tracking failed:", contribError);
        }

        // Trigger Pusher event
        try {
            if (pusherServer) {
                await pusherServer.trigger(`project-${projectId}`, "task-created", task);
            }
        } catch (pusherError) {
            console.error("[POST /api/tasks] Pusher trigger failed:", pusherError);
        }

        return NextResponse.json(task, { status: 201 });
    } catch (error) {
        console.error("Error creating task:", error);
        return NextResponse.json(
            { error: "Failed to create task" },
            { status: 500 }
        );
    }
}
