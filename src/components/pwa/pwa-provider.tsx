import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { OfflineBanner } from "./offline-banner";
import { PwaUpdatePrompt } from "./update-prompt";
import { notifKeys } from "@/lib/notifications-api";

/** Mirrors service-worker push messages into the in-app bell + handles clicks. */
function usePushMessageBridge() {
  const qc = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; url?: string } | undefined;
      if (!data?.type) return;
      if (data.type === "PUSH_RECEIVED") {
        void qc.invalidateQueries({ queryKey: notifKeys.list });
        void qc.invalidateQueries({ queryKey: notifKeys.unread });
      } else if (data.type === "NAVIGATE" && data.url) {
        void navigate({ to: data.url });
      }
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [qc, navigate]);
}

export function PwaProvider() {
  usePushMessageBridge();
  return (
    <>
      <OfflineBanner />
      <PwaUpdatePrompt />
    </>
  );
}
