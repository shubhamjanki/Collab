import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/faculty - List all faculty members
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const faculty = await prisma.user.findMany({
            where: {
                role: "FACULTY",
            },
            select: {
                id: true,
                name: true,
                email: true,
                image: true,
                university: true,
            },
            orderBy: {
                name: "asc",
            },
        });

        return NextResponse.json(faculty);
    } catch (error) {
        console.error("Error fetching faculty:", error);
        return NextResponse.json(
            { error: "Failed to fetch faculty" },
            { status: 500 }
        );
    }
}
