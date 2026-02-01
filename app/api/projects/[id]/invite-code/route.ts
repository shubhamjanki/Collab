import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Check if user is owner
        const membership = await prisma.projectMember.findUnique({
            where: {
                projectId_userId: {
                    projectId: id,
                    userId: session.user.id,
                },
            },
        });

        if (!membership || membership.role !== "OWNER") {
            return NextResponse.json({ error: "Only project owners can regenerate invite codes" }, { status: 403 });
        }

        const inviteCode = randomBytes(4).toString("hex");

        const project = await prisma.project.update({
            where: { id },
            data: { inviteCode },
        });

        return NextResponse.json({ inviteCode: project.inviteCode });
    } catch (error: any) {
        console.error("Error regenerating invite code:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
