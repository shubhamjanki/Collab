import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
    req: NextRequest,
    { params }: { params: { token: string } }
) {
    try {
        const token = params.token;

        // Find the share by token
        const share = await prisma.documentShare.findUnique({
            where: { token },
            include: {
                document: {
                    include: {
                        project: {
                            select: {
                                id: true,
                                name: true,
                            }
                        }
                    }
                }
            }
        });

        if (!share) {
            return NextResponse.json(
                { error: "Share link not found or has expired" },
                { status: 404 }
            );
        }

        // Check if share has expired
        if (share.expiresAt && new Date(share.expiresAt) < new Date()) {
            return NextResponse.json(
                { error: "This share link has expired" },
                { status: 410 }
            );
        }

        // Increment view count
        await prisma.documentShare.update({
            where: { id: share.id },
            data: { viewCount: { increment: 1 } }
        });

        const { document } = share;

        // Return document data for preview
        return NextResponse.json({
            document: {
                id: document.id,
                title: document.title,
                content: document.content,
                googleDocUrl: document.googleDocUrl,
                updatedAt: document.updatedAt,
                project: document.project,
            }
        });

    } catch (error: any) {
        console.error("Preview fetch error:", error);
        return NextResponse.json({
            error: error.message || "Failed to load preview"
        }, { status: 500 });
    }
}
