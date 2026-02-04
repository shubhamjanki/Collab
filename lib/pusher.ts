import PusherServer from "pusher"
import PusherClient from "pusher-js"

// Only initialize Pusher if credentials are provided
const hasValidServerKeys =
    process.env.PUSHER_APP_ID &&
    process.env.PUSHER_KEY &&
    process.env.PUSHER_SECRET &&
    process.env.PUSHER_APP_ID !== "your-app-id" &&
    process.env.PUSHER_KEY !== "your-key" &&
    process.env.PUSHER_SECRET !== "your-secret";

const hasValidClientKey =
    process.env.NEXT_PUBLIC_PUSHER_KEY &&
    process.env.NEXT_PUBLIC_PUSHER_KEY !== "your-key";

export const pusherServer = hasValidServerKeys
    ? new PusherServer({
          appId: process.env.PUSHER_APP_ID,
          key: process.env.PUSHER_KEY,
          secret: process.env.PUSHER_SECRET,
          cluster: process.env.PUSHER_CLUSTER || "mt1",
          useTLS: true,
      })
    : null;

export const pusherClient = hasValidClientKey
    ? new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY, {
          cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "mt1",
      })
    : null;
