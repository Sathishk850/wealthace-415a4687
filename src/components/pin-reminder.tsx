import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Shield, Lock } from "lucide-react";
import { getPinStatus } from "@/lib/pin.functions";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const SKIP_KEY_PREFIX = "finvista_pin_skipped:";
const SESSION_SHOWN_KEY = "finvista_pin_reminder_shown";

function skipKey(userId: string) {
  return `${SKIP_KEY_PREFIX}${userId}`;
}

export function PinReminder() {
  const navigate = useNavigate();
  const fetchStatus = useServerFn(getPinStatus);
  const [userId, setUserId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmSkip, setConfirmSkip] = useState(false);
  const toastFired = useRef(false);

  useEffect(() => {
    let off = false;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!off) setUserId(data.user?.id ?? null);
    })();
    return () => { off = true; };
  }, []);

  const status = useQuery({
    queryKey: ["pin-status"],
    queryFn: () => fetchStatus(),
    enabled: !!userId,
    staleTime: 30_000,
  });

  const enabled = !!status.data?.enabled;

  useEffect(() => {
    if (!userId || status.isLoading) return;
    if (enabled) return;

    const skipped = typeof window !== "undefined" && window.localStorage.getItem(skipKey(userId)) === "1";

    // Mandatory setup on first login (no PIN + never skipped) — full-screen modal
    if (!skipped) {
      setModalOpen(true);
      return;
    }

    // Persistent soft reminder once per session for previously-skipped users
    if (typeof window === "undefined") return;
    if (window.sessionStorage.getItem(SESSION_SHOWN_KEY) === "1") return;
    if (toastFired.current) return;
    toastFired.current = true;
    window.sessionStorage.setItem(SESSION_SHOWN_KEY, "1");
    toast(
      "🔒 Secure your account with a 4-digit PIN for faster login.",
      {
        duration: 10_000,
        action: {
          label: "Set PIN",
          onClick: () => navigate({ to: "/settings" }),
        },
        cancel: { label: "Remind me later", onClick: () => {} },
      },
    );
  }, [userId, status.isLoading, enabled, navigate]);

  const handleCreate = () => {
    setModalOpen(false);
    navigate({ to: "/settings" });
  };

  const handleSkipRequest = () => setConfirmSkip(true);

  const handleSkipConfirm = () => {
    if (userId && typeof window !== "undefined") {
      window.localStorage.setItem(skipKey(userId), "1");
      // Show soft reminder immediately this session too.
      window.sessionStorage.setItem(SESSION_SHOWN_KEY, "1");
      toast(
        "🔒 You can enable a 4-digit PIN anytime in Settings for faster login.",
        { duration: 6_000 },
      );
    }
    setConfirmSkip(false);
    setModalOpen(false);
  };

  if (!userId || enabled) return null;

  return (
    <>
      {/* Mandatory PIN Setup Modal (first login) */}
      <Dialog open={modalOpen && !confirmSkip} onOpenChange={(v) => { if (!v) return; setModalOpen(v); }}>
        <DialogContent
          className="sm:max-w-md"
          onEscapeKeyDown={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-mint/15 text-mint">
            <Shield className="h-7 w-7" />
          </div>
          <DialogHeader>
            <DialogTitle className="text-center">Secure Your Account</DialogTitle>
            <DialogDescription className="text-center">
              Create a 4-digit PIN for faster and secure access to FinVista.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-2 flex-col-reverse gap-2 sm:flex-row">
            <Button variant="outline" onClick={handleSkipRequest} className="sm:min-w-32">
              Skip for now
            </Button>
            <Button onClick={handleCreate} className="sm:min-w-32">
              <Lock className="mr-2 h-4 w-4" />
              Create PIN
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Skip confirmation */}
      <Dialog open={confirmSkip} onOpenChange={setConfirmSkip}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Continue without a PIN?</DialogTitle>
            <DialogDescription>
              You can continue without a PIN. A PIN helps faster and more secure access on this
              device. You can enable it anytime from Settings.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-2 flex-col-reverse gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => setConfirmSkip(false)} className="sm:min-w-24">
              Go Back
            </Button>
            <Button onClick={handleSkipConfirm} className="sm:min-w-40">
              Continue without PIN
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}