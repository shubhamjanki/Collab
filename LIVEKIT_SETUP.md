# LiveKit Video Call Setup

This project uses LiveKit for video calling functionality.

## Setup Instructions

### 1. Create a LiveKit Account

1. Go to [LiveKit Cloud](https://cloud.livekit.io/) and sign up for a free account
2. Create a new project
3. Get your credentials from the project settings

### 2. Configure Environment Variables

Add the following to your `.env` file:

```env
# LiveKit Configuration
LIVEKIT_API_KEY="your-api-key-here"
LIVEKIT_API_SECRET="your-api-secret-here"
NEXT_PUBLIC_LIVEKIT_URL="wss://your-project.livekit.cloud"
```

### 3. How to Get LiveKit Credentials

1. Log in to [LiveKit Cloud Console](https://cloud.livekit.io/)
2. Select your project
3. Go to **Settings** → **Keys**
4. Copy your:
   - **API Key** → `LIVEKIT_API_KEY`
   - **API Secret** → `LIVEKIT_API_SECRET`
5. Your WebSocket URL will be:
   - `wss://your-project-name.livekit.cloud` → `NEXT_PUBLIC_LIVEKIT_URL`

### 4. Free Tier Limits

LiveKit's free tier includes:
- Up to 10,000 participant minutes per month
- Unlimited rooms
- Up to 50 participants per room
- All features enabled

## Features

✅ Multi-party video conferencing
✅ Screen sharing
✅ Audio/video controls
✅ Built-in UI with grid layout
✅ Automatic scaling and optimization
✅ Works behind firewalls (includes TURN servers)

## Usage

Once configured, users can:
1. Click the video icon in the chat window
2. Automatically join the project's video room
3. Other team members will see a notification to join
4. Full video conference with all controls

## Alternative: Self-Hosted LiveKit

For production or privacy needs, you can self-host LiveKit:

```bash
# Using Docker
docker run --rm -p 7880:7880 -p 7881:7881 -p 7882:7882/udp \
  -e LIVEKIT_KEYS="your-api-key: your-api-secret" \
  livekit/livekit-server
```

Then set: `NEXT_PUBLIC_LIVEKIT_URL="ws://localhost:7880"`

## Troubleshooting

**"LiveKit not configured" error:**
- Make sure all three environment variables are set in `.env`
- Restart your dev server after adding env vars

**Connection fails:**
- Check that `NEXT_PUBLIC_LIVEKIT_URL` starts with `wss://` (not `https://`)
- Verify credentials in LiveKit console
- Check browser console for detailed errors

**No video/audio:**
- Grant browser permissions for camera/microphone
- Check that other apps aren't using your camera
- Try refreshing the page
