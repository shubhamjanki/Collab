# How to Clean Up Service Account Google Drive

## Method 1: Via Google Cloud Console

1. Go to: https://console.cloud.google.com/
2. Select your project
3. Go to "IAM & Admin" > "Service Accounts"
4. Find your service account (the email from GOOGLE_CLIENT_EMAIL in .env)
5. **Problem**: Service accounts can't directly access Drive UI

## Method 2: Use API to List and Delete Files

Run this script to clean up files programmatically:

```bash
cd Collab
node cleanup-drive.js
```

## Method 3: Create New Service Account

The easiest solution - create a fresh service account with empty storage:

1. Go to: https://console.cloud.google.com/
2. Go to "IAM & Admin" > "Service Accounts"
3. Click "Create Service Account"
   - Name: "collab-drive-storage-2"
   - Grant "Editor" role
4. Click on the new service account
5. Go to "Keys" tab > "Add Key" > "Create New Key" > JSON
6. Download the JSON file
7. Update your .env file with new credentials from the JSON:
   ```
   GOOGLE_CLIENT_EMAIL=new-account@your-project.iam.gserviceaccount.com
   GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   ```
8. Restart your app

This gives you a fresh 15GB storage quota instantly!
