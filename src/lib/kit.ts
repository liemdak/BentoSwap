import { AppKit } from "@circle-fin/app-kit";

// Singleton AppKit instance — reused across the app
export const kit = new AppKit();

// API key injected into every kit operation (swap, bridge, send, etc.)
export const CIRCLE_API_KEY = process.env.NEXT_PUBLIC_CIRCLE_API_KEY as string;
