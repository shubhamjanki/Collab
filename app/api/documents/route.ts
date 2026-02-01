import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { projectId, title, content } = body;

        if (!projectId || !title) {
            return NextResponse.json(
                { error: "Project ID and title are required" },
                { status: 400 }
            );
        }

        // Verify user is a member of the project
        const member = await prisma.projectMember.findUnique({
            where: {
                projectId_userId: {
                    projectId,
                    userId: session.user.id,
                },
            },
        });

        if (!member) {
            return NextResponse.json(
                { error: "You are not a member of this project" },
                { status: 403 }
            );
        }

        const document = await prisma.document.create({
            data: {
                projectId,
                title,
                content: content || "",
                authorId: session.user.id,
            },
        });

        return NextResponse.json(document, { status: 201 });
    } catch (error: any) {
        console.error("Error creating document:", error);
        return NextResponse.json(
            { error: error.message || "Failed to create document" },
            { status: 500 }
        );
    }
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const projectId = searchParams.get("projectId");

        if (!projectId) {
            return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
        }

        const documents = await prisma.document.findMany({
            where: { projectId },
            orderBy: { updatedAt: "desc" },
        });

        return NextResponse.json(documents);
    } catch (error) {
        return NextResponse.json(
            { error: "Failed to fetch documents" },
            { status: 500 }
        );
    }
}
