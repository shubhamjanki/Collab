import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/documents/[id]/history - Get edit history for a document
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Verify user has access to the document's project
        const document = await prisma.document.findUnique({
            where: { id },
            include: {
                project: {
                    include: {
                        members: {
                            where: {
                                userId: session.user.id,
                            },
                        },
                    },
                },
            },
        });

        if (!document) {
            return NextResponse.json({ error: "Document not found" }, { status: 404 });
        }

        if (document.project.members.length === 0) {
            return NextResponse.json(
                { error: "You don't have access to this document" },
                { status: 403 }
            );
        }

        // Fetch revision history
        const revisions = await prisma.documentRevision.findMany({
            where: {
                documentId: id,
            },
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
            orderBy: {
                createdAt: "desc",
            },
            take: 50, // Limit to last 50 edits
        });

        // Group by user and date for summary
        const editSummary = revisions.reduce((acc: any, revision) => {
            const key = `${revision.userId}-${revision.createdAt.toDateString()}`;
            if (!acc[key]) {
                acc[key] = {
                    userId: revision.userId,
                    user: revision.user,
                    date: revision.createdAt.toDateString(),
                    count: 0,
                    lastEdit: revision.createdAt,
                };
            }
            acc[key].count++;
            return acc;
        }, {});

        return NextResponse.json({
            revisions: revisions.map(r => ({
                id: r.id,
                userId: r.userId,
                user: r.user,
                createdAt: r.createdAt,
            })),
            summary: Object.values(editSummary),
        });
    } catch (error) {
        console.error("Error fetching document history:", error);
        return NextResponse.json(
            { error: "Failed to fetch document history" },
            { status: 500 }
        );
    }
}
