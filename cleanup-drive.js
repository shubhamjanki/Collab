// Cleanup script to delete all files from service account's Google Drive
// This frees up storage space when quota is exceeded

require('dotenv').config();
const { google } = require('googleapis');

const getPrivateKey = (key) => {
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

async function cleanupDrive() {
    try {
        console.log("\n🧹 Starting Google Drive Cleanup...\n");

        // Authenticate
        const auth = new google.auth.JWT({
            email: process.env.GOOGLE_CLIENT_EMAIL,
            key: getPrivateKey(process.env.GOOGLE_PRIVATE_KEY),
            scopes: ['https://www.googleapis.com/auth/drive']
        });

        const drive = google.drive({ version: 'v3', auth });

        // List all files
        console.log("📋 Fetching all files...");
        const response = await drive.files.list({
            pageSize: 1000,
            fields: 'files(id, name, mimeType, size, createdTime)',
            orderBy: 'createdTime desc'
        });

        const files = response.data.files || [];
        console.log(`\n📁 Found ${files.length} files\n`);

        if (files.length === 0) {
            console.log("✨ Drive is already empty!");
            return;
        }

        // Show files
        console.log("Files to delete:");
        console.log("─".repeat(80));
        files.forEach((file, i) => {
            const size = file.size ? `${Math.round(file.size / 1024)}KB` : 'N/A';
            const date = new Date(file.createdTime).toLocaleDateString();
            console.log(`${i + 1}. ${file.name} (${size}) - ${date}`);
        });
        console.log("─".repeat(80));

        // Calculate total size
        const totalSize = files.reduce((sum, f) => sum + (parseInt(f.size) || 0), 0);
        const totalMB = (totalSize / (1024 * 1024)).toFixed(2);
        console.log(`\n💾 Total size: ${totalMB} MB`);

        // Ask for confirmation
        console.log("\n⚠️  WARNING: This will DELETE ALL files from the service account's Drive!");
        console.log("Press Ctrl+C to cancel, or wait 5 seconds to proceed...\n");

        await new Promise(resolve => setTimeout(resolve, 5000));

        console.log("🗑️  Deleting files...\n");

        // Delete files
        let deleted = 0;
        for (const file of files) {
            try {
                await drive.files.delete({ fileId: file.id });
                deleted++;
                process.stdout.write(`\rDeleted ${deleted}/${files.length} files...`);
            } catch (error) {
                console.error(`\n❌ Failed to delete ${file.name}:`, error.message);
            }
        }

        console.log(`\n\n✅ Cleanup complete! Deleted ${deleted} files.`);
        console.log(`💾 Freed up approximately ${totalMB} MB of storage.\n`);

    } catch (error) {
        console.error("\n❌ Error during cleanup:", error.message);
        if (error.message.includes('quota') || error.code === 403) {
            console.error("\n💡 The Drive is so full that even listing files fails!");
            console.error("Solution: Create a new service account with fresh storage quota.\n");
        }
        process.exit(1);
    }
}

// Run cleanup
cleanupDrive();
