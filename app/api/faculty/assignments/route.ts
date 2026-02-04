import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/faculty/assignments - Get projects assigned to faculty for evaluation
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id || session.user.role !== "FACULTY") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get all evaluations (both assigned and completed) for this faculty
        const evaluations = await prisma.evaluation.findMany({
            where: {
                evaluatorId: session.user.id,
            },
            include: {
                project: {
                    include: {
                        members: {
                            include: {
                                user: {
                                    select: {
                                        id: true,
                                        name: true,
                                        email: true,
                                        image: true,
                                    },
                                },
                            },
                        },
                        course: {
                            select: {
                                id: true,
                                name: true,
                                code: true,
                            },
                        },
                    },
                },
                rubric: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        return NextResponse.json(evaluations);
    } catch (error) {
        console.error("Error fetching faculty assignments:", error);
        return NextResponse.json(
            { error: "Failed to fetch assignments" },
            { status: 500 }
        );
    }
}
