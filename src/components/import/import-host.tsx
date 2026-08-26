/**
 * Single mounted host for the Universal Import dialog.
 * Any module can open it with openImport("assets") — no local state needed.
 */
import { useEffect, useState } from "react";
import { UniversalImportDialog } from "./universal-import-dialog";
import type { ImportModule } from "@/lib/import";

const EVENT = "wa:open-import";

export function openImport(module: ImportModule) {
  window.dispatchEvent(new CustomEvent<ImportModule>(EVENT, { detail: module }));
}

export function UniversalImportHost() {
  const [module, setModule] = useState<ImportModule | null>(null);

  useEffect(() => {
    const onOpen = (e: Event) => setModule((e as CustomEvent<ImportModule>).detail);
    window.addEventListener(EVENT, onOpen);
    return () => window.removeEventListener(EVENT, onOpen);
  }, []);

  if (!module) return null;
  return (
    <UniversalImportDialog
      key={module}
      open
      onOpenChange={(v) => !v && setModule(null)}
      module={module}
    />
  );
}
