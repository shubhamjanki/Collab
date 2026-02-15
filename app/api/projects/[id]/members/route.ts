import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET - Retrieve project members
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: projectId } = await params;
        const session = await getServerSession(authOptions);

        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Check if user has access to this project
        const project = await prisma.project.findFirst({
            where: {
                id: projectId,
                members: { some: { userId: session.user.id } },
            },
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
            },
        });

        if (!project) {
            return NextResponse.json({ error: "Project not found or access denied" }, { status: 404 });
        }

        // Format members data
        const members = project.members.map((member) => ({
            id: member.user?.id || "",
            name: member.user?.name || "Unknown",
            email: member.user?.email || "",
            image: member.user?.image || null,
            role: member.role,
        }));

        return NextResponse.json({ members });
    } catch (error) {
        console.error("Error fetching project members:", error);
        return NextResponse.json(
            { error: "Failed to fetch project members" },
            { status: 500 }
        );
    }
}
