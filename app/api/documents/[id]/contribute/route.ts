import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { trackContribution } from "@/lib/contributions";

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

        const { changes } = await request.json();

        // Get document to find project
        const { prisma } = await import("@/lib/prisma");
        const document = await prisma.document.findUnique({
            where: { id },
            select: { projectId: true },
        });

        if (!document) {
            return NextResponse.json({ error: "Document not found" }, { status: 404 });
        }

        // Track contribution
        await trackContribution(session.user.id, document.projectId, "edit", {
            charsAdded: changes > 0 ? changes : 0,
            charsRemoved: changes < 0 ? Math.abs(changes) : 0,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error tracking contribution:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
