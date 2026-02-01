import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/evaluations - List evaluations for faculty or student
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const projectId = searchParams.get("projectId");

        // Faculty sees all, Students only see their project
        const evaluations = await prisma.evaluation.findMany({
            where: {
                ...(projectId ? { projectId } : {}),
                ...(session.user.role === "STUDENT"
                    ? {
                        project: {
                            members: {
                                some: {
                                    userId: session.user.id,
                                },
                            },
                        },
                        status: "PUBLISHED", // Students only see published ones
                    }
                    : {
                        evaluatorId: session.user.id,
                    }),
            },
            include: {
                project: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                evaluator: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                rubric: true,
            },
        });

        return NextResponse.json(evaluations);
    } catch (error) {
        console.error("Error fetching evaluations:", error);
        return NextResponse.json(
            { error: "Failed to fetch evaluations" },
            { status: 500 }
        );
    }
}

// POST /api/evaluations - Create or update evaluation
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id || session.user.role !== "FACULTY") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const {
            projectId,
            rubricId,
            scores,
            totalScore,
            maxScore,
            feedback,
            individualScores,
            status = "DRAFT",
        } = body;

        if (!projectId || totalScore === undefined || maxScore === undefined) {
            return NextResponse.json(
                { error: "Project ID, total score, and max score are required" },
                { status: 400 }
            );
        }

        const evaluation = await prisma.evaluation.upsert({
            where: { projectId },
            update: {
                rubricId,
                scores,
                totalScore,
                maxScore,
                feedback,
                individualScores,
                status,
                submittedAt: status === "SUBMITTED" || status === "PUBLISHED" ? new Date() : undefined,
            },
            create: {
                projectId,
                evaluatorId: session.user.id,
                rubricId,
                scores,
                totalScore,
                maxScore,
                feedback,
                individualScores,
                status,
                submittedAt: status === "SUBMITTED" || status === "PUBLISHED" ? new Date() : undefined,
            },
        });

        return NextResponse.json(evaluation);
    } catch (error) {
        console.error("Error creating evaluation:", error);
        return NextResponse.json(
            { error: "Failed to save evaluation" },
            { status: 500 }
        );
    }
}
