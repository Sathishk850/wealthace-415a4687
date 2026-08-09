import { useEffect, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

// -----------------------------------------------------------------------------
// Module singleton — a single active "session expired" state shared by the app.
// -----------------------------------------------------------------------------

let isOpen = false;
let intentionalSignOut = false;
const listeners = new Set<(open: boolean) => void>();

function emit() {
  listeners.forEach((l) => l(isOpen));
}

/** Show the Session Expired dialog. Idempotent — shows only once per expiry. */
export function triggerSessionExpired() {
  if (isOpen || intentionalSignOut) return;
  isOpen = true;
  emit();
}

function closeSessionExpired() {
  if (!isOpen) return;
  isOpen = false;
  emit();
}

/** Mark the next sign-out as user-initiated so we don't show the modal. */
export function markIntentionalSignOut() {
  intentionalSignOut = true;
  // Clear after a short window; token-refresh failures normally fire fast.
  setTimeout(() => {
    intentionalSignOut = false;
  }, 5000);
}

// -----------------------------------------------------------------------------
// Error classification — used by the global query error handler and callers.
// -----------------------------------------------------------------------------

const AUTH_ERROR_PATTERNS = [
  /jwt expired/i,
  /jwt.*invalid/i,
  /invalid.*jwt/i,
  /invalid_grant/i,
  /refresh[_ ]token/i,
  /no authorization header/i,
  /^unauthorized$/i,
  /session.*(expired|missing|not found)/i,
  /auth session missing/i,
];

export function isAuthError(err: unknown): boolean {
  if (!err) return false;
  const anyErr = err as {
    status?: number;
    statusCode?: number;
    code?: string | number;
    message?: string;
  };
  const status = anyErr.status ?? anyErr.statusCode;
  if (status === 401) return true;
  if (anyErr.code === "PGRST301") return true; // JWT expired via PostgREST
  const msg = typeof anyErr.message === "string" ? anyErr.message : String(err);
  return AUTH_ERROR_PATTERNS.some((re) => re.test(msg));
}

// -----------------------------------------------------------------------------
// React hook + dialog component
// -----------------------------------------------------------------------------

function useSessionExpiredOpen() {
  const [open, setOpen] = useState(isOpen);
  useEffect(() => {
    listeners.add(setOpen);
    setOpen(isOpen);
    return () => {
      listeners.delete(setOpen);
    };
  }, []);
  return open;
}

export function SessionExpiredDialog() {
  const open = useSessionExpiredOpen();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const search = useRouterState({ select: (s) => s.location.searchStr });

  // Detect refresh-token / sign-out driven expiry via Supabase.
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (intentionalSignOut) return;
      if (event === "TOKEN_REFRESHED" && !session) {
        triggerSessionExpired();
      } else if (event === "SIGNED_OUT" && !intentionalSignOut) {
        // Session went away without an explicit sign-out — treat as expiry
        // if we're inside an authenticated area.
        if (typeof window !== "undefined" && !isPublicPath(window.location.pathname)) {
          triggerSessionExpired();
        }
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const handleSignInAgain = async () => {
    const redirect = buildRedirectTarget(pathname, search);
    closeSessionExpired();
    // Ensure any stale tokens are cleared before sending the user to /auth.
    markIntentionalSignOut();
    await supabase.auth.signOut().catch(() => {});
    navigate({
      to: "/auth",
      search: { mode: "signin", redirect } as never,
      replace: true,
    });
  };

  const handleCancel = async () => {
    closeSessionExpired();
    markIntentionalSignOut();
    await supabase.auth.signOut().catch(() => {});
    navigate({ to: "/", replace: true });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) closeSessionExpired(); }}>
      <DialogContent
        className="sm:max-w-md"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Session Expired</DialogTitle>
          <DialogDescription>
            Your session has expired for security reasons. Please sign in again
            to continue using Wealth Ace.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-2 flex-col-reverse gap-2 sm:flex-row">
          <Button variant="outline" onClick={handleCancel} className="sm:min-w-24">
            Cancel
          </Button>
          <Button onClick={handleSignInAgain} className="sm:min-w-32">
            Sign In Again
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

const PUBLIC_PATHS = ["/", "/auth", "/reset-password"];
function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.includes(pathname) || pathname.startsWith("/auth");
}

function buildRedirectTarget(pathname: string, searchStr: string): string | undefined {
  if (!pathname || isPublicPath(pathname)) return undefined;
  return searchStr ? `${pathname}${searchStr}` : pathname;
}