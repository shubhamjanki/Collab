import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";

// PATCH /api/tasks/[id] - Update task (status, order, assignee, etc)
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        console.log(`[PATCH /api/tasks/${id}] Body:`, body);
        let { title, description, status, assignedTo, order, dueDate } = body;

        // Handle "unassigned" from frontend
        if (assignedTo === "unassigned" || assignedTo === "") {
            assignedTo = null;
        }

        const task = await prisma.task.update({
            where: { id },
            data: {
                title: title !== undefined ? title : undefined,
                description: description !== undefined ? description : undefined,
                status: status !== undefined ? status : undefined,
                assignedTo: assignedTo !== undefined ? assignedTo : undefined,
                order: order !== undefined ? order : undefined,
                dueDate: dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : undefined,
            },
            include: {
                assignee: {
                    select: {
                        id: true,
                        name: true,
                        image: true,
                    }
                }
            }
        });

        // Track contribution if task is completed
        try {
            if (status === "DONE") {
                const { trackContribution } = await import("@/lib/contributions");
                await trackContribution(session.user.id, task.projectId, "task");
            }
        } catch (contribError) {
            console.error(`[PATCH /api/tasks/${id}] Contribution tracking failed:`, contribError);
        }

        // Trigger Pusher event
        try {
            await pusherServer.trigger(`project-${task.projectId}`, "task-updated", task);
        } catch (pusherError) {
            console.error(`[PATCH /api/tasks/${id}] Pusher trigger failed:`, pusherError);
        }

        return NextResponse.json(task);
    } catch (error) {
        console.error("Error updating task:", error);
        return NextResponse.json(
            { error: "Failed to update task" },
            { status: 500 }
        );
    }
}

// DELETE /api/tasks/[id] - Delete task
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Trigger Pusher event
        // We need the projectId before deleting, but Prisma delete returns the deleted record
        const deletedTask = await prisma.task.delete({
            where: { id },
        });

        // Trigger Pusher event
        try {
            await pusherServer.trigger(`project-${deletedTask.projectId}`, "task-deleted", { id });
        } catch (pusherError) {
            console.error(`[DELETE /api/tasks/${id}] Pusher trigger failed:`, pusherError);
        }

        return NextResponse.json({ message: "Task deleted successfully" });
    } catch (error) {
        console.error("Error deleting task:", error);
        return NextResponse.json(
            { error: "Failed to delete task" },
            { status: 500 }
        );
    }
}
