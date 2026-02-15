import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { google } from "googleapis";
import { Readable } from "stream";

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

export async function POST(req: NextRequest) {
    let tempFileId: string | null = null;
    let auth;

    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get("file") as File;
        const projectId = formData.get("projectId") as string;

        if (!file || !projectId) {
            return NextResponse.json({ error: "Missing file or projectId" }, { status: 400 });
        }

        // Verify user is a member of the project
        const member = await prisma.projectMember.findFirst({
            where: { projectId, userId: session.user.id }
        });

        if (!member) {
            return NextResponse.json({ error: "Project access denied" }, { status: 403 });
        }

        // Check for Google Credentials (required for Google Drive storage)
        if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
            return NextResponse.json({ error: "Google Drive API not configured" }, { status: 501 });
        }

        auth = new google.auth.JWT({
            email: process.env.GOOGLE_CLIENT_EMAIL,
            key: getPrivateKey(process.env.GOOGLE_PRIVATE_KEY),
            scopes: ['https://www.googleapis.com/auth/drive.file']
        });

        const drive = google.drive({ version: 'v3', auth });

        // 1. Convert Word File to Stream
        const buffer = Buffer.from(await file.arrayBuffer());
        const stream = new Readable();
        stream.push(buffer);
        stream.push(null);

        console.log(`Step 1: Uploading ${file.name} to Google Drive...`);

        // 2. Upload to Drive and convert to Google Doc (keep permanently)
        const fileName = file.name.replace(/\.[^/.]+$/, "");
        const uploadResponse = await drive.files.create({
            requestBody: {
                name: fileName,
                mimeType: 'application/vnd.google-apps.document',
            },
            media: {
                mimeType: file.type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                body: stream,
            },
            fields: 'id, webViewLink',
        });

        tempFileId = uploadResponse.data.id || null;
        const webViewLink = uploadResponse.data.webViewLink;

        if (!tempFileId) {
            throw new Error("Failed to create Google Doc");
        }

        console.log(`Step 2: Setting permissions to 'anyone with the link can view'...`);

        // 3. Set file permissions to public (anyone with link can view)
        await drive.permissions.create({
            fileId: tempFileId,
            requestBody: {
                role: 'reader',
                type: 'anyone',
            },
        });

        // 4. Share the document with the uploading user's email (so they can see it in their Drive)
        if (session.user.email) {
            try {
                await drive.permissions.create({
                    fileId: tempFileId,
                    requestBody: {
                        role: 'writer', // Give them edit access
                        type: 'user',
                        emailAddress: session.user.email,
                    },
                    sendNotificationEmail: false, // Don't spam them with emails
                });
                console.log(`Document shared with user: ${session.user.email}`);
            } catch (shareError) {
                console.warn("Failed to share with user (non-fatal):", shareError);
                // Continue anyway - public link still works
            }
        }

        // 5. Generate embed URL for iframe
        const embedUrl = `https://docs.google.com/document/d/${tempFileId}/preview`;

        console.log(`Step 3: Google Doc created successfully. File ID: ${tempFileId}`);

        // 6. Create document in DB (storing Google Docs links, no local content)
        const document = await prisma.document.create({
            data: {
                projectId,
                title: fileName,
                content: null, // No local storage - document lives in Google Drive
                authorId: session.user.id,
                googleDocUrl: webViewLink,
                googleDriveFileId: tempFileId,
            },
        });

        console.log("Step 4: Document record created in database.");

        return NextResponse.json({
            success: true,
            document,
            message: "Document uploaded to Google Drive successfully",
        });

    } catch (error: any) {
        console.error("Google Drive Upload Error:", error);

        // Cleanup on failure (delete the Google Doc if created)
        if (tempFileId && auth) {
            const drive = google.drive({ version: 'v3', auth });
            await drive.files.delete({ fileId: tempFileId }).catch(() => { });
        }

        // Handle specific Google Drive API errors
        let errorMessage = "Failed to upload document to Google Drive";
        let statusCode = 500;

        if (error.code === 403 || error.message?.includes("quota") || error.message?.includes("storage")) {
            console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            console.error("⚠️  GOOGLE DRIVE STORAGE QUOTA EXCEEDED");
            console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            console.error("Service Account:", process.env.GOOGLE_CLIENT_EMAIL);
            console.error("\nSolutions:");
            console.error("1. Delete unused files from Google Drive");
            console.error("2. Upgrade Google Workspace storage plan");
            console.error("3. Use a different service account with more storage");
            console.error("4. Implement automatic file cleanup policies");
            console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
            
            errorMessage = "Google Drive storage quota exceeded. Please contact your administrator to increase storage limits or clean up existing files.";
            statusCode = 507; // Insufficient Storage
        } else if (error.code === 429 || error.message?.includes("rate limit")) {
            errorMessage = "Too many uploads in a short time. Please wait a moment and try again.";
            statusCode = 429;
        } else if (error.message?.includes("not configured")) {
            errorMessage = "Google Drive integration is not properly configured. Please check your API credentials.";
            statusCode = 501;
        } else if (error.message) {
            errorMessage = error.message;
        }

        return NextResponse.json({
            error: errorMessage,
            code: error.code,
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        }, { status: statusCode });
    }
}
