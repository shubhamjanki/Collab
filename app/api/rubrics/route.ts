import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/rubrics - List rubrics
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const courseId = searchParams.get("courseId");

        const rubrics = await prisma.rubric.findMany({
            where: {
                OR: [
                    { createdBy: session.user.id },
                    { courseId: courseId || undefined },
                ],
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        return NextResponse.json(rubrics);
    } catch (error) {
        console.error("Error fetching rubrics:", error);
        return NextResponse.json(
            { error: "Failed to fetch rubrics" },
            { status: 500 }
        );
    }
}

// POST /api/rubrics - Create new rubric
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id || session.user.role !== "FACULTY") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { name, courseId, criteria } = body;

        if (!name || !criteria || !Array.isArray(criteria)) {
            return NextResponse.json(
                { error: "Name and criteria array are required" },
                { status: 400 }
            );
        }

        const rubric = await prisma.rubric.create({
            data: {
                name,
                courseId,
                criteria,
                createdBy: session.user.id,
            },
        });

        return NextResponse.json(rubric, { status: 201 });
    } catch (error) {
        console.error("Error creating rubric:", error);
        return NextResponse.json(
            { error: "Failed to create rubric" },
            { status: 500 }
        );
    }
}
