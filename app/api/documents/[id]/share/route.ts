import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";

export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const documentId = params.id;

        // Verify user has access to the document (is a project member)
        const document = await prisma.document.findUnique({
            where: { id: documentId },
            include: {
                project: {
                    include: {
                        members: {
                            where: { userId: session.user.id }
                        }
                    }
                }
            }
        });

        if (!document) {
            return NextResponse.json({ error: "Document not found" }, { status: 404 });
        }

        if (document.project.members.length === 0) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        // Check if a share token already exists
        let share = await prisma.documentShare.findFirst({
            where: { documentId }
        });

        // If no share exists, create one
        if (!share) {
            const token = randomBytes(16).toString('hex');
            share = await prisma.documentShare.create({
                data: {
                    documentId,
                    token,
                }
            });
        }

        // Generate the shareable URL
        const baseUrl = process.env.NEXTAUTH_URL || req.nextUrl.origin;
        const shareUrl = `${baseUrl}/documents/preview/${share.token}`;

        return NextResponse.json({
            shareUrl,
            token: share.token,
            viewCount: share.viewCount,
        });

    } catch (error: any) {
        console.error("Share generation error:", error);
        return NextResponse.json({
            error: error.message || "Failed to generate share link"
        }, { status: 500 });
    }
}

// DELETE endpoint to revoke a share
export async function DELETE(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const documentId = params.id;

        // Verify user has access to the document
        const document = await prisma.document.findUnique({
            where: { id: documentId },
            include: {
                project: {
                    include: {
                        members: {
                            where: { userId: session.user.id }
                        }
                    }
                }
            }
        });

        if (!document || document.project.members.length === 0) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        // Delete all share tokens for this document
        await prisma.documentShare.deleteMany({
            where: { documentId }
        });

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Share revocation error:", error);
        return NextResponse.json({
            error: error.message || "Failed to revoke share link"
        }, { status: 500 });
    }
}
