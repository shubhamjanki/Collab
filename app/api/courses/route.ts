import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/courses - List faculty's courses
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id || session.user.role !== "FACULTY") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const courses = await prisma.course.findMany({
            where: { facultyId: session.user.id },
            include: {
                _count: {
                    select: {
                        projects: true,
                    },
                },
                projects: {
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
                        evaluation: {
                            select: {
                                id: true,
                                status: true,
                                totalScore: true,
                                maxScore: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        return NextResponse.json(courses);
    } catch (error) {
        console.error("Error fetching courses:", error);
        return NextResponse.json(
            { error: "Failed to fetch courses" },
            { status: 500 }
        );
    }
}

// POST /api/courses - Create new course
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id || session.user.role !== "FACULTY") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { name, code, semester, year } = body;

        if (!name || !code || !semester || !year) {
            return NextResponse.json(
                { error: "Name, code, semester, and year are required" },
                { status: 400 }
            );
        }

        const course = await prisma.course.create({
            data: {
                name,
                code,
                semester,
                year: parseInt(year.toString()),
                facultyId: session.user.id,
            },
        });

        return NextResponse.json(course, { status: 201 });
    } catch (error) {
        console.error("Error creating course:", error);
        return NextResponse.json(
            { error: "Failed to create course" },
            { status: 500 }
        );
    }
}
