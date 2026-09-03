import { subscribeToRealtime as subscribeToMockRealtime } from "@/lib/mock-api";
import type { RealtimeEvent } from "@/lib/types";

const realtimeUrl = process.env.NEXT_PUBLIC_REALTIME_URL;

function isRealtimeEvent(value: unknown): value is RealtimeEvent {
  if (value === null || typeof value !== "object") return false;
  const event = value as Record<string, unknown>;
  return typeof event.type === "string" && typeof event.message === "string" && typeof event.timestamp === "string";
}

export function subscribeToRealtime(callback: (event: RealtimeEvent) => void) {
  if (!realtimeUrl || process.env.NEXT_PUBLIC_USE_MOCK_API !== "false") {
    return subscribeToMockRealtime(callback);
  }

  const socket = new WebSocket(realtimeUrl);
  socket.addEventListener("message", (message) => {
    try {
      const event: unknown = JSON.parse(String(message.data));
      if (isRealtimeEvent(event)) callback(event);
    } catch {
      // Ignore malformed wire events; production telemetry should capture protocol violations.
    }
  });

  return () => socket.close();
}