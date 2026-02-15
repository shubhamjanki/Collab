import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { google } from "googleapis";

// Helper to handle both multi-line and \n escaped private keys
const getPrivateKey = (key: string | undefined) => {
    if (!key) return undefined;
    try {
        let cleanKey = key.trim();
        if (cleanKey.startsWith('"') && cleanKey.endsWith('"')) {
            cleanKey = cleanKey.slice(1, -1);
        }
        return cleanKey.replace(/\\n/g, '\n');
    } catch (e) {
        return key;
    }
};

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

        const document = await prisma.document.findUnique({
            where: { id },
            select: { googleDocUrl: true, id: true }
        });

        if (!document || !document.googleDocUrl) {
            return NextResponse.json({ error: "Document not linked to Google Docs" }, { status: 400 });
        }

        console.log(`Processing PDF Sync for Document: ${id}`);

        const regex = /\/d\/([a-zA-Z0-9-_]+)/;
        const match = document.googleDocUrl.match(regex);
        const fileId = match ? match[1] : null;

        if (!fileId) {
            return NextResponse.json({ error: "Invalid Google Docs URL" }, { status: 400 });
        }

        if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
            return NextResponse.json({ error: "Google API not configured" }, { status: 501 });
        }

        const auth = new google.auth.JWT({
            email: process.env.GOOGLE_CLIENT_EMAIL,
            key: getPrivateKey(process.env.GOOGLE_PRIVATE_KEY),
            scopes: ['https://www.googleapis.com/auth/drive.readonly']
        });

        const drive = google.drive({ version: 'v3', auth });

        try {
            // 1. Initial metadata check
            const fileMetadata = await drive.files.get({
                fileId: fileId,
                fields: 'id, name, mimeType',
            });

            if (!fileMetadata.data.mimeType || fileMetadata.data.mimeType !== 'application/vnd.google-apps.document') {
                return NextResponse.json({
                    error: `The linked file is not a Google Doc. Please save it as a Google Doc first.`
                }, { status: 400 });
            }

            // 2. Export Google Doc as PDF (High Quality)
            const response = await drive.files.export({
                fileId: fileId,
                mimeType: 'application/pdf',
            }, { responseType: 'arraybuffer' });

            const pdfBuffer = Buffer.from(response.data as any);
            const pdfBase64 = `data:application/pdf;base64,${pdfBuffer.toString('base64')}`;

            console.log(`Sync complete. PDF Size: ${pdfBuffer.length} bytes`);

            // 3. Update document in database
            await prisma.document.update({
                where: { id },
                data: {
                    content: pdfBase64,
                    updatedAt: new Date(),
                }
            });

            // 4. Save revision
            await prisma.documentRevision.create({
                data: {
                    documentId: id,
                    content: pdfBase64,
                    userId: session.user.id,
                },
            });

            return NextResponse.json({
                success: true,
                message: "Synced and converted to PDF successfully",
                updatedAt: new Date()
            });
        } catch (exportError: any) {
            console.error("PDF Export Error:", exportError);
            if (exportError.code === 403 || exportError.status === 403) {
                return NextResponse.json({ error: "Permission Denied: Share your Google Doc with the Service Account email." }, { status: 403 });
            }
            throw exportError;
        }
    } catch (error: any) {
        console.error("Sync Route Error:", error);
        return NextResponse.json({ error: error.message || "Failed to sync PDF" }, { status: 500 });
    }
}
